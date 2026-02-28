import { useEffect, useState, useRef } from "react";
import { generateStoryFromPrompt } from "./services/mistralService";
import { generateImageFromPrompt } from "./services/hfService";
import { speakNarration, playAudio } from "./services/voiceService";
import { transcribeAudio } from "./services/transcriptionService";
import { motion } from "framer-motion";

const MAGICAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background: #020204;
}

@keyframes aurora {
  0% { filter: hue-rotate(0deg) brightness(1); }
  50% { filter: hue-rotate(30deg) brightness(1.2); }
  100% { filter: hue-rotate(0deg) brightness(1); }
}

.aurora-bg {
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 30%, #1a1a3a 0%, transparent 40%),
              radial-gradient(circle at 70% 60%, #2a1a3a 0%, transparent 40%),
              radial-gradient(circle at 40% 80%, #1a2a3a 0%, transparent 40%);
  filter: blur(80px);
  animation: aurora 15s infinite ease-in-out;
  z-index: -1;
  opacity: 0.6;
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
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

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

  // FIX: was never called — wired up to pause button below
  const handlePauseResume = () => {
    if (!audioRef.current) return;
    if (isPaused) {
      audioRef.current.play();
      setIsPaused(false);
    } else {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const startCinemaMode = async () => {
    if (!story?.scenes?.length) return;
    setIsCinemaMode(true);

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

    setIsCinemaMode(false);
  };

  const getActiveTranscription = () => transcriptions[activeScene] || null;

  const scene = story?.scenes?.[activeScene];
  const currentSceneImage = sceneImages[activeScene];
  const totalScenes = story?.scenes?.length || 0;

  const pageColors = ["#6366f1", "#a855f7", "#ec4899", "#06b6d4", "#8b5cf6"];
  const accentColor = pageColors[activeScene % pageColors.length];

  return (
    <>
      <div style={{
        minHeight: "100vh",
        color: "#f8fafc",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: 0,
        overflowX: "hidden",
        position: "relative"
      }}>
        <style>{MAGICAL_STYLES}</style>
        <div className="aurora-bg" />

        {/* Cinematic Grain */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
        }} />

        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ padding: "40px 0 20px", textAlign: "center" }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                style={{
                  width: 54, height: 54, borderRadius: 18,
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)",
                  border: "1px solid rgba(255,255,255,0.2)"
                }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </motion.div>
              <div style={{ textAlign: "left" }}>
                <div style={{
                  fontSize: 36, fontWeight: 900, letterSpacing: "-0.03em",
                  background: "linear-gradient(to right, #fff, #a855f7)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  textShadow: "0 10px 20px rgba(0,0,0,0.3)"
                }}>Little Lens</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase" }}>
                  Cinematic AI Storyteller
                </div>
              </div>
            </div>
          </motion.div>

          <div style={{ maxWidth: 840, margin: "0 auto", padding: "0 20px 80px" }}>

            {/* Input Screen */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: "rgba(10, 10, 20, 0.4)",
                backdropFilter: "blur(40px) saturate(180%)",
                borderRadius: 32,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.1)",
                padding: "60px 50px",
                textAlign: "center",
                marginTop: 20
              }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.01em" }}>
                Start your next adventure.
              </div>
              <div style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", marginBottom: 40, fontWeight: 500 }}>
                What shall we dream up today?
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. A tiny robot discovers a field of flowers on a lonely moon..."
                onKeyDown={e => e.key === "Enter" && e.metaKey && generate()}
                style={{
                  width: "100%", minHeight: 140,
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 24,
                  color: "#fff", padding: "24px", fontSize: 18,
                  fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6, resize: "none",
                  outline: "none", boxSizing: "border-box",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
                  transition: "all 0.3s ease"
                }} />
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(99, 102, 241, 0.6)" }}
                whileTap={{ scale: 0.98 }}
                onClick={generate}
                disabled={loading || !prompt.trim()}
                style={{
                  marginTop: 32, padding: "18px 60px",
                  background: loading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                  border: "none", borderRadius: 100,
                  color: loading ? "rgba(255,255,255,0.2)" : "#fff",
                  fontSize: 18, fontWeight: 800, letterSpacing: "0.01em",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 8px 25px rgba(99, 102, 241, 0.3)",
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}
              >
                {loading ? "✨ Manifesting..." : "✦ Create Story"}
              </motion.button>
              {error && (
                <div style={{
                  color: "#f87171", marginTop: 24, fontSize: 14,
                  background: "rgba(248, 113, 113, 0.1)", padding: "12px 20px", borderRadius: 16,
                  border: "1px solid rgba(248, 113, 113, 0.2)"
                }}>
                  {error}
                </div>
              )}
            </motion.div>

            {/* Story View */}
            {story && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{ maxWidth: 1100, margin: "0 auto" }}
              >
                {/* Story Header */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-end",
                  marginBottom: 40, padding: "0 10px"
                }}>
                  <div>
                    <div style={{ fontSize: 13, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
                      {story.genre} • {story.tone}
                    </div>
                    <h1 style={{ margin: 0, fontSize: 42, color: "#fff", fontWeight: 800, letterSpacing: "-0.02em" }}>{story.title}</h1>
                    <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: 500, maxWidth: 600, lineHeight: 1.5 }}>{story.logline}</p>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={startCinemaMode}
                      style={{
                        padding: "14px 28px",
                        background: "linear-gradient(135deg, #6366f1, #a855f7)",
                        border: "none", borderRadius: 100, color: "#fff", cursor: "pointer",
                        fontSize: 15, fontWeight: 800,
                        boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      🎬 Watch Movie
                    </motion.button>
                    <motion.button
                      whileHover={{ background: "rgba(255,255,255,0.1)" }}
                      onClick={() => { setStory(null); setPrompt(""); setSceneImages({}); }}
                      style={{
                        padding: "14px 24px", background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff", cursor: "pointer", borderRadius: 100, fontSize: 14, fontWeight: 700
                      }}
                    >
                      ← New Story
                    </motion.button>
                  </div>
                </div>

                {/* Global Music Bar */}
                <div style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 20,
                  padding: "18px 28px", marginBottom: 32,
                  display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
                }}>
                  {/* FIX: broken emoji replaced */}
                  <div style={{ fontSize: 24 }}>🎵</div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Mood & Tempo</div>
                    <div style={{ color: "#a855f7", fontSize: 15, fontWeight: 700 }}>{story.global_music?.mood} · {story.global_music?.tempo}</div>
                  </div>
                  <div style={{ height: 32, width: 1, background: "rgba(255,255,255,0.1)" }} />
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Orchestration</div>
                    <div style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{story.global_music?.instruments?.join(", ")}</div>
                  </div>
                  <div style={{ height: 32, width: 1, background: "rgba(255,255,255,0.1)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700 }}>Artistic Style</div>
                    <div style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>{story.global_music?.reference_track_style}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>⏱ {story.total_duration_seconds}s</div>
                </div>

                {/* Cinematic Stage */}
                <div style={{
                  background: "rgba(10, 10, 20, 0.4)",
                  backdropFilter: "blur(40px) saturate(180%)",
                  borderRadius: 32,
                  boxShadow: "0 30px 60px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
                  padding: "40px",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {scene && (
                    <div style={{ animation: "fadeIn 0.4s ease" }}>

                      {/* Narration Display */}
                      <div style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: 20,
                        padding: 32,
                        marginBottom: 20,
                        boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)"
                      }}>
                        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>Active Narration</div>
                        <p style={{ margin: 0, fontSize: 22, lineHeight: 1.6, color: "#fff", fontWeight: 500, fontStyle: "italic" }}>
                          "{scene.narration}"
                        </p>
                      </div>

                      {/* Video Player */}
                      <div style={{ marginBottom: 20 }}>
                        <div
                          ref={videoContainerRef}
                          style={{
                            position: "relative",
                            width: "100%",
                            aspectRatio: isFullscreen ? "auto" : "16/9",
                            height: isFullscreen ? "100vh" : "auto",
                            overflow: "hidden",
                            borderRadius: isCinemaMode || isFullscreen ? 0 : 20,
                            border: isCinemaMode || isFullscreen ? "none" : `1px solid rgba(255, 255, 255, 0.1)`,
                            boxShadow: isFullscreen ? "none" : "0 30px 100px rgba(0,0,0,0.6)",
                            background: "#000",
                            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
                          }}>
                          {currentSceneImage ? (
                            <motion.img
                              key={`${activeScene}-${activeNarrationIndex}`}
                              src={currentSceneImage}
                              alt="Scene"
                              initial={(() => {
                                const type = story.scenes[activeScene]?.animation_cues?.[0]?.type || 'subtle-pan';
                                switch (type) {
                                  case 'zoom-in': return { scale: 1 };
                                  case 'zoom-out': return { scale: 1.15 };
                                  case 'pan-right': return { scale: 1.1, x: "-5%" };
                                  case 'pan-left': return { scale: 1.1, x: "5%" };
                                  default: return { scale: 1.1, y: "-3%" };
                                }
                              })()}
                              animate={activeNarrationIndex === activeScene ? (() => {
                                const type = story.scenes[activeScene]?.animation_cues?.[0]?.type || 'subtle-pan';
                                switch (type) {
                                  case 'zoom-in': return { scale: 1.15 };
                                  case 'zoom-out': return { scale: 1 };
                                  case 'pan-right': return { scale: 1.1, x: "5%" };
                                  case 'pan-left': return { scale: 1.1, x: "-5%" };
                                  default: return { scale: 1.1, y: "3%" };
                                }
                              })() : {}}
                              transition={{
                                duration: story.scenes[activeScene]?.duration_seconds || 10,
                                ease: "linear"
                              }}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <div style={{ color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300 }}>
                              {imagesLoading ? "⏳ Bringing scene to life..." : "No image yet"}
                            </div>
                          )}

                          {/* Overlay Gradient */}
                          <div style={{
                            position: "absolute", inset: 0,
                            background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.7) 100%)",
                            pointerEvents: "none"
                          }} />

                          {/* Cinematic Caption Overlay */}
                          {activeNarrationIndex === activeScene && (
                            <div style={{
                              position: "absolute", bottom: "8%", left: "5%", right: "5%",
                              textAlign: "center", zIndex: 10, animation: "fadeIn 0.5s ease"
                            }}>
                              <div style={{
                                display: "inline-block", padding: "6px 20px", color: "#fff",
                                fontSize: isCinemaMode ? 32 : 24, lineHeight: 1.4,
                                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: "800",
                                textShadow: "0 2px 12px rgba(0,0,0,0.9)",
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
                                        backgroundColor: currentNarrationTime >= w.start && currentNarrationTime <= w.end ? "#f1c40f" : "transparent",
                                        color: currentNarrationTime >= w.start && currentNarrationTime <= w.end ? "#000" : "#fff",
                                        padding: "0 6px", borderRadius: "6px",
                                        transition: "all 0.1s ease", marginRight: "0.2em", display: "inline-block"
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

                          {/* Video Controls Overlay */}
                          <div style={{
                            position: "absolute",
                            bottom: isFullscreen ? 30 : 20,
                            left: "50%", transform: "translateX(-50%)",
                            width: "90%",
                            background: "rgba(10, 10, 15, 0.75)",
                            backdropFilter: "blur(16px)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            padding: "12px 24px",
                            display: "flex", alignItems: "center", gap: 20,
                            borderRadius: 100,
                            opacity: isCinemaMode ? (activeNarrationIndex === null ? 1 : 0.3) : 1,
                            transition: "all 0.3s ease",
                            zIndex: 100,
                            boxShadow: "0 15px 45px rgba(0,0,0,0.5)"
                          }}>
                            {/* FIX: Play/Pause now correctly toggles between play and pause states */}
                            <button
                              onClick={() => {
                                if (activeNarrationIndex === activeScene) {
                                  handlePauseResume();
                                } else {
                                  handlePlayNarration(activeScene);
                                }
                              }}
                              style={{
                                background: "#6C63FF", border: "none", color: "#fff",
                                width: 44, height: 44, borderRadius: "50%",
                                fontSize: 20, cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "transform 0.2s",
                                boxShadow: "0 4px 10px rgba(108,99,255,0.4)"
                              }}
                            >
                              {activeNarrationIndex === activeScene && !isPaused ? "⏸" : "▶"}
                            </button>
                            <div style={{ fontSize: 14, color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: "800", width: 45 }}>
                              {currentNarrationTime.toFixed(1)}s
                            </div>
                            <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 10, position: "relative" }}>
                              <div style={{
                                position: "absolute", left: 0, top: 0, bottom: 0,
                                width: `${(currentNarrationTime / (story.scenes[activeScene]?.duration_seconds || 10)) * 100}%`,
                                background: `linear-gradient(90deg, ${accentColor}, #a855f7)`, borderRadius: 10,
                                boxShadow: `0 0 20px ${accentColor}80`
                              }} />
                            </div>
                            <motion.button
                              whileHover={{ background: "rgba(255,255,255,0.2)" }}
                              onClick={toggleFullscreen}
                              style={{
                                background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
                                padding: "10px 20px", borderRadius: 50,
                                fontSize: 13, fontWeight: "800", cursor: "pointer"
                              }}
                            >
                              {isFullscreen ? "↙ Exit" : "⛶ Fullscreen"}
                            </motion.button>
                          </div>

                          {/* Cinema Mode Close Button */}
                          {isCinemaMode && (
                            <button
                              onClick={() => {
                                if (audioRef.current) audioRef.current.pause();
                                setIsCinemaMode(false);
                              }}
                              style={{
                                position: "absolute", top: 24, right: 24,
                                background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
                                color: "#fff", padding: "10px 18px", borderRadius: 50, cursor: "pointer",
                                zIndex: 105, fontWeight: "bold", backdropFilter: "blur(8px)"
                              }}
                            >
                              ✕ Close
                            </button>
                          )}
                        </div>{/* end videoContainerRef */}
                      </div>{/* end video player section */}

                      {/* Setting & Characters */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                        <div style={{
                          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: 24, padding: 24, boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)"
                        }}>
                          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>🌍 Setting</div>
                          {[["Location", scene.setting?.location], ["Time", scene.setting?.time_of_day], ["Weather", scene.setting?.weather]].map(([k, v]) => (
                            <div key={k} style={{ marginBottom: 10 }}>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>{k}: </span>
                              <span style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{v}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{
                          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: 24, padding: 24, boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)"
                        }}>
                          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>👤 Characters</div>
                          {scene.characters?.slice(0, 2).map((c, i) => (
                            <div key={i} style={{ marginBottom: 12 }}>
                              <div style={{ color: "#a855f7", fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{c.action}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Narration Highlight */}
                      <div style={{
                        background: "rgba(99, 102, 241, 0.1)", borderRadius: 24, padding: "32px",
                        border: "1px solid rgba(99, 102, 241, 0.2)", marginBottom: 20,
                        boxShadow: "0 0 40px rgba(99, 102, 241, 0.1)"
                      }}>
                        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.8, color: "rgba(255,255,255,0.7)", fontWeight: 500, textAlign: "center" }}>
                          {scene.narration}
                        </p>
                      </div>

                      {/* Ending Note */}
                      {activeScene === totalScenes - 1 && story.ending_note && (
                        <div style={{
                          marginTop: 30, padding: "32px", textAlign: "center",
                          background: "rgba(168, 85, 247, 0.1)", borderRadius: 24,
                          border: "1px solid rgba(168, 85, 247, 0.2)"
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "linear-gradient(135deg, #FFB84D, #FF6B9D)",
                            margin: "0 auto 10px",
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                          <div style={{ color: "#4a4570", fontSize: 15, fontWeight: 500, lineHeight: 1.7 }}>
                            {story.ending_note}
                          </div>
                        </div>
                      )}

                      {/* Navigation Bar */}
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginTop: 40, paddingTop: 30,
                        borderTop: "1px solid rgba(255,255,255,0.05)"
                      }}>
                        <motion.button
                          whileHover={{ x: -2 }}
                          onClick={() => setActiveScene(Math.max(0, activeScene - 1))}
                          disabled={activeScene === 0}
                          style={{
                            padding: "12px 24px",
                            background: activeScene === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.05)", borderRadius: 100,
                            color: activeScene === 0 ? "rgba(255,255,255,0.1)" : "#fff",
                            fontSize: 14, fontWeight: 700,
                            cursor: activeScene === 0 ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 10
                          }}
                        >
                          ← Prev
                        </motion.button>

                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          {story.scenes?.map((_, i) => (
                            <motion.div
                              key={i}
                              onClick={() => setActiveScene(i)}
                              animate={{
                                width: activeScene === i ? 32 : 10,
                                backgroundColor: activeScene === i ? "#6366f1" : "rgba(255,255,255,0.1)"
                              }}
                              style={{
                                height: 10, borderRadius: 5, cursor: "pointer",
                                boxShadow: activeScene === i ? "0 0 15px rgba(99, 102, 241, 0.5)" : "none"
                              }}
                            />
                          ))}
                        </div>

                        <motion.button
                          whileHover={{ x: 2 }}
                          onClick={() => setActiveScene(Math.min(totalScenes - 1, activeScene + 1))}
                          disabled={activeScene === totalScenes - 1}
                          style={{
                            padding: "12px 24px",
                            background: activeScene === totalScenes - 1 ? "rgba(255,255,255,0.03)" : "linear-gradient(135deg, #6366f1, #a855f7)",
                            border: "none", borderRadius: 100,
                            color: activeScene === totalScenes - 1 ? "rgba(255,255,255,0.1)" : "#fff",
                            fontSize: 14, fontWeight: 700,
                            cursor: activeScene === totalScenes - 1 ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 10
                          }}
                        >
                          Next →
                        </motion.button>
                      </div>

                    </div>
                  )}{/* end scene && */}
                </div>{/* end Cinematic Stage */}
              </motion.div>
            )}{/* end story && */}

          </div>
        </div>

        <style>{`
          textarea:focus { border-color: rgba(99, 102, 241, 0.5) !important; box-shadow: 0 0 40px rgba(99, 102, 241, 0.2) !important; }
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        `}</style>
      </div>
    </>
  );
}

export default App;
