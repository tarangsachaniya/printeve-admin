'use client'

import { useEffect, useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

const CONTENT_KEY = 'printer_legal_terms'

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
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-foreground'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHtml, setShowHtml] = useState(false)
  const [htmlValue, setHtmlValue] = useState('')

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none',
      },
    },
  })

  function toggleHtml() {
    if (!editor) return
    if (!showHtml) {
      setHtmlValue(editor.getHTML())
    } else {
      editor.commands.setContent(htmlValue)
    }
    setShowHtml(v => !v)
  }

  const loadContent = useCallback(async () => {
    if (!editor) return
    setLoading(true)
    setSaved(false)
    try {
      const res = await api.get<{ key: string; value: string | null }>(`/admin/settings/${CONTENT_KEY}`)
      editor.commands.setContent(res.value ?? '')
    } catch {
      editor.commands.setContent('')
    } finally {
      setLoading(false)
    }
  }, [editor])

  useEffect(() => {
    if (editor) loadContent()
  }, [editor, loadContent])

  async function handleSave() {
    if (!editor) return
    setSaving(true)
    try {
      await api.post('/admin/settings', { key: CONTENT_KEY, value: editor.getHTML() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Settings</h1>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/40 flex-wrap">
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')}>
            <s>S</s>
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })}>
            H3
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
            • List
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
            1. List
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')}>
            ❝
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().setHardBreak().run()}>
            ↵
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()}>
            ↩
          </ToolbarButton>
          <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()}>
            ↪
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-1" />
          <ToolbarButton onClick={toggleHtml} active={showHtml} disabled={!editor}>
            {'</>'}
          </ToolbarButton>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : showHtml ? (
          <textarea
            value={htmlValue}
            onChange={e => setHtmlValue(e.target.value)}
            className="w-full min-h-[300px] px-4 py-3 font-mono text-xs resize-y focus:outline-none bg-transparent"
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Editing: <strong>Printer Legal Terms</strong> — stored as HTML
      </p>
    </div>
  )
}
