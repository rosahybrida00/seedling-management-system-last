"use client"

// Vue Focus d'un couple : occupe tout l'écran, retour explicite.

import { ArrowLeft, Plus, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { LotForm } from "@/components/breeding/croisement/lot-form"
import { LotFocusView } from "@/components/breeding/croisement/lot-focus-view"
import { TREATMENT_TYPE_LABELS, type Cross, type Treatment } from "@/app/croisement/types"

export function CoupleFocusView({
  coupleKey, couple, focusedLot, setFocusedLot, fruitsByLot, seedsByFruit, treatmentsByCross,
  greenhouses, tables, creatingLot, lotForm, setLotForm, pollenLots, pollinationWeather, weatherLoading,
  onBack, onStartAddLot, onCancelAddLot, onSubmitLot, onPatchLot, onDeleteLot,
  onValidateFlowerCount, onHarvestFruit, onAbortFruit, onAddPhenologyObservation,
}: any) {
  const allTreatments: Treatment[] = couple.lots.flatMap((lot: Cross) => treatmentsByCross.get(lot.id) ?? [])
  const focusedLotData = focusedLot ? couple.lots.find((l: Cross) => l.id === focusedLot) : null

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Retour aux croisements
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl text-foreground">{couple.seedParent} <span className="text-muted-foreground">×</span> {couple.pollenParent}</h2>
          <p className="text-xs text-muted-foreground">{couple.lots.length} lot{couple.lots.length > 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={onStartAddLot} className="size-8 rounded-full p-0" title="Ajouter un lot">
          <Plus className="size-4" />
        </Button>
      </div>

      {allTreatments.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/20 p-2">
          <Shield className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Suivi sanitaire (Parcelle) :</span>
          {allTreatments.slice(0, 6).map((t) => (
            <Badge key={t.id} tone="neutral">{t.product_name}{t.treatment_type ? ` · ${TREATMENT_TYPE_LABELS[t.treatment_type] ?? t.treatment_type}` : ""}</Badge>
          ))}
        </div>
      ) : null}

      {creatingLot ? (
        <LotForm
          form={lotForm} setForm={setLotForm} lockParents
          seedSuggestions={[]} pollenSuggestions={[]} showSeedSugg={false} showPollenSugg={false}
          setShowSeedSugg={() => {}} setShowPollenSugg={() => {}}
          pollenLots={pollenLots} pollinationWeather={pollinationWeather} weatherLoading={weatherLoading}
          onCancel={onCancelAddLot} onSubmit={onSubmitLot}
        />
      ) : null}

      {creatingLot ? null : focusedLotData ? (
        <LotFocusView
          lot={focusedLotData}
          fruits={fruitsByLot.get(focusedLotData.id) ?? []}
          seedsByFruit={seedsByFruit}
          treatments={treatmentsByCross.get(focusedLotData.id) ?? []}
          greenhouses={greenhouses}
          tables={tables}
          pollenLots={pollenLots}
          onBack={() => setFocusedLot(null)}
          onPatch={(changes: Partial<Cross>) => onPatchLot(focusedLotData, changes)}
          onDelete={() => { onDeleteLot(focusedLotData.id); setFocusedLot(null) }}
          onValidateFlowerCount={(count: number) => onValidateFlowerCount(focusedLotData, count)}
          onHarvestFruit={onHarvestFruit}
          onAbortFruit={onAbortFruit}
          onAddPhenologyObservation={onAddPhenologyObservation}
        />
      ) : (
        <div className="grid gap-2">
          {couple.lots.map((lot: Cross) => {
            const lotFruits = fruitsByLot.get(lot.id) ?? []
            return (
              <button key={lot.id} onClick={() => setFocusedLot(lot.id)} className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:border-primary/40 hover:bg-muted/30">
                <span className="font-serif text-lg text-primary">{lot.lot_letter}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Pollinisé le {formatDate(lot.pollination_date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {lot.location ? `${lot.location} · ` : ""}
                    {lot.flower_count == null ? "Fleurs pollinisées non renseignées" : `${lot.flower_count} fruit${lot.flower_count > 1 ? "s" : ""}`}
                  </p>
                </div>
                {lot.pollen_type === "conservé" ? <Badge tone="primary">Pollen conservé</Badge> : <Badge tone="neutral">Pollen frais</Badge>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
