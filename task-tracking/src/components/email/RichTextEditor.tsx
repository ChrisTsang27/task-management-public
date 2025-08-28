"use client";

import React, { useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import CharacterCount from "@tiptap/extension-character-count";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";

type Props = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
};

const CONTENT_LIMIT = 10000;

// Basic safe URL check: only http/https allowed
function isSafeHttpUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onUpdateDebounced = (html: string) => {
    if (!onChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(html), 300);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        dropcursor: false,
        gapcursor: false,
      }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({
        autolink: true,
        openOnClick: false,
        validate: (href) => isSafeHttpUrl(href),
      }),
      // Disallow base64 to reduce payload/risks; URL validation is enforced
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: placeholder || "Write your content..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true, lastColumnResizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount.configure({ limit: CONTENT_LIMIT }),
      Dropcursor.configure({ class: "tiptap-dropcursor" }),
      Gapcursor,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onUpdateDebounced(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-[260px] w-full rounded-lg bg-black/30 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-white/30 max-w-none rte",
      },
    },
    immediatelyRender: false,
  });

  const [openHead, setOpenHead] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openTable, setOpenTable] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  if (!editor) return null;

  const characterCount = (editor.storage as any)?.characterCount;
  const counts = {
    words:
      typeof characterCount?.words === "function"
        ? characterCount.words()
        : editor.getText().trim().split(/\s+/).filter(Boolean).length,
    chars:
      typeof characterCount?.characters === "function"
        ? characterCount.characters()
        : editor.getText().length,
  };

  const currentBlock: "p" | "h1" | "h2" | "h3" | "h4" =
    editor?.isActive("heading", { level: 1 })
      ? "h1"
      : editor?.isActive("heading", { level: 2 })
      ? "h2"
      : editor?.isActive("heading", { level: 3 })
      ? "h3"
      : editor?.isActive("heading", { level: 4 })
      ? "h4"
      : "p";

  const setHeading = (lvl: "p" | 1 | 2 | 3 | 4) => {
    const chain = editor.chain().focus();
    if (lvl === "p") chain.setParagraph().run();
    else chain.toggleHeading({ level: lvl as 1 | 2 | 3 | 4 }).run();
    setOpenHead(false);
  };

  const toggleBullet = () => {
    const chain = editor.chain().focus();
    if (editor.isActive("codeBlock")) chain.toggleCodeBlock().run();
    chain.toggleBulletList().run();
  };

  const toggleOrdered = () => {
    const chain = editor.chain().focus();
    if (editor.isActive("codeBlock")) chain.toggleCodeBlock().run();
    chain.toggleOrderedList().run();
  };

  const align = (val: "left" | "center" | "right" | "justify") =>
    editor.chain().focus().setTextAlign(val).run();

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setOpenAdd(false);
  };

  const insertHR = () => {
    editor.chain().focus().setHorizontalRule().run();
    setOpenAdd(false);
  };

  const inTable = editor.isActive("table");
  const nearLimit = counts.chars > CONTENT_LIMIT * 0.95;
  const overLimit = counts.chars > CONTENT_LIMIT;

  return (
    <div className="space-y-2">
      <div className="relative z-[100]">
        <div
          role="toolbar"
          aria-label="Rich text editor toolbar"
          className="flex items-center flex-wrap gap-1 rounded-lg bg-black/70 ring-1 ring-white/20 p-1"
        >
          <Btn onAction={() => editor.chain().focus().undo().run()} ariaLabel="Undo">↶</Btn>
          <Btn onAction={() => editor.chain().focus().redo().run()} ariaLabel="Redo">↷</Btn>
          <Divider />

          {/* Heading dropdown */}
          <div className="relative">
            <Btn
              onAction={() => {
                setOpenHead((v) => !v);
                setOpenAdd(false);
                setOpenTable(false);
              }}
              ariaLabel="Block type"
            >
              {currentBlock === "p" ? "Normal" : currentBlock.toUpperCase()} <span className="ml-1">▾</span>
            </Btn>
            {openHead && (
              <Menu onClose={() => setOpenHead(false)} ariaLabel="Block types">
                <MenuItem onAction={() => setHeading("p")} active={currentBlock === "p"}>
                  Normal
                </MenuItem>
                <MenuItem onAction={() => setHeading(1)} active={currentBlock === "h1"}>
                  H1
                </MenuItem>
                <MenuItem onAction={() => setHeading(2)} active={currentBlock === "h2"}>
                  H2
                </MenuItem>
                <MenuItem onAction={() => setHeading(3)} active={currentBlock === "h3"}>
                  H3
                </MenuItem>
                <MenuItem onAction={() => setHeading(4)} active={currentBlock === "h4"}>
                  H4
                </MenuItem>
              </Menu>
            )}
          </div>

          <Divider />

          <Btn onAction={toggleBullet} active={editor.isActive("bulletList")} ariaLabel="Bulleted list">•</Btn>
          <Btn onAction={toggleOrdered} active={editor.isActive("orderedList")} ariaLabel="Numbered list">1.</Btn>

          <Divider />

          <Btn onAction={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} ariaLabel="Bold">B</Btn>
          <Btn onAction={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} ariaLabel="Italic">I</Btn>
          <Btn onAction={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} ariaLabel="Strikethrough">S</Btn>
          <Btn onAction={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} ariaLabel="Underline">U</Btn>

          {/* Code block (</>) */}
          <Btn onAction={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} ariaLabel="Code block">
            {"</>"}
          </Btn>

          <Divider />

          <Btn onAction={() => setShowLinkModal(true)} active={editor.isActive("link")} ariaLabel="Insert link" title="Insert link">🔗</Btn>
          <Btn onAction={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")} ariaLabel="Remove link">
            Unlink
          </Btn>

          <Divider />

          <Btn onAction={() => align("left")} active={editor.isActive({ textAlign: "left" })} ariaLabel="Align left">L</Btn>
          <Btn onAction={() => align("center")} active={editor.isActive({ textAlign: "center" })} ariaLabel="Align center">C</Btn>
          <Btn onAction={() => align("right")} active={editor.isActive({ textAlign: "right" })} ariaLabel="Align right">R</Btn>
          <Btn onAction={() => align("justify")} active={editor.isActive({ textAlign: "justify" })} ariaLabel="Justify">J</Btn>

          <Divider />

          <Btn onAction={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} ariaLabel="Superscript">x²</Btn>
          <Btn onAction={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} ariaLabel="Subscript">x₂</Btn>

          <Divider />

          {/* Add dropdown */}
          <div className="relative">
            <Btn onAction={() => { setOpenAdd((v) => !v); setOpenHead(false); setOpenTable(false); }} ariaLabel="Add menu">Add ▾</Btn>
            {openAdd && (
              <Menu onClose={() => setOpenAdd(false)} ariaLabel="Insert elements">
                <MenuItem onAction={() => setShowImageModal(true)}>Image…</MenuItem>
                <MenuItem onAction={insertTable}>Table 3×3</MenuItem>
                <MenuItem onAction={insertHR}>Horizontal rule</MenuItem>
              </Menu>
            )}
          </div>

          {/* Table menu (visible only when in a table) */}
          {inTable && (
            <>
              <Divider />
              <div className="relative">
                <Btn onAction={() => { setOpenTable((v) => !v); setOpenAdd(false); setOpenHead(false); }} ariaLabel="Table menu">Table ▾</Btn>
                {openTable && (
                  <Menu onClose={() => setOpenTable(false)} ariaLabel="Table actions">
                    <MenuItem onAction={() => editor.chain().focus().addRowBefore().run()}>Add row above</MenuItem>
                    <MenuItem onAction={() => editor.chain().focus().addRowAfter().run()}>Add row below</MenuItem>
                    <MenuItem onAction={() => editor.chain().focus().addColumnBefore().run()}>Add column left</MenuItem>
                    <MenuItem onAction={() => editor.chain().focus().addColumnAfter().run()}>Add column right</MenuItem>
                    <MenuItem onAction={() => editor.chain().focus().deleteRow().run()}>Delete row</MenuItem>
                    <MenuItem onAction={() => editor.chain().focus().deleteColumn().run()}>Delete column</MenuItem>
                    <MenuItem onAction={() => editor.chain().focus().mergeCells().run()}>Merge cells</MenuItem>
                    <MenuItem onAction={() => editor.chain().focus().splitCell().run()}>Split cell</MenuItem>
                    <MenuItem onAction={() => editor.chain().focus().deleteTable().run()}>Delete table</MenuItem>
                  </Menu>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <EditorContent editor={editor} />

      <div className="flex items-center justify-end gap-3 text-xs text-slate-300">
        <span>Words: {counts.words}</span>
        <span className={`${overLimit ? "text-rose-300" : nearLimit ? "text-amber-300" : "text-slate-300"}`}>
          Characters: {counts.chars}/{CONTENT_LIMIT}
        </span>
      </div>

      {showLinkModal && (
        <LinkModal
          onCancel={() => setShowLinkModal(false)}
          onConfirm={(url) => {
            if (!isSafeHttpUrl(url)) return;
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            setShowLinkModal(false);
          }}
        />
      )}

      {showImageModal && (
        <ImageModal
          onCancel={() => setShowImageModal(false)}
          onConfirm={(url, alt) => {
            if (!isSafeHttpUrl(url)) return;
            editor.chain().focus().setImage({ src: url, alt: alt || "" }).run();
            setShowImageModal(false);
          }}
        />
      )}
    </div>
  );
}

function Menu({ children, onClose, ariaLabel }: { children: React.ReactNode; onClose: () => void; ariaLabel: string }) {
  return (
    <div
      className="absolute left-0 top-full mt-1 min-w-36 rounded-md bg-black/90 ring-1 ring-white/20 p-1 z-[1000]"
      role="menu"
      aria-label={ariaLabel}
      onMouseLeave={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      {children}
    </div>
  );
}

function MenuItem({
  children,
  onAction,
  active,
}: {
  children: React.ReactNode;
  onAction: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onMouseDown={(e) => {
        e.preventDefault();
        onAction();
      }}
      className={`w-full text-left text-xs px-2 py-1 rounded-md transition ${
        active ? "bg-white/25 text-white" : "bg-transparent hover:bg-white/10 text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/15 inline-block" />;
}

function Btn({
  children,
  onAction,
  active,
  disabled,
  ariaLabel,
  title,
}: {
  children: React.ReactNode;
  onAction: () => void;
  active?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onAction();
      }}
      aria-label={ariaLabel}
      aria-pressed={active ? true : undefined}
      title={title}
      disabled={disabled}
      className={`text-xs px-2 py-1 rounded-md transition ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-white/5 text-slate-400"
          : active
          ? "bg-white/30 text-white"
          : "bg-white/10 hover:bg-white/15 text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

/* Simple glassy modals */

function LinkModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const safe = !url || isSafeHttpUrl(url);
  return (
    <ModalShell title="Insert link" onCancel={onCancel} onSubmit={() => url && safe && onConfirm(url)}>
      <label className="text-xs text-slate-300">URL (http/https)</label>
      <input
        autoFocus
        type="url"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full rounded-lg bg-black/30 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-white/30"
      />
      {!safe && <p className="text-xs text-rose-300 mt-1">Only http/https URLs are allowed.</p>}
      <div className="flex justify-end gap-2 pt-3">
        <button type="button" className="px-3 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/10" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 disabled:opacity-50"
          disabled={!url || !safe}
          onClick={() => onConfirm(url)}
        >
          Insert
        </button>
      </div>
    </ModalShell>
  );
}

function ImageModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (url: string, alt?: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const safe = !url || isSafeHttpUrl(url);
  return (
    <ModalShell title="Insert image" onCancel={onCancel} onSubmit={() => url && safe && onConfirm(url, alt)}>
      <label className="text-xs text-slate-300">Image URL (http/https)</label>
      <input
        autoFocus
        type="url"
        placeholder="https://example.com/image.jpg"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full rounded-lg bg-black/30 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-white/30"
      />
      {!safe && <p className="text-xs text-rose-300 mt-1">Only http/https URLs are allowed.</p>}
      <label className="text-xs text-slate-300 mt-2">Alt text (optional)</label>
      <input
        type="text"
        placeholder="Describe the image"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        className="w-full rounded-lg bg-black/30 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-white/30"
      />
      <div className="flex justify-end gap-2 pt-3">
        <button type="button" className="px-3 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/10" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 disabled:opacity-50"
          disabled={!url || !safe}
          onClick={() => onConfirm(url, alt)}
        >
          Insert
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onCancel,
  onSubmit,
  children,
}: {
  title: string;
  onCancel: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") onSubmit();
      }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl backdrop-blur-xl bg-white/10 ring-1 ring-white/20 p-4 text-slate-100">
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}