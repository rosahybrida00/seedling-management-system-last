"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, Plus, Upload, Download, Trash2, Flower2, SlidersHorizontal, Pencil, BookmarkPlus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"
import { supabase } from "@/lib/supabase-client"
import { Card, Badge, EmptyState, Field, Input } from "@/components/breeding/ui"
import { CatalogFilterModal } from "@/components/breeding/catalog-filter-modal"
import { VarietyEditModal } from "@/components/breeding/variety-edit-modal"
import { CatalogOptionsMenu } from "@/components/breeding/options-menu"
import { PlaceInZoneDialog, type PlacementResult } from "@/components/breeding/parcelle/place-in-zone-dialog"
import { detectTraitsFromDescription, resolveTrait } from "@/lib/domain/description-traits"

// Catalogue GÉNÉRAL Rosa Hybrida — table `varieties` (~1059 variétés, scrapées depuis
// l'app Flutter). Aucun rapport avec le futur catalogue des semis nés en serre.
// Interface alignée sur les colonnes réelles de la table Supabase.
export interface VarietyRecord {
  id: string
  name: string
  commercial_name?: string | null
  registration_name?: string | null
  obtenteur?: string | null
  type?: string | null
  color?: string | null
  flowering?: string | null
  fragrance?: string | null
  parents?: string | null
  description?: string | null
  photo_url?: string | null
  image_url?: string | null
  adr_label?: boolean | null
  created_by?: string | null
  created_at?: string
}

// Nombre de lignes récupérées par page lors de la pagination (limite serveur PostgREST).
const PAGE_SIZE = 1000

export default function CatalogPage() {
  return (
    <AppShell>
      <CatalogPageContent />
    </AppShell>
  )
}

function CatalogPageContent() {
  const [varieties, setVarieties] = useState<VarietyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [colorFilters, setColorFilters] = useState<string[]>([])
  const [editingVariety, setEditingVariety] = useState<VarietyRecord | null>(null)
  const [collectionIds, setCollectionIds] = useState<Set<string>>(new Set())
  // Nombre de plants en place par variété (serres et parcelles).
  const [placedCounts, setPlacedCounts] = useState<Map<string, number>>(new Map())
  const [placing, setPlacing] = useState<VarietyRecord | null>(null)
  const [placementNotice, setPlacementNotice] = useState<string | null>(null)
  const [newVariety, setNewVariety] = useState({
    name: "",
    commercial_name: "",
    registration_name: "",
    obtenteur: "",
    type: "",
    color: "",
    flowering: "",
    fragrance: "",
    parents: "",
    description: "",
    adr_label: false,
  })

  useEffect(() => {
    fetchVarieties()
    refreshCollection()
  }, [])

  async function refreshCollection() {
    const [{ data: collection }, { data: plantings }] = await Promise.all([
      supabase.from("catalog_collection").select("variety_id"),
      supabase.from("field_plantings").select("variety_id").is("removed_at", null).not("variety_id", "is", null),
    ])
    setCollectionIds(new Set((collection ?? []).map((row) => row.variety_id).filter(Boolean) as string[]))
    const counts = new Map<string, number>()
    for (const row of plantings ?? []) {
      const id = row.variety_id as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    setPlacedCounts(counts)
  }

  useEffect(() => {
    if (!placementNotice) return
    const timer = setTimeout(() => setPlacementNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [placementNotice])

  function handlePlacementDone(result: PlacementResult) {
    setPlacing(null)
    setPlacementNotice(
      result.placed > 0
        ? `${result.placed} plant${result.placed > 1 ? "s" : ""} placé${result.placed > 1 ? "s" : ""} dans ${result.zoneName}.`
        : "Ajoutée à votre collection.",
    )
    void refreshCollection()
  }

  // Retirer de la collection n'est proposé que pour une variété sans plant en place.
  async function removeFromCollection(varietyId: string) {
    await supabase.from("catalog_collection").delete().eq("variety_id", varietyId)
    setCollectionIds((current) => { const next = new Set(current); next.delete(varietyId); return next })
  }

  async function fetchVarieties() {
    setLoading(true)

    // Requête directe sur la table `varieties` (plus de RPC search_varieties, qui
    // n'existe pas côté base). On pagine par blocs de 1000 lignes tant qu'il en
    // revient, pour ne jamais être bridé par la limite par défaut de PostgREST
    // (le catalogue doit pouvoir dépasser très largement les 1059 lignes actuelles).
    const all: VarietyRecord[] = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from("varieties")
        .select("*")
        .order("name", { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        console.error("Erreur lors du chargement du catalogue :", error)
        break
      }
      if (!data || data.length === 0) break

      all.push(...(data as VarietyRecord[]))
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    setVarieties(all)
    setLoading(false)
  }

  const availableTypes = useMemo(() => {
    const set = new Set<string>()
    varieties.forEach((v) => { if (v.type) set.add(v.type) })
    return Array.from(set).sort()
  }, [varieties])

  const availableColors = useMemo(() => {
    const set = new Set<string>()
    varieties.forEach((v) => { if (v.color) set.add(v.color) })
    return Array.from(set).sort()
  }, [varieties])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return varieties.filter((v) => {
      if (q) {
        const haystack = `${v.name ?? ""} ${v.commercial_name ?? ""} ${v.registration_name ?? ""} ${v.obtenteur ?? ""} ${v.type ?? ""} ${v.parents ?? ""} ${v.description ?? ""}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (typeFilters.length && !typeFilters.includes(v.type ?? "")) return false
      if (colorFilters.length && !colorFilters.includes(v.color ?? "")) return false
      return true
    })
  }, [varieties, query, typeFilters, colorFilters])

  const activeFilterCount = typeFilters.length + colorFilters.length

  async function handleAdd() {
    if (!newVariety.name.trim()) return
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from("varieties").insert({
      name: newVariety.name.trim(),
      commercial_name: newVariety.commercial_name || null,
      registration_name: newVariety.registration_name || null,
      obtenteur: newVariety.obtenteur || null,
      type: newVariety.type || null,
      color: newVariety.color || null,
      flowering: newVariety.flowering || null,
      fragrance: newVariety.fragrance || null,
      parents: newVariety.parents || null,
      description: newVariety.description || null,
      adr_label: newVariety.adr_label,
      created_by: userData.user?.id ?? null,
    })
    if (!error) {
      setNewVariety({
        name: "",
        commercial_name: "",
        registration_name: "",
        obtenteur: "",
        type: "",
        color: "",
        flowering: "",
        fragrance: "",
        parents: "",
        description: "",
        adr_label: false,
      })
      setShowAddForm(false)
      fetchVarieties()
    } else {
      console.error("Erreur lors de l'ajout :", error)
    }
  }

  async function handleExport() {
    const csv = [
      "Nom,Nom Commercial,Dénomination,Obtenteur,Type,Couleur,Floraison,Parfum,Parents,ADR,Description",
      ...filtered.map((v) =>
        [
          `"${v.name ?? ""}"`,
          `"${v.commercial_name ?? ""}"`,
          `"${v.registration_name ?? ""}"`,
          `"${v.obtenteur ?? ""}"`,
          `"${v.type ?? ""}"`,
          `"${v.color ?? ""}"`,
          `"${v.flowering ?? ""}"`,
          `"${v.fragrance ?? ""}"`,
          `"${v.parents ?? ""}"`,
          `"${v.adr_label ? "Oui" : "Non"}"`,
          `"${v.description ?? ""}"`,
        ].join(","),
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "catalogue-rosiers.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteAll() {
    if (!confirm("Supprimer toutes vos variétés du catalogue ?")) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase.from("varieties").delete().eq("created_by", userData.user.id)
    fetchVarieties()
  }

  async function handleDeleteOne(variety: VarietyRecord) {
    if (!confirm(`Supprimer « ${variety.name} » du catalogue ? Cette action est irréversible.`)) return
    const { error } = await supabase.from("varieties").delete().eq("id", variety.id)
    if (error) {
      console.error("Erreur lors de la suppression :", error)
      alert(`Suppression impossible : ${error.message}`)
      return
    }
    setVarieties((prev) => prev.filter((v) => v.id !== variety.id))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Catalogue des Rosiers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filtered.length} variété{filtered.length > 1 ? "s" : ""} — recherchez par nom, obtenteur, type ou parentage.
          </p>
        </div>
      </div>

      <div className="mb-1 flex gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom, obtenteur, type...)"
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="relative shrink-0"
          aria-label="Filtres"
          onClick={() => setShowFilters(true)}
        >
          <SlidersHorizontal className="size-4" />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
        <CatalogOptionsMenu
          onAdd={() => setShowAddForm((v) => !v)}
          onImport={() => {}}
          onExport={handleExport}
          onDeleteAll={handleDeleteAll}
        />
      </div>

        {showAddForm ? (
          <Card className="mb-5 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nom de la variété" htmlFor="r-name">
                <Input
                  id="r-name"
                  value={newVariety.name}
                  onChange={(e) => setNewVariety({ ...newVariety, name: e.target.value })}
                  placeholder="Rosa gallica 'Officinalis'"
                />
              </Field>
              <Field label="Nom commercial" htmlFor="r-comm">
                <Input
                  id="r-comm"
                  value={newVariety.commercial_name}
                  onChange={(e) => setNewVariety({ ...newVariety, commercial_name: e.target.value })}
                  placeholder="Apothecary's Rose"
                />
              </Field>
              <Field label="Dénomination enregistrée" htmlFor="r-reg">
                <Input
                  id="r-reg"
                  value={newVariety.registration_name}
                  onChange={(e) => setNewVariety({ ...newVariety, registration_name: e.target.value })}
                  placeholder="OFFICINALIS"
                />
              </Field>
              <Field label="Obtenteur" htmlFor="r-obt">
                <Input
                  id="r-obt"
                  value={newVariety.obtenteur}
                  onChange={(e) => setNewVariety({ ...newVariety, obtenteur: e.target.value })}
                  placeholder="Mme Hardy, 1832"
                />
              </Field>
              <Field label="Type" htmlFor="r-type">
                <Input
                  id="r-type"
                  value={newVariety.type}
                  onChange={(e) => setNewVariety({ ...newVariety, type: e.target.value })}
                  placeholder="Hybride de thé"
                />
              </Field>
              <Field label="Couleur" htmlFor="r-color">
                <Input
                  id="r-color"
                  value={newVariety.color}
                  onChange={(e) => setNewVariety({ ...newVariety, color: e.target.value })}
                  placeholder="Rouge pourpre"
                />
              </Field>
              <Field label="Parentage" htmlFor="r-parent">
                <Input
                  id="r-parent"
                  value={newVariety.parents}
                  onChange={(e) => setNewVariety({ ...newVariety, parents: e.target.value })}
                  placeholder="Rosa gallica × Rosa moschata"
                />
              </Field>
              <Field label="Floraison" htmlFor="r-flow">
                <Input
                  id="r-flow"
                  value={newVariety.flowering}
                  onChange={(e) => setNewVariety({ ...newVariety, flowering: e.target.value })}
                  placeholder="Remontante"
                />
              </Field>
              <Field label="Parfum" htmlFor="r-frag">
                <Input
                  id="r-frag"
                  value={newVariety.fragrance}
                  onChange={(e) => setNewVariety({ ...newVariety, fragrance: e.target.value })}
                  placeholder="Intense"
                />
              </Field>
              <Field label="Description" htmlFor="r-desc">
                <Input
                  id="r-desc"
                  value={newVariety.description}
                  onChange={(e) => setNewVariety({ ...newVariety, description: e.target.value })}
                  placeholder="Rose très parfumée..."
                />
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={newVariety.adr_label}
                onChange={(e) => setNewVariety({ ...newVariety, adr_label: e.target.checked })}
                className="size-4 rounded border-input accent-accent"
              />
              Label ADR
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={!newVariety.name.trim()}>Ajouter au catalogue</Button>
            </div>
          </Card>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Flower2 className="size-8 animate-pulse text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Flower2 className="size-8" />}
            title="Aucun rosier trouvé"
            description="Ajoutez votre première variété au catalogue ou modifiez vos critères de recherche."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((variety) => (
              <VarietyCard
                key={variety.id}
                variety={variety}
                onEdit={setEditingVariety}
                onDelete={handleDeleteOne}
                inCollection={collectionIds.has(variety.id)}
                placedCount={placedCounts.get(variety.id) ?? 0}
                onPlace={() => setPlacing(variety)}
                onRemoveFromCollection={() => removeFromCollection(variety.id)}
              />
            ))}
          </div>
        )}

      {placementNotice ? (
        <p role="status" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {placementNotice}
          <button type="button" onClick={() => setPlacementNotice(null)} className="ml-3 underline" aria-label="Fermer la notification">OK</button>
        </p>
      ) : null}

      {placing ? (
        <PlaceInZoneDialog
          source={{ kind: "catalogue", id: placing.id, name: placing.commercial_name || placing.name }}
          alreadyInCollection={collectionIds.has(placing.id)}
          onClose={() => setPlacing(null)}
          onDone={handlePlacementDone}
        />
      ) : null}

      <CatalogFilterModal
        open={showFilters}
        onClose={() => setShowFilters(false)}
        availableTypes={availableTypes}
        availableColors={availableColors}
        selectedTypes={typeFilters}
        selectedColors={colorFilters}
        onApply={(types, colors) => {
          setTypeFilters(types)
          setColorFilters(colors)
          setShowFilters(false)
        }}
      />

      <VarietyEditModal
        variety={editingVariety}
        onClose={() => setEditingVariety(null)}
        onSaved={(updated) => {
          setVarieties((prev) => prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)))
          setEditingVariety(null)
        }}
        onDeleted={(id) => {
          setVarieties((prev) => prev.filter((v) => v.id !== id))
          setEditingVariety(null)
        }}
      />
    </div>
  )
}

function VarietyCard({
  variety,
  onEdit,
  onDelete,
  inCollection,
  placedCount,
  onPlace,
  onRemoveFromCollection,
}: {
  variety: VarietyRecord
  onEdit: (variety: VarietyRecord) => void
  onDelete: (variety: VarietyRecord) => void
  inCollection: boolean
  placedCount: number
  onPlace: () => void
  onRemoveFromCollection: () => void
}) {
  const photo = variety.photo_url ?? variety.image_url ?? null
  const detected = useMemo(() => detectTraitsFromDescription(variety.description), [variety.description])
  const flowering = resolveTrait(variety.flowering, detected.flowering)
  const fragrance = resolveTrait(variety.fragrance, detected.fragrance)
  const height = resolveTrait(null, detected.height)

  return (
    <div className="group relative">
      <Link href={`/rose/${variety.id}`} className="block focus-visible:outline-none">
        <Card className="overflow-hidden transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/40 cursor-pointer">
          <div className="relative aspect-[4/3] bg-muted">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={variety.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-primary/5">
                <Flower2 className="size-10 text-primary/30" />
              </div>
            )}
            {variety.adr_label ? (
              <div className="absolute top-2 right-2">
                <Badge tone="accent">ADR</Badge>
              </div>
            ) : null}
          </div>
          <div className="p-3">
            <h3 className="font-serif text-base leading-tight text-foreground">{variety.name}</h3>
            {variety.commercial_name && variety.commercial_name !== variety.name ? (
              <p className="text-xs text-muted-foreground font-medium">{variety.commercial_name}</p>
            ) : null}
            {variety.obtenteur ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{variety.obtenteur}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {variety.type ? <Badge tone="neutral">{variety.type}</Badge> : null}
              {variety.color ? <Badge tone="primary">{variety.color}</Badge> : null}
              {flowering.value ? (
                <Badge tone={flowering.isDetected ? "warning" : "neutral"}>
                  {flowering.value}
                  {flowering.isDetected ? " · détecté" : ""}
                </Badge>
              ) : null}
              {fragrance.value ? (
                <Badge tone={fragrance.isDetected ? "warning" : "neutral"}>
                  {fragrance.value}
                  {fragrance.isDetected ? " · détecté" : ""}
                </Badge>
              ) : null}
              {height.value ? <Badge tone="warning">Hauteur ~{height.value} · détecté</Badge> : null}
            </div>
            {variety.parents ? (
              <p className="mt-2 text-xs text-muted-foreground italic">{variety.parents}</p>
            ) : null}
            {variety.description ? (
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{variety.description}</p>
            ) : null}
          </div>
        </Card>
      </Link>

      <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
        {inCollection && placedCount === 0 ? (
          <button
            type="button"
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); onRemoveFromCollection() }}
            className="inline-flex items-center rounded-md bg-background/95 px-2 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-background hover:text-foreground"
            aria-label={`Retirer ${variety.name} de ma collection`}
          >
            Retirer
          </button>
        ) : null}
        <button
          type="button"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); onPlace() }}
          className="inline-flex items-center gap-1.5 rounded-md bg-background/95 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-background"
          aria-label={
            placedCount > 0
              ? `Ajouter un plant de ${variety.name} dans une serre ou une parcelle`
              : inCollection
                ? `Placer ${variety.name} dans une serre ou une parcelle`
                : `Ajouter ${variety.name} à ma collection`
          }
        >
          {placedCount > 0 ? <Check data-icon="inline-start" /> : <BookmarkPlus data-icon="inline-start" />}
          {placedCount > 0
            ? `Placée · ${placedCount} plant${placedCount > 1 ? "s" : ""} · ajouter`
            : inCollection
              ? "Dans ma collection · placer"
              : "Ajouter à ma collection"}
        </button>
      </div>

      <div className="absolute left-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEdit(variety)
          }}
          aria-label={`Modifier ${variety.name}`}
          className="flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(variety)
          }}
          aria-label={`Supprimer ${variety.name}`}
          className="flex size-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm hover:bg-background"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
