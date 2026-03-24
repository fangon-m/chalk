import { useState, useEffect, useCallback } from "react";
import { House, Flame, Award, Target, CheckCircle2, AlertTriangle, X, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/sidebar";

// ── Daily Quote ───────────────────────────────────────────────────────────────

const QUOTES = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "It's not whether you get knocked down; it's whether you get up.", author: "Vince Lombardi" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Without effort, your talent is nothing more than your unmet potential.", author: "Angela Duckworth" },
  { text: "Do not wait to strike till the iron is hot, but make it hot by striking.", author: "William Butler Yeats" },
  { text: "You have to believe in yourself when no one else does.", author: "Naomi Osaka" },
  { text: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "You have to expect things of yourself before you can do them.", author: "Michael Jordan" },
  { text: "Winning isn't everything, but wanting to win is.", author: "Vince Lombardi" },
  { text: "There are no shortcuts to excellence.", author: "Angela Duckworth" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "The harder the battle, the sweeter the victory.", author: "Les Brown" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "I hated every minute of training, but I said: don't quit. Suffer now and live the rest of your life as a champion.", author: "Muhammad Ali" },
  { text: "Hard work is worthless for those that don't believe in themselves.", author: "Uzumaki Naruto" },
  { text: "Do what you have to do until you can do what you want to do.", author: "Oprah Winfrey" },
  { text: "My magic is never giving up.", author: "Asta" },
  { text: "Not everyone who works hard is rewarded. But all those who succeed have worked hard.", author: "Genji Kamogawa" },
  { text: "There is no tomorrow.", author: "Apollo Creed" },
  { text: "You have no limits.", author: "Chalk Dev" },
];

function getDailyQuote() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return QUOTES[seed % QUOTES.length];
}

function getMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  return { firstDay, today, daysElapsed, daysInMonth, monthName, year };
}

function getFlameColor(count) {
  if (count >= 50) return "#c8f04c";
  if (count >= 21) return "#ef4444";
  if (count >= 11) return "#f97316";
  if (count >= 3) return "#eab308";
  return "#6b7280";
}

function getPriorityColor(priority) {
  switch (priority) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#6b7280";
    default: return "#c8f04c";
  }
}

function getPriorityLabel(priority) {
  switch (priority) {
    case "critical": return "CRITICAL";
    case "high": return "HIGH";
    case "medium": return "MED";
    case "low": return "LOW";
    default: return "—";
  }
}

// ── Life Score Ring ───────────────────────────────────────────────────────────

function LifeScoreRing({ score, isComplete }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = isComplete ? "#c8f04c"
    : score >= 75 ? "#c8f04c"
    : score >= 50 ? "#eab308"
    : score >= 25 ? "#f97316"
    : "#6b7280";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isComplete ? (
          <Award size={24} style={{ color: "#c8f04c" }} />
        ) : (
          <>
            <span className="font-mono text-2xl font-medium text-white">{score}</span>
            <span className="font-mono text-[9px] tracking-widest text-white/30">%</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Streak Row ────────────────────────────────────────────────────────────────

function StreakCheckIn({ streak, checkedInToday }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
      <Flame size={10} style={{ color: getFlameColor(streak.current_streak ?? 0), flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-white truncate">{streak.name}</p>
        <p className="font-mono text-[10px] text-white/30">{streak.current_streak} streak</p>
      </div>
      {checkedInToday ? (
        <CheckCircle2 size={13} style={{ color: "#c8f04c", flexShrink: 0 }} />
      ) : (
        <div className="w-5 h-5 rounded border-2" style={{ borderColor: "rgba(255,255,255,0.15)" }} />
      )}
    </div>
  );
}

// ── Mission Snapshot ──────────────────────────────────────────────────────────

function MissionSnapshot({ mission }) {
  const progress = Math.round(mission.progress ?? 0);
  const color = getPriorityColor(mission.priority);
  const totalMilestones = mission.milestones?.length ?? 0;
  const doneMilestones = mission.milestones?.filter((m) => m.completed).length ?? 0;
  const isFinished = progress >= 100;

  return (
    <div className="py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-1 h-4 rounded shrink-0" style={{ background: color }} />
        <span className="font-mono text-xs text-white truncate flex-1">{mission.title}</span>
        <span className="font-mono text-[9px]" style={{ color }}>{progress}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden ml-3" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [streaks, setStreaks] = useState([]);
  const [todayCheckIns, setTodayCheckIns] = useState({});
  const [missions, setMissions] = useState([]);

  const { today, monthName, year } = getMonthRange();
  const dailyQuote = getDailyQuote();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Get all streaks
      const { data: streakData, error: streakErr } = await supabase
        .from("streaks").select("*").order("created_at", { ascending: true });
      if (streakErr) throw streakErr;

      // Get today's check-ins
      const { data: logsData, error: logsErr } = await supabase
        .from("streak_logs")
        .select("streak_id")
        .eq("date", today);
      if (logsErr) throw logsErr;

      const checkedInSet = new Set(logsData?.map(l => l.streak_id) || []);

      // Get missions
      const { data: missionData, error: missionErr } = await supabase
        .from("missions")
        .select("id, title, priority, progress, milestones(id, completed)")
        .order("priority", { ascending: true })
        .limit(5);
      if (missionErr) throw missionErr;

      setStreaks(streakData || []);
      setTodayCheckIns(checkedInSet);
      setMissions(missionData || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  // Calculate life score for today
  const checkedInToday = Array.from(todayCheckIns).length;
  const totalStreaks = streaks.length;
  const lifeScoreToday = totalStreaks > 0 ? Math.round((checkedInToday / totalStreaks) * 100) : 0;
  const isComplete = lifeScoreToday === 100 && totalStreaks > 0;

  // Get top missions
  const topMissions = missions.slice(0, 3);

  // Stats for life score card
  const perfectCount = streaks.filter((s) => todayCheckIns.has(s.id)).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0d0d" }}>
        <p className="font-mono text-white/20 text-xs tracking-widest animate-pulse">LOADING...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { font-family: 'DM Mono', monospace; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
              <House size={14} className="text-[#c8f04c]" />
              <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">Chalk / Missions</span>
          </div>
          <h1 className="font-mono text-2xl text-white">Today's Status</h1>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <span className="font-mono text-xs text-red-400 flex-1">{error}</span>
            <button onClick={() => setError("")} className="text-red-400/60 hover:text-red-400"><X size={13} /></button>
          </div>
        )}

        {/* Grid Layout: Top Cards */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          {/* ── Life Score Card (from Stats) ── */}
          <div
            className="rounded-2xl border mb-4 overflow-hidden"
            style={{ background: "#111", borderColor: isComplete ? "rgba(200,240,76,0.25)" : "rgba(255,255,255,0.08)" }}
          >
            {isComplete && <div className="h-0.5 w-full" style={{ background: "#c8f04c" }} />}
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase mb-1">Life Score</p>
                  <p className="font-mono text-sm text-white/50">Today</p>
                </div>
                {isComplete && (
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(200,240,76,0.08)", border: "1px solid rgba(200,240,76,0.2)" }}
                  >
                    <Award size={12} style={{ color: "#c8f04c" }} />
                    <span className="font-mono text-[10px] tracking-widest" style={{ color: "#c8f04c" }}>PERFECT DAY</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-8">
                <LifeScoreRing score={lifeScoreToday} isComplete={isComplete} />
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Daily Check-In Progress</span>
                      <span className="font-mono text-[10px] text-white/40">{checkedInToday}/{totalStreaks} streaks</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${lifeScoreToday}%`, background: "#c8f04c" }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="font-mono text-[9px] tracking-widest text-white/25 uppercase mb-1">Total</p>
                      <p className="font-mono text-xl text-white">{totalStreaks}</p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="font-mono text-[9px] tracking-widest text-white/25 uppercase mb-1">Checked In</p>
                      <p className="font-mono text-xl" style={{ color: "#c8f04c" }}>{perfectCount}</p>
                    </div>
                  </div>
                  {!isComplete && totalStreaks > 0 && (
                    <p className="font-mono text-[10px] text-white/20 leading-relaxed">
                      Check in all streaks today to reach 100% and earn a Perfect Day.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* Grid Layout: Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Streak Check-Ins */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Daily Check-Ins</p>
              <span className="font-mono text-[10px] text-white/40">{checkedInToday}/{totalStreaks}</span>
            </div>
            <div className="space-y-2">
              {streaks.length > 0 ? (
                streaks.map((streak) => (
                  <StreakCheckIn key={streak.id} streak={streak} checkedInToday={todayCheckIns.has(streak.id)} />
                ))
              ) : (
                <p className="font-mono text-xs text-white/30 py-8 text-center">No streaks yet. Create one to get started.</p>
              )}
            </div>
          </div>

          {/* Mission Progress Snapshot */}
          <div
            className="rounded-2xl border p-5"
            style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Mission Progress</p>
              <Target size={12} className="text-white/30" />
            </div>
            {topMissions.length > 0 ? (
              <div className="space-y-1">
                {topMissions.map((mission) => (
                  <MissionSnapshot key={mission.id} mission={mission} />
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs text-white/30 py-8 text-center">No missions yet. Create one to get started.</p>
            )}
          </div>

          {/* ── Daily Quote ── */}
          <div
            className="rounded-2xl border mb-4 px-6 py-5"
            style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)", borderLeft: "2px solid rgba(200,240,76,0.25)" }}
          >
            <p
              className="font-mono text-sm leading-relaxed mb-3"
              style={{ color: "rgba(255,255,255,0.40)", fontStyle: "italic" }}
            >
              "{dailyQuote.text}"
            </p>
            <p className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(255,255,255,0.30)" }}>
              — {dailyQuote.author}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}