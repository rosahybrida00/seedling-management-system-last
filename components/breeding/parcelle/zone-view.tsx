"use client"

// Vue d'une zone en trois onglets : Variétés, Graines à semer, Programme.
// Chaque onglet n'affiche que ce dont il a besoin, sans bouton « retour » interne.

import { useState, useEffect } from "react"
import { Plus, Sprout, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Badge, Field, Input, EmptyState, Select } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import { GERMINATED_SEEDLING_STATUSES, SOIL_TYPE_LABELS } from "@/lib/domain/fieldLabels"
import { ZoneProgramPanel } from "@/components/breeding/parcelle/zone-program-panel"
import { SeedLotPicker } from "@/components/breeding/serre/seed-lot-picker"
import { groupLotsForZone } from "@/lib/services/seedLotRules"
import { daysBetween, todayIso } from "@/lib/services/plantTimeline"
import { groupPlantings } from "@/lib/services/plantGrouping"
import type {
  Zone, Greenhouse, GreenhouseTable, Parcelle, VarietyOption,
  FieldPlanting, FieldProgram, FieldIntervention, FieldObservation, SeedLot, CrossParents,
} from "@/app/parcelle/types"

export function ZoneView({ initialTab = "varietes", zone, plantings, tables, seedLots = [], seedLotError = null, crossMap = new Map<string, CrossParents>(), plantingLabel, interventionsByProgram, observationsByPlanting, zonePrograms, onBack, onOpenPlant, onRefresh }: {
  zone: Zone; plantings: FieldPlanting[]; greenhouses: Greenhouse[]; tables: GreenhouseTable[]; parcelles: Parcelle[]
  seedLots?: SeedLot[]; seedLotError?: string | null; crossMap?: Map<string, CrossParents>
  plantingLabel: (p: FieldPlanting) => string
  programsByPlanting: Map<string, FieldProgram[]>; interventionsByProgram: Map<string, FieldIntervention[]>
  observationsByPlanting: Map<string, FieldObservation[]>
  zonePrograms: FieldProgram[]
  /** Onglet affiché à l'ouverture (lien direct depuis une notification). */
  initialTab?: "varietes" | "graines" | "programme"
  /** « variety » : ouvre la fiche de toute la variété ; « plant » : celle d'un seul plant. */
  onBack: () => void; onOpenPlant: (id: string, scope?: "plant" | "variety") => void; onRefresh: () => void
}) {
  const [tab, setTab] = useState<"varietes" | "graines" | "programme">(initialTab)
  const [openVarieties, setOpenVarieties] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<VarietyOption | null>(null)
  const [suggestions, setSuggestions] = useState<VarietyOption[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const [tableId, setTableId] = useState("")
  const [plantCount, setPlantCount] = useState("1")
  const [createError, setCreateError] = useState<string | null>(null)
  const [soilType, setSoilType] = useState(zone.kind === "parcelle" ? (zone.parcelle.soil_type?.[0] ?? "") : "")
  const [locationType, setLocationType] = useState<"pot" | "pleine_terre">(zone.kind === "serre" ? "pot" : "pleine_terre")
  const [plantedAt, setPlantedAt] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")

  const name = zone.kind === "serre" ? zone.greenhouse.name : zone.parcelle.name
  const zoneTables = zone.kind === "serre" ? tables.filter((t) => t.greenhouse_id === zone.greenhouse.id) : []
  const lotGroups = groupLotsForZone(seedLots, { kind: zone.kind, id: zone.kind === "serre" ? zone.greenhouse.id : zone.parcelle.id }, new Set(zoneTables.map((t) => t.id)))
  const lotCount = lotGroups.toSow.length + lotGroups.sownHere.length
  const today = todayIso()
  const varietyGroups = groupPlantings(plantings, plantingLabel)
  const openRows = zonePrograms.flatMap((program) => (interventionsByProgram.get(program.id) ?? []).filter((intervention) => !intervention.done))
  const overdueCount = openRows.filter((intervention) => intervention.due_date != null && daysBetween(today, intervention.due_date) < 0).length

  useEffect(() => {
    if (selected) { setShowSugg(false); return }
    const q = query.trim()
    if (q.length < 1) { setSuggestions([]); setShowSugg(false); return }
    const timer = setTimeout(async () => {
      const escaped = q.replace(/[%,()]/g, " ")
      const [{ data: v }, { data: s }] = await Promise.all([
        supabase.from("varieties").select("id,name,commercial_name,obtenteur,type,color,flowering,fragrance,parents,parentage,description,photo_url,image_url").or(`name.ilike.%${escaped}%,commercial_name.ilike.%${escaped}%,obtenteur.ilike.%${escaped}%`).limit(8),
        supabase.from("seedlings").select("id,code,seedling_code,status").in("status", [...GERMINATED_SEEDLING_STATUSES]).or(`code.ilike.%${escaped}%,seedling_code.ilike.%${escaped}%`).limit(8),
      ])
      setSuggestions([
        ...(v ?? []).map((x: any) => ({
          id: x.id,
          name: x.commercial_name || x.name,
          commercialName: x.commercial_name,
          obtenteur: x.obtenteur,
          type: x.type,
          color: x.color,
          flowering: x.flowering,
          fragrance: x.fragrance,
          parents: x.parents || x.parentage,
          description: x.description,
          photoUrl: x.photo_url || x.image_url,
          source: "catalogue" as const,
        })),
        ...(s ?? []).map((x: any) => ({ id: x.id, name: x.seedling_code || x.code, source: "semis" as const })),
      ])
      setShowSugg(true)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, selected])

  async function createPlanting() {
    if (!selected) return
    if (zone.kind === "serre" && !tableId) return
    setCreateError(null)
    const individualCount = selected.source === "semis" ? 1 : Math.min(500, Math.max(1, Number.parseInt(plantCount, 10) || 1))
    const groupId = crypto.randomUUID()
    const { error } = await supabase.from("field_plantings").insert(
      Array.from({ length: individualCount }, (_, index) => ({
        variety_id: selected.source === "catalogue" ? selected.id : null,
        seedling_id: selected.source === "semis" ? selected.id : null,
        greenhouse_table_id: zone.kind === "serre" ? tableId : null,
        parcelle_id: zone.kind === "parcelle" ? zone.parcelle.id : null,
        group_id: groupId,
        individual_number: index + 1,
        planted_at: plantedAt,
        plant_count: 1,
        soil_type: locationType === "pleine_terre" ? soilType || null : null,
        container_type: locationType === "pot" ? "Terreau" : null,
        location_type: locationType,
        notes: notes.trim(),
      }))
    )
    if (error) {
      setCreateError(error.code === "42703" || error.code === "PGRST204"
        ? "Exécutez la migration 028 dans Supabase avant l'enregistrement des individus."
        : `Enregistrement impossible : ${error.message}`)
      return
    }
    setQuery(""); setSelected(null); setTableId(""); setPlantCount("1"); setNotes(""); setCreating(false)
    onRefresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Retour</button>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">{name}</h2>
        {tab === "varietes" ? <Button size="sm" onClick={() => setCreating((v) => !v)} className="gap-1.5"><Plus className="size-4" /> Plant</Button> : null}
      </div>

      <div role="tablist" aria-label="Sections de la zone" className="flex gap-1 border-b border-border">
        {([
          ["varietes", `Variétés (${plantings.length})`],
          ["graines", `Graines à semer (${lotCount})`],
          ["programme", `Programme (${openRows.length} à appliquer)`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={tab === key
              ? "-mb-px border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground"
              : "-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"}
          >
            {label}
            {key === "programme" && overdueCount > 0 ? <span className="ml-1.5 inline-block size-2 rounded-full bg-destructive align-middle" aria-label={`${overdueCount} en retard`} /> : null}
          </button>
        ))}
      </div>

      {tab === "varietes" ? <>
      {creating ? (
        <Card className="p-4">
          {createError ? <p role="alert" className="mb-3 text-sm text-destructive">{createError}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Field label="Variété (Catalogue ou Semis)">
                <Input value={selected ? selected.name : query} onChange={(e) => { setQuery(e.target.value); setSelected(null) }} placeholder="Tapez pour rechercher..." />
              </Field>
              {showSugg && suggestions.length > 0 ? (
                <div className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-lg">
                  {suggestions.map((s) => (
                    <button key={`${s.source}-${s.id}`} type="button" className="flex w-full gap-3 rounded-md p-2 text-left hover:bg-accent" onClick={() => { setSelected(s); if (s.source === "semis") setPlantCount("1"); setShowSugg(false) }}>
                      {s.photoUrl ? <img src={s.photoUrl} alt="" className="size-14 rounded-md object-cover" /> : <div className="flex size-14 items-center justify-center rounded-md bg-primary/10"><Sprout className="size-5 text-primary" /></div>}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2"><span className="truncate text-sm font-medium text-foreground">{s.name}</span><Badge tone={s.source === "catalogue" ? "primary" : "neutral"}>{s.source === "catalogue" ? "Catalogue" : "Semis"}</Badge></span>
                        <span className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">{s.obtenteur ? <span>{s.obtenteur}</span> : null}{s.type ? <span>{s.type}</span> : null}{s.color ? <span>{s.color}</span> : null}</span>
                        {s.parents ? <span className="mt-1 block truncate text-[11px] text-muted-foreground">Parents : {s.parents}</span> : null}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {zone.kind === "serre" ? (
              <Field label="Table">
                <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  {zoneTables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
            ) : null}
            {selected ? (
              <Card className="mt-2 flex gap-3 border-primary/30 bg-primary/5 p-3">
                {selected.photoUrl ? <img src={selected.photoUrl} alt={`Photo de ${selected.name}`} className="size-20 rounded-md object-cover" /> : null}
                <div className="min-w-0 text-xs">
                  <p className="font-medium text-foreground">{selected.name}</p>
                  {selected.commercialName && selected.commercialName !== selected.name ? <p className="text-muted-foreground">{selected.commercialName}</p> : null}
                  <p className="mt-1 text-muted-foreground">{[selected.obtenteur, selected.type, selected.color, selected.flowering].filter(Boolean).join(" · ") || "Fiche catalogue sélectionnée"}</p>
                  {selected.description ? <p className="mt-1 line-clamp-2 text-muted-foreground">{selected.description}</p> : null}
                </div>
              </Card>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Implantation">
              <Select value={locationType} onChange={(event) => setLocationType(event.target.value as typeof locationType)}>
                <option value="pot">Pot · substrat terreau</option>
                <option value="pleine_terre">Pleine terre</option>
              </Select>
            </Field>
            {locationType === "pleine_terre" ? (
              <Field label="Type de sol">
                <Select value={soilType} onChange={(event) => setSoilType(event.target.value)}>
                  <option value="">Choisir un type de sol</option>
                  {Object.entries(SOIL_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="Substrat"><Input value="Terreau" readOnly /></Field>
            )}
            <Field label={locationType === "pot" ? "Nombre de pots" : "Nombre de plants"}>
              <Input type="number" min="1" max="500" value={plantCount} disabled={selected?.source === "semis"} onChange={(e) => setPlantCount(e.target.value)} />
            </Field>
            <Field label="Date d'ajout"><Input type="date" value={plantedAt} onChange={(e) => setPlantedAt(e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Note initiale"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observation à l'installation" /></Field></div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Annuler</Button>
            <Button size="sm" onClick={createPlanting} disabled={!selected || (zone.kind === "serre" && !tableId)}>Créer</Button>
          </div>
        </Card>
      ) : null}

      {plantings.length === 0 ? (
        <EmptyState icon={<Sprout className="size-8" />} title="Aucun plant" description="Ajoutez une variété du Catalogue ou un Semis à cette zone." />
      ) : (
        <div className="flex flex-col gap-2">
          {varietyGroups.map((group) => {
            const open = openVarieties.has(group.key)
            const alertIds = new Set(group.lots.flatMap((lot) => lot.plants).filter((plant) => {
              const last = (observationsByPlanting.get(plant.planting.id) ?? [])[0]
              return last != null && (last.disease_pressure.length > 0 || last.pests.length > 0)
            }).map((plant) => plant.planting.id))
            const tableNames = group.tableIds.map((id) => tables.find((table) => table.id === id)?.name).filter(Boolean)
            return (
              <Card key={group.key} className={open ? "border-primary/40" : ""}>
                <div className="flex items-center gap-2 p-3">
                  <button type="button" onClick={() => onOpenPlant(group.firstPlantingId, "variety")} className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left hover:text-primary" aria-label={`Ouvrir la fiche de ${group.name}`}>
                    {alertIds.size > 0 ? <span className="size-2 shrink-0 rounded-full bg-destructive" aria-label="Problème sanitaire observé" /> : null}
                    <Sprout className="size-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-medium text-foreground">{group.name}</span>
                  </button>
                  <div className="hidden shrink-0 flex-wrap items-center gap-1 sm:flex">
                    <Badge tone="primary">{group.plantCount} plant{group.plantCount > 1 ? "s" : ""}</Badge>
                    {group.lots.length > 1 ? <Badge tone="neutral">{group.lots.length} lots</Badge> : null}
                    {group.cultures.map((culture) => <Badge key={culture} tone="neutral">{culture === "pot" ? "Pot" : "Pleine terre"}</Badge>)}
                    {tableNames.length > 0 ? <Badge tone="neutral">{tableNames.join(", ")}</Badge> : null}
                  </div>
                  <Button size="sm" variant="ghost" aria-expanded={open} aria-label={`${open ? "Masquer" : "Voir"} les plants de ${group.name}`} onClick={() => setOpenVarieties((current) => { const next = new Set(current); if (next.has(group.key)) next.delete(group.key); else next.add(group.key); return next })}>
                    {open ? "Masquer" : `Plants (${group.plantCount})`}
                  </Button>
                </div>
                {open ? (
                  <div className="flex flex-col gap-3 border-t border-border p-3">
                    {group.lots.map((lot) => (
                      <div key={lot.key} className="flex flex-col gap-1.5">
                        {group.lots.length > 1 ? <p className="text-xs font-medium text-muted-foreground">Lot {lot.number} · planté le {formatDate(lot.plantedAt)} · {lot.plants.length} plant{lot.plants.length > 1 ? "s" : ""}</p> : <p className="text-xs text-muted-foreground">Planté le {formatDate(lot.plantedAt)}</p>}
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label={group.lots.length > 1 ? `Plants du lot ${lot.number}` : "Plants"}>
                          {lot.plants.map((plant) => (
                            <button
                              key={plant.planting.id}
                              type="button"
                              onClick={() => onOpenPlant(plant.planting.id, "plant")}
                              aria-label={`Ouvrir la fiche ${group.lots.length > 1 ? `du lot ${lot.number}, ` : ""}plant ${plant.number}`}
                              className="relative flex size-9 items-center justify-center rounded-md border border-border-strong bg-background text-sm font-medium text-foreground hover:bg-muted"
                            >
                              {plant.number}
                              {alertIds.has(plant.planting.id) ? <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive" aria-label="Problème sanitaire observé" /> : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}

      </> : null}

      {tab === "graines" ? (
        <SeedLotPicker zone={zone} batches={seedLots} loadError={seedLotError} crossMap={crossMap} tables={tables} onRefresh={onRefresh} />
      ) : null}

      {tab === "programme" ? (
        <ZoneProgramPanel
          zone={zone}
          programs={zonePrograms}
          interventionsByProgram={interventionsByProgram}
          observations={plantings.flatMap((planting) => observationsByPlanting.get(planting.id) ?? []).sort((left, right) => right.observation_date.localeCompare(left.observation_date))}
          onRefresh={onRefresh}
        />
      ) : null}
    </div>
  )
}
