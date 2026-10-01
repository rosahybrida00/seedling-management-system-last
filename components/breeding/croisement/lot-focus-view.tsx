"use client"

import { useState } from "react"
import { ArrowLeft, Trash2, FlaskConical, Shield, Cherry } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Badge, Field, Input } from "@/components/breeding/ui"
import { ANTHER_QUALITY_LABELS, DEHISCENCE_LABELS } from "@/lib/domain/supabase-types"
import { InlineText, InlineDate } from "@/components/breeding/croisement/inline-fields"
import { FruitFocusView } from "@/components/breeding/croisement/fruit-focus-view"
import { PISTIL_OPTIONS, type CrossFruit, type PollenLot, type PhenologyObservation, type Treatment } from "@/app/croisement/types"

export function LotFocusView({
  lot, fruits, seedsByFruit, treatments, greenhouses, tables, pollenLots,
  onBack, onPatch, onDelete, onValidateFlowerCount, onHarvestFruit, onAbortFruit, onAddPhenologyObservation,
}: any) {
  const [flowerInput, setFlowerInput] = useState("")
  const [focusedFruit, setFocusedFruit] = useState<CrossFruit | null>(null)
  const climate = (lot.climate_data ?? {}) as Record<string, any>
  const pollenQuality = (lot.pollen_quality ?? {}) as Record<string, any>
  const usedPollenLot = lot.pollen_type === "conservé" ? (pollenLots as PollenLot[])?.find((pl) => pl.id === lot.pollen_lot_id) : null

  if (focusedFruit) {
    const current = fruits.find((f: CrossFruit) => f.id === focusedFruit.id) ?? focusedFruit
    return (
      <FruitFocusView
        fruit={current}
        seeds={seedsByFruit.get(current.id) ?? []}
        greenhouses={greenhouses}
        tables={tables}
        onBack={() => setFocusedFruit(null)}
        onHarvest={(values: any) => onHarvestFruit(current, values)}
        onAbort={(causes: string[]) => onAbortFruit(current, causes)}
        onAddObservation={(obs: PhenologyObservation) => onAddPhenologyObservation(current, obs)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour au croisement
      </button>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-serif text-lg text-primary">Lot {lot.lot_letter}</span>
          <span className="text-xs text-muted-foreground">Pollinisé le</span>
          <InlineDate value={lot.pollination_date} onSave={(v) => onPatch({ pollination_date: v })} />
          <Badge tone={lot.pollen_type === "conservé" ? "primary" : "neutral"}>{lot.pollen_type === "conservé" ? "Pollen conservé" : "Pollen frais"}</Badge>
          <button onClick={onDelete} className="ml-auto text-muted-foreground hover:text-destructive" title="Supprimer le lot">
            <Trash2 className="size-4" />
          </button>
        </div>
        <div className="mt-2">
          <InlineText value={lot.remarks ?? ""} placeholder="Remarques..." onSave={(v) => onPatch({ remarks: v })} textClassName="cursor-text text-xs text-muted-foreground italic hover:underline decoration-dotted" />
        </div>
        {Object.keys(climate).length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {climate.temperature != null ? <Badge tone="neutral">{Math.round(climate.temperature)}°C</Badge> : null}
            {climate.humidity != null ? <Badge tone="neutral">{Math.round(climate.humidity)}% hum.</Badge> : null}
            {climate.uv_index != null ? <Badge tone="neutral">UV {Math.round(climate.uv_index)}</Badge> : null}
            {climate.source ? <Badge tone="neutral">{climate.source === "live" ? "Météo temps réel" : "Météo historique"}</Badge> : null}
          </div>
        ) : null}
        {lot.pistil_checklist?.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {lot.pistil_checklist.map((k: string) => <Badge key={k} tone="neutral">{PISTIL_OPTIONS[k] ?? k}</Badge>)}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <FlaskConical className="size-3.5 text-muted-foreground" />
          {lot.pollen_type === "conservé" ? (
            usedPollenLot ? (
              <>
                <Badge tone="primary">Lot #{usedPollenLot.lot_number} — {usedPollenLot.rose_name ?? "Inconnu"}</Badge>
                {usedPollenLot.anther_quality ? <Badge tone="neutral">Anthères: {ANTHER_QUALITY_LABELS[usedPollenLot.anther_quality] ?? usedPollenLot.anther_quality}</Badge> : null}
                {usedPollenLot.dehiscence ? <Badge tone="neutral">Déhiscence: {DEHISCENCE_LABELS[usedPollenLot.dehiscence] ?? usedPollenLot.dehiscence}</Badge> : null}
              </>
            ) : <Badge tone="neutral">Pollen conservé (lot non retrouvé)</Badge>
          ) : (
            <>
              <Badge tone="neutral">Pollen frais</Badge>
              {pollenQuality.anther_quality ? <Badge tone="neutral">Anthères: {ANTHER_QUALITY_LABELS[pollenQuality.anther_quality] ?? pollenQuality.anther_quality}</Badge> : null}
              {pollenQuality.dehiscence ? <Badge tone="neutral">Déhiscence: {DEHISCENCE_LABELS[pollenQuality.dehiscence] ?? pollenQuality.dehiscence}</Badge> : null}
            </>
          )}
        </div>
      </Card>

      <Card className="p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Rappel des suivis Parcelle (sanitaire, phyto, amendements)</p>
        {treatments.length > 0 || lot.location || lot.containers ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {lot.location ? <Badge tone="neutral">{lot.location}</Badge> : null}
            {lot.containers ? <Badge tone="neutral">{lot.containers}</Badge> : null}
            {treatments.map((t: Treatment) => <Badge key={t.id} tone="neutral"><Shield className="size-3" /> {t.product_name}</Badge>)}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucun suivi Parcelle enregistré pour ces parents pour l'instant.</p>
        )}
      </Card>

      {lot.flower_count == null ? (
        <Card className="flex flex-wrap items-end gap-3 p-3">
          <Field label="Fleurs pollinisées" hint="Génère aussitôt les fruits a, b, c...">
            <Input className="w-36" type="number" min={1} value={flowerInput} onChange={(e) => setFlowerInput(e.target.value)} />
          </Field>
          <Button size="sm" disabled={!flowerInput.trim()} onClick={() => onValidateFlowerCount(Math.max(1, Number.parseInt(flowerInput, 10) || 0))}>
            Valider le nombre de fleurs
          </Button>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fruits.map((fruit: CrossFruit) => {
            const fruitSeeds = seedsByFruit.get(fruit.id) ?? []
            const tone = fruit.status === "récolté" ? "success" : fruit.status === "avorté" ? "danger" : fruit.status === "vide" ? "warning" : "neutral"
            const observationsCount = fruit.checklist?.observations?.length ?? 0
            return (
              <button key={fruit.id} onClick={() => setFocusedFruit(fruit)} className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Cherry className="size-4 text-primary" />
                  <span className="text-sm font-medium">{fruit.fruit_name}</span>
                  <Badge tone={tone} className="ml-auto">{fruit.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fruit.status === "récolté" ? `${fruitSeeds.length} graine${fruitSeeds.length > 1 ? "s" : ""}` : observationsCount > 0 ? `${observationsCount} observation${observationsCount > 1 ? "s" : ""} de nouaison` : "Aucune observation pour l'instant"}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
