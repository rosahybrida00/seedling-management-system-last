"use client"

// Formulaire de lot — allégé : en ajout de lot sur un couple existant, les
// champs de parents disparaissent complètement (plus de doublon de saisie).

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Badge, Field, Input, Select } from "@/components/breeding/ui"
import { ANTHER_QUALITY_LABELS, DEHISCENCE_LABELS, CONSERVATION_LABELS } from "@/lib/domain/supabase-types"
import { type DailyWeather } from "@/lib/services/weatherService"
import { PISTIL_GROUPS, type PollenLot, type VarietySuggestion } from "@/app/croisement/types"

export function LotForm({
  form, setForm, lockParents, seedSuggestions, pollenSuggestions, showSeedSugg, showPollenSugg,
  setShowSeedSugg, setShowPollenSugg, pollenLots, pollinationWeather, weatherLoading, onCancel, onSubmit,
}: {
  form: any; setForm: (updater: any) => void; lockParents: boolean
  seedSuggestions: VarietySuggestion[]; pollenSuggestions: VarietySuggestion[]
  showSeedSugg: boolean; showPollenSugg: boolean
  setShowSeedSugg: (v: boolean) => void; setShowPollenSugg: (v: boolean) => void
  pollenLots: PollenLot[]; pollinationWeather: DailyWeather | null; weatherLoading: boolean
  onCancel: () => void; onSubmit: () => void
}) {
  return (
    <Card className="p-4">
      <button onClick={onCancel} className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour
      </button>
      {lockParents ? (
        <p className="mb-3 text-sm font-medium text-foreground">{form.seedParent} <span className="text-muted-foreground">×</span> {form.pollenParent}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!lockParents ? (
          <>
            <div className="relative">
              <Field label="Parent porte-graine (♀)">
                <Input value={form.seedParent} onChange={(e) => setForm({ ...form, seedParent: e.target.value, seedParentId: "" })} onFocus={() => { if (seedSuggestions.length > 0) setShowSeedSugg(true) }} placeholder="Ex: Grande Amore..." />
              </Field>
              {showSeedSugg && seedSuggestions.length > 0 ? (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                  {seedSuggestions.map((s) => (
                    <div key={s.id} className="cursor-pointer px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground" onClick={() => { setForm({ ...form, seedParent: s.name, seedParentId: s.id }); setShowSeedSugg(false) }}>
                      <span className="font-medium text-foreground">{s.name}</span>
                      {s.commercial_name && s.commercial_name !== s.name ? <span className="text-muted-foreground"> ({s.commercial_name})</span> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="relative">
              <Field label="Parent pollen (♂)">
                <Input value={form.pollenParent} onChange={(e) => setForm({ ...form, pollenParent: e.target.value, pollenParentId: "" })} onFocus={() => { if (pollenSuggestions.length > 0) setShowPollenSugg(true) }} placeholder="Ex: Black Baccara..." />
              </Field>
              {showPollenSugg && pollenSuggestions.length > 0 ? (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                  {pollenSuggestions.map((s) => (
                    <div key={s.id} className="cursor-pointer px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground" onClick={() => { setForm({ ...form, pollenParent: s.name, pollenParentId: s.id }); setShowPollenSugg(false) }}>
                      <span className="font-medium text-foreground">{s.name}</span>
                      {s.commercial_name && s.commercial_name !== s.name ? <span className="text-muted-foreground"> ({s.commercial_name})</span> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        <Field label="Date de pollinisation"><Input type="date" value={form.pollinationDate} onChange={(e) => setForm({ ...form, pollinationDate: e.target.value })} /></Field>
        <Field label="Nombre de fleurs pollinisées" hint="Laissez vide pour le renseigner plus tard"><Input type="number" min={1} value={form.pollinatedFlowersCount} onChange={(e) => setForm({ ...form, pollinatedFlowersCount: e.target.value })} /></Field>

        <Field label="Type de pollen">
          <Select value={form.pollenType} onChange={(e) => setForm({ ...form, pollenType: e.target.value })}>
            <option value="frais">Pollen frais (utilisation directe)</option>
            <option value="conservé">Lot de pollen conservé (stock)</option>
          </Select>
        </Field>
        {form.pollenType === "conservé" ? (
          <Field label="Lot de pollen conservé">
            <Select value={form.pollenLotId} onChange={(e) => setForm({ ...form, pollenLotId: e.target.value })}>
              <option value="">-- Sélectionner --</option>
              {pollenLots.map((pl) => <option key={pl.id} value={pl.id}>Lot #{pl.lot_number} ({pl.rose_name ?? "Inconnu"})</option>)}
            </Select>
          </Field>
        ) : null}
      </div>

      {form.pollenType === "conservé" && form.pollenLotId ? (() => {
        const usedLot = pollenLots.find((pl) => pl.id === form.pollenLotId)
        return usedLot ? (
          <div className="mt-3 rounded-md bg-primary/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lot utilisé</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge tone="primary">Lot #{usedLot.lot_number} — {usedLot.rose_name ?? "Inconnu"}</Badge>
              {usedLot.anther_quality ? <Badge tone="neutral">Anthères: {ANTHER_QUALITY_LABELS[usedLot.anther_quality] ?? usedLot.anther_quality}</Badge> : null}
              {usedLot.dehiscence ? <Badge tone="neutral">Déhiscence: {DEHISCENCE_LABELS[usedLot.dehiscence] ?? usedLot.dehiscence}</Badge> : null}
              {usedLot.conservation_mode ? <Badge tone="neutral">Stockage: {CONSERVATION_LABELS[usedLot.conservation_mode] ?? usedLot.conservation_mode}</Badge> : null}
            </div>
          </div>
        ) : null
      })() : null}

      {form.pollenType === "frais" ? (
        <div className="mt-3 grid gap-3 rounded-md bg-primary/5 p-3 sm:grid-cols-2">
          <p className="col-span-full -mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Observation du pollen frais du jour (obligatoire — mêmes cases que le module Pollen, hors stockage)
          </p>
          <Field label="Qualité des anthères">
            <Select value={form.freshAntherQuality} onChange={(e) => setForm({ ...form, freshAntherQuality: e.target.value })}>
              <option value="">-- Sélectionner --</option>
              {Object.entries(ANTHER_QUALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Déhiscence">
            <Select value={form.freshDehiscence} onChange={(e) => setForm({ ...form, freshDehiscence: e.target.value })}>
              <option value="">-- Sélectionner --</option>
              {Object.entries(DEHISCENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">État du pistil observé</p>
        {PISTIL_GROUPS.map((group) => (
          <div key={group.title} className="grid gap-1">
            <p className="text-xs font-medium text-foreground">{group.title}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(group.options).map(([k, v]) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={form.pistilChecklist.includes(k)} onChange={(e) => setForm({ ...form, pistilChecklist: e.target.checked ? [...form.pistilChecklist, k] : form.pistilChecklist.filter((c: string) => c !== k) })} /> {v}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-md bg-muted/20 p-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Météo du jour (module Météo, automatique)</p>
        {weatherLoading ? (
          <p className="text-xs text-muted-foreground">Récupération de la météo…</p>
        ) : pollinationWeather ? (
          <div className="flex flex-wrap gap-1.5">
            {pollinationWeather.temperature != null ? <Badge tone="neutral">{Math.round(pollinationWeather.temperature)}°C</Badge> : null}
            {pollinationWeather.humidity != null ? <Badge tone="neutral">{Math.round(pollinationWeather.humidity)}% hum.</Badge> : null}
            {pollinationWeather.uv_index != null ? <Badge tone="neutral">UV {Math.round(pollinationWeather.uv_index)}</Badge> : null}
            <Badge tone="neutral">{pollinationWeather.source === "live" ? "Temps réel" : "Historique"}</Badge>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Météo indisponible pour cette date (localisation manquante dans le profil).</p>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Annuler</Button>
        <Button onClick={onSubmit} disabled={!lockParents && !form.seedParent.trim() && !form.pollenParent.trim()}>
          {lockParents ? "Créer le lot" : "Créer"}
        </Button>
      </div>
    </Card>
  )
}
