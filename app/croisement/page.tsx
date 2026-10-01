"use client"

import { useEffect, useState, useMemo } from "react"
import { Plus, Flower2, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"
import { supabase } from "@/lib/supabase-client"
import { SectionHeading, EmptyState } from "@/components/breeding/ui"
import { fromDateInput } from "@/components/breeding/format"
import { generateBaseSyllable, pairKey, lotLetter, generateLotCode, generateFruitCode, lotIndexFromLetter } from "@/lib/domain/nomenclature"
import { getWeatherForDate, type DailyWeather } from "@/lib/services/weatherService"
import { LotForm } from "@/components/breeding/croisement/lot-form"
import { CoupleFocusView } from "@/components/breeding/croisement/couple-focus-view"
import { PollenPanel } from "@/components/breeding/croisement/pollen-panel"
import type {
  Cross,
  PollenLot,
  Treatment,
  HarvestedSeed,
  PhenologyObservation,
  CrossFruit,
  VarietySuggestion,
} from "@/app/croisement/types"

// ---------------------------------------------------------------------------
// Architecture : Couple (parents) -> Lot (une pollinisation, table `crosses`)
// -> Fruit (une fleur pollinisée, table `cross_fruits`) -> Graine (table
// `harvested_seeds`). Navigation à 3 niveaux, en mode Focus : cliquer sur
// une carte l'isole à l'écran ; un bouton retour ramène à la liste. Plus de
// boutons Éditer/Supprimer visibles en permanence : l'édition se fait en
// cliquant directement sur un champ (Entrée pour valider), seule une
// icône de corbeille discrète reste pour supprimer.
//
// Les types, constantes et sous-composants de ce module sont répartis
// dans app/croisement/types.ts et components/breeding/croisement/*.
// ---------------------------------------------------------------------------

export default function CroisementPage() {
  return (
    <AppShell>
      <CroisementContent />
    </AppShell>
  )
}

function CroisementContent() {
  const [crosses, setCrosses] = useState<Cross[]>([])
  const [fruits, setFruits] = useState<CrossFruit[]>([])
  const [seeds, setSeeds] = useState<HarvestedSeed[]>([])
  const [pollenLots, setPollenLots] = useState<PollenLot[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [greenhouses, setGreenhouses] = useState<Array<{ id: string; name: string }>>([])
  const [tables, setTables] = useState<Array<{ id: string; greenhouse_id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"crosses" | "pollen">("crosses")
  const [creating, setCreating] = useState(false)
  const [addingLotFor, setAddingLotFor] = useState<{ seedParent: string; pollenParent: string } | null>(null)
  // Mode Focus : quand focusedKey est renseigné, seule cette carte de couple
  // est affichée (toutes les autres disparaissent de l'écran).
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [focusedLot, setFocusedLot] = useState<string | null>(null)

  const [form, setForm] = useState({
    seedParent: "",
    seedParentId: "",
    pollenParent: "",
    pollenParentId: "",
    pollinationDate: new Date().toISOString().split("T")[0],
    pollinatedFlowersCount: "",
    pollenType: "frais",
    pollenLotId: "",
    freshAntherQuality: "",
    freshDehiscence: "",
    pistilChecklist: [] as string[],
  })
  const [pollinationWeather, setPollinationWeather] = useState<DailyWeather | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  const [seedSuggestions, setSeedSuggestions] = useState<VarietySuggestion[]>([])
  const [pollenSuggestions, setPollenSuggestions] = useState<VarietySuggestion[]>([])
  const [showSeedSugg, setShowSeedSugg] = useState(false)
  const [showPollenSugg, setShowPollenSugg] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function searchParents(query: string) {
    const escapedQuery = query.replace(/[%,()]/g, " ").trim()
    const [{ data: varieties }, { data: seedlings }] = await Promise.all([
      supabase
        .from("varieties")
        .select("id, name, commercial_name")
        .or(`name.ilike.%${escapedQuery}%,commercial_name.ilike.%${escapedQuery}%`)
        .limit(6),
      supabase.from("seedlings").select("id, code").ilike("code", `%${escapedQuery}%`).limit(6),
    ])
    return [
      ...(varieties ?? []).map((item) => ({ ...item, source: "catalogue" as const })),
      ...(seedlings ?? []).map((item) => ({ id: item.id, name: item.code, commercial_name: "Semis", source: "semis" as const })),
    ].slice(0, 8)
  }

  useEffect(() => {
    const query = form.seedParent.trim()
    if (query.length < 1) { setSeedSuggestions([]); setShowSeedSugg(false); return }
    const timer = setTimeout(async () => { setSeedSuggestions(await searchParents(query)); setShowSeedSugg(true) }, 200)
    return () => clearTimeout(timer)
  }, [form.seedParent])

  useEffect(() => {
    const query = form.pollenParent.trim()
    if (query.length < 1) { setPollenSuggestions([]); setShowPollenSugg(false); return }
    const timer = setTimeout(async () => { setPollenSuggestions(await searchParents(query)); setShowPollenSugg(true) }, 200)
    return () => clearTimeout(timer)
  }, [form.pollenParent])

  // Météo automatique du module Météo (historique quotidien de l'appli),
  // jamais interrogée en direct depuis ce formulaire.
  useEffect(() => {
    if (!form.pollinationDate) { setPollinationWeather(null); return }
    let cancelled = false
    setWeatherLoading(true)
    getWeatherForDate(form.pollinationDate).then((w) => { if (!cancelled) { setPollinationWeather(w); setWeatherLoading(false) } })
    return () => { cancelled = true }
  }, [form.pollinationDate])

  async function fetchData() {
    setLoading(true)
    const [{ data: cData }, { data: fData }, { data: sdData }, { data: pData }, { data: tData }, { data: ghData }, { data: gtData }] = await Promise.all([
      supabase.from("crosses").select("*").order("created_at", { ascending: false }),
      supabase.from("cross_fruits").select("*").order("flower_index", { ascending: true }),
      supabase.from("harvested_seeds").select("id, fruit_id, seed_name, seed_number, greenhouse_table_id").order("seed_number"),
      supabase.from("pollen_lots").select("*").order("created_at", { ascending: false }),
      supabase.from("treatments").select("*").order("applied_at", { ascending: false }),
      supabase.from("greenhouses").select("id,name").order("name"),
      supabase.from("greenhouse_tables").select("id,greenhouse_id,name").order("name"),
    ])
    if (cData) setCrosses(cData as Cross[])
    if (fData) setFruits(fData as CrossFruit[])
    if (sdData) setSeeds(sdData as HarvestedSeed[])
    if (pData) setPollenLots(pData as PollenLot[])
    if (tData) setTreatments(tData as Treatment[])
    if (ghData) setGreenhouses(ghData)
    if (gtData) setTables(gtData)
    setLoading(false)
  }

  function resetForm() {
    setForm({
      seedParent: "", seedParentId: "", pollenParent: "", pollenParentId: "",
      pollinationDate: new Date().toISOString().split("T")[0],
      pollinatedFlowersCount: "", pollenType: "frais", pollenLotId: "", freshAntherQuality: "", freshDehiscence: "",
      pistilChecklist: [],
    })
  }

  async function createLot() {
    if (!form.seedParent.trim() && !form.pollenParent.trim()) return
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { alert("Vous devez être connecté pour enregistrer un croisement."); return }

    const seedVal = form.seedParent.trim() || "Inconnu"
    const pollenVal = form.pollenParent.trim() || "Inconnu"
    const key = pairKey(seedVal, pollenVal)
    const base = generateBaseSyllable(seedVal, pollenVal)

    const existingLots = crosses.filter((c) => pairKey(c.seed_parent ?? "", c.pollen_parent ?? "") === key)
    const nextLotIndex = existingLots.length
    const lot = lotLetter(nextLotIndex)
    const code = generateLotCode(base, nextLotIndex)

    const climateData: Record<string, unknown> = pollinationWeather
      ? { temperature: pollinationWeather.temperature, humidity: pollinationWeather.humidity, uv_index: pollinationWeather.uv_index, location: pollinationWeather.location, source: pollinationWeather.source, date: pollinationWeather.date }
      : {}

    const flowerCount = form.pollinatedFlowersCount.trim() ? Math.max(1, Number.parseInt(form.pollinatedFlowersCount, 10) || 0) : null

    const payload: Record<string, any> = {
      user_id: authData.user.id,
      code,
      seed_parent: seedVal,
      pollen_parent: pollenVal,
      pollination_date: fromDateInput(form.pollinationDate),
      remarks: "",
      base_syllable: base,
      lot_letter: lot,
      climate_data: climateData,
      status: "En cours",
      flower_count: flowerCount,
      pollen_type: form.pollenType,
      pollen_lot_id: form.pollenType === "conservé" ? form.pollenLotId || null : null,
      // Pollen frais : observation du jour (qualité des anthères, déhiscence),
      // les mêmes cases que le module Pollen, hors champs de conservation.
      pollen_quality: form.pollenType === "frais"
        ? { anther_quality: form.freshAntherQuality || null, dehiscence: form.freshDehiscence || null }
        : {},
      pistil_checklist: form.pistilChecklist,
    }

    const { data: createdLot, error } = await supabase.from("crosses").insert(payload).select("*").single()
    if (error) {
      const details = [error.message, error.details, error.hint].filter(Boolean).join(" — ")
      alert(`Erreur lors de la création du lot : ${details || "échec de l'insertion"}`)
      return
    }

    if (createdLot && flowerCount) {
      await createFruitsForLot(createdLot as Cross, flowerCount)
    }

    const missingParents = [
      !form.seedParentId && form.seedParent.trim() ? { name: seedVal, role: "seed" as const, label: "porte-graine" } : null,
      !form.pollenParentId && form.pollenParent.trim() ? { name: pollenVal, role: "pollen" as const, label: "pollen" } : null,
    ].filter(Boolean) as Array<{ name: string; role: "seed" | "pollen"; label: string }>

    if (createdLot && missingParents.length > 0) {
      await supabase.from("parent_alerts").insert(
        missingParents.map((parent) => ({
          parent_name: parent.name,
          parent_role: parent.role,
          cross_id: createdLot.id,
          message: `Ajouter le parent ${parent.label} « ${parent.name} » au catalogue.`,
        })),
      )
    }

    resetForm()
    setCreating(false)
    setAddingLotFor(null)
    setFocusedKey(key)
    fetchData()
  }

  async function createFruitsForLot(lot: Cross, count: number) {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) return
    const lotIndex = lotIndexFromLetter(lot.lot_letter)
    const rows = Array.from({ length: count }, (_, index) => ({
      user_id: authData.user.id,
      cross_id: lot.id,
      fruit_name: generateFruitCode(lot.base_syllable ?? lot.code, lotIndex, index),
      flower_index: index + 1,
      status: "suivi",
      climate_data: lot.climate_data ?? {},
    }))
    const { error } = await supabase.from("cross_fruits").insert(rows)
    if (error) alert(`Erreur lors de la génération des fruits : ${error.message}`)
  }

  async function validateFlowerCount(lot: Cross, count: number) {
    if (!count || count < 1) return
    const { error } = await supabase.from("crosses").update({ flower_count: count }).eq("id", lot.id)
    if (error) { alert(`Erreur : ${error.message}`); return }
    await createFruitsForLot({ ...lot, flower_count: count }, count)
    fetchData()
  }

  async function patchLot(lot: Cross, changes: Partial<Cross>) {
    setCrosses((prev) => prev.map((c) => (c.id === lot.id ? { ...c, ...changes } : c)))
    const { error } = await supabase.from("crosses").update(changes).eq("id", lot.id)
    if (error) { alert(`Erreur : ${error.message}`); fetchData() }
  }

  async function deleteLot(id: string) {
    if (!confirm("Supprimer ce lot et tout son suivi (fruits, graines) ?")) return
    await supabase.from("crosses").delete().eq("id", id)
    fetchData()
  }

  async function harvestFruit(fruit: CrossFruit, values: {
    seedCount: number; harvestDate: string; fruitCalibre: string; maturation: string; seedExtraction: string
    greenhouseId: string; tableId: string
  }) {
    const { error } = await supabase.from("cross_fruits").update({
      status: values.seedCount > 0 ? "récolté" : "vide",
      seed_count: values.seedCount,
      harvest_date: fromDateInput(values.harvestDate),
      harvest_year: values.harvestDate ? new Date(values.harvestDate).getFullYear() : new Date().getFullYear(),
      fruit_calibre: values.fruitCalibre || null,
      maturation: values.maturation || null,
      seed_extraction: values.seedExtraction || null,
      greenhouse_id: values.greenhouseId || null,
      greenhouse_table_id: values.tableId || null,
      failure_causes: [],
    }).eq("id", fruit.id)
    if (error) { alert(`Erreur lors de l'enregistrement de la récolte : ${error.message}`); return }
    fetchData()
  }

  async function abortFruit(fruit: CrossFruit, causes: string[]) {
    const { error } = await supabase.from("cross_fruits").update({
      status: "avorté",
      seed_count: 0,
      failure_causes: causes,
    }).eq("id", fruit.id)
    if (error) { alert(`Erreur : ${error.message}`); return }
    fetchData()
  }

  // Ajoute une observation de nouaison (indépendante de la récolte) au
  // suivi phénologique du fruit, étalé sur 4 à 5 mois.
  async function addPhenologyObservation(fruit: CrossFruit, obs: PhenologyObservation) {
    const current = fruit.checklist?.observations ?? []
    const next = { ...(fruit.checklist ?? {}), observations: [...current, obs] }
    setFruits((prev) => prev.map((f) => (f.id === fruit.id ? { ...f, checklist: next } : f)))
    const { error } = await supabase.from("cross_fruits").update({ checklist: next }).eq("id", fruit.id)
    if (error) { alert(`Erreur : ${error.message}`); fetchData() }
  }

  const treatmentsByCross = useMemo(() => {
    const m = new Map<string, Treatment[]>()
    treatments.forEach((t) => { const arr = m.get(t.cross_id) ?? []; arr.push(t); m.set(t.cross_id, arr) })
    return m
  }, [treatments])

  const fruitsByLot = useMemo(() => {
    const m = new Map<string, CrossFruit[]>()
    fruits.forEach((f) => { const arr = m.get(f.cross_id) ?? []; arr.push(f); m.set(f.cross_id, arr) })
    return m
  }, [fruits])

  const seedsByFruit = useMemo(() => {
    const m = new Map<string, HarvestedSeed[]>()
    seeds.forEach((s) => { const arr = m.get(s.fruit_id) ?? []; arr.push(s); m.set(s.fruit_id, arr) })
    return m
  }, [seeds])

  const couples = useMemo(() => {
    const m = new Map<string, { seedParent: string; pollenParent: string; baseSyllable: string; lots: Cross[] }>()
    for (const c of crosses) {
      const key = pairKey(c.seed_parent ?? "", c.pollen_parent ?? "")
      if (!m.has(key)) m.set(key, { seedParent: c.seed_parent ?? "?", pollenParent: c.pollen_parent ?? "?", baseSyllable: c.base_syllable ?? generateBaseSyllable(c.seed_parent ?? "", c.pollen_parent ?? ""), lots: [] })
      m.get(key)!.lots.push(c)
    }
    for (const couple of m.values()) couple.lots.sort((a, b) => (a.lot_letter ?? "").localeCompare(b.lot_letter ?? ""))
    return Array.from(m.entries()).sort((a, b) => {
      const aDate = a[1].lots[0]?.created_at ?? ""
      const bDate = b[1].lots[0]?.created_at ?? ""
      return bDate.localeCompare(aDate)
    })
  }, [crosses])

  const focusedCouple = focusedKey ? couples.find(([key]) => key === focusedKey) : null

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Flower2 className="size-8 animate-pulse text-primary" /></div>
  }

  return (
    <div className="flex flex-col gap-5">
      {focusedCouple ? null : <SectionHeading title="Croisements" description="Couple de parents, lots de pollinisation, suivi des fruits et récolte des graines." />}

      {focusedCouple ? null : (
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("crosses")} className={activeTab === "crosses" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}>
            <Flower2 className="size-4" /> Croisements
          </button>
          <button onClick={() => setActiveTab("pollen")} className={activeTab === "pollen" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}>
            <FlaskConical className="size-4" /> Module Pollen
          </button>
        </div>
      )}

      {activeTab === "crosses" ? (
        focusedCouple ? (
          <CoupleFocusView
            coupleKey={focusedCouple[0]}
            couple={focusedCouple[1]}
            focusedLot={focusedLot}
            setFocusedLot={setFocusedLot}
            fruitsByLot={fruitsByLot}
            seedsByFruit={seedsByFruit}
            treatmentsByCross={treatmentsByCross}
            greenhouses={greenhouses}
            tables={tables}
            creatingLot={creating}
            lotForm={form}
            setLotForm={setForm}
            pollenLots={pollenLots}
            pollinationWeather={pollinationWeather}
            weatherLoading={weatherLoading}
            onBack={() => { setFocusedKey(null); setFocusedLot(null); setCreating(false) }}
            onStartAddLot={() => {
              setAddingLotFor({ seedParent: focusedCouple[1].seedParent, pollenParent: focusedCouple[1].pollenParent })
              setForm((f) => ({ ...f, seedParent: focusedCouple[1].seedParent, pollenParent: focusedCouple[1].pollenParent, seedParentId: "", pollenParentId: "", pollinatedFlowersCount: "" }))
              setCreating(true)
            }}
            onCancelAddLot={() => { setCreating(false); setAddingLotFor(null) }}
            onSubmitLot={createLot}
            onPatchLot={patchLot}
            onDeleteLot={deleteLot}
            onValidateFlowerCount={validateFlowerCount}
            onHarvestFruit={harvestFruit}
            onAbortFruit={abortFruit}
            onAddPhenologyObservation={addPhenologyObservation}
          />
        ) : (
          <>
            <div className="flex justify-end">
              <Button onClick={() => { setAddingLotFor(null); resetForm(); setCreating((v) => !v) }} className="gap-1.5">
                <Plus className="size-4" /> Nouveau croisement
              </Button>
            </div>

            {creating && !addingLotFor ? (
              <LotForm
                form={form} setForm={setForm} lockParents={false}
                seedSuggestions={seedSuggestions} pollenSuggestions={pollenSuggestions}
                showSeedSugg={showSeedSugg} showPollenSugg={showPollenSugg}
                setShowSeedSugg={setShowSeedSugg} setShowPollenSugg={setShowPollenSugg}
                pollenLots={pollenLots} pollinationWeather={pollinationWeather} weatherLoading={weatherLoading}
                onCancel={() => setCreating(false)}
                onSubmit={createLot}
              />
            ) : null}

            {creating ? null : couples.length === 0 ? (
              <EmptyState icon={<Flower2 className="size-8" />} title="Aucun croisement" description="Commencez par enregistrer un croisement entre deux rosiers parents." />
            ) : (
              <div className="grid gap-2">
                {couples.map(([key, couple]) => (
                  <button
                    key={key}
                    onClick={() => setFocusedKey(key)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Flower2 className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{couple.seedParent} <span className="text-muted-foreground">×</span> {couple.pollenParent}</p>
                      <p className="text-xs text-muted-foreground">{couple.lots.length} lot{couple.lots.length > 1 ? "s" : ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )
      ) : (
        <PollenPanel pollenLots={pollenLots} onRefresh={fetchData} />
      )}
    </div>
  )
}
