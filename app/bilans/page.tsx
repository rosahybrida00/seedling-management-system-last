"use client"

import { useEffect, useState, useMemo } from "react"
import { ChartBar as BarChart3, Flower2, Cherry, Sprout, TrendingUp, TrendingDown, FileText, Download, Leaf } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"
import { Card, Badge, SectionHeading, EmptyState } from "@/components/breeding/ui"
import { supabase } from "@/lib/supabase-client"
import { fetchSeasonBilan, type SeasonBilan, type ParentPerformance } from "@/lib/services/statsService"
import { fetchRuleBilan, type RuleBilan, type RuleFinding } from "@/lib/services/ruleEngine"
import type { CoupleFertility, PeerReference, RateWithCI, Verdict } from "@/lib/services/fertilityService"
import type { FactorResult } from "@/lib/services/factorService"
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
  const [ruleBilan, setRuleBilan] = useState<RuleBilan | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchBilan()
  }, [])

  async function fetchBilan() {
    setLoading(true)
    const [data, rules] = await Promise.all([fetchSeasonBilan(), fetchRuleBilan()])
    setBilan(data)
    setRuleBilan(rules)
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
          description="Calculs statistiques et règles expertes explicables sur vos historiques structurés."
        />
        <RuleBilanPanel report={ruleBilan} />
        <EmptyState
          icon={<BarChart3 className="size-8" />}
          title="Aucune donnée de croisement à analyser"
          description="Les règles expertes restent disponibles à partir des observations, interventions, graines et données météo structurées."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Bilans & Statistiques"
        description="Calculs statistiques et règles expertes explicables sur vos historiques structurés."
        action={
          <Button onClick={handleDhoExport} disabled={exporting} className="gap-1.5">
            <FileText className="size-4" /> {exporting ? "Génération..." : "Exporter DHO (PDF)"}
          </Button>
        }
      />

      {/* KPIs globaux : chaque taux affiche son effectif et son intervalle de confiance */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          label="Nouaison"
          value={formatRate(o!.nouaison)}
          detail={rateDetail(o!.nouaison, "fleurs")}
          tone="primary"
        />
        <KpiCard
          icon={<TrendingDown className="size-5" />}
          label="Vacuité"
          value={formatRate(o!.vacuite)}
          detail={rateDetail(o!.vacuite, "fruits")}
          tone="accent"
        />
        <KpiCard
          icon={<Sprout className="size-5" />}
          label="Fertilité réelle"
          value={formatRate(o!.fertile)}
          detail={rateDetail(o!.fertile, "fleurs")}
          tone="primary"
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

      <CoupleRanking couples={bilan!.couples} />

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

      <FactorsCard factors={bilan!.factors} />

      <RuleBilanPanel report={ruleBilan} />
    </div>
  )
}

function RuleBilanPanel({ report }: { report: RuleBilan | null }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <SectionHeading title="Alertes à vérifier (règles provisoires)" description="Règles à seuils fixes, en cours de remplacement par des comparaisons calculées sur vos propres données." />
      {!report ? <p className="text-sm text-muted-foreground">Chargement des faits structurés…</p> : null}
      {report?.warning ? <p role="alert" className="text-sm text-destructive">{report.warning}</p> : null}
      {report && !report.warning ? (
        <>
          <p className="text-xs text-muted-foreground">{report.recordsAnalyzed} faits structurés évalués. Les notes libres ne sont pas lues par ces règles.</p>
          <div className="divide-y divide-border">
            {report.findings.map((finding) => <RuleFindingRow key={finding.id} finding={finding} />)}
          </div>
        </>
      ) : null}
    </Card>
  )
}

function RuleFindingRow({ finding }: { finding: RuleFinding }) {
  return (
    <article className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={finding.severity === "warning" ? "warning" : "neutral"}>{finding.severity === "warning" ? "À vérifier" : "Information"}</Badge>
        <Badge tone="neutral">Règle · {finding.id}</Badge>
        <h3 className="text-sm font-semibold text-foreground">{finding.title}</h3>
      </div>
      <p className="text-sm text-foreground">{finding.finding}</p>
      <p className="text-sm text-muted-foreground">Action suggérée : {finding.recommendation}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {finding.evidence.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
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
        <span className="font-medium text-foreground">{formatRate(perf.nouaison)}</span>
        <span className="block text-xs text-muted-foreground">{rateDetail(perf.nouaison, "fleurs")}</span>
      </td>
      <td className="py-2.5 pr-4">
        <Badge tone={perf.vacuiteRate <= 20 ? "success" : "danger"}>{perf.vacuiteRate}%</Badge>
      </td>
      <td className="py-2.5 pr-4 text-foreground">{perf.avgSeedCount}</td>
      <td className="py-2.5 pr-4 text-foreground">{perf.totalSeedlings}</td>
      <td className="py-2.5 pr-4 text-foreground">{perf.selectedSeedlings}</td>
    </tr>
  )
}

function KpiCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  detail?: string
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
          {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Taux avec intervalle de confiance et classement par fertilité réelle.
// ---------------------------------------------------------------------------

function formatRate(rate: RateWithCI): string {
  return rate.rate == null ? "—" : `${rate.rate} %`
}

function rateDetail(rate: RateWithCI, unit: string): string {
  if (rate.total === 0) return `Aucun(e) ${unit} enregistré(e)`
  if (rate.reliability === "insuffisant") return `${rate.successes}/${rate.total} ${unit} : trop peu pour conclure`
  return `${rate.successes}/${rate.total} ${unit} · entre ${rate.low} et ${rate.high} %`
}

const VERDICT_LABEL: Record<Verdict, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  superieur: { label: "Au-dessus de la référence", tone: "success" },
  comparable: { label: "Comparable à la référence", tone: "neutral" },
  inferieur: { label: "En dessous de la référence", tone: "warning" },
  sans_reference: { label: "Pas de référence", tone: "neutral" },
  insuffisant: { label: "Trop peu de données", tone: "neutral" },
}

function peerLine(peer: PeerReference): string | null {
  if (peer.couples === 0) return null
  if (peer.fertile.reliability === "insuffisant") return `${peer.label} : ${peer.flowers} fleurs, trop peu`
  return `${peer.label} : ${formatRate(peer.fertile)} sur ${peer.flowers} fleurs`
}

function CoupleRanking({ couples }: { couples: CoupleFertility[] }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <SectionHeading
        title="Fertilité réelle des croisements"
        description="Part des fleurs pollinisées ayant donné un fruit contenant des graines, comparée aux autres croisements des mêmes parents. Un écart n'est signalé que lorsque les intervalles de confiance ne se chevauchent pas."
      />
      {couples.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun croisement avec une mère et un père renseignés : la comparaison n'est pas possible.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Croisement</th>
                <th className="py-2 pr-4">Fertilité réelle</th>
                <th className="py-2 pr-4">Nouaison</th>
                <th className="py-2 pr-4">Graines/fruit</th>
                <th className="py-2 pr-4">Comparaison</th>
              </tr>
            </thead>
            <tbody>
              {couples.map((couple) => {
                const verdict = VERDICT_LABEL[couple.verdict]
                const lines = [peerLine(couple.motherPeers), peerLine(couple.fatherPeers)].filter(Boolean) as string[]
                if (couple.reference === "global") {
                  const global = peerLine(couple.globalPeers)
                  if (global) lines.push(global)
                }
                return (
                  <tr key={couple.key} className="border-b border-border/50 align-top last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-foreground">
                      {couple.seedParent} <span className="text-muted-foreground">×</span> {couple.pollenParent}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {couple.lots} lot(s) · {couple.flowers} fleurs
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="font-medium text-foreground">{formatRate(couple.fertile)}</span>
                      <span className="block text-xs text-muted-foreground">{rateDetail(couple.fertile, "fleurs")}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-foreground">{formatRate(couple.nouaison)}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-foreground">{couple.seedsPerFruit ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={verdict.tone}>{verdict.label}</Badge>
                        {couple.deltaPoints != null ? (
                          <span className="text-xs text-muted-foreground">
                            {couple.deltaPoints > 0 ? "+" : ""}
                            {couple.deltaPoints} points
                          </span>
                        ) : null}
                      </div>
                      {lines.length > 0 ? (
                        <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                          {lines.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

const FACTOR_VERDICT: Record<FactorResult["verdict"], { label: string; tone: "warning" | "neutral" }> = {
  difference: { label: "Écart observé", tone: "warning" },
  aucune_difference: { label: "Pas d'écart démontré", tone: "neutral" },
  insuffisant: { label: "Trop peu de données", tone: "neutral" },
}

function FactorsCard({ factors }: { factors: FactorResult[] }) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <SectionHeading
        title="Facteurs associés à la fertilité"
        description="Fertilité réelle comparée selon les conditions de pollinisation. Les bornes météo sont calculées sur vos propres lots, jamais fixées à l'avance."
      />
      {factors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Pas encore assez de lots avec météo, type de pollen ou suivi sanitaire pour comparer des conditions. Les comparaisons apparaissent à partir de 9 lots mesurés.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {factors.map((factor) => {
            const verdict = FACTOR_VERDICT[factor.verdict]
            return (
              <article key={factor.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{factor.title}</h3>
                  <Badge tone={verdict.tone}>{verdict.label}</Badge>
                </div>
                <p className="text-sm text-foreground">{factor.summary}</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {factor.groups.map((group) => (
                    <li key={group.label} className="flex flex-wrap items-baseline gap-x-3 text-foreground">
                      <span className="w-48 shrink-0">{group.label}</span>
                      <span className="font-medium">{formatRate(group.fertile)}</span>
                      <span className="text-xs text-muted-foreground">
                        {group.lots} lot(s) · {rateDetail(group.fertile, "fleurs")}
                        {group.eligible ? "" : " · groupe trop petit, non comparé"}
                      </span>
                    </li>
                  ))}
                </ul>
                {factor.note ? <p className="text-xs text-muted-foreground">{factor.note}</p> : null}
              </article>
            )
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Ces écarts sont des associations observées sur vos données, pas des causes : d'autres conditions peuvent les expliquer.
      </p>
    </Card>
  )
}
