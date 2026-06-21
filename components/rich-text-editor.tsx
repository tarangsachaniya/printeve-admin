'use client'

import { useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

function ToolbarButton({
  onClick, active, disabled, children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

interface RichTextEditorProps {
  editor: Editor | null
  minHeight?: string
}

export function RichTextEditor({ editor, minHeight = '140px' }: RichTextEditorProps) {
  const [showHtml, setShowHtml] = useState(false)
  const [htmlValue, setHtmlValue] = useState('')

  function toggleHtml() {
    if (!editor) return
    if (!showHtml) {
      setHtmlValue(editor.getHTML())
    } else {
      editor.commands.setContent(htmlValue)
    }
    setShowHtml(v => !v)
  }

  if (!editor) return null

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/40 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
          <s>S</s>
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
          H2
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
          H3
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          Bullet List
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          Ordered List
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
          ❝
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHardBreak().run()}>
          ↵
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          ↩
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          ↪
        </ToolbarButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolbarButton onClick={toggleHtml} active={showHtml}>
          {'</>'}
        </ToolbarButton>
      </div>

      {showHtml ? (
        <textarea
          value={htmlValue}
          onChange={e => setHtmlValue(e.target.value)}
          className="w-full px-4 py-3 font-mono text-xs resize-y focus:outline-none bg-transparent"
          style={{ minHeight }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  )
}

export function useRichTextEditor(content = '', minHeight = '140px') {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none px-4 py-3 focus:outline-none`,
        style: `min-height: ${minHeight}`,
      },
    },
  })

  return editor
}
