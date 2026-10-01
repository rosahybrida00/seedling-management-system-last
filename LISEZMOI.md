# Correctifs — Architecture Croisement + Serre + Météo historique + refonte UI

Copiez ces fichiers par-dessus les mêmes chemins du dépôt, dans cet ordre :

1. Migrations SQL sur Supabase, dans l'ordre :
   - `supabase/migrations/20260923090000_010_fix_croisement_architecture.sql`
   - Ne PAS rejouer `20260923150000_011_bridge_serre.sql` (obsolète, gardée
     pour mémoire seulement)
   - `supabase/migrations/20260923180000_012_bridge_serre_v2.sql`
   - `supabase/migrations/20260924090000_013_weather_history_pistil.sql`
     (historique météo quotidien, observation du pistil, date+météo sur
     les lots de pollen)
2. `lib/domain/nomenclature.ts`
3. `lib/domain/supabase-types.ts`
4. `lib/services/weatherService.ts` (nouveau — point d'entrée météo unique
   de l'appli, à utiliser partout au lieu d'appeler open-meteo en direct)
5. `app/croisement/page.tsx`
6. `app/serre/page.tsx`
7. `app/meteo/page.tsx` (enregistre désormais la météo du jour dans
   l'historique au lieu de la relire à chaque fois)
8. `lib/services/statsService.ts`
9. `npm run build` avant de déployer (non exécuté ici).

Voir le message de chat pour le détail des changements de cette passe et
ce qui reste ouvert (module Parcelle toujours non retrouvé dans le code ;
un vrai enregistrement automatique quotidien de la météo demanderait à
terme une tâche planifiée côté serveur, pas seulement "au premier accès
du jour" comme c'est fait ici).
