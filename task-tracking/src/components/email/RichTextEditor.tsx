"use client";

import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";

import CharacterCount from "@tiptap/extension-character-count";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


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

const RichTextEditor = React.memo(function RichTextEditor({ value, onChange, placeholder }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [rawHtmlContent, setRawHtmlContent] = useState('');
  const isUpdatingFromTemplate = useRef(false);
  const isUpdatingFromUser = useRef(false);

  // Detect if content is a complex email template
  const isComplexTemplate = useCallback((content: string) => {
    if (!content || content.length < 100) return false;
    
    // Check for multiple template indicators
    const hasInlineStyles = content.includes('style=');
    const hasTemplateStructure = content.includes('max-width: 600px') || 
                                content.includes('max-width:600px');
    const hasComplexStyling = content.includes('background-color:') || 
                             content.includes('border-radius:') ||
                             content.includes('font-family:') ||
                             content.includes('linear-gradient') ||
                             content.includes('box-shadow') ||
                             content.includes('padding:') ||
                             content.includes('margin:');
    const hasTemplateElements = content.includes('<!-- Header') || 
                               content.includes('<!-- Content') ||
                               content.includes('<!-- Footer') ||
                               content.includes('Professional Communication') ||
                               content.includes('Important Announcement');
    
    return hasInlineStyles && (hasTemplateStructure || hasComplexStyling || hasTemplateElements);
   }, []);

  const onUpdateDebounced = useCallback((html: string, editorInstance?: any) => {
    if (!onChange || isUpdatingFromTemplate.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Set flag to indicate this change comes from user input
      isUpdatingFromUser.current = true;
      
      if (isTemplateMode && rawHtmlContent) {
        // Template mode: Replace CONTENT HERE placeholder with editor content
        // Use the editor content as-is - no cleaning needed since we control what goes into the editor
        let editorContent = html && html.trim() ? html : '<p></p>';
        
        const templateWithContent = rawHtmlContent.replace(
          /CONTENT HERE/g, 
          editorContent
        );
        onChange(templateWithContent);
      } else {
        // Normal mode - pass through the editor content
        onChange(html);
      }
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isUpdatingFromUser.current = false;
      }, 100);
     }, 300);
   }, [onChange, isTemplateMode, rawHtmlContent]);

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
      // Allow base64 images for template logos and uploaded images
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({
        placeholder: "Enter your message here...",
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true, lastColumnResizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount.configure({ limit: CONTENT_LIMIT }),
      Dropcursor.configure({ class: "tiptap-dropcursor" }),
      Gapcursor,
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onUpdateDebounced(editor.getHTML(), editor),
    parseOptions: {
      preserveWhitespace: 'full',
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[260px] w-full rounded-b-xl bg-transparent px-4 py-3 outline-none max-w-none rte custom-text-cursor cursor-text [&_img]:max-w-full [&_img]:max-h-[400px] [&_img]:object-contain [&_img]:rounded-md [&_code]:text-violet-300 [&_pre]:bg-slate-800/80",
        style: "cursor: inherit !important;",
      },
    },
    immediatelyRender: false,
  });

  // Update editor content when value prop changes (for template application)
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value && !isUpdatingFromTemplate.current && !isUpdatingFromUser.current) {
      const isTemplate = isComplexTemplate(value);
      console.log('Template detection:', { 
        isTemplate, 
        valueLength: value.length, 
        hasMaxWidth: value.includes('max-width: 600px'),
        hasAddress: value.includes('Unit 1, 739 Boundary Road'),
        valuePreview: value.substring(0, 200)
      });
      
      // Set flag to prevent feedback loop
      isUpdatingFromTemplate.current = true;
      
      setIsTemplateMode(isTemplate);
      
      if (isTemplate) {
        // Store the raw HTML for complex templates
        setRawHtmlContent(value);
        
        // For templates, we need to extract editable content and show it in the editor
        // while preserving the full template structure in rawHtmlContent
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = value;
        
        // Simplified template content initialization
        let editableContent = '';
        
        if (value.includes('CONTENT HERE')) {
          // Fresh template application - provide starter content without Hi since template already has it
          editableContent = '<p>Enter your message here...</p>';
        } else {
          // Template has been used before - extract only the content that was inserted
          // Look for content between template structure elements
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = value;
          
          // Find paragraphs that don't contain template-specific text
          const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
          const userParagraphs = paragraphs.filter(p => {
            const text = p.textContent || '';
            return !text.includes('Professional Communication') && 
                   !text.includes('Important Announcement') &&
                   !text.includes('Unit 1, 739 Boundary Road') &&
                   !text.includes('Best regards') &&
                   text.trim().length > 0;
          });
          
          if (userParagraphs.length > 0) {
            editableContent = userParagraphs.map(p => p.outerHTML).join('');
          } else {
            editableContent = '<p>Enter your message here...</p>';
          }
        }
        
        // Set the content in the editor without aggressive cleaning
        editor.commands.setContent(editableContent || '<p></p>', false);
      } else {
        setRawHtmlContent('');
        // Use insertContent with emitUpdate: false to preserve HTML structure better
        editor.commands.clearContent(false);
        editor.commands.insertContent(value, {
          parseOptions: {
            preserveWhitespace: 'full',
          },
          updateSelection: false,
        });
      }
      
      // Reset flag after a short delay to allow the editor to update
      setTimeout(() => {
        isUpdatingFromTemplate.current = false;
      }, 100);
    }
  }, [editor, value, isComplexTemplate]);

  const [openHead, setOpenHead] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openTable, setOpenTable] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isDraggingOverEditor, setIsDraggingOverEditor] = useState(false);

  const characterCount = editor?.storage.characterCount as { words?: () => number; characters?: () => number } | undefined;
  const [editorContent, setEditorContent] = useState(editor?.getHTML() || '');
  
  // Update content state when editor changes
  useEffect(() => {
    if (editor) {
      const updateContent = () => setEditorContent(editor.getHTML());
      editor.on('update', updateContent);
      return () => {
        editor.off('update', updateContent);
      };
    }
  }, [editor]);
  
  const counts = useMemo(() => ({
    words:
      typeof characterCount?.words === "function"
        ? characterCount.words()
        : editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0,
    chars:
      typeof characterCount?.characters === "function"
        ? characterCount.characters()
        : editor?.getText().length || 0,
  }), [characterCount, editor, editorContent]);

  const currentBlock: "p" | "h1" | "h2" | "h3" | "h4" = useMemo(() => 
    editor?.isActive("heading", { level: 1 })
      ? "h1"
      : editor?.isActive("heading", { level: 2 })
      ? "h2"
      : editor?.isActive("heading", { level: 3 })
      ? "h3"
      : editor?.isActive("heading", { level: 4 })
      ? "h4"
      : "p", [editor]);

  const setHeading = useCallback((lvl: "p" | 1 | 2 | 3 | 4) => {
    const chain = editor?.chain().focus();
    if (lvl === "p") chain?.setParagraph().run();
    else chain?.toggleHeading({ level: lvl as 1 | 2 | 3 | 4 }).run();
    setOpenHead(false);
  }, [editor]);

  const toggleBullet = useCallback(() => {
    const chain = editor?.chain().focus();
    if (editor?.isActive("codeBlock")) chain?.toggleCodeBlock().run();
    chain?.toggleBulletList().run();
  }, [editor]);

  const toggleOrdered = useCallback(() => {
    const chain = editor?.chain().focus();
    if (editor?.isActive("codeBlock")) chain?.toggleCodeBlock().run();
    chain?.toggleOrderedList().run();
  }, [editor]);

  const align = useCallback((val: "left" | "center" | "right" | "justify") =>
    editor?.chain().focus().setTextAlign(val).run(), [editor]);

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setOpenAdd(false);
  }, [editor]);

  const insertHR = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run();
    setOpenAdd(false);
  }, [editor]);

  const inTable = useMemo(() => editor?.isActive("table") || false, [editor]);
  const nearLimit = useMemo(() => counts.chars > CONTENT_LIMIT * 0.95, [counts.chars]);
  const overLimit = useMemo(() => counts.chars > CONTENT_LIMIT, [counts.chars]);

  const handleEditorDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items);
    const hasImageFile = items.some(item => item.type.startsWith('image/'));
    if (hasImageFile) {
      setIsDraggingOverEditor(true);
    }
  }, []);

  const handleEditorDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverEditor(false);
  }, []);

  const handleEditorDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverEditor(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;
    
    // Upload the first image file
    const file = imageFiles[0];
    try {
      const formData = new FormData();
      formData.append('file_0', file);
      
      const response = await fetch('/api/announcements/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.urls && result.urls.length > 0) {
          const imageUrl = result.urls[0].url;
          const altText = file.name.split('.')[0];
          editor?.chain().focus().setImage({ src: imageUrl, alt: altText }).run();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [editor]);

  // Conditional return after all hooks have been called
  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-2">
      <div 
        className={`relative rounded-xl bg-gradient-to-br from-slate-800/90 via-slate-850/95 to-slate-900/90 border-2 border-slate-500/60 focus-within:border-violet-400/70 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all duration-300 overflow-visible ${isDraggingOverEditor ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
        onDragOver={handleEditorDragOver}
        onDragLeave={handleEditorDragLeave}
        onDrop={handleEditorDrop}
      >
        <div
          role="toolbar"
          aria-label="Rich text editor toolbar"
          className="flex items-center flex-wrap gap-2 bg-gradient-to-r from-slate-700/80 via-slate-750/85 to-slate-700/80 backdrop-blur-md border-b border-slate-500/30 rounded-t-xl p-3 relative z-10"
        >
          <Btn onAction={() => editor.chain().focus().undo().run()} ariaLabel="Undo" title="Undo last action">↶</Btn>
          <Btn onAction={() => editor.chain().focus().redo().run()} ariaLabel="Redo" title="Redo last action">↷</Btn>
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
              title="Change text style (Normal, H1, H2, H3, H4)"
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

          <Btn onAction={toggleBullet} active={editor.isActive("bulletList")} ariaLabel="Bulleted list" title="Create bulleted list">•</Btn>
          <Btn onAction={toggleOrdered} active={editor.isActive("orderedList")} ariaLabel="Numbered list" title="Create numbered list">1.</Btn>

          <Divider />

          <Btn onAction={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} ariaLabel="Bold" title="Make text bold">B</Btn>
          <Btn onAction={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} ariaLabel="Italic" title="Make text italic">I</Btn>
          <Btn onAction={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} ariaLabel="Strikethrough" title="Strike through text">S</Btn>
          <Btn onAction={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} ariaLabel="Underline" title="Underline text">U</Btn>

          {/* Code block (</>) */}
          <Btn onAction={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} ariaLabel="Code block" title="Insert code block">
            {"</>"}
          </Btn>

          <Divider />

          <Btn onAction={() => setShowLinkModal(true)} active={editor.isActive("link")} ariaLabel="Insert link" title="Insert or edit link">🔗</Btn>
          <Btn onAction={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive("link")} ariaLabel="Remove link" title="Remove link from selected text">
            Unlink
          </Btn>

          <Divider />

          <Btn onAction={() => align("left")} active={editor.isActive({ textAlign: "left" })} ariaLabel="Align left" title="Align text to the left">L</Btn>
          <Btn onAction={() => align("center")} active={editor.isActive({ textAlign: "center" })} ariaLabel="Align center" title="Center align text">C</Btn>
          <Btn onAction={() => align("right")} active={editor.isActive({ textAlign: "right" })} ariaLabel="Align right" title="Align text to the right">R</Btn>
          <Btn onAction={() => align("justify")} active={editor.isActive({ textAlign: "justify" })} ariaLabel="Justify" title="Justify text alignment">J</Btn>

          <Divider />

          <Btn onAction={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} ariaLabel="Superscript" title="Make text superscript">x²</Btn>
          <Btn onAction={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} ariaLabel="Subscript" title="Make text subscript">x₂</Btn>

          <Divider />

          {/* Add dropdown */}
          <div className="relative">
            <Btn onAction={() => { setOpenAdd((v) => !v); setOpenHead(false); setOpenTable(false); }} ariaLabel="Add menu" title="Insert images, tables, or horizontal rules">Add ▾</Btn>
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
        
        <div className="relative">
          <EditorContent editor={editor} />
          {isDraggingOverEditor && (
            <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center pointer-events-none">
              <div className="bg-slate-800/90 px-4 py-2 rounded-lg border border-blue-400/50">
                <p className="text-blue-300 text-sm font-medium">Drop image here to insert</p>
              </div>
            </div>
          )}
        </div>
      </div>

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
    </TooltipProvider>
  );
});

export default RichTextEditor;

function Menu({ children, onClose, ariaLabel }: { children: React.ReactNode; onClose: () => void; ariaLabel: string }) {
  return (
    <div
      className="absolute left-0 top-full mt-2 min-w-40 rounded-xl bg-gradient-to-br from-slate-800/98 via-slate-900/98 to-slate-950/98 backdrop-blur-md border border-slate-500/40 shadow-2xl shadow-black/20 p-2 z-[2000]"
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
      className={`w-full text-left text-sm font-medium px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer group ${
        active 
          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white group-hover:bg-none group-hover:bg-gradient-to-r group-hover:from-slate-700/60 group-hover:to-slate-800/60" 
          : "bg-transparent text-slate-100"
      } hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-800/60 hover:text-white`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-2 h-6 w-px bg-gradient-to-b from-transparent via-slate-400/60 to-transparent inline-block" />;
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
  const button = (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onAction();
      }}
      aria-label={ariaLabel}
      aria-pressed={active ? true : undefined}
      disabled={disabled}
      className={`text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 ${
        disabled
          ? "opacity-40 cursor-not-allowed bg-slate-700/50 text-slate-500 shadow-inner"
          : active
          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/30 cursor-pointer"
          : "bg-gradient-to-r from-slate-600/80 to-slate-700/80 hover:from-slate-500/90 hover:to-slate-600/90 text-slate-100 shadow-md hover:shadow-lg backdrop-blur-sm border border-slate-500/20 hover:border-slate-400/30 cursor-pointer"
      }`}
    >
      {children}
    </button>
  );

  if (title && !disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
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
        className="w-full rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all cursor-text"
      />
      {!safe && <p className="text-xs text-rose-300 mt-1">Only http/https URLs are allowed.</p>}
      <div className="flex justify-end gap-2 pt-3">
        <button type="button" className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-600 to-slate-700 text-white border border-slate-500/50 hover:from-slate-500 hover:to-slate-600 transition-all cursor-pointer" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border border-emerald-500/50 hover:from-emerald-500 hover:to-emerald-600 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('upload');
  const safe = !url || isSafeHttpUrl(url);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please drop an image file');
      return;
    }
    
    await uploadFile(imageFiles[0]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file_0', file);
      
      const response = await fetch('/api/announcements/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.urls && result.urls.length > 0) {
          setUrl(result.urls[0].url);
          setAlt(file.name.split('.')[0]); // Use filename without extension as default alt text
        }
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ModalShell title="Insert image" onCancel={onCancel} onSubmit={() => url && safe && onConfirm(url, alt)}>
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setUploadMode('upload')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            uploadMode === 'upload'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setUploadMode('url')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            uploadMode === 'url'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          From URL
        </button>
      </div>

      {uploadMode === 'upload' ? (
        <>
          {/* Drag and Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-400 bg-blue-500/10'
                : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="space-y-2">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-slate-400">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl">📁</div>
                <p className="text-sm text-slate-300">
                  {isDragging ? 'Drop your image here' : 'Drag & drop an image or click to browse'}
                </p>
                <p className="text-xs text-slate-500">Supports: JPG, PNG, GIF, WebP</p>
              </div>
            )}
          </div>
          
          {url && (
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400 mb-1">Preview URL:</p>
              <p className="text-xs text-slate-300 break-all">{url}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <label className="text-xs text-slate-300">Image URL (http/https)</label>
          <input
            autoFocus
            type="url"
            placeholder="https://example.com/image.jpg"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all cursor-text"
          />
          {!safe && <p className="text-xs text-rose-300 mt-1">Only http/https URLs are allowed.</p>}
        </>
      )}
      
      <label className="text-xs text-slate-300 mt-2">Alt text (optional)</label>
      <input
        type="text"
        placeholder="Describe the image"
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        className="w-full rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-600/50 px-3 py-2 outline-none focus:border-blue-500/50 transition-all cursor-text"
      />
      <div className="flex justify-end gap-2 pt-3">
        <button type="button" className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-600 to-slate-700 text-white border border-slate-500/50 hover:from-slate-500 hover:to-slate-600 transition-all cursor-pointer" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border border-emerald-500/50 hover:from-emerald-500 hover:to-emerald-600 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          disabled={!url || !safe || isUploading}
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
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 shadow-2xl p-4 text-slate-100">
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}