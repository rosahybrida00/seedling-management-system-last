// ---------------------------------------------------------------------------
// nomenclature — génération des codes de traçabilité Rosa Hybrida.
//
// 1. Racine phonétique (base_syllable) : extraite des noms des parents.
//    Ex: Black Baccara × Golden Perfumella → "blapego"
//
// 2. Code Lot (lettre majuscule) : [base]-[LotLettre]        ex: blapego-A
// 3. Code Fruit (lettre minuscule) : [base]-[LotLettre]-[fleurLettre]
//                                                          ex: blapego-A-a
// 4. Nom de graine (numéro) : [codeFruit]-[numéro]         ex: blapego-A-a-1
//
// Aucune année n'est insérée dans le code : la traçabilité temporelle est
// portée par les dates enregistrées sur le lot et le fruit, pas par le nom.
// ---------------------------------------------------------------------------

function extractSyllables(name: string): string {
  if (!name) return "xx"
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
  if (!cleaned) return "xx"

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 0) return "xx"

  const firstWord = words[0]
  if (firstWord.length >= 5) {
    return firstWord.slice(0, 3)
  }
  if (words.length >= 2) {
    const second = words[1]
    const s1 = firstWord.slice(0, Math.min(3, firstWord.length))
    const s2 = second.slice(0, Math.min(3, second.length))
    return s1 + s2
  }
  return firstWord.slice(0, Math.min(6, firstWord.length))
}

/** Racine phonétique du couple de parents (ex: "blapego"). */
export function generateBaseSyllable(seedParent: string, pollenParent: string): string {
  const syll1 = extractSyllables(seedParent)
  const syll2 = extractSyllables(pollenParent)
  return syll1 + syll2
}

/** Clé unique et stable d'un couple, indépendante de la casse. */
export function pairKey(seedParent: string, pollenParent: string): string {
  return `${(seedParent ?? "").trim().toLowerCase()}×${(pollenParent ?? "").trim().toLowerCase()}`
}

export function lotLetter(index: number): string {
  if (index < 0) return "A"
  return String.fromCharCode(65 + index)
}

export function flowerLetter(index: number): string {
  if (index < 0) return "a"
  return String.fromCharCode(97 + index)
}

/** Inverse de `lotLetter` : "A" -> 0, "B" -> 1, ... */
export function lotIndexFromLetter(letter: string | null | undefined): number {
  if (!letter) return 0
  const code = letter.trim().toUpperCase().charCodeAt(0)
  return Number.isNaN(code) ? 0 : Math.max(0, code - 65)
}

/** Inverse de `flowerLetter` : "a" -> 0, "b" -> 1, ... */
export function flowerIndexFromLetter(letter: string | null | undefined): number {
  if (!letter) return 0
  const code = letter.trim().toLowerCase().charCodeAt(0)
  return Number.isNaN(code) ? 0 : Math.max(0, code - 97)
}

/** Code du lot : base-LotLettre (ex: blapego-A). */
export function generateLotCode(baseSyllable: string, lotIndex: number): string {
  return `${baseSyllable}-${lotLetter(lotIndex)}`
}

/** Code du fruit : base-LotLettre-fleurLettre (ex: blapego-A-a). Aucune année. */
export function generateFruitCode(baseSyllable: string, lotIndex: number, flowerIndex: number): string {
  return `${generateLotCode(baseSyllable, lotIndex)}-${flowerLetter(flowerIndex)}`
}

/**
 * Nom final de la graine récoltée : codeFruit-numéro-année (ex:
 * blapego-A-a-1-2026). L'année est celle de la récolte de CE fruit, ajoutée
 * en dernier segment : la lettre de lot et la lettre de fruit continuent de
 * s'incrémenter normalement d'une année sur l'autre pour un même couple de
 * parents (plusieurs lots la même année : B, C... ; l'année ne fait
 * qu'identifier la graine, elle ne réinitialise aucun compteur).
 */
export function generateSeedName(fruitCode: string, seedNumber: number, harvestYear: number): string {
  const cleanFruitCode = fruitCode.replace(/-+$/, "")
  return `${cleanFruitCode}-${seedNumber}-${harvestYear}`
}
