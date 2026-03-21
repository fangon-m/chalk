import { useState, useEffect, useCallback } from "react";
import {
  BarChart2, Shield, Flame, Award, Star,
  AlertTriangle, X, Loader2, CheckCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const daysElapsed = now.getDate(); // 1-based, so day 1 = 1 day elapsed
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  return { firstDay, today, daysElapsed, daysInMonth, monthName, year };
}

function getFlameColor(count) {
  if (count >= 50) return "#c8f04c";
  if (count >= 21) return "#ef4444";
  if (count >= 11) return "#f97316";
  if (count >= 3)  return "#eab308";
  return "#6b7280";
}

// ── Honor Award Modal ─────────────────────────────────────────────────────────

function HonorAward({ monthName, year, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl border p-10 flex flex-col items-center text-center max-w-sm mx-4"
        style={{ background: "#111", borderColor: "rgba(200,240,76,0.3)", boxShadow: "0 0 60px rgba(200,240,76,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Award icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: "rgba(200,240,76,0.08)", border: "2px solid rgba(200,240,76,0.3)" }}
        >
          <Award size={36} style={{ color: "#c8f04c" }} />
        </div>

        <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase mb-2">
          Honor Award
        </p>
        <h2 className="font-mono text-2xl text-white mb-2">Perfect Month</h2>
        <p className="font-mono text-sm text-white/50 mb-1">
          {monthName} {year}
        </p>
        <p className="font-mono text-xs text-white/30 leading-relaxed mb-8 max-w-xs">
          You checked in every streak for the entire month. That's extraordinary discipline.
        </p>

        {/* Stars */}
        <div className="flex items-center gap-2 mb-8">
          {[0,1,2].map(i => (
            <Star key={i} size={18} style={{ color: "#c8f04c", fill: "#c8f04c" }} />
          ))}
        </div>

        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#c8f04c", color: "#0d0d0d" }}
        >
          CLAIM HONOR
        </button>
      </div>
    </div>
  );
}

// ── Life Score Ring ───────────────────────────────────────────────────────────

function LifeScoreRing({ score, isComplete }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = isComplete ? "#c8f04c" : score >= 75 ? "#c8f04c" : score >= 50 ? "#eab308" : score >= 25 ? "#f97316" : "#6b7280";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        {/* Progress */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isComplete ? (
          <Award size={28} style={{ color: "#c8f04c" }} />
        ) : (
          <>
            <span className="font-mono text-3xl font-medium text-white">{score}</span>
            <span className="font-mono text-[10px] tracking-widest text-white/30">%</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Streak Row ────────────────────────────────────────────────────────────────

function StreakStatRow({ streak, checkedInDays, daysElapsed }) {
  const consistency = daysElapsed > 0 ? Math.round((checkedInDays / daysElapsed) * 100) : 0;
  const barColor = consistency === 100 ? "#c8f04c" : consistency >= 75 ? "#eab308" : consistency >= 50 ? "#f97316" : "#6b7280";

  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/6 last:border-none">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Flame size={11} style={{ color: getFlameColor(streak.current_streak ?? 0), flexShrink: 0 }} />
        <span className="font-mono text-xs text-white truncate">{streak.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {/* Mini progress bar */}
        <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${consistency}%`, background: barColor }}
          />
        </div>
        <span className="font-mono text-[11px] w-8 text-right" style={{ color: barColor }}>
          {consistency}%
        </span>
        {/* Check-in count */}
        <span className="font-mono text-[10px] text-white/25 w-14 text-right">
          {checkedInDays}/{daysElapsed}d
        </span>
        {/* Perfect badge */}
        {consistency === 100 && (
          <CheckCircle2 size={12} style={{ color: "#c8f04c" }} />
        )}
      </div>
    </div>
  );
}

// ── Main Stats Page ───────────────────────────────────────────────────────────

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [streaks, setStreaks] = useState([]);
  const [streakLogs, setStreakLogs] = useState({}); // streakId -> Set of dates
  const [showAward, setShowAward] = useState(false);
  const [awardSeen, setAwardSeen] = useState(false);

  const { firstDay, today, daysElapsed, daysInMonth, monthName, year } = getMonthRange();

  const load = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      // Fetch all streaks
      const { data: streakData, error: streakErr } = await supabase
        .from("streaks")
        .select("*")
        .order("created_at", { ascending: true });
      if (streakErr) throw streakErr;

      // Fetch all streak_logs for this month
      const { data: logsData, error: logsErr } = await supabase
        .from("streak_logs")
        .select("streak_id, date")
        .gte("date", firstDay)
        .lte("date", today);
      if (logsErr) throw logsErr;

      // Build map: streakId -> Set of dates checked in this month
      const logsMap = {};
      for (const log of logsData || []) {
        if (!logsMap[log.streak_id]) logsMap[log.streak_id] = new Set();
        logsMap[log.streak_id].add(log.date);
      }

      setStreaks(streakData || []);
      setStreakLogs(logsMap);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setLoading(false);
    }
  }, [firstDay, today]);

  useEffect(() => { load(); }, [load]);

  // ── Life Score calculation ──────────────────────────────────────────────────
  // For each streak: consistency = days checked in this month / days elapsed
  // Life score = average consistency across all streaks × 100
  // If no streaks, score = 0

  const streakConsistencies = streaks.map((s) => {
    const checkedIn = streakLogs[s.id]?.size ?? 0;
    return daysElapsed > 0 ? checkedIn / daysElapsed : 0;
  });

  const lifeScore = streaks.length > 0
    ? Math.round((streakConsistencies.reduce((a, b) => a + b, 0) / streaks.length) * 100)
    : 0;

  const isComplete = lifeScore === 100;

  // Show award modal when 100% is reached for the first time this session
  useEffect(() => {
    if (isComplete && !awardSeen && !loading && streaks.length > 0) {
      setShowAward(true);
      setAwardSeen(true);
    }
  }, [isComplete, awardSeen, loading, streaks.length]);

  // Progress through month
  const monthProgress = Math.round((daysElapsed / daysInMonth) * 100);

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

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={14} className="text-[#c8f04c]" />
              <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">
                Chalk / Stats
              </span>
            </div>
            <h1 className="text-2xl font-mono text-white">Overview</h1>
          </div>
        </div>

        {/* Error */}
        {pageError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <span className="font-mono text-xs text-red-400 flex-1">{pageError}</span>
            <button onClick={() => setPageError("")} className="text-red-400/60 hover:text-red-400"><X size={13} /></button>
          </div>
        )}

        {/* ── Life Score Card ── */}
        <div
          className="rounded-2xl border mb-4 overflow-hidden"
          style={{ background: "#111", borderColor: isComplete ? "rgba(200,240,76,0.25)" : "rgba(255,255,255,0.08)" }}
        >
          {/* Top accent if complete */}
          {isComplete && (
            <div className="h-0.5 w-full" style={{ background: "#c8f04c" }} />
          )}

          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase mb-1">
                  Life Score
                </p>
                <p className="font-mono text-sm text-white/50">
                  {monthName} {year}
                </p>
              </div>
              {isComplete && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(200,240,76,0.08)", border: "1px solid rgba(200,240,76,0.2)" }}
                >
                  <Award size={12} style={{ color: "#c8f04c" }} />
                  <span className="font-mono text-[10px] tracking-widest" style={{ color: "#c8f04c" }}>
                    HONOR AWARDED
                  </span>
                </div>
              )}
            </div>

            {/* Score ring + stats */}
            <div className="flex items-center gap-8">
              <LifeScoreRing score={lifeScore} isComplete={isComplete} />

              <div className="flex-1 space-y-4">
                {/* Month progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Month Progress</span>
                    <span className="font-mono text-[10px] text-white/40">{daysElapsed}/{daysInMonth} days</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${monthProgress}%`, background: "rgba(255,255,255,0.2)" }}
                    />
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-mono text-[9px] tracking-widest text-white/25 uppercase mb-1">Streaks</p>
                    <p className="font-mono text-xl text-white">{streaks.length}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="font-mono text-[9px] tracking-widest text-white/25 uppercase mb-1">Perfect</p>
                    <p className="font-mono text-xl" style={{ color: "#c8f04c" }}>
                      {streaks.filter((s, i) => Math.round(streakConsistencies[i] * 100) === 100).length}
                    </p>
                  </div>
                </div>

                {/* What it takes */}
                {!isComplete && streaks.length > 0 && (
                  <p className="font-mono text-[10px] text-white/20 leading-relaxed">
                    Check in all streaks daily to reach 100% and earn the Honor Award.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Per-streak breakdown ── */}
        {streaks.length > 0 && (
          <div
            className="rounded-2xl border overflow-hidden mb-4"
            style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="px-5 py-4 border-b border-white/6">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase">
                  Streak Consistency
                </p>
                <p className="font-mono text-[10px] text-white/20">
                  This month
                </p>
              </div>
            </div>
            <div className="px-5">
              {streaks.map((streak, i) => (
                <StreakStatRow
                  key={streak.id}
                  streak={streak}
                  checkedInDays={streakLogs[streak.id]?.size ?? 0}
                  daysElapsed={daysElapsed}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Shield summary ── */}
        {streaks.length > 0 && (
          <div
            className="rounded-2xl border overflow-hidden mb-4"
            style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="px-5 py-4 border-b border-white/6">
              <p className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Shield Status</p>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              {streaks.map((streak) => (
                <div
                  key={streak.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="font-mono text-[11px] text-white/60 truncate mr-2">{streak.name}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Shield
                        key={i}
                        size={11}
                        style={{
                          color: i < (streak.shields ?? 0) ? "#60a5fa" : "rgba(255,255,255,0.12)",
                          fill: i < (streak.shields ?? 0) ? "rgba(96,165,250,0.2)" : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {streaks.length === 0 && (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/8" style={{ background: "#111" }}>
              <BarChart2 size={22} className="text-white/20" />
            </div>
            <p className="font-mono text-white/15 text-[10px] tracking-widest uppercase mb-3">No data yet</p>
            <p className="font-mono text-white/30 text-sm">
              Create streaks and start checking in to see your life score.
            </p>
          </div>
        )}

        {/* Honor award button (if earned, always accessible) */}
        {isComplete && (
          <button
            onClick={() => setShowAward(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95 mt-2"
            style={{ background: "rgba(200,240,76,0.08)", border: "1px solid rgba(200,240,76,0.2)", color: "#c8f04c" }}
          >
            <Award size={13} />
            VIEW HONOR AWARD
          </button>
        )}
      </div>

      {/* Honor Award Modal */}
      {showAward && (
        <HonorAward
          monthName={monthName}
          year={year}
          onClose={() => setShowAward(false)}
        />
      )}
    </div>
  );
}