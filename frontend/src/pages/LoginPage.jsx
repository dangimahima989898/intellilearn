import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import {
  GraduationCap,
  Shield,
  Sun,
  Moon,
  ArrowRight,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Users,
  Settings,
  BarChart3,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react"

/* ── tiny floating particle data (stable ref) ─────────────────────────── */
const DOTS = Array.from({ length: 38 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  r: 1.5 + Math.random() * 2.5,
  dur: 7 + Math.random() * 9,
  delay: Math.random() * 7,
  op: 0.08 + Math.random() * 0.22,
}))

export default function LoginPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState(null)   // "student" | "admin" | null

  /* ── Entrance animation trigger ──────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  /* ── Auth redirect ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate(user.role === "admin" ? "/admin" : "/student")
    }
  }, [isAuthenticated, user, loading, navigate])

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#05091A",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
      }}>
        <Loader2 style={{ width: 36, height: 36, color: "#3B82F6", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: 16, color: "rgba(255,255,255,0.35)", fontSize: 11,
          fontWeight: 700, letterSpacing: "0.15em" }}>VERIFYING SESSION…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#05091A",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: "relative",
      overflowX: "hidden",
      display: "flex", flexDirection: "column",
      /* Entrance: fade + slide up from 30px */
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0)" : "translateY(30px)",
      transition: "opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)",
    }}>

      {/* ── Global keyframes ────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&family=Outfit:wght@400;700;900&display=swap');

        @keyframes float-particle {
          0%,100% { transform: translateY(0)   scale(1);    }
          50%      { transform: translateY(-18px) scale(1.06); }
        }
        @keyframes aurora-drift {
          0%,100% { transform: scale(1)    translate(0, 0);     }
          33%      { transform: scale(1.15) translate(40px,-30px); }
          66%      { transform: scale(0.88) translate(-25px,35px); }
        }
        @keyframes card-float {
          0%,100% { transform: translateY(0px);  }
          50%      { transform: translateY(-5px); }
        }
        @keyframes badge-shimmer {
          0%   { background-position: -300px 0; }
          100% { background-position: 300px 0;  }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes stagger-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes line-grow {
          from { width: 0; }
          to   { width: 48px; }
        }
        .card-animate {
          animation: stagger-in 0.65s cubic-bezier(0.16,1,0.3,1) forwards;
          opacity: 0;
        }
        .header-animate {
          animation: stagger-in 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s forwards;
          opacity: 0;
        }
        .hero-animate {
          animation: stagger-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s forwards;
          opacity: 0;
        }
        .footer-animate {
          animation: stagger-in 0.5s ease 0.7s forwards;
          opacity: 0;
        }
      `}</style>

      {/* ── Aurora background orbs ──────────────────────────────────────── */}
      <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{
          position:"absolute", width:600, height:600,
          borderRadius:"50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.16) 0%, transparent 70%)",
          top:"-15%", left:"-12%",
          animation: "aurora-drift 18s ease-in-out infinite",
        }} />
        <div style={{
          position:"absolute", width:700, height:700,
          borderRadius:"50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          bottom:"-18%", right:"-14%",
          animation: "aurora-drift 22s ease-in-out 4s infinite reverse",
        }} />
        <div style={{
          position:"absolute", width:400, height:400,
          borderRadius:"50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
          top:"40%", left:"50%",
          animation: "aurora-drift 15s ease-in-out 8s infinite",
        }} />
      </div>

      {/* ── Floating particles ──────────────────────────────────────────── */}
      {DOTS.map(d => (
        <div key={d.id} style={{
          position:"absolute",
          left: `${d.x}%`, top: `${d.y}%`,
          width: d.r, height: d.r,
          borderRadius:"50%",
          background:"white",
          opacity: d.op,
          animation: `float-particle ${d.dur}s ease-in-out ${d.delay}s infinite`,
          pointerEvents:"none", zIndex:1,
        }} />
      ))}



      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="header-animate" style={{
        position:"relative", zIndex:10,
        padding:"20px 36px",
        display:"flex", alignItems:"center", gap:10,
        borderBottom:"1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{
          width:38, height:38, borderRadius:10,
          background:"linear-gradient(135deg, rgba(59,130,246,0.18), rgba(99,102,241,0.18))",
          border:"1px solid rgba(59,130,246,0.3)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <GraduationCap size={18} color="#60A5FA" />
        </div>
        <span style={{
          fontFamily:"'Outfit', sans-serif", fontWeight:900, fontSize:19,
          background:"linear-gradient(90deg, #60A5FA, #A78BFA)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>IntelliLearn</span>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        position:"relative", zIndex:10,
        padding:"16px 24px",
      }}>
        <div className="hero-animate" style={{ textAlign:"center", marginBottom:24, maxWidth:560 }}>
          {/* Pill badge */}
          <div style={{
            display:"inline-flex", alignItems:"center", gap:7,
            padding:"7px 18px", borderRadius:999, marginBottom:22,
            background:"linear-gradient(90deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))",
            border:"1px solid rgba(99,102,241,0.3)",
          }}>
            <Sparkles size={13} color="#818CF8" style={{ flexShrink:0 }} />
            <span style={{
              fontSize:10, fontWeight:700, letterSpacing:"0.14em",
              textTransform:"uppercase",
              background:"linear-gradient(90deg, #60A5FA, #A78BFA)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>Select Your Workspace</span>
          </div>

          <h1 style={{
            fontFamily:"'Outfit', sans-serif", fontWeight:900,
            fontSize:"clamp(2rem, 5vw, 3.2rem)",
            letterSpacing:"-0.02em", lineHeight:1.1,
            color:"#FFFFFF", marginBottom:14,
          }}>
            Welcome to{" "}
            <span style={{
              background:"linear-gradient(110deg, #3B82F6, #8B5CF6)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            }}>IntelliLearn</span>
          </h1>

          {/* Animated underline */}
          <div style={{
            height:3, borderRadius:999, margin:"0 auto 12px",
            background:"linear-gradient(90deg, #3B82F6, #8B5CF6)",
            animation:"line-grow 0.7s cubic-bezier(0.4,0,0.2,1) 0.4s both",
          }} />

          <p style={{
            fontSize:"clamp(0.85rem, 1.8vw, 0.95rem)",
            color:"rgba(255,255,255,0.42)", lineHeight:1.6,
            fontWeight:300, maxWidth:440, margin:"0 auto",
          }}>
            Choose your dedicated workspace to explore courseware, solve doubts, or administer the platform.
          </p>
        </div>

        {/* ── Portal Cards ─────────────────────────────────────────────── */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",
          gap:24, width:"100%", maxWidth:820,
        }}>

          {/* ── Student Card ─────────────────────────────────────────── */}
          <Link
            to="/login/student"
            className="card-animate"
            style={{ animationDelay:"0.35s", textDecoration:"none" }}
            onMouseEnter={() => setHovered("student")}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{
              position:"relative",
              background: hovered==="student"
                ? "linear-gradient(145deg, rgba(59,130,246,0.1), rgba(20,184,166,0.07))"
                : "rgba(255,255,255,0.04)",
              border: hovered==="student"
                ? "1px solid rgba(59,130,246,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius:24,
              padding:"24px 20px",
              display:"flex", flexDirection:"column",
              backdropFilter:"blur(16px)",
              transition:"all 0.35s cubic-bezier(0.4,0,0.2,1)",
              transform: hovered==="student" ? "translateY(-6px) scale(1.01)" : "translateY(0) scale(1)",
              boxShadow: hovered==="student"
                ? "0 24px 64px rgba(59,130,246,0.18), 0 0 0 1px rgba(59,130,246,0.15)"
                : "0 8px 32px rgba(0,0,0,0.3)",
              overflow:"hidden",
              animation: hovered==="student" ? "none" : undefined,
            }}>
              {/* Card glow spot */}
              <div style={{
                position:"absolute", top:0, right:0,
                width:180, height:180,
                borderRadius:"50%",
                background:"radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
                opacity: hovered==="student" ? 1 : 0,
                transition:"opacity 0.3s ease",
                pointerEvents:"none",
              }} />

              {/* Icon */}
              <div style={{
                width:56, height:56, borderRadius:16, marginBottom:22,
                background:"linear-gradient(135deg, rgba(59,130,246,0.22), rgba(20,184,166,0.22))",
                border:"1px solid rgba(59,130,246,0.35)",
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"transform 0.3s ease, box-shadow 0.3s ease",
                transform: hovered==="student" ? "scale(1.1) rotate(-3deg)" : "scale(1)",
                boxShadow: hovered==="student" ? "0 8px 24px rgba(59,130,246,0.3)" : "none",
              }}>
                <GraduationCap size={26} color="#60A5FA" />
              </div>

              {/* Title */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <h3 style={{
                  fontFamily:"'Outfit', sans-serif", fontWeight:800,
                  fontSize:22, color:"#FFFFFF", margin:0,
                }}>Student Portal</h3>
                <span style={{
                  fontSize:9, fontWeight:700, letterSpacing:"0.1em",
                  textTransform:"uppercase", padding:"2px 8px", borderRadius:999,
                  background:"rgba(59,130,246,0.15)",
                  border:"1px solid rgba(59,130,246,0.25)",
                  color:"#60A5FA",
                }}>LEARN</span>
              </div>

              <p style={{
                color:"rgba(255,255,255,0.38)", fontSize:13,
                lineHeight:1.7, marginBottom:22, fontWeight:300,
              }}>
                Access adaptive coursework, AI doubt companion, interactive quizzes, and personalised study calendars.
              </p>

              {/* Feature list */}
              <div style={{
                borderTop:"1px solid rgba(255,255,255,0.06)",
                paddingTop:18, marginBottom:24,
                display:"flex", flexDirection:"column", gap:12,
              }}>
                {[
                  [BookOpen, "Smart Subject Repositories"],
                  [MessageSquare, "24/7 AI Doubt Companion"],
                  [TrendingUp, "Adaptive Practice Quizzes"],
                ].map(([Icon, label]) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{
                      width:28, height:28, borderRadius:8, flexShrink:0,
                      background:"rgba(59,130,246,0.1)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <Icon size={13} color="#60A5FA" />
                    </div>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.52)", fontWeight:500 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{
                width:"100%", padding:"13px 20px",
                borderRadius:14, display:"flex",
                alignItems:"center", justifyContent:"center", gap:8,
                background: hovered==="student"
                  ? "linear-gradient(90deg, #2563EB, #0D9488)"
                  : "linear-gradient(90deg, #3B82F6, #14B8A6)",
                color:"#fff", fontWeight:700, fontSize:13,
                letterSpacing:"0.03em",
                transition:"all 0.3s ease",
                boxShadow: hovered==="student" ? "0 8px 28px rgba(37,99,235,0.4)" : "0 4px 16px rgba(59,130,246,0.25)",
              }}>
                Enter Student Portal
                <ArrowRight
                  size={15}
                  style={{ transition:"transform 0.2s ease", transform: hovered==="student" ? "translateX(4px)" : "none" }}
                />
              </div>
            </div>
          </Link>

          {/* ── Admin Card ───────────────────────────────────────────── */}
          <Link
            to="/login/admin"
            className="card-animate"
            style={{ animationDelay:"0.48s", textDecoration:"none" }}
            onMouseEnter={() => setHovered("admin")}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={{
              position:"relative",
              background: hovered==="admin"
                ? "linear-gradient(145deg, rgba(139,92,246,0.1), rgba(236,72,153,0.07))"
                : "rgba(255,255,255,0.04)",
              border: hovered==="admin"
                ? "1px solid rgba(139,92,246,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius:24,
              padding:"24px 20px",
              display:"flex", flexDirection:"column",
              backdropFilter:"blur(16px)",
              transition:"all 0.35s cubic-bezier(0.4,0,0.2,1)",
              transform: hovered==="admin" ? "translateY(-6px) scale(1.01)" : "translateY(0) scale(1)",
              boxShadow: hovered==="admin"
                ? "0 24px 64px rgba(139,92,246,0.18), 0 0 0 1px rgba(139,92,246,0.15)"
                : "0 8px 32px rgba(0,0,0,0.3)",
              overflow:"hidden",
            }}>
              {/* Card glow spot */}
              <div style={{
                position:"absolute", top:0, right:0,
                width:180, height:180,
                borderRadius:"50%",
                background:"radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)",
                opacity: hovered==="admin" ? 1 : 0,
                transition:"opacity 0.3s ease",
                pointerEvents:"none",
              }} />

              {/* Icon */}
              <div style={{
                width:56, height:56, borderRadius:16, marginBottom:22,
                background:"linear-gradient(135deg, rgba(139,92,246,0.22), rgba(236,72,153,0.22))",
                border:"1px solid rgba(139,92,246,0.35)",
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"transform 0.3s ease, box-shadow 0.3s ease",
                transform: hovered==="admin" ? "scale(1.1) rotate(3deg)" : "scale(1)",
                boxShadow: hovered==="admin" ? "0 8px 24px rgba(139,92,246,0.3)" : "none",
              }}>
                <Shield size={26} color="#A78BFA" />
              </div>

              {/* Title */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <h3 style={{
                  fontFamily:"'Outfit', sans-serif", fontWeight:800,
                  fontSize:22, color:"#FFFFFF", margin:0,
                }}>Admin Console</h3>
                <span style={{
                  fontSize:9, fontWeight:700, letterSpacing:"0.1em",
                  textTransform:"uppercase", padding:"2px 8px", borderRadius:999,
                  background:"rgba(139,92,246,0.15)",
                  border:"1px solid rgba(139,92,246,0.25)",
                  color:"#A78BFA",
                }}>CONTROL</span>
              </div>

              <p style={{
                color:"rgba(255,255,255,0.38)", fontSize:13,
                lineHeight:1.7, marginBottom:22, fontWeight:300,
              }}>
                Manage student registrations, seed assessments, design dynamic calendars, and evaluate performance metrics.
              </p>

              {/* Feature list */}
              <div style={{
                borderTop:"1px solid rgba(255,255,255,0.06)",
                paddingTop:18, marginBottom:24,
                display:"flex", flexDirection:"column", gap:12,
              }}>
                {[
                  [Users, "Cohort & Role Management"],
                  [Settings, "Content Seeding Engines"],
                  [BarChart3, "Engagement Analytics"],
                ].map(([Icon, label]) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{
                      width:28, height:28, borderRadius:8, flexShrink:0,
                      background:"rgba(139,92,246,0.1)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>
                      <Icon size={13} color="#A78BFA" />
                    </div>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.52)", fontWeight:500 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{
                width:"100%", padding:"13px 20px",
                borderRadius:14, display:"flex",
                alignItems:"center", justifyContent:"center", gap:8,
                background: hovered==="admin"
                  ? "linear-gradient(90deg, #7C3AED, #BE185D)"
                  : "linear-gradient(90deg, #8B5CF6, #EC4899)",
                color:"#fff", fontWeight:700, fontSize:13,
                letterSpacing:"0.03em",
                transition:"all 0.3s ease",
                boxShadow: hovered==="admin" ? "0 8px 28px rgba(124,58,237,0.4)" : "0 4px 16px rgba(139,92,246,0.25)",
              }}>
                Enter Admin Console
                <ArrowRight
                  size={15}
                  style={{ transition:"transform 0.2s ease", transform: hovered==="admin" ? "translateX(4px)" : "none" }}
                />
              </div>
            </div>
          </Link>

        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="footer-animate" style={{
        textAlign:"center", padding:"18px 24px 24px",
        position:"relative", zIndex:10,
        borderTop:"1px solid rgba(255,255,255,0.04)",
      }}>
        <Link
          to="/request-access"
          style={{
            color:"rgba(255,255,255,0.28)",
            fontSize:12, fontWeight:600, textDecoration:"none",
            transition:"color 0.2s ease",
          }}
          onMouseOver={e => e.currentTarget.style.color="#60A5FA"}
          onMouseOut={e => e.currentTarget.style.color="rgba(255,255,255,0.28)"}
        >
          New student? Request verification credentials →
        </Link>
      </footer>
    </div>
  )
}
