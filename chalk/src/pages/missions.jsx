import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Map, ChevronRight, ChevronDown, GripVertical, Flame,
  Calendar, X, Milestone, ArrowLeft, Pencil, Trash2, Search,
  Check, Link2, Loader2 as Loader, LayoutGrid, List,
} from "lucide-react";
import {
  getMissions, createMission, updateMission, deleteMission,
  updateMissionPriorities, toggleMilestone as toggleMilestone_db,
  connectStreakToMilestone, disconnectStreakFromMilestone,
  recalculateMissionProgress,
} from "../lib/missions";
import { getStreaks, createStreak } from "../lib/streaks";
import { useSettings } from "../context/SettingsContext.jsx";

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_COLUMNS = [
  { value: 1, label: "High",   color: "#f97316" },
  { value: 2, label: "Medium", color: "#eab308" },
  { value: 3, label: "Low",    color: "#6b7280" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function ProgressBar({ value, size = "md", accentColor }) {
  const h = size === "sm" ? "h-1" : "h-1.5";
  return (
    <div className={`w-full bg-white/10 rounded-full ${h} overflow-hidden`}>
      <div className={`${h} rounded-full transition-all duration-700`}
        style={{ width: `${value}%`, background: accentColor, boxShadow: value > 0 ? `0 0 8px ${accentColor}66` : "none" }} />
    </div>
  );
}

function PriorityBadge({ priority, accentColor }) {
  const col = PRIORITY_COLUMNS.find(c => c.value === priority);
  if (!col) return null;
  const color = priority === 1 ? accentColor : col.color;
  return (
    <span className="text-[9px] font-mono tracking-widest border px-1.5 py-0.5 rounded"
      style={{ color, borderColor: `${color}66`, background: `${color}1a` }}>
      {col.label.toUpperCase()}
    </span>
  );
}

// ── Streak Dropdown ───────────────────────────────────────────────────────────

function StreakDropdown({ streaks: initialStreaks, selected = [], onChange, placeholder = "Connect streaks...", onStreakCreated, accentColor }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [streaks, setStreaks] = useState(initialStreaks);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const ref = useRef(null);

  useEffect(() => { setStreaks(initialStreaks); }, [initialStreaks]);
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setAddingNew(false); setNewName(""); setNewDesc(""); setSaveError(""); }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = streaks.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
  const toggle = id => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const selectedStreaks = streaks.filter(s => selected.includes(s.id));

  async function handleCreateStreak() {
    if (!newName.trim()) return;
    if (streaks.some(s => s.name.toLowerCase() === newName.trim().toLowerCase())) { setSaveError("A streak with this name already exists"); return; }
    setSaving(true); setSaveError("");
    try {
      const created = await createStreak({ name: newName.trim(), description: newDesc.trim() });
      setStreaks(prev => [...prev, created]); onChange([...selected, created.id]); onStreakCreated?.(created);
      setNewName(""); setNewDesc(""); setAddingNew(false); setQuery("");
    } catch (e) { setSaveError(e.message); } finally { setSaving(false); }
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-mono focus:outline-none transition-colors hover:border-white/20">
        <span className="text-white/40 text-xs truncate">{selectedStreaks.length === 0 ? placeholder : selectedStreaks.map(s => s.name).join(", ")}</span>
        <ChevronDown size={13} className={`text-white/30 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/10 overflow-hidden shadow-2xl" style={{ background: "#1a1a1a" }}>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
            <Search size={12} className="text-white/30 shrink-0" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search streaks..." className="flex-1 bg-transparent text-xs text-white placeholder-white/25 font-mono focus:outline-none" />
            {query && <button onClick={() => setQuery("")} className="text-white/25 hover:text-white/50"><X size={11} /></button>}
          </div>
          <div className="max-h-40 overflow-y-auto py-1">
            {filtered.length === 0 && !addingNew ? (
              <p className="px-4 py-3 font-mono text-[10px] text-white/25 text-center">{query ? `No results for "${query}"` : "No streaks yet"}</p>
            ) : filtered.map(s => {
              const checked = selected.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggle(s.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left cursor-pointer">
                  <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all" style={{ background: checked ? accentColor : "transparent", borderColor: checked ? accentColor : "rgba(255,255,255,0.2)" }}>
                    {checked && <Check size={10} style={{ color: "#0d0d0d" }} strokeWidth={3} />}
                  </div>
                  <Flame size={10} className="text-amber-400 shrink-0" />
                  <span className="font-mono text-xs text-white/70 truncate flex-1">{s.name}</span>
                  {s.current_streak > 0 && <span className="font-mono text-[9px] text-white/25 shrink-0">{s.current_streak}d</span>}
                </button>
              );
            })}
          </div>
          {addingNew && (
            <div className="px-3 py-3 border-t border-white/8 space-y-2">
              <input autoFocus value={newName} onChange={e => { setNewName(e.target.value); setSaveError(""); }} onKeyDown={e => { if (e.key === "Enter") handleCreateStreak(); if (e.key === "Escape") setAddingNew(false); }} placeholder="Streak name" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 font-mono focus:outline-none transition-colors" />
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleCreateStreak(); if (e.key === "Escape") setAddingNew(false); }} placeholder="Description (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 font-mono focus:outline-none transition-colors" />
              {saveError && <p className="font-mono text-[10px] text-red-400">{saveError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setAddingNew(false); setNewName(""); setNewDesc(""); setSaveError(""); }} className="flex-1 px-3 py-1.5 rounded-lg border border-white/10 font-mono text-[10px] tracking-widest text-white/40 hover:text-white/60 transition-colors cursor-pointer">CANCEL</button>
                <button type="button" onClick={handleCreateStreak} disabled={saving || !newName.trim()} className="flex-2 px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer" style={{ background: accentColor, color: "#0d0d0d", flex: 2 }}>
                  {saving ? <Loader size={10} className="animate-spin" /> : <Check size={10} strokeWidth={3} />}
                  CREATE & SELECT
                </button>
              </div>
            </div>
          )}
          <div className="px-4 py-2 border-t border-white/8 flex items-center justify-between">
            <span className="font-mono text-[10px] text-white/25">{selected.length > 0 ? `${selected.length} selected` : ""}</span>
            <div className="flex items-center gap-3">
              {selected.length > 0 && <button onClick={() => onChange([])} className="font-mono text-[10px] text-white/30 hover:text-red-400 transition-colors">Clear</button>}
              {!addingNew && (
                <button type="button" onClick={() => { setAddingNew(true); setQuery(""); }} className="flex items-center gap-1 font-mono text-[10px] tracking-widest transition-colors" style={{ color: `${accentColor}B3` }} onMouseEnter={e => e.currentTarget.style.color = accentColor} onMouseLeave={e => e.currentTarget.style.color = `${accentColor}B3`}>
                  <Plus size={10} /> NEW STREAK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mission Modal ─────────────────────────────────────────────────────────────

function MissionModal({ mission, onClose, onSave, streaks, missions, onStreakCreated, accentColor }) {
  const isEdit = !!mission?.id;
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(() => {
    if (!mission) return { title: "", description: "", priority: 3, timeline: "", milestones: [], progress: 0 };
    return { ...mission, milestones: (mission.milestones || []).map(m => ({ ...m, connectedStreaks: m.milestone_streaks?.map(ms => ms.streak_id).filter(Boolean) || [] })) };
  });
  const [dateError, setDateError] = useState("");
  const [titleError, setTitleError] = useState("");

  const hasAtLeastOneMilestone = form.milestones.length >= 1;
  const hasAtLeastOneTitledMilestone = form.milestones.some(m => m.title.trim().length > 0);
  const milestoneError = !hasAtLeastOneMilestone ? "Add at least 1 milestone to create a mission" : !hasAtLeastOneTitledMilestone ? "At least one milestone needs a title" : "";
  const canSubmit = form.title.trim() && form.timeline && !titleError && !dateError && hasAtLeastOneMilestone && hasAtLeastOneTitledMilestone;

  const addMilestone = () => setForm(f => ({ ...f, milestones: [...f.milestones, { id: `ml_${Date.now()}`, title: "", completed: false, connectedStreaks: [] }] }));
  const updateMilestoneTitle = (idx, val) => setForm(f => { const ms = [...f.milestones]; ms[idx] = { ...ms[idx], title: val }; return { ...f, milestones: ms }; });
  const updateMilestoneStreaks = (idx, ids) => setForm(f => { const ms = [...f.milestones]; ms[idx] = { ...ms[idx], connectedStreaks: ids }; return { ...f, milestones: ms }; });
  const removeMilestone = idx => setForm(f => ({ ...f, milestones: f.milestones.filter((_, i) => i !== idx) }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#111" }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
          <h2 className="font-mono text-sm tracking-widest text-white/80 uppercase">{isEdit ? "Edit Mission" : "New Mission"}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Mission Title</label>
            <input value={form.title} onChange={e => { const val = e.target.value; setForm({ ...form, title: val }); setTitleError(missions.some(m => m.title.toLowerCase() === val.toLowerCase() && m.id !== mission?.id) ? "A mission with this title already exists" : ""); }} placeholder="What are you pursuing?"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 font-mono focus:outline-none transition-colors"
              onFocus={e => e.target.style.borderColor = `${accentColor}80`} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            {titleError && <p className="font-mono text-[10px] text-red-400 mt-1">{titleError}</p>}
          </div>
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Brief context..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 font-mono focus:outline-none transition-colors resize-none"
              onFocus={e => e.target.style.borderColor = `${accentColor}80`} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none transition-colors cursor-pointer">
                <option value={1}>High</option><option value={2}>Medium</option><option value={3}>Low</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Target Date</label>
              <input type="date" value={form.timeline} onChange={e => { const val = e.target.value; const today = new Date().toISOString().split("T")[0]; setForm({ ...form, timeline: val }); setDateError(val && val < today ? "Target date can't be in the past" : ""); }} min={new Date().toISOString().split("T")[0]}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none transition-colors cursor-pointer" />
              {dateError && <p className="font-mono text-[10px] text-red-400 mt-1">{dateError}</p>}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="font-mono text-[10px] tracking-widest text-white/40 uppercase">Milestones</label>
                {submitted && !hasAtLeastOneMilestone && <span className="font-mono text-[9px] text-red-400/70 tracking-widest">REQUIRED</span>}
              </div>
              <button onClick={addMilestone} className="font-mono text-[10px] tracking-widest transition-colors flex items-center gap-1 cursor-pointer" style={{ color: `${accentColor}B3` }} onMouseEnter={e => e.currentTarget.style.color = accentColor} onMouseLeave={e => e.currentTarget.style.color = `${accentColor}B3`}>
                <Plus size={10} /> ADD
              </button>
            </div>
            {submitted && milestoneError && form.milestones.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-red-400/20 bg-red-400/5 mb-3"><span className="font-mono text-[10px] text-red-400/80">{milestoneError}</span></div>
            )}
            <div className="space-y-3">
              {form.milestones.map((ms, idx) => (
                <div key={ms.id} className="rounded-xl border border-white/8 p-3 space-y-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center gap-2">
                    <Milestone size={12} className="text-white/20 shrink-0" />
                    <input value={ms.title} onChange={e => updateMilestoneTitle(idx, e.target.value)} placeholder={`Milestone ${idx + 1}`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 font-mono focus:outline-none transition-colors"
                      onFocus={e => e.target.style.borderColor = `${accentColor}66`} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                    <button onClick={() => removeMilestone(idx)} className="text-white/20 hover:text-red-400 transition-colors shrink-0 cursor-pointer"><X size={12} /></button>
                  </div>
                  {streaks.length > 0 && (
                    <div className="pl-5">
                      <label className="block font-mono text-[9px] tracking-widest text-white/25 uppercase mb-1.5">Connect Streaks (Optional)</label>
                      <StreakDropdown streaks={streaks} selected={ms.connectedStreaks || []} onChange={ids => updateMilestoneStreaks(idx, ids)} placeholder="Link streaks to this milestone..." onStreakCreated={onStreakCreated} accentColor={accentColor} />
                    </div>
                  )}
                </div>
              ))}
              {form.milestones.length === 0 && (
                <button onClick={addMilestone} className={`w-full py-4 rounded-xl border border-dashed transition-all flex items-center justify-center gap-2 cursor-pointer ${submitted && !hasAtLeastOneMilestone ? "border-red-400/30 bg-red-400/5 text-red-400/50" : ""}`}
                  style={submitted && !hasAtLeastOneMilestone ? {} : { borderColor: `${accentColor}4D`, backgroundColor: `${accentColor}0D`, color: `${accentColor}99` }}>
                  <Plus size={12} /><span className="font-mono text-[10px] tracking-widest">ADD FIRST MILESTONE</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors cursor-pointer">CANCEL</button>
          <button onClick={() => { setSubmitted(true); if (canSubmit) onSave(form); }} className="px-5 py-2 rounded-lg font-mono text-xs tracking-widest transition-all cursor-pointer"
            style={{ background: canSubmit ? accentColor : submitted ? "rgba(239,68,68,0.15)" : "#444", color: canSubmit ? "#0d0d0d" : submitted ? "#ef4444" : "rgba(255,255,255,0.3)", border: submitted && !canSubmit ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent" }}>
            {isEdit ? "SAVE CHANGES" : "CREATE MISSION"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Roadmap View ──────────────────────────────────────────────────────────────

function RoadmapView({ mission, onBack, onUpdate, allStreaks, accentColor }) {
  const [milestones, setMilestones] = useState(mission.milestones || []);
  const [connectingIdx, setConnectingIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recalculating, setRecalculating] = useState(false);

  const toggleMilestone = async (mlIdx) => {
    const ml = milestones[mlIdx];
    const updated = milestones.map((m, i) => i !== mlIdx ? m : { ...m, completed: !m.completed });
    setMilestones(updated);
    try {
      await toggleMilestone_db(ml.id, !ml.completed);
      setRecalculating(true);
      const newProgress = await recalculateMissionProgress(mission.id);
      setRecalculating(false);
      onUpdate({ ...mission, milestones: updated, progress: newProgress });
    } catch (err) { console.error(err); setRecalculating(false); setMilestones(milestones); }
  };

  const totalMilestones = milestones.length;
  const doneMilestones = milestones.filter(m => m.completed).length;
  const displayProgress = recalculating ? (doneMilestones === totalMilestones && totalMilestones > 0 ? 100 : mission.progress) : mission.progress;
  const getMilestoneStreaks = ml => ml.milestone_streaks?.map(ms => ms.streaks).filter(Boolean) || [];
  const getConnectedIds = ml => ml.milestone_streaks?.map(ms => ms.streaks?.id).filter(Boolean) || [];

  const handleStreakToggle = async (mlIdx, streakId) => {
    const ml = milestones[mlIdx];
    const connectedIds = getConnectedIds(ml);
    const isConnected = connectedIds.includes(streakId);
    const updatedMilestones = milestones.map((m, i) => {
      if (i !== mlIdx) return m;
      const currentLinks = m.milestone_streaks || [];
      return { ...m, milestone_streaks: isConnected ? currentLinks.filter(ms => ms.streaks?.id !== streakId) : [...currentLinks, { streaks: allStreaks.find(s => s.id === streakId) }] };
    });
    setMilestones(updatedMilestones);
    try {
      if (isConnected) await disconnectStreakFromMilestone(ml.id, streakId);
      else await connectStreakToMilestone(ml.id, streakId);
      const newProgress = await recalculateMissionProgress(mission.id);
      onUpdate({ ...mission, milestones: updatedMilestones, progress: newProgress });
    } catch (err) { console.error(err); setMilestones(milestones); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white/70 font-mono text-xs tracking-widest transition-colors"><ArrowLeft size={14} /> MISSIONS</button>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-white/70 tracking-widest truncate">{mission.title.toUpperCase()}</span>
      </div>
      <div className="rounded-2xl p-6 mb-6 border border-white/8" style={{ background: "#111" }}>
        <div className="flex items-start justify-between mb-3">
          <div><h2 className="text-xl font-mono text-white mb-1">{mission.title}</h2><p className="text-white/40 text-sm">{mission.description}</p></div>
          <PriorityBadge priority={mission.priority} accentColor={accentColor} />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1"><ProgressBar value={displayProgress} accentColor={accentColor} /></div>
          <span className="font-mono text-xs tabular-nums flex items-center gap-1.5" style={{ color: accentColor }}>
            {recalculating && <Loader size={10} className="animate-spin opacity-60" />}{displayProgress}%
          </span>
          <div className="flex items-center gap-1 text-white/30">
            <Calendar size={12} />
            <span className="font-mono text-xs">{mission.timeline ? new Date(mission.timeline).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "No date"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/6">
          <span className="font-mono text-[9px] tracking-widest text-white/35 uppercase">Progress formula:</span>
          <span className="font-mono text-[9px] text-white/50">80% time-based</span>
          <span className="text-white/50 text-[9px]">+</span>
          <span className="font-mono text-[9px] text-white/50">20% streak consistency</span>
          <span className="font-mono text-[9px] tracking-widest text-white/35 uppercase">OR:</span>
          <span className="font-mono text-[9px] text-white/50">Complete milestones</span>
          {doneMilestones > 0 && doneMilestones < totalMilestones && <><span className="text-white/10 text-[9px]">·</span><span className="font-mono text-[9px]" style={{ color: `${accentColor}80` }}>{doneMilestones}/{totalMilestones} done</span></>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          <div className="absolute left-3.5 top-0 bottom-0 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="space-y-6 pl-10">
            {milestones.length === 0 && <p className="text-white/20 font-mono text-xs">No milestones yet</p>}
            {milestones.map((ml, mlIdx) => {
              const connectedStreaks = getMilestoneStreaks(ml);
              const connectedIds = getConnectedIds(ml);
              const isDone = ml.completed;
              const isOpen = connectingIdx === mlIdx;
              const filtered = allStreaks.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
              return (
                <div key={ml.id} className="relative">
                  <div className="absolute -left-8 top-1 w-3 h-3 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all"
                    style={{ borderColor: isDone ? accentColor : "rgba(255,255,255,0.2)", background: isDone ? `${accentColor}33` : "#0d0d0d" }}
                    onClick={() => toggleMilestone(mlIdx)}>
                    {isDone && <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm tracking-wide" style={{ color: isDone ? accentColor : "rgba(255,255,255,0.7)" }}>{ml.title || `Milestone ${mlIdx + 1}`}</span>
                      {isDone && <span className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 rounded" style={{ color: `${accentColor}99`, border: `1px solid ${accentColor}4D` }}>DONE</span>}
                      {allStreaks.length > 0 && (
                        <button onClick={() => { setConnectingIdx(isOpen ? null : mlIdx); setSearchQuery(""); }}
                          className="ml-auto flex items-center gap-1 font-mono text-[9px] tracking-widest transition-colors px-2 py-1 rounded-lg border cursor-pointer"
                          style={isOpen ? { borderColor: `${accentColor}66`, color: accentColor, backgroundColor: `${accentColor}1A` } : { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                          <Link2 size={9} />{isOpen ? "DONE" : "CONNECT"}
                        </button>
                      )}
                    </div>
                    {isOpen && (
                      <div className="mb-3 rounded-xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
                          <Search size={11} className="text-white/30 shrink-0" />
                          <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search streaks..." className="flex-1 bg-transparent text-xs text-white placeholder-white/25 font-mono focus:outline-none" />
                          {searchQuery && <button onClick={() => setSearchQuery("")} className="text-white/25 hover:text-white/50"><X size={11} /></button>}
                        </div>
                        <div className="max-h-40 overflow-y-auto py-1">
                          {filtered.length === 0 ? <p className="px-4 py-3 font-mono text-[10px] text-white/25 text-center">No streaks found</p>
                            : filtered.map(s => {
                              const checked = connectedIds.includes(s.id);
                              return (
                                <button key={s.id} type="button" onClick={() => handleStreakToggle(mlIdx, s.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left cursor-pointer">
                                  <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all" style={{ background: checked ? accentColor : "transparent", borderColor: checked ? accentColor : "rgba(255,255,255,0.2)" }}>
                                    {checked && <Check size={10} style={{ color: "#0d0d0d" }} strokeWidth={3} />}
                                  </div>
                                  <Flame size={10} className="text-amber-400 shrink-0" />
                                  <span className="font-mono text-xs text-white/70 flex-1 truncate">{s.name}</span>
                                  {s.current_streak > 0 && <span className="font-mono text-[9px] text-white/25">{s.current_streak}d</span>}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                    {connectedStreaks.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {connectedStreaks.map(s => (
                          <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/20 bg-amber-400/5">
                            <Flame size={10} className="text-amber-400" />
                            <span className="font-mono text-[10px] text-amber-400/70">{s.name}</span>
                            <span className="font-mono text-[9px] text-white/25">{s.current_streak}d</span>
                          </div>
                        ))}
                      </div>
                    ) : (!isOpen && <p className="text-white/20 font-mono text-[10px] mt-1">No streaks connected</p>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mission Card ──────────────────────────────────────────────────────────────

function MissionCard({ mission, index, onSelect, onEdit, onDelete, dragging, onDragStart, onDragEnd, onDragOver, accentColor, compact = false }) {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div draggable onDragStart={() => onDragStart(index)} onDragEnd={onDragEnd} onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${dragging ? "opacity-40 scale-95" : "opacity-100 hover:border-white/20"}`}
      style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}>
      <div className={compact ? "px-4 py-3" : "px-5 py-4 pl-6"}>
        {!compact && <GripVertical size={14} className="text-white/15 group-hover:text-white/30 shrink-0 mt-0.5 transition-colors cursor-grab absolute left-2 top-5" />}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h3 className="font-mono text-sm text-white truncate">{mission.title}</h3>
              {compact && <PriorityBadge priority={mission.priority} accentColor={accentColor} />}
            </div>
            <p className="text-white/30 text-xs font-mono truncate">{mission.description}</p>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button onClick={e => { e.stopPropagation(); onEdit(mission); }} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all"><Pencil size={12} /></button>
            <button onClick={e => { e.stopPropagation(); setShowConfirm(true); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1"><ProgressBar value={mission.progress} size="sm" accentColor={accentColor} /></div>
          <span className="font-mono text-xs text-white/40 tabular-nums w-8 text-right">{mission.progress}%</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white/25">
            <div className="flex items-center gap-1.5"><Milestone size={11} className="shrink-0" /><span className="font-mono text-[10px]">{mission.milestones.length} {mission.milestones.length === 1 ? "milestone" : "milestones"}</span></div>
            {mission.timeline && <div className="flex items-center gap-1.5"><Calendar size={10} className="shrink-0" /><span className="font-mono text-[10px]">{new Date(mission.timeline).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span></div>}
          </div>
          <button onClick={e => { e.stopPropagation(); onSelect(mission); }} className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-white/35 transition-colors"
            onMouseEnter={e => e.currentTarget.style.color = accentColor} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>
            ROADMAP <ChevronRight size={10} />
          </button>
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl border border-white/10 p-6 w-80" style={{ background: "#111" }}>
            <p className="font-mono text-sm text-white/70 mb-6">Delete "{mission.title}"?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors cursor-pointer">CANCEL</button>
              <button onClick={() => { setShowConfirm(false); onDelete(mission.id); }} className="px-4 py-2 rounded-lg font-mono text-xs tracking-widest cursor-pointer" style={{ background: "#ef4444", color: "white" }}>DELETE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Kanban View ───────────────────────────────────────────────────────────────

function KanbanColumn({ col, missions, onSelect, onEdit, onDelete, onDragStart, onDragEnd, accentColor }) {
  const color = col.value === 1 ? accentColor : col.color;
  return (
    <div className="flex flex-col min-w-[260px] max-w-[320px] flex-1">
      <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl" style={{ background: `${color}14`, border: `1px solid ${color}33` }}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="font-mono text-[10px] tracking-widest uppercase flex-1" style={{ color }}>{col.label}</span>
        <span className="font-mono text-[10px]" style={{ color: `${color}99` }}>{missions.length}</span>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {missions.length === 0 ? (
          <div className="rounded-xl border border-dashed px-3 py-6 text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="font-mono text-[10px] text-white/15">No missions</p>
          </div>
        ) : missions.map((mission, idx) => (
          <MissionCard key={mission.id} mission={mission} index={idx} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete}
            dragging={false} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={() => {}}
            accentColor={accentColor} compact />
        ))}
      </div>
    </div>
  );
}

function MissionKanban({ missions, onSelect, onEdit, onDelete, accentColor }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollSnapType: "x mandatory" }}>
      {PRIORITY_COLUMNS.map(col => (
        <div key={col.value} style={{ scrollSnapAlign: "start" }}>
          <KanbanColumn col={col} missions={missions.filter(m => m.priority === col.value && m.progress < 100)}
            onSelect={onSelect} onEdit={onEdit} onDelete={onDelete}
            onDragStart={() => {}} onDragEnd={() => {}}
            accentColor={accentColor} />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Missions() {
  const { accentColor, kanbanMode: globalKanban } = useSettings();
  const [localKanban, setLocalKanban] = useState(null);
  const kanban = localKanban !== null ? localKanban : globalKanban;

  const [missions, setMissions] = useState([]);
  const [streaks, setStreaks]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);
  const [modalOpen, setModalOpen]             = useState(false);
  const [editingMission, setEditingMission]   = useState(null);
  const [dragIdx, setDragIdx]                 = useState(null);
  const [tab, setTab]                         = useState("active");

  const handleDragOver = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const reordered = [...missions];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setMissions(reordered.map((m, i) => ({ ...m, priority: i + 1 })));
    setDragIdx(targetIdx);
  };

  const handleDragEnd = async () => {
    setDragIdx(null);
    try { await updateMissionPriorities(missions); } catch (err) { console.error(err); }
  };

  const handleSave = async (form) => {
    try {
      if (editingMission) {
        await updateMission(editingMission.id, form);
        for (const milestone of form.milestones) {
          if (!milestone.id || milestone.id.startsWith("ml_")) continue;
          const newIds = milestone.connectedStreaks || [];
          const oldIds = editingMission.milestones.find(m => m.id === milestone.id)?.milestone_streaks?.map(ms => ms.streak_id) || [];
          const toAdd = newIds.filter(id => !oldIds.includes(id));
          const toRemove = oldIds.filter(id => !newIds.includes(id));
          await Promise.all([...toAdd.map(sid => connectStreakToMilestone(milestone.id, sid)), ...toRemove.map(sid => disconnectStreakFromMilestone(milestone.id, sid))]);
        }
        await recalculateMissionProgress(editingMission.id);
      } else {
        await createMission(form);
      }
      const fresh = await getMissions();
      setMissions(fresh);
    } catch (err) { console.error("Save failed:", err); }
    setModalOpen(false); setEditingMission(null);
  };

  const handleDelete = async (id) => {
    try { await deleteMission(id); setMissions(ms => ms.filter(m => m.id !== id)); } catch (err) { console.error(err); }
  };

  const handleRoadmapUpdate = async (updated) => {
    try {
      const fresh = await getMissions(); setMissions(fresh);
      const refreshed = fresh.find(m => m.id === updated.id);
      if (refreshed) setSelectedMission(refreshed);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    async function load() {
      try {
        const [missionsData, streaksData] = await Promise.all([getMissions(), getStreaks()]);
        setMissions(missionsData); setStreaks(streaksData);
      } catch (err) { console.error("Failed to load:", err); } finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0d0d" }}>
      <p className="font-mono text-white/20 text-xs tracking-widest animate-pulse">LOADING...</p>
    </div>
  );

  const activeMissions = missions.filter(m => m.progress < 100);
  const doneMissions   = missions.filter(m => m.progress === 100);

  return (
    <div className="min-h-screen" style={{ background: "#0d0d0d", fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { font-family: 'DM Mono', monospace; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
        option { background: #111; color: white; }
      `}</style>

      <div className={kanban ? "px-6 py-10" : "max-w-2xl mx-auto px-6 py-10"}>
        {selectedMission ? (
          <RoadmapView mission={selectedMission} onBack={() => setSelectedMission(null)} onUpdate={handleRoadmapUpdate} allStreaks={streaks} accentColor={accentColor} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Map size={14} style={{ color: accentColor }} />
                  <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">Chalk / Missions</span>
                </div>
                <h1 className="text-2xl font-mono text-white">Missions <span className="ml-2 text-sm" style={{ color: accentColor }}>{missions.length}</span></h1>
              </div>
              <button onClick={() => { setEditingMission(null); setModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                style={{ background: accentColor, color: "#0d0d0d", fontWeight: "500" }}>
                <Plus size={13} /> NEW MISSION
              </button>
            </div>

            {missions.length > 0 && (
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {!kanban && (
                    <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#111" }}>
                      <button onClick={() => setTab("active")} className="px-4 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all cursor-pointer"
                        style={{ background: tab === "active" ? accentColor : "transparent", color: tab === "active" ? "#0d0d0d" : "rgba(255,255,255,0.3)" }}>IN PROGRESS</button>
                      <button onClick={() => setTab("done")} className="px-4 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all cursor-pointer"
                        style={{ background: tab === "done" ? accentColor : "transparent", color: tab === "done" ? "#0d0d0d" : "rgba(255,255,255,0.3)" }}>FINISHED</button>
                    </div>
                  )}
                </div>
                {!kanban && (
                  <div className="flex items-center gap-2 text-white/25 font-mono text-[10px] tracking-widest">
                    <GripVertical size={11} /><span>DRAG TO REPRIORITIZE</span>
                  </div>
                )}
              </div>
            )}

            {missions.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/8" style={{ background: "#111" }}><Map size={22} className="text-white/20" /></div>
                <p className="font-mono text-white/30 text-sm mb-1">No missions yet</p>
                <p className="font-mono text-white/15 text-xs mb-6">Define what you're pursuing</p>
                <button onClick={() => { setEditingMission(null); setModalOpen(true); }} className="px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest cursor-pointer" style={{ background: accentColor, color: "#0d0d0d" }}>GET STARTED</button>
              </div>
            ) : kanban ? (
              // ── Kanban: columns by priority ──
              <MissionKanban missions={activeMissions} onSelect={setSelectedMission} onEdit={m => { setEditingMission(m); setModalOpen(true); }} onDelete={handleDelete} accentColor={accentColor} />
            ) : (
              <>
                {(tab === "active" ? activeMissions : doneMissions).length === 0 ? (
                  <div className="text-center py-24">
                    <p className="font-mono text-white/20 text-xs tracking-widest mb-2">{tab === "done" ? "NO FINISHED MISSIONS YET" : "ALL MISSIONS COMPLETE!"}</p>
                    <p className="font-mono text-white/40 text-sm">{tab === "done" ? '"Everything takes time. Keep going."' : '"Outstanding work."'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(tab === "active" ? activeMissions : doneMissions).map((mission, idx) => (
                      <MissionCard key={mission.id} mission={mission} index={idx} onSelect={setSelectedMission}
                        onEdit={m => { setEditingMission(m); setModalOpen(true); }} onDelete={handleDelete}
                        dragging={dragIdx === idx} onDragStart={setDragIdx} onDragEnd={handleDragEnd} onDragOver={handleDragOver}
                        accentColor={accentColor} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <MissionModal mission={editingMission} streaks={streaks} missions={missions}
          onClose={() => { setModalOpen(false); setEditingMission(null); }}
          onSave={handleSave}
          onStreakCreated={newStreak => setStreaks(prev => [...prev, newStreak])}
          accentColor={accentColor} />
      )}
    </div>
  );
}