import { useState, useEffect, useCallback, useRef } from "react";
import {
  BookOpen, Plus, Pencil, Trash2, X, Loader2, AlertTriangle,
  ArrowLeft, Clock, Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Code, Heading1, Heading2,
  Cloud, CloudOff, CloudUpload, Undo, Redo,
  Folder, FolderPlus, ChevronDown, ChevronRight,
  Move, RotateCcw, Trash,
} from "lucide-react";
import { useEditor, EditorContent, Mark, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { supabase } from "../lib/supabase";
import { createJournal, updateJournal } from "../lib/journals";

// ── Custom marks ──────────────────────────────────────────────────────────────

const FontFamilyMark = Mark.create({
  name: "fontFamily",
  addAttributes() { return { fontFamily: { default: null, parseHTML: (el) => el.style.fontFamily || null, renderHTML: (attrs) => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {} } }; },
  parseHTML() { return [{ tag: "span", getAttrs: (el) => el.style.fontFamily ? { fontFamily: el.style.fontFamily } : false }]; },
  renderHTML({ HTMLAttributes }) { return ["span", mergeAttributes(HTMLAttributes), 0]; },
  addCommands() { return { setFontFamily: (v) => ({ commands }) => commands.setMark(this.name, { fontFamily: v }), unsetFontFamily: () => ({ commands }) => commands.unsetMark(this.name) }; },
});

const FontSizeMark = Mark.create({
  name: "fontSize",
  inclusive: true,
  addAttributes() { return { fontSize: { default: null, parseHTML: (el) => el.style.fontSize || null, renderHTML: (attrs) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {} } }; },
  parseHTML() { return [{ tag: "span", getAttrs: (el) => el.style.fontSize ? { fontSize: el.style.fontSize } : false }]; },
  renderHTML({ HTMLAttributes }) { return ["span", mergeAttributes(HTMLAttributes), 0]; },
  addCommands() { return { setFontSize: (v) => ({ commands }) => commands.setMark(this.name, { fontSize: v }), unsetFontSize: () => ({ commands }) => commands.unsetMark(this.name) }; },
});

// ── Constants ─────────────────────────────────────────────────────────────────

const JOURNAL_QUOTES = [
  "The unexamined life is not worth living.",
  "Write what should not be forgotten.",
  "Journal writing is a voyage to the interior.",
  "Fill your paper with the breathings of your heart.",
  "A journal is your completely unaltered voice.",
];

const FONTS = [
  { label: "Mono",    value: "'DM Mono', monospace" },
  { label: "Serif",   value: "Georgia, serif" },
  { label: "Sans",    value: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Courier", value: "'Courier New', monospace" },
];
const FONT_SIZES = ["12px", "14px", "16px", "18px", "22px", "28px"];
const THEMES = [
  { label: "Dark",     bg: "#0d0d0d" }, { label: "Dim",      bg: "#181818" },
  { label: "Gray",     bg: "#2a2a2a" }, { label: "Charcoal", bg: "#1a1a1a" },
  { label: "White",    bg: "#f5f5f0" }, { label: "Beige",    bg: "#e8dcc8" },
  { label: "Stone",    bg: "#d9d9d9" }, { label: "Ash",      bg: "#e0e0e0" },
];
const ZOOM_LEVELS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const FOLDER_COLORS = ["#c8f04c","#60a5fa","#f97316","#ef4444","#a78bfa","#34d399","#f472b6","#fbbf24"];
const FOLDER_ICONS  = ["folder","book","star","heart","lock","sun","moon","zap"];

const DEFAULT_TYPO = { font: "'DM Mono', monospace", size: "15px", theme: THEMES[0], zoom: 1.0 };
const AUTOSAVE_DELAY = 2000;

function randomQuote() { return JOURNAL_QUOTES[Math.floor(Math.random() * JOURNAL_QUOTES.length)]; }
function formatDate(iso) { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function formatTime(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function wasEdited(j) { return j.updated_at && j.created_at && new Date(j.updated_at) - new Date(j.created_at) > 2000; }
function excerpt(content, len = 120) {
  if (!content) return "";
  const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > len ? plain.slice(0, len) + "…" : plain;
}

// ── Data helpers ──────────────────────────────────────────────────────────────

async function getJournals() {
  const { data, error } = await supabase.from("journals").select("*").is("deleted_at", null).order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function getDeletedJournals() {
  const { data, error } = await supabase.from("journals").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function softDeleteJournal(id) {
  const { error } = await supabase.from("journals").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

async function restoreJournal(id) {
  const { error } = await supabase.from("journals").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

async function permanentDeleteJournal(id) {
  const { error } = await supabase.from("journals").delete().eq("id", id);
  if (error) throw error;
}

async function getFolders() {
  const { data, error } = await supabase.from("journal_folders").select("*").is("deleted_at", null).order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

async function getDeletedFolders() {
  const { data, error } = await supabase.from("journal_folders").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function createFolder(form) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("journal_folders").insert({ user_id: user.id, ...form }).select().single();
  if (error) throw error;
  return data;
}

async function updateFolder(id, form) {
  const { data, error } = await supabase.from("journal_folders").update(form).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function softDeleteFolder(id) {
  // Soft-delete the folder — journals keep their folder_id so they restore with it
  const { error } = await supabase.from("journal_folders").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

async function restoreFolder(id) {
  const { error } = await supabase.from("journal_folders").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

async function permanentDeleteFolder(id) {
  // Orphan journals first so they don't disappear, then hard delete
  await supabase.from("journals").update({ folder_id: null }).eq("folder_id", id);
  const { error } = await supabase.from("journal_folders").delete().eq("id", id);
  if (error) throw error;
}

async function moveJournalToFolder(journalId, folderId) {
  const { error } = await supabase.from("journals").update({ folder_id: folderId }).eq("id", journalId);
  if (error) throw error;
}

// ── Icon renderer ─────────────────────────────────────────────────────────────

function FolderIcon({ icon, size = 14, color }) {
  const props = { size, style: { color } };
  switch (icon) {
    case "book":  return <BookOpen {...props} />;
    case "star":  return <span style={{ fontSize: size, color }}>★</span>;
    case "heart": return <span style={{ fontSize: size, color }}>♥</span>;
    case "lock":  return <span style={{ fontSize: size, color }}>🔒</span>;
    case "sun":   return <span style={{ fontSize: size, color }}>☀</span>;
    case "moon":  return <span style={{ fontSize: size, color }}>☽</span>;
    case "zap":   return <span style={{ fontSize: size, color }}>⚡</span>;
    default:      return <Folder {...props} />;
  }
}

// ── Section label (matches UNCATEGORIZED style) ───────────────────────────────

function SectionLabel({ icon, label, count, color, action }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-3">
      {icon}
      <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: color || "rgba(255,255,255,0.2)" }}>{label}</span>
      {count !== undefined && <span className="font-mono text-[10px]" style={{ color: color ? `${color}60` : "rgba(255,255,255,0.15)" }}>{count}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

// ── Save Indicator ────────────────────────────────────────────────────────────

function SaveIndicator({ status, isLightTheme }) {
  const configs = {
    idle:    { icon: <Cloud size={14} />,                            label: "All changes saved", color: isLightTheme ? "rgba(0,0,0,0.2)"  : "rgba(255,255,255,0.15)" },
    unsaved: { icon: <CloudUpload size={14} />,                      label: "Unsaved changes",   color: isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)" },
    saving:  { icon: <Loader2 size={14} className="animate-spin" />, label: "Saving…",           color: isLightTheme ? "rgba(0,0,0,0.3)"  : "rgba(255,255,255,0.3)"  },
    saved:   { icon: <Cloud size={14} />,                            label: "Saved",             color: isLightTheme ? "#8b5a3c"          : "rgba(200,240,76,0.7)"   },
    error:   { icon: <CloudOff size={14} />,                         label: "Save failed",       color: "#ef4444" },
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

// ── Toolbar ───────────────────────────────────────────────────────────────────

function ToolBtn({ onClick, active, title, children, isLightTheme }) {
  return (
    <button onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} title={title}
      className="flex items-center justify-center rounded-md transition-all"
      style={{ width: 28, height: 28, flexShrink: 0, cursor: "pointer",
        background: active ? isLightTheme ? "rgba(212,165,116,0.15)" : "rgba(200,240,76,0.15)" : "transparent",
        color: active ? isLightTheme ? "#8b5a3c" : "#c8f04c" : isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)",
        border: active ? isLightTheme ? "1px solid rgba(212,165,116,0.25)" : "1px solid rgba(200,240,76,0.25)" : "1px solid transparent",
      }}>{children}</button>
  );
}
function ToolDivider({ isLightTheme }) { return <div style={{ width: 1, height: 18, background: isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)", margin: "0 2px", flexShrink: 0 }} />; }

function FontSelect({ typoFont, onTypoChange, editor, isLightTheme }) {
  const active = editor?.getAttributes("fontFamily")?.fontFamily || typoFont;
  return (
    <select value={active} onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => { onTypoChange(e.target.value); editor?.chain().focus().setFontFamily(e.target.value).run(); }}
      className="font-mono text-[11px] rounded-md px-1 focus:outline-none cursor-pointer"
      style={{ background: isLightTheme ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)", border: isLightTheme ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)", color: isLightTheme ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)", height: 28, maxWidth: 80 }}>
      {FONTS.map((f) => <option key={f.value} value={f.value} style={{ background: "#111" }}>{f.label}</option>)}
    </select>
  );
}

function FontSizeSelect({ typoSize, editor, isLightTheme }) {
  const active = editor?.getAttributes("fontSize")?.fontSize || typoSize;
  return (
    <select value={active} onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => { editor?.chain().focus().setFontSize(e.target.value).run(); }}
      className="font-mono text-[11px] rounded-md px-1 focus:outline-none cursor-pointer"
      style={{ background: isLightTheme ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)", border: isLightTheme ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.1)", color: isLightTheme ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)", height: 28 }}>
      {FONT_SIZES.map((s) => <option key={s} value={s} style={{ background: "#111" }}>{s}</option>)}
    </select>
  );
}

function ZoomControl({ zoom, onZoomChange, isLightTheme }) {
  const idx = ZOOM_LEVELS.indexOf(zoom);
  return (
    <div className="flex items-center gap-0.5">
      <ToolBtn onClick={() => idx > 0 && onZoomChange(ZOOM_LEVELS[idx - 1])} active={false} title="Zoom out" isLightTheme={isLightTheme}><span style={{ fontSize: 15, fontWeight: 400, lineHeight: 1, marginTop: -1 }}>−</span></ToolBtn>
      <span className="font-mono text-[10px] tracking-widest text-center select-none" style={{ width: 36, color: isLightTheme ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)" }}>{Math.round(zoom * 100)}%</span>
      <ToolBtn onClick={() => idx < ZOOM_LEVELS.length - 1 && onZoomChange(ZOOM_LEVELS[idx + 1])} active={false} title="Zoom in" isLightTheme={isLightTheme}><span style={{ fontSize: 15, fontWeight: 400, lineHeight: 1, marginTop: -1 }}>+</span></ToolBtn>
    </div>
  );
}

function FormattingBar({ editor, typo, onTypoChange, bgColor, isLightTheme }) {
  if (!editor) return null;
  return (
    <div className="sticky z-10 flex items-center gap-1 px-4 py-2 flex-wrap"
      style={{ top: 57, background: bgColor, borderBottom: isLightTheme ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.06)" }}>
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo" isLightTheme={isLightTheme}><Undo size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo" isLightTheme={isLightTheme}><Redo size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <FontSelect typoFont={typo.font} onTypoChange={(v) => onTypoChange({ ...typo, font: v })} editor={editor} isLightTheme={isLightTheme} />
      <FontSizeSelect typoSize={typo.size} editor={editor} isLightTheme={isLightTheme} />
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold" isLightTheme={isLightTheme}><Bold size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic" isLightTheme={isLightTheme}><Italic size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline" isLightTheme={isLightTheme}><UnderlineIcon size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Code" isLightTheme={isLightTheme}><Code size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1" isLightTheme={isLightTheme}><Heading1 size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2" isLightTheme={isLightTheme}><Heading2 size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet" isLightTheme={isLightTheme}><List size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered" isLightTheme={isLightTheme}><ListOrdered size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote" isLightTheme={isLightTheme}><Quote size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Left" isLightTheme={isLightTheme}><AlignLeft size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center" isLightTheme={isLightTheme}><AlignCenter size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Right" isLightTheme={isLightTheme}><AlignRight size={13} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justify" isLightTheme={isLightTheme}><AlignJustify size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider" isLightTheme={isLightTheme}><Minus size={13} /></ToolBtn>
      <ToolDivider isLightTheme={isLightTheme} />
      <div className="flex items-center gap-1 ml-1">
        {THEMES.map((t) => (
          <button key={t.label} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onTypoChange({ ...typo, theme: t }); }} title={t.label} className="rounded-md transition-all"
            style={{ width: 18, height: 18, background: t.bg, border: typo.theme.label === t.label ? isLightTheme ? "1.5px solid #8b5a3c" : "1.5px solid #c8f04c" : isLightTheme ? "1.5px solid rgba(0,0,0,0.25)" : "1.5px solid rgba(255,255,255,0.15)" }} />
        ))}
      </div>
      <ToolDivider isLightTheme={isLightTheme} />
      <ZoomControl zoom={typo.zoom} onZoomChange={(z) => onTypoChange({ ...typo, zoom: z })} isLightTheme={isLightTheme} />
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = "DELETE", confirmColor = "#ef4444" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={(e) => e.stopPropagation()}>
      <div className="rounded-2xl border border-white/10 p-6 w-80" style={{ background: "#111" }}>
        <p className="font-mono text-sm text-white/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors cursor-pointer">CANCEL</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg font-mono text-xs tracking-widest cursor-pointer" style={{ background: confirmColor, color: "white" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Move to Folder Modal ──────────────────────────────────────────────────────

function MoveToFolderModal({ journal, folders, onMove, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={(e) => e.stopPropagation()}>
      <div className="rounded-2xl border border-white/10 w-80 overflow-hidden" style={{ background: "#111" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <span className="font-mono text-xs tracking-widest text-white/60 uppercase">Move to Folder</span>
          <button onClick={onCancel} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"><X size={14} /></button>
        </div>
        <div className="py-2 max-h-64 overflow-y-auto">
          <button onClick={() => onMove(null)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left cursor-pointer">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}><BookOpen size={12} className="text-white/40" /></div>
            <span className="font-mono text-xs text-white/50">Uncategorized</span>
            {journal.folder_id === null && <span className="ml-auto font-mono text-[9px] text-white/25">current</span>}
          </button>
          {folders.map((folder) => (
            <button key={folder.id} onClick={() => onMove(folder.id)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left cursor-pointer">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${folder.color}15` }}><FolderIcon icon={folder.icon} size={12} color={folder.color} /></div>
              <span className="font-mono text-xs text-white/70">{folder.name}</span>
              {journal.folder_id === folder.id && <span className="ml-auto font-mono text-[9px] text-white/25">current</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Folder Modal ──────────────────────────────────────────────────────────────

function FolderModal({ folder, onClose, onSave }) {
  const isEdit = !!folder?.id;
  const [form, setForm] = useState({ name: folder?.name || "", color: folder?.color || "#c8f04c", icon: folder?.icon || "folder" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!form.name.trim()) return setError("Name is required");
    setSaving(true);
    setError("");
    try {
      if (isEdit) await updateFolder(folder.id, form);
      else await createFolder(form);
      onSave();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="relative w-full max-w-sm mx-4 rounded-2xl border border-white/10 overflow-hidden" style={{ background: "#111" }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
          <h2 className="font-mono text-sm tracking-widest text-white/80 uppercase">{isEdit ? "Edit Folder" : "New Folder"}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-1.5">Folder Name</label>
            <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(""); }} placeholder="My folder..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-[#c8f04c]/50 transition-colors" />
            {error && <p className="font-mono text-[10px] text-red-400 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className="w-7 h-7 rounded-lg transition-all cursor-pointer"
                  style={{ background: c, outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: 2, opacity: form.color === c ? 1 : 0.5 }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block font-mono text-[10px] tracking-widest text-white/40 uppercase mb-2">Icon</label>
            <div className="flex gap-2 flex-wrap">
              {FOLDER_ICONS.map((ic) => (
                <button key={ic} onClick={() => setForm({ ...form, icon: ic })} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                  style={{ background: form.icon === ic ? `${form.color}20` : "rgba(255,255,255,0.05)", border: form.icon === ic ? `1px solid ${form.color}50` : "1px solid rgba(255,255,255,0.08)" }}>
                  <FolderIcon icon={ic} size={14} color={form.icon === ic ? form.color : "rgba(255,255,255,0.4)"} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${form.color}20` }}>
              <FolderIcon icon={form.icon} size={14} color={form.color} />
            </div>
            <span className="font-mono text-sm" style={{ color: form.color }}>{form.name || "Folder name"}</span>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-white/40 font-mono text-xs tracking-widest hover:text-white/60 transition-colors cursor-pointer">CANCEL</button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="px-5 py-2 rounded-lg font-mono text-xs tracking-widest transition-all disabled:opacity-30 flex items-center gap-2 cursor-pointer"
            style={{ background: form.name.trim() ? "#c8f04c" : "#444", color: "#0d0d0d" }}>
            {saving && <Loader2 size={12} className="animate-spin" />}
            {isEdit ? "SAVE" : "CREATE"}
          </button>
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
  const journalIdRef = useRef(journal?.id || null);
  const autosaveTimerRef = useRef(null);
  const savedTimerRef = useRef(null);
  const editorReadyRef = useRef(false);
  const titleMountedRef = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Typography, FontFamilyMark, FontSizeMark,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: ({ node }) => node.type.name === "heading" ? "Heading…" : "Start writing…" })],
    content: journal?.content || "",
    editorProps: { attributes: { class: "chalk-editor focus:outline-none" } },
    onCreate: () => { setTimeout(() => { editorReadyRef.current = true; }, 50); },
    onUpdate: () => { if (!editorReadyRef.current) return; forceUpdate(n => n + 1); scheduleAutosave(); },
    onSelectionUpdate: () => { forceUpdate(n => n + 1); },
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
    } catch { setSaveStatus("error"); }
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
    if (autosaveTimerRef.current) { clearTimeout(autosaveTimerRef.current); performSave().finally(() => onClose()); }
    else onClose();
  }

  const isLightTheme = ["White", "Beige", "Stone", "Ash"].includes(typo.theme.label);
  const textColor = isLightTheme ? "#2a2a2a" : "rgba(255,255,255,0.78)";
  const headingColor = isLightTheme ? "#1a1a1a" : "rgba(255,255,255,0.95)";
  const placeholderColor = isLightTheme ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.15)";
  const caretColor = isLightTheme ? "#d4a574" : "#c8f04c";
  const codeBackground = isLightTheme ? "rgba(212,165,116,0.1)" : "rgba(200,240,76,0.08)";
  const codeColor = isLightTheme ? "#8b5a3c" : "#c8f04c";
  const blockquoteColor = isLightTheme ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)";
  const blockquoteBorder = isLightTheme ? "rgba(212,165,116,0.35)" : "rgba(200,240,76,0.35)";
  const zoomCompensation = typo.zoom !== 1.0 ? `calc((${typo.zoom} - 1) * 60vh)` : undefined;

  return (
    <div className="flex flex-col transition-colors duration-300" style={{ background: typo.theme.bg, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        .chalk-title { font-family: 'DM Mono', monospace !important; font-size: 1.5rem !important; color: ${isLightTheme ? "#2a2a2a" : "rgba(255,255,255,0.9)"} !important; }
        .chalk-editor { font-family: ${typo.font}; font-size: ${typo.size}; line-height: 1.75; color: ${textColor}; caret-color: ${caretColor}; min-height: 60vh; }
        .chalk-editor > * + * { margin-top: 0.6em; }
        .chalk-editor p { margin: 0; }
        .chalk-editor h1 { font-size: 1.8em; font-weight: 500; color: ${headingColor}; line-height: 1.2; }
        .chalk-editor h2 { font-size: 1.3em; font-weight: 500; color: ${isLightTheme ? "#1a1a1a" : "rgba(255,255,255,0.9)"}; }
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
        .chalk-editor .is-editor-empty:first-child::before, .chalk-editor .is-empty::before { content: attr(data-placeholder); color: ${placeholderColor}; pointer-events: none; float: left; height: 0; }
        .chalk-editor ::selection { background: ${isLightTheme ? "rgba(212,165,116,0.2)" : "rgba(200,240,76,0.2)"}; }
      `}</style>
      <div className="flex items-center px-6 py-4 border-b sticky top-0 z-20 transition-colors duration-300"
        style={{ background: typo.theme.bg, borderColor: isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)", height: 57, gap: 16 }}>
        <button onClick={handleBack} className="flex items-center gap-2 font-mono text-xs tracking-widest transition-colors shrink-0"
          style={{ color: isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)" }}
          onMouseEnter={e => e.currentTarget.style.color = isLightTheme ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.7)"}
          onMouseLeave={e => e.currentTarget.style.color = isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)"}>
          <ArrowLeft size={14} /> JOURNALS
        </button>
        <div style={{ flex: 1 }} />
        <SaveIndicator status={saveStatus} isLightTheme={isLightTheme} />
      </div>
      <FormattingBar editor={editor} typo={typo} onTypoChange={setTypo} bgColor={typo.theme.bg} isLightTheme={isLightTheme} />
      <div className="max-w-2xl mx-auto w-full px-6 py-10"
        style={{ transform: `scale(${typo.zoom})`, transformOrigin: "top center", marginBottom: zoomCompensation }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Entry title (optional)"
          className="chalk-title w-full bg-transparent focus:outline-none mb-6 border-none" style={{ caretColor }} />
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px" style={{ background: isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)" }} />
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: isLightTheme ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.2)" }}>
            {isEdit ? `Last edited ${formatDate(journal.updated_at)} · ${formatTime(journal.updated_at)}` : formatDate(new Date().toISOString())}
          </span>
          <div className="flex-1 h-px" style={{ background: isLightTheme ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)" }} />
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── Journal Card ──────────────────────────────────────────────────────────────

function JournalCard({ journal, folders, onEdit, onSoftDelete, onMove, onDragStart, onDragEnd }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const hasTitle = journal.title?.trim().length > 0;
  const edited = wasEdited(journal);

  return (
    <>
      <div
        className="group relative rounded-2xl border border-white/8 hover:border-white/20 transition-all duration-200 overflow-hidden cursor-pointer"
        style={{ background: "#111" }}
        onClick={() => onEdit(journal)}
        draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(journal.id); }}
        onDragEnd={onDragEnd}
      >
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "rgba(200,240,76,0.25)" }} />
        <div className="px-5 py-4 pl-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-mono text-sm text-white leading-snug flex-1 min-w-0 truncate">
              {hasTitle ? journal.title : <span className="text-white/30 italic">Untitled</span>}
            </h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowMove(true)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all cursor-pointer" title="Move to folder"><Move size={11} /></button>
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
            message={`Move "${hasTitle ? journal.title : "this entry"}" to Recently Deleted?`}
            confirmLabel="DELETE"
            onConfirm={() => { setShowConfirm(false); onSoftDelete(journal.id); }}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
      {showMove && (
        <MoveToFolderModal
          journal={journal} folders={folders}
          onMove={(folderId) => { setShowMove(false); onMove(journal.id, folderId); }}
          onCancel={() => setShowMove(false)}
        />
      )}
    </>
  );
}

// ── Deleted Journal Card ──────────────────────────────────────────────────────

function DeletedJournalCard({ journal, onRestore, onPermanentDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const hasTitle = journal.title?.trim().length > 0;

  return (
    <>
      <div className="group relative rounded-2xl border border-white/6 overflow-hidden" style={{ background: "#0f0f0f" }}>
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "rgba(239,68,68,0.2)" }} />
        <div className="px-5 py-3 pl-6 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm text-white/40 truncate">{hasTitle ? journal.title : <span className="italic">Untitled</span>}</p>
            <p className="font-mono text-[10px] text-white/20 mt-0.5">
              Deleted {formatDate(journal.deleted_at)} · {formatTime(journal.deleted_at)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onRestore(journal.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all hover:opacity-90 cursor-pointer"
              style={{ background: "rgba(200,240,76,0.08)", border: "1px solid rgba(200,240,76,0.15)", color: "#c8f04c" }}
            >
              <RotateCcw size={10} /> RESTORE
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all cursor-pointer"
              title="Permanently delete"
            >
              <Trash size={11} />
            </button>
          </div>
        </div>
      </div>
      {showConfirm && (
        <ConfirmModal
          message={`Permanently delete "${hasTitle ? journal.title : "this entry"}"? This cannot be undone.`}
          confirmLabel="PERMANENTLY DELETE"
          confirmColor="#ef4444"
          onConfirm={() => { setShowConfirm(false); onPermanentDelete(journal.id); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// ── Uncategorized Section (collapsible) ──────────────────────────────────────

function UncategorizedSection({ journals, folders, onEdit, onSoftDelete, onMove, dragOverFolderId, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd }) {
  const [open, setOpen] = useState(true);
  const isDragOver = dragOverFolderId === "uncategorized";

  return (
    <div className="mb-6">
      <div
        className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl transition-all"
        style={{ background: isDragOver ? "rgba(255,255,255,0.04)" : "transparent", border: isDragOver ? "1px solid rgba(255,255,255,0.12)" : "1px solid transparent" }}
        onDragOver={(e) => { e.preventDefault(); onDragOver("uncategorized"); }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { e.preventDefault(); onDrop(null); }}
      >
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
          {open
            ? <ChevronDown size={10} className="text-white/20 shrink-0" />
            : <ChevronRight size={10} className="text-white/20 shrink-0" />
          }
          <BookOpen size={10} className="text-white/20" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-white/20">Uncategorized</span>
          <span className="font-mono text-[10px] text-white/15">{journals.length}</span>
        </button>
      </div>

      {open && (
        <div className="space-y-2 pl-3">
          {journals.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-6 text-center transition-all"
              style={{ borderColor: isDragOver ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)", background: isDragOver ? "rgba(255,255,255,0.03)" : "transparent" }}
              onDragOver={(e) => { e.preventDefault(); onDragOver("uncategorized"); }}
              onDragLeave={onDragLeave}
              onDrop={(e) => { e.preventDefault(); onDrop(null); }}
            >
              <p className="font-mono text-[10px] text-white/15 tracking-widest">{isDragOver ? "Drop here" : "No uncategorized entries"}</p>
            </div>
          ) : (
            journals.map((journal) => (
              <JournalCard
                key={journal.id} journal={journal} folders={folders}
                onEdit={onEdit} onSoftDelete={onSoftDelete} onMove={onMove}
                onDragStart={onDragStart} onDragEnd={onDragEnd}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Folder Section ────────────────────────────────────────────────────────────

function FolderSection({ folder, journals, folders, onEdit, onSoftDelete, onDeleteFolder, onEditFolder, onMove, dragOverFolderId, onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd }) {
  const [open, setOpen] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const isDragOver = dragOverFolderId === folder.id;

  return (
    <div className="mb-6">
      {/* Folder header — same style as SectionLabel */}
      <div
        className="flex items-center gap-2 px-3 py-2 mb-3 group/folder rounded-xl transition-all"
        style={{ background: isDragOver ? `${folder.color}10` : "transparent", border: isDragOver ? `1px solid ${folder.color}30` : "1px solid transparent" }}
        onDragOver={(e) => { e.preventDefault(); onDragOver(folder.id); }}
        onDragLeave={onDragLeave}
        onDrop={(e) => { e.preventDefault(); onDrop(folder.id); }}
      >
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
          {open
            ? <ChevronDown size={10} style={{ color: folder.color, opacity: 0.7, flexShrink: 0 }} />
            : <ChevronRight size={10} style={{ color: folder.color, opacity: 0.7, flexShrink: 0 }} />
          }
          <FolderIcon icon={folder.icon} size={10} color={folder.color} />
          <span className="font-mono text-[10px] tracking-widest uppercase truncate" style={{ color: folder.color }}>{folder.name}</span>
          <span className="font-mono text-[10px]" style={{ color: `${folder.color}60` }}>{journals.length}</span>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-opacity ml-auto">
          <button onClick={() => onEditFolder(folder)} className="p-1 rounded hover:bg-white/8 text-white/25 hover:text-white/60 transition-all cursor-pointer"><Pencil size={9} /></button>
          <button onClick={() => setShowConfirm(true)} className="p-1 rounded hover:bg-red-500/10 text-white/25 hover:text-red-400 transition-all cursor-pointer"><Trash2 size={9} /></button>
        </div>
      </div>

      {open && (
        <div className="space-y-2 pl-3">
          {journals.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-6 text-center transition-all"
              style={{ borderColor: isDragOver ? folder.color : "rgba(255,255,255,0.08)", background: isDragOver ? `${folder.color}05` : "transparent" }}
              onDragOver={(e) => { e.preventDefault(); onDragOver(folder.id); }}
              onDragLeave={onDragLeave}
              onDrop={(e) => { e.preventDefault(); onDrop(folder.id); }}>
              <p className="font-mono text-[10px] text-white/20 tracking-widest">{isDragOver ? "Drop here" : "No entries — drag journals here"}</p>
            </div>
          ) : (
            journals.map((journal) => (
              <JournalCard key={journal.id} journal={journal} folders={folders}
                onEdit={onEdit} onSoftDelete={onSoftDelete} onMove={onMove}
                onDragStart={onDragStart} onDragEnd={onDragEnd} />
            ))
          )}
        </div>
      )}

      {showConfirm && (
        <ConfirmModal
          message={`Delete folder "${folder.name}"? Journals inside will become uncategorized.`}
          onConfirm={() => { setShowConfirm(false); onDeleteFolder(folder.id); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Deleted Folder Card ───────────────────────────────────────────────────────

function DeletedFolderCard({ folder, journals, onRestoreFolder, onPermanentDeleteFolder, onRestoreJournal, onPermanentDeleteJournal }) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-white/6 overflow-hidden" style={{ background: "#0f0f0f" }}>
        {/* Folder row */}
        <div className="flex items-center gap-3 px-5 py-3 pl-6">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l" style={{ background: `${folder.color}30` }} />
          <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
            {open
              ? <ChevronDown size={10} style={{ color: folder.color, opacity: 0.5, flexShrink: 0 }} />
              : <ChevronRight size={10} style={{ color: folder.color, opacity: 0.5, flexShrink: 0 }} />
            }
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: `${folder.color}15` }}>
              <FolderIcon icon={folder.icon} size={10} color={folder.color} />
            </div>
            <span className="font-mono text-sm truncate" style={{ color: `${folder.color}80` }}>{folder.name}</span>
            <span className="font-mono text-[10px] ml-1" style={{ color: `${folder.color}40` }}>{journals.length} entries</span>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onRestoreFolder(folder.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[10px] tracking-widest transition-all hover:opacity-90 cursor-pointer"
              style={{ background: "rgba(200,240,76,0.08)", border: "1px solid rgba(200,240,76,0.15)", color: "#c8f04c" }}
            >
              <RotateCcw size={10} /> RESTORE
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all cursor-pointer"
              title="Permanently delete folder"
            >
              <Trash size={11} />
            </button>
          </div>
        </div>

        {/* Journals inside deleted folder */}
        {open && (
          <div className="border-t border-white/5">
            {journals.length === 0 ? (
              <p className="font-mono text-[10px] text-white/15 tracking-widest px-5 py-4 pl-10">No entries in this folder</p>
            ) : (
              journals.map((journal) => {
                const hasTitle = journal.title?.trim().length > 0;
                return (
                  <div key={journal.id} className="flex items-center gap-3 px-5 py-2.5 pl-10 border-b border-white/4 last:border-none">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-white/35 truncate">{hasTitle ? journal.title : <span className="italic">Untitled</span>}</p>
                      <p className="font-mono text-[10px] text-white/15 mt-0.5">{formatDate(journal.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onRestoreJournal(journal.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded font-mono text-[9px] tracking-widest transition-all hover:opacity-90 cursor-pointer"
                        style={{ background: "rgba(200,240,76,0.06)", border: "1px solid rgba(200,240,76,0.1)", color: "rgba(200,240,76,0.6)" }}
                      >
                        <RotateCcw size={9} /> RESTORE
                      </button>
                      <button onClick={() => onPermanentDeleteJournal(journal.id)} className="p-1 rounded hover:bg-red-500/10 text-white/15 hover:text-red-400 transition-all cursor-pointer"><Trash size={10} /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          message={`Permanently delete folder "${folder.name}" and all its entries? This cannot be undone.`}
          confirmLabel="PERMANENTLY DELETE"
          confirmColor="#ef4444"
          onConfirm={() => { setShowConfirm(false); onPermanentDeleteFolder(folder.id); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

// ── Recently Deleted Section ──────────────────────────────────────────────────

function RecentlyDeletedSection({ deletedJournals, deletedFolders, journalsInDeletedFolders, onRestoreJournal, onPermanentDeleteJournal, onRestoreFolder, onPermanentDeleteFolder, onClearAll }) {
  const [open, setOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const totalCount = deletedJournals.length + deletedFolders.length;

  return (
    <div className="mt-8 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>

      <div className="flex items-center gap-2 px-3 py-2 mb-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
          {open
            ? <ChevronDown size={10} className="text-white/20 shrink-0" />
            : <ChevronRight size={10} className="text-white/20 shrink-0" />
          }
          <Trash size={10} className="text-white/20" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-white/20">Recently Deleted</span>
          <span className="font-mono text-[10px] text-white/15">{totalCount}</span>
        </button>
        {open && totalCount > 0 && (
          <button onClick={() => setShowClearConfirm(true)} className="font-mono text-[9px] tracking-widest text-red-400/50 hover:text-red-400 transition-colors cursor-pointer ml-auto">
            DELETE ALL
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-2 pl-3">
          {totalCount === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-6 text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="font-mono text-[10px] text-white/15 tracking-widest">No deleted entries</p>
            </div>
          ) : (
            <>
              {/* Deleted folders */}
              {deletedFolders.map((folder) => (
                <DeletedFolderCard
                  key={folder.id}
                  folder={folder}
                  journals={journalsInDeletedFolders.filter(j => j.folder_id === folder.id)}
                  onRestoreFolder={onRestoreFolder}
                  onPermanentDeleteFolder={onPermanentDeleteFolder}
                  onRestoreJournal={onRestoreJournal}
                  onPermanentDeleteJournal={onPermanentDeleteJournal}
                />
              ))}
              {/* Deleted journals (not in a deleted folder) */}
              {deletedJournals.map((journal) => (
                <DeletedJournalCard
                  key={journal.id}
                  journal={journal}
                  onRestore={onRestoreJournal}
                  onPermanentDelete={onPermanentDeleteJournal}
                />
              ))}
            </>
          )}
        </div>
      )}

      {showClearConfirm && (
        <ConfirmModal
          message={`Permanently delete all ${totalCount} items in Recently Deleted? This cannot be undone.`}
          confirmLabel="DELETE ALL"
          confirmColor="#ef4444"
          onConfirm={() => { setShowClearConfirm(false); onClearAll(); }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Journals() {
  const [journals, setJournals] = useState([]);
  const [deletedJournals, setDeletedJournals] = useState([]);
  const [folders, setFolders] = useState([]);
  const [deletedFolders, setDeletedFolders] = useState([]);
  const [journalsInDeletedFolders, setJournalsInDeletedFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState(null);
  const [quote] = useState(randomQuote);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [draggingJournalId, setDraggingJournalId] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [journalData, deletedJournalData, folderData, deletedFolderData] = await Promise.all([
        getJournals(), getDeletedJournals(), getFolders(), getDeletedFolders(),
      ]);
      const activeFolderIds = new Set((folderData || []).map(f => f.id));
      // Journals in deleted folders — still have folder_id but folder is soft-deleted
      const deletedFolderIds = new Set((deletedFolderData || []).map(f => f.id));
      const inDeletedFolders = (journalData || []).filter(j => j.folder_id && deletedFolderIds.has(j.folder_id));
      const activeJournals = (journalData || []).filter(j => !j.folder_id || activeFolderIds.has(j.folder_id));
      setJournals(activeJournals);
      setDeletedJournals(deletedJournalData || []);
      setFolders(folderData || []);
      setDeletedFolders(deletedFolderData || []);
      setJournalsInDeletedFolders(inDeletedFolders);
    } catch (e) { setPageError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSoftDelete(id) {
    try {
      await softDeleteJournal(id);
      const j = journals.find(x => x.id === id);
      setJournals(prev => prev.filter(x => x.id !== id));
      if (j) setDeletedJournals(prev => [{ ...j, deleted_at: new Date().toISOString() }, ...prev]);
    } catch (e) { setPageError(e.message); }
  }

  async function handleRestoreJournal(id) {
    try {
      await restoreJournal(id);
      // Check both deletedJournals and journalsInDeletedFolders
      const j = deletedJournals.find(x => x.id === id) || journalsInDeletedFolders.find(x => x.id === id);
      setDeletedJournals(prev => prev.filter(x => x.id !== id));
      setJournalsInDeletedFolders(prev => prev.filter(x => x.id !== id));
      // Restore to uncategorized since its folder may be deleted
      if (j) setJournals(prev => [{ ...j, deleted_at: null, folder_id: null }, ...prev]);
    } catch (e) { setPageError(e.message); }
  }

  async function handlePermanentDeleteJournal(id) {
    try {
      await permanentDeleteJournal(id);
      setDeletedJournals(prev => prev.filter(x => x.id !== id));
      setJournalsInDeletedFolders(prev => prev.filter(x => x.id !== id));
    } catch (e) { setPageError(e.message); }
  }

  async function handleRestoreFolder(id) {
    try {
      await restoreFolder(id);
      const f = deletedFolders.find(x => x.id === id);
      setDeletedFolders(prev => prev.filter(x => x.id !== id));
      if (f) setFolders(prev => [...prev, { ...f, deleted_at: null }]);
      // Move journals that belong to this folder back to active list
      const rejoined = journalsInDeletedFolders.filter(j => j.folder_id === id);
      setJournalsInDeletedFolders(prev => prev.filter(j => j.folder_id !== id));
      setJournals(prev => [...prev, ...rejoined]);
    } catch (e) { setPageError(e.message); }
  }

  async function handlePermanentDeleteFolder(id) {
    try {
      await permanentDeleteFolder(id);
      setDeletedFolders(prev => prev.filter(x => x.id !== id));
      setJournalsInDeletedFolders(prev => prev.filter(j => j.folder_id !== id));
    } catch (e) { setPageError(e.message); }
  }

  async function handleDeleteFolder(id) {
    try {
      await softDeleteFolder(id);
      const f = folders.find(x => x.id === id);
      setFolders(prev => prev.filter(x => x.id !== id));
      if (f) setDeletedFolders(prev => [{ ...f, deleted_at: new Date().toISOString() }, ...prev]);
      // Move journals of this folder to journalsInDeletedFolders (hidden from main view)
      const affected = journals.filter(j => j.folder_id === id);
      setJournals(prev => prev.filter(j => j.folder_id !== id));
      setJournalsInDeletedFolders(prev => [...prev, ...affected]);
    } catch (e) { setPageError(e.message); }
  }

  async function handleClearAll() {
    try {
      await Promise.all([
        ...deletedJournals.map(j => permanentDeleteJournal(j.id)),
        ...deletedFolders.map(f => permanentDeleteFolder(f.id)),
        ...journalsInDeletedFolders.map(j => permanentDeleteJournal(j.id)),
      ]);
      setDeletedJournals([]);
      setDeletedFolders([]);
      setJournalsInDeletedFolders([]);
    } catch (e) { setPageError(e.message); }
  }

  async function handleMove(journalId, folderId) {
    try {
      await moveJournalToFolder(journalId, folderId);
      setJournals(prev => prev.map(j => j.id === journalId ? { ...j, folder_id: folderId } : j));
    } catch (e) { setPageError(e.message); }
  }

  function handleDrop(folderId) {
    if (draggingJournalId) handleMove(draggingJournalId, folderId);
    setDraggingJournalId(null);
    setDragOverFolderId(null);
  }

  const uncategorized = journals.filter(j => !j.folder_id);
  const byFolder = (fid) => journals.filter(j => j.folder_id === fid);

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
        {/* Header */}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingFolder(null); setShowFolderModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
            >
              <FolderPlus size={13} /> FOLDER
            </button>
            <button
              onClick={() => setEditing({})}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs tracking-widest transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ background: "#c8f04c", color: "#0d0d0d", fontWeight: "500" }}
            >
              <Plus size={13} /> NEW ENTRY
            </button>
          </div>
        </div>

        {pageError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <AlertTriangle size={13} className="text-red-400 shrink-0" />
            <span className="font-mono text-xs text-red-400 flex-1">{pageError}</span>
            <button onClick={() => setPageError("")} className="text-red-400/60 hover:text-red-400 cursor-pointer"><X size={13} /></button>
          </div>
        )}

        {/* Empty state */}
        {journals.length === 0 && folders.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/8" style={{ background: "#111" }}>
              <BookOpen size={22} className="text-white/20" />
            </div>
            <p className="font-mono text-white/15 text-[10px] tracking-widest uppercase mb-3">No entries yet</p>
            <p className="font-mono text-white/40 text-sm max-w-xs mx-auto leading-relaxed mb-8" style={{ fontStyle: "italic" }}>"{quote}"</p>
            <button onClick={() => setEditing({})} className="px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest cursor-pointer" style={{ background: "#c8f04c", color: "#0d0d0d" }}>
              WRITE YOUR FIRST ENTRY
            </button>
          </div>
        ) : (
          <>
            {/* Folder sections */}
            {folders.map((folder) => (
              <FolderSection
                key={folder.id}
                folder={folder}
                journals={byFolder(folder.id)}
                folders={folders}
                onEdit={(j) => setEditing(j)}
                onSoftDelete={handleSoftDelete}
                onDeleteFolder={handleDeleteFolder}
                onEditFolder={(f) => { setEditingFolder(f); setShowFolderModal(true); }}
                onMove={handleMove}
                dragOverFolderId={dragOverFolderId}
                onDragOver={(fid) => setDragOverFolderId(fid)}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={handleDrop}
                onDragStart={(id) => setDraggingJournalId(id)}
                onDragEnd={() => { setDraggingJournalId(null); setDragOverFolderId(null); }}
              />
            ))}

            {/* Uncategorized — collapsible, always shown when folders exist */}
            {(folders.length > 0 || uncategorized.length > 0) && (
              <UncategorizedSection
                journals={uncategorized}
                folders={folders}
                onEdit={(j) => setEditing(j)}
                onSoftDelete={handleSoftDelete}
                onMove={handleMove}
                dragOverFolderId={dragOverFolderId}
                onDragOver={(fid) => setDragOverFolderId(fid)}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={handleDrop}
                onDragStart={(id) => setDraggingJournalId(id)}
                onDragEnd={() => { setDraggingJournalId(null); setDragOverFolderId(null); }}
              />
            )}

            {/* No live journals but folders exist */}
            {journals.length === 0 && folders.length > 0 && (
              <div className="text-center py-12">
                <p className="font-mono text-white/20 text-xs tracking-widest mb-4">Write your first entry</p>
                <button onClick={() => setEditing({})} className="px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest cursor-pointer" style={{ background: "#c8f04c", color: "#0d0d0d" }}>
                  NEW ENTRY
                </button>
              </div>
            )}
          </>
        )}

        {/* Recently Deleted — always visible */}
        <RecentlyDeletedSection
          deletedJournals={deletedJournals}
          deletedFolders={deletedFolders}
          journalsInDeletedFolders={journalsInDeletedFolders}
          onRestoreJournal={handleRestoreJournal}
          onPermanentDeleteJournal={handlePermanentDeleteJournal}
          onRestoreFolder={handleRestoreFolder}
          onPermanentDeleteFolder={handlePermanentDeleteFolder}
          onClearAll={handleClearAll}
        />
      </div>

      {showFolderModal && (
        <FolderModal
          folder={editingFolder}
          onClose={() => { setShowFolderModal(false); setEditingFolder(null); }}
          onSave={() => { setShowFolderModal(false); setEditingFolder(null); load(); }}
        />
      )}
    </div>
  );
}