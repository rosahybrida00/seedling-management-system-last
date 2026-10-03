// ---------------------------------------------------------------------------
// fertilityService — couches 1 et 2 de la page Bilans.
//
// Couche 1 : chaque taux est accompagné de son effectif et d'un intervalle de
//            confiance (Wilson, 95 %), pour ne jamais afficher un pourcentage
//            sans dire sur combien de cas il repose.
// Couche 2 : « fertilité réelle » d'un couple de parents (mère × père),
//            comparée aux autres croisements des mêmes parents, sans seuil
//            arbitraire ni note pondérée.
//
// Toutes les fonctions sont pures (aucun accès Supabase) : elles reçoivent des
// lignes déjà chargées et sont testables isolément.
// ---------------------------------------------------------------------------

export type Reliability = "insuffisant" | "faible" | "correct"

export interface RateWithCI {
  successes: number
  total: number
  /** Pourcentage 0-100 arrondi à 0,1, ou null si total = 0. */
  rate: number | null
  low: number | null
  high: number | null
  reliability: Reliability
}

/** En dessous de MIN_TOTAL, aucune conclusion n'est affichée. */
export const MIN_TOTAL = 5
/** En dessous de GOOD_TOTAL, l'intervalle est très large : fiabilité « faible ». */
export const GOOD_TOTAL = 20

const Z_95 = 1.96

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function reliabilityFor(total: number): Reliability {
  if (total < MIN_TOTAL) return "insuffisant"
  if (total < GOOD_TOTAL) return "faible"
  return "correct"
}

/**
 * Taux avec intervalle de Wilson à 95 %. `successes` est borné à [0, total] :
 * une donnée incohérente (plus de fruits que de fleurs saisies) ne produit
 * jamais un taux supérieur à 100 %.
 */
export function wilsonRate(successes: number, total: number): RateWithCI {
  const n = Math.max(0, Math.floor(total))
  const s = Math.min(Math.max(0, Math.floor(successes)), n)
  if (n === 0) {
    return { successes: 0, total: 0, rate: null, low: null, high: null, reliability: "insuffisant" }
  }
  const p = s / n
  const z2 = Z_95 * Z_95
  const denom = 1 + z2 / n
  const centre = (p + z2 / (2 * n)) / denom
  const half = (Z_95 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom
  return {
    successes: s,
    total: n,
    rate: round1(p * 100),
    low: round1(Math.max(0, centre - half) * 100),
    high: round1(Math.min(1, centre + half) * 100),
    reliability: reliabilityFor(n),
  }
}

// ----------------------------- Couche 2 -------------------------------------

export interface LotInput {
  id: string
  seedParent: string | null
  pollenParent: string | null
  flowerCount: number | null
}

export interface FruitInput {
  crossId: string
  /** Fruit mené à la récolte (récolté ou vide) ; les fruits avortés ne sont pas fournis. */
  isEmpty: boolean
  seedCount: number
}

export type Verdict = "superieur" | "comparable" | "inferieur" | "sans_reference" | "insuffisant"
export type ReferenceKind = "parents" | "global" | "aucune"

export interface PeerReference {
  label: string
  couples: number
  flowers: number
  fertile: RateWithCI
}

export interface CoupleFertility {
  key: string
  seedParent: string
  pollenParent: string
  lots: number
  flowers: number
  /** Fruits noués (récoltés, vides compris) / fleurs pollinisées. */
  nouaison: RateWithCI
  /** Fruits contenant au moins une graine / fleurs pollinisées : la fertilité réelle. */
  fertile: RateWithCI
  seedsPerFruit: number | null
  motherPeers: PeerReference
  fatherPeers: PeerReference
  globalPeers: PeerReference
  reference: ReferenceKind
  /** Écart en points de pourcentage par rapport à la référence retenue. */
  deltaPoints: number | null
  verdict: Verdict
}

interface CoupleAccum {
  key: string
  seedParent: string
  pollenParent: string
  lots: number
  flowers: number
  fruitsSet: number
  fertileFruits: number
  seeds: number
}

function coupleKey(seedParent: string, pollenParent: string): string {
  return `${seedParent.trim().toLowerCase()}×${pollenParent.trim().toLowerCase()}`
}

function pool(label: string, couples: CoupleAccum[]): PeerReference {
  const flowers = couples.reduce((sum, c) => sum + c.flowers, 0)
  const fertile = couples.reduce((sum, c) => sum + c.fertileFruits, 0)
  return { label, couples: couples.length, flowers, fertile: wilsonRate(fertile, flowers) }
}

/**
 * Verdict prudent : « supérieur » ou « inférieur » uniquement si les deux
 * intervalles de confiance ne se chevauchent pas. Sinon l'écart est
 * considéré comme non significatif (« comparable »).
 */
export function compareRates(own: RateWithCI, ref: RateWithCI): Verdict {
  if (own.reliability === "insuffisant") return "insuffisant"
  if (ref.reliability === "insuffisant" || own.low == null || own.high == null || ref.low == null || ref.high == null) {
    return "sans_reference"
  }
  if (own.low > ref.high) return "superieur"
  if (own.high < ref.low) return "inferieur"
  return "comparable"
}

export function buildCoupleFertility(lots: LotInput[], fruits: FruitInput[]): CoupleFertility[] {
  const fruitsByLot = new Map<string, FruitInput[]>()
  for (const fruit of fruits) {
    const list = fruitsByLot.get(fruit.crossId) ?? []
    list.push(fruit)
    fruitsByLot.set(fruit.crossId, list)
  }

  const couples = new Map<string, CoupleAccum>()
  for (const lot of lots) {
    // Un croisement sans les deux parents ne peut pas être comparé à ses pairs.
    if (!lot.seedParent?.trim() || !lot.pollenParent?.trim()) continue
    const key = coupleKey(lot.seedParent, lot.pollenParent)
    let acc = couples.get(key)
    if (!acc) {
      acc = {
        key,
        seedParent: lot.seedParent.trim(),
        pollenParent: lot.pollenParent.trim(),
        lots: 0,
        flowers: 0,
        fruitsSet: 0,
        fertileFruits: 0,
        seeds: 0,
      }
      couples.set(key, acc)
    }
    acc.lots += 1
    acc.flowers += lot.flowerCount ?? 0
    for (const fruit of fruitsByLot.get(lot.id) ?? []) {
      acc.fruitsSet += 1
      acc.seeds += fruit.seedCount
      if (!fruit.isEmpty) acc.fertileFruits += 1
    }
  }

  const all = Array.from(couples.values())

  return all
    .map((couple): CoupleFertility => {
      const others = all.filter((c) => c.key !== couple.key)
      const sameMother = others.filter((c) => c.seedParent.toLowerCase() === couple.seedParent.toLowerCase())
      const sameFather = others.filter((c) => c.pollenParent.toLowerCase() === couple.pollenParent.toLowerCase())
      // Une mère qui sert aussi de père (ou inversement) reste un parent identique.
      const sameMotherAsFather = others.filter((c) => c.pollenParent.toLowerCase() === couple.seedParent.toLowerCase())
      const sameFatherAsMother = others.filter((c) => c.seedParent.toLowerCase() === couple.pollenParent.toLowerCase())

      const motherPeers = pool(`${couple.seedParent} avec d'autres pères`, sameMother)
      const fatherPeers = pool(`${couple.pollenParent} avec d'autres mères`, sameFather)
      const globalPeers = pool("Tous les autres croisements", others)

      const parentGroup = new Map<string, CoupleAccum>()
      for (const c of [...sameMother, ...sameFather, ...sameMotherAsFather, ...sameFatherAsMother]) parentGroup.set(c.key, c)
      const parentsPeers = pool("Autres croisements des mêmes parents", Array.from(parentGroup.values()))

      const nouaison = wilsonRate(couple.fruitsSet, couple.flowers)
      const fertile = wilsonRate(couple.fertileFruits, couple.flowers)

      let reference: ReferenceKind = "aucune"
      let chosen: PeerReference | null = null
      if (parentsPeers.fertile.reliability !== "insuffisant") {
        reference = "parents"
        chosen = parentsPeers
      } else if (globalPeers.fertile.reliability !== "insuffisant") {
        reference = "global"
        chosen = globalPeers
      }

      const verdict = chosen ? compareRates(fertile, chosen.fertile) : fertile.reliability === "insuffisant" ? "insuffisant" : "sans_reference"
      const deltaPoints =
        chosen && fertile.rate != null && chosen.fertile.rate != null && fertile.reliability !== "insuffisant"
          ? round1(fertile.rate - chosen.fertile.rate)
          : null

      return {
        key: couple.key,
        seedParent: couple.seedParent,
        pollenParent: couple.pollenParent,
        lots: couple.lots,
        flowers: couple.flowers,
        nouaison,
        fertile,
        seedsPerFruit: couple.fruitsSet > 0 ? round1(couple.seeds / couple.fruitsSet) : null,
        motherPeers,
        fatherPeers,
        globalPeers,
        reference,
        deltaPoints,
        verdict,
      }
    })
    .sort((a, b) => {
      // Les couples exploitables d'abord, puis par taux de fertilité décroissant.
      const aReady = a.fertile.reliability === "insuffisant" ? 1 : 0
      const bReady = b.fertile.reliability === "insuffisant" ? 1 : 0
      if (aReady !== bReady) return aReady - bReady
      return (b.fertile.rate ?? -1) - (a.fertile.rate ?? -1)
    })
}
