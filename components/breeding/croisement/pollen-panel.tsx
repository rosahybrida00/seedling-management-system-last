"use client"

// Module Pollen (inchangé)

import { useState, useEffect } from "react"
import { Plus, ArrowLeft, Trash2, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Badge, Field, Input, Select, EmptyState } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import { ANTHER_QUALITY_LABELS, DEHISCENCE_LABELS, CONSERVATION_LABELS } from "@/lib/domain/supabase-types"
import { getWeatherForDate, type DailyWeather } from "@/lib/services/weatherService"
import { type PollenLot } from "@/app/croisement/types"

export function PollenPanel({ pollenLots, onRefresh }: { pollenLots: PollenLot[]; onRefresh: () => void }) {
  const [creating, setCreating] = useState(false)
  const [lotNumber, setLotNumber] = useState("")
  const [roseName, setRoseName] = useState("")
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split("T")[0])
  const [antherQuality, setAntherQuality] = useState("")
  const [dehiscence, setDehiscence] = useState("")
  const [conservationMode, setConservationMode] = useState("")
  const [remarks, setRemarks] = useState("")
  const [harvestWeather, setHarvestWeather] = useState<DailyWeather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  useEffect(() => {
    if (!creating || !harvestDate) return
    let cancelled = false
    setWeatherLoading(true)
    getWeatherForDate(harvestDate).then((w) => { if (!cancelled) { setHarvestWeather(w); setWeatherLoading(false) } })
    return () => { cancelled = true }
  }, [creating, harvestDate])

  async function createPollenLot() {
    if (!lotNumber.trim()) return
    const { error } = await supabase.from("pollen_lots").insert({
      lot_number: lotNumber.trim(),
      rose_name: roseName.trim() || null,
      harvest_date: harvestDate || null,
      weather_data: harvestWeather ?? {},
      anther_quality: antherQuality || null,
      dehiscence: dehiscence || null,
      conservation_mode: conservationMode || null,
      remarks: remarks.trim(),
    })
    if (error) { alert(`Erreur : ${error.message}`); return }
    setLotNumber(""); setRoseName(""); setHarvestDate(new Date().toISOString().split("T")[0]); setAntherQuality(""); setDehiscence(""); setConservationMode(""); setRemarks("")
    setCreating(false)
    onRefresh()
  }

  async function deletePollenLot(id: string) {
    if (!confirm("Supprimer ce lot de pollen ?")) return
    await supabase.from("pollen_lots").delete().eq("id", id)
    onRefresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Gestion des stocks de pollen conservé</h3>
          <p className="text-xs text-muted-foreground">Récolte, qualité des anthères, déhiscence et modes de conservation longue durée.</p>
        </div>
        <Button onClick={() => setCreating((v) => !v)} className="gap-1.5"><Plus className="size-4" /> Nouveau lot de pollen</Button>
      </div>

      {creating ? (
        <Card className="p-4">
          <button onClick={() => setCreating(false)} className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Retour
          </button>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Numéro de lot"><Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Ex: P-2026-01" /></Field>
            <Field label="Nom du rosier (donneur)"><Input value={roseName} onChange={(e) => setRoseName(e.target.value)} placeholder="Ex: Graham Thomas" /></Field>
            <Field label="Date de récolte"><Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} /></Field>
            <Field label="Qualité des anthères">
              <Select value={antherQuality} onChange={(e) => setAntherQuality(e.target.value)}>
                <option value="">--</option>
                {Object.entries(ANTHER_QUALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Déhiscence">
              <Select value={dehiscence} onChange={(e) => setDehiscence(e.target.value)}>
                <option value="">--</option>
                {Object.entries(DEHISCENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Mode de conservation">
              <Select value={conservationMode} onChange={(e) => setConservationMode(e.target.value)}>
                <option value="">--</option>
                {Object.entries(CONSERVATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Remarques"><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
          </div>
          <div className="mt-3 rounded-md bg-muted/20 p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Météo à la récolte (module Météo, automatique)</p>
            {weatherLoading ? (
              <p className="text-xs text-muted-foreground">Récupération de la météo…</p>
            ) : harvestWeather ? (
              <div className="flex flex-wrap gap-1.5">
                {harvestWeather.temperature != null ? <Badge tone="neutral">{Math.round(harvestWeather.temperature)}°C</Badge> : null}
                {harvestWeather.humidity != null ? <Badge tone="neutral">{Math.round(harvestWeather.humidity)}% hum.</Badge> : null}
                {harvestWeather.uv_index != null ? <Badge tone="neutral">UV {Math.round(harvestWeather.uv_index)}</Badge> : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Météo indisponible pour cette date.</p>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>Annuler</Button>
            <Button onClick={createPollenLot} disabled={!lotNumber.trim()}>Enregistrer le lot</Button>
          </div>
        </Card>
      ) : null}

      {pollenLots.length === 0 ? (
        <EmptyState icon={<FlaskConical className="size-8" />} title="Aucun lot de pollen enregistré" description="Créez des lots de pollen pour pouvoir les associer ultérieurement dans vos croisements." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pollenLots.map((pl) => (
            <Card key={pl.id} className="flex flex-col justify-between gap-3 p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-base font-semibold text-primary">Lot #{pl.lot_number}</span>
                  <button onClick={() => deletePollenLot(pl.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">{pl.rose_name ?? "Rosier inconnu"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pl.anther_quality ? <Badge tone="neutral">Anthères: {ANTHER_QUALITY_LABELS[pl.anther_quality] ?? pl.anther_quality}</Badge> : null}
                  {pl.dehiscence ? <Badge tone="neutral">Déhiscence: {DEHISCENCE_LABELS[pl.dehiscence] ?? pl.dehiscence}</Badge> : null}
                  {pl.conservation_mode ? <Badge tone="primary">Stockage: {CONSERVATION_LABELS[pl.conservation_mode] ?? pl.conservation_mode}</Badge> : null}
                </div>
                {pl.remarks ? <p className="mt-2 text-xs text-muted-foreground italic">{pl.remarks}</p> : null}
              </div>
              <div className="border-t border-border pt-2 text-[10px] text-muted-foreground">
                {pl.harvest_date ? `Récolté le ${formatDate(pl.harvest_date)}` : `Créé le ${formatDate(pl.created_at)}`}
                {pl.weather_data?.temperature != null ? ` · ${Math.round(pl.weather_data.temperature)}°C` : ""}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
