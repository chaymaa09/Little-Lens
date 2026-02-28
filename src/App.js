import { useEffect, useState } from "react";
import { generateStoryFromPrompt } from "./services/mistralService";

function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState(null);
  const [error, setError] = useState(null);
  const [activeScene, setActiveScene] = useState(0);
  const [view, setView] = useState("visual"); // visual | raw
  
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
    } catch (e) {
      console.error("Error during generate():", e);
      setError(e.message || "Failed to generate story. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const scene = story?.scenes?.[activeScene];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e8e0d0",
      fontFamily: "'Georgia', serif",
      padding: "0",
      overflow: "hidden"
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        opacity: 0.6
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{
          borderBottom: "1px solid #2a2820",
          padding: "24px 40px",
          display: "flex", alignItems: "center", gap: "16px"
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #c9a84c, #8b5e3c)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16
          }}>🎬</div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase" }}>Autonomous</div>
            <div style={{ fontSize: 18, fontWeight: "bold", letterSpacing: "0.05em", color: "#e8d9b0" }}>Cinematic Story Engine</div>
          </div>
          {story && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {["visual", "raw"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "6px 16px", borderRadius: 4, border: "1px solid",
                  borderColor: view === v ? "#c9a84c" : "#3a3428",
                  background: view === v ? "#c9a84c22" : "transparent",
                  color: view === v ? "#c9a84c" : "#8a7a60",
                  cursor: "pointer", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
                  fontFamily: "monospace"
                }}>{v}</button>
              ))}
            </div>
          )}
        </div>

        {/* Main */}
        <div style={{ padding: "40px" }}>
          {/* Input */}
          {!story && (
            <div style={{ maxWidth: 700, margin: "60px auto", textAlign: "center" }}>
              <div style={{ fontSize: 13, letterSpacing: "0.4em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 12 }}>
                Your Story Begins With
              </div>
              <div style={{ fontSize: 32, fontStyle: "italic", color: "#d4c49a", marginBottom: 40, lineHeight: 1.4 }}>
                "A single prompt."
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. A lone astronaut discovers an ancient alien ruin on Europa..."
                onKeyDown={e => e.key === "Enter" && e.metaKey && generate()}
                style={{
                  width: "100%", minHeight: 120, background: "#12100e",
                  border: "1px solid #3a3020", borderRadius: 8,
                  color: "#e8d9b0", padding: "16px", fontSize: 16,
                  fontFamily: "Georgia, serif", lineHeight: 1.6, resize: "vertical",
                  outline: "none", boxSizing: "border-box"
                }}
              />
              <button
                onClick={generate}
                disabled={loading || !prompt.trim()}
                style={{
                  marginTop: 16, padding: "14px 40px",
                  background: loading ? "#3a3020" : "linear-gradient(135deg, #c9a84c, #8b5e3c)",
                  border: "none", borderRadius: 6, color: loading ? "#8a7a60" : "#0a0a0f",
                  fontSize: 14, fontWeight: "bold", letterSpacing: "0.15em",
                  textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s"
                }}
              >
                {loading ? "⚙ Generating Blueprint..." : "✦ Generate Story"}
              </button>
              {error && <div style={{ color: "#c0392b", marginTop: 16, fontSize: 14 }}>{error}</div>}
              <div style={{ marginTop: 12, fontSize: 11, color: "#4a4030", letterSpacing: "0.1em" }}>⌘ + Enter to generate</div>
            </div>
          )}

          {/* Story View */}
          {story && view === "raw" && (
            <div style={{ maxWidth: 900, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#8a7a60", letterSpacing: "0.2em", textTransform: "uppercase" }}>JSON Blueprint</div>
                <button onClick={() => { setStory(null); setPrompt(""); }} style={{
                  padding: "6px 16px", background: "transparent", border: "1px solid #3a3020",
                  color: "#8a7a60", cursor: "pointer", borderRadius: 4, fontSize: 12
                }}>← New Story</button>
              </div>
              <pre style={{
                background: "#0d0b08", border: "1px solid #2a2416",
                borderRadius: 8, padding: 24, overflow: "auto",
                fontSize: 12, lineHeight: 1.8, color: "#c9b97a",
                fontFamily: "'Courier New', monospace", maxHeight: "75vh"
              }}>
                {JSON.stringify(story, null, 2)}
              </pre>
            </div>
          )}

          {story && view === "visual" && (
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
              {/* Story Header */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32
              }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 6 }}>
                    {story.genre} · {story.tone}
                  </div>
                  <h1 style={{ margin: 0, fontSize: 28, color: "#e8d9b0", fontStyle: "italic" }}>{story.title}</h1>
                  <p style={{ margin: "8px 0 0", color: "#a09070", fontSize: 15, fontStyle: "italic" }}>{story.logline}</p>
                </div>
                <button onClick={() => { setStory(null); setPrompt(""); }} style={{
                  padding: "8px 20px", background: "transparent", border: "1px solid #3a3020",
                  color: "#8a7a60", cursor: "pointer", borderRadius: 4, fontSize: 12
                }}>← New Story</button>
              </div>

              {/* Global Music Bar */}
              <div style={{
                background: "#12100e", border: "1px solid #2a2416", borderRadius: 8,
                padding: "14px 20px", marginBottom: 28,
                display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap"
              }}>
                <div style={{ fontSize: 18 }}>🎵</div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase" }}>Global Score</div>
                  <div style={{ color: "#c9a84c", fontSize: 14 }}>{story.global_music?.mood} · {story.global_music?.tempo}</div>
                </div>
                <div style={{ height: 32, width: 1, background: "#2a2416" }} />
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase" }}>Instruments</div>
                  <div style={{ color: "#e0d0a8", fontSize: 13 }}>{story.global_music?.instruments?.join(", ")}</div>
                </div>
                <div style={{ height: 32, width: 1, background: "#2a2416" }} />
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase" }}>Style Reference</div>
                  <div style={{ color: "#e0d0a8", fontSize: 13 }}>{story.global_music?.reference_track_style}</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 12, color: "#6a5a40" }}>⏱ {story.total_duration_seconds}s total</div>
              </div>

              {/* Scene Tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {story.scenes?.map((s, i) => (
                  <button key={i} onClick={() => setActiveScene(i)} style={{
                    padding: "10px 20px", borderRadius: 6, border: "1px solid",
                    borderColor: activeScene === i ? "#c9a84c" : "#2a2416",
                    background: activeScene === i ? "#1e1a0e" : "transparent",
                    color: activeScene === i ? "#c9a84c" : "#7a6a50",
                    cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif",
                    transition: "all 0.2s"
                  }}>
                    Scene {s.scene_number}: {s.title}
                  </button>
                ))}
              </div>

              {/* Scene Detail */}
              {scene && (
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
                  animation: "fadeIn 0.4s ease"
                }}>
                  {/* Narration */}
                  <div style={{
                    gridColumn: "1 / -1", background: "#12100e",
                    border: "1px solid #2a2416", borderRadius: 8, padding: 24,
                    borderLeft: "3px solid #c9a84c"
                  }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 10 }}>Narration</div>
                    <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: "#e0d0b0", fontStyle: "italic" }}>"{scene.narration}"</p>
                  </div>

                  {/* Setting */}
                  <div style={{ background: "#12100e", border: "1px solid #2a2416", borderRadius: 8, padding: 20 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 12 }}>🌍 Setting</div>
                    {[["Location", scene.setting?.location], ["Time", scene.setting?.time_of_day], ["Weather", scene.setting?.weather], ["Atmosphere", scene.setting?.atmosphere]].map(([k, v]) => (
                      <div key={k} style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 10, color: "#6a5a40", textTransform: "uppercase", letterSpacing: "0.15em" }}>{k}: </span>
                        <span style={{ fontSize: 13, color: "#c8b888" }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #2a2416", fontSize: 11, color: "#6a5a40" }}>
                      ⏱ {scene.duration_seconds}s · Emotion: <span style={{ color: "#c9a84c" }}>{scene.emotional_arc}</span>
                    </div>
                  </div>

                  {/* Characters */}
                  <div style={{ background: "#12100e", border: "1px solid #2a2416", borderRadius: 8, padding: 20 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 12 }}>👤 Characters</div>
                    {scene.characters?.map((c, i) => (
                      <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < scene.characters.length - 1 ? "1px solid #1e1a12" : "none" }}>
                        <div style={{ color: "#c9a84c", fontSize: 14, marginBottom: 4 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#a09070", marginBottom: 4 }}>{c.description}</div>
                        <div style={{ fontSize: 12, color: "#c8b888", fontStyle: "italic" }}>→ {c.action}</div>
                      </div>
                    ))}
                  </div>

                  {/* Image Prompt */}
                  <div style={{
                    gridColumn: "1 / -1", background: "#0d0b08",
                    border: "1px solid #3a2a10", borderRadius: 8, padding: 20
                  }}>
                    <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 4 }}>🎨 Image Style</div>
                        <div style={{ fontSize: 13, color: "#c9a84c" }}>{scene.image_prompt?.style}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 4 }}>💡 Lighting</div>
                        <div style={{ fontSize: 13, color: "#c9a84c" }}>{scene.image_prompt?.lighting}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 4 }}>🎨 Palette</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {scene.image_prompt?.color_palette?.map((c, i) => (
                            <span key={i} style={{ fontSize: 12, color: "#a09070", background: "#1e1a12", padding: "2px 8px", borderRadius: 3 }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 8 }}>Full Diffusion Prompt</div>
                    <div style={{
                      background: "#12100e", border: "1px dashed #3a2a10", borderRadius: 6,
                      padding: 14, fontSize: 13, lineHeight: 1.7, color: "#d4c49a",
                      fontFamily: "monospace", userSelect: "all"
                    }}>
                      {scene.image_prompt?.full_prompt}
                    </div>
                  </div>

                  {/* Animation Cues */}
                  <div style={{ background: "#12100e", border: "1px solid #2a2416", borderRadius: 8, padding: 20 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 12 }}>🎬 Animation Cues</div>
                    {scene.animation_cues?.map((cue, i) => (
                      <div key={i} style={{
                        marginBottom: 10, paddingLeft: 12,
                        borderLeft: "2px solid #3a2a10"
                      }}>
                        <div style={{ fontSize: 11, color: "#c9a84c" }}>
                          t={cue.timestamp_seconds}s · <span style={{ color: "#e8b060" }}>{cue.type}</span> · {cue.duration_seconds}s
                        </div>
                        <div style={{ fontSize: 12, color: "#a09070" }}>{cue.description}</div>
                      </div>
                    ))}
                  </div>

                  {/* Music Cue */}
                  <div style={{ background: "#12100e", border: "1px solid #2a2416", borderRadius: 8, padding: 20 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#8a7a60", textTransform: "uppercase", marginBottom: 12 }}>🎵 Music Cue</div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: "#6a5a40", textTransform: "uppercase" }}>Mood Shift: </span>
                      <span style={{ fontSize: 13, color: "#c8b888" }}>{scene.music_cue?.mood_shift}</span>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 10, color: "#6a5a40", textTransform: "uppercase" }}>Intensity: </span>
                      <span style={{ fontSize: 13, color: "#c9a84c", textTransform: "uppercase", letterSpacing: "0.1em" }}>{scene.music_cue?.intensity}</span>
                    </div>
                    <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#6a5a40", textTransform: "uppercase", marginBottom: 8 }}>SFX</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {scene.music_cue?.sfx?.map((s, i) => (
                        <span key={i} style={{
                          fontSize: 11, color: "#a09070", background: "#1a1810",
                          border: "1px solid #2a2416", padding: "3px 10px", borderRadius: 20
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ending note */}
              {story.ending_note && (
                <div style={{
                  marginTop: 20, padding: "16px 24px", textAlign: "center",
                  borderTop: "1px solid #2a2416", color: "#7a6a50",
                  fontSize: 14, fontStyle: "italic", lineHeight: 1.8
                }}>
                  ✦ {story.ending_note}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        textarea:focus { border-color: #c9a84c !important; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #3a3020; border-radius: 3px; }
      `}</style>
    </div>
  );
}
export default App;
