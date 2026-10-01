export type Language = "fr" | "en"

export const DEFAULT_LANGUAGE: Language = "fr"

/**
 * Dictionnaire de traduction. Couvre la navigation et les sections
 * transverses (Profil, Paramètres, boutons d'options du Catalogue) — les
 * pages métier très denses (Croisement, Serre, Bilans) restent en français
 * pour l'instant et peuvent être ajoutées ici au besoin.
 */
export const TRANSLATIONS = {
  nav_catalogue: { fr: "Catalogue", en: "Catalogue" },
  nav_croisement: { fr: "Croisement", en: "Crossbreeding" },
  nav_serre: { fr: "Serres & parcelles", en: "Greenhouses & plots" },
  nav_meteo: { fr: "Météo", en: "Weather" },
  nav_bilans: { fr: "Bilans", en: "Reports" },
  nav_profil: { fr: "Profil", en: "Profile" },
  nav_parametres: { fr: "Paramètres", en: "Settings" },
  nav_logout: { fr: "Déconnexion", en: "Log out" },

  catalogue_search_placeholder: { fr: "Rechercher (nom, obtenteur, type...)", en: "Search (name, breeder, type...)" },
  catalogue_options: { fr: "Options", en: "Options" },
  catalogue_add: { fr: "Ajouter", en: "Add" },
  catalogue_import: { fr: "Importer", en: "Import" },
  catalogue_export: { fr: "Exporter", en: "Export" },
  catalogue_delete_all: { fr: "Tout supprimer", en: "Delete all" },

  profil_title: { fr: "Profil Utilisateur", en: "User Profile" },
  profil_description: { fr: "Votre fiche d'hybrideur : identité, sécurité et activité.", en: "Your breeder record: identity, security and activity." },
  profil_account_section: { fr: "Compte", en: "Account" },
  profil_security_section: { fr: "Sécurité", en: "Security" },
  profil_activity_section: { fr: "Activité", en: "Activity" },
  profil_email: { fr: "E-mail", en: "Email" },
  profil_member_since: { fr: "Membre depuis", en: "Member since" },
  profil_new_password: { fr: "Nouveau mot de passe", en: "New password" },
  profil_confirm_password: { fr: "Confirmer le mot de passe", en: "Confirm password" },
  profil_change_password: { fr: "Changer le mot de passe", en: "Change password" },
  profil_crosses: { fr: "Croisements", en: "Crosses" },
  profil_seedlings: { fr: "Semis", en: "Seedlings" },
  profil_promoted: { fr: "Promus au catalogue", en: "Promoted to catalogue" },
  profil_varieties: { fr: "Variétés ajoutées", en: "Varieties added" },

  parametres_title: { fr: "Paramètres", en: "Settings" },
  parametres_description: { fr: "Langue, alertes serre, données et support.", en: "Language, greenhouse alerts, data and support." },
  parametres_language_section: { fr: "Langue", en: "Language" },
  parametres_language_hint: { fr: "Change la langue de l'interface immédiatement.", en: "Changes the interface language immediately." },
  parametres_alerts_section: { fr: "Alertes serre", en: "Greenhouse alerts" },
  parametres_alerts_enabled: { fr: "Activer les alertes gel / canicule", en: "Enable frost / heatwave alerts" },
  parametres_data_section: { fr: "Données & maintenance", en: "Data & maintenance" },
  parametres_help_section: { fr: "Aide & Support", en: "Help & Support" },
} as const

export type TranslationKey = keyof typeof TRANSLATIONS
