# Copie les fichiers qui n'ont pas ete remplaces lors de la copie du dossier.
# A lancer depuis la racine du projet (le dossier qui contient package.json).
# Le script cherche chaque fichier dans Telechargements et Bureau, et ne retient
# que la bonne version : toutes les "marques" listees doivent etre presentes.

$racine = (Get-Location).Path
if (-not (Test-Path (Join-Path $racine "package.json"))) {
  Write-Host "ERREUR : lancez ce script depuis la racine du projet (package.json introuvable ici)."
  exit 1
}

$fichiers = @(
  @{ nom = "fieldLabels.ts";           marques = @("SUBSTRATE_LABELS", "CULTURE_TYPE_LABELS");                     dest = "lib\domain\fieldLabels.ts" },
  @{ nom = "programTemplates.ts";      marques = @("PARCELLE_CALENDAR", "SERRE_CALENDAR");                          dest = "lib\domain\programTemplates.ts" },
  @{ nom = "types.ts";                 marques = @("export interface FieldPlanting", "harvest_date?: string | null", "template_step_id?: string | null"); dest = "app\parcelle\types.ts" },
  @{ nom = "observations-section.tsx"; marques = @("showList", "startOpen");                                        dest = "components\breeding\parcelle\observations-section.tsx" },
  @{ nom = "plantTimeline.ts";         marques = @('"tache" | "observation" | "croisement"');                       dest = "lib\services\plantTimeline.ts" },
  @{ nom = "plantSheetService.ts";     marques = @("export async function weatherIdFor");                           dest = "lib\services\plantSheetService.ts" },
  @{ nom = "zone-workspace.tsx";       marques = @("withOriginDates", "tasksAvailable", "ParentsToPlace");          dest = "components\breeding\parcelle\zone-workspace.tsx" }
)

function Test-Marques($chemin, $marques) {
  foreach ($m in $marques) {
    if (-not (Select-String -Path $chemin -SimpleMatch -Pattern $m -Quiet)) { return $false }
  }
  return $true
}

$dossiers = @("$env:USERPROFILE\Downloads", "$env:USERPROFILE\Desktop")
$candidats = foreach ($dossier in $dossiers) {
  if (Test-Path $dossier) {
    Get-ChildItem $dossier -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { ($_.Extension -eq ".ts" -or $_.Extension -eq ".tsx") -and $_.FullName -notmatch "node_modules" }
  }
}

$manquants = 0
foreach ($f in $fichiers) {
  $cible = Join-Path $racine $f.dest
  $dejaBon = (Test-Path $cible) -and (Test-Marques $cible $f.marques)
  if ($dejaBon) { Write-Host ("DEJA A JOUR  " + $f.dest); continue }

  $trouve = $candidats |
    Where-Object { $_.Name -eq $f.nom -and $_.FullName -ne $cible -and (Test-Marques $_.FullName $f.marques) } |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

  if (-not $trouve) {
    Write-Host ("INTROUVABLE  " + $f.nom + "  (telechargez-le depuis la conversation puis relancez)")
    $manquants++
    continue
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $cible) | Out-Null
  Copy-Item $trouve.FullName $cible -Force
  Write-Host ("COPIE        " + $f.dest)
}

if ($manquants -gt 0) { Write-Host ""; Write-Host ($manquants.ToString() + " fichier(s) introuvable(s)."); exit 2 }
Write-Host ""
Write-Host "Termine. Lancez maintenant : npx tsc --noEmit"