import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"

/* ─── Slide content data ───────────────────────────────────────────────── */
const SLIDES = [
  {
    id: 0,
    badge: "Mohanlal Sukhadia University · Udaipur",
    headline: ["Welcome to", "IntelliLearn"],
    sub: "AI Powered Learning Management System for the modern academic experience.",
    accent: ["#3B82F6", "#6366F1"],   // blue → indigo
    orb1: "rgba(59,130,246,0.18)",
    orb2: "rgba(99,102,241,0.14)",
    icon: "🎓",
  },
  {
    id: 1,
    badge: "Smart Content Delivery",
    headline: ["Learn Smarter,", "Not Harder"],
    sub: "Adaptive modules, interactive notes, and subject-specific video repositories curated for MCA students.",
    accent: ["#06B6D4", "#3B82F6"],   // cyan → blue
    orb1: "rgba(6,182,212,0.18)",
    orb2: "rgba(59,130,246,0.14)",
    icon: "📚",
  },
  {
    id: 2,
    badge: "AI Intelligence Engine",
    headline: ["24/7 AI Doubt", "Companion"],
    sub: "Ask any question, get instant explanations, generate practice quizzes — powered by advanced language models.",
    accent: ["#8B5CF6", "#EC4899"],   // violet → pink
    orb1: "rgba(139,92,246,0.18)",
    orb2: "rgba(236,72,153,0.14)",
    icon: "🤖",
  },
  {
    id: 3,
    badge: "Real-time Analytics",
    headline: ["Track Your", "Progress Live"],
    sub: "Performance heatmaps, topic mastery scores, and personalised study calendars — all in one dashboard.",
    accent: ["#10B981", "#06B6D4"],   // emerald → cyan
    orb1: "rgba(16,185,129,0.18)",
    orb2: "rgba(6,182,212,0.14)",
    icon: "📊",
  },
  {
    id: 4,
    badge: "Let's Begin",
    headline: ["Your Campus,", "Reimagined"],
    sub: "Step into your personalised workspace — built for students and faculty of MLSU.",
    accent: ["#F59E0B", "#EF4444"],   // amber → red
    orb1: "rgba(245,158,11,0.18)",
    orb2: "rgba(239,68,68,0.14)",
    icon: "🚀",
  },
]

const SLIDE_DURATION = 3200   // ms each slide stays visible
const TRANSITION_MS  = 700    // ms cross-fade duration

/* ─── Particle factory ──────────────────────────────────────────────────── */
function makeParticles(n = 55) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
    dur: 6 + Math.random() * 10,
    delay: Math.random() * 8,
    opacity: 0.15 + Math.random() * 0.35,
  }))
}

const PARTICLES = makeParticles()

/* ──────────────────────────────────────────────────────────────────────── */
export default function SplashPage() {
  const navigate  = useNavigate()
  const [slide, setSlide]         = useState(0)
  const [visible, setVisible]     = useState(true)   // true = current slide in
  const [exiting, setExiting]     = useState(false)  // whole-page exit animation
  const [nextSlide, setNextSlide] = useState(null)
  const slideTimer = useRef(null)
  const totalSlides = SLIDES.length

  /* ── Auto-advance slides ─────────────────────────────────────────────── */
  useEffect(() => {
    slideTimer.current = setTimeout(() => {
      advanceSlide()
    }, SLIDE_DURATION)
    return () => clearTimeout(slideTimer.current)
  }, [slide])

  function advanceSlide(target) {
    clearTimeout(slideTimer.current)
    const next = target !== undefined ? target : (slide + 1) % totalSlides
    if (next === slide) return

    setVisible(false)
    setNextSlide(next)

    setTimeout(() => {
      setSlide(next)
      setNextSlide(null)
      setVisible(true)

      // last slide → navigate after a beat
      if (next === totalSlides - 1) {
        setTimeout(() => triggerExit(), SLIDE_DURATION - 200)
      }
    }, TRANSITION_MS)
  }

  function triggerExit() {
    setExiting(true)
    setTimeout(() => navigate("/login"), 900)
  }

  const handleSkip = () => triggerExit()
  const current = SLIDES[slide]
  const gradA = current.accent[0]
  const gradB = current.accent[1]

  /* ── Progress fraction (0–1) across ALL slides ───────────────────────── */
  const overallPct = Math.round(((slide + 1) / totalSlides) * 100)

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05091A",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.04)" : "scale(1)",
        filter: exiting ? "blur(8px)" : "blur(0px)",
      }}
    >
      {/* ── Global keyframes ─────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&family=Outfit:wght@400;700;900&display=swap');

        @keyframes float-up {
          0%   { transform: translateY(0px) scale(1);   opacity: var(--op); }
          50%  { transform: translateY(-22px) scale(1.05); opacity: calc(var(--op) * 1.4); }
          100% { transform: translateY(0px) scale(1);   opacity: var(--op); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orb-pulse {
          0%,100% { transform: scale(1) translate(0,0); }
          33%      { transform: scale(1.12) translate(20px,-15px); }
          66%      { transform: scale(0.92) translate(-15px,20px); }
        }
        @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes slide-out-up {
          from { opacity: 1; transform: translateY(0);    }
          to   { opacity: 0; transform: translateY(-28px); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes ring-expand {
          0%   { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes badge-glow {
          0%,100% { box-shadow: 0 0 0 0 transparent; }
          50%      { box-shadow: 0 0 20px 4px rgba(99,102,241,0.25); }
        }
        @keyframes progress-fill {
          from { width: 0%; }
        }
        .particle {
          position: absolute;
          border-radius: 50%;
          background: white;
          animation: float-up var(--dur)s ease-in-out var(--delay)s infinite;
          pointer-events: none;
        }
        .content-enter {
          animation: slide-in-up 0.65s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .content-exit {
          animation: slide-out-up 0.55s cubic-bezier(0.4,0,1,1) forwards;
        }
      `}</style>

      {/* ── Animated mesh gradient background ──────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        transition: `opacity ${TRANSITION_MS * 1.5}ms ease`,
        background: `radial-gradient(ellipse at 25% 35%, ${current.orb1} 0%, transparent 55%),
                     radial-gradient(ellipse at 75% 70%, ${current.orb2} 0%, transparent 55%),
                     linear-gradient(160deg, #05091A 0%, #0A0F24 60%, #080D1F 100%)`,
      }} />

      {/* ── Floating particles ──────────────────────────────────────────── */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            "--op": p.opacity,
            "--dur": p.dur,
            "--delay": p.delay,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* ── Spinning ring decoration ────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 560, height: 560,
        marginTop: -280, marginLeft: -280,
        borderRadius: "50%",
        border: `1px solid rgba(255,255,255,0.04)`,
        animation: "spin-slow 28s linear infinite",
        zIndex: 1,
        pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: 8, left: 8, right: 8, bottom: 8,
          borderRadius: "50%",
          border: `1px dashed rgba(255,255,255,0.035)`,
        }} />
        {/* Ring dot markers */}
        {[0,90,180,270].map(deg => (
          <div key={deg} style={{
            position: "absolute",
            width: 6, height: 6,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${gradA}, ${gradB})`,
            top: "50%", left: "50%",
            marginTop: -3, marginLeft: -3,
            transform: `rotate(${deg}deg) translateY(-279px)`,
            opacity: 0.6,
          }} />
        ))}
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        position: "relative", zIndex: 10,
        padding: "22px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        opacity: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo badge */}
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${gradA}22, ${gradB}22)`,
            border: `1px solid ${gradA}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
            transition: `background ${TRANSITION_MS}ms ease, border-color ${TRANSITION_MS}ms ease`,
          }}>🎓</div>
          <span style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900, fontSize: 20,
            color: "#FFFFFF",
            textShadow: `0 0 20px ${gradA}DD, 0 0 40px ${gradB}99`,
            transition: `text-shadow ${TRANSITION_MS}ms ease`,
            letterSpacing: '-0.01em',
          }}>IntelliLearn</span>
        </div>

        {/* Slide counter */}
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.12em",
          color: "rgba(255,255,255,0.28)",
          fontFamily: "'Inter', sans-serif",
        }}>
          {String(slide + 1).padStart(2,"0")} / {String(totalSlides).padStart(2,"0")}
        </div>
      </header>

      {/* ── Main slideshow content ──────────────────────────────────────── */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 10,
        padding: "20px 24px",
        textAlign: "center",
      }}>

        {/* MLSU Logo ring — always visible, pulse on active */}
        <div style={{
          position: "relative", width: 120, height: 120,
          marginBottom: 28, flexShrink: 0,
        }}>
          {/* Expanding rings */}
          {[0,1].map(i => (
            <div key={i} style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              border: `2px solid ${gradA}`,
              animation: `ring-expand 2.5s ease-out ${i * 1.1}s infinite`,
              opacity: 0,
              transition: `border-color ${TRANSITION_MS}ms ease`,
            }} />
          ))}
          {/* Logo circle */}
          <div style={{
            position: "relative", width: "100%", height: "100%",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: `2px solid rgba(255,255,255,0.12)`,
            backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 40px ${gradA}30, inset 0 1px 0 rgba(255,255,255,0.1)`,
            transition: `box-shadow ${TRANSITION_MS}ms ease`,
            overflow: "hidden",
          }}>
            <img
              src="/mlsu-logo.png"
              alt="MLSU"
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
                filter: "brightness(1.05) drop-shadow(0 2px 8px rgba(0,0,0,0.4))"
              }}
              onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex" }}
            />
            <div style={{ display:"none", fontSize:42, alignItems:"center", justifyContent:"center", width:"100%", height:"100%" }}>
              {current.icon}
            </div>
          </div>
        </div>

        {/* Project name + University name — always visible */}
        <div style={{
          marginBottom: 22,
          opacity: 1,
        }}>
          <p style={{
            fontSize: 28, fontWeight: 900, letterSpacing: "-0.01em",
            fontFamily: "'Outfit', sans-serif",
            color: "#FFFFFF",
            textShadow: `0 0 24px ${gradA}DD, 0 0 48px ${gradB}88`,
            transition: `text-shadow ${TRANSITION_MS}ms ease`,
            marginBottom: 6,
            margin: "0 0 6px 0",
            lineHeight: 1.1,
          }}>IntelliLearn</p>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.92)",
            marginBottom: 3,
            margin: "0 0 4px 0",
            textShadow: '0 0 12px rgba(255,255,255,0.3)',
          }}>Mohanlal Sukhadia University</p>
          <p style={{
            fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.50)", fontWeight: 600,
            margin: 0,
          }}>Udaipur · Est. 1962</p>
        </div>

        {/* ── Slide content (cross-fades) ─────────────────────────────── */}
        <div
          key={slide}
          className={visible ? "content-enter" : "content-exit"}
          style={{ maxWidth: 600, width: "100%" }}
        >
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 999,
            background: `linear-gradient(90deg, ${gradA}18, ${gradB}18)`,
            border: `1px solid ${gradA}44`,
            marginBottom: 20,
            animation: "badge-glow 3s ease infinite",
          }}>
            <span style={{ fontSize: 14 }}>{current.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#FFFFFF",
              textShadow: `0 0 10px ${gradA}AA`,
            }}>{current.badge}</span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            lineHeight: 1.12,
            color: "#FFFFFF",
            marginBottom: 18,
            letterSpacing: "-0.02em",
          }}>
            {current.headline[0]}{" "}
            <span style={{
              color: gradA,
              textShadow: `0 0 24px ${gradA}99, 0 0 48px ${gradB}66`,
              transition: `color ${TRANSITION_MS}ms ease, text-shadow ${TRANSITION_MS}ms ease`,
            }}>{current.headline[1]}</span>
          </h1>

          {/* Divider line */}
          <div style={{
            width: 48, height: 3, borderRadius: 999, margin: "0 auto 18px",
            background: `linear-gradient(90deg, ${gradA}, ${gradB})`,
            transition: `background ${TRANSITION_MS}ms ease`,
          }} />

          {/* Subtitle */}
          <p style={{
            fontSize: "clamp(0.85rem, 2vw, 1.05rem)",
            color: "rgba(255,255,255,0.48)",
            lineHeight: 1.7,
            maxWidth: 480, margin: "0 auto",
            fontWeight: 300,
          }}>{current.sub}</p>
        </div>
      </main>

      {/* ── Bottom Controls ─────────────────────────────────────────────── */}
      <footer style={{
        position: "relative", zIndex: 10,
        padding: "18px 36px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        animation: "fade-in 0.8s ease 0.4s forwards", opacity: 0,
      }}>
        {/* Progress bar */}
        <div style={{
          width: "100%", maxWidth: 420, height: 3,
          background: "rgba(255,255,255,0.07)",
          borderRadius: 999, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 999,
            background: `linear-gradient(90deg, ${gradA}, ${gradB})`,
            width: `${overallPct}%`,
            transition: `width 0.6s cubic-bezier(0.4,0,0.2,1), background ${TRANSITION_MS}ms ease`,
          }} />
        </div>

        {/* Slide dots + Skip */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", maxWidth: 420,
        }}>
          {/* Dot indicators */}
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => advanceSlide(i)}
                style={{
                  width: i === slide ? 22 : 7,
                  height: 7,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
                  background: i === slide
                    ? `linear-gradient(90deg, ${gradA}, ${gradB})`
                    : "rgba(255,255,255,0.18)",
                  padding: 0,
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Skip button */}
          <button
            onClick={handleSkip}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.55)",
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.2s ease",
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = `linear-gradient(90deg, ${gradA}22, ${gradB}22)`
              e.currentTarget.style.borderColor = `${gradA}55`
              e.currentTarget.style.color = "#fff"
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)"
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
              e.currentTarget.style.color = "rgba(255,255,255,0.55)"
            }}
          >
            Skip Intro ›
          </button>
        </div>

        {/* Copyright */}
        <p style={{
          fontSize: 10, color: "rgba(255,255,255,0.18)",
          letterSpacing: "0.08em", fontFamily: "'Inter', sans-serif",
        }}>
          © {new Date().getFullYear()} Mohanlal Sukhadia University. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
