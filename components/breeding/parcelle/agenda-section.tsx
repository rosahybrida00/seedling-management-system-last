"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ClipboardList, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Badge, Field, Input, EmptyState, SectionHeading, Select, Textarea } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import { FIELD_TREATMENT_LABELS, FERTILIZER_LABELS, PROGRAM_TYPE_LABELS, PROGRAM_RESULT_LABELS } from "@/lib/domain/fieldLabels"
import { getWeatherForDate, type DailyWeather } from "@/lib/services/weatherService"
import type { FieldObservation, FieldProgram, FieldIntervention } from "@/app/parcelle/types"

interface LocationSnapshot {
  greenhouse_id: string | null
  greenhouse_table_id: string | null
  parcelle_id: string | null
}

interface PlannerSuggestion {
  id: string
  programType: "curatif" | "preventif" | "fertilisation"
  title: string
  reason: string
}

export function AgendaSection({ target, locationSnapshot, observations = [], programs, interventionsByProgram, onRefresh }: {
  target: { planting_id: string } | { greenhouse_id: string } | { parcelle_id: string }
  locationSnapshot?: LocationSnapshot
  observations?: FieldObservation[]
  programs: FieldProgram[]; interventionsByProgram: Map<string, FieldIntervention[]>; onRefresh: () => void
}) {
  const eventLocation: LocationSnapshot = locationSnapshot ?? {
    greenhouse_id: "greenhouse_id" in target ? target.greenhouse_id : null,
    greenhouse_table_id: null,
    parcelle_id: "parcelle_id" in target ? target.parcelle_id : null,
  }
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlannerSuggestion | null>(null)
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([])
  const [fertilizerCode, setFertilizerCode] = useState("")
  const [notes, setNotes] = useState("")
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split("T")[0])
  const [openedProgramId, setOpenedProgramId] = useState<string | null>(null)
  const isMacroTarget = !("planting_id" in target)
  const targetKey = "greenhouse_id" in target ? `serre:${target.greenhouse_id}` : "parcelle_id" in target ? `parcelle:${target.parcelle_id}` : `plant:${target.planting_id}`
  const [dailyWeather, setDailyWeather] = useState<DailyWeather | null>(null)

  useEffect(() => {
    if (!isMacroTarget) return
    let cancelled = false
    getWeatherForDate(new Date().toISOString().slice(0, 10)).then((weather) => {
      if (!cancelled) setDailyWeather(weather)
    })
    return () => { cancelled = true }
  }, [isMacroTarget, targetKey])

  const latestObservation = observations[0]
  const hasPestSignal = Boolean(latestObservation?.pests.length)
  const hasDiseaseSignal = Boolean(latestObservation?.disease_pressure.length)
  const treatmentOptions = Object.entries(FIELD_TREATMENT_LABELS).filter(([key]) => {
    if (hasPestSignal && !hasDiseaseSignal) return key !== "fongicide_bio"
    if (hasDiseaseSignal && !hasPestSignal) return key !== "insecticide_bio"
    return true
  })
  const suggestions = useMemo(() => {
    const month = new Date().getMonth() + 1
    const items: PlannerSuggestion[] = []
    if (!isMacroTarget) {
      if (hasPestSignal || hasDiseaseSignal) {
        const causes = [
          hasPestSignal ? `${latestObservation?.pests.length ?? 0} catégorie(s) de ravageurs` : "",
          hasDiseaseSignal ? `${latestObservation?.disease_pressure.length ?? 0} pression(s) sanitaire(s)` : "",
        ].filter(Boolean).join(" et ")
        items.push({
          id: `plant-curative-${latestObservation?.id ?? "observation"}`,
          programType: "curatif",
          title: "Curatif · observation sanitaire récente",
          reason: `${causes} observée(s) le ${latestObservation?.observation_date ?? "à une date inconnue"}. Validez uniquement après examen du plant.`,
        })
      }
      return items
    }
    if (month >= 3 && month <= 6) {
      const weatherReason = dailyWeather?.humidity != null
        ? `Humidité du relevé récent : ${Math.round(dailyWeather.humidity)}%.`
        : "Période de reprise et de croissance végétative."
      items.push({ id: "spring-preventive", programType: "preventif", title: "Préventif · reprise végétative", reason: weatherReason })
      items.push({ id: "spring-fertilization", programType: "fertilisation", title: "Fertilisation · croissance", reason: "Suggestion saisonnière de printemps ; choisissez l’amendement adapté." })
    } else if (month >= 7 && month <= 8) {
      if (dailyWeather?.temperature != null && dailyWeather.temperature >= 28) {
        items.push({ id: "summer-heat-preventive", programType: "preventif", title: "Préventif · chaleur", reason: `Température du relevé récent : ${Math.round(dailyWeather.temperature)}°C.` })
      }
      if (dailyWeather?.humidity != null && dailyWeather.humidity >= 80) {
        items.push({ id: "summer-humidity-preventive", programType: "preventif", title: "Préventif · humidité élevée", reason: `Humidité du relevé récent : ${Math.round(dailyWeather.humidity)}%.` })
      }
    } else if (month >= 9 && month <= 11) {
      items.push({ id: "autumn-fertilization", programType: "fertilisation", title: "Fertilisation · préparation automnale", reason: "Suggestion saisonnière ; choisissez l’amendement à appliquer." })
      if (dailyWeather?.humidity != null && dailyWeather.humidity >= 80) {
        items.push({ id: "autumn-humidity-preventive", programType: "preventif", title: "Préventif · humidité élevée", reason: `Humidité du relevé récent : ${Math.round(dailyWeather.humidity)}%.` })
      }
    }
    return items
  }, [dailyWeather, hasDiseaseSignal, hasPestSignal, isMacroTarget, latestObservation])

  const productName = selectedSuggestion?.programType === "fertilisation"
    ? FERTILIZER_LABELS[fertilizerCode] ?? ""
    : selectedTreatments.map((key) => FIELD_TREATMENT_LABELS[key]).join(" + ")

  async function createProgram() {
    if (!selectedSuggestion || !productName) return
    const { data, error } = await supabase.from("field_programs").insert({
      ...target,
      program_type: selectedSuggestion.programType,
      product_name: productName,
      treatment_codes: selectedSuggestion.programType === "fertilisation" ? [] : selectedTreatments,
      fertilizer_code: selectedSuggestion.programType === "fertilisation" ? fertilizerCode : null,
      start_date: firstDueDate,
      notes: notes.trim(),
    }).select("id").single()
    if (error) {
      const missingProductMigration = error.code === "42703" || error.code === "PGRST204"
      const migrationNumber = selectedSuggestion.programType === "fertilisation" ? "032" : "030"
      alert(missingProductMigration
        ? `Exécutez la migration ${migrationNumber} dans Supabase avant d'enregistrer ce programme normalisé.`
        : `Erreur : ${error.message}`)
      return
    }
    await supabase.from("field_interventions").insert({ program_id: data.id, due_date: firstDueDate, ...eventLocation })
    setSelectedTreatments([]); setFertilizerCode(""); setNotes(""); setSelectedSuggestion(null)
    onRefresh()
  }

  async function addNextIntervention(programId: string, dueDate: string) {
    if (!dueDate) return
    await supabase.from("field_interventions").insert({ program_id: programId, due_date: dueDate, ...eventLocation })
    onRefresh()
  }

  async function markDone(intervention: FieldIntervention, result: string) {
    const doneDate = new Date().toISOString().split("T")[0]
    await getWeatherForDate(doneDate)
    const { data: weatherRow } = await supabase.from("weather_daily").select("id").eq("date", doneDate).maybeSingle()
    await supabase.from("field_interventions").update({
      done: true,
      done_date: doneDate,
      result: result || null,
      weather_daily_id: weatherRow?.id ?? null,
      ...eventLocation,
    }).eq("id", intervention.id)
    onRefresh()
  }

  const rows = programs.flatMap((p) => (interventionsByProgram.get(p.id) ?? []).map((iv) => ({ program: p, iv })))
    .sort((a, b) => (b.iv.due_date ?? "").localeCompare(a.iv.due_date ?? ""))
  const openedProgram = programs.find((program) => program.id === openedProgramId)

  if (openedProgram) {
    const programRows = rows.filter((row) => row.program.id === openedProgram.id)
    return (
      <div className="flex flex-col gap-4">
        <button type="button" onClick={() => setOpenedProgramId(null)} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Retour à l’agenda
        </button>
        <section className="flex flex-col gap-2 border-b border-border pb-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Détail du programme</p>
          <h3 className="font-serif text-xl text-foreground">{openedProgram.product_name}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{PROGRAM_TYPE_LABELS[openedProgram.program_type]}</Badge>
            <span className="text-sm text-muted-foreground">Débuté le {formatDate(openedProgram.start_date)}</span>
          </div>
          {openedProgram.treatment_codes?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {openedProgram.treatment_codes.map((code) => <Badge key={code}>{FIELD_TREATMENT_LABELS[code] ?? code}</Badge>)}
            </div>
          ) : null}
          {openedProgram.notes ? <p className="text-sm text-muted-foreground">{openedProgram.notes}</p> : null}
        </section>
        <SectionHeading title="Échéances et historique" />
        {programRows.length === 0 ? <EmptyState title="Aucune échéance enregistrée" /> : (
          <div className="grid gap-2">
            {programRows.map(({ program, iv }) => (
              <AgendaRow key={iv.id} program={program} intervention={iv} onDone={(result) => markDone(iv, result)} onScheduleNext={(date) => addNextIntervention(program.id, date)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!isMacroTarget) return (
    <div className="flex flex-col gap-4">
      {selectedSuggestion ? (
        <Card className="flex flex-col gap-4 p-4">
          <button type="button" onClick={() => setSelectedSuggestion(null)} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Retour à la suggestion</button>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Suggestion curative</p>
            <h3 className="mt-1 font-serif text-xl text-foreground">{selectedSuggestion.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{selectedSuggestion.reason}</p>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Produits normalisés à appliquer</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {treatmentOptions.map(([code, label]) => (
                <label key={code} className="flex items-center gap-1.5 text-sm text-foreground">
                  <input type="checkbox" checked={selectedTreatments.includes(code)} onChange={() => setSelectedTreatments((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date d’intervention"><Input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} /></Field>
            <Field label="Notes (facultatif)"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
          </div>
          <div className="flex justify-end"><Button onClick={createProgram} disabled={!productName}>Valider le curatif</Button></div>
        </Card>
      ) : suggestions.length > 0 ? (
        <Card className="flex flex-col gap-3 p-4">
          <SectionHeading title="Suggestion fondée sur l’observation" description="Le traitement reste à valider après examen du plant." />
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div><p className="text-sm font-medium text-foreground">{suggestion.title}</p><p className="text-xs text-muted-foreground">{suggestion.reason}</p></div>
              <Button size="sm" variant="outline" onClick={() => setSelectedSuggestion(suggestion)}>Examiner</Button>
            </div>
          ))}
        </Card>
      ) : null}
      <SectionHeading title="Agenda individuel" description="Rappels du programme collectif et interventions propres à ce plant." />
      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-8" />} title="Aucun rappel individuel" description="Les préventifs et fertilisations collectifs de la zone apparaîtront ici. Le curatif dépend des observations du plant." />
      ) : (
        <div className="grid gap-2">
          {rows.map(({ program, iv }) => (
            <AgendaRow key={iv.id} program={program} intervention={iv} onOpen={() => setOpenedProgramId(program.id)} onDone={(result) => markDone(iv, result)} onScheduleNext={(date) => addNextIntervention(program.id, date)} />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {selectedSuggestion ? (
        <Card className="flex flex-col gap-4 p-4">
          <button type="button" onClick={() => setSelectedSuggestion(null)} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Retour aux suggestions
          </button>
          <section>
            <p className="text-xs font-medium uppercase text-muted-foreground">Suggestion à valider</p>
            <h3 className="mt-1 font-serif text-xl text-foreground">{selectedSuggestion.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{selectedSuggestion.reason}</p>
            {dailyWeather ? <p className="mt-2 text-xs text-muted-foreground">Météo du jour : {dailyWeather.temperature == null ? "température indisponible" : `${Math.round(dailyWeather.temperature)}°C`}{dailyWeather.humidity == null ? "" : ` · ${Math.round(dailyWeather.humidity)}% humidité`}</p> : null}
          </section>
          {selectedSuggestion.programType === "fertilisation" ? (
            <Field label="Amendement / fertilisant">
              <Select value={fertilizerCode} onChange={(event) => setFertilizerCode(event.target.value)}>
                <option value="">Choisir un produit</option>
                {Object.entries(FERTILIZER_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </Select>
            </Field>
          ) : (
            <fieldset className="grid gap-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Traitements préventifs{hasPestSignal || hasDiseaseSignal ? " adaptés à la dernière observation" : ""}
              </legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {treatmentOptions.map(([code, label]) => (
                  <label key={code} className="flex items-center gap-1.5 text-sm text-foreground">
                    <input type="checkbox" checked={selectedTreatments.includes(code)} onChange={() => setSelectedTreatments((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prochaine intervention"><Input type="date" value={firstDueDate} onChange={(event) => setFirstDueDate(event.target.value)} /></Field>
            <Field label="Notes (facultatif)"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={createProgram} disabled={!productName}>Valider le programme</Button>
          </div>
        </Card>
      ) : (
        <section className="flex flex-col gap-3">
          <SectionHeading title="Suggestions du planificateur" description="Basées sur la saison et le dernier relevé météo disponible. Aucune action n’est créée sans validation." />
          {suggestions.length === 0 ? (
            <EmptyState icon={<ClipboardList className="size-8" />} title="Aucune suggestion pour le moment" description={dailyWeather ? "Aucun programme saisonnier ou seuil météo ne recommande d’action aujourd’hui." : "La météo n’est pas disponible ; les suggestions saisonnières apparaîtront lorsqu’une fenêtre adaptée sera ouverte."} />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="flex flex-col gap-3 p-3">
                  <div className="flex items-center gap-2"><Badge tone="primary">{PROGRAM_TYPE_LABELS[suggestion.programType]}</Badge><span className="text-sm font-medium text-foreground">{suggestion.title}</span></div>
                  <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                  <Button size="sm" variant="outline" className="w-fit" onClick={() => setSelectedSuggestion(suggestion)}>Choisir cette suggestion</Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <SectionHeading title="Programmes validés" description="Les mêmes échéances apparaissent dans l’agenda de chaque plant de cette zone." />
        {rows.length === 0 ? (
          <EmptyState icon={<ClipboardList className="size-8" />} title="Aucun programme validé" description="Choisissez une suggestion ci-dessus pour créer le premier programme." />
        ) : (
          <div className="grid gap-2">
            {rows.map(({ program, iv }) => (
              <AgendaRow key={iv.id} program={program} intervention={iv} onOpen={() => setOpenedProgramId(program.id)} onDone={(result) => markDone(iv, result)} onScheduleNext={(date) => addNextIntervention(program.id, date)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function AgendaRow({ program, intervention, onOpen, onDone, onScheduleNext }: {
  program: FieldProgram; intervention: FieldIntervention; onOpen?: () => void; onDone: (result: string) => void; onScheduleNext: (date: string) => void
}) {
  const [choosingResult, setChoosingResult] = useState(false)
  const [nextDate, setNextDate] = useState("")
  const overdue = !intervention.done && intervention.due_date != null && intervention.due_date <= new Date().toISOString().split("T")[0]

  return (
    <Card className="flex flex-wrap items-center gap-2 p-3 text-sm">
      <Badge tone="primary">{PROGRAM_TYPE_LABELS[program.program_type]}</Badge>
      <span className="font-medium text-foreground">{program.product_name}</span>
      <span className="text-xs text-muted-foreground">{intervention.due_date ? formatDate(intervention.due_date) : "sans date"}</span>
      {onOpen ? <Button size="sm" variant="ghost" onClick={onOpen} className="gap-1"><ArrowRight className="size-3.5" /> Détails</Button> : null}
          {intervention.weather_daily?.temperature != null ? <Badge tone="neutral">{Math.round(intervention.weather_daily.temperature)}°C</Badge> : null}
          {intervention.weather_daily?.humidity != null ? <Badge tone="neutral">{Math.round(intervention.weather_daily.humidity)}% hum.</Badge> : null}
      {intervention.done ? (
        <Badge tone={intervention.result === "amelioration" ? "success" : intervention.result === "echec" ? "danger" : "warning"} className="ml-auto">
          Fait{intervention.result ? ` · ${PROGRAM_RESULT_LABELS[intervention.result]}` : ""}
        </Badge>
      ) : choosingResult ? (
        <div className="ml-auto flex flex-wrap gap-1.5">
          {Object.entries(PROGRAM_RESULT_LABELS).map(([k, v]) => <Button key={k} size="sm" variant="outline" onClick={() => onDone(k)}>{v}</Button>)}
        </div>
      ) : (
        <div className="ml-auto flex items-center gap-1.5">
          {overdue ? <Badge tone="danger">En retard</Badge> : null}
          <Button size="sm" onClick={() => setChoosingResult(true)} className="gap-1"><Check className="size-3.5" /> Fait</Button>
        </div>
      )}
      {intervention.done ? (
        <div className="flex w-full items-center gap-1.5 border-t border-border pt-2">
          <Input type="date" className="h-7 w-36" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          <Button size="sm" variant="ghost" onClick={() => nextDate && onScheduleNext(nextDate)} disabled={!nextDate}>Planifier la suite</Button>
        </div>
      ) : null}
    </Card>
  )
}
