import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, Plus, Pencil, Trash2, X, Loader2, AlertTriangle,
  ArrowLeft, Clock,
} from "lucide-react";
import { getJournals, createJournal, updateJournal, deleteJournal } from "../lib/journals";

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUOTES = [
  "The unexamined life is not worth living.",
  "Write what should not be forgotten.",
  "Journal writing is a voyage to the interior.",
  "Fill your paper with the breathings of your heart.",
  "A journal is your completely unaltered voice.",
  "In the journal I do not just express myself more openly than I could to any person; I create myself.",
  "Write hard and clear about what hurts.",
  "One must always be careful of books, and what is inside them.",
];

function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function excerpt(content, len = 120) {
  if (!content) return "";
  const flat = content.replace(/\n+/g, " ").trim();
  return flat.length > len ? flat.slice(0, len) + "…" : flat;
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div className="rounded-2xl border border-white/10 p-6 w-80" style={{ background: "#111" }}>
        <p className="font-mono text-sm text-white/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-mono text-xs tracking-widest"
            style={{ background: "#ef4444", color: "white" }}
          >
            DELETE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Journal Editor (full-page write/edit view) ────────────────────────────────

function JournalEditor({ journal, onClose, onSave }) {
  const isEdit = !!journal?.id;
  const [form, setForm] = useState({
    title: journal?.title || "",
    content: journal?.content || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.content.trim()) return setError("Write something first.");
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await updateJournal(journal.id, {
          title: form.title.trim(),
          content: form.content.trim(),
        });
      } else {
        await createJournal({
          title: form.title.trim(),
          content: form.content.trim(),
        });
      }
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0d0d" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-white/8 sticky top-0 z-10"
        style={{ background: "#0d0d0d" }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 font-mono text-xs tracking-widest transition-colors"
        >
          <ArrowLeft size={14} /> JOURNALS
        </button>

        <div className="flex items-center gap-3">
          {error && (
            <span className="font-mono text-[10px] text-red-400">{error}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !form.content.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
            style={{ background: "#c8f04c", color: "#0d0d0d" }}
          >
            {saving && <Loader2 size={11} className="animate-spin" />}
            {isEdit ? "SAVE CHANGES" : "SAVE ENTRY"}
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        {/* Title */}
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Entry title (optional)"
          className="w-full bg-transparent text-2xl font-mono text-white placeholder-white/15 focus:outline-none mb-6 border-none"
          style={{ caretColor: "#c8f04c" }}
        />

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="font-mono text-[10px] text-white/20 tracking-widest uppercase">
            {isEdit
              ? `Last edited ${formatDate(journal.updated_at)}`
              : formatDate(new Date().toISOString())}
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Content */}
        <textarea
          autoFocus={!isEdit}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="Start writing…"
          className="w-full bg-transparent font-mono text-sm text-white/80 placeholder-white/15 focus:outline-none resize-none leading-relaxed"
          style={{ minHeight: "60vh", caretColor: "#c8f04c" }}
        />
      </div>
    </div>
  );
}

// ── Journal Card ──────────────────────────────────────────────────────────────

function JournalCard({ journal, onEdit, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const hasTitle = journal.title?.trim().length > 0;

  return (
    <div
      className="group relative rounded-2xl border border-white/8 hover:border-white/20 transition-all duration-200 cursor-pointer overflow-hidden"
      style={{ background: "#111" }}
      onClick={() => onEdit(journal)}
    >
      {/* Lime left stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ background: "rgba(200,240,76,0.25)" }}
      />

      <div className="px-5 py-4 pl-6">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-mono text-sm text-white leading-snug flex-1 min-w-0 truncate">
            {hasTitle ? journal.title : (
              <span className="text-white/30 italic">Untitled</span>
            )}
          </h3>

          {/* Actions — visible on hover */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onEdit(journal)}
              className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Excerpt */}
        {journal.content && (
          <p className="font-mono text-xs text-white/35 leading-relaxed mb-3 line-clamp-2">
            {excerpt(journal.content)}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-white/20">
          <Clock size={10} />
          <span className="font-mono text-[10px]">{formatDate(journal.created_at)}</span>
          <span className="text-white/10">·</span>
          <span className="font-mono text-[10px]">{formatTime(journal.created_at)}</span>
          {journal.updated_at !== journal.created_at && (
            <>
              <span className="text-white/10">·</span>
              <span className="font-mono text-[10px] text-white/15">edited</span>
            </>
          )}
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          message={`Delete "${hasTitle ? journal.title : "this entry"}"?`}
          onConfirm={() => { setShowConfirm(false); onDelete(journal.id); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Main Journals Page ────────────────────────────────────────────────────────

export default function Journals() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState(null);   // null = list view; journal obj or {} = editor
  const [quote] = useState(randomQuote);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJournals();
      setJournals(data || []);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    try {
      await deleteJournal(id);
      setJournals((prev) => prev.filter((j) => j.id !== id));
    } catch (e) {
      setPageError(e.message);
    }
  }

  // ── Editor view ─────────────────────────────────────────────────────────────
  if (editing !== null) {
    return (
      <JournalEditor
        journal={editing?.id ? editing : null}
        onClose={() => setEditing(null)}
        onSave={() => { setEditing(null); load(); }}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
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
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={14} className="text-[#c8f04c]" />
              <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">
                Chalk / Journals
              </span>
            </div>
            <h1 className="text-2xl font-mono text-white">
              Journals
              {journals.length > 0 && (
                <span className="ml-2 text-sm" style={{ color: "#c8f04c" }}>
                  {journals.length}
                </span>
              )}
            </h1>
          </div>
          <button
            onClick={() => setEditing({})}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#c8f04c", color: "#0d0d0d", fontWeight: "500", cursor: "pointer" }}
          >
            <Plus size={13} />
            NEW ENTRY
          </button>
        </div>

        {/* Error banner */}
        {pageError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <span className="font-mono text-xs text-red-400 flex-1">{pageError}</span>
            <button onClick={() => setPageError("")} className="text-red-400/60 hover:text-red-400 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Empty state */}
        {journals.length === 0 ? (
          <div className="text-center py-24">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/8"
              style={{ background: "#111" }}
            >
              <BookOpen size={22} className="text-white/20" />
            </div>
            <p className="font-mono text-white/15 text-[10px] tracking-widest uppercase mb-3">
              No entries yet
            </p>
            <p
              className="font-mono text-white/40 text-sm max-w-xs mx-auto leading-relaxed mb-8"
              style={{ fontStyle: "italic" }}
            >
              "{quote}"
            </p>
            <button
              onClick={() => setEditing({})}
              className="px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest"
              style={{ background: "#c8f04c", color: "#0d0d0d", cursor: "pointer" }}
            >
              WRITE YOUR FIRST ENTRY
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {journals.map((journal) => (
              <JournalCard
                key={journal.id}
                journal={journal}
                onEdit={(j) => setEditing(j)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}