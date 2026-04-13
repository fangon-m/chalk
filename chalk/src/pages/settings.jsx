import { useState, useEffect, useCallback } from "react";
import {
  Settings, Palette, Flame, Database, LayoutGrid,
  AlertTriangle, X, Check, Download, Trash2, Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// ── Accent color presets ──────────────────────────────────────────────────────

const ACCENT_PRESETS = [
  { label: "Lime",    color: "#c8f04c" },
  { label: "Cyan",    color: "#22d3ee" },
  { label: "Violet",  color: "#a78bfa" },
  { label: "Rose",    color: "#fb7185" },
  { label: "Orange",  color: "#fb923c" },
  { label: "Emerald", color: "#34d399" },
  { label: "Sky",     color: "#38bdf8" },
  { label: "Amber",   color: "#fbbf24" },
];

const BG_PRESETS = [
  { label: "Pure Black",   color: "#080808" },
  { label: "Off Black",    color: "#0d0d0d" },
  { label: "Dark",         color: "#111111" },
  { label: "Semi-Dark",    color: "#131313" },
  { label: "Dim",          color: "#161616" },
  { label: "Charcoal",     color: "#1a1a1a" },
  { label: "Dark Gray",    color: "#202020" },
  { label: "Gray",         color: "#262626" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, accent = "#c8f04c", children }) {
  return (
    <div className="rounded-2xl border mb-4 overflow-hidden"
      style={{ background: "#111", borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
        <Icon size={12} style={{ color: accent }} />
        <p className="font-mono text-[10px] tracking-widest text-white/40 uppercase">{title}</p>
      </div>
      <div className="px-5 py-5 space-y-5">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange, accentColor = "#c8f04c" }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-white mb-0.5">{label}</p>
        {description && <p className="font-mono text-[10px] text-white/30 leading-relaxed mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="shrink-0 w-10 h-6 rounded-full transition-all duration-200 relative cursor-pointer mt-0.5"
        style={{ background: value ? accentColor : "rgba(255,255,255,0.1)" }}
      >
        <div className="absolute top-1 w-4 h-4 rounded-full transition-all duration-200"
          style={{ background: value ? "#0d0d0d" : "rgba(255,255,255,0.4)", left: value ? "calc(100% - 20px)" : 4 }} />
      </button>
    </div>
  );
}

function ConfirmModal({ message, confirmLabel = "CONFIRM", danger = false, onConfirm, onCancel, loading, accentColor = "#c8f04c" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
      <div className="rounded-2xl border border-white/10 p-6 w-80 mx-4" style={{ background: "#111" }}>
        <p className="font-mono text-sm text-white/70 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors cursor-pointer disabled:opacity-30">
            CANCEL
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 rounded-lg font-mono text-xs tracking-widest transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
            style={{ background: danger ? "#ef4444" : accentColor, color: danger ? "white" : "#0d0d0d" }}>
            {loading && <Loader2 size={11} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [pageError, setPageError]   = useState("");
  const [confirmModal, setConfirmModal] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [userId, setUserId]         = useState(null);

  const [accentColor, setAccentColor]   = useState("#c8f04c");
  const [displayName, setDisplayName]   = useState("");
  const [hideOffToday, setHideOffToday] = useState(false);
  const [compactMode, setCompactMode]   = useState(false);
  const [kanbanMode, setKanbanMode]     = useState(false);
  const [bgColor, setBgColor]           = useState("#0d0d0d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAccentColor(data.accent_color || "#c8f04c");
        setDisplayName(data.display_name || "");
        setHideOffToday(data.hide_off_today ?? false);
        setCompactMode(data.compact_mode ?? false);
        setKanbanMode(data.kanban_mode ?? false);
        setBgColor(data.bg_color || "#0d0d0d");
      }
    } catch (e) {
      setPageError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function persist(patch) {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id:        userId,
          accent_color:   accentColor,
          display_name:   displayName,
          hide_off_today: hideOffToday,
          compact_mode:   compactMode,
          kanban_mode:    kanbanMode,
          bg_color:       bgColor,
          updated_at:     new Date().toISOString(),
          ...patch,
        }, { onConflict: "user_id" });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      // Translate DB snake_case patch keys to camelCase so the event
      // always carries the true new value, not the stale closure value.
      const keyMap = {
        accent_color:   "accentColor",
        bg_color:       "bgColor",
        compact_mode:   "compactMode",
        hide_off_today: "hideOffToday",
        kanban_mode:    "kanbanMode",
        display_name:   "displayName",
      };
      const patchCamel = Object.fromEntries(
        Object.entries(patch).map(([k, v]) => [keyMap[k] ?? k, v])
      );
      window.dispatchEvent(new CustomEvent("chalk:settings", {
        detail: {
          accentColor, displayName, hideOffToday, compactMode, kanbanMode, bgColor,
          ...patchCamel,
        },
      }));
    } catch (e) {
      setPageError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleAccent(color) {
    setAccentColor(color);
    persist({ accent_color: color });
  }

  function handleBgColor(color) {
    setBgColor(color);
    persist({ bg_color: color });
  }

  function handleToggle(key, setter, value) {
    setter(value);
    persist({ [key]: value });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const [
        { data: streaks  },
        { data: missions },
        { data: journals },
      ] = await Promise.all([
        supabase.from("streaks").select("*"),
        supabase.from("missions").select("*, milestones(*)"),
        supabase.from("journals").select("*").is("deleted_at", null),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        streaks:     streaks  || [],
        missions:    missions || [],
        journals:    journals || [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `chalk-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteStreaks() {
    setDeleting(true);
    try {
      await supabase.from("streak_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("milestone_streaks").delete().neq("milestone_id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("streaks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      setConfirmModal(null);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    setDeleting(true);
    try {
      await supabase.from("streak_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("milestone_streaks").delete().neq("milestone_id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("streaks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("milestones").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("missions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("journals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("journal_folders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      setConfirmModal(null);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0d0d" }}>
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
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings size={14} style={{ color: accentColor }} />
              <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">Chalk / Settings</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-mono text-white">Settings</h1>
              {saving && <Loader2 size={13} className="animate-spin text-white/20" />}
              {saved && !saving && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}>
                  <Check size={10} style={{ color: accentColor }} />
                  <span className="font-mono text-[9px] tracking-widest" style={{ color: accentColor }}>SAVED</span>
                </div>
              )}
            </div>
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

        {/* ── Appearance ── */}
        <Section title="Appearance" icon={Palette} accent={accentColor}>
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-3">
              Accent Color
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {ACCENT_PRESETS.map(({ label, color }) => (
                <button
                  key={color}
                  onClick={() => handleAccent(color)}
                  title={label}
                  className="w-8 h-8 rounded-lg transition-all cursor-pointer relative"
                  style={{
                    background: color,
                    outline: accentColor === color ? `2px solid ${color}` : "2px solid transparent",
                    outlineOffset: 2,
                    transform: accentColor === color ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {accentColor === color && (
                    <Check size={12} className="absolute inset-0 m-auto" style={{ color: "#0d0d0d" }} />
                  )}
                </button>
              ))}
              <label
                title="Custom color"
                className="w-8 h-8 rounded-lg cursor-pointer flex items-center justify-center transition-all relative overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px dashed rgba(255,255,255,0.2)",
                  outline: !ACCENT_PRESETS.find(p => p.color === accentColor) ? `2px solid ${accentColor}` : "2px solid transparent",
                  outlineOffset: 2,
                }}
              >
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => handleAccent(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <span className="font-mono text-white/40" style={{ fontSize: 14, lineHeight: 1 }}>+</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: accentColor }} />
              <span className="font-mono text-[10px] text-white/30">{accentColor.toUpperCase()}</span>
            </div>
          </div>

          {/* Background color */}
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-3">
              Background
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {BG_PRESETS.map(({ label, color }) => (
                <button
                  key={color}
                  onClick={() => handleBgColor(color)}
                  title={label}
                  className="w-8 h-8 rounded-lg transition-all cursor-pointer relative border"
                  style={{
                    background: color,
                    borderColor: bgColor === color ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)",
                    outline: bgColor === color ? "2px solid rgba(255,255,255,0.25)" : "2px solid transparent",
                    outlineOffset: 2,
                    transform: bgColor === color ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  {bgColor === color && (
                    <Check size={12} className="absolute inset-0 m-auto" style={{ color: "rgba(255,255,255,0.6)" }} />
                  )}
                </button>
              ))}
              {/* Custom bg color */}
              <label
                title="Custom background"
                className="w-8 h-8 rounded-lg cursor-pointer flex items-center justify-center transition-all relative overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px dashed rgba(255,255,255,0.2)",
                  outline: !BG_PRESETS.find(p => p.color === bgColor) ? "2px solid rgba(255,255,255,0.25)" : "2px solid transparent",
                  outlineOffset: 2,
                }}
              >
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => handleBgColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <span className="font-mono text-white/40" style={{ fontSize: 14, lineHeight: 1 }}>+</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-white/15" style={{ background: bgColor }} />
              <span className="font-mono text-[10px] text-white/30">{bgColor.toUpperCase()}</span>
            </div>
          </div>
        </Section>

        {/* ── Layout ── */}
        <Section title="Layout" icon={LayoutGrid} accent={accentColor}>
          <ToggleRow
            label="Kanban Mode"
            description="Streaks are grouped by scheduled day. Missions are grouped by priority (High / Med / Low). Toggle also appears on each page."
            value={kanbanMode}
            onChange={v => handleToggle("kanban_mode", setKanbanMode, v)}
            accentColor={accentColor}
          />
        </Section>

        {/* ── Streaks ── */}
        {!kanbanMode && (
          <Section title="Streaks" icon={Flame} accent={accentColor}>
            <ToggleRow
              label="Hide Off-Today Streaks"
              description="In the Pending tab, streaks that aren't scheduled today are hidden instead of shown grayed out."
              value={hideOffToday}
              onChange={v => handleToggle("hide_off_today", setHideOffToday, v)}
              accentColor={accentColor}
            />
          </Section>
        )}

        {/* ── Data ── */}
        <Section title="Data" icon={Database} accent={accentColor}>
          <div>
            <p className="font-mono text-sm text-white mb-0.5">Export Data</p>
            <p className="font-mono text-[10px] text-white/30 leading-relaxed mb-3">
              Download all your streaks, missions, and journal entries as a JSON file.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-widest transition-all cursor-pointer disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
            >
              {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {exporting ? "EXPORTING..." : "EXPORT JSON"}
            </button>
          </div>

          <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

          <div>
            <p className="font-mono text-sm text-white mb-0.5">Delete All Streaks</p>
            <p className="font-mono text-[10px] text-white/30 leading-relaxed mb-3">
              Permanently removes all streaks and their check-in history. Missions and journals are unaffected.
            </p>
            <button
              onClick={() => setConfirmModal("streaks")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-widest transition-all cursor-pointer"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
            >
              <Trash2 size={12} />
              DELETE STREAKS
            </button>
          </div>

          <div>
            <p className="font-mono text-sm text-white mb-0.5">Delete All Data</p>
            <p className="font-mono text-[10px] text-white/30 leading-relaxed mb-3">
              Wipes everything — streaks, missions, milestones, and all journal entries. This cannot be undone.
            </p>
            <button
              onClick={() => setConfirmModal("all")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs tracking-widest transition-all cursor-pointer"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
            >
              <Trash2 size={12} />
              DELETE EVERYTHING
            </button>
          </div>
        </Section>

      </div>

      {confirmModal === "streaks" && (
        <ConfirmModal
          message="Delete all streaks and their check-in history? This cannot be undone."
          confirmLabel="DELETE STREAKS"
          danger
          loading={deleting}
          onConfirm={handleDeleteStreaks}
          onCancel={() => setConfirmModal(null)}
          accentColor={accentColor}
        />
      )}
      {confirmModal === "all" && (
        <ConfirmModal
          message="Delete ALL data — streaks, missions, milestones, and journals? This is permanent and cannot be undone."
          confirmLabel="DELETE EVERYTHING"
          danger
          loading={deleting}
          onConfirm={handleDeleteAll}
          onCancel={() => setConfirmModal(null)}
          accentColor={accentColor}
        />
      )}
    </div>
  );
}