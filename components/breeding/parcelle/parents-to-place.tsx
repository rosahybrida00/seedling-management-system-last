"use client"

// Bandeau « Parents à placer » : les variétés et semis utilisés comme parents
// dans un croisement mais absents de toute serre et parcelle. Lit la vue
// crossing_parents_unplaced (migration 034) ; si la vue n'existe pas encore,
// le bandeau reste simplement caché.

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, Card } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { supabase } from "@/lib/supabase-client"
import { PlaceInZoneDialog, type PlacementResult } from "@/components/breeding/parcelle/place-in-zone-dialog"
import {
  parentToSource,
  splitUnplacedParents,
  type PlacementSource,
  type UnplacedParentRow,
  type UnplacedParents,
} from "@/lib/services/placementService"

export function ParentsToPlace({ onPlaced }: { onPlaced: () => void }) {
  const [parents, setParents] = useState<UnplacedParents | null>(null)
  const [showFathers, setShowFathers] = useState(false)
  const [placing, setPlacing] = useState<PlacementSource | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("crossing_parents_unplaced")
      .select("variety_id,seedling_id,name,cross_count,as_mother,as_father,last_pollination_date")
    if (error) {
      // Migration 034 non appliquée : rien à afficher.
      setParents(null)
      return
    }
    setParents(splitUnplacedParents((data ?? []) as UnplacedParentRow[]))
  }, [])

  useEffect(() => { void load() }, [load])

  function handleDone(result: PlacementResult) {
    setPlacing(null)
    setNotice(result.placed > 0 ? `${result.placed} plant${result.placed > 1 ? "s" : ""} placé${result.placed > 1 ? "s" : ""} dans ${result.zoneName}.` : null)
    void load()
    onPlaced()
  }

  if (!parents || (parents.mothers.length === 0 && parents.fathersOnly.length === 0)) {
    return notice ? <p role="status" className="text-sm text-primary">{notice}</p> : null
  }

  return (
    <>
      <Card className="flex flex-col gap-3 border-chart-3/40 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-3" />
          <div>
            <h3 className="text-sm font-medium text-foreground">Parents à placer</h3>
            <p className="text-xs text-muted-foreground">
              Ces plantes sont utilisées dans vos croisements mais ne sont dans aucune serre ni parcelle : leur suivi et leur historique sont incomplets.
            </p>
          </div>
        </div>
        {notice ? <p role="status" className="text-sm text-primary">{notice}</p> : null}

        {parents.mothers.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {parents.mothers.map((row) => <ParentRow key={row.variety_id ?? row.seedling_id} row={row} onPlace={setPlacing} />)}
          </ul>
        ) : null}

        {parents.fathersOnly.length > 0 ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowFathers((value) => !value)}
              className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-expanded={showFathers}
            >
              {showFathers ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {parents.fathersOnly.length} pollinisateur{parents.fathersOnly.length > 1 ? "s" : ""} seulement (facultatif : le pollen peut venir d&apos;ailleurs)
            </button>
            {showFathers ? (
              <ul className="flex flex-col gap-2">
                {parents.fathersOnly.map((row) => <ParentRow key={row.variety_id ?? row.seedling_id} row={row} onPlace={setPlacing} />)}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Card>

      {placing ? <PlaceInZoneDialog source={placing} alreadyInCollection onClose={() => setPlacing(null)} onDone={handleDone} /> : null}
    </>
  )
}

function ParentRow({ row, onPlace }: { row: UnplacedParentRow; onPlace: (source: PlacementSource) => void }) {
  const source = parentToSource(row)
  if (!source) return null
  const roles = [
    row.as_mother > 0 ? `mère dans ${row.as_mother}` : null,
    row.as_father > 0 ? `père dans ${row.as_father}` : null,
  ].filter(Boolean).join(" · ")
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background p-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{source.name}</p>
        <p className="text-xs text-muted-foreground">
          {row.cross_count} croisement{row.cross_count > 1 ? "s" : ""} · {roles}
          {row.last_pollination_date ? ` · dernier le ${formatDate(row.last_pollination_date)}` : ""}
        </p>
      </div>
      {source.kind === "semis" ? <Badge tone="neutral">Semis</Badge> : null}
      <Button size="sm" variant="outline" onClick={() => onPlace(source)}>Placer</Button>
    </li>
  )
}
