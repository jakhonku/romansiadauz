'use client';

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from 'lucide-react';
import { useCallback } from 'react';

import { cn } from '@/lib/utils/cn';

export interface EditorLabels {
  bold: string;
  italic: string;
  heading2: string;
  heading3: string;
  bulletList: string;
  orderedList: string;
  quote: string;
  link: string;
  unlink: string;
  linkPrompt: string;
  undo: string;
  redo: string;
}

/**
 * Rich-text editor for article bodies.
 *
 * The extension set is deliberately narrow and matches the allow-list in
 * `lib/utils/sanitize.ts` exactly. An editor that can produce markup the sanitiser then
 * strips is worse than one that cannot produce it: the author sees their formatting
 * vanish after saving and has no way to find out why.
 *
 * `immediatelyRender: false` is required under the App Router — Tiptap renders to the
 * DOM, and letting it run during SSR produces a hydration mismatch on every mount.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  labels,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  labels: EditorLabels;
  className?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // The article title is the page's only h1; an editor inserting a second one
        // would break the document outline.
        codeBlock: false,
        horizontalRule: {},
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        // Mirrors the sanitiser: anything outside these schemes is dropped on save, so
        // it must be impossible to insert here.
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-neutral min-h-[18rem] max-w-none px-4 py-3 focus:outline-none dark:prose-invert',
          'prose-headings:font-display prose-a:text-primary',
        ),
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;

    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt(labels.linkPrompt, previous ?? 'https://');

    // `null` means the dialog was dismissed — leave the document untouched. An empty
    // string means the field was cleared, which is an explicit "remove this link".
    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor, labels.linkPrompt]);

  if (!editor) {
    // Same height as the mounted editor, so the form does not jump on hydration.
    return <div className={cn('min-h-[21rem] rounded-md border border-input bg-muted/30', className)} />;
  }

  return (
    <div className={cn('overflow-hidden rounded-md border border-input bg-background', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1.5">
        <ToolButton
          editor={editor}
          label={labels.bold}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolButton>
        <ToolButton
          editor={editor}
          label={labels.italic}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolButton>

        <Divider />

        <ToolButton
          editor={editor}
          label={labels.heading2}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolButton>
        <ToolButton
          editor={editor}
          label={labels.heading3}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolButton>

        <Divider />

        <ToolButton
          editor={editor}
          label={labels.bulletList}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolButton>
        <ToolButton
          editor={editor}
          label={labels.orderedList}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolButton>
        <ToolButton
          editor={editor}
          label={labels.quote}
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolButton>

        <Divider />

        <ToolButton
          editor={editor}
          label={labels.link}
          active={editor.isActive('link')}
          onClick={setLink}
        >
          <Link2 className="size-4" />
        </ToolButton>
        <ToolButton
          editor={editor}
          label={labels.unlink}
          disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Link2Off className="size-4" />
        </ToolButton>

        <Divider />

        <ToolButton
          editor={editor}
          label={labels.undo}
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </ToolButton>
        <ToolButton
          editor={editor}
          label={labels.redo}
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </ToolButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  editor: Editor;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      // `aria-pressed` rather than colour alone, so a screen reader announces whether
      // bold is currently on.
      aria-pressed={active}
      className={cn(
        'grid size-8 place-items-center rounded-sm transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
