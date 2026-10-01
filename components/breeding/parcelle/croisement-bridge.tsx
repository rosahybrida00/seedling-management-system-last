"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, Badge } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import type { FieldPlanting } from "@/app/parcelle/types"

interface CrossHistoryRow {
  id: string
  seed_parent: string | null
  pollen_parent: string | null
  pollination_date: string | null
  status: string | null
}

const STATUS_TONE: Record<string, "neutral" | "primary" | "success" | "danger"> = {
  "En cours": "primary",
  "Récolté": "success",
  "Avorté": "danger",
}

export function CroisementBridge({ planting, label }: { planting: FieldPlanting; label: string }) {
  const router = useRouter()
  const [history, setHistory] = useState<CrossHistoryRow[] | null>(null)

  // L'historique de croisement n'a de sens que pour une variété du
  // Catalogue : les croisements enregistrent le nom du parent en texte
  // libre (pas d'identifiant de semis), donc on ne peut fiablement
  // retrouver que les croisements d'une variété nommée.
  useEffect(() => {
    if (!planting.variety_id) { setHistory([]); return }
    let cancelled = false
    supabase
      .from("crosses")
      .select("id,seed_parent,pollen_parent,pollination_date,status")
      .or(`seed_parent.eq.${label},pollen_parent.eq.${label}`)
      .order("pollination_date", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (!cancelled) setHistory((data as CrossHistoryRow[]) ?? []) })
    return () => { cancelled = true }
  }, [planting.variety_id, label])

  function useAsParent(role: "seed" | "pollen") {
    sessionStorage.setItem("pendingCrossParent", JSON.stringify({
      role, name: label,
      id: planting.variety_id ?? planting.seedling_id,
      source: planting.variety_id ? "catalogue" : "semis",
    }))
    router.push("/croisement")
  }

  const asMother = (history ?? []).filter((c) => c.seed_parent === label)
  const asFather = (history ?? []).filter((c) => c.pollen_parent === label)
  const harvested = (history ?? []).filter((c) => c.status === "Récolté").length
  const aborted = (history ?? []).filter((c) => c.status === "Avorté").length

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground">Utiliser <strong className="text-foreground">{label}</strong> comme parent d'un nouveau croisement. La création se remplit automatiquement sur la page Croisement.</p>
        <div className="flex gap-2">
          <Button onClick={() => useAsParent("seed")} className="gap-1.5">Utiliser comme Mère (porte-graine)</Button>
          <Button variant="outline" onClick={() => useAsParent("pollen")} className="gap-1.5">Utiliser comme Père (pollen)</Button>
        </div>
      </Card>

      {planting.variety_id ? (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">Historique de croisement</h3>
            {history && history.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {asMother.length} comme mère · {asFather.length} comme père
                {harvested + aborted > 0 ? ` · ${harvested} récolté(s), ${aborted} avorté(s)` : ""}
              </p>
            ) : null}
          </div>
          {history === null ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun croisement enregistré avec « {label} » comme parent pour l'instant.</p>
          ) : (
            <div className="grid gap-1.5">
              {history.map((c) => {
                const role = c.seed_parent === label ? "Mère" : "Père"
                const partner = c.seed_parent === label ? c.pollen_parent : c.seed_parent
                return (
                  <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <Badge tone={role === "Mère" ? "primary" : "neutral"}>{role}</Badge>
                    <span className="text-foreground">× {partner ?? "?"}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{c.pollination_date ? formatDate(c.pollination_date) : "date inconnue"}</span>
                    {c.status ? <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{c.status}</Badge> : null}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  )
}
