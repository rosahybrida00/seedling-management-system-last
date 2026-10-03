import { supabase } from "@/lib/supabase-client"

export type RuleSeverity = "info" | "warning"

export interface RuleFinding {
  id: string
  severity: RuleSeverity
  title: string
  finding: string
  recommendation: string
  evidence: string[]
}

export interface RuleBilan {
  findings: RuleFinding[]
  recordsAnalyzed: number
  warning: string | null
}

interface ObservationRow {
  id: string
  observation_date: string
  greenhouse_id: string | null
  greenhouse_table_id: string | null
  parcelle_id: string | null
  weather_daily_id: string | null
  disease_pressure: string[] | null
  pests: string[] | null
  climate_behavior: string[] | null
  treatment_applied: string[] | null
  treatment_reaction: string[] | null
}

interface ProgramRow {
  id: string
  program_type: string
  product_name: string
}

interface InterventionRow {
  id: string
  program_id: string
  due_date: string | null
  done: boolean
  done_date: string | null
}

interface WeatherRow {
  id: string
  temperature: number | null
  humidity: number | null
}

interface HarvestedSeedRow {
  fruit_id: string
  status: string
  germination_date: string | null
}

function addFinding(findings: RuleFinding[], finding: RuleFinding) {
  findings.push(finding)
}

export function evaluateBilanRules(input: {
  observations: ObservationRow[]
  programs: ProgramRow[]
  interventions: InterventionRow[]
  weather: WeatherRow[]
  seeds: HarvestedSeedRow[]
  today?: string
}): RuleBilan {
  const findings: RuleFinding[] = []
  const weatherById = new Map(input.weather.map((row) => [row.id, row]))
  const programById = new Map(input.programs.map((row) => [row.id, row]))
  const today = input.today ?? new Date().toISOString().slice(0, 10)

  const humidDiseaseEvents = input.observations.filter((observation) => {
    const weather = observation.weather_daily_id ? weatherById.get(observation.weather_daily_id) : null
    return Boolean(weather?.humidity != null && weather.humidity >= 80 && ((observation.disease_pressure?.length ?? 0) > 0 || (observation.pests?.length ?? 0) > 0))
  })
  if (humidDiseaseEvents.length >= 3) {
    addFinding(findings, {
      id: "sanitary-humidity-association",
      severity: "warning",
      title: "Pression sanitaire observée avec forte humidité",
      finding: `${humidDiseaseEvents.length} observations associent maladies ou ravageurs à une humidité d’au moins 80%. Cette cooccurrence ne prouve pas une causalité.`,
      recommendation: "Comparer les dates, zones et cultures concernées avant d’ajuster l’aération ou les pratiques préventives.",
      evidence: [`${humidDiseaseEvents.length} observations structurées`, "Seuil appliqué : humidité ≥ 80%"],
    })
  }

  const heatStressEvents = input.observations.filter((observation) => {
    if (!(observation.climate_behavior ?? []).includes("stress_hydrique")) return false
    const weather = observation.weather_daily_id ? weatherById.get(observation.weather_daily_id) : null
    return Boolean(weather && ((weather.temperature != null && weather.temperature >= 28) || (weather.humidity != null && weather.humidity < 40)))
  })
  if (heatStressEvents.length >= 2) {
    addFinding(findings, {
      id: "water-stress-weather",
      severity: "warning",
      title: "Stress hydrique et conditions chaudes/sèches",
      finding: `${heatStressEvents.length} observations de stress hydrique coïncident avec ≥ 28°C ou < 40% d’humidité.`,
      recommendation: "Vérifier l’arrosage et comparer les emplacements concernés ; les données indiquent une association, pas une cause certaine.",
      evidence: [`${heatStressEvents.length} observations avec météo liée`, "Seuils appliqués : température ≥ 28°C ou humidité < 40%"],
    })
  }

  const phytotoxicityByTreatment = new Map<string, number>()
  for (const observation of input.observations) {
    if (!(observation.treatment_reaction ?? []).some((code) => code === "phytotoxicite_legere" || code === "phytotoxicite_forte")) continue
    for (const treatment of observation.treatment_applied ?? []) {
      phytotoxicityByTreatment.set(treatment, (phytotoxicityByTreatment.get(treatment) ?? 0) + 1)
    }
  }
  for (const [treatment, count] of phytotoxicityByTreatment) {
    if (count < 2) continue
    addFinding(findings, {
      id: `treatment-reaction-${treatment}`,
      severity: "warning",
      title: "Réactions phytotoxiques répétées",
      finding: `${count} observations structurées signalent une phytotoxicité après « ${treatment} ».`,
      recommendation: "Suspendre toute généralisation automatique et vérifier les fiches individuelles, les dates et les conditions d’application.",
      evidence: [`${count} réactions phytotoxiques codées`, `Traitement associé : ${treatment}`],
    })
  }

  const overdue = input.interventions.filter((intervention) => {
    const program = programById.get(intervention.program_id)
    return !intervention.done && intervention.due_date != null && intervention.due_date < today && program?.program_type !== "curatif"
  })
  if (overdue.length > 0) {
    addFinding(findings, {
      id: "overdue-field-programs",
      severity: "info",
      title: "Interventions collectives en retard",
      finding: `${overdue.length} interventions préventives ou de fertilisation ont dépassé leur échéance et restent non validées.`,
      recommendation: "Ouvrir l’agenda de la zone, vérifier si l’intervention a été réalisée, puis consigner son résultat ou replanifier.",
      evidence: [`${overdue.length} échéances non réalisées`, `Calculé au ${today}`],
    })
  }

  const germinated = input.seeds.filter((seed) => seed.status === "germinated" || seed.germination_date != null).length
  if (input.seeds.length >= 10) {
    const rate = Math.round((germinated / input.seeds.length) * 100)
    if (rate < 30) {
      addFinding(findings, {
        id: "low-germination-rate",
        severity: "info",
        title: "Taux de levée faible dans les graines suivies",
        finding: `${germinated}/${input.seeds.length} graines ont une levée validée (${rate}%).`,
        recommendation: "Comparer les lots par croisement, fruit, date et méthode de stratification avant de tirer une conclusion.",
        evidence: [`${input.seeds.length} graines suivies`, `${germinated} levées validées`, "Règle activée à partir de 10 graines et sous 30% de levée"],
      })
    }
  }

  if (findings.length === 0) {
    findings.push({
      id: "no-rule-triggered",
      severity: "info",
      title: "Aucune règle d’alerte déclenchée",
      finding: "Les seuils du moteur expert n’ont pas identifié de signal récurrent dans les données structurées disponibles.",
      recommendation: "Poursuivre les observations datées et les liaisons météo pour enrichir les comparaisons futures.",
      evidence: [`${input.observations.length} observations`, `${input.seeds.length} graines suivies`, `${input.interventions.length} interventions`],
    })
  }

  return {
    findings,
    recordsAnalyzed: input.observations.length + input.seeds.length + input.interventions.length,
    warning: null,
  }
}

export async function fetchRuleBilan(): Promise<RuleBilan> {
  const [observations, programs, interventions, weather, seeds] = await Promise.all([
    supabase.from("field_observations").select("id,observation_date,greenhouse_id,greenhouse_table_id,parcelle_id,weather_daily_id,disease_pressure,pests,climate_behavior,treatment_applied,treatment_reaction").order("observation_date", { ascending: false }).limit(2000),
    supabase.from("field_programs").select("id,program_type,product_name").limit(1000),
    supabase.from("field_interventions").select("id,program_id,due_date,done,done_date").limit(2000),
    supabase.from("weather_daily").select("id,temperature,humidity").limit(2000),
    supabase.from("harvested_seeds").select("fruit_id,status,germination_date").limit(5000),
  ])
  const failed = [observations, programs, interventions, weather, seeds].find((result) => result.error)
  if (failed?.error) {
    return {
      findings: [],
      recordsAnalyzed: 0,
      warning: `Moteur expert indisponible : ${failed.error.message}`,
    }
  }
  return evaluateBilanRules({
    observations: (observations.data ?? []) as ObservationRow[],
    programs: (programs.data ?? []) as ProgramRow[],
    interventions: (interventions.data ?? []) as InterventionRow[],
    weather: (weather.data ?? []) as WeatherRow[],
    seeds: (seeds.data ?? []) as HarvestedSeedRow[],
  })
}