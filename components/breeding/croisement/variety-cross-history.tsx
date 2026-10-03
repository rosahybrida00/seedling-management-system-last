"use client"

import { useEffect, useState } from "react"
import { Badge, Card, EmptyState, SectionHeading } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"

interface CrossRow {
  id: string
  seed_parent: string | null
  pollen_parent: string | null
  pollination_date: string | null
  status: string | null
}

interface CrossHistoryItem {
  cross: CrossRow
  roles: Array<"Mère" | "Père">
}

const STATUS_TONE: Record<string, "neutral" | "primary" | "success" | "danger"> = {
  "En cours": "primary",
  "Récolté": "success",
  "Avorté": "danger",
}

export function VarietyCrossHistory({ varietyId }: { varietyId: string }) {
  const [items, setItems] = useState<CrossHistoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadHistory() {
      setItems(null)
      setError(null)
      const { data: variety, error: varietyError } = await supabase
        .from("varieties")
        .select("name,commercial_name,registration_name")
        .eq("id", varietyId)
        .maybeSingle()

      if (varietyError || !variety) {
        if (!cancelled) {
          setError(varietyError?.message ?? "Fiche variété introuvable.")
          setItems([])
        }
        return
      }

      const aliases = [...new Set([variety.name, variety.commercial_name, variety.registration_name]
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name)))]
      if (aliases.length === 0) {
        if (!cancelled) setItems([])
        return
      }

      const [asMother, asFather] = await Promise.all([
        supabase.from("crosses").select("id,seed_parent,pollen_parent,pollination_date,status").in("seed_parent", aliases).limit(200),
        supabase.from("crosses").select("id,seed_parent,pollen_parent,pollination_date,status").in("pollen_parent", aliases).limit(200),
      ])

      if (cancelled) return
      if (asMother.error || asFather.error) {
        setError(asMother.error?.message ?? asFather.error?.message ?? "Impossible de charger l’historique.")
      }

      const byId = new Map<string, CrossHistoryItem>()
      for (const cross of (asMother.data ?? []) as CrossRow[]) byId.set(cross.id, { cross, roles: ["Mère"] })
      for (const cross of (asFather.data ?? []) as CrossRow[]) {
        const existing = byId.get(cross.id)
        if (existing) existing.roles.push("Père")
        else byId.set(cross.id, { cross, roles: ["Père"] })
      }
      setItems([...byId.values()].sort((left, right) => (right.cross.pollination_date ?? "").localeCompare(left.cross.pollination_date ?? "")))
    }
    loadHistory()
    return () => { cancelled = true }
  }, [varietyId])

  return (
    <section className="mt-4 flex flex-col gap-3">
      <SectionHeading title="Historique de croisement" />
      {items === null ? <p className="text-sm text-muted-foreground">Chargement…</p> : error ? (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <EmptyState title="Aucun croisement retrouvé" description="La recherche utilise le nom catalogue, le nom commercial et la dénomination de cette variété." />
      ) : (
        <div className="grid gap-2">
          {items.map(({ cross, roles }) => {
            const roleLabel = roles.join(" / ")
            const partner = roles.includes("Mère") ? cross.pollen_parent : cross.seed_parent
            return (
              <Card key={cross.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                <Badge tone={roles.includes("Mère") ? "primary" : "neutral"}>{roleLabel}</Badge>
                <span className="text-foreground">× {partner ?? "Parent inconnu"}</span>
                {cross.pollination_date ? <span className="ml-auto text-xs text-muted-foreground">{formatDate(cross.pollination_date)}</span> : null}
                {cross.status ? <Badge tone={STATUS_TONE[cross.status] ?? "neutral"}>{cross.status}</Badge> : null}
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}