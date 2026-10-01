"use client"

// Champs à édition inline : un clic affiche un input, Entrée valide.

import { useState, useEffect } from "react"
import { Input } from "@/components/breeding/ui"
import { formatDate, fromDateInput, toDateInput } from "@/components/breeding/format"

export function InlineText({ value, placeholder, onSave, textClassName }: { value: string; placeholder: string; onSave: (v: string) => void; textClassName?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); if (draft !== value) onSave(draft) }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.currentTarget.blur() }
          if (e.key === "Escape") { setDraft(value); setEditing(false) }
        }}
        className="h-7 px-2 text-xs"
      />
    )
  }
  return (
    <span onClick={(e) => { e.stopPropagation(); setEditing(true) }} className={textClassName ?? "cursor-text text-xs text-foreground hover:underline decoration-dotted"}>
      {value || <span className="italic text-muted-foreground">{placeholder}</span>}
    </span>
  )
}

export function InlineDate({ value, onSave, textClassName }: { value: string | null; onSave: (v: string) => void; textClassName?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(toDateInput(value))
  useEffect(() => { if (!editing) setDraft(toDateInput(value)) }, [value, editing])

  if (editing) {
    return (
      <Input
        autoFocus type="date"
        value={draft}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); const parsed = fromDateInput(draft); if (parsed) onSave(parsed) }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditing(false) }}
        className="h-7 w-36 px-2 text-xs"
      />
    )
  }
  return (
    <span onClick={(e) => { e.stopPropagation(); setEditing(true) }} className={textClassName ?? "cursor-text text-xs text-foreground hover:underline decoration-dotted"}>
      {formatDate(value)}
    </span>
  )
}
