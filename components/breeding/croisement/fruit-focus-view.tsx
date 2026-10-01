"use client"

// Carte Fruit (focus) : grille d'observation de la nouaison en premier ;
// la récolte finale et l'échec restent accessibles, mais ne sont jamais
// affichés en premier ni forcés.

import { useState } from "react"
import { ArrowLeft, Cherry, Sprout, Ban, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Badge, Field, Input, Select, Textarea } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import {
  FRUIT_CALIBRE_LABELS,
  MATURATION_LABELS,
  AVORTEMENT_LABELS,
  SEED_EXTRACTION_LABELS,
} from "@/lib/domain/supabase-types"
import {
  PHENOLOGY_STAGES,
  CALIBRE_STAGE_OPTIONS,
  COLOR_OPTIONS,
  BEHAVIOR_OPTIONS,
  type HarvestedSeed,
  type PhenologyObservation,
} from "@/app/croisement/types"

export function FruitFocusView({ fruit, seeds, greenhouses, tables, onBack, onHarvest, onAbort, onAddObservation }: any) {
  const [obsDate, setObsDate] = useState(new Date().toISOString().split("T")[0])
  const [obsStages, setObsStages] = useState<string[]>([])
  const [obsCalibre, setObsCalibre] = useState("")
  const [obsCouleur, setObsCouleur] = useState("")
  const [obsComportement, setObsComportement] = useState<string[]>([])
  const [obsRemarque, setObsRemarque] = useState("")
  const [closingVoie, setClosingVoie] = useState<"A" | "B" | null>(null)

  const [seedCount, setSeedCount] = useState("0")
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split("T")[0])
  const [fruitCalibre, setFruitCalibre] = useState("")
  const [maturation, setMaturation] = useState("")
  const [seedExtraction, setSeedExtraction] = useState("")
  const [greenhouseId, setGreenhouseId] = useState("")
  const [tableId, setTableId] = useState("")
  const [causes, setCauses] = useState<string[]>([])

  const closed = fruit.status !== "suivi"
  const observations: PhenologyObservation[] = fruit.checklist?.observations ?? []

  function submitObservation() {
    if (obsStages.length === 0 && !obsCalibre && !obsCouleur && obsComportement.length === 0 && !obsRemarque) return
    onAddObservation({ date: obsDate, stages: obsStages, calibre: obsCalibre, couleur: obsCouleur, comportement: obsComportement, remarque: obsRemarque })
    setObsStages([]); setObsCalibre(""); setObsCouleur(""); setObsComportement([]); setObsRemarque("")
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour au lot
      </button>

      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Cherry className="size-4" /></span>
        <div>
          <p className="font-serif text-lg text-foreground">{fruit.fruit_name}</p>
          <p className="text-xs text-muted-foreground">Suivi de nouaison sur 4 à 5 mois, indépendant de la récolte</p>
        </div>
      </div>

      {closed ? (
        <Card className="flex flex-wrap gap-1.5 p-3">
          {fruit.status === "récolté" || fruit.status === "vide" ? (
            <>
              <Badge tone={fruit.status === "récolté" ? "success" : "warning"}>{fruit.status === "récolté" ? "Récolté" : "Vide (0 graine)"}</Badge>
              {fruit.harvest_date ? <Badge tone="neutral">Le {formatDate(fruit.harvest_date)}</Badge> : null}
              {fruit.fruit_calibre ? <Badge tone="neutral">{FRUIT_CALIBRE_LABELS[fruit.fruit_calibre] ?? fruit.fruit_calibre}</Badge> : null}
              {fruit.maturation ? <Badge tone="neutral">{MATURATION_LABELS[fruit.maturation] ?? fruit.maturation}</Badge> : null}
              {fruit.seed_extraction ? <Badge tone="neutral">{SEED_EXTRACTION_LABELS[fruit.seed_extraction] ?? fruit.seed_extraction}</Badge> : null}
            </>
          ) : (
            <>
              <Badge tone="danger">Avorté</Badge>
              {fruit.failure_causes.map((c: string) => <Badge key={c} tone="danger">{AVORTEMENT_LABELS[c] ?? c}</Badge>)}
            </>
          )}
        </Card>
      ) : null}

      {seeds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {seeds.map((s: HarvestedSeed) => <Badge key={s.id} tone="neutral"><Sprout className="size-3" /> {s.seed_name}</Badge>)}
        </div>
      ) : null}

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Suivi de nouaison</h3>
        </div>

        {observations.length > 0 ? (
          <div className="mb-4 grid gap-2">
            {observations.map((obs, i) => (
              <div key={i} className="rounded-md border border-border bg-muted/10 p-2 text-xs">
                <p className="font-medium text-foreground">{formatDate(obs.date)}</p>
                {obs.stages.length > 0 ? <p className="text-muted-foreground">{obs.stages.join(", ")}</p> : null}
                {obs.calibre || obs.couleur ? <p className="text-muted-foreground">{[obs.calibre, obs.couleur].filter(Boolean).join(" · ")}</p> : null}
                {obs.comportement?.length > 0 ? <p className="text-muted-foreground">{obs.comportement.join(", ")}</p> : null}
                {obs.remarque ? <p className="italic text-muted-foreground">{obs.remarque}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-xs text-muted-foreground">Aucune observation enregistrée pour l'instant.</p>
        )}

        {!closed ? (
          <div className="grid gap-3 border-t border-border pt-3">
            <Field label="Date de l'observation"><Input type="date" value={obsDate} onChange={(e) => setObsDate(e.target.value)} className="w-44" /></Field>

            <div className="grid gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stades phénologiques observés</p>
              <div className="flex flex-wrap gap-3 text-xs">
                {PHENOLOGY_STAGES.map((stage) => (
                  <label key={stage} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={obsStages.includes(stage)} onChange={(e) => setObsStages((cur) => e.target.checked ? [...cur, stage] : cur.filter((s) => s !== stage))} /> {stage}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Calibre</p>
              <div className="flex flex-wrap gap-3 text-xs">
                {CALIBRE_STAGE_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5">
                    <input type="radio" name="obs-calibre" checked={obsCalibre === opt} onChange={() => setObsCalibre(opt)} /> {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Couleur</p>
              <div className="flex flex-wrap gap-3 text-xs">
                {COLOR_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5">
                    <input type="radio" name="obs-couleur" checked={obsCouleur === opt} onChange={() => setObsCouleur(opt)} /> {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comportement du fruit</p>
              <div className="flex flex-wrap gap-3 text-xs">
                {BEHAVIOR_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={obsComportement.includes(opt)} onChange={(e) => setObsComportement((cur) => e.target.checked ? [...cur, opt] : cur.filter((c) => c !== opt))} /> {opt}
                  </label>
                ))}
              </div>
            </div>

            <Field label="Remarque" hint="Seul champ en texte libre de tout le suivi"><Textarea value={obsRemarque} onChange={(e) => setObsRemarque(e.target.value)} placeholder="Remarque optionnelle..." /></Field>

            <div className="flex justify-end">
              <Button size="sm" onClick={submitObservation}>Ajouter au suivi</Button>
            </div>
          </div>
        ) : null}
      </Card>

      {!closed ? (
        closingVoie === null ? (
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setClosingVoie("B")}><Ban className="size-3.5" /> Déclarer un échec</Button>
            <Button size="sm" className="gap-1.5" onClick={() => setClosingVoie("A")}><Cherry className="size-3.5" /> Enregistrer la récolte finale</Button>
          </div>
        ) : closingVoie === "A" ? (
          <Card className="grid gap-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Date de récolte"><Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} /></Field>
              <Field label="Nombre de graines"><Input type="number" min={0} value={seedCount} onChange={(e) => setSeedCount(e.target.value)} /></Field>
              <Field label="Calibre du fruit">
                <Select value={fruitCalibre} onChange={(e) => setFruitCalibre(e.target.value)}>
                  <option value="">--</option>
                  {Object.entries(FRUIT_CALIBRE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Maturation">
                <Select value={maturation} onChange={(e) => setMaturation(e.target.value)}>
                  <option value="">--</option>
                  {Object.entries(MATURATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(SEED_EXTRACTION_LABELS).map(([k, v]) => (
                <label key={k} className="flex items-center gap-1.5"><input type="radio" name="extraction" checked={seedExtraction === k} onChange={() => setSeedExtraction(k)} /> {v}</label>
              ))}
            </div>
            {Number.parseInt(seedCount, 10) > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Serre">
                  <Select value={greenhouseId} onChange={(e) => { setGreenhouseId(e.target.value); setTableId("") }}>
                    <option value="">--</option>
                    {greenhouses.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </Select>
                </Field>
                <Field label="Table">
                  <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                    <option value="">--</option>
                    {tables.filter((t: any) => t.greenhouse_id === greenhouseId).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </Field>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setClosingVoie(null)}>Annuler</Button>
              <Button size="sm" onClick={() => onHarvest({ seedCount: Math.max(0, Number.parseInt(seedCount, 10) || 0), harvestDate, fruitCalibre, maturation, seedExtraction, greenhouseId, tableId })}>Enregistrer</Button>
            </div>
          </Card>
        ) : (
          <Card className="grid gap-3 p-4">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {Object.entries(AVORTEMENT_LABELS).map(([k, v]) => (
                <label key={k} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={causes.includes(k)} onChange={(e) => setCauses((cur) => e.target.checked ? [...cur, k] : cur.filter((c) => c !== k))} /> {v}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setClosingVoie(null)}>Annuler</Button>
              <Button size="sm" variant="destructive" onClick={() => onAbort(causes)}>Enregistrer l'échec</Button>
            </div>
          </Card>
        )
      ) : null}
    </div>
  )
}
