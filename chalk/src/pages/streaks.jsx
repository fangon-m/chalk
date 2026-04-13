import { useState, useEffect, useCallback } from "react";
import {
  Flame, Plus, Shield, CheckCircle2, Check, Pencil, Trash2,
  ChevronDown, ChevronUp, X, Loader2, AlertTriangle, Zap,
  Target, Link2, CalendarDays, LayoutGrid, List,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  getStreaks, createStreak, updateStreak, deleteStreak,
  checkInStreak, getStreakLogs,
} from "../lib/streaks";
import { recalculateMissionProgress } from "../lib/missions";
import { getMissionIdsForStreak } from "../lib/streaks";
import { useSettings } from "../context/SettingsContext.jsx";

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = [
  { label: "Su", full: "Sunday",    value: 0 },
  { label: "Mo", full: "Monday",    value: 1 },
  { label: "Tu", full: "Tuesday",   value: 2 },
  { label: "We", full: "Wednesday", value: 3 },
  { label: "Th", full: "Thursday",  value: 4 },
  { label: "Fr", full: "Friday",    value: 5 },
  { label: "Sa", full: "Saturday",  value: 6 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTodayDow() { return new Date().getDay(); }

function isScheduledToday(scheduledDays) {
  if (!scheduledDays || scheduledDays.length === 0) return true;
  return scheduledDays.includes(getTodayDow());
}

function formatSchedule(scheduledDays) {
  if (!scheduledDays || scheduledDays.length === 0) return "Every day";
  if (scheduledDays.length === 7) return "Every day";
  return scheduledDays.slice().sort((a, b) => a - b).map(d => DAYS[d].label).join(", ");
}

function getFlameColor(count, accentColor) {
  if (count >= 50) return accentColor;
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
    default:         return "#6b7280";
  }
}

// ── Day Picker ────────────────────────────────────────────────────────────────

function DayPicker({ value, onChange, accentColor }) {
  const selected = value || [];
  function toggle(dow) {
    if (selected.includes(dow)) {
      const next = selected.filter(d => d !== dow);
      onChange(next.length === 0 ? null : next);
    } else {
      onChange([...selected, dow]);
    }
  }
  return (
    <div>
      <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-2">
        Schedule{(!value || value.length === 0) && <span className="text-white/20 normal-case tracking-normal ml-1">(empty = every day)</span>}
      </label>
      <div className="flex gap-1.5">
        {DAYS.map((day) => {
          const active = selected.includes(day.value);
          return (
            <button key={day.value} type="button" onClick={() => toggle(day.value)}
              className="flex-1 py-1.5 rounded-lg font-mono text-[10px] tracking-wide transition-all cursor-pointer"
              style={{
                background: active ? `${accentColor}26` : "rgba(255,255,255,0.05)",
                border: active ? `1px solid ${accentColor}59` : "1px solid rgba(255,255,255,0.08)",
                color: active ? accentColor : "rgba(255,255,255,0.3)",
              }}>
              {day.label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="font-mono text-[10px] text-white/25 mt-1.5">Scheduled: {formatSchedule(selected)}</p>
      )}
    </div>
  );
}

// ── Calendar Strip ────────────────────────────────────────────────────────────

function CalendarStrip({ logs, scheduledDays = null, createdAt = null, accentColor }) {
  const checkedSet = new Set(logs.map(l => l.date));
  const today = new Date();
  const todayStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let createdDateStr = null;
  if (createdAt) {
    const c = new Date(createdAt);
    createdDateStr = [c.getFullYear(), String(c.getMonth() + 1).padStart(2, "0"), String(c.getDate()).padStart(2, "0")].join("-");
  }
  const scheduledDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    const dateStr = [year, String(month + 1).padStart(2, "0"), String(d).padStart(2, "0")].join("-");
    if (createdDateStr && dateStr < createdDateStr) continue;
    const scheduled = !scheduledDays || scheduledDays.length === 0 || scheduledDays.includes(dow);
    if (scheduled) {
      const isFuture = new Date(year, month, d).getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      scheduledDates.push({ dateStr, day: d, checked: checkedSet.has(dateStr), isToday: dateStr === todayStr, isFuture });
    }
  }
  const rows = [];
  for (let i = 0; i < scheduledDates.length; i += 7) rows.push(scheduledDates.slice(i, i + 7));
  const monthName = today.toLocaleString("en-US", { month: "long" });
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[10px] tracking-widest text-white/25 uppercase">{monthName}</span>
        <span className="font-mono text-[10px] text-white/15">{scheduledDates.filter(d => d.checked).length}/{scheduledDates.length} done</span>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((item) => (
              <div key={item.dateStr} title={`${item.dateStr}${item.isToday ? " (today)" : ""}`} className="flex flex-col items-center gap-0.5">
                <span className="font-mono leading-none" style={{ fontSize: 8, color: item.isToday ? accentColor : "rgba(255,255,255,0.2)", fontWeight: item.isToday ? "500" : "300" }}>
                  {item.day}
                </span>
                <div className="w-2.5 h-2.5 rounded-sm" style={{
                  background: item.checked ? accentColor : item.isFuture ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.12)",
                  outline: item.isToday ? `1.5px solid ${accentColor}` : "none",
                  outlineOffset: 1,
                }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shield pips ───────────────────────────────────────────────────────────────

function ShieldPips({ count = 0, max = 3 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Shield key={i} size={10} style={{
          color: i < count ? "#60a5fa" : "rgba(255,255,255,0.15)",
          fill:  i < count ? "rgba(96,165,250,0.2)" : "none",
        }} />
      ))}
    </div>
  );
}

// ── Connected Missions ────────────────────────────────────────────────────────

function ConnectedMissions({ streakId }) {
  const [missions, setMissions] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchConnected() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("milestone_streaks")
          .select(`milestone_id, milestones(id, title, missions(id, title, priority, progress))`)
          .eq("streak_id", streakId);
        if (error) throw error;
        const missionMap = new Map();
        for (const row of data || []) {
          const m = row.milestones?.missions;
          const milestone = row.milestones;
          if (!m || !milestone) continue;
          if (!missionMap.has(m.id)) missionMap.set(m.id, { ...m, milestones: [milestone.title] });
          else missionMap.get(m.id).milestones.push(milestone.title);
        }
        setMissions([...missionMap.values()]);
      } catch { setMissions([]); } finally { setLoading(false); }
    }
    fetchConnected();
  }, [streakId]);
  if (loading) return <div className="flex items-center gap-2 text-white/20 pt-1"><Loader2 size={11} className="animate-spin" /><span className="font-mono text-[10px]">Loading...</span></div>;
  if (!missions || missions.length === 0) return <div className="flex items-center gap-2 pt-1"><Link2 size={11} className="text-white/15" /><span className="font-mono text-[10px] text-white/20 italic">Not linked to any mission</span></div>;
  return (
    <div className="flex flex-col gap-2 pt-1">
      {missions.map((mission) => {
        const color = getPriorityColor(mission.priority);
        const progress = mission.progress ?? 0;
        return (
          <div key={mission.id} className="flex items-center gap-2.5 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-0.5 self-stretch shrink-0" style={{ background: color, minHeight: 36 }} />
            <div className="flex-1 min-w-0 py-2 pr-1">
              <div className="font-mono text-[11px] truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{mission.title}</div>
              <div className="font-mono text-[9px] text-white/25 truncate mt-0.5">{mission.milestones.join(", ")}</div>
            </div>
            <div className="flex flex-col items-end gap-1 pr-2.5 py-2 shrink-0">
              <span className="font-mono text-[10px]" style={{ color }}>{Math.round(progress)}%</span>
              <div className="w-12 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: color }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl border border-white/10 p-6 w-80" style={{ background: "#111" }}>
        <p className="font-mono text-sm text-white/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors cursor-pointer">CANCEL</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg font-mono text-xs tracking-widest transition-all cursor-pointer" style={{ background: "#ef4444", color: "white" }}>DELETE</button>
        </div>
      </div>
    </div>
  );
}

// ── Streak Card (list view) ───────────────────────────────────────────────────

function StreakCard({ streak, onCheckIn, onEdit, onDelete, checkingIn, accentColor }) {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const checkedToday   = streak._checkedToday ?? false;
  const scheduledToday = isScheduledToday(streak.scheduled_days);
  const cardAccent     = scheduledToday ? accentColor : "#6b7280";

  async function handleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && logs === null) {
      setLoadingLogs(true);
      try { const data = await getStreakLogs(streak.id); setLogs(data || []); }
      catch { setLogs([]); } finally { setLoadingLogs(false); }
    }
  }

  return (
    <div className="group relative rounded-2xl border border-white/8 transition-all duration-200 overflow-hidden hover:border-white/20"
      style={{ background: "#111", opacity: scheduledToday ? 1 : 0.5 }}>
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl" style={{ background: cardAccent }} />
      <div className="px-5 py-4 pl-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              onClick={() => scheduledToday && !checkedToday && onCheckIn(streak.id)}
              disabled={!scheduledToday || checkedToday || checkingIn === streak.id}
              className="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition-all"
              style={{ background: checkedToday ? `${cardAccent}22` : "rgba(255,255,255,0.08)", borderColor: checkedToday ? cardAccent : "rgba(255,255,255,0.1)", cursor: (!scheduledToday || checkedToday) ? "default" : "pointer" }}>
              {checkingIn === streak.id ? <Loader2 size={14} className="animate-spin" style={{ color: cardAccent }} />
                : checkedToday ? <CheckCircle2 size={14} style={{ color: cardAccent }} />
                : <Check size={13} style={{ color: scheduledToday ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)" }} />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h3 className="font-mono text-sm text-white">{streak.name}</h3>
                {checkedToday && scheduledToday && (
                  <span className="text-[9px] font-mono tracking-widest border px-1.5 py-0.5 rounded" style={{ color: cardAccent, borderColor: `${cardAccent}40`, background: `${cardAccent}10` }}>DONE</span>
                )}
                {!scheduledToday && (
                  <span className="text-[9px] font-mono tracking-widest border px-1.5 py-0.5 rounded" style={{ color: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>OFF TODAY</span>
                )}
              </div>
              {streak.description && <p className="text-white/30 text-xs font-mono truncate">{streak.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button onClick={(e) => { e.stopPropagation(); onEdit(streak); }} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all cursor-pointer"><Pencil size={12} /></button>
            <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all cursor-pointer"><Trash2 size={12} /></button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center gap-1 text-white/25" style={{ width: 80 }}>
              <Flame size={11} style={{ color: getFlameColor(streak.current_streak ?? 0, accentColor), flexShrink: 0 }} />
              <span className="font-mono text-[10px] truncate">{streak.current_streak ?? 0} day{streak.current_streak !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-1 text-white/25 -ml-2 mr-2" style={{ width: 72 }}>
              <Zap size={10} style={{ flexShrink: 0 }} />
              <span className="font-mono text-[10px] truncate">best {streak.longest_streak ?? 0}</span>
            </div>
            <div className="flex items-center gap-1" style={{ width: 88 }}>
              <CalendarDays size={10} className="text-white/25" style={{ flexShrink: 0 }} />
              <span className="font-mono text-[10px] text-white/25 truncate">
                {streak.scheduled_days && streak.scheduled_days.length > 0 ? formatSchedule(streak.scheduled_days) : "Everyday"}
              </span>
            </div>
            <div style={{ width: 52 }}><ShieldPips count={streak.shields ?? 0} /></div>
          </div>
          <button onClick={handleExpand}
            className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-white/35 transition-colors cursor-pointer"
            onMouseEnter={e => e.currentTarget.style.color = accentColor}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>
            {expanded ? "HIDE" : "HISTORY"} {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
        </div>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/8">
            {loadingLogs ? (
              <div className="flex items-center gap-2 text-white/25"><Loader2 size={12} className="animate-spin" /><span className="font-mono text-[10px]">Loading...</span></div>
            ) : (
              <div className="flex gap-5">
                <div className="shrink-0"><CalendarStrip logs={logs || []} scheduledDays={streak.scheduled_days} createdAt={streak.created_at} accentColor={accentColor} /></div>
                <div className="w-px self-stretch shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1"><Target size={10} className="text-white/25" /><span className="font-mono text-[10px] tracking-widest text-white/25 uppercase">Connected Missions</span></div>
                  <ConnectedMissions streakId={streak.id} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {showConfirm && <ConfirmModal message={`Delete "${streak.name}"?`} onConfirm={() => { setShowConfirm(false); onDelete(streak.id); }} onCancel={() => setShowConfirm(false)} />}
    </div>
  );
}

// ── Kanban Mini Card ──────────────────────────────────────────────────────────

function KanbanStreakCard({ streak, onCheckIn, checkingIn, accentColor, onShowHistory, isColumnToday }) {
  // Only show checked/enabled state in today's column
  const checkedToday = isColumnToday ? (streak._checkedToday ?? false) : false;
  const canCheckIn   = isColumnToday && !checkedToday && checkingIn !== streak.id;
  const cardAccent   = isColumnToday ? accentColor : "#6b7280";

  return (
    <div className="relative rounded-xl border border-white/8 overflow-hidden transition-all hover:border-white/18"
      style={{ background: "#111", opacity: isColumnToday ? 1 : 0.5 }}>
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl" style={{ background: cardAccent }} />
      <div className="pl-3 pr-2.5 py-2">
        {/* Row 1: check + name */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <button
            onClick={() => canCheckIn && onCheckIn(streak.id)}
            disabled={!canCheckIn}
            className="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all"
            style={{
              background: checkedToday ? `${cardAccent}22` : "rgba(255,255,255,0.06)",
              borderColor: checkedToday ? cardAccent : "rgba(255,255,255,0.12)",
              cursor: canCheckIn ? "pointer" : "default",
            }}>
            {checkingIn === streak.id
              ? <Loader2 size={8} className="animate-spin" style={{ color: cardAccent }} />
              : checkedToday
              ? <CheckCircle2 size={8} style={{ color: cardAccent }} />
              : <Check size={7} style={{ color: isColumnToday ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)" }} />}
          </button>
          <span className="font-mono text-[11px] text-white/85 truncate leading-tight flex-1">{streak.name}</span>
        </div>
        {/* Row 2: flame count + shields + history icon */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 flex-1">
            <Flame size={9} style={{ color: getFlameColor(streak.current_streak ?? 0, accentColor), flexShrink: 0 }} />
            <span className="font-mono text-[9px] text-white/35">{streak.current_streak ?? 0}d</span>
          </div>
          <ShieldPips count={streak.shields ?? 0} max={3} />
          <button
            onClick={() => onShowHistory(streak)}
            className="text-white/20 hover:text-white/55 transition-colors cursor-pointer ml-0.5"
            title="View history">
            <ChevronDown size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({ day, streaks, todayDow, onCheckIn, checkingIn, accentColor, onShowHistory }) {
  const isToday = day.value === todayDow;
  return (
    <div className="flex flex-col w-[152px] shrink-0">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-2 rounded-lg"
        style={{
          background: isToday ? `${accentColor}14` : "rgba(255,255,255,0.04)",
          border: isToday ? `1px solid ${accentColor}33` : "1px solid rgba(255,255,255,0.06)",
        }}>
        <span className="font-mono text-[9px] tracking-widest uppercase flex-1"
          style={{ color: isToday ? accentColor : "rgba(255,255,255,0.3)" }}>
          {day.label}
        </span>
        {isToday && (
          <span className="font-mono text-[7px] tracking-widest px-1 py-0.5 rounded"
            style={{ background: `${accentColor}26`, color: accentColor }}>
            TODAY
          </span>
        )}
        <span className="font-mono text-[9px]"
          style={{ color: isToday ? `${accentColor}99` : "rgba(255,255,255,0.2)" }}>
          {streaks.length}
        </span>
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-1.5 flex-1">
        {streaks.length === 0 ? (
          <div className="rounded-lg border border-dashed py-5 text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <span className="font-mono text-[9px] text-white/15">—</span>
          </div>
        ) : streaks.map(streak => (
          <KanbanStreakCard
            key={streak.id}
            streak={streak}
            onCheckIn={onCheckIn}
            checkingIn={checkingIn}
            accentColor={accentColor}
            onShowHistory={onShowHistory}
            isColumnToday={isToday}
          />
        ))}
      </div>
    </div>
  );
}

// ── Kanban Board + History Drawer ─────────────────────────────────────────────

function StreakKanban({ enriched, onCheckIn, checkingIn, accentColor, onEdit }) {
  const todayDow = getTodayDow();
  const [historyStreak, setHistoryStreak] = useState(null);
  const [logs, setLogs] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  async function handleShowHistory(streak) {
    setHistoryStreak(streak);
    setLogs(null);
    setLoadingLogs(true);
    try { const data = await getStreakLogs(streak.id); setLogs(data || []); }
    catch { setLogs([]); } finally { setLoadingLogs(false); }
  }

  function getStreaksForDay(dow) {
    return enriched.filter(s =>
      !s.scheduled_days || s.scheduled_days.length === 0 || s.scheduled_days.includes(dow)
    );
  }

  return (
    <>
      {/* Board */}
      <div className="flex gap-2 justify-center pb-3">
        {DAYS.map(day => (
          <div key={day.value} style={{ scrollSnapAlign: "start" }}>
            <KanbanColumn
              day={day}
              streaks={getStreaksForDay(day.value)}
              todayDow={todayDow}
              onCheckIn={onCheckIn}
              checkingIn={checkingIn}
              accentColor={accentColor}
              onShowHistory={handleShowHistory}
            />
          </div>
        ))}
      </div>

      {/* History modal — centered, shows calendar + connected missions */}
      {historyStreak && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
          onClick={() => setHistoryStreak(null)}>
          <div
            className="w-full max-w-2xl mx-4 rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: "#111" }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <Flame size={12} style={{ color: getFlameColor(historyStreak.current_streak ?? 0, accentColor) }} />
                <span className="font-mono text-sm text-white">{historyStreak.name}</span>
                <span className="font-mono text-[10px] text-white/30">{historyStreak.current_streak ?? 0}d streak</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setHistoryStreak(null); onEdit(historyStreak); }}
                  className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all cursor-pointer">
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => setHistoryStreak(null)}
                  className="text-white/30 hover:text-white/70 transition-colors cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            </div>
            {/* Body: calendar + connected missions side by side */}
            <div className="px-5 py-4">
              {loadingLogs ? (
                <div className="flex items-center gap-2 text-white/25">
                  <Loader2 size={12} className="animate-spin" />
                  <span className="font-mono text-[10px]">Loading...</span>
                </div>
              ) : (
                <div className="flex gap-5">
                  <div className="shrink-0">
                    <CalendarStrip
                      logs={logs || []}
                      scheduledDays={historyStreak.scheduled_days}
                      createdAt={historyStreak.created_at}
                      accentColor={accentColor}
                    />
                  </div>
                  <div className="w-px self-stretch shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target size={10} className="text-white/25" />
                      <span className="font-mono text-[10px] tracking-widest text-white/25 uppercase">Connected Missions</span>
                    </div>
                    <ConnectedMissions streakId={historyStreak.id} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────

function StreakModal({ streak, onClose, onSave, accentColor }) {
  const isEdit = !!streak?.id;
  const [form, setForm] = useState({ name: streak?.name || "", description: streak?.description || "", scheduled_days: streak?.scheduled_days || null });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit() {
    if (!form.name.trim()) return setError("Name is required");
    setSaving(true); setError("");
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null, scheduled_days: form.scheduled_days?.length > 0 ? form.scheduled_days : null };
      if (isEdit) await updateStreak(streak.id, payload);
      else await createStreak(payload);
      onSave();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#111" }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
          <h2 className="font-mono text-sm tracking-widest text-white/80 uppercase">{isEdit ? "Edit Streak" : "New Streak"}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Streak Name</label>
            <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(""); }} placeholder="What habit are you building?"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 font-mono focus:outline-none transition-colors"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
              onFocus={e => e.target.style.borderColor = `${accentColor}80`}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            {error && <p className="font-mono text-[10px] text-red-400 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief context..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 font-mono focus:outline-none transition-colors"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
              onFocus={e => e.target.style.borderColor = `${accentColor}80`}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
          </div>
          <DayPicker value={form.scheduled_days} onChange={(v) => setForm({ ...form, scheduled_days: v })} accentColor={accentColor} />
        </div>
        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors cursor-pointer">CANCEL</button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()}
            className="px-5 py-2 rounded-lg font-mono text-xs tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            style={{ background: form.name.trim() ? accentColor : "#444", color: "#0d0d0d" }}>
            {saving && <Loader2 size={12} className="animate-spin" />}
            {isEdit ? "SAVE CHANGES" : "CREATE STREAK"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View Toggle ───────────────────────────────────────────────────────────────

function ViewToggle({ kanban, onToggle, accentColor }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#111" }}>
      <button onClick={() => onToggle(false)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all cursor-pointer"
        style={{ background: !kanban ? accentColor : "transparent", color: !kanban ? "#0d0d0d" : "rgba(255,255,255,0.3)" }}>
        <List size={11} /> LIST
      </button>
      <button onClick={() => onToggle(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all cursor-pointer"
        style={{ background: kanban ? accentColor : "transparent", color: kanban ? "#0d0d0d" : "rgba(255,255,255,0.3)" }}>
        <LayoutGrid size={11} /> KANBAN
      </button>
    </div>
  );
}

// ── Kanban Header ────────────────────────────────────────────────────────────

// Width = 7 columns × 180px + 6 gaps × 8px = 1308px, matching the board exactly
function KanbanHeader({ totalCount, accentColor, onNew, kanban, onToggle }) {
  return (
    <div className="flex items-center justify-between mb-5 w-full">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Flame size={14} style={{ color: accentColor }} />
          <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">Chalk / Streaks</span>
        </div>
        <h1 className="text-2xl font-mono text-white">
          Streaks <span className="ml-2 text-sm" style={{ color: accentColor }}>{totalCount}</span>
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <ViewToggle kanban={kanban} onToggle={onToggle} accentColor={accentColor} />
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95 cursor-pointer"
          style={{ background: accentColor, color: "#0d0d0d", fontWeight: "500" }}>
          <Plus size={13} /> NEW STREAK
        </button>
      </div>
    </div>
  );
}

// ── Main Streaks Page ─────────────────────────────────────────────────────────

export default function Streaks() {
  const { accentColor, hideOffToday, kanbanMode: globalKanban, bgColor } = useSettings();
  const [localKanban, setLocalKanban] = useState(null);
  const kanban = localKanban !== null ? localKanban : globalKanban;

  const [streaks, setStreaks]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [pageError, setPageError]         = useState("");
  const [checkingIn, setCheckingIn]       = useState(null);
  const [showModal, setShowModal]         = useState(false);
  const [editingStreak, setEditingStreak] = useState(null);
  const [tab, setTab]                     = useState("active");
  const [todayMap, setTodayMap]           = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
      const lastRun = localStorage.getItem("chalk_missed_streaks_date");
      if (lastRun !== today) { await supabase.rpc("handle_missed_streaks"); localStorage.setItem("chalk_missed_streaks_date", today); }
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const lastRecharge = localStorage.getItem("chalk_shield_recharge_month");
      if (lastRecharge !== thisMonth) { await supabase.rpc("recharge_shields"); localStorage.setItem("chalk_shield_recharge_month", thisMonth); }
      const data = await getStreaks();
      setStreaks(data || []);
      const checks = await Promise.all((data || []).map(s =>
        supabase.from("streak_logs").select("id").eq("streak_id", s.id).eq("date", today).maybeSingle().then(({ data: row }) => [s.id, !!row])
      ));
      setTodayMap(Object.fromEntries(checks));
    } catch (e) { setPageError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCheckIn(id) {
    setCheckingIn(id);
    try {
      await checkInStreak(id);
      setTodayMap(prev => ({ ...prev, [id]: true }));
      const fresh = await getStreaks(); setStreaks(fresh || []);
      const missionIds = await getMissionIdsForStreak(id);
      if (missionIds.length > 0) Promise.all(missionIds.map(mid => recalculateMissionProgress(mid))).catch(() => {});
    } catch (e) { setPageError(e.message); } finally { setCheckingIn(null); }
  }

  async function handleDelete(id) {
    try { await deleteStreak(id); await load(); } catch (e) { setPageError(e.message); }
  }

  const enriched       = streaks.map(s => ({ ...s, _checkedToday: !!todayMap[s.id] }));
  const scheduledToday = enriched.filter(s => isScheduledToday(s.scheduled_days));
  const doneCount      = scheduledToday.filter(s => s._checkedToday).length;
  const totalCount     = streaks.length;
  const scheduledCount = scheduledToday.length;

  const filtered = tab === "done"
    ? enriched.filter(s => s._checkedToday)
    : enriched
        .filter(s => !s._checkedToday)
        .filter(s => hideOffToday ? isScheduledToday(s.scheduled_days) : true)
        .sort((a, b) => {
          const aOff = !isScheduledToday(a.scheduled_days);
          const bOff = !isScheduledToday(b.scheduled_days);
          return aOff === bOff ? 0 : aOff ? 1 : -1;
        });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: bgColor }}>
      <p className="font-mono text-white/20 text-xs tracking-widest animate-pulse">LOADING...</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: bgColor, fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { font-family: 'DM Mono', monospace; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        option { background: #111; color: white; }
      `}</style>

      {/* List-mode header — constrained. Kanban header lives inside StreakKanban wrapper */}
      {!kanban && (
        <div className="max-w-2xl mx-auto px-6 pt-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame size={14} style={{ color: accentColor }} />
                <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">Chalk / Streaks</span>
              </div>
              <h1 className="text-2xl font-mono text-white">
                Streaks <span className="ml-2 text-sm" style={{ color: accentColor }}>{totalCount}</span>
              </h1>
            </div>
            <button onClick={() => { setEditingStreak(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ background: accentColor, color: "#0d0d0d", fontWeight: "500" }}>
              <Plus size={13} /> NEW STREAK
            </button>
          </div>
          {totalCount > 0 && (
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#111" }}>
                  <button onClick={() => setTab("active")}
                    className="px-4 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all cursor-pointer"
                    style={{ background: tab === "active" ? accentColor : "transparent", color: tab === "active" ? "#0d0d0d" : "rgba(255,255,255,0.3)" }}>
                    PENDING
                  </button>
                  <button onClick={() => setTab("done")}
                    className="px-4 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all cursor-pointer"
                    style={{ background: tab === "done" ? accentColor : "transparent", color: tab === "done" ? "#0d0d0d" : "rgba(255,255,255,0.3)" }}>
                    DONE TODAY
                  </button>
                </div>
                <ViewToggle kanban={kanban} onToggle={v => setLocalKanban(v === globalKanban ? null : v)} accentColor={accentColor} />
              </div>
              <div className="font-mono text-[10px] tracking-widest text-white/25">{doneCount} / {scheduledCount} CHECKED IN</div>
            </div>
          )}
          {pageError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <AlertTriangle size={13} className="text-red-400 shrink-0" />
              <span className="font-mono text-xs text-red-400 flex-1">{pageError}</span>
              <button onClick={() => setPageError("")} className="text-red-400/60 hover:text-red-400 transition-colors cursor-pointer"><X size={13} /></button>
            </div>
          )}
        </div>
      )}

      {/* Content — kanban uses full width, list stays constrained */}
      {totalCount === 0 ? (
        <div className="max-w-2xl mx-auto px-6 pb-10 text-center py-24">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/8" style={{ background: "#111" }}><Flame size={22} className="text-white/20" /></div>
          <p className="font-mono text-white/30 text-sm mb-1">No streaks yet</p>
          <p className="font-mono text-white/15 text-xs mb-6">Start building daily habits</p>
          <button onClick={() => { setEditingStreak(null); setShowModal(true); }} className="px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest cursor-pointer" style={{ background: accentColor, color: "#0d0d0d" }}>GET STARTED</button>
        </div>
      ) : kanban ? (
        // inline-flex column: the wrapper shrinks to the board width,
        // so KanbanHeader w-full naturally matches the board edges exactly
        <div className="pt-10 pb-10 flex justify-center">
          <div className="flex flex-col" style={{ width: "fit-content" }}>
            <KanbanHeader
              totalCount={totalCount}
              accentColor={accentColor}
              onNew={() => { setEditingStreak(null); setShowModal(true); }}
              kanban={kanban}
              onToggle={v => setLocalKanban(v === globalKanban ? null : v)}
            />
            <StreakKanban
              enriched={enriched}
              onCheckIn={handleCheckIn}
              checkingIn={checkingIn}
              accentColor={accentColor}
              onEdit={s => { setEditingStreak(s); setShowModal(true); }}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-6 pb-10">
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-mono text-white/20 text-xs tracking-widest mb-2">{tab === "done" ? "NOTHING CHECKED IN YET TODAY" : "ALL DONE FOR TODAY!"}</p>
              <p className="font-mono text-white/40 text-sm">{tab === "done" ? '"Small steps, every day."' : '"Give yourself some credit!"' }</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(streak => (
                <StreakCard key={streak.id} streak={streak} onCheckIn={handleCheckIn} onEdit={s => { setEditingStreak(s); setShowModal(true); }} onDelete={handleDelete} checkingIn={checkingIn} accentColor={accentColor} />
              ))}
            </div>
          )}
          {totalCount > 0 && (
            <div className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl border border-blue-400/15 bg-blue-400/5">
              <Shield size={13} className="text-blue-400 shrink-0" />
              <span className="font-mono text-[10px] text-white/30 tracking-wide">Shields only deduct on missed scheduled days.</span>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <StreakModal streak={editingStreak} onClose={() => { setShowModal(false); setEditingStreak(null); }} onSave={() => { setShowModal(false); setEditingStreak(null); load(); }} accentColor={accentColor} />
      )}
    </div>
  );
}