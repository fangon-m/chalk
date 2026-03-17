import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen, Plus, Pencil, Trash2, X, Loader2, AlertTriangle,
  ArrowLeft, Clock, Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Code, Heading1, Heading2,
  Cloud, CloudOff, CloudUpload,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
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

const FONTS = [
  { label: "Mono",    value: "'DM Mono', monospace" },
  { label: "Serif",   value: "Georgia, serif" },
  { label: "Sans",    value: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Courier", value: "'Courier New', monospace" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "22px", "28px"];

const THEMES = [
  { label: "Dark",  bg: "#0d0d0d" },
  { label: "Dim",   bg: "#181818" },
  { label: "Sepia", bg: "#181410" },
  { label: "Slate", bg: "#0f1419" },
];

const DEFAULT_TYPO = { font: "'DM Mono', monospace", size: "15px", theme: THEMES[0] };
const AUTOSAVE_DELAY = 2000;

function randomQuote() { return QUOTES[Math.floor(Math.random() * QUOTES.length)]; }
function formatDate(iso) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function formatTime(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function wasEdited(j) { return j.updated_at && j.created_at && new Date(j.updated_at) - new Date(j.created_at) > 2000; }
function excerpt(content, len = 120) {
  if (!content) return "";
  const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > len ? plain.slice(0, len) + "…" : plain;
}

// ── Save Indicator ────────────────────────────────────────────────────────────

function SaveIndicator({ status }) {
  const configs = {
    idle: {
      icon: <Cloud size={14} />,
      label: "All changes saved",
      color: "rgba(255,255,255,0.15)",
    },
    unsaved: {
      icon: <CloudUpload size={14} />,
      label: "Unsaved changes",
      color: "rgba(255,255,255,0.35)",
    },
    saving: {
      icon: <Loader2 size={14} className="animate-spin" />,
      label: "Saving…",
      color: "rgba(255,255,255,0.3)",
    },
    saved: {
      icon: <Cloud size={14} />,
      label: "Saved",
      color: "rgba(200,240,76,0.7)",
    },
    error: {
      icon: <CloudOff size={14} />,
      label: "Save failed",
      color: "#ef4444",
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <div className="flex items-center gap-1.5 transition-all duration-300" style={{ color: cfg.color }}>
      {cfg.icon}
      <span className="font-mono text-[10px] tracking-widest">{cfg.label}</span>
    </div>
  );
}

// ── Toolbar helpers ───────────────────────────────────────────────────────────

function ToolBtn({ onClick, active, title, children }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="flex items-center justify-center rounded-md transition-all"
      style={{
        width: 28, height: 28, flexShrink: 0,
        background: active ? "rgba(200,240,76,0.15)" : "transparent",
        color: active ? "#c8f04c" : "rgba(255,255,255,0.45)",
        border: active ? "1px solid rgba(200,240,76,0.25)" : "1px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

function ToolDivider() {
  return <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)", margin: "0 2px", flexShrink: 0 }} />;
}

function FontSizeSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono text-[11px] rounded-md px-1 focus:outline-none cursor-pointer"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", height: 28 }}
    >
      {FONT_SIZES.map((s) => <option key={s} value={s} style={{ background: "#111" }}>{s}</option>)}
    </select>
  );
}

function FontSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono text-[11px] rounded-md px-1 focus:outline-none cursor-pointer"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", height: 28, maxWidth: 80 }}
    >
      {FONTS.map((f) => <option key={f.value} value={f.value} style={{ background: "#111" }}>{f.label}</option>)}
    </select>
  );
}

// ── Formatting Bar ────────────────────────────────────────────────────────────

function FormattingBar({ editor, typo, onTypoChange, bgColor }) {
  if (!editor) return null;
  return (
    <div
      className="sticky z-10 flex items-center gap-1 px-4 py-2 flex-wrap"
      style={{ top: 57, background: bgColor, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <FontSelect value={typo.font} onChange={(v) => onTypoChange({ ...typo, font: v })} />
      <FontSizeSelect value={typo.size} onChange={(v) => onTypoChange({ ...typo, size: v })} />
      <ToolDivider />
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Code"><Code size={13} /></ToolBtn>
      <ToolDivider />
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1"><Heading1 size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2"><Heading2 size={13} /></ToolBtn>
      <ToolDivider />
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list"><ListOrdered size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote"><Quote size={13} /></ToolBtn>
      <ToolDivider />
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Left"><AlignLeft size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center"><AlignCenter size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Right"><AlignRight size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify"><AlignJustify size={13} /></ToolBtn>
      <ToolDivider />
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider"><Minus size={13} /></ToolBtn>
      <ToolDivider />
      <div className="flex items-center gap-1 ml-1">
        {THEMES.map((t) => (
          <button
            key={t.label}
            onMouseDown={(e) => { e.preventDefault(); onTypoChange({ ...typo, theme: t }); }}
            title={t.label}
            className="rounded-md transition-all"
            style={{
              width: 18, height: 18,
              background: t.bg,
              border: typo.theme.label === t.label ? "1.5px solid #c8f04c" : "1.5px solid rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.stopPropagation()}>
      <div className="rounded-2xl border border-white/10 p-6 w-80" style={{ background: "#111" }}>
        <p className="font-mono text-sm text-white/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors cursor-pointer">CANCEL</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg font-mono text-xs tracking-widest" style={{ background: "#ef4444", color: "white", cursor: "pointer" }}>DELETE</button>
        </div>
      </div>
    </div>
  );
}

// ── Journal Editor ────────────────────────────────────────────────────────────

function JournalEditor({ journal, onClose }) {
  const isEdit = !!journal?.id;
  const [title, setTitle] = useState(journal?.title || "");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [typo, setTypo] = useState(DEFAULT_TYPO);

  // ── ALL refs declared here, BEFORE useEditor ──────────────────────────────
  const journalIdRef      = useRef(journal?.id || null);
  const autosaveTimerRef  = useRef(null);
  const savedTimerRef     = useRef(null);
  const editorReadyRef    = useRef(false); // true once editor has fully mounted
  const titleMountedRef   = useRef(false); // true after first title render

  // ── Editor ────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Typography,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading" ? "Heading…" : "Start writing…",
      }),
    ],
    content: journal?.content || "",
    editorProps: {
      attributes: { class: "chalk-editor focus:outline-none" },
    },
    onCreate: () => {
      // Mark editor as ready AFTER initial content hydration
      // Use a small timeout so any initial onUpdate fires first
      setTimeout(() => { editorReadyRef.current = true; }, 50);
    },
    onUpdate: () => {
      // Ignore updates until editor is fully ready
      if (!editorReadyRef.current) return;
      scheduleAutosave();
    },
  });

  // ── Autosave helpers ──────────────────────────────────────────────────────

  function scheduleAutosave() {
    setSaveStatus("unsaved");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => performSave(), AUTOSAVE_DELAY);
  }

  async function performSave() {
    const content = editor?.getHTML() || "";
    const isEmpty = !content || content === "<p></p>";
    if (isEmpty && !title.trim()) return;

    setSaveStatus("saving");
    try {
      if (journalIdRef.current) {
        await updateJournal(journalIdRef.current, {
          title: title.trim(),
          content: isEmpty ? "" : content,
        });
      } else {
        const created = await createJournal({
          title: title.trim(),
          content: isEmpty ? "" : content,
        });
        journalIdRef.current = created.id;
      }
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
    }
  }

  // ── Title change → autosave (skip initial mount) ──────────────────────────
  useEffect(() => {
    if (!titleMountedRef.current) {
      titleMountedRef.current = true;
      return;
    }
    if (!title && !journalIdRef.current) return;
    scheduleAutosave();
  }, [title]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  function handleBack() {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      performSave().finally(() => onClose());
    } else {
      onClose();
    }
  }

  return (
    <div className="flex flex-col transition-colors duration-300" style={{ background: typo.theme.bg, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        .chalk-editor {
          font-family: ${typo.font};
          font-size: ${typo.size};
          line-height: 1.75;
          color: rgba(255,255,255,0.78);
          caret-color: #c8f04c;
          min-height: 60vh;
        }
        .chalk-editor > * + * { margin-top: 0.6em; }
        .chalk-editor p { margin: 0; }
        .chalk-editor h1 { font-size: 1.8em; font-weight: 500; color: rgba(255,255,255,0.95); line-height: 1.2; }
        .chalk-editor h2 { font-size: 1.3em; font-weight: 500; color: rgba(255,255,255,0.9); }
        .chalk-editor h3 { font-size: 1.1em; font-weight: 500; color: rgba(255,255,255,0.85); }
        .chalk-editor ul { padding-left: 1.4em; list-style: disc; }
        .chalk-editor ol { padding-left: 1.4em; list-style: decimal; }
        .chalk-editor li + li { margin-top: 0.2em; }
        .chalk-editor blockquote { border-left: 2px solid rgba(200,240,76,0.35); padding-left: 1em; color: rgba(255,255,255,0.4); font-style: italic; }
        .chalk-editor hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); }
        .chalk-editor pre { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 1em; font-family: 'Courier New', monospace; font-size: 0.85em; }
        .chalk-editor code { background: rgba(200,240,76,0.08); color: #c8f04c; border-radius: 4px; padding: 0.1em 0.4em; font-family: 'Courier New', monospace; font-size: 0.85em; }
        .chalk-editor pre code { background: none; color: rgba(255,255,255,0.7); padding: 0; }
        .chalk-editor strong { color: rgba(255,255,255,0.95); font-weight: 600; }
        .chalk-editor em { font-style: italic; }
        .chalk-editor u { text-decoration: underline; text-underline-offset: 3px; }
        .chalk-editor .is-editor-empty:first-child::before,
        .chalk-editor .is-empty::before { content: attr(data-placeholder); color: rgba(255,255,255,0.15); pointer-events: none; float: left; height: 0; }
        .chalk-editor ::selection { background: rgba(200,240,76,0.2); }
      `}</style>

      {/* ── Top bar ── */}
      <div
        className="flex items-center px-6 py-4 border-b sticky top-0 z-20 transition-colors duration-300"
        style={{ background: typo.theme.bg, borderColor: "rgba(255,255,255,0.06)", height: 57, gap: 16 }}
      >
        {/* Back */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 font-mono text-xs tracking-widest transition-colors shrink-0"
          style={{ color: "rgba(255,255,255,0.35)" }}
          onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
        >
          <ArrowLeft size={14} /> JOURNALS
        </button>

        {/* Push indicator to right */}
        <div style={{ flex: 1 }} />

        {/* Save indicator */}
        <SaveIndicator status={saveStatus} />
      </div>

      {/* ── Sticky formatting bar ── */}
      <FormattingBar editor={editor} typo={typo} onTypoChange={setTypo} bgColor={typo.theme.bg} />

      {/* ── Editor body ── */}
      <div className="max-w-2xl mx-auto w-full px-6 py-10">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry title (optional)"
          className="w-full bg-transparent text-2xl focus:outline-none mb-6 border-none"
          style={{ fontFamily: typo.font, color: "rgba(255,255,255,0.9)", caretColor: "#c8f04c" }}
        />

        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="font-mono text-[10px] text-white/20 tracking-widest uppercase">
            {isEdit
              ? `Last edited ${formatDate(journal.updated_at)} · ${formatTime(journal.updated_at)}`
              : formatDate(new Date().toISOString())}
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── Journal Card ──────────────────────────────────────────────────────────────

function JournalCard({ journal, onEdit, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const hasTitle = journal.title?.trim().length > 0;
  const edited = wasEdited(journal);

  return (
    <div
      className="group relative rounded-2xl border border-white/8 hover:border-white/20 transition-all duration-200 overflow-hidden"
      style={{ background: "#111" }}
      onClick={() => onEdit(journal)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "rgba(200,240,76,0.25)" }} />
      <div className="px-5 py-4 pl-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-mono text-sm text-white leading-snug flex-1 min-w-0 truncate">
            {hasTitle ? journal.title : <span className="text-white/30 italic">Untitled</span>}
          </h3>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onEdit(journal)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all cursor-pointer"><Pencil size={12} /></button>
            <button onClick={() => setShowConfirm(true)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all cursor-pointer"><Trash2 size={12} /></button>
          </div>
        </div>
        {journal.content && (
          <p className="font-mono text-xs text-white/35 leading-relaxed mb-3 line-clamp-2">{excerpt(journal.content)}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-white/20">
            <Clock size={10}/>
            <span className="font-mono text-[10px]">{formatDate(journal.created_at)}</span>
            <span className="font-mono text-[10px]">·</span>
            <span className="font-mono text-[10px]">{formatTime(journal.created_at)}</span>
          </div>
          {edited && (
            <>
              <div className="flex items-center gap-1.5 text-white/20 ml-10">
              <Pencil size={10} />
              <span className="font-mono text-[10px]">{formatDate(journal.updated_at)}</span>
              <span className="font-mono text-[10px]">·</span>
              <span className="font-mono text-[10px]">{formatTime(journal.updated_at)}</span>
            </div>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Journals() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState(null);
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

  if (editing !== null) {
    return (
      <JournalEditor
        journal={editing?.id ? editing : null}
        onClose={() => { setEditing(null); load(); }}
      />
    );
  }

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
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        select option { background: #111; color: white; }
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={14} className="text-[#c8f04c]" />
              <span className="font-mono text-[11px] tracking-widest text-white/30 uppercase">Chalk / Journals</span>
            </div>
            <h1 className="text-2xl font-mono text-white">
              Journals
              {journals.length > 0 && <span className="ml-2 text-sm" style={{ color: "#c8f04c" }}>{journals.length}</span>}
            </h1>
          </div>
          <button
            onClick={() => setEditing({})}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#c8f04c", color: "#0d0d0d", fontWeight: "500", cursor: "pointer" }}
          >
            <Plus size={13} /> NEW ENTRY
          </button>
        </div>

        {pageError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <span className="font-mono text-xs text-red-400 flex-1">{pageError}</span>
            <button onClick={() => setPageError("")} className="text-red-400/60 hover:text-red-400 transition-colors"><X size={13} /></button>
          </div>
        )}

        {journals.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/8" style={{ background: "#111" }}>
              <BookOpen size={22} className="text-white/20" />
            </div>
            <p className="font-mono text-white/15 text-[10px] tracking-widest uppercase mb-3">No entries yet</p>
            <p className="font-mono text-white/40 text-sm max-w-xs mx-auto leading-relaxed mb-8" style={{ fontStyle: "italic" }}>"{quote}"</p>
            <button onClick={() => setEditing({})} className="px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest" style={{ background: "#c8f04c", color: "#0d0d0d", cursor: "pointer" }}>
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