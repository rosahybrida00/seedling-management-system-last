"use client"

// Gestion des emplacements (Serres/Tables, Parcelles) — CRUD de structure.

import { useState } from "react"
import { Plus, Warehouse, Table2, ArrowLeft, Trash2, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, Badge, Field, Input } from "@/components/breeding/ui"
import { supabase } from "@/lib/supabase-client"
import { SOIL_TYPE_LABELS } from "@/lib/domain/fieldLabels"
import type { Greenhouse, GreenhouseTable, Parcelle } from "@/app/parcelle/types"

export function ManageView({ greenhouses, tables, parcelles, onBack, onRefresh }: {
  greenhouses: Greenhouse[]; tables: GreenhouseTable[]; parcelles: Parcelle[]; onBack: () => void; onRefresh: () => void
}) {
  const [subTab, setSubTab] = useState<"serres" | "parcelles">("serres")
  const [newGreenhouse, setNewGreenhouse] = useState("")
  const [newTableName, setNewTableName] = useState<Record<string, string>>({})
  const [creatingParcelle, setCreatingParcelle] = useState(false)
  const [pName, setPName] = useState("")
  const [pLocation, setPLocation] = useState("")
  const [pSoil, setPSoil] = useState<string[]>([])

  async function createGreenhouse() {
    if (!newGreenhouse.trim()) return
    await supabase.from("greenhouses").insert({ name: newGreenhouse.trim() })
    setNewGreenhouse(""); onRefresh()
  }
  async function createTable(greenhouseId: string) {
    const name = (newTableName[greenhouseId] ?? "").trim()
    if (!name) return
    await supabase.from("greenhouse_tables").insert({ greenhouse_id: greenhouseId, name })
    setNewTableName((c) => ({ ...c, [greenhouseId]: "" })); onRefresh()
  }
  async function deleteGreenhouse(id: string) { if (confirm("Supprimer cette serre et ses tables ?")) { await supabase.from("greenhouses").delete().eq("id", id); onRefresh() } }
  async function deleteTable(id: string) { if (confirm("Supprimer cette table ?")) { await supabase.from("greenhouse_tables").delete().eq("id", id); onRefresh() } }
  async function createParcelle() {
    if (!pName.trim()) return
    await supabase.from("parcelles").insert({ name: pName.trim(), location: pLocation.trim() || null, soil_type: pSoil })
    setPName(""); setPLocation(""); setPSoil([]); setCreatingParcelle(false); onRefresh()
  }
  async function deleteParcelle(id: string) { if (confirm("Supprimer cette parcelle ?")) { await supabase.from("parcelles").delete().eq("id", id); onRefresh() } }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Retour au tableau de bord</button>
      <div className="flex gap-2">
        <button onClick={() => setSubTab("serres")} className={subTab === "serres" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}><Warehouse className="size-4" /> Serres</button>
        <button onClick={() => setSubTab("parcelles")} className={subTab === "parcelles" ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary" : "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"}><MapPin className="size-4" /> Parcelles</button>
      </div>

      {subTab === "serres" ? (
        <div className="flex flex-col gap-3">
          <Card className="flex items-end gap-3 p-3">
            <Field label="Nouvelle serre"><Input value={newGreenhouse} onChange={(e) => setNewGreenhouse(e.target.value)} placeholder="Ex: Serre froide" /></Field>
            <Button size="sm" onClick={createGreenhouse} disabled={!newGreenhouse.trim()} className="gap-1"><Plus className="size-3.5" /> Ajouter</Button>
          </Card>
          {greenhouses.map((g) => (
            <Card key={g.id} className="p-3">
              <div className="flex items-center gap-2">
                <Warehouse className="size-4 text-primary" /><span className="text-sm font-medium">{g.name}</span>
                <button onClick={() => deleteGreenhouse(g.id)} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tables.filter((t) => t.greenhouse_id === g.id).map((t) => (
                  <Badge key={t.id} tone="neutral"><Table2 className="size-3" /> {t.name} <button onClick={() => deleteTable(t.id)} className="ml-1 hover:text-destructive">×</button></Badge>
                ))}
              </div>
              <div className="mt-2 flex items-end gap-2">
                <Field label="Nouvelle table"><Input className="h-8 w-40" value={newTableName[g.id] ?? ""} onChange={(e) => setNewTableName((c) => ({ ...c, [g.id]: e.target.value }))} /></Field>
                <Button size="sm" variant="outline" onClick={() => createTable(g.id)}><Plus className="size-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end"><Button size="sm" onClick={() => setCreatingParcelle((v) => !v)} className="gap-1.5"><Plus className="size-4" /> Nouvelle parcelle</Button></div>
          {creatingParcelle ? (
            <Card className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nom"><Input value={pName} onChange={(e) => setPName(e.target.value)} /></Field>
                <Field label="Localisation"><Input value={pLocation} onChange={(e) => setPLocation(e.target.value)} /></Field>
              </div>
              <div className="mt-3 grid gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type de sol</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  {Object.entries(SOIL_TYPE_LABELS).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={pSoil.includes(k)} onChange={(e) => setPSoil((c) => e.target.checked ? [...c, k] : c.filter((x) => x !== k))} /> {v}</label>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setCreatingParcelle(false)}>Annuler</Button><Button size="sm" onClick={createParcelle} disabled={!pName.trim()}>Créer</Button></div>
            </Card>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {parcelles.map((p) => (
              <Card key={p.id} className="p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" /><span className="text-sm font-medium">{p.name}</span>
                  <button onClick={() => deleteParcelle(p.id)} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                </div>
                {p.location ? <p className="mt-1 text-xs text-muted-foreground">{p.location}</p> : null}
                {p.soil_type ? <div className="mt-1.5 flex flex-wrap gap-1">{(Array.isArray(p.soil_type) ? p.soil_type : [p.soil_type]).map((s) => <Badge key={s} tone="neutral">{SOIL_TYPE_LABELS[s] ?? s}</Badge>)}</div> : null}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
