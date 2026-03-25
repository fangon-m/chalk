import { useState, useEffect, useCallback } from "react";
import {
  House, Flame, Award, Target, CheckCircle2,
  AlertTriangle, X, BookOpen, Shield,
  Loader2, Check, ChevronLeft, ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { checkInStreak, getMissionIdsForStreak } from "../lib/streaks";
import { recalculateMissionProgress } from "../lib/missions";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFlameColor(count) {
  if (count >= 50) return "#c8f04c";
  if (count >= 21) return "#ef4444";
  if (count >= 11) return "#f97316";
  if (count >= 3)  return "#eab308";
  return "#6b7280";
}

function getPriorityColor(priority) {
  switch (priority) {
    case "critical": return "#ef4444";
    case "high":     return "#f97316";
    case "medium":   return "#eab308";
    case "low":      return "#6b7280";
    default:         return "#c8f04c";
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-white/6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="flex items-center gap-1 font-mono text-[10px] tracking-widest transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        <ChevronLeft size={11} /> PREV
      </button>
      <span className="font-mono text-[10px] text-white/25">
        {page + 1} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages - 1}
        className="flex items-center gap-1 font-mono text-[10px] tracking-widest transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-default"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        NEXT <ChevronRight size={11} />
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [streaks, setStreaks] = useState([]);
  const [todayCheckIns, setTodayCheckIns] = useState(new Set());
  const [missions, setMissions] = useState([]);
  const [journals, setJournals] = useState([]);
  const [checkingIn, setCheckingIn] = useState(null);

  // Pagination
  const PAGE_SIZE = 5;
  const [streakPage, setStreakPage]   = useState(0);
  const [missionPage, setMissionPage] = useState(0);

  const today = new Date().toISOString().slice(0, 10);
  const dailyQuote = getDailyQuote();

  const load = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const [
        { data: streakData, error: streakErr },
        { data: logsData,   error: logsErr   },
        { data: missionData,error: missionErr},
        { data: journalData,error: journalErr},
      ] = await Promise.all([
        supabase.from("streaks").select("*").order("created_at", { ascending: true }),
        supabase.from("streak_logs").select("streak_id").eq("date", today),
        supabase.from("missions").select("id, title, priority, progress, milestones(id, completed)").order("priority", { ascending: true }),
        supabase.from("journals").select("id, title, created_at, updated_at").is("deleted_at", null).order("updated_at", { ascending: false }).limit(3),
      ]);

      if (streakErr) throw streakErr;
      if (logsErr)   throw logsErr;
      if (missionErr) throw missionErr;
      if (journalErr) throw journalErr;

      setStreaks(streakData || []);
      setTodayCheckIns(new Set((logsData || []).map(l => l.streak_id)));
      setMissions(missionData || []);
      setJournals(journalData || []);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  async function handleCheckIn(streakId) {
    if (checkingIn || todayCheckIns.has(streakId)) return;
    setCheckingIn(streakId);
    try {
      await checkInStreak(streakId);
      setTodayCheckIns(prev => new Set([...prev, streakId]));
      // Refresh streak counts
      const { data } = await supabase.from("streaks").select("*").order("created_at", { ascending: true });
      if (data) setStreaks(data);
      // Recalculate connected missions silently
      const missionIds = await getMissionIdsForStreak(streakId);
      if (missionIds.length > 0) {
        Promise.all(missionIds.map(mid => recalculateMissionProgress(mid))).catch(() => {});
      }
    } catch (e) {
      setPageError(e.message);
    } finally {
      setCheckingIn(null);
    }
  }

  const checkedInCount = todayCheckIns.size;
  const totalStreaks   = streaks.length;
  const lifeScore      = totalStreaks > 0 ? Math.round((checkedInCount / totalStreaks) * 100) : 0;
  const isComplete     = lifeScore === 100 && totalStreaks > 0;
  const pendingStreaks  = streaks.filter(s => !todayCheckIns.has(s.id));
  const doneStreaks     = streaks.filter(s =>  todayCheckIns.has(s.id));

  // Pagination slices
  const streakTotalPages  = Math.ceil(streaks.length / PAGE_SIZE);
  const missionTotalPages = Math.ceil(missions.length / PAGE_SIZE);
  const streakSlice   = streaks.slice(streakPage * PAGE_SIZE, (streakPage + 1) * PAGE_SIZE);
  const missionSlice  = missions.slice(missionPage * PAGE_SIZE, (missionPage + 1) * PAGE_SIZE);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0d0d" }}>
      <p className="font-mono text-white/20 text-xs tracking-widest animate-pulse">LOADING...</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { font-family: 'DM Mono', monospace; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* ── Header — same pattern as all other pages ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <House size={14} className="text-[#c8f04c]" />
              <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">Chalk / Home</span>
            </div>
            <h1 className="text-2xl font-mono text-white">Dashboard</h1>
          </div>
        </div>

        {/* Error */}
        {pageError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <span className="font-mono text-xs text-red-400 flex-1">{pageError}</span>
            <button onClick={() => setPageError("")} className="text-red-400/60 hover:text-red-400 cursor-pointer"><X size={13} /></button>
          </div>
        )}

        {/* ── Daily Quote ── */}
        <div
          className="rounded-2xl border mb-4 px-6 py-5"
          style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)", borderLeft: "2px solid rgba(200,240,76,0.25)" }}
        >
          <p className="font-mono text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}>
            "{dailyQuote.text}"
          </p>
          <p className="font-mono text-[10px] tracking-widest" style={{ color: "rgba(200,240,76,0.5)" }}>
            — {dailyQuote.author}
          </p>
        </div>

        {/* ── Life Score Card ── */}
        <div
          className="rounded-2xl border mb-4 overflow-hidden"
          style={{ background: "#111", borderColor: isComplete ? "rgba(200,240,76,0.25)" : "rgba(255,255,255,0.08)" }}
        >
          {isComplete && <div className="h-0.5 w-full" style={{ background: "#c8f04c" }} />}
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase mb-1">Today's Life Score</p>
                <p className="font-mono text-sm text-white/50">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
              </div>
              {isComplete && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "rgba(200,240,76,0.08)", border: "1px solid rgba(200,240,76,0.2)" }}>
                  <Award size={12} style={{ color: "#c8f04c" }} />
                  <span className="font-mono text-[10px] tracking-widest" style={{ color: "#c8f04c" }}>PERFECT DAY</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-8">
              <LifeScoreRing score={lifeScore} isComplete={isComplete} />
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Streaks checked in</span>
                    <span className="font-mono text-[10px] text-white/40">{checkedInCount}/{totalStreaks}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${lifeScore}%`, background: "#c8f04c" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-mono text-[9px] tracking-widest text-white/25 uppercase mb-1">Pending</p>
                    <p className="font-mono text-xl text-white">{pendingStreaks.length}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-mono text-[9px] tracking-widest text-white/25 uppercase mb-1">Done</p>
                    <p className="font-mono text-xl" style={{ color: "#c8f04c" }}>{doneStreaks.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Today's Streaks ── */}
        {totalStreaks > 0 && (
          <div className="rounded-2xl border mb-4 overflow-hidden" style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Today's Streaks</p>
              <div className="flex items-center gap-1.5">
                <Flame size={10} className="text-white/20" />
                <span className="font-mono text-[10px] text-white/20">{checkedInCount}/{totalStreaks}</span>
              </div>
            </div>
            <div className="px-5 py-2" style={{ minHeight: PAGE_SIZE * 57 }}>
              {streakSlice.map((streak) => {
                const done      = todayCheckIns.has(streak.id);
                const spinning  = checkingIn === streak.id;
                return (
                  <div key={streak.id} className="flex items-center gap-3 py-2.5 border-b border-white/4 last:border-none">
                    <Flame size={10} style={{ color: getFlameColor(streak.current_streak ?? 0), flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs truncate" style={{ color: done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.8)" }}>
                        {streak.name}
                      </p>
                      <p className="font-mono text-[10px] text-white/25">{streak.current_streak ?? 0} day streak</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Shield pips */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Shield key={i} size={9} style={{
                            color: i < (streak.shields ?? 0) ? "#60a5fa" : "rgba(255,255,255,0.1)",
                            fill:  i < (streak.shields ?? 0) ? "rgba(96,165,250,0.2)" : "none",
                          }} />
                        ))}
                      </div>
                      {/* Check-in button */}
                      <button
                        onClick={() => handleCheckIn(streak.id)}
                        disabled={done || !!checkingIn}
                        className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all"
                        style={{
                          background:   done ? "rgba(200,240,76,0.12)" : "rgba(255,255,255,0.06)",
                          borderColor:  done ? "rgba(200,240,76,0.4)"  : "rgba(255,255,255,0.1)",
                          cursor:       done ? "default" : checkingIn ? "wait" : "pointer",
                        }}
                      >
                        {spinning ? (
                          <Loader2 size={11} className="animate-spin" style={{ color: "#c8f04c" }} />
                        ) : done ? (
                          <CheckCircle2 size={12} style={{ color: "#c8f04c" }} />
                        ) : (
                          <Check size={11} className="text-white/30" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={streakPage} totalPages={streakTotalPages} onChange={setStreakPage} />
          </div>
        )}

        {/* ── Mission Progress ── */}
        {missions.length > 0 && (
          <div className="rounded-2xl border mb-4 overflow-hidden" style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Mission Progress</p>
              <Target size={11} className="text-white/20" />
            </div>
            <div className="px-5 py-2" style={{ minHeight: PAGE_SIZE * 57 }}>
              {missionSlice.map((mission) => {
                const progress = Math.round(mission.progress ?? 0);
                const color    = getPriorityColor(mission.priority);
                const total    = mission.milestones?.length ?? 0;
                const done     = mission.milestones?.filter(m => m.completed).length ?? 0;
                return (
                  <div key={mission.id} className="py-3 border-b border-white/4 last:border-none">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-3.5 rounded shrink-0" style={{ background: color }} />
                      <span className="font-mono text-xs text-white truncate flex-1">{mission.title}</span>
                      <span className="font-mono text-[10px] shrink-0" style={{ color }}>{progress}%</span>
                      <span className="font-mono text-[9px] text-white/20 shrink-0">{done}/{total}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden ml-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination page={missionPage} totalPages={missionTotalPages} onChange={setMissionPage} />
          </div>
        )}

        {/* ── Recent Journals ── */}
        {journals.length > 0 && (
          <div className="rounded-2xl border mb-4 overflow-hidden" style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Recent Journals</p>
              <BookOpen size={11} className="text-white/20" />
            </div>
            <div className="px-5 py-2">
              {journals.map((journal) => {
                const hasTitle = journal.title?.trim().length > 0;
                return (
                  <div key={journal.id} className="flex items-center gap-3 py-3 border-b border-white/4 last:border-none">
                    <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ background: "rgba(200,240,76,0.2)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-white truncate">
                        {hasTitle ? journal.title : <span className="text-white/30 italic">Untitled</span>}
                      </p>
                      <p className="font-mono text-[10px] text-white/25 mt-0.5">
                        {formatDate(journal.updated_at)} · {formatTime(journal.updated_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state — nothing created yet */}
        {totalStreaks === 0 && missions.length === 0 && journals.length === 0 && (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/8" style={{ background: "#111" }}>
              <House size={22} className="text-white/20" />
            </div>
            <p className="font-mono text-white/15 text-[10px] tracking-widest uppercase mb-3">Nothing here yet</p>
            <p className="font-mono text-white/30 text-sm">Start by creating a streak, mission, or journal entry.</p>
          </div>
        )}

      </div>
    </div>
  );
}