"use client"

// Suivi du lot de graines par fruit, après récolte : méthode de
// stratification (cases à cocher — liste provisoire, voir fieldLabels.ts),
// date de début et date de fin. Un lot (sowing_batches) regroupe toutes les
// graines d'un même fruit récolté ; ce suivi est donc au niveau du lot, pas
// de chaque semis individuel.

import { useState } from "react"
import { Snowflake, ChevronDown, ChevronUp } from "lucide-react"
import { Card, Field, Input, SectionHeading } from "@/components/breeding/ui"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { STRATIFICATION_METHOD_LABELS } from "@/lib/domain/fieldLabels"

interface SowingBatch {
  id: string
  cross_id: string
  fruit_code: string | null
  seed_count: number
  original_seed_count: number | null
  stratification_methods: string[] | null
  stratification_start_date: string | null
  stratification_end_date: string | null
}

interface CrossInfo {
  id: string
  seed_parent: string | null
  pollen_parent: string | null
}

export function SeedLotTracking({
  batches,
  crossMap,
  onRefresh,
}: {
  batches: SowingBatch[]
  crossMap: Map<string, CrossInfo>
  onRefresh: () => void
}) {
  const [open, setOpen] = useState(true)

  if (batches.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading
        title="Suivi des lots de graines"
        description="Stratification par fruit récolté. Une graine appartient à un seul lot ; ce suivi s'applique à tout le lot."
        action={
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} className="gap-1.5">
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {open ? "Réduire" : "Afficher"}
          </Button>
        }
      />
      {open ? (
        <div className="grid gap-3">
          {batches.map((batch) => (
            <SeedLotRow key={batch.id} batch={batch} cross={crossMap.get(batch.cross_id) ?? null} onRefresh={onRefresh} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SeedLotRow({ batch, cross, onRefresh }: { batch: SowingBatch; cross: CrossInfo | null; onRefresh: () => void }) {
  const [methods, setMethods] = useState<string[]>(batch.stratification_methods ?? [])
  const [startDate, setStartDate] = useState(batch.stratification_start_date ?? "")
  const [endDate, setEndDate] = useState(batch.stratification_end_date ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    JSON.stringify(methods) !== JSON.stringify(batch.stratification_methods ?? []) ||
    startDate !== (batch.stratification_start_date ?? "") ||
    endDate !== (batch.stratification_end_date ?? "")

  function toggleMethod(key: string) {
    setMethods((current) => (current.includes(key) ? current.filter((m) => m !== key) : [...current, key]))
  }

  async function save() {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from("sowing_batches")
      .update({
        stratification_methods: methods,
        stratification_start_date: startDate || null,
        stratification_end_date: endDate || null,
      })
      .eq("id", batch.id)
    setSaving(false)
    if (err) {
      setError(`Erreur lors de l'enregistrement : ${err.message}`)
      return
    }
    onRefresh()
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Snowflake className="size-4" />
        </span>
        <div className="flex-1">
          <p className="font-serif text-base text-foreground">{batch.fruit_code ?? "Lot sans fruit associé"}</p>
          <p className="text-xs text-muted-foreground">
            {cross ? `${cross.seed_parent ?? "?"} × ${cross.pollen_parent ?? "?"} · ` : ""}
            {batch.seed_count} graine(s){batch.original_seed_count && batch.original_seed_count !== batch.seed_count ? ` (récolte initiale : ${batch.original_seed_count})` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <Field label="Méthode de stratification" hint="Liste provisoire, ajustable sans migration.">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {Object.entries(STRATIFICATION_METHOD_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 text-sm text-foreground">
                <input type="checkbox" checked={methods.includes(key)} onChange={() => toggleMethod(key)} />
                {label}
              </label>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Date de début de stratification">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Date de fin de stratification">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || saving} className="gap-1.5">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </Card>
  )
}
