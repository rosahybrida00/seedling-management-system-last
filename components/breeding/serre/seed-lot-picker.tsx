"use client"

// « Graines à semer » d'une serre ou d'une parcelle.
// Aucun lot n'est affiché tant que l'utilisateur n'en a pas choisi un : la page
// reste légère. Le lot choisi ouvre deux blocs :
//   1. Stratification (méthode, début, fin) : enregistrable seule, avant de semer.
//   2. Semis : date, type de culture, planche (table de la serre) et type de
//      terreau. « Semer ici » affecte le lot à la zone.
// Une fois enregistré, le panneau se referme et le lot reste sélectionnable.

import { useEffect, useMemo, useState } from "react"
import { Snowflake } from "lucide-react"
import { Badge, Card, EmptyState, Field, Input, SectionHeading, Select } from "@/components/breeding/ui"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { CULTURE_TYPE_LABELS, STRATIFICATION_METHOD_LABELS, SUBSTRATE_LABELS } from "@/lib/domain/fieldLabels"
import { todayIso } from "@/lib/services/plantTimeline"
import { groupLotsForZone, lotLabel, sowingDateBounds, sowingProblem, stratificationProblem } from "@/lib/services/seedLotRules"
import type { CrossParents, GreenhouseTable, SeedLot, Zone } from "@/app/parcelle/types"

interface HarvestedSeed {
  id: string
  seed_name: string
  seed_number: number
  status: string
  germination_date: string | null
}

function errorMessage(error: { code?: string; message: string }): string {
  return error.code === "23514" ? error.message : `Enregistrement impossible : ${error.message}`
}

export function SeedLotPicker({ zone, batches, loadError, crossMap, tables, onRefresh }: {
  zone: Zone
  batches: SeedLot[]
  loadError?: string | null
  crossMap: Map<string, CrossParents>
  tables: GreenhouseTable[]
  onRefresh: () => void
}) {
  const [selectedId, setSelectedId] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const zoneName = zone.kind === "serre" ? zone.greenhouse.name : zone.parcelle.name
  const zoneId = zone.kind === "serre" ? zone.greenhouse.id : zone.parcelle.id
  const zoneTables = useMemo(() => (zone.kind === "serre" ? tables.filter((table) => table.greenhouse_id === zone.greenhouse.id) : []), [zone, tables])
  const groups = useMemo(() => groupLotsForZone(batches, { kind: zone.kind, id: zoneId }, new Set(zoneTables.map((table) => table.id))), [batches, zone.kind, zoneId, zoneTables])
  const selected = [...groups.toSow, ...groups.sownHere].find((batch) => batch.id === selectedId) ?? null
  const sownHere = selected ? groups.sownHere.some((batch) => batch.id === selected.id) : false
  const total = groups.toSow.length + groups.sownHere.length

  // Le lot choisi disparaît de la liste (ex. affecté ailleurs) : on referme le panneau.
  useEffect(() => { if (selectedId && !selected) setSelectedId("") }, [selectedId, selected])

  function finished(message: string) {
    setSelectedId("")
    setNotice(message)
    onRefresh()
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Graines à semer">
      <SectionHeading title={`Graines à semer · ${zoneName}`} description="Choisissez un lot pour ouvrir sa stratification et son semis." />
      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}
      {notice ? <p role="status" className="text-sm text-primary">{notice}</p> : null}

      {zone.kind === "serre" && zoneTables.length === 0 ? (
        <EmptyState title="Aucune planche (table) dans cette serre" description="Ajoutez une table à la serre pour y semer un lot." />
      ) : total === 0 && !loadError ? (
        <EmptyState title="Aucun lot de graines" description="Les lots issus des fruits récoltés apparaîtront ici pour leur stratification et leur semis." />
      ) : (
        <Field label="Lot de graines" htmlFor="seed-lot-select">
          <Select id="seed-lot-select" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setNotice(null) }}>
            <option value="">Choisir un lot ({total})</option>
            {groups.toSow.length > 0 ? (
              <optgroup label={`À semer (${groups.toSow.length})`}>
                {groups.toSow.map((batch) => <option key={batch.id} value={batch.id}>{lotLabel(batch)}</option>)}
              </optgroup>
            ) : null}
            {groups.sownHere.length > 0 ? (
              <optgroup label={`Semés ici (${groups.sownHere.length})`}>
                {groups.sownHere.map((batch) => <option key={batch.id} value={batch.id}>{lotLabel(batch)}</option>)}
              </optgroup>
            ) : null}
          </Select>
        </Field>
      )}

      {selected ? (
        <LotPanel
          key={selected.id}
          batch={selected}
          cross={crossMap.get(selected.cross_id) ?? null}
          zone={zone}
          zoneTables={zoneTables}
          sownHere={sownHere}
          onClose={() => setSelectedId("")}
          onDone={finished}
        />
      ) : null}
    </section>
  )
}

function LotPanel({ batch, cross, zone, zoneTables, sownHere, onClose, onDone }: {
  batch: SeedLot
  cross: CrossParents | null
  zone: Zone
  zoneTables: GreenhouseTable[]
  sownHere: boolean
  onClose: () => void
  onDone: (message: string) => void
}) {
  const today = todayIso()
  const harvestDate = batch.harvest_date ?? null
  const [methods, setMethods] = useState<string[]>(batch.stratification_methods ?? [])
  const [start, setStart] = useState(batch.stratification_start_date ?? "")
  const [end, setEnd] = useState(batch.stratification_end_date ?? "")
  const [sowingDate, setSowingDate] = useState(sownHere ? batch.sowing_date ?? today : today)
  const [cultureType, setCultureType] = useState<string>(batch.location_type ?? (zone.kind === "serre" ? "pot" : "pleine_terre"))
  const [tableId, setTableId] = useState(batch.table_id ?? (zoneTables.length === 1 ? zoneTables[0].id : ""))
  const [substrate, setSubstrate] = useState(batch.substrate ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seedRows, setSeedRows] = useState<HarvestedSeed[]>([])
  const [seedError, setSeedError] = useState<string | null>(null)
  const [germinatingId, setGerminatingId] = useState<string | null>(null)

  const sowingBounds = sowingDateBounds(harvestDate, end, today)
  const substrateOptions = Object.entries(SUBSTRATE_LABELS)
  const legacySubstrate = substrate && !(substrate in SUBSTRATE_LABELS) ? substrate : null

  useEffect(() => {
    if (!batch.fruit_id || !sownHere) return
    let cancelled = false
    supabase.from("harvested_seeds").select("id,seed_name,seed_number,status,germination_date").eq("fruit_id", batch.fruit_id).order("seed_number")
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) setSeedError(queryError.message)
        else setSeedRows((data ?? []) as HarvestedSeed[])
      })
    return () => { cancelled = true }
  }, [batch.fruit_id, sownHere])

  function toggleMethod(key: string) {
    setMethods((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
  }

  async function saveStratification() {
    const problem = stratificationProblem({ harvestDate, start, end })
    if (problem) { setError(problem); return }
    setBusy(true)
    setError(null)
    const { error: updateError } = await supabase.from("sowing_batches").update({
      stratification_methods: methods,
      stratification_start_date: start || null,
      stratification_end_date: end || null,
    }).eq("id", batch.id)
    setBusy(false)
    if (updateError) { setError(errorMessage(updateError)); return }
    onDone(`Stratification du lot ${batch.fruit_code ?? ""} enregistrée.`.replace("  ", " "))
  }

  async function sow() {
    const strat = stratificationProblem({ harvestDate, start, end })
    if (strat) { setError(strat); return }
    const problem = sowingProblem({ harvestDate, stratificationEnd: end, sowingDate, today, zoneKind: zone.kind, tableId, cultureType, substrate })
    if (problem) { setError(problem); return }
    setBusy(true)
    setError(null)
    const { error: updateError } = await supabase.from("sowing_batches").update({
      stratification_methods: methods,
      stratification_start_date: start || null,
      stratification_end_date: end || null,
      sowing_date: sowingDate,
      table_id: zone.kind === "serre" ? tableId : null,
      parcelle_id: zone.kind === "parcelle" ? zone.parcelle.id : null,
      location_type: cultureType,
      substrate: cultureType === "pot" ? substrate : null,
    }).eq("id", batch.id)
    setBusy(false)
    if (updateError) { setError(errorMessage(updateError)); return }
    onDone(`Lot ${batch.fruit_code ?? ""} semé.`.replace("  ", " "))
  }

  async function markGerminated(seed: HarvestedSeed) {
    setGerminatingId(seed.id)
    setError(null)
    const germinationDate = today
    const { error: rpcError } = await supabase.rpc("mark_seed_germinated", { p_seed_id: seed.id, p_germination_date: germinationDate })
    setGerminatingId(null)
    if (rpcError) {
      setError(rpcError.code === "PGRST202" ? "Exécutez la migration 031 pour valider les levées et créer les fiches individuelles." : errorMessage(rpcError))
      return
    }
    setSeedRows((current) => current.map((item) => (item.id === seed.id ? { ...item, status: "germinated", germination_date: germinationDate } : item)))
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Snowflake className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base text-foreground">{batch.fruit_code ?? "Lot sans fruit associé"}</p>
          <p className="text-xs text-muted-foreground">
            {cross ? `${cross.seed_parent ?? "?"} × ${cross.pollen_parent ?? "?"} · ` : ""}
            {batch.seed_count} graine(s){harvestDate ? ` · récolté le ${harvestDate}` : ""}
          </p>
        </div>
        <Badge tone={sownHere ? "success" : "neutral"}>{sownHere ? "Semé ici" : "À semer"}</Badge>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>Fermer</Button>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">1 · Stratification</legend>
        <Field label="Méthode" hint="Liste provisoire, ajustable sans migration.">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {Object.entries(STRATIFICATION_METHOD_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5 text-sm text-foreground">
                <input type="checkbox" checked={methods.includes(key)} onChange={() => toggleMethod(key)} /> {label}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Début de stratification" htmlFor="strat-start" hint={harvestDate ? `Pas avant la récolte (${harvestDate}).` : undefined}>
            <Input id="strat-start" type="date" value={start} min={harvestDate ?? undefined} onChange={(event) => setStart(event.target.value)} />
          </Field>
          <Field label="Fin de stratification" htmlFor="strat-end">
            <Input id="strat-end" type="date" value={end} min={start || harvestDate || undefined} onChange={(event) => setEnd(event.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={saveStratification} disabled={busy}>Enregistrer la stratification</Button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">2 · Semis</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date de semis" htmlFor="sow-date">
            <Input id="sow-date" type="date" value={sowingDate} min={sowingBounds.min} max={sowingBounds.max} onChange={(event) => setSowingDate(event.target.value)} />
          </Field>
          <Field label="Type de culture" htmlFor="sow-culture">
            <Select id="sow-culture" value={cultureType} onChange={(event) => setCultureType(event.target.value)}>
              {Object.entries(CULTURE_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </Select>
          </Field>
          {zone.kind === "serre" ? (
            <Field label="Planche (table)" htmlFor="sow-table">
              <Select id="sow-table" value={tableId} onChange={(event) => setTableId(event.target.value)}>
                <option value="">-- Choisir une planche --</option>
                {zoneTables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Parcelle" htmlFor="sow-parcelle"><Input id="sow-parcelle" value={zone.parcelle.name} readOnly /></Field>
          )}
          {cultureType === "pot" ? (
            <Field label="Type de terreau" htmlFor="sow-substrate">
              <Select id="sow-substrate" value={substrate} onChange={(event) => setSubstrate(event.target.value)}>
                <option value="">-- Choisir un terreau --</option>
                {legacySubstrate ? <option value={legacySubstrate}>{legacySubstrate}</option> : null}
                {substrateOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </Select>
            </Field>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={sow} disabled={busy}>{busy ? "Enregistrement…" : sownHere ? "Enregistrer le semis" : "Semer ici"}</Button>
        </div>
      </fieldset>

      {sownHere ? (
        <details className="border-t border-border pt-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Graines individuelles · {seedRows.filter((seed) => seed.status === "germinated" || seed.germination_date).length}/{batch.seed_count} levées
          </summary>
          {seedError ? <p className="mt-2 text-sm text-destructive">Chargement des graines impossible : {seedError}</p> : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {seedRows.map((seed) => {
              const germinated = seed.status === "germinated" || Boolean(seed.germination_date)
              return (
                <div key={seed.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">Graine {seed.seed_number} · {seed.seed_name}</span>
                  {germinated ? (
                    <span className="text-xs text-muted-foreground">Levée{seed.germination_date ? ` le ${seed.germination_date}` : ""}</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => markGerminated(seed)} disabled={germinatingId != null}>
                      {germinatingId === seed.id ? "Validation…" : "Marquer levée"}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </details>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </Card>
  )
}
