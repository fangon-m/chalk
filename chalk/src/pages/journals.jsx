import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen, Plus, Pencil, Trash2, X, Loader2, AlertTriangle,
  ArrowLeft, Clock, Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Code, Heading1, Heading2,
  Cloud, CloudOff, CloudUpload, Undo, Redo,
} from "lucide-react";
import { useEditor, EditorContent, Mark, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { getJournals, createJournal, updateJournal, deleteJournal } from "../lib/journals";

// ── Custom marks ──────────────────────────────────────────────────────────────

const FontFamilyMark = Mark.create({
  name: "fontFamily",
  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (el) => el.style.fontFamily || null,
        renderHTML: (attrs) => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span", getAttrs: (el) => el.style.fontFamily ? { fontFamily: el.style.fontFamily } : false }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily) => ({ commands }) => commands.setMark(this.name, { fontFamily }),
      unsetFontFamily: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },
});

const FontSizeMark = Mark.create({
  name: "fontSize",
  inclusive: true,
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize || null,
        renderHTML: (attrs) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span", getAttrs: (el) => el.style.fontSize ? { fontSize: el.style.fontSize } : false }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setFontSize: (fontSize) => ({ commands }) => commands.setMark(this.name, { fontSize }),
      unsetFontSize: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },
});

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
  { label: "Dark",     bg: "#0d0d0d" },
  { label: "Dim",      bg: "#181818" },
  { label: "Gray",     bg: "#2a2a2a" },
  { label: "Charcoal", bg: "#1a1a1a" },
  { label: "White",    bg: "#f5f5f0" },
  { label: "Beige",    bg: "#e8dcc8" },
  { label: "Stone",    bg: "#d9d9d9" },
  { label: "Ash",      bg: "#e0e0e0" },
];

const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

const DEFAULT_TYPO = { font: "'DM Mono', monospace", size: "15px", theme: THEMES[0], zoom: 1.0 };
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

function SaveIndicator({ status, isLightTheme }) {
  const configs = {
    idle:    { icon: <Cloud size={14} />,                            label: "All changes saved", color: isLightTheme ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.15)" },
    unsaved: { icon: <CloudUpload size={14} />,                      label: "Unsaved changes",   color: isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)" },
    saving:  { icon: <Loader2 size={14} className="animate-spin" />, label: "Saving…",           color: isLightTheme ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"  },
    saved:   { icon: <Cloud size={14} />,                            label: "Saved",             color: isLightTheme ? "#8b5a3c" : "rgba(200,240,76,0.7)"   },
    error:   { icon: <CloudOff size={14} />,                         label: "Save failed",       color: "#ef4444"                },
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

function ToolBtn({ onClick, active, title, children, isLightTheme }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      title={title}
      className="flex items-center justify-center rounded-md transition-all"
      style={{
        width: 28, height: 28, flexShrink: 0,
        background: active ? isLightTheme ? "rgba(212,165,116,0.15)" : "rgba(200,240,76,0.15)" : "transparent",
        color: active ? isLightTheme ? "#8b5a3c" : "#c8f04c" : isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)",
        border: active ? isLightTheme ? "1px solid rgba(212,165,116,0.25)" : "1px solid rgba(200,240,76,0.25)" : "1px solid transparent",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ToolDivider({ isLightTheme }) {
  return <div style={{ width: 1, height: 18, background: isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)", margin: "0 2px", flexShrink: 0 }} />;
}

function FontSelect({ typoFont, onTypoChange, editor, isLightTheme }) {
  return (
    <select
      value={typoFont}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        const v = e.target.value;
        onTypoChange(v);
        editor?.chain().focus().setFontFamily(v).run();
      }}
      className="font-mono text-[11px] rounded-md px-1 focus:outline-none cursor-pointer"
      style={{ background: isLightTheme ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)", border: isLightTheme ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)", color: isLightTheme ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)", height: 28, maxWidth: 80 }}
    >
      {FONTS.map((f) => <option key={f.value} value={f.value} style={{ background: "#111" }}>{f.label}</option>)}
    </select>
  );
}

function FontSizeSelect({ typoSize, editor, isLightTheme }) {
  return (
    <select
      value={typoSize}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        const v = e.target.value;
        editor?.chain().focus().setFontSize(v).run();
      }}
      className="font-mono text-[11px] rounded-md px-1 focus:outline-none cursor-pointer"
      style={{ background: isLightTheme ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)", border: isLightTheme ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)", color: isLightTheme ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)", height: 28 }}
    >
      {FONT_SIZES.map((s) => <option key={s} value={s} style={{ background: "#111" }}>{s}</option>)}
    </select>
  );
}

// ── Zoom Control ──────────────────────────────────────────────────────────────

function ZoomControl({ zoom, onZoomChange, isLightTheme }) {
  const idx = ZOOM_LEVELS.indexOf(zoom);
  const canZoomOut = idx > 0;
  const canZoomIn  = idx < ZOOM_LEVELS.length - 1;

  return (
    <div className="flex items-center gap-0.5">
      <ToolBtn
        onClick={() => canZoomOut && onZoomChange(ZOOM_LEVELS[idx - 1])}
        active={false}
        title="Zoom out"
        isLightTheme={isLightTheme}
      >
        <span style={{ fontSize: 15, fontWeight: 400, lineHeight: 1, marginTop: -1 }}>−</span>
      </ToolBtn>
      <span
        className="font-mono text-[10px] tracking-widest text-center select-none"
        style={{
          width: 36,
          color: isLightTheme ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)",
        }}
      >
        {Math.round(zoom * 100)}%
      </span>
      <ToolBtn
        onClick={() => canZoomIn && onZoomChange(ZOOM_LEVELS[idx + 1])}
        active={false}
        title="Zoom in"
        isLightTheme={isLightTheme}
      >
        <span style={{ fontSize: 15, fontWeight: 400, lineHeight: 1, marginTop: -1 }}>+</span>
      </ToolBtn>
    </div>
  );
}

// ── Formatting Bar ────────────────────────────────────────────────────────────

function FormattingBar({ editor, typo, onTypoChange, bgColor, isLightTheme }) {
  if (!editor) return null;
  return (
    <div
      className="sticky z-10 flex items-center gap-1 px-4 py-2 flex-wrap"
      style={{ top: 57, background: bgColor, borderBottom: isLightTheme ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.06)" }}
    >
      <ToolBtn onClick={() => editor.chain().focus().undo().run()}                            active={false}                                     title="Undo" isLightTheme={isLightTheme}><Undo size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()}                            active={false}                                     title="Redo" isLightTheme={isLightTheme}><Redo size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <FontSelect typoFont={typo.font} onTypoChange={(v) => onTypoChange({ ...typo, font: v })} editor={editor} isLightTheme={isLightTheme} />
      <FontSizeSelect typoSize={typo.size} editor={editor} isLightTheme={isLightTheme} />
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()}                            active={editor.isActive("bold")}                   title="Bold" isLightTheme={isLightTheme}><Bold size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()}                          active={editor.isActive("italic")}                 title="Italic" isLightTheme={isLightTheme}><Italic size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()}                       active={editor.isActive("underline")}              title="Underline" isLightTheme={isLightTheme}><UnderlineIcon size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()}                            active={editor.isActive("code")}                   title="Code" isLightTheme={isLightTheme}><Code size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}             active={editor.isActive("heading", { level: 1 })} title="Heading 1" isLightTheme={isLightTheme}><Heading1 size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}             active={editor.isActive("heading", { level: 2 })} title="Heading 2" isLightTheme={isLightTheme}><Heading2 size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()}                      active={editor.isActive("bulletList")}             title="Bullet list" isLightTheme={isLightTheme}><List size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()}                     active={editor.isActive("orderedList")}            title="Numbered list" isLightTheme={isLightTheme}><ListOrdered size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()}                      active={editor.isActive("blockquote")}             title="Blockquote" isLightTheme={isLightTheme}><Quote size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()}                    active={editor.isActive({ textAlign: "left" })}    title="Left" isLightTheme={isLightTheme}><AlignLeft size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()}                  active={editor.isActive({ textAlign: "center" })}  title="Center" isLightTheme={isLightTheme}><AlignCenter size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()}                   active={editor.isActive({ textAlign: "right" })}   title="Right" isLightTheme={isLightTheme}><AlignRight size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()}                 active={editor.isActive({ textAlign: "justify" })} title="Justify" isLightTheme={isLightTheme}><AlignJustify size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()}                     active={false}                                     title="Divider" isLightTheme={isLightTheme}><Minus size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      {/* Theme swatches */}
      <div className="flex items-center gap-1 ml-1">
        {THEMES.map((t) => (
          <button
            key={t.label}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onTypoChange({ ...typo, theme: t }); }}
            title={t.label}
            className="rounded-md transition-all"
            style={{
              width: 18, height: 18,
              background: t.bg,
              border: typo.theme.label === t.label ? isLightTheme ? "1.5px solid #8b5a3c" : "1.5px solid #c8f04c" : isLightTheme ? "1.5px solid rgba(0,0,0,0.25)" : "1.5px solid rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
      <ToolDivider isLightTheme={isLightTheme} />
      {/* Zoom control */}
      <ZoomControl
        zoom={typo.zoom}
        onZoomChange={(z) => onTypoChange({ ...typo, zoom: z })}
        isLightTheme={isLightTheme}
      />
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-2xl border border-white/10 p-6 w-80" style={{ background: "#111" }}>
        <p className="font-mono text-sm text-white/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors cursor-pointer">CANCEL</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg font-mono text-xs tracking-widest cursor-pointer" style={{ background: "#ef4444", color: "white" }}>DELETE</button>
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
  const [, forceUpdate] = useState(0);

  const journalIdRef     = useRef(journal?.id || null);
  const autosaveTimerRef = useRef(null);
  const savedTimerRef    = useRef(null);
  const editorReadyRef   = useRef(false);
  const titleMountedRef  = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Typography,
      FontFamilyMark,
      FontSizeMark,
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
      setTimeout(() => { editorReadyRef.current = true; }, 50);
    },
    onUpdate: () => {
      if (!editorReadyRef.current) return;
      forceUpdate(n => n + 1);
      scheduleAutosave();
    },
    onSelectionUpdate: () => {
      forceUpdate(n => n + 1);
    },
  });

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
        await updateJournal(journalIdRef.current, { title: title.trim(), content: isEmpty ? "" : content });
      } else {
        const created = await createJournal({ title: title.trim(), content: isEmpty ? "" : content });
        journalIdRef.current = created.id;
      }
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
    }
  }

  useEffect(() => {
    if (!titleMountedRef.current) { titleMountedRef.current = true; return; }
    if (!title && !journalIdRef.current) return;
    scheduleAutosave();
  }, [title]);

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

  const isLightTheme = typo.theme.label === "White" || typo.theme.label === "Beige" || typo.theme.label === "Stone" || typo.theme.label === "Ash";
  const textColor = isLightTheme ? "#2a2a2a" : "rgba(255,255,255,0.78)";
  const headingColor = isLightTheme ? "#1a1a1a" : "rgba(255,255,255,0.95)";
  const placeholderColor = isLightTheme ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.15)";
  const caretColor = isLightTheme ? "#d4a574" : "#c8f04c";
  const codeBackground = isLightTheme ? "rgba(212,165,116,0.1)" : "rgba(200,240,76,0.08)";
  const codeColor = isLightTheme ? "#8b5a3c" : "#c8f04c";
  const blockquoteColor = isLightTheme ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)";
  const blockquoteBorder = isLightTheme ? "rgba(212,165,116,0.35)" : "rgba(200,240,76,0.35)";

  // For zoom < 1, we need to compensate the lost height so the page doesn't
  // appear cropped. For zoom > 1, we add extra bottom margin so content isn't clipped.
  const zoomCompensation = typo.zoom !== 1.0
    ? `calc((${typo.zoom} - 1) * 60vh)`
    : undefined;

  return (
    <div className="flex flex-col transition-colors duration-300" style={{ background: typo.theme.bg, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');

        .chalk-title {
          font-family: 'DM Mono', monospace !important;
          font-size: 1.5rem !important;
          color: ${isLightTheme ? "#2a2a2a" : "rgba(255,255,255,0.9)"} !important;
        }

        .chalk-editor {
          font-family: ${typo.font};
          font-size: ${typo.size};
          line-height: 1.75;
          color: ${textColor};
          caret-color: ${caretColor};
          min-height: 60vh;
        }
        .chalk-editor > * + * { margin-top: 0.6em; }
        .chalk-editor p { margin: 0; }
        .chalk-editor h1 { font-size: 1.8em; font-weight: 500; color: ${headingColor}; line-height: 1.2; }
        .chalk-editor h2 { font-size: 1.3em; font-weight: 500; color: ${isLightTheme ? "#1a1a1a" : "rgba(255,255,255,0.9)"}; }
        .chalk-editor h3 { font-size: 1.1em; font-weight: 500; color: ${isLightTheme ? "#1a1a1a" : "rgba(255,255,255,0.85)"}; }
        .chalk-editor ul { padding-left: 1.4em; list-style: disc; }
        .chalk-editor ol { padding-left: 1.4em; list-style: decimal; }
        .chalk-editor li + li { margin-top: 0.2em; }
        .chalk-editor blockquote { border-left: 2px solid ${blockquoteBorder}; padding-left: 1em; color: ${blockquoteColor}; font-style: italic; }
        .chalk-editor hr { border: none; border-top: 1px solid ${isLightTheme ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}; }
        .chalk-editor pre { background: ${isLightTheme ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.04)"}; border: 1px solid ${isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.07)"}; border-radius: 8px; padding: 1em; font-family: 'Courier New', monospace; font-size: 0.85em; }
        .chalk-editor code { background: ${codeBackground}; color: ${codeColor}; border-radius: 4px; padding: 0.1em 0.4em; font-family: 'Courier New', monospace; font-size: 0.85em; }
        .chalk-editor pre code { background: none; color: ${isLightTheme ? "#1a1a1a" : "rgba(255,255,255,0.7)"}; padding: 0; }
        .chalk-editor strong { color: ${isLightTheme ? "#1a1a1a" : "rgba(255,255,255,0.95)"}; font-weight: 600; }
        .chalk-editor em { font-style: italic; }
        .chalk-editor u { text-decoration: underline; text-underline-offset: 3px; }
        .chalk-editor span[style*="font-family"] { font-family: inherit; }
        .chalk-editor span[style*="font-size"] { font-size: inherit; }
        .chalk-editor span[style] { font-family: unset; font-size: unset; }
        .chalk-editor .is-editor-empty:first-child::before,
        .chalk-editor .is-empty::before { content: attr(data-placeholder); color: ${placeholderColor}; pointer-events: none; float: left; height: 0; }
        .chalk-editor ::selection { background: ${isLightTheme ? "rgba(212,165,116,0.2)" : "rgba(200,240,76,0.2)"}; }
      `}</style>

      {/* Top bar */}
      <div
        className="flex items-center px-6 py-4 border-b sticky top-0 z-20 transition-colors duration-300"
        style={{ background: typo.theme.bg, borderColor: isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)", height: 57, gap: 16 }}
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-2 font-mono text-xs tracking-widest transition-colors shrink-0"
          style={{ color: isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)" }}
          onMouseEnter={e => e.currentTarget.style.color = isLightTheme ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.7)"}
          onMouseLeave={e => e.currentTarget.style.color = isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)"}
        >
          <ArrowLeft size={14} /> JOURNALS
        </button>
        <div style={{ flex: 1 }} />
        <SaveIndicator status={saveStatus} isLightTheme={isLightTheme} />
      </div>

      {/* Formatting bar */}
      <FormattingBar editor={editor} typo={typo} onTypoChange={setTypo} bgColor={typo.theme.bg} isLightTheme={isLightTheme} />

      {/* Editor body — zoom applied here only, toolbar/topbar unaffected */}
      <div
        className="max-w-2xl mx-auto w-full px-6 py-10"
        style={{
          transform: `scale(${typo.zoom})`,
          transformOrigin: "top center",
          marginBottom: zoomCompensation,
        }}
      >
        {/* Title — hardcoded to DM Mono via chalk-title class */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry title (optional)"
          className="chalk-title w-full bg-transparent focus:outline-none mb-6 border-none"
          style={{ color: isLightTheme ? "#2a2a2a" : "rgba(255,255,255,0.9)", caretColor: caretColor }}
        />

        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px" style={{ background: isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)" }} />
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.2)" }}>
            {isEdit
              ? `Last edited ${formatDate(journal.updated_at)} · ${formatTime(journal.updated_at)}`
              : formatDate(new Date().toISOString())}
          </span>
          <div className="flex-1 h-px" style={{ background: isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)" }} />
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
      className="group relative rounded-2xl border border-white/8 hover:border-white/20 transition-all duration-200 overflow-hidden cursor-pointer"
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
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-white/20">
            <Clock size={10} />
            <span className="font-mono text-[10px]">{formatDate(journal.created_at)}</span>
            <span className="font-mono text-[10px]">·</span>
            <span className="font-mono text-[10px]">{formatTime(journal.created_at)}</span>
          </div>
          {edited && (
            <div className="flex items-center gap-1.5 text-white/20">
              <Pencil size={10} />
              <span className="font-mono text-[10px]">{formatDate(journal.updated_at)}</span>
              <span className="font-mono text-[10px]">·</span>
              <span className="font-mono text-[10px]">{formatTime(journal.updated_at)}</span>
            </div>
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