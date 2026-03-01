// ============================================================
//  Little Lens — Animation Library
//  All animation cues are pre-coded here.
//  Mistral picks cue names from ANIMATION_CUE_NAMES.
//  ScenePlayer looks up the name and applies the styles.
// ============================================================

// ─── TIMING HELPERS ─────────────────────────────────────────
const ease = {
  smooth:   "cubic-bezier(0.4, 0, 0.2, 1)",
  spring:   "cubic-bezier(0.34, 1.56, 0.64, 1)",
  dramatic: "cubic-bezier(0.76, 0, 0.24, 1)",
  gentle:   "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
};

// ─── KEYFRAME INJECTION ─────────────────────────────────────
// Injects a @keyframes rule into the document once (idempotent)
const injected = new Set();
export function injectKeyframes(name, rule) {
  if (injected.has(name)) return;
  injected.add(name);
  const style = document.createElement("style");
  style.textContent = `@keyframes ${name} { ${rule} }`;
  document.head.appendChild(style);
}

// ─── IMAGE ANIMATION CUES ───────────────────────────────────
// Each entry returns: { imageStyle, keyframeName?, keyframeRule? }
// imageStyle is applied to the <img> element

export const IMAGE_CUES = {

  // ── Ken Burns ───────────────────────────────────────────
  ken_burns_right: (duration = 8) => {
    injectKeyframes("kbRight", `
      from { transform: scale(1.08) translateX(-3%); }
      to   { transform: scale(1.18) translateX(3%); }
    `);
    return {
      imageStyle: {
        animation: `kbRight ${duration}s ${ease.gentle} infinite alternate`,
        transformOrigin: "center center",
      }
    };
  },

  ken_burns_left: (duration = 8) => {
    injectKeyframes("kbLeft", `
      from { transform: scale(1.08) translateX(3%); }
      to   { transform: scale(1.18) translateX(-3%); }
    `);
    return {
      imageStyle: {
        animation: `kbLeft ${duration}s ${ease.gentle} infinite alternate`,
        transformOrigin: "center center",
      }
    };
  },

  ken_burns_up: (duration = 8) => {
    injectKeyframes("kbUp", `
      from { transform: scale(1.1) translateY(4%); }
      to   { transform: scale(1.2) translateY(-2%); }
    `);
    return {
      imageStyle: {
        animation: `kbUp ${duration}s ${ease.gentle} infinite alternate`,
        transformOrigin: "center bottom",
      }
    };
  },

  ken_burns_down: (duration = 8) => {
    injectKeyframes("kbDown", `
      from { transform: scale(1.1) translateY(-4%); }
      to   { transform: scale(1.2) translateY(2%); }
    `);
    return {
      imageStyle: {
        animation: `kbDown ${duration}s ${ease.gentle} infinite alternate`,
        transformOrigin: "center top",
      }
    };
  },

  ken_burns_zoom_in: (duration = 9) => {
    injectKeyframes("kbZoomIn", `
      from { transform: scale(1); }
      to   { transform: scale(1.22); }
    `);
    return {
      imageStyle: {
        animation: `kbZoomIn ${duration}s ${ease.dramatic} infinite alternate`,
        transformOrigin: "center center",
      }
    };
  },

  ken_burns_zoom_out: (duration = 9) => {
    injectKeyframes("kbZoomOut", `
      from { transform: scale(1.22); }
      to   { transform: scale(1.0); }
    `);
    return {
      imageStyle: {
        animation: `kbZoomOut ${duration}s ${ease.dramatic} infinite alternate`,
        transformOrigin: "center center",
      }
    };
  },

  ken_burns_diagonal_tl: (duration = 10) => {
    injectKeyframes("kbDiagTL", `
      from { transform: scale(1.1) translate(3%, 3%); }
      to   { transform: scale(1.2) translate(-3%, -3%); }
    `);
    return {
      imageStyle: {
        animation: `kbDiagTL ${duration}s ${ease.gentle} infinite alternate`,
      }
    };
  },

  ken_burns_diagonal_br: (duration = 10) => {
    injectKeyframes("kbDiagBR", `
      from { transform: scale(1.1) translate(-3%, -3%); }
      to   { transform: scale(1.2) translate(3%, 3%); }
    `);
    return {
      imageStyle: {
        animation: `kbDiagBR ${duration}s ${ease.gentle} infinite alternate`,
      }
    };
  },

  // ── Pulse / Breathe ────────────────────────────────────
  breathe: (duration = 5) => {
    injectKeyframes("breathe", `
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.04); }
    `);
    return {
      imageStyle: {
        animation: `breathe ${duration}s ${ease.gentle} infinite`,
      }
    };
  },

  heartbeat: (duration = 1.5) => {
    injectKeyframes("heartbeat", `
      0%, 100% { transform: scale(1); }
      14%       { transform: scale(1.05); }
      28%       { transform: scale(1); }
      42%       { transform: scale(1.05); }
      70%       { transform: scale(1); }
    `);
    return {
      imageStyle: {
        animation: `heartbeat ${duration}s ease infinite`,
      }
    };
  },

  // ── Shake / Tremble ────────────────────────────────────
  tremble: (duration = 0.4) => {
    injectKeyframes("tremble", `
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-4px) rotate(-1deg); }
      40%       { transform: translateX(4px) rotate(1deg); }
      60%       { transform: translateX(-3px); }
      80%       { transform: translateX(3px); }
    `);
    return {
      imageStyle: {
        animation: `tremble ${duration}s ease infinite`,
      }
    };
  },

  wobble: (duration = 1.2) => {
    injectKeyframes("wobble", `
      0%, 100% { transform: rotate(0deg); }
      25%       { transform: rotate(-3deg) scale(1.02); }
      75%       { transform: rotate(3deg) scale(1.02); }
    `);
    return {
      imageStyle: {
        animation: `wobble ${duration}s ${ease.spring} infinite`,
        transformOrigin: "bottom center",
      }
    };
  },

  // ── Fade ──────────────────────────────────────────────
  fade_in: (duration = 2) => {
    injectKeyframes("fadeInImg", `
      from { opacity: 0; }
      to   { opacity: 1; }
    `);
    return {
      imageStyle: {
        animation: `fadeInImg ${duration}s ${ease.smooth} forwards`,
      }
    };
  },

  fade_in_zoom: (duration = 2.5) => {
    injectKeyframes("fadeInZoom", `
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1); }
    `);
    return {
      imageStyle: {
        animation: `fadeInZoom ${duration}s ${ease.spring} forwards`,
      }
    };
  },

  // ── Float ─────────────────────────────────────────────
  float: (duration = 4) => {
    injectKeyframes("float", `
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-10px); }
    `);
    return {
      imageStyle: {
        animation: `float ${duration}s ${ease.gentle} infinite`,
      }
    };
  },

  float_and_tilt: (duration = 5) => {
    injectKeyframes("floatTilt", `
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      33%       { transform: translateY(-8px) rotate(-1.5deg); }
      66%       { transform: translateY(-4px) rotate(1.5deg); }
    `);
    return {
      imageStyle: {
        animation: `floatTilt ${duration}s ${ease.gentle} infinite`,
      }
    };
  },

  // ── Reveal ────────────────────────────────────────────
  slide_in_left: (duration = 1.2) => {
    injectKeyframes("slideInLeft", `
      from { transform: translateX(-60px); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    `);
    return {
      imageStyle: {
        animation: `slideInLeft ${duration}s ${ease.spring} forwards`,
      }
    };
  },

  slide_in_right: (duration = 1.2) => {
    injectKeyframes("slideInRight", `
      from { transform: translateX(60px); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    `);
    return {
      imageStyle: {
        animation: `slideInRight ${duration}s ${ease.spring} forwards`,
      }
    };
  },

  slide_in_bottom: (duration = 1.2) => {
    injectKeyframes("slideInBottom", `
      from { transform: translateY(60px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    `);
    return {
      imageStyle: {
        animation: `slideInBottom ${duration}s ${ease.spring} forwards`,
      }
    };
  },

  rise_up: (duration = 1.8) => {
    injectKeyframes("riseUp", `
      from { transform: translateY(30px) scale(0.96); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    `);
    return {
      imageStyle: {
        animation: `riseUp ${duration}s ${ease.smooth} forwards`,
      }
    };
  },

  // ── Special ───────────────────────────────────────────
  spin_slow: (duration = 20) => {
    injectKeyframes("spinSlow", `
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    `);
    return {
      imageStyle: {
        animation: `spinSlow ${duration}s linear infinite`,
      }
    };
  },

  flash: (duration = 0.8) => {
    injectKeyframes("flash", `
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    `);
    return {
      imageStyle: {
        animation: `flash ${duration}s ease infinite`,
      }
    };
  },

  none: () => ({ imageStyle: {} }),
};

// ─── OVERLAY PARTICLE CUES ──────────────────────────────────
// Rendered as an absolutely-positioned <div> OVER the image.
// Each returns a React-renderable function: (key) => JSX

export const OVERLAY_CUES = {

  // ── Stars / Sparkles ──────────────────────────────────
  sparkles: () => {
    injectKeyframes("sparkle", `
      0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
      50%       { opacity: 1; transform: scale(1.2) rotate(180deg); }
    `);
    const stars = Array.from({ length: 12 }, (_, i) => ({
      x: `${10 + (i * 23 + 7) % 82}%`,
      y: `${5 + (i * 31 + 13) % 85}%`,
      size: 10 + (i % 4) * 6,
      delay: (i * 0.4) % 3,
      dur: 1.5 + (i % 3) * 0.8,
      color: ["#FFD700", "#FFF176", "#FFFDE7", "#FFB300", "#FFECB3"][i % 5],
    }));
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {stars.map((s, i) => (
          <div key={i} style={{
            position: "absolute", left: s.x, top: s.y,
            width: s.size, height: s.size,
            animation: `sparkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            fontSize: s.size, lineHeight: 1, userSelect: "none",
          }}>✦</div>
        ))}
      </div>
    );
  },

  glitter: () => {
    injectKeyframes("glitter", `
      0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
      30%       { opacity: 1; transform: scale(1.5) rotate(120deg); }
      60%       { opacity: 0.7; transform: scale(1) rotate(240deg); }
    `);
    const dots = Array.from({ length: 20 }, (_, i) => ({
      x: `${(i * 41 + 5) % 95}%`,
      y: `${(i * 29 + 8) % 90}%`,
      size: 4 + (i % 3) * 3,
      delay: (i * 0.25) % 2.5,
      dur: 1 + (i % 4) * 0.5,
      color: ["#FFD700", "#E040FB", "#40C4FF", "#69F0AE", "#FF6E40"][i % 5],
    }));
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {dots.map((d, i) => (
          <div key={i} style={{
            position: "absolute", left: d.x, top: d.y,
            width: d.size, height: d.size, borderRadius: "50%",
            background: d.color,
            animation: `glitter ${d.dur}s ease-in-out ${d.delay}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  // ── Weather ───────────────────────────────────────────
  falling_leaves: () => {
    injectKeyframes("leafFall", `
      0%   { transform: translateY(-20px) translateX(0) rotate(0deg); opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(110%) translateX(40px) rotate(360deg); opacity: 0; }
    `);
    const leaves = Array.from({ length: 10 }, (_, i) => ({
      x: `${(i * 37 + 5) % 90}%`,
      delay: i * 0.7,
      dur: 4 + (i % 3) * 1.5,
      emoji: ["🍂", "🍁", "🌿", "🍃"][i % 4],
      size: 16 + (i % 3) * 8,
    }));
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {leaves.map((l, i) => (
          <div key={i} style={{
            position: "absolute", left: l.x, top: 0,
            fontSize: l.size,
            animation: `leafFall ${l.dur}s linear ${l.delay}s infinite`,
          }}>{l.emoji}</div>
        ))}
      </div>
    );
  },

  snow: () => {
    injectKeyframes("snowfall", `
      0%   { transform: translateY(-10px) translateX(0); opacity: 0; }
      10%  { opacity: 0.9; }
      100% { transform: translateY(110%) translateX(20px); opacity: 0; }
    `);
    const flakes = Array.from({ length: 18 }, (_, i) => ({
      x: `${(i * 31 + 3) % 96}%`,
      size: 6 + (i % 4) * 5,
      delay: (i * 0.35) % 4,
      dur: 5 + (i % 4) * 1.5,
      opacity: 0.5 + (i % 3) * 0.2,
    }));
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {flakes.map((f, i) => (
          <div key={i} style={{
            position: "absolute", left: f.x, top: 0,
            fontSize: f.size, opacity: f.opacity,
            animation: `snowfall ${f.dur}s linear ${f.delay}s infinite`,
          }}>❄</div>
        ))}
      </div>
    );
  },

  rain: () => {
    injectKeyframes("raindrop", `
      0%   { transform: translateY(-10%) scaleY(1); opacity: 0.7; }
      100% { transform: translateY(110%) scaleY(1.2); opacity: 0; }
    `);
    const drops = Array.from({ length: 24 }, (_, i) => ({
      x: `${(i * 29 + 2) % 98}%`,
      height: 12 + (i % 3) * 8,
      delay: (i * 0.18) % 2,
      dur: 0.8 + (i % 3) * 0.4,
      opacity: 0.3 + (i % 3) * 0.15,
    }));
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {drops.map((d, i) => (
          <div key={i} style={{
            position: "absolute", left: d.x, top: 0,
            width: 2, height: d.height,
            background: "linear-gradient(180deg, transparent, #90CAF9)",
            borderRadius: 2, opacity: d.opacity,
            animation: `raindrop ${d.dur}s linear ${d.delay}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  fireflies: () => {
    injectKeyframes("fireflyFloat", `
      0%   { transform: translate(0, 0); opacity: 0; }
      25%  { opacity: 1; }
      50%  { transform: translate(20px, -25px); opacity: 0.8; }
      75%  { opacity: 0.4; }
      100% { transform: translate(-10px, -50px); opacity: 0; }
    `);
    injectKeyframes("fireflyBlink", `
      0%, 100% { box-shadow: 0 0 4px 2px #FFFF00; }
      50%       { box-shadow: 0 0 10px 5px #ADFF2F; }
    `);
    const flies = Array.from({ length: 10 }, (_, i) => ({
      x: `${(i * 43 + 10) % 85}%`,
      y: `${(i * 37 + 20) % 70}%`,
      delay: i * 0.5,
      dur: 4 + (i % 3),
    }));
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {flies.map((f, i) => (
          <div key={i} style={{
            position: "absolute", left: f.x, top: f.y,
            width: 6, height: 6, borderRadius: "50%",
            background: "#FFFF88",
            animation: `fireflyFloat ${f.dur}s ease-in-out ${f.delay}s infinite,
                        fireflyBlink ${1.2}s ease-in-out ${f.delay * 0.5}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  bubbles: () => {
    injectKeyframes("bubbleRise", `
      0%   { transform: translateY(0) scale(0.5); opacity: 0; }
      20%  { opacity: 0.8; }
      100% { transform: translateY(-110%) scale(1.1); opacity: 0; }
    `);
    const bs = Array.from({ length: 12 }, (_, i) => ({
      x: `${(i * 37 + 5) % 88}%`,
      size: 12 + (i % 4) * 10,
      delay: (i * 0.6) % 4,
      dur: 4 + (i % 3) * 2,
    }));
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {bs.map((b, i) => (
          <div key={i} style={{
            position: "absolute", left: b.x, bottom: 0,
            width: b.size, height: b.size, borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.7)",
            background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), rgba(173,216,230,0.2))",
            animation: `bubbleRise ${b.dur}s ease-in ${b.delay}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  // ── Light / Magic ─────────────────────────────────────
  sun_rays: () => {
    injectKeyframes("sunRay", `
      0%, 100% { opacity: 0.08; transform: rotate(0deg) scaleY(1); }
      50%       { opacity: 0.18; transform: rotate(3deg) scaleY(1.05); }
    `);
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{
            position: "absolute", top: 0, left: "50%",
            width: 3, height: "70%",
            background: "linear-gradient(180deg, #FFD700, transparent)",
            transformOrigin: "top center",
            transform: `rotate(${i * 22}deg)`,
            opacity: 0.1,
            animation: `sunRay ${2 + i * 0.3}s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  magic_dust: () => {
    injectKeyframes("magicDust", `
      0%   { transform: translateY(0) translateX(0) scale(0); opacity: 0; }
      30%  { opacity: 1; transform: scale(1.5); }
      100% { transform: translateY(-60px) translateX(20px) scale(0); opacity: 0; }
    `);
    const particles = Array.from({ length: 16 }, (_, i) => ({
      x: `${(i * 41 + 8) % 88}%`,
      y: `${(i * 27 + 15) % 80}%`,
      size: 6 + (i % 3) * 4,
      delay: (i * 0.3) % 3,
      dur: 2 + (i % 3),
      color: ["#FF80AB", "#EA80FC", "#82B1FF", "#CCFF90", "#FFD180"][i % 5],
    }));
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {particles.map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: p.x, top: p.y,
            width: p.size, height: p.size, borderRadius: "50%",
            background: p.color, filter: "blur(1px)",
            animation: `magicDust ${p.dur}s ease-out ${p.delay}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  shooting_stars: () => {
    injectKeyframes("shootingStar", `
      0%   { transform: translateX(0) translateY(0) rotate(-35deg); opacity: 1; width: 4px; }
      100% { transform: translateX(180px) translateY(80px) rotate(-35deg); opacity: 0; width: 80px; }
    `);
    const ss = Array.from({ length: 5 }, (_, i) => ({
      x: `${(i * 53 + 5) % 60}%`,
      y: `${(i * 23 + 5) % 35}%`,
      delay: i * 1.8,
      dur: 1.2,
    }));
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {ss.map((s, i) => (
          <div key={i} style={{
            position: "absolute", left: s.x, top: s.y,
            height: 2,
            background: "linear-gradient(90deg, white, transparent)",
            borderRadius: 2,
            animation: `shootingStar ${s.dur}s ease-in ${s.delay}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  rainbow: () => {
    injectKeyframes("rainbowFade", `
      0%, 100% { opacity: 0.15; }
      50%       { opacity: 0.35; }
    `);
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-20%", left: "10%",
          width: "80%", height: "60%",
          borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
          border: "none",
          background: "conic-gradient(from 270deg at 50% 100%, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF, transparent 50%)",
          opacity: 0.2,
          animation: `rainbowFade 4s ease-in-out infinite`,
          filter: "blur(8px)",
        }} />
      </div>
    );
  },

  // ── Wind / Movement ───────────────────────────────────
  wind_particles: () => {
    injectKeyframes("windBlow", `
      0%   { transform: translateX(-20px); opacity: 0; }
      20%  { opacity: 0.6; }
      100% { transform: translateX(120%); opacity: 0; }
    `);
    const lines = Array.from({ length: 8 }, (_, i) => ({
      y: `${10 + i * 10}%`,
      width: 30 + (i % 3) * 20,
      delay: i * 0.4,
      dur: 2 + (i % 3),
    }));
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            position: "absolute", left: 0, top: l.y,
            width: l.width, height: 2,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
            borderRadius: 2,
            animation: `windBlow ${l.dur}s ease-in ${l.delay}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  confetti: () => {
    injectKeyframes("confettiFall", `
      0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110%) rotate(720deg); opacity: 0.3; }
    `);
    const pieces = Array.from({ length: 20 }, (_, i) => ({
      x: `${(i * 31 + 3) % 95}%`,
      size: 8 + (i % 3) * 5,
      delay: (i * 0.25) % 3,
      dur: 3 + (i % 3),
      color: ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#FF6BD6","#FFB347"][i % 6],
      shape: i % 3 === 0 ? "50%" : i % 3 === 1 ? "2px" : "0",
    }));
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {pieces.map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: p.x, top: 0,
            width: p.size, height: p.size,
            background: p.color, borderRadius: p.shape,
            animation: `confettiFall ${p.dur}s ease-in ${p.delay}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  // ── Ambient / Mood ────────────────────────────────────
  vignette_pulse: () => {
    injectKeyframes("vignettePulse", `
      0%, 100% { opacity: 0.3; }
      50%       { opacity: 0.55; }
    `);
    return (
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        animation: `vignettePulse 4s ease-in-out infinite`,
        borderRadius: "inherit",
      }} />
    );
  },

  dreamy_blur_edges: () => (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: "radial-gradient(ellipse at center, transparent 50%, rgba(255,248,238,0.7) 100%)",
      borderRadius: "inherit",
    }} />
  ),

  underwater: () => {
    injectKeyframes("underwaterWave", `
      0%, 100% { transform: scaleX(1) scaleY(1); opacity: 0.15; }
      50%       { transform: scaleX(1.05) scaleY(0.97); opacity: 0.25; }
    `);
    return (
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(0,150,255,0.15) 0%, rgba(0,80,200,0.1) 100%)",
          animation: `underwaterWave 3s ease-in-out infinite`,
        }} />
        {/* Light caustics */}
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${(i * 37 + 10) % 80}%`,
            top: `${(i * 23 + 10) % 60}%`,
            width: 40 + i * 20,
            height: 40 + i * 20,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.2), transparent)",
            animation: `underwaterWave ${2 + i * 0.5}s ease-in-out ${i * 0.4}s infinite`,
          }} />
        ))}
      </div>
    );
  },

  none: () => null,
};

// ─── COMBINED CUE RESOLVER ──────────────────────────────────
// This is what ScenePlayer calls: resolveAnimationCue(cueName, duration)
// Returns { imageStyle, OverlayComponent }

export function resolveAnimationCue(cueName, duration = 8) {
  const imageCueFn = IMAGE_CUES[cueName];
  const overlayCueFn = OVERLAY_CUES[cueName];

  if (imageCueFn) {
    const { imageStyle } = imageCueFn(duration);
    return { imageStyle, OverlayComponent: null };
  }

  if (overlayCueFn) {
    return {
      imageStyle: {},
      OverlayComponent: overlayCueFn,
    };
  }

  // If cue has both (compound cues)
  console.warn(`[AnimLib] Unknown cue: "${cueName}", falling back to none`);
  return { imageStyle: {}, OverlayComponent: null };
}

// ─── FULL CUE NAME LIST (paste into systemPrompt.txt) ────────
// These are the EXACT strings Mistral should use in animation_cues[].type

export const ANIMATION_CUE_NAMES = {
  image: [
    "ken_burns_right",
    "ken_burns_left",
    "ken_burns_up",
    "ken_burns_down",
    "ken_burns_zoom_in",
    "ken_burns_zoom_out",
    "ken_burns_diagonal_tl",
    "ken_burns_diagonal_br",
    "breathe",
    "heartbeat",
    "tremble",
    "wobble",
    "fade_in",
    "fade_in_zoom",
    "float",
    "float_and_tilt",
    "slide_in_left",
    "slide_in_right",
    "slide_in_bottom",
    "rise_up",
    "spin_slow",
    "flash",
    "none",
  ],
  overlay: [
    "sparkles",
    "glitter",
    "falling_leaves",
    "snow",
    "rain",
    "fireflies",
    "bubbles",
    "sun_rays",
    "magic_dust",
    "shooting_stars",
    "rainbow",
    "wind_particles",
    "confetti",
    "vignette_pulse",
    "dreamy_blur_edges",
    "underwater",
    "none",
  ],
};