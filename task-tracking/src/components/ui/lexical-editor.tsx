'use client';

import React from 'react';
import { $getRoot } from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $getSelection as getSelection, $isRangeSelection } from 'lexical';
import { FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { useCallback, useEffect, useState, useRef } from 'react';
import { $insertNodes, DecoratorNode, NodeKey, LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Image } from 'lucide-react';

// Custom Image Node
export type SerializedImageNode = Spread<
  {
    altText: string;
    height?: number;
    maxWidth: number;
    src: string;
    width?: number;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __maxWidth: number;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__key,
    );
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      height: this.__height === 'inherit' ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width === 'inherit' ? 0 : this.__width,
    };
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, src } = serializedNode;
    const node = $createImageNode({
      altText,
      height,
      maxWidth,
      src,
      width,
    });
    return node;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'inline-block';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React.JSX.Element {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        style={{
          height: this.__height,
          maxWidth: this.__maxWidth,
          width: this.__width,
          display: 'block',
          margin: '10px 0',
        }}
      />
    );
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 500,
  src,
  width,
}: {
  altText: string;
  height?: 'inherit' | number;
  maxWidth?: number;
  src: string;
  width?: 'inherit' | number;
}): ImageNode {
  return new ImageNode(src, altText, maxWidth, width, height);
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}

const theme = {
  ltr: '',
  rtl: '',
  placeholder: '',
  paragraph: '',
  quote: '',
  heading: {
    h1: '',
    h2: '',
    h3: '',
  },
  list: {
    nested: {
      listitem: '',
    },
    ol: '',
    ul: '',
    listitem: '',
  },
  link: '',
  text: {
    bold: '',
    italic: '',
    underline: '',
    strikethrough: '',
    underlineStrikethrough: '',
  },
};



interface ToolbarPluginProps {
  disabled?: boolean;
}

function ToolbarPlugin({ disabled }: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateToolbar = useCallback(() => {
    const selection = getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      }
    });
  };

  const formatList = (listType: 'bullet' | 'number') => {
    if (listType === 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const formatAlignment = (alignment: 'left' | 'center' | 'right') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        editor.update(() => {
          const selection = getSelection();
          if ($isRangeSelection(selection)) {
            const imageNode = $createImageNode({
               altText: file.name,
               src,
               maxWidth: 500,
             });
             $insertNodes([imageNode]);
          }
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset the input
    event.target.value = '';
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-slate-600 bg-slate-700">
      <button
        type="button"
        onClick={() => formatText('bold')}
        disabled={disabled}
        className={`h-8 w-8 p-0 rounded text-sm font-medium transition-colors flex items-center justify-center ${isBold ? 'bg-slate-500 text-white' : 'bg-transparent text-slate-200 hover:bg-slate-600'} disabled:opacity-50`}
      >
        <Bold className="h-4 w-4" />
      </button>
      
      <button
        type="button"
        onClick={() => formatText('italic')}
        disabled={disabled}
        className={`h-8 w-8 p-0 rounded text-sm font-medium transition-colors flex items-center justify-center ${isItalic ? 'bg-slate-500 text-white' : 'bg-transparent text-slate-200 hover:bg-slate-600'} disabled:opacity-50`}
      >
        <Italic className="h-4 w-4" />
      </button>
      
      <button
        type="button"
        onClick={() => formatText('underline')}
        disabled={disabled}
        className={`h-8 w-8 p-0 rounded text-sm font-medium transition-colors flex items-center justify-center ${isUnderline ? 'bg-slate-500 text-white' : 'bg-transparent text-slate-200 hover:bg-slate-600'} disabled:opacity-50`}
      >
        <Underline className="h-4 w-4" />
      </button>

      <div className="w-px h-6 bg-slate-500 mx-1" />
      
      <button
        type="button"
        onClick={() => formatHeading('h1')}
        disabled={disabled}
        className="h-8 px-2 text-xs font-bold rounded transition-colors bg-transparent text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center"
      >
        H1
      </button>
      
      <button
        type="button"
        onClick={() => formatHeading('h2')}
        disabled={disabled}
        className="h-8 px-2 text-xs font-bold rounded transition-colors bg-transparent text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center"
      >
        H2
      </button>
      
      <button
        type="button"
        onClick={() => formatHeading('h3')}
        disabled={disabled}
        className="h-8 px-2 text-xs font-bold rounded transition-colors bg-transparent text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center"
      >
        H3
      </button>

      <div className="w-px h-6 bg-slate-500 mx-1" />
      
      <button
        type="button"
        onClick={() => formatList('bullet')}
        disabled={disabled}
        className="h-8 w-8 p-0 rounded text-sm font-medium transition-colors bg-transparent text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center"
      >
        <List className="h-4 w-4" />
      </button>
      
      <button
        type="button"
        onClick={() => formatList('number')}
        disabled={disabled}
        className="h-8 w-8 p-0 rounded text-sm font-medium transition-colors bg-transparent text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center"
      >
        <ListOrdered className="h-4 w-4" />
      </button>

      <div className="w-px h-6 bg-slate-500 mx-1" />
      
      <button
        type="button"
        onClick={() => formatAlignment('left')}
        disabled={disabled}
        className="h-8 w-8 p-0 rounded text-sm font-medium transition-colors bg-transparent text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center"
      >
        <AlignLeft className="h-4 w-4" />
      </button>
      
      <button
        type="button"
        onClick={() => formatAlignment('center')}
        disabled={disabled}
        className="h-8 w-8 p-0 rounded text-sm font-medium transition-colors bg-transparent text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center"
      >
        <AlignCenter className="h-4 w-4" />
      </button>
      
      <button
        type="button"
        onClick={() => formatAlignment('right')}
        disabled={disabled}
        className="h-8 w-8 p-0 rounded text-sm font-medium transition-colors bg-transparent text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center"
      >
        <AlignRight className="h-4 w-4" />
      </button>

      <div className="w-px h-6 bg-slate-500 mx-1" />
      
      <button
         type="button"
         onClick={() => insertImage()}
         disabled={disabled}
         className="h-8 w-8 p-0 rounded text-sm font-medium transition-colors bg-transparent text-slate-200 hover:bg-slate-600 disabled:opacity-50 flex items-center justify-center"
       >
         <Image className="h-4 w-4" />
       </button>
       
       <input
         ref={fileInputRef}
         type="file"
         accept="image/*"
         onChange={handleImageUpload}
         className="hidden"
       />
    </div>
  );
}

interface LexicalEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Removed duplicate LexicalEditor function - using LexicalRichTextEditor instead

// OnChange Plugin
function OnChangePlugin({ onChange }: { onChange: () => void }) {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    return editor.registerUpdateListener(() => {
      onChange();
    });
  }, [editor, onChange]);
  
  return null;
}

// Wrapper component that provides the composer context
export function LexicalRichTextEditor(props: LexicalEditorProps) {
  // Minimal configuration for testing
  const initialConfig = {
    namespace: 'LexicalEditor',
    theme,
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      ImageNode
    ],
    editable: !props.disabled,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LexicalEditorContent {...props} />
    </LexicalComposer>
  );
}

function LexicalEditorContent({
  value = '',
  onChange,
  placeholder = 'Enter your content...',
  disabled = false,
  className = ''
}: LexicalEditorProps) {
  const [editor] = useLexicalComposerContext();

  // Handle initial value and updates
  useEffect(() => {
    if (value && editor) {
      editor.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(value, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();
        root.clear();
        root.append(...nodes);
      });
    }
  }, [value, editor]);

  // Handle content changes
  const handleChange = useCallback(() => {
    if (onChange && editor) {
      editor.update(() => {
        const htmlString = $generateHtmlFromNodes(editor, null);
        onChange(htmlString);
      });
    }
  }, [onChange, editor]);

  return (
    <div className={`bg-slate-800 border border-slate-600 rounded-lg overflow-hidden ${className}`}>
      <ToolbarPlugin disabled={disabled} />
      <div className="relative p-4">
        <RichTextPlugin
          contentEditable={
            <ContentEditable 
              className="lexical-content-editable lexical-horizontal-text"
              style={{ 
                minHeight: '200px',
                outline: 'none',
                color: '#cbd5e1',
                lineHeight: '1.625',
                resize: 'none',
                writingMode: 'horizontal-tb',
                direction: 'ltr',
                textOrientation: 'mixed'
              }}
            />
          }
          placeholder={
            <div className="absolute top-4 left-4 text-slate-400 pointer-events-none">
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin onChange={handleChange} />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <LinkPlugin />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      </div>
    </div>
  );
}