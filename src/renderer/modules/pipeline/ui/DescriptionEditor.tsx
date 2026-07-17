import { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { cn } from '../../../shared/utils/cn';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3,
  Link as LinkIcon, Minus, CodeXml,
} from 'lucide-react';

interface DescriptionEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  compact?: boolean;
  editable?: boolean;
  className?: string;
  /** Expand editor content area to fill available vertical space */
  fillHeight?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'rounded-md p-1.5 transition-colors',
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
      )}
    >
      {children}
    </button>
  );
}

const btnClass = 'h-4 w-4';

export default function DescriptionEditor({
  content,
  onChange,
  placeholder = 'Add a more detailed description…',
  compact = false,
  editable = true,
  className,
  fillHeight = false,
}: DescriptionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      LinkExtension.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { class: 'text-indigo-600 underline hover:text-indigo-800' },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const [showSource, setShowSource] = useState(false);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const toolbar = (
    <div className={cn('flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50/80 px-2 py-1.5', compact && 'gap-0')}>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
        <Bold className={btnClass} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
        <Italic className={btnClass} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
        <UnderlineIcon className={btnClass} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough className={btnClass} />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-300" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 className={btnClass} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 className={btnClass} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
        <Heading3 className={btnClass} />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-300" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
        <List className={btnClass} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
        <ListOrdered className={btnClass} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
        <Quote className={btnClass} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
        <Code className={btnClass} />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-300" />

      <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Link">
        <LinkIcon className={btnClass} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
        <Minus className={btnClass} />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-gray-300" />

      <ToolbarButton onClick={() => setShowSource((v) => !v)} active={showSource} title="Toggle source">
        <CodeXml className={btnClass} />
      </ToolbarButton>
    </div>
  );

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm',
        editable
          ? 'border-gray-200 hover:border-gray-300'
          : 'border-transparent bg-transparent shadow-none',
        fillHeight && 'h-full',
        className,
      )}
      onClick={() => editable && editor.chain().focus().run()}
    >
      {editable && toolbar}
      {showSource && editable ? (
        <textarea
          value={editor.getHTML()}
          onChange={(e) => editor.commands.setContent(e.target.value, { emitUpdate: false })}
          className={cn(
            'w-full resize-y border-0 bg-gray-50 px-3 py-2 font-mono text-xs leading-relaxed text-gray-700 focus:outline-none',
            fillHeight ? 'min-h-0 flex-1' : '',
          )}
          spellCheck={false}
        />
      ) : (
        <EditorContent
          editor={editor}
          className={cn(
            '[&_.ProseMirror]:outline-none prose prose-sm max-w-none overflow-y-auto px-3 py-2 text-sm prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-indigo-600 prose-strong:text-gray-900 prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 prose-code:text-xs prose-pre:rounded-lg prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-blockquote:border-l-indigo-400 prose-blockquote:text-gray-600 prose-li:text-gray-700',
            compact ? 'min-h-[100px]' : 'min-h-[200px]',
            fillHeight && 'min-h-0 flex-1',
            !editable && 'px-0 py-0 min-h-0',
          )}
        />
      )}
    </div>
  );
}
