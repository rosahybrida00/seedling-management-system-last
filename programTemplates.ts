// ---------------------------------------------------------------------------
// Calendriers prêts à l'emploi (modèles de programmes) pour Serres & Parcelles.
//
// Source : le calendrier annuel de référence fourni par l'utilisateur pour la
// culture de rosiers en plein air. Les produits ne sont jamais saisis en texte :
// chaque action pointe vers un code des listes fermées de fieldLabels.ts
// (FIELD_TREATMENT_LABELS pour les traitements, FERTILIZER_LABELS pour les
// amendements).
//
// Le calendrier est ancré sur des MOIS, pas sur des « J+n » : les décalages J+n
// du calendrier d'origine ne correspondent pas aux mois indiqués (J+180 tombe
// en septembre, pas en novembre). Les J+n sont conservés à titre indicatif.
//
// Aucune dose n'est codée : elle dépend du produit et de l'étiquette.
// ---------------------------------------------------------------------------

import { FERTILIZER_LABELS, FIELD_TREATMENT_LABELS } from "@/lib/domain/fieldLabels"

export type TemplateScope = "parcelle" | "serre"

/** "hygiene" = opération sans produit (ramassage, nettoyage) ; ce type d'action n'existe pas encore en base. */
export type ActionKind = "preventif" | "fertilisation" | "hygiene"

export interface TemplateAction {
  kind: ActionKind
  /** Codes de la liste fermée correspondante. Vide pour une action d'hygiène. */
  products: string[]
  /** "un_parmi" : l'utilisateur choisit un produit ; "tous" : appliqués ensemble. */
  mode: "un_parmi" | "tous"
  /** Faux = « si nécessaire » : proposée mais ignorable sans justification. */
  required: boolean
  /** Intitulé de l'opération, obligatoire pour une action d'hygiène. */
  task?: string
}

export interface TemplateStep {
  id: string
  label: string
  reason: string
  /** Mois de début (1-12) de la fenêtre d'application. */
  month: number
  /** Mois de fin si la fenêtre couvre plusieurs mois (peut passer l'année : 12 -> 2). */
  endMonth?: number
  /** Décalage indicatif (jours) depuis la fin de taille, tel que donné dans le calendrier d'origine. */
  offsetDays: number | null
  actions: TemplateAction[]
  /** Produit sensible à la chaleur : le moteur climatique devra éviter les pics de température. */
  heatSensitive?: boolean
  hint?: string
}

export interface ProgramTemplate {
  id: string
  scope: TemplateScope
  name: string
  description: string
  /** Modèle dérivé sans validation agronomique propre à ce contexte. */
  draft: boolean
  steps: TemplateStep[]
}

// --------------------------- Plein air (Parcelle) ---------------------------

const PARCELLE_STEPS: TemplateStep[] = [
  {
    id: "taille-fertilisation",
    label: "Fin de taille : fertilisation de fond et nettoyage",
    reason:
      "Engrais organique complet ou à libération lente au pied de chaque plant, puis bouillie bordelaise après la taille pour cicatriser les coupes et éliminer les spores hivernales.",
    month: 3,
    offsetDays: 0,
    actions: [
      { kind: "fertilisation", products: ["engrais_rosiers"], mode: "un_parmi", required: true },
      { kind: "preventif", products: ["bouillie_bordelaise"], mode: "un_parmi", required: true },
    ],
  },
  {
    id: "debourrement-ravageurs",
    label: "Débourrement : protection contre les premiers ravageurs",
    reason: "Préventif pour bloquer l'arrivée des pucerons sur les jeunes pousses tendres.",
    month: 4,
    offsetDays: 21,
    actions: [{ kind: "preventif", products: ["savon_noir", "purin_ortie"], mode: "un_parmi", required: true }],
  },
  {
    id: "bouclier-fongique",
    label: "Bouclier fongique (mildiou, oïdium)",
    reason: "Montée en température et en humidité : renforcer les parois cellulaires face aux pluies de mai.",
    month: 5,
    offsetDays: 45,
    heatSensitive: true,
    actions: [{ kind: "preventif", products: ["soufre", "purin_prele"], mode: "un_parmi", required: true }],
  },
  {
    id: "floraison-fruits",
    label: "Pleine floraison : soutien des fruits d'hybridation",
    reason: "Potassium et phosphore pour la formation des cynorrhodons et la vigueur générale.",
    month: 6,
    offsetDays: 75,
    actions: [{ kind: "fertilisation", products: ["amendement_potassique_phosphore"], mode: "un_parmi", required: true }],
  },
  {
    id: "veille-oidium-acariens",
    label: "Période chaude et sèche : veille oïdium et acariens",
    reason: "À appliquer en fin de journée, hors fortes chaleurs directes.",
    month: 7,
    offsetDays: 100,
    heatSensitive: true,
    actions: [{ kind: "preventif", products: ["soufre", "bicarbonate_sodium"], mode: "un_parmi", required: true }],
  },
  {
    id: "orages-estivaux",
    label: "Orages estivaux : stimuler les défenses naturelles",
    reason: "Alternance chaud/humide : renforcer les défenses des plants en plein air.",
    month: 8,
    offsetDays: 120,
    actions: [{ kind: "preventif", products: ["purin_prele"], mode: "un_parmi", required: true }],
  },
  {
    id: "rempart-marsonia",
    label: "Rempart contre la marsonia (taches noires)",
    reason: "Début des pluies d'automne : freiner la propagation de la maladie des taches noires, très fréquente sur les rosiers en extérieur à cette saison.",
    month: 9,
    offsetDays: 150,
    actions: [{ kind: "preventif", products: ["bouillie_bordelaise"], mode: "un_parmi", required: true }],
  },
  {
    id: "hygiene-fin-de-cycle",
    label: "Chute des feuilles : hygiène de parcelle",
    reason: "Amendement minéral de fin de cycle si nécessaire, et ramassage rigoureux des feuilles tombées pour ne pas laisser hiverner les champignons.",
    month: 11,
    offsetDays: 180,
    actions: [
      { kind: "fertilisation", products: ["amendement_mineral"], mode: "un_parmi", required: false },
      { kind: "hygiene", products: [], mode: "un_parmi", required: true, task: "Ramasser les feuilles tombées au sol" },
    ],
  },
  {
    id: "traitement-hiver",
    label: "Dormance : traitement d'hiver",
    reason: "Nettoyer le bois et le sol avant le nouveau cycle.",
    month: 12,
    endMonth: 2,
    offsetDays: null,
    hint: "Traitement d'hiver, plus concentré qu'en saison : dosage selon l'étiquette du produit.",
    actions: [{ kind: "preventif", products: ["huile_neem", "bouillie_bordelaise"], mode: "un_parmi", required: true }],
  },
]

export const PARCELLE_CALENDAR: ProgramTemplate = {
  id: "parcelle-annuel-rosiers",
  scope: "parcelle",
  name: "Calendrier annuel : rosiers en plein air",
  description: "Hybridation et culture de rosiers en plein air, de la taille de mars au traitement d'hiver.",
  draft: false,
  steps: PARCELLE_STEPS,
}

// ------------------------------ Serre (brouillon) ---------------------------

// Même séquence que le plein air, avec les seuls libellés liés à la pluie ou à
// l'extérieur reformulés. Les différences agronomiques propres à la serre
// (ventilation, humidité constante, absence de gel) ne sont pas inventées :
// le modèle reste un brouillon jusqu'à validation.
const SERRE_REASON_OVERRIDES: Record<string, string> = {
  "bouclier-fongique": "Montée en température et en humidité : renforcer les parois cellulaires face à la pression fongique.",
  "orages-estivaux": "Alternance chaud/humide : renforcer les défenses des plants.",
  "rempart-marsonia": "Début de l'automne : freiner la propagation de la maladie des taches noires.",
}

export const SERRE_CALENDAR: ProgramTemplate = {
  id: "serre-annuel-rosiers",
  scope: "serre",
  name: "Calendrier annuel : rosiers en serre (brouillon)",
  description: "Adapté du calendrier de plein air ; à valider avec vos pratiques de serre.",
  draft: true,
  steps: PARCELLE_STEPS.map((step) => ({
    ...step,
    reason: SERRE_REASON_OVERRIDES[step.id] ?? step.reason,
  })),
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [PARCELLE_CALENDAR, SERRE_CALENDAR]

export function templatesForScope(scope: TemplateScope): ProgramTemplate[] {
  return PROGRAM_TEMPLATES.filter((template) => template.scope === scope)
}

// ------------------------------ Libellés & contrôle -------------------------

export function productLabel(kind: ActionKind, code: string): string {
  const list = kind === "fertilisation" ? FERTILIZER_LABELS : FIELD_TREATMENT_LABELS
  return list[code] ?? code
}

/**
 * Vérifie qu'un modèle ne référence que des produits existants et que ses
 * fenêtres sont valides. Retourne la liste des problèmes (vide = modèle sain).
 */
export function validateTemplate(template: ProgramTemplate): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  for (const step of template.steps) {
    if (seen.has(step.id)) problems.push(`Étape en double : ${step.id}`)
    seen.add(step.id)
    if (!Number.isInteger(step.month) || step.month < 1 || step.month > 12) problems.push(`${step.id} : mois de début invalide`)
    if (step.endMonth != null && (!Number.isInteger(step.endMonth) || step.endMonth < 1 || step.endMonth > 12)) {
      problems.push(`${step.id} : mois de fin invalide`)
    }
    if (step.actions.length === 0) problems.push(`${step.id} : aucune action`)
    for (const action of step.actions) {
      if (action.kind === "hygiene") {
        if (!action.task) problems.push(`${step.id} : action d'hygiène sans intitulé`)
        continue
      }
      if (action.products.length === 0) problems.push(`${step.id} : action sans produit`)
      const list = action.kind === "fertilisation" ? FERTILIZER_LABELS : FIELD_TREATMENT_LABELS
      for (const code of action.products) {
        if (!(code in list)) problems.push(`${step.id} : produit inconnu « ${code} » (${action.kind})`)
      }
    }
  }
  return problems
}

export interface PlannedStep {
  step: TemplateStep
  /** Date proposée (AAAA-MM-JJ) : le jour demandé du mois de début de la fenêtre. */
  date: string
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Dates proposées pour une saison. Chaque étape reçoit le jour demandé du mois
 * de début de sa fenêtre (limité à la longueur du mois). L'utilisateur peut
 * ensuite décaler chaque date. Résultat trié par date.
 */
export function planSeason(template: ProgramTemplate, year: number, dayOfMonth: number = 15): PlannedStep[] {
  return template.steps
    .map((step) => {
      const day = Math.min(Math.max(1, Math.floor(dayOfMonth)), lastDayOfMonth(year, step.month))
      return { step, date: `${year}-${pad(step.month)}-${pad(day)}` }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}
