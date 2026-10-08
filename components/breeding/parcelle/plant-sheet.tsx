"use client"

// Fiche unifiée d'un plant ou d'une variété : une seule frise chronologique
// (en retard, aujourd'hui, cette semaine, plus tard, puis l'historique par mois)
// où tout est cliquable : valider un soin avec son résultat, corriger, rouvrir,
// reporter, exclure un plant d'un programme, planifier ou consigner une
// intervention, ajouter une observation, déplacer le plant.
//
// Nécessite la migration 033 (tâches par plant) ; sinon l'ancienne fiche est affichée.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, ClipboardList, Eye, FlaskConical, Flower2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import { PROGRAM_RESULT_LABELS } from "@/lib/domain/fieldLabels"
import { ObservationsSection } from "@/components/breeding/parcelle/observations-section"
import { ManualInterventionForm, SuggestionCards, type ManualDraft } from "@/components/breeding/parcelle/suggestions-ui"
import { buildSuggestions } from "@/lib/services/suggestionEngine"
import { acceptSuggestion, ignoreSuggestion, loadDismissedIds } from "@/lib/services/programService"
import {
  buildTimeline,
  completionProblem,
  groupTimeline,
  rescheduleProblem,
  summarize,
  todayIso,
  type PlantRef,
  type TaskMember,
  type TimelineItem,
  type TimelineSection,
} from "@/lib/services/plantTimeline"
import {
  completeTasks,
  createIndividualIntervention,
  excludePlanting,
  loadSheetData,
  reopenTasks,
  rescheduleIntervention,
  type SheetData,
} from "@/lib/services/plantSheetService"
import type { FieldPlanting, Greenhouse, GreenhouseTable, Parcelle, PlantDetails } from "@/app/parcelle/types"

interface Props {
  planting: FieldPlanting
  label: string
  details: PlantDetails | null
  /** Tous les plants de la même variété ou du même semis (le plant courant inclus). */
  siblings: FieldPlanting[]
  greenhouses: Greenhouse[]
  tables: GreenhouseTable[]
  parcelles: Parcelle[]
  onBack: () => void
  onRefresh: () => void
}

type Scope = "plant" | "variety"
const HISTORY_PREVIEW = 12

export function PlantSheet({ planting, label, details, siblings, greenhouses, tables, parcelles, onBack, onRefresh }: Props) {
  const [scope, setScope] = useState<Scope>("plant")
  const [data, setData] = useState<SheetData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  // Un seul point d'entrée « Observer / intervenir » : observation et soin sont deux onglets du même panneau.
  const [panel, setPanel] = useState<"none" | "observer" | "move">("none")
  const [observeTab, setObserveTab] = useState<"observation" | "intervention">("observation")
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [suggestionBusy, setSuggestionBusy] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const today = todayIso()

  const locationName = useCallback((tableId: string | null, parcelleId: string | null): string => {
    if (tableId) {
      const table = tables.find((item) => item.id === tableId)
      const greenhouse = greenhouses.find((item) => item.id === table?.greenhouse_id)
      return `${greenhouse?.name ?? "Serre"} · ${table?.name ?? "Table supprimée"}`
    }
    return parcelles.find((item) => item.id === parcelleId)?.name ?? "Parcelle supprimée"
  }, [greenhouses, tables, parcelles])

  const scopedPlantings = useMemo(
    () => (scope === "plant" ? [planting] : siblings.length > 0 ? siblings : [planting]),
    [scope, planting, siblings],
  )
  const plantById = useMemo(() => new Map(scopedPlantings.map((item) => [item.id, item])), [scopedPlantings])
  const plantRefs: PlantRef[] = useMemo(
    () => scopedPlantings.map((item) => ({
      id: item.id,
      plantedAt: item.planted_at,
      label: `${item.individual_number ? `n°${item.individual_number}` : "plant"} · ${locationName(item.greenhouse_table_id, item.parcelle_id)}`,
    })),
    [scopedPlantings, locationName],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadSheetData(scopedPlantings.map((item) => item.id)).then(({ data: loaded, error }) => {
      if (cancelled) return
      setData(loaded)
      setLoadError(error)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [scopedPlantings, reloadKey])

  const items = useMemo(
    () => (data ? buildTimeline({ plants: plantRefs, tasks: data.tasks, observations: data.observations, crossings: data.crossings }) : []),
    [data, plantRefs],
  )
  const sections = useMemo(() => groupTimeline(items, today), [items, today])
  const summary = useMemo(() => summarize(items, today), [items, today])

  // Tout enregistrement referme la ligne ouverte : elle reste cliquable dans la frise.
  function reload(message?: string) {
    setExpanded(null)
    setReloadKey((value) => value + 1)
    setNotice(message ?? null)
    onRefresh()
  }

  const target = { planting_id: planting.id }
  const tableById = new Map(tables.map((table) => [table.id, table]))
  const location = {
    greenhouseId: planting.greenhouse_table_id ? tableById.get(planting.greenhouse_table_id)?.greenhouse_id ?? null : null,
    greenhouseTableId: planting.greenhouse_table_id,
    parcelleId: planting.parcelle_id,
  }

  // Fusion (et non remplacement) : une suggestion tout juste validée reste refermée pendant le rechargement.
  useEffect(() => { void loadDismissedIds(target).then((loaded) => setDismissed((current) => new Set([...current, ...loaded]))) }, [planting.id, reloadKey])

  async function submitManual(draft: ManualDraft): Promise<{ error: string | null; saved: boolean }> {
    const outcome = await createIndividualIntervention({
      plantingId: planting.id,
      programType: draft.programType,
      treatmentCodes: draft.treatmentCodes,
      fertilizerCode: draft.fertilizerCode,
      date: draft.date,
      alreadyDone: draft.alreadyDone,
      result: draft.result,
      notes: draft.notes,
      location: { greenhouseId: location.greenhouseId, greenhouseTableId: location.greenhouseTableId, parcelleId: location.parcelleId },
    })
    return { error: outcome.error, saved: Boolean(outcome.interventionId) }
  }

  // Suggestions curatives : d'après les observations sanitaires récentes de CE plant.
  const suggestions = useMemo(() => {
    if (!data) return []
    return buildSuggestions({
      scope: "plant",
      today,
      appliedKeys: new Set(),
      observations: data.observations
        .filter((observation) => observation.planting_id === planting.id)
        .map((observation) => ({ id: observation.id, date: observation.observation_date.slice(0, 10), diseases: observation.disease_pressure ?? [], pests: observation.pests ?? [], plantId: observation.planting_id })),
      handled: data.tasks
        .filter((task) => task.planting_id === planting.id && task.program_type === "curatif")
        .map((task) => ({ programType: "curatif", date: task.done_date ?? task.due_date ?? today })),
      dismissedIds: dismissed,
    })
  }, [data, dismissed, planting.id, today])

  async function acceptPlantSuggestion(suggestion: Parameters<typeof acceptSuggestion>[2], chosen: string[]) {
    setSuggestionBusy(true)
    setSuggestionError(null)
    const outcome = await acceptSuggestion(target, { greenhouse_id: location.greenhouseId, greenhouse_table_id: location.greenhouseTableId, parcelle_id: location.parcelleId }, suggestion, chosen, today)
    setSuggestionBusy(false)
    if (outcome.error) { setSuggestionError(outcome.error); return }
    // La suggestion se referme tout de suite, sans attendre le rechargement de la frise.
    setDismissed((current) => new Set(current).add(suggestion.id))
    reload("Soin validé : il apparaît dans « Aujourd'hui », il reste à l'appliquer.")
  }

  async function ignorePlantSuggestion(suggestion: Parameters<typeof ignoreSuggestion>[1]) {
    setSuggestionBusy(true)
    const outcome = await ignoreSuggestion(target, suggestion)
    setSuggestionBusy(false)
    if (outcome.error) { setSuggestionError(outcome.error); return }
    const loaded = await loadDismissedIds(target)
    setDismissed((current) => new Set([...current, ...loaded]))
  }

  const actionSections = sections.filter((section) => section.bucket !== "passe")
  const historySections = sections.filter((section) => section.bucket === "passe")
  const historyCount = historySections.reduce((sum, section) => sum + section.items.length, 0)
  const visibleHistory = showAllHistory ? historySections : limitSections(historySections, HISTORY_PREVIEW)

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour
      </button>
      <div>
        <h2 className="font-serif text-xl text-foreground">{label}</h2>
        <p className="text-sm text-muted-foreground">
          {locationName(planting.greenhouse_table_id, planting.parcelle_id)}
          {planting.individual_number ? ` · n°${planting.individual_number}` : ""} · en place depuis le {formatDate(planting.planted_at)}
        </p>
      </div>

      {details ? (
        <Card className="flex flex-col gap-4 p-4 sm:flex-row">
          {details.photoUrl ? <img src={details.photoUrl} alt={`Photo de ${label}`} className="size-28 shrink-0 rounded-md object-cover" /> : null}
          <div className="min-w-0 flex-1">
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {details.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-xs text-muted-foreground">{field.label}</dt>
                  <dd className="text-sm text-foreground">{field.value}</dd>
                </div>
              ))}
            </dl>
            {details.description ? <p className="mt-3 text-sm text-muted-foreground">{details.description}</p> : null}
            {planting.variety_id ? (
              <Link href={`/rose/${planting.variety_id}`} className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
                Ouvrir la fiche Catalogue
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* Résumé et actions */}
      <div className="flex flex-wrap items-center gap-2" aria-label="Résumé de la frise">
        <SummaryChip label="En retard" value={summary.overdue} tone={summary.overdue > 0 ? "danger" : "neutral"} />
        <SummaryChip label="Aujourd'hui" value={summary.today} tone={summary.today > 0 ? "warning" : "neutral"} />
        <SummaryChip label="Cette semaine" value={summary.week} tone="neutral" />
        <SummaryChip label="Faits" value={summary.done} tone="success" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setPanel(panel === "observer" ? "none" : "observer")} className="gap-1.5"><Plus className="size-4" /> Observer / intervenir</Button>
        <Button size="sm" variant="outline" onClick={() => setPanel(panel === "move" ? "none" : "move")} className="gap-1.5"><ArrowRight className="size-4" /> Déplacer</Button>
        {siblings.length > 1 ? (
          <div className="ml-auto flex rounded-md border border-border p-0.5" role="group" aria-label="Portée de la frise">
            <button
              type="button" onClick={() => setScope("plant")} aria-pressed={scope === "plant"}
              className={scope === "plant" ? "rounded px-3 py-1 text-xs font-medium bg-primary/10 text-primary" : "rounded px-3 py-1 text-xs text-muted-foreground hover:text-foreground"}
            >Ce plant</button>
            <button
              type="button" onClick={() => setScope("variety")} aria-pressed={scope === "variety"}
              className={scope === "variety" ? "rounded px-3 py-1 text-xs font-medium bg-primary/10 text-primary" : "rounded px-3 py-1 text-xs text-muted-foreground hover:text-foreground"}
            >Toute la variété ({siblings.length})</button>
          </div>
        ) : null}
      </div>

      {notice ? <p role="status" className="text-sm text-primary">{notice}</p> : null}

      {panel === "observer" ? (
        <Card className="flex flex-col gap-3 p-3">
          <div className="flex rounded-md border border-border p-0.5 text-xs" role="tablist" aria-label="Observer ou intervenir">
            <button type="button" role="tab" aria-selected={observeTab === "observation"} onClick={() => setObserveTab("observation")}
              className={observeTab === "observation" ? "flex-1 rounded px-3 py-1.5 font-medium bg-primary/10 text-primary" : "flex-1 rounded px-3 py-1.5 text-muted-foreground hover:text-foreground"}>Observation</button>
            <button type="button" role="tab" aria-selected={observeTab === "intervention"} onClick={() => setObserveTab("intervention")}
              className={observeTab === "intervention" ? "flex-1 rounded px-3 py-1.5 font-medium bg-primary/10 text-primary" : "flex-1 rounded px-3 py-1.5 text-muted-foreground hover:text-foreground"}>Intervention</button>
          </div>
          {observeTab === "observation" ? (
            <>
              <p className="text-xs text-muted-foreground">Une observation sanitaire vous propose ensuite un traitement curatif, prêt à valider.</p>
              <ObservationsSection
                plantingId={planting.id}
                greenhouseTableId={planting.greenhouse_table_id}
                parcelleId={planting.parcelle_id}
                observations={[]}
                showList={false}
                startOpen
                onRefresh={() => { setPanel("none"); reload("Observation enregistrée.") }}
              />
            </>
          ) : (
            <ManualInterventionForm
              title="Intervenir sans passer par une suggestion"
              minDate={planting.planted_at}
              today={today}
              submit={submitManual}
              onCancel={() => setPanel("none")}
              onDone={(message) => { setPanel("none"); reload(message) }}
            />
          )}
        </Card>
      ) : null}
      {panel === "move" ? (
        <MoveForm
          planting={planting}
          greenhouses={greenhouses}
          tables={tables}
          parcelles={parcelles}
          onCancel={() => setPanel("none")}
          onMoved={() => { onRefresh(); onBack() }}
        />
      ) : null}

      {suggestions.length > 0 ? (
        <section className="flex flex-col gap-2" aria-label="Suggestions pour ce plant">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive">Suggestions · d&apos;après vos observations</h4>
          <SuggestionCards suggestions={suggestions} onAccept={acceptPlantSuggestion} onIgnore={ignorePlantSuggestion} busy={suggestionBusy} />
          <Button size="sm" variant="ghost" className="w-fit" onClick={() => { setObserveTab("intervention"); setPanel("observer") }}>Intervenir autrement</Button>
          {suggestionError ? <p role="alert" className="text-sm text-destructive">{suggestionError}</p> : null}
        </section>
      ) : null}

      {loading && !data ? <p className="text-sm text-muted-foreground">Chargement de la frise…</p> : null}
      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}

      {/* Frise */}
      {data && sections.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-8" />} title="Rien à afficher pour l'instant" description="Planifiez un premier soin ou ajoutez une observation." />
      ) : null}

      {actionSections.map((section) => (
        <TimelineBlock key={section.id} section={section} expanded={expanded} onToggle={setExpanded} renderBody={(item) => (
          <ItemBody item={item} scope={scope} plantById={plantById} today={today} onChanged={reload} />
        )} />
      ))}

      {historySections.length > 0 ? (
        <>
          <h3 className="mt-2 font-serif text-lg text-foreground">Historique</h3>
          {visibleHistory.map((section) => (
            <TimelineBlock key={section.id} section={section} expanded={expanded} onToggle={setExpanded} renderBody={(item) => (
              <ItemBody item={item} scope={scope} plantById={plantById} today={today} onChanged={reload} />
            )} />
          ))}
          {historyCount > HISTORY_PREVIEW ? (
            <Button variant="ghost" size="sm" className="w-fit gap-1.5" onClick={() => setShowAllHistory((value) => !value)}>
              {showAllHistory ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {showAllHistory ? "Réduire l'historique" : `Voir tout l'historique (${historyCount})`}
            </Button>
          ) : null}
        </>
      ) : null}

      {data && !data.crossingsAvailable ? (
        <p className="text-xs text-muted-foreground">Le lien avec l&apos;historique de croisement apparaîtra après la migration 034.</p>
      ) : null}
    </div>
  )
}

/** Garde les premiers éléments de l'historique (du plus récent au plus ancien) jusqu'à la limite. */
function limitSections(sections: TimelineSection[], limit: number): TimelineSection[] {
  const out: TimelineSection[] = []
  let remaining = limit
  for (const section of sections) {
    if (remaining <= 0) break
    out.push({ ...section, items: section.items.slice(0, remaining) })
    remaining -= section.items.length
  }
  return out
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: "danger" | "warning" | "neutral" | "success" }) {
  return <Badge tone={tone}>{label} : {value}</Badge>
}

const KIND_ICON = {
  tache: FlaskConical,
  observation: Eye,
  croisement: Flower2,
} as const

function TimelineBlock({ section, expanded, onToggle, renderBody }: {
  section: TimelineSection
  expanded: string | null
  onToggle: (key: string | null) => void
  renderBody: (item: TimelineItem) => React.ReactNode
}) {
  const urgent = section.bucket === "en_retard"
  return (
    <section className="flex flex-col gap-2" aria-label={section.label}>
      <h4 className={urgent ? "text-xs font-semibold uppercase tracking-wide text-destructive" : "text-xs font-semibold uppercase tracking-wide text-muted-foreground"}>
        {section.label} · {section.items.length}
      </h4>
      <ul className="flex flex-col gap-2">
        {section.items.map((item) => {
          const Icon = KIND_ICON[item.kind]
          const open = expanded === item.key
          const expandable = item.kind === "tache" || item.plantLabels.length > 1 || Boolean(item.detail)
          return (
            <li key={item.key}>
              <Card className={open ? "border-primary/40" : ""}>
                <button
                  type="button"
                  onClick={() => onToggle(open ? null : item.key)}
                  aria-expanded={open}
                  disabled={!expandable}
                  className="flex w-full items-start gap-3 p-3 text-left disabled:cursor-default"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{item.title}</span>
                    {item.detail && !open ? <span className="block truncate text-xs text-muted-foreground">{item.detail}</span> : null}
                    {item.badges.length > 0 ? (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {item.badges.map((badge, index) => <Badge key={`${badge.label}-${index}`} tone={badge.tone}>{badge.label}</Badge>)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.date ? formatDate(item.date) : "—"}</span>
                  {expandable ? (open ? <ChevronUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />) : null}
                </button>
                {open ? <div className="border-t border-border p-3">{renderBody(item)}</div> : null}
              </Card>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ItemBody({ item, scope, plantById, today, onChanged }: {
  item: TimelineItem
  scope: Scope
  plantById: Map<string, FieldPlanting>
  today: string
  onChanged: (message?: string) => void
}) {
  if (item.kind === "tache" && item.task) {
    return <TaskPanel item={item} scope={scope} plantById={plantById} today={today} onChanged={onChanged} />
  }
  return (
    <div className="flex flex-col gap-1 text-sm">
      {item.detail ? <p className="text-foreground">{item.detail}</p> : null}
      {item.plantLabels.length > 1 ? <p className="text-xs text-muted-foreground">{item.plantLabels.join(" · ")}</p> : null}
    </div>
  )
}

function TaskPanel({ item, scope, plantById, today, onChanged }: {
  item: TimelineItem
  scope: Scope
  plantById: Map<string, FieldPlanting>
  today: string
  onChanged: (message?: string) => void
}) {
  const task = item.task!
  const open = task.members.filter((member) => !member.done)
  const done = task.members.filter((member) => member.done)
  const [mode, setMode] = useState<"none" | "complete" | "edit" | "reschedule" | "exclude">("none")
  const [doneDate, setDoneDate] = useState(today)
  const [result, setResult] = useState("")
  const [notes, setNotes] = useState("")
  const [newDate, setNewDate] = useState(task.dueDate ?? today)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetsFor = (members: TaskMember[]) =>
    members.map((member) => ({
      taskId: member.taskId,
      greenhouseTableId: plantById.get(member.plantingId)?.greenhouse_table_id ?? null,
      parcelleId: plantById.get(member.plantingId)?.parcelle_id ?? null,
    }))

  function startEdit() {
    const first = done[0]
    setDoneDate(first?.doneDate ?? today)
    setResult(first?.result ?? "")
    setNotes(first?.notes ?? "")
    setError(null)
    setMode("edit")
  }

  async function run(action: () => Promise<{ error: string | null }>, success: string) {
    setBusy(true)
    setError(null)
    const outcome = await action()
    setBusy(false)
    if (outcome.error) { setError(outcome.error); return }
    setMode("none")
    onChanged(success)
  }

  function submitCompletion() {
    const members = mode === "edit" ? done : open
    const problem = completionProblem({ doneDate, result, members, today })
    if (problem) { setError(problem); return }
    void run(() => completeTasks(targetsFor(members), { doneDate, result, notes }), mode === "edit" ? "Soin corrigé." : "Soin enregistré.")
  }

  function submitReschedule() {
    const problem = rescheduleProblem({ newDate, members: task.members })
    if (problem) { setError(problem); return }
    void run(() => rescheduleIntervention(task.interventionId, newDate), "Échéance reportée.")
  }

  const completionMembers = mode === "edit" ? done : open
  const minDate = completionMembers.reduce((latest, member) => (member.plantedAt > latest ? member.plantedAt : latest), "")
  const canReschedule = task.scope === "individuel" && open.length > 0
  const canExclude = task.scope === "zone" && open.length > 0 && scope === "plant"

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-xs text-muted-foreground">
        {task.scope === "zone" ? "Programme de la zone" : "Programme individuel"}
        {task.dueDate ? ` · prévu le ${formatDate(task.dueDate)}` : " · sans date prévue"}
        {task.templateStepId ? " · issu d'un calendrier type" : ""}
      </p>

      {task.members.length > 1 || done.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {task.members.map((member) => (
            <li key={member.taskId} className="flex flex-wrap items-center gap-2 text-xs">
              <span className={member.done ? "text-primary" : "text-muted-foreground"}>{member.done ? <Check className="size-3.5" /> : <span className="inline-block size-3.5 rounded-full border border-border" />}</span>
              <span className="text-foreground">{member.plantLabel}</span>
              {member.done && member.doneDate ? <span className="text-muted-foreground">fait le {formatDate(member.doneDate)}</span> : null}
              {member.done && member.result ? <Badge tone={member.result === "echec" ? "danger" : member.result === "amelioration" ? "success" : "neutral"}>{PROGRAM_RESULT_LABELS[member.result] ?? member.result}</Badge> : null}
              {member.weather?.temperature != null ? <span className="text-muted-foreground">{Math.round(member.weather.temperature)}°C{member.weather.humidity != null ? ` · ${Math.round(member.weather.humidity)} %` : ""}</span> : null}
              {member.notes ? <span className="italic text-muted-foreground">{member.notes}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {mode === "none" ? (
        <div className="flex flex-wrap gap-2">
          {open.length > 0 ? <Button size="sm" onClick={() => { setDoneDate(today); setResult(""); setNotes(""); setError(null); setMode("complete") }}>{open.length > 1 ? `Appliqué pour les ${open.length} restants` : "Appliqué"}</Button> : null}
          {done.length > 0 ? <Button size="sm" variant="outline" onClick={startEdit}>Corriger</Button> : null}
          {done.length > 0 ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => reopenTasks(done.map((member) => member.taskId)), "Soin rouvert.")}>Rouvrir</Button> : null}
          {canReschedule ? <Button size="sm" variant="outline" onClick={() => { setError(null); setMode("reschedule") }}>Reporter</Button> : null}
          {canExclude ? <Button size="sm" variant="ghost" onClick={() => { setError(null); setMode("exclude") }}>Ne plus appliquer à ce plant</Button> : null}
        </div>
      ) : null}

      {mode === "complete" || mode === "edit" ? (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date de réalisation" htmlFor={`done-${item.key}`}>
              <Input id={`done-${item.key}`} type="date" value={doneDate} min={minDate || undefined} max={today} onChange={(event) => setDoneDate(event.target.value)} />
            </Field>
            <Field label="Résultat" htmlFor={`result-${item.key}`}>
              <Select id={`result-${item.key}`} value={result} onChange={(event) => setResult(event.target.value)}>
                <option value="">Pas encore de résultat</option>
                {Object.entries(PROGRAM_RESULT_LABELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Note" htmlFor={`notes-${item.key}`}>
            <Textarea id={`notes-${item.key}`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Dose, conditions, remarque (facultatif)" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode("none")} disabled={busy}>Annuler</Button>
            <Button size="sm" onClick={submitCompletion} disabled={busy}>
              {busy ? "Enregistrement…" : mode === "edit" ? "Enregistrer la correction" : `Valider pour ${open.length} plant${open.length > 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "reschedule" ? (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3">
          <Field label="Nouvelle date" htmlFor={`new-${item.key}`}>
            <Input id={`new-${item.key}`} type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} />
          </Field>
          <Button size="sm" variant="ghost" onClick={() => setMode("none")} disabled={busy}>Annuler</Button>
          <Button size="sm" onClick={submitReschedule} disabled={busy}>Reporter</Button>
        </div>
      ) : null}

      {mode === "exclude" ? (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Ce plant ne recevra plus les soins de ce programme de zone. Les soins déjà faits restent dans l&apos;historique.</p>
          <Field label="Raison (facultatif)" htmlFor={`reason-${item.key}`}>
            <Input id={`reason-${item.key}`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex. plant en pot, variété sensible au soufre" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setMode("none")} disabled={busy}>Annuler</Button>
            <Button size="sm" onClick={() => void run(() => excludePlanting(task.programId, open[0].plantingId, reason), "Plant retiré de ce programme.")} disabled={busy}>Retirer ce plant du programme</Button>
          </div>
        </div>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function MoveForm({ planting, greenhouses, tables, parcelles, onCancel, onMoved }: {
  planting: FieldPlanting
  greenhouses: Greenhouse[]
  tables: GreenhouseTable[]
  parcelles: Parcelle[]
  onCancel: () => void
  onMoved: () => void
}) {
  const [destination, setDestination] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!destination) return
    setBusy(true)
    setError(null)
    const isGreenhouse = destination.startsWith("serre:")
    const id = destination.slice(destination.indexOf(":") + 1)
    const { error: updateError } = await supabase.from("field_plantings").update({
      greenhouse_table_id: isGreenhouse ? id : null,
      parcelle_id: isGreenhouse ? null : id,
    }).eq("id", planting.id)
    if (updateError) { setBusy(false); setError(`Transfert impossible : ${updateError.message}`); return }
    const { error: moveError } = await supabase.from("field_planting_moves").insert({
      planting_id: planting.id,
      from_greenhouse_table_id: planting.greenhouse_table_id,
      from_parcelle_id: planting.parcelle_id,
      to_greenhouse_table_id: isGreenhouse ? id : null,
      to_parcelle_id: isGreenhouse ? null : id,
    })
    setBusy(false)
    if (moveError) { setError(`Plant déplacé, mais historique de transfert non enregistré : ${moveError.message}`); return }
    onMoved()
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-medium text-foreground">Déplacer ce plant</h3>
      <p className="text-xs text-muted-foreground">Ses soins à venir suivent sa nouvelle zone ; l&apos;historique reste attaché au plant.</p>
      <Field label="Nouvel emplacement" htmlFor="move-destination">
        <Select id="move-destination" value={destination} onChange={(event) => setDestination(event.target.value)}>
          <option value="">-- Choisir une serre ou une parcelle --</option>
          {greenhouses.map((greenhouse) => (
            <optgroup key={greenhouse.id} label={`Serre · ${greenhouse.name}`}>
              {tables.filter((table) => table.greenhouse_id === greenhouse.id).map((table) => <option key={table.id} value={`serre:${table.id}`}>{table.name}</option>)}
            </optgroup>
          ))}
          <optgroup label="Parcelles">
            {parcelles.map((parcelle) => <option key={parcelle.id} value={`parcelle:${parcelle.id}`}>{parcelle.name}</option>)}
          </optgroup>
        </Select>
      </Field>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>Annuler</Button>
        <Button size="sm" onClick={submit} disabled={!destination || busy}>{busy ? "Transfert…" : "Confirmer le transfert"}</Button>
      </div>
    </Card>
  )
}
