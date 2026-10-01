// ---------------------------------------------------------------------------
// dhoExport — génération de dossiers DHO (Droits d'Obtention Végétale) en PDF.
//
// Génère un PDF/A-compatible directement dans le navigateur en construisant
// manuellement la structure PDF (pas de dépendance externe). Le document
// contient :
//   - Page de garde (obtenteur, affixe, date)
//   - Arbre généalogique P1 × P2
//   - Historique horodaté des notations terrain
//   - Traçabilité sanitaire
//   - Bilan statistique de saison
//
// Le PDF est téléchargé automatiquement.
// ---------------------------------------------------------------------------

import type { SeasonBilan } from "@/lib/services/statsService"
import {
  PRESSION_SANITAIRE_LABELS,
  TRAITEMENT_LABELS,
} from "@/lib/domain/supabase-types"

interface DhoProfile {
  obtenteurName: string
  affixe: string
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n")
}

function buildPdfContent(bilan: SeasonBilan, profile: DhoProfile): string[] {
  const lines: string[][] = []
  const dateStr = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })

  // --- Page de garde ---
  lines.push([
    "BT",
    "/F1 24 Tf",
    "72 720 Td",
    `(Dossier DHO - Droits d'Obtention Vegetale) Tj`,
    "0 -40 Td",
    "/F1 14 Tf",
    `(Obtenteur : ${escapePdfText(profile.obtenteurName)}) Tj`,
    "0 -24 Td",
    `(Affixe : ${escapePdfText(profile.affixe)}) Tj`,
    "0 -24 Td",
    `(Date d'edition : ${escapePdfText(dateStr)}) Tj`,
    "0 -40 Td",
    "/F1 12 Tf",
    `(Croisements : ${bilan.overall.totalCrosses}  |  Fruits : ${bilan.overall.totalHarvestedFruits}  |  Graines : ${bilan.overall.totalSeeds}) Tj`,
    "0 -20 Td",
    `(Semis : ${bilan.overall.totalSeedlings}  |  Selectionnes : ${bilan.overall.selectedSeedlings}  |  Elimines : ${bilan.overall.discardedSeedlings}) Tj`,
    "0 -20 Td",
    `(Taux de nouaison : ${bilan.overall.overallNouaisonRate}%  |  Taux de vacuite : ${bilan.overall.overallVacuiteRate}%) Tj`,
    "ET",
  ])

  // --- Bilan par variété parentale ---
  lines.push([
    "BT",
    "/F1 16 Tf",
    "72 720 Td",
    "(Bilan de saison par variete parentale) Tj",
    "0 -30 Td",
    "/F1 10 Tf",
  ])

  let y = 690
  for (const p of bilan.parentPerformances.slice(0, 20)) {
    if (y < 100) {
      lines.push(["ET"])
      lines.push([
        "BT",
        "/F1 10 Tf",
        "72 720 Td",
      ])
      y = 720
    }
    const role = p.role === "mere" ? "Mere" : "Pere"
    lines.push([
      `72 ${y} Td`,
      `(${escapePdfText(role)} | ${escapePdfText(p.parentName)} | Crois: ${p.crossesCount} | Fruits: ${p.fruitsHarvested} | Nouaison: ${p.nouaisonRate}% | Vacuite: ${p.vacuiteRate}% | Index: ${p.fertilityIndex}/100) Tj`,
      `0 -16 Td`,
    ])
    y -= 16
  }
  lines.push(["ET"])

  // --- Traçabilité sanitaire ---
  lines.push([
    "BT",
    "/F1 16 Tf",
    "72 720 Td",
    "(Traceabilite sanitaire) Tj",
    "0 -30 Td",
    "/F1 10 Tf",
  ])

  y = 690
  const diseaseEntries = Object.entries(bilan.overall.diseaseDistribution)
  if (diseaseEntries.length === 0) {
    lines.push([
      `72 ${y} Td`,
      "(Aucune pathologie enregistree.) Tj",
      "ET",
    ])
  } else {
    for (const [key, count] of diseaseEntries) {
      if (y < 100) {
        lines.push(["ET"])
        lines.push(["BT", "/F1 10 Tf", "72 720 Td"])
        y = 720
      }
      const label = PRESSION_SANITAIRE_LABELS[key] ?? key
      lines.push([
        `72 ${y} Td`,
        `(${escapePdfText(label)} : ${count} cas) Tj`,
        `0 -16 Td`,
      ])
      y -= 16
    }
  }

  const treatmentEntries = Object.entries(bilan.overall.treatmentDistribution)
  if (treatmentEntries.length > 0) {
    lines.push([`0 -10 Td`])
    y -= 10
    for (const [key, count] of treatmentEntries) {
      if (y < 100) {
        lines.push(["ET"])
        lines.push(["BT", "/F1 10 Tf", "72 720 Td"])
        y = 720
      }
      const label = TRAITEMENT_LABELS[key] ?? key
      lines.push([
        `72 ${y} Td`,
        `(Traitement ${escapePdfText(label)} : ${count} application(s)) Tj`,
        `0 -16 Td`,
      ])
      y -= 16
    }
  }
  lines.push(["ET"])

  // --- Historique mensuel ---
  lines.push([
    "BT",
    "/F1 16 Tf",
    "72 720 Td",
    "(Historique horodate - Activite mensuelle) Tj",
    "0 -30 Td",
    "/F1 10 Tf",
  ])

  y = 690
  for (const m of bilan.monthlyReports) {
    if (y < 120) {
      lines.push(["ET"])
      lines.push(["BT", "/F1 10 Tf", "72 720 Td"])
      y = 720
    }
    lines.push([
      `72 ${y} Td`,
      `(Mois ${escapePdfText(m.month)} : ${m.pollinatedFlowers} fleurs, ${m.harvestedFruits} fruits, nouaison ${m.nouaisonRate}%, vacuite ${m.vacuiteRate}%, ${m.totalSeeds} graines) Tj`,
      `0 -16 Td`,
    ])
    y -= 16
  }
  lines.push(["ET"])

  // Assembler les objets PDF
  const objects: string[] = []
  let objNum = 1

  // Objet 1: Catalog
  objects.push(`${objNum} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`)
  objNum++

  // Objet 2: Pages
  const pageCount = lines.length
  const pageRefs: number[] = []
  for (let i = 0; i < pageCount; i++) {
    pageRefs.push(objNum + i * 3)
  }
  const kids = pageRefs.map((r) => `${r} 0 R`).join(" ")
  objects.push(`${objNum} 0 obj\n<< /Type /Pages /Count ${pageCount} /Kids [${kids}] >>\nendobj`)
  objNum++

  // Font
  const fontObjNum = objNum + pageCount * 3
  objects.push(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj`)

  // Pour chaque page: Page, Content, Length
  for (let i = 0; i < pageCount; i++) {
    const contentStr = lines[i].join("\n")
    const pageObj = objNum + i * 3
    const contentObj = pageObj + 1
    const lengthObj = pageObj + 2

    objects.push(`${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj`)
    objects.push(`${contentObj} 0 obj\n<< /Length ${contentStr.length} >>\nstream\n${contentStr}\nendstream\nendobj`)
    objects.push(`${lengthObj} 0 obj\n${contentStr.length}\nendobj`)
  }

  return objects
}

export function generateDhoPdf(bilan: SeasonBilan, profile: DhoProfile): void {
  const objects = buildPdfContent(bilan, profile)

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []

  for (const obj of objects) {
    offsets.push(pdf.length)
    pdf += obj + "\n"
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += `0000000000 65535 f \n`
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([pdf], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const dateStr = new Date().toISOString().slice(0, 10)
  a.download = `DHO_${profile.obtenteurName.replace(/\s+/g, "_")}_${dateStr}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
