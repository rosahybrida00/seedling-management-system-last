"use client"

import { useEffect, useState, useMemo } from "react"
import { ChartBar as BarChart3, Flower2, Cherry, Sprout, TrendingUp, TrendingDown, FileText, Download, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"
import { Card, Badge, SectionHeading, EmptyState } from "@/components/breeding/ui"
import { supabase } from "@/lib/supabase-client"
import { fetchSeasonBilan, type SeasonBilan, type ParentPerformance } from "@/lib/services/statsService"
import { generateDhoPdf } from "@/lib/services/dhoExport"
import {
  PRESSION_SANITAIRE_LABELS,
  TRAITEMENT_LABELS,
} from "@/lib/domain/supabase-types"

export default function BilansPage() {
  return (
    <AppShell>
      <BilansContent />
    </AppShell>
  )
}

function BilansContent() {
  const [bilan, setBilan] = useState<SeasonBilan | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchBilan()
  }, [])

  async function fetchBilan() {
    setLoading(true)
    const data = await fetchSeasonBilan()
    setBilan(data)
    setLoading(false)
  }

  async function handleDhoExport() {
    if (!bilan) return
    setExporting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from("profiles")
        .select("obtenteur_name, affixe")
        .eq("id", userData.user?.id ?? "")
        .maybeSingle()

      generateDhoPdf(bilan, {
        obtenteurName: profile?.obtenteur_name ?? "—",
        affixe: profile?.affixe ?? "—",
      })
    } catch (err) {
      console.error("Erreur export DHO:", err)
      alert("Erreur lors de la génération du dossier DHO.")
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BarChart3 className="size-8 animate-pulse text-primary" />
      </div>
    )
  }

  const o = bilan?.overall
  const hasData = o && o.totalCrosses > 0

  if (!hasData) {
    return (
      <div className="flex flex-col gap-5">
        <SectionHeading
          title="Bilans & Statistiques"
          description="Calculs de performance, taux de nouaison, bilans sanitaires et exportation DHO."
        />
        <EmptyState
          icon={<BarChart3 className="size-8" />}
          title="Aucune donnée à analyser"
          description="Enregistrez des croisements, des récoltes et des évaluations de semis pour générer vos bilans statistiques."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Bilans & Statistiques"
        description="Calculs de performance, taux de nouaison, bilans sanitaires et exportation DHO."
        action={
          <Button onClick={handleDhoExport} disabled={exporting} className="gap-1.5">
            <FileText className="size-4" /> {exporting ? "Génération..." : "Exporter DHO (PDF)"}
          </Button>
        }
      />

      {/* KPIs globaux */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Flower2 className="size-5" />}
          label="Croisements"
          value={o!.totalCrosses}
          tone="primary"
        />
        <KpiCard
          icon={<Cherry className="size-5" />}
          label="Fruits récoltés"
          value={o!.totalHarvestedFruits}
          tone="accent"
        />
        <KpiCard
          icon={<TrendingUp className="size-5" />}
          label="Taux de nouaison"
          value={`${o!.overallNouaisonRate}%`}
          tone={o!.overallNouaisonRate >= 50 ? "success" : "warning"}
        />
        <KpiCard
          icon={<TrendingDown className="size-5" />}
          label="Taux de vacuité"
          value={`${o!.overallVacuiteRate}%`}
          tone={o!.overallVacuiteRate <= 20 ? "success" : "danger"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Sprout className="size-5" />}
          label="Graines totales"
          value={o!.totalSeeds}
          tone="primary"
        />
        <KpiCard
          icon={<Leaf className="size-5" />}
          label="Semis en observation"
          value={o!.observingSeedlings}
          tone="warning"
        />
        <KpiCard
          icon={<Leaf className="size-5" />}
          label="Semis sélectionnés"
          value={o!.selectedSeedlings}
          tone="success"
        />
        <KpiCard
          icon={<Leaf className="size-5" />}
          label="Semis éliminés"
          value={o!.discardedSeedlings}
          tone="danger"
        />
      </div>

      {/* Bilan mensuel */}
      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-lg text-foreground">
          <BarChart3 className="size-5 text-primary" /> Bilan mensuel d'activité
        </h3>
        {bilan!.monthlyReports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité mensuelle à afficher.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Mois</th>
                  <th className="py-2 pr-4">Fleurs pollinisées</th>
                  <th className="py-2 pr-4">Fruits récoltés</th>
                  <th className="py-2 pr-4">Nouaison</th>
                  <th className="py-2 pr-4">Fruits vides</th>
                  <th className="py-2 pr-4">Vacuité</th>
                  <th className="py-2 pr-4">Graines</th>
                  <th className="py-2 pr-4">Traitements</th>
                </tr>
              </thead>
              <tbody>
                {bilan!.monthlyReports.map((m) => (
                  <tr key={m.month} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground">{m.month}</td>
                    <td className="py-2.5 pr-4 text-foreground">{m.pollinatedFlowers}</td>
                    <td className="py-2.5 pr-4 text-foreground">{m.harvestedFruits}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={m.nouaisonRate >= 50 ? "success" : "warning"}>{m.nouaisonRate}%</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-foreground">{m.emptyFruits}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={m.vacuiteRate <= 20 ? "success" : "danger"}>{m.vacuiteRate}%</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-foreground">{m.totalSeeds}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{m.treatmentCoverage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Bilan sanitaire */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 font-serif text-lg text-foreground">Bilan sanitaire</h3>
          {Object.keys(o!.diseaseDistribution).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune pathologie enregistrée sur les semis.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(o!.diseaseDistribution).map(([key, count]) => {
                const total = Object.values(o!.diseaseDistribution).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-foreground">
                      {PRESSION_SANITAIRE_LABELS[key] ?? key}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-serif text-lg text-foreground">Couverture des traitements</h3>
          {Object.keys(o!.treatmentDistribution).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun traitement enregistré.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(o!.treatmentDistribution).map(([key, count]) => {
                const total = Object.values(o!.treatmentDistribution).reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-40 text-sm text-foreground">
                      {TRAITEMENT_LABELS[key] ?? key}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Bilan par variété parentale */}
      <Card className="p-5">
        <h3 className="mb-4 font-serif text-lg text-foreground">
          Bilan de saison par variété parentale
        </h3>
        {bilan!.parentPerformances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune variété parentale identifiée. Renseignez les parents sur vos croisements.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Variété</th>
                  <th className="py-2 pr-4">Rôle</th>
                  <th className="py-2 pr-4">Crois.</th>
                  <th className="py-2 pr-4">Fruits</th>
                  <th className="py-2 pr-4">Nouaison</th>
                  <th className="py-2 pr-4">Vacuité</th>
                  <th className="py-2 pr-4">Graines/fruit</th>
                  <th className="py-2 pr-4">Semis</th>
                  <th className="py-2 pr-4">Sélect.</th>
                  <th className="py-2 pr-4">Index fert.</th>
                </tr>
              </thead>
              <tbody>
                {bilan!.parentPerformances.map((p, i) => (
                  <ParentRow key={`${p.role}:${p.parentName}:${i}`} perf={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function ParentRow({ perf }: { perf: ParentPerformance }) {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-2.5 pr-4 font-medium text-foreground">{perf.parentName}</td>
      <td className="py-2.5 pr-4">
        <Badge tone={perf.role === "mere" ? "accent" : "primary"}>
          {perf.role === "mere" ? "Mère ♀" : "Père ♂"}
        </Badge>
      </td>
      <td className="py-2.5 pr-4 text-foreground">{perf.crossesCount}</td>
      <td className="py-2.5 pr-4 text-foreground">{perf.fruitsHarvested}</td>
      <td className="py-2.5 pr-4">
        <Badge tone={perf.nouaisonRate >= 50 ? "success" : "warning"}>{perf.nouaisonRate}%</Badge>
      </td>
      <td className="py-2.5 pr-4">
        <Badge tone={perf.vacuiteRate <= 20 ? "success" : "danger"}>{perf.vacuiteRate}%</Badge>
      </td>
      <td className="py-2.5 pr-4 text-foreground">{perf.avgSeedCount}</td>
      <td className="py-2.5 pr-4 text-foreground">{perf.totalSeedlings}</td>
      <td className="py-2.5 pr-4 text-foreground">{perf.selectedSeedlings}</td>
      <td className="py-2.5 pr-4">
        <span className="font-medium text-primary">{perf.fertilityIndex}/100</span>
      </td>
    </tr>
  )
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  tone: "primary" | "accent" | "success" | "warning" | "danger"
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-primary/12 text-primary",
    warning: "bg-chart-3/20 text-foreground",
    danger: "bg-destructive/12 text-destructive",
  }
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={`flex size-10 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          {icon}
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </Card>
  )
}
