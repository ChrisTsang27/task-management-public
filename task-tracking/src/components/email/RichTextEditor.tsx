"use client";

import React, { useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
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

type Props = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        // keep lists, code, codeBlock, blockquote, hr from StarterKit
      }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({ autolink: true, openOnClick: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder || "Write your content..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-[260px] w-full rounded-lg bg-black/30 ring-1 ring-white/10 px-3 py-2 outline-none focus:ring-white/30 max-w-none rte",
      },
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: any }) {
  const [openHead, setOpenHead] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  const currentBlock = useMemo<"p" | "h1" | "h2" | "h3" | "h4">(() => {
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    if (editor.isActive("heading", { level: 4 })) return "h4";
    return "p";
  }, [editor, editor.state]);

  const setHeading = (lvl: "p" | 1 | 2 | 3 | 4) => {
    const chain = editor.chain().focus();
    if (lvl === "p") chain.setParagraph().run();
    else chain.toggleHeading({ level: lvl as 1 | 2 | 3 | 4 }).run();
    setOpenHead(false);
  };

  const toggleBullet = () => {
    const chain = editor.chain().focus();
    // ensure not inside codeBlock
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

  const promptForLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const promptForImage = () => {
    const url = window.prompt("Enter image URL");
    if (!url) return;
    editor.chain().focus().setImage({ src: url, alt: "" }).run();
    setOpenAdd(false);
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setOpenAdd(false);
  };

  const insertHR = () => {
    editor.chain().focus().setHorizontalRule().run();
    setOpenAdd(false);
  };

  return (
    <div className="relative z-[100]">
      <div className="flex items-center flex-wrap gap-1 rounded-lg bg-black/70 ring-1 ring-white/20 p-1">
        <Btn onAction={() => editor.chain().focus().undo().run()}>↶</Btn>
        <Btn onAction={() => editor.chain().focus().redo().run()}>↷</Btn>
        <Divider />

        {/* Heading dropdown */}
        <div className="relative">
          <Btn
            onAction={() => {
              setOpenHead((v) => !v);
              setOpenAdd(false);
            }}
          >
            {currentBlock === "p" ? "Normal" : currentBlock.toUpperCase()} <span className="ml-1">▾</span>
          </Btn>
          {openHead && (
            <Menu onClose={() => setOpenHead(false)}>
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

        <Btn onAction={toggleBullet} active={editor.isActive("bulletList")}>•</Btn>
        <Btn onAction={toggleOrdered} active={editor.isActive("orderedList")}>1.</Btn>

        <Divider />

        <Btn onAction={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>B</Btn>
        <Btn onAction={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>I</Btn>
        <Btn onAction={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>S</Btn>
        <Btn onAction={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>U</Btn>

        {/* Code block (</>) */}
        <Btn onAction={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")}>
          {"</>"}
        </Btn>

        <Divider />

        <Btn onAction={promptForLink} active={editor.isActive("link")}>🔗</Btn>
        <Btn onAction={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")}>Unlink</Btn>

        <Divider />

        <Btn onAction={() => align("left")} active={editor.isActive({ textAlign: "left" })}>≡</Btn>
        <Btn onAction={() => align("center")} active={editor.isActive({ textAlign: "center" })}>≣</Btn>
        <Btn onAction={() => align("right")} active={editor.isActive({ textAlign: "right" })}>≡</Btn>
        <Btn onAction={() => align("justify")} active={editor.isActive({ textAlign: "justify" })}>≋</Btn>

        <Divider />

        <Btn onAction={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")}>x²</Btn>
        <Btn onAction={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")}>x₂</Btn>

        <Divider />

        {/* Add dropdown */}
        <div className="relative">
          <Btn onAction={() => { setOpenAdd((v) => !v); setOpenHead(false); }}>Add ▾</Btn>
          {openAdd && (
            <Menu onClose={() => setOpenAdd(false)}>
              <MenuItem onAction={promptForImage}>Image…</MenuItem>
              <MenuItem onAction={insertTable}>Table 3×3</MenuItem>
              <MenuItem onAction={insertHR}>Horizontal rule</MenuItem>
            </Menu>
          )}
        </div>
      </div>
    </div>
  );
}

function Menu({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="absolute left-0 top-full mt-1 min-w-36 rounded-md bg-black/90 ring-1 ring-white/20 p-1 z-[1000]"
      onMouseLeave={onClose}
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
}: {
  children: React.ReactNode;
  onAction: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onAction();
      }}
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