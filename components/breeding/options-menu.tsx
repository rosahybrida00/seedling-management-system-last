"use client"

import { useState } from "react"
import { Settings, Plus, Upload, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CatalogOptionsMenuProps {
  onAdd: () => void
  onImport: () => void
  onExport: () => void
  onDeleteAll: () => void
}

export function CatalogOptionsMenu({ onAdd, onImport, onExport, onDeleteAll }: CatalogOptionsMenuProps) {
  const [open, setOpen] = useState(false)

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div className="relative shrink-0">
      <Button variant="outline" size="icon" aria-label="Options" onClick={() => setOpen((v) => !v)}>
        <Settings className="size-4" />
      </Button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg">
            <button
              type="button"
              onClick={() => run(onAdd)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <Plus className="size-4" /> Ajouter
            </button>
            <button
              type="button"
              onClick={() => run(onImport)}
              disabled
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground opacity-60"
            >
              <Upload className="size-4" /> Importer
            </button>
            <button
              type="button"
              onClick={() => run(onExport)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <Download className="size-4" /> Exporter
            </button>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              onClick={() => run(onDeleteAll)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> Tout supprimer
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
