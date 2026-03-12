import { House, Map, Flame, BookOpen, BarChart2, LogOut } from "lucide-react";
import logo from "../../res/logo.png";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { label: "Home",     icon: House,           path: "/dashboard" },
  { label: "Missions", icon: Map,             path: "/missions"  },
  { label: "Streaks",  icon: Flame,           path: "/streaks"   },
  { label: "Journal",  icon: BookOpen,        path: "/journal"   },
  { label: "Stats",    icon: BarChart2,       path: "/stats"     },
];

export default function Sidebar() {

  const [expanded, setExpanded] = useState(false);
  const location = useLocation();

  return (
    <aside
    onMouseEnter={() => setExpanded(true)}
    onMouseLeave={() => setExpanded(false)}
    style={{
      width: expanded ? 220 : 60,
        minHeight: "100vh",
        background: "#111111",
        borderRight: "1px solid #232323",
        padding: expanded ? "32px 16px" : "32px 8px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "all 0.3s ease",
        overflow: "hidden",
      }}>
    
      {/* Top section */}
      <div>

      {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "50px", marginLeft: "5px", marginTop: "-5px" }}>
        <img src={logo} alt="logo" style={{ width: 32, height: 32, borderRadius: 6 }} />
        {expanded && (
        <span style={{ fontFamily: "DM Mono", fontSize: 12, letterSpacing: "5px", color: "white", textTransform: "uppercase" }}>
            CHALK</span>
        )}
        </div>

      {/* Nav links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.label} to={item.path} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    display: "flex", alignItems: "center",
                    gap: expanded ? 14 : 0,
                    padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    background: isActive ? "#1a1a1a" : "transparent",
                    color: isActive ? "#c8f04c" : "#ffffff99",
                    transition: "all 0.2s ease",
                    fontFamily: "DM Mono", fontSize: 14, letterSpacing: "0.15em",
                    border: isActive ? "1px solid #232323" : "1px solid transparent",
                    whiteSpace: "nowrap", overflow: "hidden",
                    justifyContent: expanded ? "flex-start" : "center",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.borderColor = "#ffffff21"; }}}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = "#ffffff99"; e.currentTarget.style.borderColor = "transparent"; }}}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {expanded && (
                    <span style={{ marginLeft: 14 }}>{item.label}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <button
        style={{
          display: "flex", alignItems: "center",
          gap: expanded ? 14 : 0,
          justifyContent: expanded ? "flex-start" : "center",
          padding: "10px 12px", borderRadius: 8, cursor: "pointer",
          background: "transparent", border: "1px solid transparent",
          color: "#666", fontFamily: "DM Mono", fontSize: 14,
          letterSpacing: "0.15em", width: "100%", transition: "all 0.2s ease",
          whiteSpace: "nowrap", overflow: "hidden",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = "#ff6b6b"; e.currentTarget.style.borderColor = "#ffffff21"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#666"; e.currentTarget.style.borderColor = "transparent"; }}
      >
        <LogOut size={15} style={{ flexShrink: 0 }} />
        {expanded && <span style={{ marginLeft: 14 }}>Logout</span>}
      </button>
    </aside>
  );
}