import { useState, useRef, useEffect } from "react";
import {
  Plus, Target, ChevronRight, ChevronDown, GripVertical, Flame,
  Calendar, X, Milestone, ArrowLeft, Pencil, Trash2, Search, Check, Link2,
} from "lucide-react";
import {
  getMissions, createMission, updateMission, deleteMission,
  updateMissionPriorities, toggleMilestone as toggleMilestone_db,
  connectStreakToMilestone, disconnectStreakFromMilestone,
} from "../lib/missions";
import { getStreaks } from "../lib/streaks";

// ── Helpers ───────────────────────────────────────────────────────────────────

function ProgressBar({ value, size = "md" }) {
  const h = size === "sm" ? "h-1" : "h-1.5";
  return (
    <div className={`w-full bg-white/10 rounded-full ${h} overflow-hidden`}>
      <div
        className={`${h} rounded-full transition-all duration-700`}
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, #c8f04c, #a8d630)`,
          boxShadow: value > 0 ? "0 0 8px rgba(200,240,76,0.4)" : "none",
        }}
      />
    </div>
  );
}

function PriorityBadge({ priority }) {
  const labels = ["", "HIGH", "MED", "LOW"];
  const colors = [
    "",
    "text-[#c8f04c] border-[#c8f04c]/40 bg-[#c8f04c]/10",
    "text-amber-400 border-amber-400/40 bg-amber-400/10",
    "text-zinc-400 border-zinc-400/40 bg-zinc-400/10",
  ];
  return (
    <span className={`text-[9px] font-mono tracking-widest border px-1.5 py-0.5 rounded ${colors[priority] || colors[3]}`}>
      {labels[priority] || "—"}
    </span>
  );
}

// ── Streak Dropdown (searchable checkboxes) ───────────────────────────────────

function StreakDropdown({ streaks, selected = [], onChange, placeholder = "Connect streaks..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = streaks.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const selectedStreaks = streaks.filter((s) => selected.includes(s.id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 font-mono focus:outline-none focus:border-[#c8f04c]/50 transition-colors hover:border-white/20"
      >
        <span className="text-white/40 text-xs truncate">
          {selectedStreaks.length === 0 ? placeholder : selectedStreaks.map((s) => s.name).join(", ")}
        </span>
        <ChevronDown size={13} className={`text-white/30 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/10 overflow-hidden shadow-2xl" style={{ background: "#1a1a1a" }}>
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
            <Search size={12} className="text-white/30 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search streaks..."
              className="flex-1 bg-transparent text-xs text-white placeholder-white/25 font-mono focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-white/25 hover:text-white/50">
                <X size={11} />
              </button>
            )}
          </div>

          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 font-mono text-[10px] text-white/25 text-center">No streaks found</p>
            ) : (
              filtered.map((s) => {
                const checked = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                  >
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: checked ? "#c8f04c" : "transparent",
                        borderColor: checked ? "#c8f04c" : "rgba(255,255,255,0.2)",
                      }}
                    >
                      {checked && <Check size={10} style={{ color: "#0d0d0d" }} strokeWidth={3} />}
                    </div>
                    <Flame size={10} className="text-amber-400 shrink-0" />
                    <span className="font-mono text-xs text-white/70 truncate flex-1">{s.name}</span>
                    {s.current_streak > 0 && (
                      <span className="font-mono text-[9px] text-white/25 shrink-0">{s.current_streak}d</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="px-4 py-2 border-t border-white/8 flex items-center justify-between">
              <span className="font-mono text-[10px] text-white/30">{selected.length} selected</span>
              <button onClick={() => onChange([])} className="font-mono text-[10px] text-white/30 hover:text-red-400 transition-colors">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────

function MissionModal({ mission, onClose, onSave, streaks, missions }) {
  const isEdit = !!mission?.id;
  const [form, setForm] = useState(
    mission || { title: "", description: "", priority: 3, timeline: "", milestones: [], progress: 0 }
  );
  const [dateError, setDateError] = useState("");
  const [titleError, setTitleError] = useState("");

  const addMilestone = () =>
    setForm((f) => ({
      ...f,
      milestones: [...f.milestones, { id: `ml_${Date.now()}`, title: "", completed: false, connectedStreaks: [] }],
    }));

  const updateMilestoneTitle = (idx, val) =>
    setForm((f) => {
      const ms = [...f.milestones];
      ms[idx] = { ...ms[idx], title: val };
      return { ...f, milestones: ms };
    });

  const updateMilestoneStreaks = (idx, streakIds) =>
    setForm((f) => {
      const ms = [...f.milestones];
      ms[idx] = { ...ms[idx], connectedStreaks: streakIds };
      return { ...f, milestones: ms };
    });

  const removeMilestone = (idx) =>
    setForm((f) => ({ ...f, milestones: f.milestones.filter((_, i) => i !== idx) }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#111" }}>

        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
          <h2 className="font-mono text-sm tracking-widest text-white/80 uppercase">
            {isEdit ? "Edit Mission" : "New Mission"}
          </h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Mission Title</label>
            <input
              value={form.title}
              onChange={(e) => {
                const val = e.target.value;
                setForm({ ...form, title: val });
                const duplicate = missions.some((m) => m.title.toLowerCase() === val.toLowerCase() && m.id !== mission?.id);
                setTitleError(duplicate ? "A mission with this title already exists" : "");
              }}
              placeholder="What are you pursuing?"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-[#c8f04c]/50 transition-colors"
            />
            {titleError && <p className="font-mono text-[10px] text-red-400 mt-1">{titleError}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Brief context..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-[#c8f04c]/50 transition-colors resize-none"
            />
          </div>

          {/* Priority + Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#c8f04c]/50 transition-colors"
              >
                <option value={1}>High</option>
                <option value={2}>Medium</option>
                <option value={3}>Low</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Target Date</label>
              <input
                type="date"
                value={form.timeline}
                onChange={(e) => {
                  const val = e.target.value;
                  const today = new Date().toISOString().split("T")[0];
                  setForm({ ...form, timeline: val });
                  setDateError(val && val < today ? "Target date can't be in the past" : "");
                }}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#c8f04c]/50 transition-colors"
              />
              {dateError && <p className="font-mono text-[10px] text-red-400 mt-1">{dateError}</p>}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[10px] tracking-widest text-white/40 uppercase">Milestones</label>
              <button onClick={addMilestone} className="font-mono text-[10px] text-[#c8f04c]/70 hover:text-[#c8f04c] tracking-widest transition-colors flex items-center gap-1">
                <Plus size={10} /> ADD
              </button>
            </div>
            <div className="space-y-3">
              {form.milestones.map((ms, idx) => (
                <div key={ms.id} className="rounded-xl border border-white/8 p-3 space-y-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-center gap-2">
                    <Milestone size={12} className="text-white/20 shrink-0" />
                    <input
                      value={ms.title}
                      onChange={(e) => updateMilestoneTitle(idx, e.target.value)}
                      placeholder={`Milestone ${idx + 1}`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-[#c8f04c]/40 transition-colors"
                    />
                    <button onClick={() => removeMilestone(idx)} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                  {streaks.length > 0 && (
                    <div className="pl-5">
                      <label className="block font-mono text-[9px] tracking-widest text-white/25 uppercase mb-1.5">
                        Connect Streaks
                      </label>
                      <StreakDropdown
                        streaks={streaks}
                        selected={ms.connectedStreaks || []}
                        onChange={(ids) => updateMilestoneStreaks(idx, ids)}
                        placeholder="Link streaks to this milestone..."
                      />
                    </div>
                  )}
                </div>
              ))}
              {form.milestones.length === 0 && (
                <p className="text-white/20 font-mono text-xs">No milestones yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors">
            CANCEL
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.title.trim() || !form.timeline || !!titleError || !!dateError}
            className="px-5 py-2 rounded-lg font-mono text-xs tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: form.title.trim() ? "#c8f04c" : "#444", color: "#0d0d0d" }}
          >
            {isEdit ? "SAVE CHANGES" : "CREATE MISSION"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Roadmap View ──────────────────────────────────────────────────────────────

function RoadmapView({ mission, onBack, onUpdate, allStreaks }) {
  const [milestones, setMilestones] = useState(mission.milestones || []);
  const [connectingIdx, setConnectingIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleMilestone = async (mlIdx) => {
    const ml = milestones[mlIdx];
    const updated = milestones.map((m, i) => i !== mlIdx ? m : { ...m, completed: !m.completed });
    setMilestones(updated);
    try {
      await toggleMilestone_db(ml.id, !ml.completed);
      onUpdate({ ...mission, milestones: updated });
    } catch (err) {
      console.error(err);
      setMilestones(milestones);
    }
  };

  const totalMilestones = milestones.length;
  const doneMilestones = milestones.filter((m) => m.completed).length;
  const progress = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : mission.progress || 0;

  const getMilestoneStreaks = (ml) =>
    ml.milestone_streaks?.map((ms) => ms.streaks).filter(Boolean) || [];

  const getConnectedIds = (ml) =>
    ml.milestone_streaks?.map((ms) => ms.streaks?.id).filter(Boolean) || [];

  const handleStreakToggle = async (mlIdx, streakId) => {
    const ml = milestones[mlIdx];
    const connectedIds = getConnectedIds(ml);
    const isConnected = connectedIds.includes(streakId);
    try {
      if (isConnected) {
        // missions.js signature: disconnectStreakFromMilestone(milestoneId, streakId)
        await disconnectStreakFromMilestone(ml.id, streakId);
      } else {
        // missions.js signature: connectStreakToMilestone(milestoneId, streakId)
        await connectStreakToMilestone(ml.id, streakId);
      }
      onUpdate({ ...mission, milestones });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white/70 font-mono text-xs tracking-widest transition-colors">
          <ArrowLeft size={14} /> MISSIONS
        </button>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-white/70 tracking-widest truncate">{mission.title.toUpperCase()}</span>
      </div>

      <div className="rounded-2xl p-6 mb-6 border border-white/8" style={{ background: "#111" }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-mono text-white mb-1">{mission.title}</h2>
            <p className="text-white/40 text-sm">{mission.description}</p>
          </div>
          <PriorityBadge priority={mission.priority} />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1"><ProgressBar value={progress} /></div>
          <span className="font-mono text-xs text-[#c8f04c] tabular-nums">{progress}%</span>
          <div className="flex items-center gap-1 text-white/30">
            <Calendar size={12} />
            <span className="font-mono text-xs">
              {mission.timeline ? new Date(mission.timeline).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "No date"}
            </span>
          </div>
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
              const filtered = allStreaks.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

              return (
                <div key={ml.id} className="relative">
                  <div
                    className="absolute -left-8 top-1 w-3 h-3 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all"
                    style={{ borderColor: isDone ? "#c8f04c" : "rgba(255,255,255,0.2)", background: isDone ? "rgba(200,240,76,0.2)" : "#0d0d0d" }}
                    onClick={() => toggleMilestone(mlIdx)}
                  >
                    {isDone && <div className="w-2 h-2 rounded-full" style={{ background: "#c8f04c" }} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-mono text-sm tracking-wide ${isDone ? "text-[#c8f04c]" : "text-white/70"}`}>
                        {ml.title || `Milestone ${mlIdx + 1}`}
                      </span>
                      {isDone && (
                        <span className="font-mono text-[9px] tracking-widest text-[#c8f04c]/60 border border-[#c8f04c]/30 px-1.5 py-0.5 rounded">DONE</span>
                      )}
                      {allStreaks.length > 0 && (
                        <button
                          onClick={() => { setConnectingIdx(isOpen ? null : mlIdx); setSearchQuery(""); }}
                          className={`ml-auto flex items-center gap-1 font-mono text-[9px] tracking-widest transition-colors px-2 py-1 rounded-lg border ${
                            isOpen
                              ? "border-[#c8f04c]/40 text-[#c8f04c] bg-[#c8f04c]/10"
                              : "border-white/10 text-white/30 hover:text-white/60 hover:border-white/20"
                          }`}
                        >
                          <Link2 size={9} />
                          {isOpen ? "DONE" : "CONNECT"}
                        </button>
                      )}
                    </div>

                    {/* Inline streak connector */}
                    {isOpen && (
                      <div className="mb-3 rounded-xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/8">
                          <Search size={11} className="text-white/30 shrink-0" />
                          <input
                            autoFocus
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search streaks..."
                            className="flex-1 bg-transparent text-xs text-white placeholder-white/25 font-mono focus:outline-none"
                          />
                          {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-white/25 hover:text-white/50"><X size={11} /></button>
                          )}
                        </div>
                        <div className="max-h-40 overflow-y-auto py-1">
                          {filtered.length === 0 ? (
                            <p className="px-4 py-3 font-mono text-[10px] text-white/25 text-center">No streaks found</p>
                          ) : (
                            filtered.map((s) => {
                              const checked = connectedIds.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => handleStreakToggle(mlIdx, s.id)}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                                >
                                  <div
                                    className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all"
                                    style={{ background: checked ? "#c8f04c" : "transparent", borderColor: checked ? "#c8f04c" : "rgba(255,255,255,0.2)" }}
                                  >
                                    {checked && <Check size={10} style={{ color: "#0d0d0d" }} strokeWidth={3} />}
                                  </div>
                                  <Flame size={10} className="text-amber-400 shrink-0" />
                                  <span className="font-mono text-xs text-white/70 flex-1 truncate">{s.name}</span>
                                  {s.current_streak > 0 && <span className="font-mono text-[9px] text-white/25">{s.current_streak}d</span>}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {connectedStreaks.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {connectedStreaks.map((s) => (
                          <div key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/20 bg-amber-400/5">
                            <Flame size={10} className="text-amber-400" />
                            <span className="font-mono text-[10px] text-amber-400/70">{s.name}</span>
                            <span className="font-mono text-[9px] text-white/25">{s.current_streak}d</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isOpen && <p className="text-white/20 font-mono text-[10px] mt-1">No streaks connected</p>
                    )}
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

function MissionCard({ mission, index, onSelect, onEdit, onDelete, dragging, onDragStart, onDragEnd, onDragOver }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        dragging ? "opacity-40 scale-95" : "opacity-100 hover:border-white/20"
      }`}
      style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl"
        style={{ background: mission.priority === 1 ? "#c8f04c" : mission.priority === 2 ? "#f59e0b" : "rgba(255,255,255,0.15)" }}
      />
      <div className="px-5 py-4 pl-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <GripVertical size={14} className="text-white/15 group-hover:text-white/30 shrink-0 mt-0.5 transition-colors cursor-grab" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h3 className="font-mono text-sm text-white truncate">{mission.title}</h3>
                <PriorityBadge priority={mission.priority} />
              </div>
              <p className="text-white/30 text-xs font-mono truncate">{mission.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button onClick={(e) => { e.stopPropagation(); onEdit(mission); }} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all">
              <Pencil size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1"><ProgressBar value={mission.progress} size="sm" /></div>
          <span className="font-mono text-xs text-white/40 tabular-nums w-8 text-right">{mission.progress}%</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-white/25">
              <Milestone size={11} />
              <span className="font-mono text-[10px]">{mission.milestones.length} {mission.milestones.length === 1 ? "milestone" : "milestones"}</span>
            </div>
            {mission.timeline && (
              <div className="flex items-center gap-1 text-white/25">
                <Calendar size={11} />
                <span className="font-mono text-[10px]">
                  {new Date(mission.timeline).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(mission); }}
            className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-white/35 hover:text-[#c8f04c] transition-colors"
          >
            ROADMAP <ChevronRight size={10} />
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          message={`Delete "${mission.title}"?`}
          onConfirm={() => { setShowConfirm(false); onDelete(mission.id); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl border border-white/10 p-6 w-80" style={{ background: "#111" }}>
        <p className="font-mono text-sm text-white/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors">
            CANCEL
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg font-mono text-xs tracking-widest" style={{ background: "#ef4444", color: "white" }}>
            DELETE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Missions() {
  const [missions, setMissions] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [tab, setTab] = useState("active");

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
      } else {
        await createMission(form);
      }
      const fresh = await getMissions();
      setMissions(fresh);
    } catch (err) {
      console.error("Save failed:", err);
    }
    setModalOpen(false);
    setEditingMission(null);
  };

  const handleDelete = async (id) => {
    try {
      await deleteMission(id);
      setMissions((ms) => ms.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoadmapUpdate = async (updated) => {
    try {
      const fresh = await getMissions();
      setMissions(fresh);
      const refreshed = fresh.find((m) => m.id === updated.id);
      if (refreshed) setSelectedMission(refreshed);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const [missionsData, streaksData] = await Promise.all([getMissions(), getStreaks()]);
        setMissions(missionsData);
        setStreaks(streaksData);
      } catch (err) {
        console.error("Failed to load:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
        option { background: #111; color: white; }
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {selectedMission ? (
          <RoadmapView
            mission={selectedMission}
            onBack={() => setSelectedMission(null)}
            onUpdate={handleRoadmapUpdate}
            allStreaks={streaks}
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-[#c8f04c]" />
                  <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">Chalk / Missions</span>
                </div>
                <h1 className="text-2xl font-mono text-white">
                  Missions
                  <span className="ml-2 text-sm" style={{ color: "#c8f04c" }}>{missions.length}</span>
                </h1>
              </div>
              <button
                onClick={() => { setEditingMission(null); setModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95"
                style={{ background: "#c8f04c", color: "#0d0d0d", fontWeight: "500", cursor: "pointer" }}
              >
                <Plus size={13} /> NEW MISSION
              </button>
            </div>

            {missions.length > 0 && (
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#111" }}>
                  <button
                    onClick={() => setTab("active")}
                    className="px-4 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all"
                    style={{ background: tab === "active" ? "#c8f04c" : "transparent", color: tab === "active" ? "#0d0d0d" : "rgba(255,255,255,0.3)", cursor: "pointer" }}
                  >
                    IN PROGRESS
                  </button>
                  <button
                    onClick={() => setTab("done")}
                    className="px-4 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all"
                    style={{ background: tab === "done" ? "#c8f04c" : "transparent", color: tab === "done" ? "#0d0d0d" : "rgba(255,255,255,0.3)", cursor: "pointer" }}
                  >
                    FINISHED
                  </button>
                </div>
                <div className="flex items-center gap-2 text-white/25 font-mono text-[10px] tracking-widest">
                  <GripVertical size={11} /><span>DRAG TO REPRIORITIZE</span>
                </div>
              </div>
            )}

            {missions.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/8" style={{ background: "#111" }}>
                  <Target size={22} className="text-white/20" />
                </div>
                <p className="font-mono text-white/30 text-sm mb-1">No missions yet</p>
                <p className="font-mono text-white/15 text-xs mb-6">Define what you're pursuing</p>
                <button
                  onClick={() => { setEditingMission(null); setModalOpen(true); }}
                  className="px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest"
                  style={{ background: "#c8f04c", color: "#0d0d0d", cursor: "pointer" }}
                >
                  GET STARTED
                </button>
              </div>
            ) : missions.filter((m) => tab === "done" ? m.progress === 100 : m.progress < 100).length === 0 && tab === "done" ? (
              <div className="text-center py-24">
                <p className="font-mono text-white/20 text-xs tracking-widest mb-2">NO FINISHED MISSIONS YET</p>
                <p className="font-mono text-white/40 text-sm">"Everything takes time. Keep going."</p>
              </div>
            ) : (
              <div className="space-y-3">
                {missions
                  .filter((m) => tab === "done" ? m.progress === 100 : m.progress < 100)
                  .map((mission, idx) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      index={idx}
                      onSelect={setSelectedMission}
                      onEdit={(m) => { setEditingMission(m); setModalOpen(true); }}
                      onDelete={handleDelete}
                      dragging={dragIdx === idx}
                      onDragStart={setDragIdx}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <MissionModal
          mission={editingMission}
          streaks={streaks}
          missions={missions}
          onClose={() => { setModalOpen(false); setEditingMission(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}