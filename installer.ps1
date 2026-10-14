# Installe la livraison "serre-parcelle-v3" dans le projet.
# 1) Telechargez serre-parcelle-v3.zip (il reste dans Telechargements, pas besoin de le decompresser).
# 2) Lancez ce script depuis la racine du projet (le dossier qui contient package.json) :
#       .\installer.ps1
# Le script decompresse le zip, copie chaque fichier a sa place, verifie que c'est la bonne
# version, puis lance la verification de types (npx tsc --noEmit).

$racine = (Get-Location).Path
if (-not (Test-Path (Join-Path $racine "package.json"))) {
  Write-Host "ERREUR : lancez ce script depuis la racine du projet (package.json introuvable ici)."
  exit 1
}

$zip = $null
foreach ($dossier in @("$env:USERPROFILE\Downloads", "$env:USERPROFILE\Desktop", $racine)) {
  if (Test-Path $dossier) {
    $zip = Get-ChildItem $dossier -Filter "serre-parcelle-v3*.zip" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($zip) { break }
  }
}
if (-not $zip) {
  Write-Host "ERREUR : serre-parcelle-v3.zip introuvable (cherche dans Telechargements, Bureau et le projet)."
  exit 1
}
Write-Host ("Zip utilise : " + $zip.FullName)

$tmp = Join-Path $env:TEMP "serre-parcelle-v3"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Expand-Archive -Path $zip.FullName -DestinationPath $tmp -Force

# fichier = chemin dans le projet ; marque = texte propre a la bonne version
$fichiers = @(
  @{ f = "lib/domain/fieldLabels.ts";                              m = "SUBSTRATE_LABELS" },
  @{ f = "lib/domain/programTemplates.ts";                         m = "PARCELLE_CALENDAR" },
  @{ f = "lib/domain/treatmentMatrix.ts";                          m = "SIGNAL_RULES" },
  @{ f = "app/parcelle/types.ts";                                  m = "harvest_date?: string | null" },
  @{ f = "app/globals.css";                                        m = "--border-strong" },
  @{ f = "components/ui/button.tsx";                               m = "border-border-strong" },
  @{ f = "lib/services/suggestionEngine.ts";                       m = "weatherSuggestions" },
  @{ f = "lib/services/treatmentPlanner.ts";                       m = "planTreatment" },
  @{ f = "lib/services/programService.ts";                         m = "acceptPlan" },
  @{ f = "lib/services/plantTimeline.ts";                          m = '"tache" | "observation" | "croisement"' },
  @{ f = "lib/services/plantSheetService.ts";                      m = "export async function weatherIdFor" },
  @{ f = "lib/services/plantGrouping.ts";                          m = "groupPlantings" },
  @{ f = "lib/services/seedLotRules.ts";                           m = "withOriginDates" },
  @{ f = "lib/services/placementService.ts";                       m = "rankZones" },
  @{ f = "components/breeding/parcelle/suggestions-ui.tsx";        m = "onOpenPlan" },
  @{ f = "components/breeding/parcelle/treatment-plan-dialog.tsx"; m = "TreatmentPlanDialog" },
  @{ f = "components/breeding/parcelle/zone-program-panel.tsx";    m = "acceptPlan" },
  @{ f = "components/breeding/parcelle/plant-sheet.tsx";           m = "pendingPlanKey" },
  @{ f = "components/breeding/parcelle/zone-view.tsx";             m = "groupPlantings" },
  @{ f = "components/breeding/parcelle/zone-workspace.tsx";        m = "plantScope" },
  @{ f = "components/breeding/parcelle/observations-section.tsx";  m = "SavedObservation" },
  @{ f = "components/breeding/parcelle/place-in-zone-dialog.tsx";  m = "PlaceInZoneDialog" },
  @{ f = "components/breeding/parcelle/parents-to-place.tsx";      m = "ParentsToPlace" },
  @{ f = "components/breeding/serre/seed-lot-picker.tsx";          m = "SeedLotPicker" }
)

$erreurs = 0
foreach ($x in $fichiers) {
  $source = Join-Path $tmp $x.f
  $cible  = Join-Path $racine ($x.f -replace "/", "\")
  if (-not (Test-Path $source)) { Write-Host ("MANQUE DANS LE ZIP  " + $x.f); $erreurs++; continue }
  if (-not (Select-String -Path $source -SimpleMatch -Pattern $x.m -Quiet)) { Write-Host ("ZIP PAS A JOUR      " + $x.f); $erreurs++; continue }
  if ((Test-Path $cible) -and (Select-String -Path $cible -SimpleMatch -Pattern $x.m -Quiet)) {
    if ((Get-FileHash $source).Hash -eq (Get-FileHash $cible).Hash) { Write-Host ("DEJA A JOUR  " + $x.f); continue }
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $cible) | Out-Null
  Copy-Item $source $cible -Force
  if (Select-String -Path $cible -SimpleMatch -Pattern $x.m -Quiet) { Write-Host ("COPIE        " + $x.f) }
  else { Write-Host ("ECHEC COPIE  " + $x.f); $erreurs++ }
}

Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
if ($erreurs -gt 0) { Write-Host ""; Write-Host ($erreurs.ToString() + " probleme(s). Envoyez-moi cette sortie."); exit 2 }

Write-Host ""
Write-Host "Tous les fichiers sont en place. Verification des types (npx tsc --noEmit)..."
& npx tsc --noEmit
if ($LASTEXITCODE -eq 0) { Write-Host "OK : aucune erreur de types." } else { Write-Host "Des erreurs de types sont affichees ci-dessus : envoyez-les moi." }
