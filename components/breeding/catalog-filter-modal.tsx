"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CatalogFilterModalProps {
  open: boolean
  onClose: () => void
  availableTypes: string[]
  availableColors: string[]
  selectedTypes: string[]
  selectedColors: string[]
  onApply: (types: string[], colors: string[]) => void
}

export function CatalogFilterModal({
  open,
  onClose,
  availableTypes,
  availableColors,
  selectedTypes,
  selectedColors,
  onApply,
}: CatalogFilterModalProps) {
  const [pendingTypes, setPendingTypes] = useState<string[]>(selectedTypes)
  const [pendingColors, setPendingColors] = useState<string[]>(selectedColors)

  // Resynchronise l'état local à chaque ouverture du panneau.
  useEffect(() => {
    if (open) {
      setPendingTypes(selectedTypes)
      setPendingColors(selectedColors)
    }
  }, [open, selectedTypes, selectedColors])

  if (!open) return null

  function toggle(list: string[], value: string, setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  function handleReset() {
    setPendingTypes([])
    setPendingColors([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-xl md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted md:hidden" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">Filtres</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-medium text-accent hover:underline"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="text-muted-foreground hover:text-foreground md:hidden"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {availableTypes.length > 0 ? (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</p>
              <div className="flex flex-wrap gap-2">
                {availableTypes.map((type) => (
                  <FilterChip
                    key={type}
                    label={type}
                    active={pendingTypes.includes(type)}
                    onClick={() => toggle(pendingTypes, type, setPendingTypes)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {availableColors.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Couleur</p>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <FilterChip
                    key={color}
                    label={color}
                    active={pendingColors.includes(color)}
                    onClick={() => toggle(pendingColors, color, setPendingColors)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <Button
          onClick={() => onApply(pendingTypes, pendingColors)}
          className="mt-5 w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Appliquer les filtres
        </Button>
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  )
}
