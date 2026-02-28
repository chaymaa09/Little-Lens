import { useEffect, useState } from "react";
import { generateStoryFromPrompt } from "./services/mistralService";
import { generateImageFromPrompt } from "./services/hfService";

function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState(null);
  const [error, setError] = useState(null);
  const [activeScene, setActiveScene] = useState(0);
  const [view, setView] = useState("visual"); // visual | raw
  const [sceneImages, setSceneImages] = useState({}); // { 0: "data:...", 1: "data:...", ... }
  const [imagesLoading, setImagesLoading] = useState(false);
  
  const [systemPrompt, setSystemPrompt] = useState("");
  useEffect(() => {
  const url = "./systemPrompt.txt";
  console.log("Attempting to fetch system prompt from:", url, "location:", window.location.pathname);
  fetch(url)
    .then((response) => {
      console.log("Fetch response for system prompt:", response);
      return response.text();
    })
    .then((text) => {
      setSystemPrompt(text);
      console.log("Loaded system prompt (length):", text?.length);
    })
    .catch((error) => console.error("Error loading system prompt:", error));
}, []);


  const generate = async () => {
  if (!prompt.trim()) return;

  setLoading(true);
  setError(null);
  setStory(null);

    try {
      // Call your service ONCE
      const jsonOutput = await generateStoryFromPrompt(
        prompt,
        systemPrompt
      );

      console.log("Final parsed JSON output:", jsonOutput);

      setStory(jsonOutput);
      setActiveScene(0);

      // Generate images for all scenes
      if (jsonOutput?.scenes?.length) {
        setImagesLoading(true);
        const fullPrompt = jsonOutput?.full_prompt; // Root-level prompt describing characters & environment
        const imagePromises = jsonOutput.scenes.map(async (s, index) => {
          const scenePrompt = s?.image_prompt?.scene_prompt;
          // Combine full prompt (shared elements) with scene-specific prompt
          const combinedPrompt = [
          fullPrompt ? `the context of the image is : ${fullPrompt}` : "",
          scenePrompt ? `\n now i want you to generate this image :  ${scenePrompt}` : ""
        ].filter(Boolean).join(". ");
          if (!combinedPrompt) {
            console.warn(`Scene ${index} has no image prompt`);
            return { index, url: null };
          }
          try {
            const url = await generateImageFromPrompt(combinedPrompt);
            console.log(`Generated image for scene ${index}:`, url?.slice(0, 50) + "...");
            return { index, url };
          } catch (err) {
            console.error(`Failed to generate image for scene ${index}:`, err);
            return { index, url: null };
          }
        });

        Promise.all(imagePromises).then((results) => {
          const images = {};
          results.forEach(({ index, url }) => {
            if (url) images[index] = url;
          });
          setSceneImages(images);
          setImagesLoading(false);
          console.log("All scene images generated:", Object.keys(images));
        });
      }
    } catch (e) {
      console.error("Error during generate():", e);
      setError(e.message || "Failed to generate story. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      {/* Decorative background shapes */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -80, left: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,157,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "40%", left: "60%", width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,201,167,0.06) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
      {/* Header */}
      <div style={{ padding: "28px 0 20px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #6C63FF, #A78BFA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(108,99,255,0.3)",
            transform: "rotate(-6deg)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div style={{
            fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #6C63FF, #FF6B9D)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>Little Lens</div>
        </div>
        <div style={{ fontSize: 13, color: "#9ca3af", letterSpacing: "0.08em", marginTop: 4, fontWeight: 500 }}>
          Where every story comes alive
        </div>
      </div>

      <div style={{ margin: "0 auto", padding: "0 32px 60px" }}>

        {/* === INPUT SCREEN === */}
        {!story && (
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(20px)",
            borderRadius: 28,
            boxShadow: "0 12px 40px rgba(108,99,255,0.1), 0 4px 12px rgba(0,0,0,0.04)",
            padding: "52px 44px",
            textAlign: "center",
            border: "1px solid rgba(108,99,255,0.12)",
            marginTop: 12
          }}>
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
            <button
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
            </button>
            {error && (
              <div style={{
                color: "#e53e3e", marginTop: 18, fontSize: 14,
                background: "#fff5f5", padding: "10px 18px", borderRadius: 12,
                border: "1px solid #fed7d7"
              }}>
                {error}
              </div>
            )}
          </div>
          </div>
        )}

        {/* === STORY BOOK VIEW === */}
        {story && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>

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
                margin: 0, fontSize: 26, fontWeight: 800,
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
                      background: `${accentColor}14`,
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
                    fontSize: 21, color: "#3b3660", fontWeight: 600
                  }}>
                    {scene.title}
                  </h2>

                  {/* Scene image */}
                  <div style={{
                    background: "linear-gradient(135deg, #f0eeff 0%, #fdf0f5 50%, #f0faf7 100%)",
                    borderRadius: 24, padding: 16,
                    display: "flex", justifyContent: "center", alignItems: "center",
                    minHeight: 280,
                    border: `1px solid ${accentColor}20`,
                    marginBottom: 28
                  }}>
                    {imagesLoading && !currentSceneImage ? (
                      <div style={{ color: "#9ca3af", fontSize: 15, padding: 48, textAlign: "center" }}>
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
                      <img
                        src={currentSceneImage}
                        alt={`Scene ${activeScene + 1}`}
                        style={{
                          width: "80%", maxHeight: 400,
                          objectFit: "cover",
                          borderRadius: 18,
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
                  </div>

                  {/* Narration */}
                  <div style={{
                    background: `linear-gradient(135deg, ${accentColor}06, ${accentColor}03)`,
                    borderRadius: 18, padding: "26px 30px",
                    borderLeft: `4px solid ${accentColor}`,
                    marginBottom: 8
                  }}>
                    <p style={{
                      margin: 0, fontSize: 17, lineHeight: 2,
                      color: "black", fontWeight: 400, textAlign: "center"
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
                <button
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
                </button>

                <div style={{ display: "flex", gap: 8 }}>
                  {story.scenes?.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveScene(i)}
                      style={{
                        width: activeScene === i ? 28 : 10,
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

                <button
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
                </button>
              </div>

              {/* New Story */}
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <button
                  onClick={() => { setStory(null); setPrompt(""); setSceneImages({}); }}
                  style={{
                    padding: "9px 28px",
                    background: "transparent",
                    border: "1.5px solid rgba(108,99,255,0.2)",
                    borderRadius: 50,
                    color: "#8b8aa0",
                    fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Nunito', sans-serif",
                    transition: "all 0.3s ease",
                    letterSpacing: "0.02em"
                  }}
                >
                  New Story
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
