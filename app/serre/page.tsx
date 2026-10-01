"use client"

import { useEffect, useState, useMemo } from "react"
import { Search, Download, Trash2, Sprout, Leaf, Warehouse, Table2, Pencil, Check, X, FileText, ArrowUpCircle, BookmarkPlus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"
import { supabase } from "@/lib/supabase-client"
import { Card, Badge, EmptyState, Field, Input, Select, SectionHeading, Textarea } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import {
  PHENOTYPE_LABELS,
  PRESSION_SANITAIRE_LABELS,
  TRAITEMENT_LABELS,
  MOTIF_ELIMINATION_LABELS,
  CRITERE_SELECTION_LABELS,
} from "@/lib/domain/supabase-types"
import type { Seedling } from "@/lib/domain/supabase-types"
import { FieldObservatory } from "@/components/breeding/field-observatory"
import { SeedLotTracking } from "@/components/breeding/serre/seed-lot-tracking"

// ---------------------------------------------------------------------------
// Un semis (seedling) porte désormais directement `cross_id`, `fruit_code`,
// `seed_code` et `table_id` : il n'a plus besoin d'un lot de semis
// (sowing_batches) pour savoir d'où il vient ni où il est planté. Le lot
// reste néanmoins affiché quand il existe (date de semis, nombre de graines
// d'origine, taux de levée), à titre d'information complémentaire — jamais
// comme condition pour afficher ou éditer un semis.
// ---------------------------------------------------------------------------

interface Greenhouse {
  id: string
  name: string
}

interface GreenhouseTable {
  id: string
  greenhouse_id: string
  name: string
}

interface SowingBatch {
  id: string
  cross_id: string
  fruit_code: string | null
  sowing_date: string | null
  harvest_date: string | null
  seed_count: number
  original_seed_count: number | null
  sprouted_count: number | null
  table_id: string | null
  notes: string | null
  substrate: string | null
  stratification: string | null
  stratification_days: number | null
  stratification_methods: string[] | null
  stratification_start_date: string | null
  stratification_end_date: string | null
}

interface CrossInfo {
  id: string
  seed_parent: string | null
  pollen_parent: string | null
  base_syllable: string | null
}

// Statut d'évaluation N2 (remplace l'ancien `status` observing/discarded/selected
// à l'affichage — les deux champs restent synchronisés pour compatibilité).
const EVALUATION_STATUS_LABELS: Record<string, string> = {
  "Évaluation": "En évaluation",
  "Sélectionné": "Sélectionné",
  "Éliminé": "Éliminé",
}

const EVALUATION_STATUS_TONES: Record<string, "neutral" | "primary" | "warning" | "danger"> = {
  "Évaluation": "warning",
  "Sélectionné": "primary",
  "Éliminé": "danger",
}

// Correspondance avec l'ancien champ `status`, conservé pour ne pas casser
// les filtres/exports existants pendant la transition.
const EVALUATION_TO_LEGACY_STATUS: Record<string, Seedling["status"]> = {
  "Évaluation": "observing",
  "Sélectionné": "selected",
  "Éliminé": "discarded",
}

function legacyStatusToEvaluation(status: Seedling["status"]): string {
  if (status === "selected") return "Sélectionné"
  if (status === "discarded") return "Éliminé"
  return "Évaluation"
}

export default function SerrePage() {
  return (
    <AppShell>
      <SerreContent />
    </AppShell>
  )
}

function SerreContent() {
  const [seedlings, setSeedlings] = useState<Seedling[]>([])
  const [batches, setBatches] = useState<SowingBatch[]>([])
  const [crosses, setCrosses] = useState<CrossInfo[]>([])
  const [tables, setTables] = useState<GreenhouseTable[]>([])
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [greenhouseFilter, setGreenhouseFilter] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set())
  const [newGreenhouseName, setNewGreenhouseName] = useState("")
  const [greenhouseError, setGreenhouseError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [seed, bat, cr, tbl, gh] = await Promise.all([
      supabase.from("seedlings").select("*").order("code"),
      supabase.from("sowing_batches").select("*").order("sowing_date", { ascending: false }),
      supabase.from("crosses").select("id, seed_parent, pollen_parent, base_syllable"),
      supabase.from("greenhouse_tables").select("id, greenhouse_id, name").order("name"),
      supabase.from("greenhouses").select("id, name").order("name"),
    ])
    if (seed.data) setSeedlings(seed.data as Seedling[])
    if (bat.data) setBatches(bat.data as SowingBatch[])
    if (cr.data) setCrosses(cr.data as CrossInfo[])
    if (tbl.data) setTables(tbl.data as GreenhouseTable[])
    if (gh.data) setGreenhouses(gh.data as Greenhouse[])
    const { data: collection } = await supabase.from("catalog_collection").select("seedling_id")
    setCollectionIds(new Set((collection ?? []).map((row) => row.seedling_id).filter(Boolean) as string[]))
    setLoading(false)
  }

  async function toggleCollection(seedlingId: string) {
    if (collectionIds.has(seedlingId)) {
      await supabase.from("catalog_collection").delete().eq("seedling_id", seedlingId)
      setCollectionIds((current) => { const next = new Set(current); next.delete(seedlingId); return next })
    } else {
      const { error } = await supabase.from("catalog_collection").insert({ seedling_id: seedlingId })
      if (!error) setCollectionIds((current) => new Set(current).add(seedlingId))
    }
  }

  // Un lot de semis (sowing_batches) est retrouvé par couple/fruit plutôt
  // que par un identifiant que le semis ne porte plus obligatoirement.
  const batchByFruit = useMemo(() => {
    const m = new Map<string, SowingBatch>()
    batches.forEach((b) => { if (b.cross_id && b.fruit_code) m.set(`${b.cross_id}|${b.fruit_code}`, b) })
    return m
  }, [batches])

  const batchById = useMemo(() => {
    const m = new Map<string, SowingBatch>()
    batches.forEach((b) => m.set(b.id, b))
    return m
  }, [batches])

  const crossMap = useMemo(() => {
    const m = new Map<string, CrossInfo>()
    crosses.forEach((c) => m.set(c.id, c))
    return m
  }, [crosses])

  const tableMap = useMemo(() => {
    const m = new Map<string, GreenhouseTable>()
    tables.forEach((t) => m.set(t.id, t))
    return m
  }, [tables])

  const greenhouseMap = useMemo(() => {
    const m = new Map<string, Greenhouse>()
    greenhouses.forEach((g) => m.set(g.id, g))
    return m
  }, [greenhouses])

  function batchOf(s: Seedling): SowingBatch | null {
    if (s.cross_id && s.fruit_code) {
      const byFruit = batchByFruit.get(`${s.cross_id}|${s.fruit_code}`)
      if (byFruit) return byFruit
    }
    return s.batch_id ? batchById.get(s.batch_id) ?? null : null
  }

  function tableOf(s: Seedling): GreenhouseTable | null {
    const directId = s.table_id ?? batchOf(s)?.table_id ?? null
    return directId ? tableMap.get(directId) ?? null : null
  }

  function seedlingGreenhouseId(s: Seedling): string | null {
    const tbl = tableOf(s)
    return tbl ? tbl.greenhouse_id : null
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return seedlings.filter((s) => {
      if (q) {
        const cross = crossMap.get(s.cross_id)
        const haystack = `${s.seedling_code ?? ""} ${s.seed_code ?? ""} ${s.code} ${s.fruit_code ?? ""} ${s.remarks ?? ""} ${s.free_notes ?? ""} ${cross?.seed_parent ?? ""} ${cross?.pollen_parent ?? ""}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (statusFilter && (s.evaluation_status ?? legacyStatusToEvaluation(s.status)) !== statusFilter) return false
      if (greenhouseFilter && seedlingGreenhouseId(s) !== greenhouseFilter) return false
      return true
    })
  }, [seedlings, query, statusFilter, greenhouseFilter, crossMap, batchByFruit, batchById, tableMap])

  async function createGreenhouse() {
    const name = newGreenhouseName.trim()
    if (!name) return
    setGreenhouseError(null)
    const { error } = await supabase.from("greenhouses").insert({ name })
    if (error) {
      setGreenhouseError(`Enregistrement impossible : ${error.message}`)
      return
    }
    setNewGreenhouseName("")
    await fetchData()
  }

  async function updateSeedling(s: Seedling, changes: Partial<Seedling>) {
    await supabase.from("seedlings").update(changes).eq("id", s.id)
    fetchData()
  }

  async function deleteSeedling(id: string) {
    if (!confirm("Supprimer ce semis ?")) return
    await supabase.from("seedlings").delete().eq("id", id)
    fetchData()
  }

  async function promoteToVariety(s: Seedling) {
    if (!confirm("Promouvoir ce semis vers le Catalogue Général ? Une nouvelle fiche variété sera créée ; le semis reste par ailleurs inchangé dans le Catalogue des Semis.")) return

    const { data: userData } = await supabase.auth.getUser()
    let obtenteur: string | null = null
    if (userData.user) {
      const { data: profile } = await supabase.from("profiles").select("obtenteur_name").eq("id", userData.user.id).maybeSingle()
      obtenteur = (profile as { obtenteur_name: string | null } | null)?.obtenteur_name ?? null
    }

    const label = s.seedling_code ?? s.seed_code ?? s.code
    const { error } = await supabase.from("varieties").insert({
      name: label,
      obtenteur,
      description: s.auto_report ?? null,
      created_by: userData.user?.id ?? null,
    })

    if (error) {
      alert(`Promotion impossible : ${error.message}`)
      return
    }

    await supabase.from("seedlings").update({ is_promoted_to_variety: true }).eq("id", s.id)
    fetchData()
  }

  async function handleExport() {
    const csv = [
      "Code définitif,Statut,Croisement,Lot,Date semis,Graines,Serre,Table,Phénotype,Pression sanitaire,Traitement,Motif élimination,Critère sélection,Synthèse automatique,Notes libres,Promu",
      ...filtered.map((s) => {
        const cross = crossMap.get(s.cross_id)
        const batch = batchOf(s)
        const tbl = tableOf(s)
        const gh = tbl ? greenhouseMap.get(tbl.greenhouse_id) : null
        return [
          `"${s.seedling_code ?? s.seed_code ?? s.code}"`,
          `"${EVALUATION_STATUS_LABELS[s.evaluation_status ?? ""] ?? s.evaluation_status ?? ""}"`,
          `"${cross ? `${cross.seed_parent ?? "?"} × ${cross.pollen_parent ?? "?"}` : ""}"`,
          `"${s.fruit_code ?? batch?.fruit_code ?? ""}"`,
          `"${batch?.sowing_date ? formatDate(batch.sowing_date) : ""}"`,
          `"${batch?.seed_count ?? ""}"`,
          `"${gh?.name ?? ""}"`,
          `"${tbl?.name ?? ""}"`,
          `"${PHENOTYPE_LABELS[s.phenotype_vigueur ?? ""] ?? ""}"`,
          `"${PRESSION_SANITAIRE_LABELS[s.pression_sanitaire ?? ""] ?? ""}"`,
          `"${TRAITEMENT_LABELS[s.traitement ?? ""] ?? ""}"`,
          `"${MOTIF_ELIMINATION_LABELS[s.motif_elimination ?? ""] ?? ""}"`,
          `"${CRITERE_SELECTION_LABELS[s.critere_selection ?? ""] ?? ""}"`,
          `"${s.auto_report ?? ""}"`,
          `"${s.free_notes ?? ""}"`,
          `"${s.is_promoted_to_variety ? "Oui" : "Non"}"`,
        ].join(",")
      }),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "catalogue-semis.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5">
      <FieldObservatory />
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="Nouvelle serre" htmlFor="new-greenhouse-name">
          <Input
            id="new-greenhouse-name"
            value={newGreenhouseName}
            onChange={(e) => setNewGreenhouseName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) createGreenhouse()
            }}
            placeholder="Serre nord"
            className="w-64"
          />
        </Field>
        <Button onClick={createGreenhouse} disabled={!newGreenhouseName.trim()} className="gap-1.5">
          <Plus className="size-4" data-icon="inline-start" /> Ajouter la serre
        </Button>
        {greenhouseError ? <p className="basis-full text-sm text-destructive">{greenhouseError}</p> : null}
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {greenhouses.map((greenhouse) => {
          const plantCount = seedlings.filter((seedling) => seedlingGreenhouseId(seedling) === greenhouse.id).length
          return (
            <Card key={greenhouse.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Warehouse className="size-5" />
                </span>
                <div>
                  <h2 className="font-serif text-lg text-foreground">{greenhouse.name}</h2>
                  <p className="text-sm text-muted-foreground">{plantCount} plant(s) · {tables.filter((table) => table.greenhouse_id === greenhouse.id).length} table(s)</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
      <SeedLotTracking batches={batches} crossMap={crossMap} onRefresh={fetchData} />

      <SectionHeading
        title="Catalogue des Semis"
        description="Évaluation des individus issus des graines récoltées : phénotype, pression sanitaire, sélection et synthèse automatique. Indépendant du Catalogue Général."
        action={
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="size-4" /> Exporter
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par code, croisement, notes…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48">
          <option value="">Tous statuts</option>
          <option value="Évaluation">En évaluation</option>
          <option value="Sélectionné">Sélectionné</option>
          <option value="Éliminé">Éliminé</option>
        </Select>
        <Select value={greenhouseFilter} onChange={(e) => setGreenhouseFilter(e.target.value)} className="w-44">
          <option value="">Toutes serres</option>
          {greenhouses.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Sprout className="size-8 animate-pulse text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Sprout className="size-8" />}
          title="Aucun semis trouvé"
          description="Les semis apparaissent ici automatiquement dès qu'un fruit est récolté sur la page Croisement."
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((s) => {
            const cross = crossMap.get(s.cross_id) ?? null
            const batch = batchOf(s)
            const tbl = tableOf(s)
            const gh = tbl ? greenhouseMap.get(tbl.greenhouse_id) ?? null : null
            return (
              <SeedlingCard
                key={s.id}
                seedling={s}
                cross={cross}
                batch={batch}
                table={tbl}
                greenhouse={gh}
                isEditing={editingId === s.id}
                onEdit={() => setEditingId(s.id)}
                onCancel={() => setEditingId(null)}
                onSave={(changes) => updateSeedling(s, changes)}
                onDelete={() => deleteSeedling(s.id)}
                onPromote={() => promoteToVariety(s)}
                inCollection={collectionIds.has(s.id)}
                onToggleCollection={() => toggleCollection(s.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function SeedlingCard({
  seedling,
  cross,
  batch,
  table,
  greenhouse,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onPromote,
  inCollection,
  onToggleCollection,
}: {
  seedling: Seedling
  cross: CrossInfo | null
  batch: SowingBatch | null
  table: GreenhouseTable | null
  greenhouse: Greenhouse | null
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (changes: Partial<Seedling>) => void
  onDelete: () => void
  onPromote: () => void
  inCollection: boolean
  onToggleCollection: () => void
}) {
  const currentEvaluationStatus = seedling.evaluation_status ?? legacyStatusToEvaluation(seedling.status)

  const [draft, setDraft] = useState({
    evaluation_status: currentEvaluationStatus,
    phenotype_vigueur: seedling.phenotype_vigueur ?? "",
    pression_sanitaire: seedling.pression_sanitaire ?? "",
    traitement: seedling.traitement ?? "",
    motif_elimination: seedling.motif_elimination ?? "",
    critere_selection: seedling.critere_selection ?? "",
    remarks: seedling.remarks,
    free_notes: seedling.free_notes ?? "",
    automatic_synthesis: seedling.auto_report ?? "",
  })

  const displayCode = seedling.seedling_code ?? seedling.seed_code ?? seedling.code
  const fruitLabel = seedling.fruit_code ?? batch?.fruit_code ?? null

  function generateSynthesis(): string {
    const parts: string[] = []
    parts.push(`Semis ${displayCode}`)
    if (cross) parts.push(`(${cross.seed_parent ?? "?"} × ${cross.pollen_parent ?? "?"}${fruitLabel ? `, fruit ${fruitLabel}` : ""})`)
    parts.push(":")
    if (draft.phenotype_vigueur) parts.push(`Sujet présentant ${PHENOTYPE_LABELS[draft.phenotype_vigueur]?.toLowerCase() ?? draft.phenotype_vigueur}.`)
    if (draft.pression_sanitaire) parts.push(`Présence de ${PRESSION_SANITAIRE_LABELS[draft.pression_sanitaire]?.toLowerCase() ?? draft.pression_sanitaire} constatée.`)
    if (draft.traitement) parts.push(`Traitement appliqué : ${TRAITEMENT_LABELS[draft.traitement]?.toLowerCase() ?? draft.traitement}.`)
    if (draft.evaluation_status === "Éliminé" && draft.motif_elimination) parts.push(`Motif d'élimination : ${MOTIF_ELIMINATION_LABELS[draft.motif_elimination]?.toLowerCase() ?? draft.motif_elimination}.`)
    if (draft.evaluation_status === "Sélectionné" && draft.critere_selection) parts.push(`Critère de sélection : ${CRITERE_SELECTION_LABELS[draft.critere_selection]?.toLowerCase() ?? draft.critere_selection}.`)
    return parts.join(" ")
  }

  function handleSave() {
    const synthesis = draft.automatic_synthesis || generateSynthesis()
    onSave({
      evaluation_status: draft.evaluation_status as Seedling["evaluation_status"],
      status: EVALUATION_TO_LEGACY_STATUS[draft.evaluation_status] ?? "observing",
      phenotype_vigueur: draft.phenotype_vigueur || null,
      pression_sanitaire: draft.pression_sanitaire || null,
      traitement: draft.traitement || null,
      motif_elimination: draft.motif_elimination || null,
      critere_selection: draft.critere_selection || null,
      remarks: draft.remarks,
      free_notes: draft.free_notes || null,
      auto_report: synthesis,
    })
  }

  function handleGenerate() {
    setDraft({ ...draft, automatic_synthesis: generateSynthesis() })
  }

  if (isEditing) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Leaf className="size-4" />
          </span>
          <div>
            <p className="font-serif text-base text-foreground">{displayCode}</p>
            <p className="text-xs text-muted-foreground">
              {cross ? `${cross.seed_parent ?? "?"} × ${cross.pollen_parent ?? "?"}` : null}
              {fruitLabel ? ` · fruit ${fruitLabel}` : ""}
              {batch ? ` · ${batch.seed_count} graine(s)` : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Statut d'évaluation">
            <Select value={draft.evaluation_status} onChange={(e) => setDraft({ ...draft, evaluation_status: e.target.value })}>
              <option value="Évaluation">En évaluation</option>
              <option value="Sélectionné">Sélectionné</option>
              <option value="Éliminé">Éliminé</option>
            </Select>
          </Field>
          <Field label="Phénotype & Vigueur">
            <Select value={draft.phenotype_vigueur} onChange={(e) => setDraft({ ...draft, phenotype_vigueur: e.target.value })}>
              <option value="">—</option>
              {Object.entries(PHENOTYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Pression sanitaire">
            <Select value={draft.pression_sanitaire} onChange={(e) => setDraft({ ...draft, pression_sanitaire: e.target.value })}>
              <option value="">—</option>
              {Object.entries(PRESSION_SANITAIRE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Traitement & Soins">
            <Select value={draft.traitement} onChange={(e) => setDraft({ ...draft, traitement: e.target.value })}>
              <option value="">—</option>
              {Object.entries(TRAITEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          {draft.evaluation_status === "Éliminé" ? (
            <Field label="Motif d'élimination">
              <Select value={draft.motif_elimination} onChange={(e) => setDraft({ ...draft, motif_elimination: e.target.value })}>
                <option value="">—</option>
                {Object.entries(MOTIF_ELIMINATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          ) : null}
          {draft.evaluation_status === "Sélectionné" ? (
            <Field label="Critère de sélection">
              <Select value={draft.critere_selection} onChange={(e) => setDraft({ ...draft, critere_selection: e.target.value })}>
                <option value="">—</option>
                {Object.entries(CRITERE_SELECTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          ) : null}
        </div>

        <div className="mt-3">
          <Field label="Synthèse automatique" hint="Générée à partir des cases cochées. Modifiable librement.">
            <Textarea value={draft.automatic_synthesis} onChange={(e) => setDraft({ ...draft, automatic_synthesis: e.target.value })} placeholder="Cliquez sur « Générer » pour créer la synthèse automatiquement…" />
          </Field>
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-1.5">
              <FileText className="size-3.5" /> Générer la synthèse
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <Field label="Notes libres de l'hybrideur" hint="Distinct des remarques : réservé à vos observations personnelles.">
            <Textarea value={draft.free_notes} onChange={(e) => setDraft({ ...draft, free_notes: e.target.value })} placeholder="Notes libres…" />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Remarques">
            <Textarea value={draft.remarks} onChange={(e) => setDraft({ ...draft, remarks: e.target.value })} placeholder="Note contextuelle…" />
          </Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1">
            <X className="size-4" /> Annuler
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Check className="size-4" /> Enregistrer
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3 p-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Leaf className="size-4" />
        </span>
        <div className="flex-1">
          <p className="font-serif text-base leading-tight text-foreground">{displayCode}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {cross ? `${cross.seed_parent ?? "?"} × ${cross.pollen_parent ?? "?"}` : null}
            {fruitLabel ? ` · fruit ${fruitLabel}` : ""}
            {batch?.sowing_date ? ` · semé le ${formatDate(batch.sowing_date)}` : ""}
          </p>
        </div>
        <Badge tone={EVALUATION_STATUS_TONES[currentEvaluationStatus] ?? "neutral"}>
          {EVALUATION_STATUS_LABELS[currentEvaluationStatus] ?? currentEvaluationStatus}
        </Badge>
        {seedling.is_promoted_to_variety ? <Badge tone="success">Promu au catalogue général</Badge> : null}
        <Button
          size="sm"
          variant={inCollection ? "secondary" : "outline"}
          onClick={onToggleCollection}
          className="gap-1"
          aria-label={inCollection ? `Retirer ${displayCode} de ma collection` : `Ajouter ${displayCode} à ma collection`}
        >
          <BookmarkPlus className="size-3.5" /> {inCollection ? "Dans ma collection" : "Ajouter à ma collection"}
        </Button>
        <div className="flex gap-1">
          {!seedling.is_promoted_to_variety && currentEvaluationStatus === "Sélectionné" ? (
            <Button size="sm" variant="outline" onClick={onPromote} className="gap-1">
              <ArrowUpCircle className="size-3.5" /> Promouvoir
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onEdit} className="gap-1">
            <Pencil className="size-3.5" /> Évaluer
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-3 pb-2">
        {greenhouse ? <Badge tone="neutral"><Warehouse className="size-3" /> {greenhouse.name}</Badge> : null}
        {table ? <Badge tone="neutral"><Table2 className="size-3" /> {table.name}</Badge> : null}
        {seedling.phenotype_vigueur ? <Badge tone="neutral">{PHENOTYPE_LABELS[seedling.phenotype_vigueur] ?? seedling.phenotype_vigueur}</Badge> : null}
        {seedling.pression_sanitaire ? <Badge tone={seedling.pression_sanitaire === "indemne" ? "success" : "danger"}>{PRESSION_SANITAIRE_LABELS[seedling.pression_sanitaire] ?? seedling.pression_sanitaire}</Badge> : null}
        {seedling.traitement ? <Badge tone="primary">{TRAITEMENT_LABELS[seedling.traitement] ?? seedling.traitement}</Badge> : null}
        {seedling.motif_elimination ? <Badge tone="danger">{MOTIF_ELIMINATION_LABELS[seedling.motif_elimination] ?? seedling.motif_elimination}</Badge> : null}
        {seedling.critere_selection ? <Badge tone="success">{CRITERE_SELECTION_LABELS[seedling.critere_selection] ?? seedling.critere_selection}</Badge> : null}
      </div>

      {seedling.auto_report ? (
        <div className="border-t border-border bg-muted/20 p-3">
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <FileText className="mt-0.5 size-3 shrink-0" />
            <span>{seedling.auto_report}</span>
          </p>
        </div>
      ) : null}

      {seedling.free_notes ? (
        <div className="border-t border-border px-3 py-2">
          <p className="text-xs text-foreground italic">{seedling.free_notes}</p>
        </div>
      ) : null}

      {seedling.remarks ? (
        <div className="border-t border-border px-3 py-2">
          <p className="text-xs text-muted-foreground italic">{seedling.remarks}</p>
        </div>
      ) : null}
    </Card>
  )
}
