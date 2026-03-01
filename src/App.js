import { useEffect, useState, useRef } from "react";
import { generateStoryFromPrompt } from "./services/mistralService";
import { generateImageFromPrompt } from "./services/hfService";
import { speakNarration, playAudio } from "./services/voiceService";
import { transcribeAudio } from "./services/transcriptionService";
import { startBgMusic, stopBgMusic, pauseBgMusic, resumeBgMusic } from "./services/bgMusicService";
import { motion, useAnimate, AnimatePresence } from "framer-motion";
const MAGICAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap');

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background: #FFF9E6; /* Warm cream pastel */
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(255, 182, 193, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 85% 30%, rgba(135, 206, 235, 0.4) 0%, transparent 50%);
  font-family: 'Nunito', sans-serif;
}
.sticker {
  border: 4px solid #2d2950;
  border-radius: 24px;
  box-shadow: 3px 3px 0px #2d2950;
  background: white;
}
.font-bubbly {
  font-family: 'Fredoka', cursive;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes float { 0% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-10px) rotate(5deg); } 100% { transform: translateY(0px) rotate(0deg); } }
`;

function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState(null);
  const [error, setError] = useState(null);
  const [activeScene, setActiveScene] = useState(0);
  const [sceneImages, setSceneImages] = useState({});
  const [imagesLoading, setImagesLoading] = useState(false);
  const [transcriptions, setTranscriptions] = useState({});
  const [currentNarrationTime, setCurrentNarrationTime] = useState(0);
  const [activeNarrationIndex, setActiveNarrationIndex] = useState(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const audioRef = useRef(null);
  const videoContainerRef = useRef(null);
  const [transcriptionData, setTranscriptionData] = useState({});
  const [sceneAudios, setSceneAudios] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [narrationVolume, setNarrationVolume] = useState(0.8);



/* eslint-disable react-hooks/exhaustive-deps */
useEffect(() => {
  if (activeNarrationIndex === activeScene && scope.current) {
    // Small delay to let the entrance transition finish first (0.6s)
    setTimeout(() => {
      runAnimationCues(story?.scenes[activeScene]?.animation_cues);
    }, 600);
  }
}, [activeNarrationIndex]);
/* eslint-enable react-hooks/exhaustive-deps */

  const [scope, animate] = useAnimate();

  const runAnimationCues = async (cues) => {
    if (!cues?.length || !scope.current) return;
    for (const cue of cues) {
      const target = {};
    switch (cue.type) {
      case 'zoom-in':    target.scale = 1.2; break;
      case 'zoom-out':   target.scale = 1.0; break;
      case 'pan-right':  target.x = "8%";   break;
      case 'pan-left':   target.x = "-8%";  break;
      case 'subtle-pan': target.y = "4%";   break;
      default:           target.scale = 1.05;
    }
    await animate(scope.current, target, {
      duration: cue.duration_seconds || 3,
      ease: "easeInOut",
    });
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopBgMusic();
    };
  }, []);

  // Clean up bg music when story is cleared
  useEffect(() => {
    if (!story) stopBgMusic();
  }, [story]);

  // Sync narration volume to active audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = narrationVolume;
    }
  }, [narrationVolume]);

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const [systemPrompt, setSystemPrompt] = useState("");
  useEffect(() => {
    const url = "./systemPrompt.txt";
    fetch(url)
      .then((response) => response.text())
      .then((text) => setSystemPrompt(text))
      .catch((error) => console.error("Error loading system prompt:", error));
  }, []);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setStory(null);

    try {
      const jsonOutput = await generateStoryFromPrompt(prompt, systemPrompt);
      console.log("Final parsed JSON output:", jsonOutput);
      setStory(jsonOutput);
      setActiveScene(0);
      setSceneAudios({});

      if (jsonOutput?.scenes?.length) {
        setImagesLoading(true);
        const fullPrompt = jsonOutput?.full_prompt;
        const imagePromises = jsonOutput.scenes.map(async (s, index) => {
          const scenePrompt = s?.image_prompt?.scene_prompt;
          const combinedPrompt = [
            fullPrompt ? `the context of the image is : ${fullPrompt}` : "",
            scenePrompt ? `\n now i want you to generate this image :  ${scenePrompt}` : ""
          ].filter(Boolean).join(". ");
          if (!combinedPrompt) return { index, url: null };
          try {
            const url = await generateImageFromPrompt(combinedPrompt);
            return { index, url };
          } catch (err) {
            console.error(`Failed to generate image for scene ${index}:`, err);
            return { index, url: null };
          }
        });

        Promise.all(imagePromises).then((results) => {
          const images = {};
          results.forEach(({ index, url }) => { if (url) images[index] = url; });
          setSceneImages(images);
          setImagesLoading(false);
        });
      }
    } catch (e) {
      console.error("Error during generate():", e);
      setError(e.message || "Failed to generate story. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNarration = async (sceneIndex) => {
    const scene = story.scenes[sceneIndex];
    if (!scene.narration) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    try {
      let audioBlob, audioUrl;

      if (sceneAudios[sceneIndex]) {
        audioBlob = sceneAudios[sceneIndex].blob;
        audioUrl = sceneAudios[sceneIndex].url;
      } else {
        const result = await speakNarration(scene.narration);
        audioBlob = result.audioBlob;
        audioUrl = result.audioUrl;
        setSceneAudios(prev => ({ ...prev, [sceneIndex]: { blob: audioBlob, url: audioUrl } }));
      }

      const { audio, playbackPromise } = await playAudio(audioUrl);
      audioRef.current = audio;
      audio.volume = narrationVolume;

      const wordsArr = scene.narration.split(/\s+/);

      if (isNaN(audio.duration)) {
        await new Promise(resolve => {
          audio.addEventListener('loadedmetadata', resolve, { once: true });
        });
      }

      const estimatedDuration = audio.duration || scene.duration_seconds || (wordsArr.length * 0.4);
      const wps = estimatedDuration > 0 ? wordsArr.length / estimatedDuration : 1;

      const estimatedWords = wordsArr.map((word, i) => ({
        word,
        start: Math.max(0, (i / wps) - 0.2),
        end: ((i + 1) / wps) - 0.2,
      }));

      const initialData = { text: scene.narration, words: estimatedWords };
      setTranscriptions(prev => ({ ...prev, [sceneIndex]: initialData }));
      setTranscriptionData(prev => ({ ...prev, [sceneIndex]: initialData }));

      setActiveNarrationIndex(sceneIndex);
      setCurrentNarrationTime(0);
      setIsPaused(false);

      const handleTimeUpdate = () => setCurrentNarrationTime(audio.currentTime);
      audio.addEventListener("timeupdate", handleTimeUpdate);

      if (!transcriptionData[sceneIndex] || !transcriptionData[sceneIndex].isReal) {
        transcribeAudio(audioBlob)
          .then(result => {
            if (result && result.words && result.words.length > 0) {
              const enrichedResult = { ...result, isReal: true };
              setTranscriptions(prev => ({ ...prev, [sceneIndex]: enrichedResult }));
              setTranscriptionData(prev => ({ ...prev, [sceneIndex]: enrichedResult }));
            }
          })
          .catch(err => console.warn("[App] Background transcription failed:", err));
      }

      await playbackPromise;
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audioRef.current = null;
    } catch (err) {
      console.error("Narration failed:", err);
      if (!isCinemaMode) alert("Narration failed: " + err.message);
    } finally {
      setActiveNarrationIndex(null);
      setCurrentNarrationTime(0);
    }
  };

  const handlePauseResume = () => {
    if (!audioRef.current) return;
    if (isPaused) {
      audioRef.current.play();
      resumeBgMusic();
      setIsPaused(false);
    } else {
      audioRef.current.pause();
      pauseBgMusic();
      setIsPaused(true);
    }
  };

  const startCinemaMode = async () => {
    if (!story?.scenes?.length) return;
    setIsCinemaMode(true);

    // Start background music
    if (story.bg_music?.name) {
      startBgMusic(story.bg_music.name, 0.12);
    }

    if (!sceneAudios[0]) {
      speakNarration(story.scenes[0].narration)
        .then(res => setSceneAudios(prev => ({ ...prev, 0: { blob: res.audioBlob, url: res.audioUrl } })))
        .catch(console.warn);
    }

    for (let i = 0; i < story.scenes.length; i++) {
      setActiveScene(i);

      if (i + 1 < story.scenes.length && !sceneAudios[i + 1]) {
        speakNarration(story.scenes[i + 1].narration)
          .then(res => setSceneAudios(prev => ({ ...prev, [i + 1]: { blob: res.audioBlob, url: res.audioUrl } })))
          .catch(console.warn);
      }

      let waitCounter = 0;
      while (imagesLoading && !sceneImages[i] && waitCounter < 50) {
        await new Promise(r => setTimeout(r, 100));
        waitCounter++;
      }

      await handlePlayNarration(i);

      if (i < story.scenes.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    stopBgMusic();
    setIsCinemaMode(false);
  };

  const getActiveTranscription = () => transcriptions[activeScene] || null;

  const scene = story?.scenes?.[activeScene];
  const currentSceneImage = sceneImages[activeScene];
  const totalScenes = story?.scenes?.length || 0;

  const pageColors = ["#6C63FF", "#FF6B9D", "#00C9A7", "#FFB84D", "#A78BFA"];
  const accentColor = pageColors[activeScene % pageColors.length];

  return (
    <div style={{
      minHeight: "100vh",
      padding: 0,
      overflow: "hidden"
    }}>
      <style>{MAGICAL_STYLES}</style>

      {/* Decorative background shapes */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {/* Star 1 */}
        <svg style={{ position: "absolute", top: "10%", left: "10%", animation: "float 6s ease-in-out infinite" }} width="48" height="48" viewBox="0 0 24 24" fill="#FFCF54" stroke="#2d2950" strokeWidth="2" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        {/* Star 2 */}
        <svg style={{ position: "absolute", top: "70%", right: "15%", animation: "float 5s ease-in-out infinite" }} width="64" height="64" viewBox="0 0 24 24" fill="#FF8BA7" stroke="#2d2950" strokeWidth="2" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        {/* Blob */}
        <div style={{ position: "absolute", bottom: "10%", left: "15%", width: 140, height: 110, borderRadius: "50% 40% 60% 50%", background: "#6EE7B7", border: "4px solid #2d2950", animation: "float 7s ease-in-out infinite" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ padding: "32px 0 20px", textAlign: "center" }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              {/* Cute Dinosaur sticker */}
              <div style={{ fontSize: 54, filter: "drop-shadow(3px 3px 0px #2d2950)" }}>
                🦕
              </div>
            </motion.div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: -10 }}>
              <div className="font-bubbly" style={{
                fontSize: 42, fontWeight: 700,
                color: "#FF8BA7",
                WebkitTextStroke: "2px #2d2950",
                textShadow: "4px 4px 0px #2d2950",
                letterSpacing: "1px",
                lineHeight: 1
              }}>
                Little Lens
              </div>
              <div className="font-bubbly" style={{ 
                fontSize: 16, color: "#2d2950", 
                backgroundColor: "#FFCF54", 
                padding: "4px 12px", 
                borderRadius: "12px", 
                border: "2px solid #2d2950",
                fontWeight: 600,
                transform: "rotate(-2deg)",
                marginTop: 4
              }}>
                Dream it. See it. 🌟
              </div>
            </div>
          </div>
        </motion.div>

        {/* === INPUT SCREEN === */}
        {!story && (
          <div style={{ maxWidth: "80%", margin: "0 auto", padding: "0 clamp(12px,4vw,20px) 60px", position: "relative",marginTop: 50 }}>
            {/* Some decorative doodles */}
            <div style={{ position: "absolute", top: -20, left: 0, fontSize: "clamp(24px,8vw,32px)", transform: "rotate(-15deg)", filter: "drop-shadow(2px 2px 0px #2d2950)" }}>✨</div>
            <div style={{ position: "absolute", bottom: 80, right: 0, fontSize: "clamp(32px,10vw,40px)", transform: "rotate(15deg)", filter: "drop-shadow(2px 2px 0px #2d2950)" }}>🖍️</div>
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="sticker"
              style={{
                padding: "clamp(20px,5vw,52px) clamp(16px,5vw,44px)",
                textAlign: "center",
                marginTop: 12,
                background: "#ffffff"
              }}
            >
              <div className="font-bubbly" style={{ fontSize: "clamp(20px,5vw,28px)", fontWeight: 700, color: "#2d2950", marginBottom: 8, lineHeight: 1.3 }}>
                What story shall we tell today?
              </div>
              <div style={{ fontSize: "clamp(13px,3vw,16px)", color: "#2d2950", marginBottom: "clamp(16px,4vw,32px)", fontWeight: 600 }}>
                Describe a little adventure and watch it come to life
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="A bunny learns to share her carrots with friends..."
                onKeyDown={e => e.key === "Enter" && e.metaKey && generate()}
                className="sticker"
                style={{
                  width: "100%", minHeight: 100, background: "#F0FFF4",
                  color: "#2d2950", padding: "clamp(12px,3vw,18px) clamp(12px,3vw,20px)", fontSize: "clamp(14px,3vw,18px)",
                  fontFamily: "'Nunito', sans-serif", fontWeight: 600, lineHeight: 1.7, resize: "vertical",
                  outline: "none", boxSizing: "border-box",
                  
                }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={generate}
                disabled={loading || !prompt.trim()}
                className="sticker font-bubbly"
                style={{
                  marginTop: "clamp(12px,3vw,24px)", padding: "clamp(10px,2.5vw,15px) clamp(24px,5vw,48px)",
                  background: loading ? "#e0ddf0" : "#FFCF54",
                  color: "#2d2950",
                  fontSize: "clamp(16px,4vw,22px)", fontWeight: 700, letterSpacing: "1px",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Creating... 🪄" : "Tell Me a Story 🚀"}
              </motion.button>
              {error && (
                <div className="sticker font-bubbly" style={{
                  color: "#e53e3e", marginTop: 18, fontSize: 16,
                  background: "#fff5f5", padding: "10px 18px"
                }}>
                  {error}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* === STORY BOOK VIEW === */}
        {story && (
          <div style={{ margin: "0 auto", maxWidth: "900px", padding: "0 clamp(8px,3vw,32px) 60px" }}>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ animation: "fadeIn 0.5s ease" }}
            >

              {/* Title card */}
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="sticker"
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #FFF9E6 50%, #F0FFF4 100%)",
                  padding: "clamp(20px,5vw,40px) clamp(16px,5vw,44px) clamp(16px,4vw,32px)",
                  textAlign: "center",
                  marginBottom: "clamp(16px,4vw,32px)",
                  zIndex: 2,
                  position: "relative",
                  overflow: "hidden"                }}
              >
                {/* Decorative corner emojis */}
                <div style={{ position: "absolute", top: 12, left: 16, fontSize: "clamp(16px,4vw,24px)", opacity: 0.6, transform: "rotate(-15deg)" }}>📖</div>
                <div style={{ position: "absolute", top: 12, right: 16, fontSize: "clamp(16px,4vw,24px)", opacity: 0.6, transform: "rotate(15deg)" }}>✨</div>
                <div style={{ position: "absolute", bottom: 10, left: 20, fontSize: "clamp(14px,3vw,20px)", opacity: 0.5, transform: "rotate(10deg)" }}>🌈</div>
                <div style={{ position: "absolute", bottom: 10, right: 20, fontSize: "clamp(14px,3vw,20px)", opacity: 0.5, transform: "rotate(-10deg)" }}>⭐</div>

              

                <motion.h1
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="font-bubbly"
                  style={{
                    margin: 0, fontSize: "clamp(24px,6vw,40px)", fontWeight: 700,
                    color: "#2d2950", lineHeight: 1.2,
                    textShadow: "2px 2px 0px rgba(108,99,255,0.15)"
                  }}
                >
                  {story.title}
                </motion.h1>

                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="font-bubbly"
                  style={{
                    margin: "clamp(8px,3vw,16px) auto 0", color: "#4a4568", fontSize: "clamp(14px,3vw,17px)",
                    fontWeight: 600, lineHeight: 1.6, maxWidth: 520,
                    background: "linear-gradient(135deg, #F0FFF4, #EEF2FF)",
                    display: "inline-block", padding: "8px 24px",
                    borderRadius: 20, border: "2px solid #2d2950",
                    boxShadow: "2px 2px 0px #2d2950"
                  }}
                >
                {story.logline}
                </motion.p>

                
                {/* Action buttons */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  style={{ display: "flex", justifyContent: "center", gap: "clamp(12px,3vw,24px)", marginTop: "clamp(16px,4vw,28px)", flexWrap: "wrap" }}
                >
                  <motion.button
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startCinemaMode}
                    className="sticker font-bubbly"
                    style={{
                      padding: "clamp(8px,2.5vw,12px) clamp(16px,4vw,28px)",
                      background: "linear-gradient(135deg, #6C63FF, #8B7FFF)",
                      color: "#ffffff", cursor: "pointer",
                      fontSize: "clamp(14px,3vw,17px)", fontWeight: 700,
                      letterSpacing: "2px",
                      display: "flex", alignItems: "center", gap: "clamp(6px,2vw,10px)",
                      boxShadow: "3px 3px 0px #2d2950"
                    }}
                  >
                    ▶ Watch Story
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      stopBgMusic();
                      setStory(null); setPrompt(""); setSceneImages({});
                    }}
                    className="sticker font-bubbly"
                    style={{
                      padding: "clamp(8px,2.5vw,12px) clamp(16px,4vw,28px)",
                      background: "linear-gradient(135deg, #FF8BA7, #FFB3C6)",
                      color: "#ffffff",
                      fontSize: "clamp(14px,3vw,17px)", fontWeight: 700,
                      letterSpacing: "2px",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "clamp(6px,2vw,10px)",
                      boxShadow: "3px 3px 0px #2d2950"
                    }}
                  >
                    ✦ New Story
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* Book page */}
              <div className="sticker" style={{
                background: "#ffffff",
                padding: "clamp(16px,4vw,40px) clamp(16px,5vw,48px)",
                position: "relative",
                zIndex: 1,
                borderTopWidth: 6,
                borderTopColor: accentColor,
              }}>
                {scene && (
                  <div style={{ animation: "fadeIn 0.4s ease" }}>
                    {/* Page number pill */}
                    <div style={{ textAlign: "center", marginBottom: "clamp(12px,3vw,20px)" }}>
                      <span className="font-bubbly sticker" style={{
                        display: "inline-block",
                        background: accentColor,
                        color: "#ffffff",
                        fontSize: "clamp(12px,2.5vw,14px)", fontWeight: 700,
                        padding: "clamp(4px,1.5vw,6px) clamp(12px,4vw,20px)",
                        boxShadow: "2px 2px 0px #2d2950",
                        textTransform: "uppercase",
                        letterSpacing: "1px"
                      }}>
                        Page {activeScene + 1} of {totalScenes}
                      </span>
                    </div>

                    {/* Scene image / Video Player */}
                    <div
                      ref={videoContainerRef}
                      className="sticker"
                      style={{
                        background: "#FFF9E6",
                        padding: "clamp(12px,3vw,16px)",
                        display: "flex", justifyContent: "center", alignItems: "center",
                        minHeight: "clamp(200px,50vw,280px)",
                        marginBottom: "clamp(16px,4vw,32px)",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
       
                        {imagesLoading && !currentSceneImage ? (
                        <div style={{  color: "#9ca3af", fontSize: "clamp(13px,3vw,15px)", padding: "clamp(24px,4vw,48px)", textAlign: "center" }}>
                          <div style={{
                            width: "clamp(36px,8vw,48px)", height: "clamp(36px,8vw,48px)", borderRadius: "50%",
                            border: `3px solid ${accentColor}30`,
                            borderTopColor: accentColor,
                            animation: "spin 0.8s linear infinite",
                            margin: "0 auto 16px"
                          }} />
                          Painting this scene...
                        </div>
                      ) : currentSceneImage ? (
                       <AnimatePresence mode="wait">
                        <motion.img
                          key={activeScene}
                          ref={scope}
                          src={currentSceneImage}
                          alt={`Scene ${activeScene + 1}`}
                          initial={{ opacity: 0, scale: 1.05 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                          onLoad={() => {
                            if (activeNarrationIndex === activeScene) {
                              runAnimationCues(story.scenes[activeScene]?.animation_cues);
                            }
                          }}
                          style={{
                            width: "90%", maxHeight: "clamp(200px,60vw,600px)",
                            objectFit: "fill",
                            borderRadius: "clamp(8px,2vw,14px)",
                            boxShadow: `0 8px 30px ${accentColor}20`
                          }}
                        />
                      </AnimatePresence>
                      ) : (
                        <div style={{ color: "#b0aec4", fontSize: "clamp(12px,2.5vw,14px)", padding: "clamp(24px,4vw,48px)", textAlign: "center" }}>
                          <div style={{
                            width: "clamp(40px,10vw,52px)", height: "clamp(40px,10vw,52px)", borderRadius: "clamp(12px,2vw,16px)",
                            background: `${accentColor}12`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 12px"
                          }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                            </svg>
                          </div>
                          Image coming soon
                        </div>
                      )}

                      {/* Cinematic Caption Overlay */}
                      {activeNarrationIndex === activeScene && (
                        <div style={{
                          position: "absolute", bottom: "6%", left: "5%", right: "5%",
                          textAlign: "center", zIndex: 10, animation: "fadeIn 0.5s ease"
                        }}>
                          <div className="sticker font-bubbly" style={{
                            display: "inline-block", padding: "clamp(8px,2.5vw,12px) clamp(16px,4vw,24px)",
                            background: "#ffffff",
                            color: "#2d2950",
                            fontSize: isCinemaMode ? "clamp(20px,5vw,32px)" : "clamp(16px,4vw,24px)", lineHeight: 1.4,
                            fontWeight: 700,
                            maxWidth: "90%", wordWrap: "break-word"
                          }}>
                            {(() => {
                              const transcription = getActiveTranscription();
                              if (transcription && transcription.words && transcription.words.length > 0) {
                                const currentWordIdx = transcription.words.findIndex(
                                  w => currentNarrationTime >= w.start && currentNarrationTime <= w.end
                                );
                                const activeIdx = currentWordIdx !== -1 ? currentWordIdx :
                                  transcription.words.findIndex(w => w.start > currentNarrationTime);
                                const displayIdx = activeIdx !== -1 ? activeIdx : 0;
                                const windowSize = 6;
                                const start = Math.max(0, displayIdx - 2);
                                const end = Math.min(transcription.words.length, start + windowSize);
                                return transcription.words.slice(start, end).map((w, i) => (
                                  <span key={i} style={{
                                    backgroundColor: currentNarrationTime >= w.start && currentNarrationTime <= w.end ? "#FFCF54" : "transparent",
                                    color: "#2d2950",
                                    padding: "2px 6px", borderRadius: 8,
                                    border: currentNarrationTime >= w.start && currentNarrationTime <= w.end ? "2px solid #2d2950" : "2px solid transparent",
                                    transition: "all 0.1s ease", marginRight: "0.15em", display: "inline-block",
                                    transform: currentNarrationTime >= w.start && currentNarrationTime <= w.end ? "scale(1.1) rotate(-2deg)" : "none"
                                  }}>
                                    {w.word}
                                  </span>
                                ));
                              }
                              return transcription?.text || story.scenes[activeScene]?.narration;
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Cinema Mode Close Button */}
                      {isCinemaMode && (
                        <button
                          onClick={() => {
                            if (audioRef.current) audioRef.current.pause();
                            stopBgMusic();
                            setIsCinemaMode(false);
                          }}
                          className="sticker font-bubbly"
                          style={{
                            position: "absolute", top: "clamp(8px,2vw,16px)", right: "clamp(8px,2vw,16px)",
                            background: "#FF8BA7", color: "#2d2950",
                            padding: "clamp(6px,1.5vw,8px) clamp(12px,3vw,20px)", cursor: "pointer",
                            zIndex: 105, fontWeight: 700, fontSize: "clamp(12px,3vw,16px)",
                            boxShadow: "2px 2px 0px #2d2950"
                          }}
                        >
                          Exit
                        </button>
                      )}
                    </div>

                    {/* Audio Controls */}
                    <div className="sticker" style={{
                      background: "#F0FFF4",
                      padding: "clamp(12px,3vw,16px) clamp(12px,4vw,24px)",
                      display: "flex", alignItems: "center", gap: "clamp(8px,3vw,16px)",
                      marginBottom: "clamp(12px,3vw,24px)",
                      flexWrap: "wrap"
                    }}>
                      <button
                        onClick={() => {
                          if (activeNarrationIndex === activeScene) {
                            handlePauseResume();
                          } else {
                            handlePlayNarration(activeScene);
                          }
                        }}
                        className="sticker"
                        style={{
                          background: "#FF8BA7",
                          color: "#2d2950",
                          width: "clamp(40px,10vw,48px)", height: "clamp(40px,10vw,48px)", borderRadius: "50%",
                          fontSize: "clamp(14px,3vw,20px)", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "2px 2px 0px #2d2950",
                          flexShrink: 0,
                          padding: 0
                        }}
                      >
                        {activeNarrationIndex === activeScene && !isPaused ? "⏸" : "▶"}
                      </button>
                      <div className="font-bubbly" style={{ fontSize: "clamp(12px,2.5vw,16px)", color: "#2d2950", fontWeight: 700, minWidth: "clamp(40px,8vw,48px)" }}>
                        {currentNarrationTime.toFixed(1)}s
                      </div>
                      <div className="sticker" style={{ flex: 1, minWidth: 100, height: "clamp(12px,2vw,16px)", background: "#ffffff", borderRadius: 16, position: "relative", padding: 0, border: "2px solid #2d2950", boxShadow: "inset 1px 1px 0px rgba(0,0,0,0.1), 1px 1px 0px #2d2950" }}>
                        <div style={{
                          position: "absolute", left: -1, top: -1, bottom: -1,
                          width: `${Math.min(100, (currentNarrationTime / (story.scenes[activeScene]?.duration_seconds || 10)) * 100)}%`,
                          background: "#FFCF54", borderRadius: 12,
                          border: "2px solid #2d2950",
                          transition: "width 0.2s linear"
                        }} />
                      </div>
                      {/* Narration Volume */}
                      <div style={{ display: "flex", alignItems: "center", gap: "clamp(4px,1.5vw,6px)", minWidth: "auto" }}>
                        <svg width="clamp(12px,3vw,16px)" height="clamp(12px,3vw,16px)" viewBox="0 0 24 24" fill={accentColor} stroke="none">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                        <input
                          type="range"
                          min="0" max="1" step="0.05"
                          value={narrationVolume}
                          onChange={e => {
                            const vol = parseFloat(e.target.value);
                            setNarrationVolume(vol);
                            if (audioRef.current) audioRef.current.volume = vol;
                          }}
                          style={{
                            width: "clamp(40px,15vw,64px)", height: 4, appearance: "none", WebkitAppearance: "none",
                            background: `linear-gradient(90deg, ${accentColor} ${narrationVolume * 100}%, ${accentColor}20 ${narrationVolume * 100}%)`,
                            borderRadius: 4, outline: "none", cursor: "pointer"
                          }}
                        />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={toggleFullscreen}
                        className="sticker font-bubbly"
                        style={{
                          background: accentColor, border: "2px solid #2d2950", color: "#2d2950",
                          padding: "clamp(6px,1.5vw,8px) clamp(12px,2.5vw,16px)", borderRadius: "clamp(8px,2vw,12px)",
                          fontSize: "clamp(12px,2.5vw,14px)", fontWeight: 700, cursor: "pointer",
                          boxShadow: "2px 2px 0px #2d2950",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {isFullscreen ? "Exit" : "⛶"}
                      </motion.button>
                    </div>

                    {/* Narration */}
                    <div className="sticker" style={{
                      background: "#F0FFF4",
                      padding: "clamp(16px,4vw,24px) clamp(16px,5vw,32px)",
                      marginBottom: "clamp(12px,3vw,16px)"
                    }}>
                      <p className="font-bubbly" style={{
                        margin: 0, fontSize: "clamp(14px,3.5vw,20px)", lineHeight: 1.6,
                        color: "#2d2950", fontWeight: 600, textAlign: "center"
                      }}>
                        {scene.narration}
                      </p>
                    </div>

                    {/* Ending note on last page */}
                    {activeScene === totalScenes - 1 && story.ending_note && (
                      <div className="sticker" style={{
                        marginTop: "clamp(12px,3vw,24px)", padding: "clamp(16px,4vw,24px)",
                        textAlign: "center",
                        background: "#FFF9E6",
                      }}>
                        <div style={{
                          fontSize: "clamp(28px,8vw,40px)",
                          margin: "0 auto clamp(8px,2vw,12px)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          filter: "drop-shadow(2px 2px 0px #2d2950)"
                        }}>
                        </div>
                        <div className="font-bubbly" style={{ color: "#2d2950", fontSize: "clamp(16px,4vw,22px)", fontWeight: 600, lineHeight: 1.5 }}>
                          {story.ending_note}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "clamp(8px,2vw,16px)",
                  marginTop: "clamp(16px,4vw,32px)", paddingTop: "clamp(12px,3vw,24px)",
                  borderTop: "3px dashed #e0ddf0"
                }}>
                  <motion.button
                    whileHover={{ scale: activeScene === 0 ? 1 : 1.05 }}
                    onClick={() => setActiveScene(Math.max(0, activeScene - 1))}
                    disabled={activeScene === 0}
                    className="sticker font-bubbly"
                    style={{
                      padding: "clamp(8px,2vw,12px) clamp(16px,3vw,28px)",
                      background: activeScene === 0 ? "#e0ddf0" : "#6EE7B7",
                      color: "#2d2950",
                      fontSize: "clamp(14px,3vw,18px)", fontWeight: 700,
                      cursor: activeScene === 0 ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: "clamp(4px,1.5vw,8px)",
                      opacity: activeScene === 0 ? 0.6 : 1
                    }}
                  >
                    ⬅ Previous
                  </motion.button>

                  <div style={{ display: "flex", gap: "clamp(6px,1.5vw,12px)", flexWrap: "wrap", justifyContent: "center", flex: "0 1 auto" }}>
                    {story.scenes?.map((_, i) => (
                      <motion.div
                        key={i}
                        onClick={() => setActiveScene(i)}
                        animate={{
                          scale: activeScene === i ? 1.2 : 1,
                        }}
                        className="sticker"
                        style={{
                          width: activeScene === i ? "clamp(18px,4vw,24px)" : "clamp(12px,3vw,16px)",
                          height: activeScene === i ? "clamp(18px,4vw,24px)" : "clamp(12px,3vw,16px)",
                          borderRadius: "50%",
                          background: activeScene === i
                            ? "#FFCF54"
                            : "#ffffff",
                          cursor: "pointer",
                          padding: 0
                        }}
                      />
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: activeScene === totalScenes - 1 ? 1 : 1.05 }}
                    onClick={() => setActiveScene(Math.min(totalScenes - 1, activeScene + 1))}
                    disabled={activeScene === totalScenes - 1}
                    className="sticker font-bubbly"
                    style={{
                      padding: "clamp(8px,2vw,12px) clamp(16px,3vw,28px)",
                      background: activeScene === totalScenes - 1 ? "#e0ddf0" : "#6EE7B7",
                      color: "#2d2950",
                      fontSize: "clamp(14px,3vw,18px)", fontWeight: 700,
                      cursor: activeScene === totalScenes - 1 ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: "clamp(4px,1.5vw,8px)",
                      opacity: activeScene === totalScenes - 1 ? 0.6 : 1
                    }}
                  >
                    Next ➡
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <style>{`
        textarea:focus { border-color: #6C63FF !important; box-shadow: 0 0 0 3px rgba(108,99,255,0.12) !important; }
        button:hover:not(:disabled) { transform: translateY(-1px); }
        button:active:not(:disabled) { transform: translateY(0); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d0cee8; border-radius: 3px; }
      `}</style>
    </div>
  );
}

export default App;
