"use client"

// Observation pure : date, météo du jour, symptômes (maladies, ravageurs),
// comportement face au climat, remarque. Les SOINS (produit appliqué, réaction)
// ne se saisissent plus ici : ils relèvent des interventions, avec leur résultat.
// Les anciennes observations gardent l'affichage de leurs traitements.

import { useState, useEffect } from "react"
import { Plus, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Badge, Field, Input, EmptyState, Textarea } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import {
  DISEASE_PRESSURE_LABELS, PEST_LABELS, CLIMATE_BEHAVIOR_LABELS,
  FIELD_TREATMENT_LABELS, TREATMENT_REACTION_LABELS,
} from "@/lib/domain/fieldLabels"
import { getWeatherForDate, type DailyWeather } from "@/lib/services/weatherService"
import type { FieldObservation } from "@/app/parcelle/types"

export interface SavedObservation {
  id: string | null
  date: string
  diseases: string[]
  pests: string[]
}

export function ObservationsSection({ plantingId, greenhouseTableId, parcelleId, observations, onRefresh, showList = true, startOpen = false, onSaved, onCancel }: {
  plantingId: string
  greenhouseTableId: string | null
  parcelleId: string | null
  observations: FieldObservation[]
  onRefresh: () => void
  /** Faux : seul le formulaire est affiché (la liste vit ailleurs, ex. dans la frise du plant). */
  showList?: boolean
  startOpen?: boolean
  /** Appelé après l'enregistrement, avec les problèmes cochés : sert à proposer un plan de traitement. */
  onSaved?: (observation: SavedObservation) => void
  onCancel?: () => void
}) {
  const [creating, setCreating] = useState(startOpen)
  const [observationDate, setObservationDate] = useState(new Date().toISOString().split("T")[0])
  const [disease, setDisease] = useState<string[]>([])
  const [pests, setPests] = useState<string[]>([])
  const [climate, setClimate] = useState<string[]>([])
  const [remarque, setRemarque] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [weather, setWeather] = useState<DailyWeather | null>(null)
  const [weatherDailyId, setWeatherDailyId] = useState<string | null>(null)

  useEffect(() => {
    if (!creating) return
    let cancelled = false
    async function loadWeather() {
      const dailyWeather = await getWeatherForDate(observationDate)
      if (cancelled) return
      setWeather(dailyWeather)
      if (!dailyWeather) { setWeatherDailyId(null); return }
      const { data: auth } = await supabase.auth.getUser()
      const { data } = await supabase.from("weather_daily").select("id").eq("user_id", auth.user?.id ?? "").eq("date", observationDate).maybeSingle()
      if (!cancelled) setWeatherDailyId(data?.id ?? null)
    }
    loadWeather()
    return () => { cancelled = true }
  }, [creating, observationDate])

  function toggle(setter: (fn: (cur: string[]) => string[]) => void, key: string) {
    setter((cur) => (cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]))
  }

  async function submit() {
    if (observationDate > new Date().toISOString().split("T")[0]) { setError("Une observation ne peut pas être datée dans le futur."); return }
    setSaving(true)
    setError(null)
    const { data, error: insertError } = await supabase.from("field_observations").insert({
      planting_id: plantingId, observation_date: observationDate,
      disease_pressure: disease, pests, climate_behavior: climate,
      // Observation pure : ni traitement ni réaction (ils se saisissent dans l'intervention).
      treatment_applied: [], treatment_reaction: [], intervention_date: null,
      remarque,
      weather_daily_id: weatherDailyId,
      greenhouse_table_id: greenhouseTableId,
      parcelle_id: parcelleId,
    }).select("id").single()
    setSaving(false)
    if (insertError) { setError(insertError.code === "23514" ? insertError.message : `Enregistrement impossible : ${insertError.message}`); return }
    const saved: SavedObservation = { id: (data?.id as string | undefined) ?? null, date: observationDate, diseases: disease, pests }
    setDisease([]); setPests([]); setClimate([]); setRemarque(""); setCreating(false)
    onSaved?.(saved)
    onRefresh()
  }

  const groups = [
    { title: "Maladie / Pression sanitaire", labels: DISEASE_PRESSURE_LABELS, value: disease, set: setDisease },
    { title: "Insectes / Ravageurs", labels: PEST_LABELS, value: pests, set: setPests },
    { title: "Comportement face au climat", labels: CLIMATE_BEHAVIOR_LABELS, value: climate, set: setClimate },
  ]

  return (
    <div className="flex flex-col gap-3">
      {showList ? <div className="flex justify-end"><Button size="sm" onClick={() => setCreating((v) => !v)} className="gap-1.5"><Plus className="size-4" /> Nouvelle observation</Button></div> : null}

      {creating ? (
        <Card className="p-4">
          <p className="mb-3 text-xs text-muted-foreground">Observation seule : symptômes, météo et date. Les soins se saisissent dans « Intervention », avec leur résultat.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date de l'observation"><Input type="date" max={new Date().toISOString().split("T")[0]} value={observationDate} onChange={(e) => setObservationDate(e.target.value)} /></Field>
          </div>
          {weather ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {weather.temperature != null ? <Badge tone="neutral">{Math.round(weather.temperature)}°C</Badge> : null}
              {weather.humidity != null ? <Badge tone="neutral">{Math.round(weather.humidity)}% hum.</Badge> : null}
              {weather.uv_index != null ? <Badge tone="neutral">UV {Math.round(weather.uv_index)}</Badge> : null}
            </div>
          ) : null}
          {groups.map((g) => (
            <div key={g.title} className="mt-3 grid gap-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.title}</p>
              <div className="flex flex-wrap gap-3 text-xs">
                {Object.entries(g.labels).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={g.value.includes(k)} onChange={() => toggle(g.set, k)} /> {v}</label>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-3"><Field label="Remarque"><Textarea value={remarque} onChange={(e) => setRemarque(e.target.value)} /></Field></div>
          {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => { setCreating(false); onCancel?.() }} disabled={saving}>Annuler</Button><Button size="sm" onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button></div>
        </Card>
      ) : null}

      {!showList ? null : observations.length === 0 ? (
        <EmptyState icon={<CalendarClock className="size-8" />} title="Aucune observation" description="Enregistrez le premier relevé sanitaire/phyto de ce plant." />
      ) : (
        <div className="grid gap-2">
          {observations.map((o) => (
            <Card key={o.id} className="p-3 text-xs">
              <p className="font-medium text-foreground">{formatDate(o.observation_date)}{o.intervention_date ? ` · intervention le ${formatDate(o.intervention_date)}` : ""}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {o.disease_pressure.map((k) => <Badge key={k} tone="danger">{DISEASE_PRESSURE_LABELS[k] ?? k}</Badge>)}
                {o.pests.map((k) => <Badge key={k} tone="danger">{PEST_LABELS[k] ?? k}</Badge>)}
                {o.climate_behavior.map((k) => <Badge key={k} tone="warning">{CLIMATE_BEHAVIOR_LABELS[k] ?? k}</Badge>)}
                {o.treatment_applied.map((k) => <Badge key={k} tone="primary">{FIELD_TREATMENT_LABELS[k] ?? k}</Badge>)}
                {o.treatment_reaction.map((k) => <Badge key={k} tone="neutral">{TREATMENT_REACTION_LABELS[k] ?? k}</Badge>)}
                {o.weather_daily?.temperature != null ? <Badge tone="neutral">{Math.round(o.weather_daily.temperature)}°C</Badge> : null}
                {o.weather_daily?.humidity != null ? <Badge tone="neutral">{Math.round(o.weather_daily.humidity)}% hum.</Badge> : null}
                {o.weather_daily?.uv_index != null ? <Badge tone="neutral">UV {Math.round(o.weather_daily.uv_index)}</Badge> : null}
              </div>
              {o.remarque ? <p className="mt-1 italic text-muted-foreground">{o.remarque}</p> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
