"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/breeding/ui"
import { VarietyCrossHistory } from "@/components/breeding/croisement/variety-cross-history"
import type { FieldPlanting } from "@/app/parcelle/types"

export function CroisementBridge({ planting, label, canonicalLabel = label }: {
  planting: FieldPlanting
  label: string
  canonicalLabel?: string
}) {
  const router = useRouter()

  function useAsParent(role: "seed" | "pollen") {
    sessionStorage.setItem("pendingCrossParent", JSON.stringify({
      role,
      name: canonicalLabel,
      id: planting.variety_id ?? planting.seedling_id,
      source: planting.variety_id ? "catalogue" : "semis",
    }))
    router.push("/croisement")
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground">Utiliser <strong className="text-foreground">{label}</strong> comme parent d’un nouveau croisement.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => useAsParent("seed")}>Utiliser comme mère</Button>
          <Button variant="outline" onClick={() => useAsParent("pollen")}>Utiliser comme père</Button>
        </div>
      </Card>
      {planting.variety_id ? <VarietyCrossHistory varietyId={planting.variety_id} /> : null}
    </div>
  )
}