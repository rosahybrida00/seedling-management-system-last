"use client"

// Suivi du lot de graines par fruit, après récolte : méthode de
// stratification (cases à cocher — liste provisoire, voir fieldLabels.ts),
// date de début et date de fin. Un lot (sowing_batches) regroupe toutes les
// graines d'un même fruit récolté ; ce suivi est donc au niveau du lot, pas
// de chaque semis individuel.

import { useEffect, useState } from "react"
import { Snowflake } from "lucide-react"
import { Card, EmptyState, Field, Input, SectionHeading, Select } from "@/components/breeding/ui"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { STRATIFICATION_METHOD_LABELS } from "@/lib/domain/fieldLabels"
import type { CrossParents, SeedLot, Zone, GreenhouseTable, Parcelle } from "@/app/parcelle/types"

interface Greenhouse { id: string; name: string }
type SowingBatch = SeedLot
type CrossInfo = CrossParents

interface HarvestedSeed {
  id: string
  seed_name: string
  seed_number: number
  status: string
  germination_date: string | null
}

function SeedLotRow({ batch, cross, greenhouses, tables, parcelles, onRefresh }: {
  batch: SowingBatch; cross: CrossInfo | null; greenhouses: Greenhouse[]; tables: GreenhouseTable[]; parcelles: Parcelle[]; onRefresh: () => void
}) {
  const [methods, setMethods] = useState<string[]>(batch.stratification_methods ?? [])
  const [startDate, setStartDate] = useState(batch.stratification_start_date ?? "")
  const [endDate, setEndDate] = useState(batch.stratification_end_date ?? "")
  const [location, setLocation] = useState(batch.table_id ? `serre:${batch.table_id}` : batch.parcelle_id ? `parcelle:${batch.parcelle_id}` : "")
  const [locationType, setLocationType] = useState<"pot" | "pleine_terre">(batch.location_type ?? "pot")
  const [saving, setSaving] = useState(false)
  const [seedRows, setSeedRows] = useState<HarvestedSeed[]>([])
  const [seedRowsError, setSeedRowsError] = useState<string | null>(null)
  const [germinatingSeedId, setGerminatingSeedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!batch.fruit_id) return
    let cancelled = false
    supabase.from("harvested_seeds")
      .select("id,seed_name,seed_number,status,germination_date")
      .eq("fruit_id", batch.fruit_id)
      .order("seed_number")
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) setSeedRowsError(queryError.message)
        else setSeedRows((data ?? []) as HarvestedSeed[])
      })
    return () => { cancelled = true }
  }, [batch.fruit_id])

  const dirty =
    JSON.stringify(methods) !== JSON.stringify(batch.stratification_methods ?? []) ||
    startDate !== (batch.stratification_start_date ?? "") ||
    endDate !== (batch.stratification_end_date ?? "") ||
    location !== (batch.table_id ? `serre:${batch.table_id}` : batch.parcelle_id ? `parcelle:${batch.parcelle_id}` : "") ||
    locationType !== (batch.location_type ?? "pot")

  function toggleMethod(key: string) {
    setMethods((current) => (current.includes(key) ? current.filter((m) => m !== key) : [...current, key]))
  }

  async function save() {
    setSaving(true)
    setError(null)
    const isGreenhouse = location.startsWith("serre:")
    const locationId = location.slice(location.indexOf(":") + 1)
    const { error: err } = await supabase
      .from("sowing_batches")
      .update({
        stratification_methods: methods,
        stratification_start_date: startDate || null,
        stratification_end_date: endDate || null,
        table_id: isGreenhouse ? locationId : null,
        parcelle_id: location && !isGreenhouse ? locationId : null,
        location_type: location ? locationType : null,
      })
      .eq("id", batch.id)
    setSaving(false)
    if (err) {
      setError(`Erreur lors de l'enregistrement : ${err.message}`)
      return
    }
    onRefresh()
  }

  async function markGerminated(seed: HarvestedSeed) {
    setGerminatingSeedId(seed.id)
    setError(null)
    const germinationDate = new Date().toISOString().slice(0, 10)
    const { error: rpcError } = await supabase.rpc("mark_seed_germinated", {
      p_seed_id: seed.id,
      p_germination_date: germinationDate,
    })
    setGerminatingSeedId(null)
    if (rpcError) {
      setError(rpcError.code === "PGRST202"
        ? "Exécutez la migration 031 pour valider les levées et créer les fiches individuelles."
        : `Validation de la levée impossible : ${rpcError.message}`)
      return
    }
    setSeedRows((current) => current.map((item) => item.id === seed.id
      ? { ...item, status: "germinated", germination_date: germinationDate }
      : item))
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

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Emplacement du lot avant levée">
          <Select value={location} onChange={(event) => setLocation(event.target.value)}>
            <option value="">Non affecté</option>
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
        <Field label="Type de culture">
          <Select value={locationType} onChange={(event) => setLocationType(event.target.value as typeof locationType)}>
            <option value="pot">Contenant / pot</option>
            <option value="pleine_terre">Pleine terre</option>
          </Select>
        </Field>
      </div>

      <details className="mt-3 border-t border-border pt-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Graines individuelles · {seedRows.filter((seed) => seed.status === "germinated" || seed.germination_date).length}/{batch.seed_count} levées
        </summary>
        {seedRowsError ? <p className="mt-2 text-sm text-destructive">Chargement des graines impossible : {seedRowsError}</p> : null}
        {seedRows.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {seedRows.map((seed) => {
              const germinated = seed.status === "germinated" || Boolean(seed.germination_date)
              return (
                <div key={seed.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">Graine {seed.seed_number} · {seed.seed_name}</span>
                  {germinated ? (
                    <span className="text-xs text-muted-foreground">Levée{seed.germination_date ? ` le ${seed.germination_date}` : ""}</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => markGerminated(seed)} disabled={germinatingSeedId != null}>
                      {germinatingSeedId === seed.id ? "Validation…" : "Marquer levée"}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        ) : !seedRowsError ? (
          <p className="mt-2 text-xs text-muted-foreground">Aucune graine individuelle liée à ce fruit.</p>
        ) : null}
      </details>

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={save} disabled={!dirty || saving} className="gap-1.5">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </Card>
  )
}

export function ZoneSeedLotTracking({ zone, batches, loadError, crossMap, greenhouses, tables, parcelles, onRefresh }: {
  zone: Zone
  batches: SeedLot[]
  loadError?: string | null
  crossMap: Map<string, CrossParents>
  greenhouses: Greenhouse[]
  tables: GreenhouseTable[]
  parcelles: Parcelle[]
  onRefresh: () => void
}) {
  const [batchId, setBatchId] = useState("")
  const [tableId, setTableId] = useState("")
  const [locationType, setLocationType] = useState<"pot" | "pleine_terre">("pot")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const zoneName = zone.kind === "serre" ? zone.greenhouse.name : zone.parcelle.name
  const zoneTables = zone.kind === "serre" ? tables.filter((table) => table.greenhouse_id === zone.greenhouse.id) : []
  const tableIds = new Set(zoneTables.map((table) => table.id))
  const assigned = batches.filter((batch) => zone.kind === "serre"
    ? batch.table_id != null && tableIds.has(batch.table_id)
    : batch.parcelle_id === zone.parcelle.id)
  const unassigned = batches.filter((batch) => batch.table_id == null && batch.parcelle_id == null)

  async function assignBatch() {
    if (!batchId || (zone.kind === "serre" && !tableId)) return
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase.from("sowing_batches").update({
      table_id: zone.kind === "serre" ? tableId : null,
      parcelle_id: zone.kind === "parcelle" ? zone.parcelle.id : null,
      location_type: locationType,
    }).eq("id", batchId)
    setSaving(false)
    if (updateError) {
      setError(`Affectation impossible : ${updateError.message}`)
      return
    }
    setBatchId("")
    setTableId("")
    onRefresh()
  }

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5">
      <SectionHeading title={`Graines à semer · ${zoneName}`} description="Lots récoltés, affectation avant semis, stratification et validation individuelle après levée." />
      {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}
      {unassigned.length > 0 ? (
        <Card className="grid gap-3 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Lot de graines">
            <Select value={batchId} onChange={(event) => setBatchId(event.target.value)}>
              <option value="">Choisir un lot non affecté</option>
              {unassigned.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.fruit_code ?? "Lot sans code"} · {batch.seed_count} graine(s)</option>
              ))}
            </Select>
          </Field>
          {zone.kind === "serre" ? (
            <Field label="Table">
              <Select value={tableId} onChange={(event) => setTableId(event.target.value)}>
                <option value="">Choisir une table</option>
                {zoneTables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Type de culture">
              <Select value={locationType} onChange={(event) => setLocationType(event.target.value as typeof locationType)}>
                <option value="pot">Contenant / pot</option>
                <option value="pleine_terre">Pleine terre</option>
              </Select>
            </Field>
          )}
          <Button onClick={assignBatch} disabled={!batchId || saving || (zone.kind === "serre" && !tableId)}>
            {saving ? "Affectation…" : "Affecter le lot"}
          </Button>
        </Card>
      ) : null}
      {zone.kind === "serre" && zoneTables.length === 0 ? (
        <EmptyState title="Aucune table dans cette serre" description="Ajoutez une table à la serre avant d’y affecter un lot ou un plant." />
      ) : assigned.length > 0 ? (
        <div className="grid gap-3">
          {assigned.map((batch) => (
            <SeedLotRow key={batch.id} batch={batch} cross={crossMap.get(batch.cross_id) ?? null} greenhouses={greenhouses} tables={tables} parcelles={parcelles} onRefresh={onRefresh} />
          ))}
        </div>
      ) : unassigned.length === 0 && !loadError ? (
        <EmptyState title="Aucun lot de graines dans cette zone" description="Les lots issus des fruits récoltés apparaîtront ici pour leur stratification et leur suivi avant la levée." />
      ) : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
