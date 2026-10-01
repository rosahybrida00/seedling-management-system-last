"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/breeding/ui"
import type { FieldPlanting } from "@/app/parcelle/types"

export function CroisementBridge({ planting, label }: { planting: FieldPlanting; label: string }) {
  const router = useRouter()
  function useAsParent(role: "seed" | "pollen") {
    sessionStorage.setItem("pendingCrossParent", JSON.stringify({
      role, name: label,
      id: planting.variety_id ?? planting.seedling_id,
      source: planting.variety_id ? "catalogue" : "semis",
    }))
    router.push("/croisement")
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="text-sm text-muted-foreground">Utiliser <strong className="text-foreground">{label}</strong> comme parent d'un nouveau croisement. La création se remplit automatiquement sur la page Croisement.</p>
      <div className="flex gap-2">
        <Button onClick={() => useAsParent("seed")} className="gap-1.5">Utiliser comme Mère (porte-graine)</Button>
        <Button variant="outline" onClick={() => useAsParent("pollen")} className="gap-1.5">Utiliser comme Père (pollen)</Button>
      </div>
    </Card>
  )
}
