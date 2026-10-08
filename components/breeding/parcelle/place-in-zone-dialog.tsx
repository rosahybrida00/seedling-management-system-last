"use client"

// Placer une variété ou un semis dans une serre / parcelle de l'utilisateur.
// Utilisé par « Ajouter à ma collection » (catalogue et semis) et par le
// bandeau « Parents à placer ». Les zones proposées sont uniquement celles que
// l'utilisateur a créées, classées par pertinence (voir placementService).

import { useEffect, useMemo, useState } from "react"
import { Check, MapPin, Warehouse, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, Field, Input, Select } from "@/components/breeding/ui"
import { supabase } from "@/lib/supabase-client"
import { SOIL_TYPE_LABELS } from "@/lib/domain/fieldLabels"
import {
  buildPlantingRows,
  defaultLocationType,
  defaultZoneKey,
  placementCount,
  rankZones,
  validatePlacement,
  zoneKey,
  type LocationType,
  type PlacementSource,
  type PlantingSnapshot,
  type RankedZone,
  type ZoneOption,
} from "@/lib/services/placementService"

export interface PlacementResult {
  /** Plants créés (0 si l'utilisateur a seulement ajouté à la collection). */
  placed: number
  zoneName: string | null
}

interface Props {
  source: PlacementSource
  /** Déjà dans la collection : le bouton « sans placer » n'a plus de sens. */
  alreadyInCollection?: boolean
  onClose: () => void
  onDone: (result: PlacementResult) => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PlaceInZoneDialog({ source, alreadyInCollection = false, onClose, onDone }: Props) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [zones, setZones] = useState<ZoneOption[]>([])
  const [plantings, setPlantings] = useState<PlantingSnapshot[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [tableId, setTableId] = useState("")
  const [locationType, setLocationType] = useState<LocationType>("pot")
  const [soilType, setSoilType] = useState("")
  const [count, setCount] = useState("1")
  const [plantedAt, setPlantedAt] = useState(today())
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) {
        if (!cancelled) { setLoadError("Session expirée : reconnectez-vous."); setLoading(false) }
        return
      }
      const [gh, tb, pc, pl] = await Promise.all([
        supabase.from("greenhouses").select("id,name").eq("user_id", userId).order("name"),
        supabase.from("greenhouse_tables").select("id,greenhouse_id,name").order("name"),
        supabase.from("parcelles").select("id,name,soil_type").eq("user_id", userId).order("name"),
        supabase
          .from("field_plantings")
          .select("variety_id,seedling_id,greenhouse_table_id,parcelle_id,planted_at,removed_at")
          .eq("user_id", userId),
      ])
      if (cancelled) return
      const failed = gh.error ?? tb.error ?? pc.error ?? pl.error
      if (failed) { setLoadError(`Chargement impossible : ${failed.message}`); setLoading(false); return }

      const greenhouseIds = new Set((gh.data ?? []).map((g) => g.id as string))
      const options: ZoneOption[] = [
        ...(gh.data ?? []).map((g) => ({
          key: zoneKey("serre", g.id as string),
          kind: "serre" as const,
          id: g.id as string,
          name: g.name as string,
          tables: (tb.data ?? [])
            .filter((t) => t.greenhouse_id === g.id && greenhouseIds.has(t.greenhouse_id as string))
            .map((t) => ({ id: t.id as string, name: t.name as string })),
          soilTypes: [],
        })),
        ...(pc.data ?? []).map((p) => ({
          key: zoneKey("parcelle", p.id as string),
          kind: "parcelle" as const,
          id: p.id as string,
          name: p.name as string,
          tables: [],
          soilTypes: Array.isArray(p.soil_type) ? (p.soil_type as string[]) : [],
        })),
      ]
      const snapshots = (pl.data ?? []) as PlantingSnapshot[]
      setZones(options)
      setPlantings(snapshots)
      const initial = defaultZoneKey(rankZones(options, snapshots, source))
      if (initial) selectZone(initial, options)
      setLoading(false)
    }
    void load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id, source.kind])

  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const ranked = useMemo(() => rankZones(zones, plantings, source), [zones, plantings, source])
  const selected = zones.find((zone) => zone.key === selectedKey) ?? null

  function selectZone(key: string, options: ZoneOption[] = zones) {
    const zone = options.find((item) => item.key === key)
    if (!zone) return
    setSelectedKey(key)
    setLocationType(defaultLocationType(zone))
    setSoilType(zone.soilTypes[0] ?? "")
    setTableId(zone.tables.length === 1 ? zone.tables[0].id : "")
    setError(null)
  }

  async function ensureInCollection() {
    const { error: insertError } = await supabase
      .from("catalog_collection")
      .insert(source.kind === "catalogue" ? { variety_id: source.id } : { seedling_id: source.id })
    // 23505 : déjà dans la collection, sans conséquence.
    if (insertError && insertError.code !== "23505") throw new Error(insertError.message)
  }

  async function addWithoutPlacing() {
    setSaving(true)
    setError(null)
    try {
      await ensureInCollection()
      onDone({ placed: 0, zoneName: null })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ajout impossible.")
      setSaving(false)
    }
  }

  async function place() {
    const input = { source, zone: selected, tableId, locationType, soilType, count, plantedAt, notes }
    const problem = validatePlacement(input, today())
    if (problem) { setError(problem); return }
    setSaving(true)
    setError(null)
    const rows = buildPlantingRows(input, crypto.randomUUID())
    const { error: insertError } = await supabase.from("field_plantings").insert(rows)
    if (insertError) {
      setError(
        insertError.code === "42703" || insertError.code === "PGRST204"
          ? "Exécutez la migration 028 dans Supabase avant l'enregistrement des plants."
          : `Enregistrement impossible : ${insertError.message}`,
      )
      setSaving(false)
      return
    }
    try {
      await ensureInCollection()
    } catch {
      // Les plants sont créés ; la collection se rattrapera au prochain ajout.
    }
    onDone({ placed: placementCount(input), zoneName: selected?.name ?? null })
  }

  const noZones = !loading && !loadError && zones.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-dialog-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-border bg-background shadow-xl sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <h2 id="place-dialog-title" className="font-serif text-lg text-foreground">Où placer cette plante ?</h2>
            <p className="truncate text-sm text-muted-foreground">{source.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {loading ? <p className="text-sm text-muted-foreground">Chargement de vos serres et parcelles…</p> : null}
          {loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : null}

          {noZones ? (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez encore créé aucune serre ni parcelle. Créez-en une dans « Serres &amp; Parcelles » pour y placer cette plante,
              ou ajoutez-la simplement à votre collection.
            </p>
          ) : null}

          {!loading && !loadError && zones.length > 0 ? (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Serre ou parcelle</legend>
                {ranked.map((item) => (
                  <ZoneChoice key={item.zone.key} item={item} selected={item.zone.key === selectedKey} onSelect={() => selectZone(item.zone.key)} />
                ))}
              </fieldset>

              {selected ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.kind === "serre" ? (
                    <Field label="Table" htmlFor="place-table">
                      <Select id="place-table" value={tableId} onChange={(event) => setTableId(event.target.value)}>
                        <option value="">-- Choisir --</option>
                        {selected.tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}
                      </Select>
                    </Field>
                  ) : null}
                  <Field label="Implantation" htmlFor="place-location">
                    <Select id="place-location" value={locationType} onChange={(event) => setLocationType(event.target.value as LocationType)}>
                      <option value="pot">Pot · terreau</option>
                      <option value="pleine_terre">Pleine terre</option>
                    </Select>
                  </Field>
                  {locationType === "pleine_terre" ? (
                    <Field label="Type de sol" htmlFor="place-soil">
                      <Select id="place-soil" value={soilType} onChange={(event) => setSoilType(event.target.value)}>
                        <option value="">Non précisé</option>
                        {Object.entries(SOIL_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </Select>
                    </Field>
                  ) : null}
                  {source.kind === "catalogue" ? (
                    <Field label={locationType === "pot" ? "Nombre de pots" : "Nombre de plants"} htmlFor="place-count">
                      <Input id="place-count" type="number" min={1} max={500} value={count} onChange={(event) => setCount(event.target.value)} />
                    </Field>
                  ) : null}
                  <Field label="Date de mise en place" htmlFor="place-date" hint="Pas de date future.">
                    <Input id="place-date" type="date" max={today()} value={plantedAt} onChange={(event) => setPlantedAt(event.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Note initiale" htmlFor="place-notes">
                      <Input id="place-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observation à l'installation (facultatif)" />
                    </Field>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
          {!alreadyInCollection ? (
            <Button variant="ghost" size="sm" onClick={addWithoutPlacing} disabled={saving || loading}>
              Ajouter sans placer
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Annuler</Button>
          {zones.length > 0 ? (
            <Button size="sm" onClick={place} disabled={saving || loading || !selected} className="gap-1.5">
              {saving ? "Enregistrement…" : alreadyInCollection ? "Placer" : "Ajouter et placer"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ZoneChoice({ item, selected, onSelect }: { item: RankedZone; selected: boolean; onSelect: () => void }) {
  const { zone, plantCount, sameCount, reasons } = item
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={
        selected
          ? "flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3 text-left"
          : "flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 hover:bg-muted"
      }
    >
      {zone.kind === "serre" ? <Warehouse className="size-4 shrink-0 text-muted-foreground" /> : <MapPin className="size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{zone.name}</span>
        <span className="block text-xs text-muted-foreground">
          {zone.kind === "serre" ? "Serre" : "Parcelle"} · {plantCount} plant{plantCount > 1 ? "s" : ""}
          {zone.kind === "serre" ? ` · ${zone.tables.length} table${zone.tables.length > 1 ? "s" : ""}` : ""}
        </span>
      </span>
      {reasons.includes("deja_ici") ? <Badge tone="primary">Déjà {sameCount} ici</Badge> : null}
      {reasons.includes("derniere_utilisee") ? <Badge tone="neutral">Dernière utilisée</Badge> : null}
      {selected ? <Check className="size-4 shrink-0 text-primary" /> : null}
    </button>
  )
}
