import { useEffect, useState, useRef } from "react";
import { generateStoryFromPrompt } from "./services/mistralService";
import { generateImageFromPrompt } from "./services/hfService";
import { speakNarration, playAudio } from "./services/voiceService";
import { transcribeAudio } from "./services/transcriptionService";
import { startBgMusic, stopBgMusic, pauseBgMusic, resumeBgMusic } from "./services/bgMusicService";
import { motion } from "framer-motion";

const MAGICAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  background: linear-gradient(160deg, #e8f0fe 0%, #f3e8ff 35%, #fce4ec 65%, #fff8e1 100%);
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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

  // FIX: was never called — wired up to pause button below
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
      background: "linear-gradient(160deg, #e8f0fe 0%, #f3e8ff 35%, #fce4ec 65%, #fff8e1 100%)",
      fontFamily: "'Nunito', 'Quicksand', 'Segoe UI', sans-serif",
      padding: 0,
      overflow: "hidden"
    }}>
      <style>{MAGICAL_STYLES}</style>

      {/* Decorative background shapes */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,157,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "40%", left: "60%", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,201,167,0.06) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ padding: "28px 0 20px", textAlign: "center" }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: "linear-gradient(135deg, #6C63FF, #A78BFA)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 14px rgba(108,99,255,0.3)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </motion.div>
            <div style={{
              fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #6C63FF, #FF6B9D)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>Little Lens</div>
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", letterSpacing: "0.08em", marginTop: 4, fontWeight: 500 }}>
            Where every story comes alive
          </div>
        </motion.div>

        {/* === INPUT SCREEN === */}
        {!story && (
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 60px" }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(20px)",
                borderRadius: 28,
                boxShadow: "0 12px 40px rgba(108,99,255,0.1), 0 4px 12px rgba(0,0,0,0.04)",
                padding: "52px 44px",
                textAlign: "center",
                border: "1px solid rgba(108,99,255,0.12)",
                marginTop: 12
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: "#3b3660", marginBottom: 8, lineHeight: 1.3 }}>
                What story shall we tell today?
              </div>
              <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 32, fontWeight: 400 }}>
                Describe a little adventure and watch it come to life
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="A bunny learns to share her carrots with friends..."
                onKeyDown={e => e.key === "Enter" && e.metaKey && generate()}
                style={{
                  width: "100%", minHeight: 110, background: "#f8f7ff",
                  border: "2px solid #e8e4f8", borderRadius: 18,
                  color: "#3b3660", padding: "18px 20px", fontSize: 16,
                  fontFamily: "'Nunito', sans-serif", lineHeight: 1.7, resize: "vertical",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.3s, box-shadow 0.3s"
                }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={generate}
                disabled={loading || !prompt.trim()}
                style={{
                  marginTop: 24, padding: "15px 48px",
                  background: loading ? "#e8e4f8" : "linear-gradient(135deg, #6C63FF 0%, #A78BFA 100%)",
                  border: "none", borderRadius: 50,
                  color: loading ? "#a09cc0" : "#fff",
                  fontSize: 16, fontWeight: 700, letterSpacing: "0.02em",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 6px 24px rgba(108,99,255,0.35)",
                  transition: "all 0.3s ease",
                  fontFamily: "'Nunito', sans-serif"
                }}
              >
                {loading ? "Creating your story..." : "Tell Me a Story"}
              </motion.button>
              {error && (
                <div style={{
                  color: "#e53e3e", marginTop: 18, fontSize: 14,
                  background: "#fff5f5", padding: "10px 18px", borderRadius: 12,
                  border: "1px solid #fed7d7"
                }}>
                  {error}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* === STORY BOOK VIEW === */}
        {story && (
          <div style={{ margin: "0 auto", padding: "0 32px 60px" }}>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ animation: "fadeIn 0.5s ease" }}
            >

              {/* Title card */}
              <div style={{
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(20px)",
                borderRadius: "28px 28px 0 0",
                padding: "32px 36px 20px",
                textAlign: "center",
                borderTop: `4px solid ${accentColor}`,
                borderLeft: "1px solid rgba(108,99,255,0.08)",
                borderRight: "1px solid rgba(108,99,255,0.08)"
              }}>
                <h1 style={{
                  margin: 0, fontSize: 28, fontWeight: 800,
                  color: "#2d2950", lineHeight: 1.3
                }}>
                  {story.title}
                </h1>
                <p style={{
                  margin: "10px 0 0", color: "#8b8aa0", fontSize: 14,
                  fontWeight: 400, lineHeight: 1.5
                }}>
                  {story.logline}
                </p>
                {/* Action buttons */}
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startCinemaMode}
                    style={{
                      padding: "10px 24px",
                      background: "linear-gradient(135deg, #6C63FF, #A78BFA)",
                      border: "none", borderRadius: 50, color: "#fff", cursor: "pointer",
                      fontSize: 13, fontWeight: 700,
                      boxShadow: "0 4px 14px rgba(108,99,255,0.3)",
                      fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Watch Story
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      stopBgMusic();
                      setStory(null); setPrompt(""); setSceneImages({});
                    }}
                    style={{
                      padding: "10px 24px",
                      background: "transparent",
                      border: "1.5px solid rgba(108,99,255,0.2)",
                      borderRadius: 50, color: "#8b8aa0",
                      fontSize: 13, fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'Nunito', sans-serif"
                    }}
                  >
                    New Story
                  </motion.button>
                </div>
              </div>

              {/* Book page */}
              <div style={{
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(20px)",
                borderRadius: "0 0 28px 28px",
                boxShadow: "0 12px 40px rgba(108,99,255,0.08), 0 4px 12px rgba(0,0,0,0.04)",
                padding: "0 48px 40px",
                border: "1px solid rgba(108,99,255,0.08)",
                borderTop: "none",
                position: "relative"
              }}>
                {scene && (
                  <div style={{ animation: "fadeIn 0.4s ease" }}>
                    {/* Page number pill */}
                    <div style={{ textAlign: "center", padding: "18px 0 14px" }}>
                      <span style={{
                        display: "inline-block",
                        background: `${accentColor}18`,
                        color: accentColor,
                        fontSize: 12, fontWeight: 700,
                        padding: "4px 16px", borderRadius: 20,
                        letterSpacing: "0.1em", textTransform: "uppercase"
                      }}>
                        Page {activeScene + 1} of {totalScenes}
                      </span>
                    </div>

                    {/* Scene title */}
                    <h2 style={{
                      textAlign: "center", margin: "0 0 22px",
                      fontSize: 24, color: "#3b3660", fontWeight: 600
                    }}>
                      {scene.title}
                    </h2>

                    {/* Scene image / Video Player */}
                    <div
                      ref={videoContainerRef}
                      style={{
                        background: "linear-gradient(135deg, #f0eeff 0%, #fdf0f5 50%, #f0faf7 100%)",
                        borderRadius: 20, padding: 14,
                        display: "flex", justifyContent: "center", alignItems: "center",
                        minHeight: 280,
                        border: `1px solid ${accentColor}20`,
                        marginBottom: 28,
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
       
                          cons.log               {imagesLoading && !currentSceneImage ? (
                        <div style={{  color: "#9ca3af", fontSize: 15, padding: 48, textAlign: "center" }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: "50%",
                            border: `3px solid ${accentColor}30`,
                            borderTopColor: accentColor,
                            animation: "spin 0.8s linear infinite",
                            margin: "0 auto 16px"
                          }} />
                          Painting this scene...
                        </div>
                      ) : currentSceneImage ? (
                        <motion.img
                          key={`${activeScene}-${activeNarrationIndex}`}
                          src={currentSceneImage}
                          alt={`Scene ${activeScene + 1}`}
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
                          style={{
                            width: "70%", maxHeight: 520,
                            objectFit: "cover",
                            borderRadius: 14,
                            boxShadow: `0 8px 30px ${accentColor}20`
                          }}
                        />
                      ) : (
                        <div style={{ color: "#b0aec4", fontSize: 14, padding: 48, textAlign: "center" }}>
                          <div style={{
                            width: 52, height: 52, borderRadius: 16,
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
                          <div style={{
                            display: "inline-block", padding: "8px 20px",
                            background: "rgba(0,0,0,0.6)", borderRadius: 16,
                            color: "#fff",
                            fontSize: isCinemaMode ? 28 : 20, lineHeight: 1.4,
                            fontFamily: "'Nunito', sans-serif", fontWeight: 700,
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
                                    backgroundColor: currentNarrationTime >= w.start && currentNarrationTime <= w.end ? "#FFB84D" : "transparent",
                                    color: currentNarrationTime >= w.start && currentNarrationTime <= w.end ? "#2d2950" : "#fff",
                                    padding: "0 4px", borderRadius: 6,
                                    transition: "all 0.1s ease", marginRight: "0.15em", display: "inline-block"
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
                          style={{
                            position: "absolute", top: 16, right: 16,
                            background: "rgba(255,255,255,0.9)", border: "none",
                            color: "#3b3660", padding: "8px 16px", borderRadius: 50, cursor: "pointer",
                            zIndex: 105, fontWeight: 700, fontSize: 13,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            fontFamily: "'Nunito', sans-serif"
                          }}
                        >
                          Close
                        </button>
                      )}
                    </div>

                    {/* Audio Controls */}
                    <div style={{
                      background: `${accentColor}08`,
                      borderRadius: 16, padding: "14px 24px",
                      display: "flex", alignItems: "center", gap: 16,
                      marginBottom: 24,
                      border: `1px solid ${accentColor}15`
                    }}>
                      <button
                        onClick={() => {
                          if (activeNarrationIndex === activeScene) {
                            handlePauseResume();
                          } else {
                            handlePlayNarration(activeScene);
                          }
                        }}
                        style={{
                          background: `linear-gradient(135deg, ${accentColor}, #A78BFA)`,
                          border: "none", color: "#fff",
                          width: 40, height: 40, borderRadius: "50%",
                          fontSize: 16, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: `0 4px 12px ${accentColor}40`,
                          flexShrink: 0
                        }}
                      >
                        {activeNarrationIndex === activeScene && !isPaused ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        )}
                      </button>
                      <div style={{ fontSize: 13, color: "#6b5f8a", fontWeight: 700, width: 42, fontFamily: "'Nunito', sans-serif" }}>
                        {currentNarrationTime.toFixed(1)}s
                      </div>
                      <div style={{ flex: 1, height: 6, background: `${accentColor}15`, borderRadius: 10, position: "relative" }}>
                        <div style={{
                          position: "absolute", left: 0, top: 0, bottom: 0,
                          width: `${Math.min(100, (currentNarrationTime / (story.scenes[activeScene]?.duration_seconds || 10)) * 100)}%`,
                          background: `linear-gradient(90deg, ${accentColor}, #A78BFA)`, borderRadius: 10,
                          boxShadow: `0 0 12px ${accentColor}40`,
                          transition: "width 0.2s linear"
                        }} />
                      </div>
                      {/* Narration Volume */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={accentColor} stroke="none">
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
                            width: 64, height: 4, appearance: "none", WebkitAppearance: "none",
                            background: `linear-gradient(90deg, ${accentColor} ${narrationVolume * 100}%, ${accentColor}20 ${narrationVolume * 100}%)`,
                            borderRadius: 4, outline: "none", cursor: "pointer"
                          }}
                        />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={toggleFullscreen}
                        style={{
                          background: `${accentColor}12`, border: "none", color: accentColor,
                          padding: "8px 14px", borderRadius: 50,
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                          fontFamily: "'Nunito', sans-serif"
                        }}
                      >
                        {isFullscreen ? "Exit" : "Fullscreen"}
                      </motion.button>
                    </div>

                    {/* Narration */}
                    <div style={{
                      background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}04)`,
                      borderRadius: 20, padding: "28px 32px",
                      borderLeft: `4px solid ${accentColor}`,
                      marginBottom: 8
                    }}>
                      <p style={{
                        margin: 0, fontSize: 19, lineHeight: 2,
                        color: "#3b3660", fontWeight: 400, textAlign: "center"
                      }}>
                        {scene.narration}
                      </p>
                    </div>

                    {/* Ending note on last page */}
                    {activeScene === totalScenes - 1 && story.ending_note && (
                      <div style={{
                        marginTop: 22, padding: "20px 24px",
                        textAlign: "center",
                        background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(255,107,157,0.08))",
                        borderRadius: 16,
                        border: "1px solid rgba(108,99,255,0.1)"
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: "linear-gradient(135deg, #FFB84D, #FF6B9D)",
                          margin: "0 auto 10px",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <div style={{ color: "#4a4570", fontSize: 15, fontWeight: 500, lineHeight: 1.7 }}>
                          {story.ending_note}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginTop: 30, paddingTop: 22,
                  borderTop: "1px solid rgba(108,99,255,0.08)"
                }}>
                  <motion.button
                    whileHover={{ x: -2 }}
                    onClick={() => setActiveScene(Math.max(0, activeScene - 1))}
                    disabled={activeScene === 0}
                    style={{
                      padding: "11px 26px",
                      background: activeScene === 0 ? "#f0eeff" : "linear-gradient(135deg, #6C63FF, #A78BFA)",
                      border: "none", borderRadius: 50,
                      color: activeScene === 0 ? "#c0bcd8" : "#fff",
                      fontSize: 14, fontWeight: 700,
                      cursor: activeScene === 0 ? "not-allowed" : "pointer",
                      boxShadow: activeScene === 0 ? "none" : "0 4px 14px rgba(108,99,255,0.3)",
                      transition: "all 0.3s ease",
                      fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Previous
                  </motion.button>

                  <div style={{ display: "flex", gap: 8 }}>
                    {story.scenes?.map((_, i) => (
                      <motion.div
                        key={i}
                        onClick={() => setActiveScene(i)}
                        animate={{
                          width: activeScene === i ? 28 : 10,
                        }}
                        style={{
                          height: 10, borderRadius: 5,
                          background: activeScene === i
                            ? `linear-gradient(135deg, ${pageColors[i % pageColors.length]}, ${pageColors[(i + 1) % pageColors.length]})`
                            : "#e0ddf0",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          boxShadow: activeScene === i ? `0 2px 8px ${pageColors[i % pageColors.length]}40` : "none"
                        }}
                      />
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ x: 2 }}
                    onClick={() => setActiveScene(Math.min(totalScenes - 1, activeScene + 1))}
                    disabled={activeScene === totalScenes - 1}
                    style={{
                      padding: "11px 26px",
                      background: activeScene === totalScenes - 1 ? "#f0eeff" : "linear-gradient(135deg, #6C63FF, #A78BFA)",
                      border: "none", borderRadius: 50,
                      color: activeScene === totalScenes - 1 ? "#c0bcd8" : "#fff",
                      fontSize: 14, fontWeight: 700,
                      cursor: activeScene === totalScenes - 1 ? "not-allowed" : "pointer",
                      boxShadow: activeScene === totalScenes - 1 ? "none" : "0 4px 14px rgba(108,99,255,0.3)",
                      transition: "all 0.3s ease",
                      fontFamily: "'Nunito', sans-serif",
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    Next
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
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
