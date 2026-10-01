"use client"

import { useEffect, useState } from "react"
import { Settings, Save, Download, LifeBuoy, Send, Check, Globe, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"
import { supabase } from "@/lib/supabase-client"
import { Card, Field, Input, SectionHeading, Select, Badge, Textarea } from "@/components/breeding/ui"
import { useLanguage } from "@/lib/i18n/language-provider"
import type { Language } from "@/lib/i18n/translations"

interface UserSettings {
  theme: string
  frost_threshold: number
  heat_threshold: number
  units: string
  alerts_enabled: boolean
}

const SUPPORT_CATEGORIES = [
  { value: "technical", label: "Support technique" },
  { value: "bug", label: "Signaler un bug" },
  { value: "suggestion", label: "Suggestion" },
  { value: "billing", label: "Question Facturation" },
  { value: "dho", label: "Licences DHO" },
]

const FAQ_ITEMS = [
  {
    q: "Qu'est-ce que la nomenclature Aa1-2026-001 ?",
    a: "Le code unique d'un semis suit le schéma [Code_Croisement]-[Année]-[Séquence]. Par exemple, Aa1-2026-001 désigne le premier semis issu du fruit Aa1 de l'année 2026.",
  },
  {
    q: "Comment exporter un dossier DHO ?",
    a: "Le module d'exportation de dossiers officiels DHO (Droits d'Obtention Végétale) au format PDF/A sera disponible dans la Phase 3 de l'application.",
  },
  {
    q: "Comment fonctionne le fallback météo ?",
    a: "Si le GPS est désactivé, l'application utilise automatiquement la ville renseignée dans votre profil pour afficher les conditions météo.",
  },
]

export default function ParametresPage() {
  return (
    <AppShell>
      <ParametresContent />
    </AppShell>
  )
}

function ParametresContent() {
  const { language, setLanguage, t } = useLanguage()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [supportForm, setSupportForm] = useState({ subject: "", category: "technical", message: "" })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from("user_settings")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle()
    if (data) setSettings(data as UserSettings)
    setLoading(false)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase.from("user_settings").update({
      theme: settings.theme,
      frost_threshold: Number(settings.frost_threshold),
      heat_threshold: Number(settings.heat_threshold),
      units: settings.units,
      alerts_enabled: settings.alerts_enabled,
    }).eq("id", userData.user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleExportAll() {
    const tables = ["crosses", "hip_harvests", "sowing_batches", "seedlings", "greenhouses", "greenhouse_tables", "pollen_lots", "sensors"]
    const exportData: Record<string, unknown> = {}
    for (const table of tables) {
      const { data } = await supabase.from(table).select("*")
      exportData[table] = data
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "backup-complet.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSupportSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supportForm.message.trim()) return
    setSending(true)
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from("support_messages").insert({
      user_id: userData.user?.id ?? null,
      subject: supportForm.subject || null,
      category: supportForm.category,
      message: supportForm.message,
    })
    setSending(false)
    setSent(true)
    setSupportForm({ subject: "", category: "technical", message: "" })
    setTimeout(() => setSent(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Settings className="size-8 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading title={t("parametres_title")} description={t("parametres_description")} />

      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-serif text-lg text-foreground">
          <Globe className="size-4 text-primary" /> {t("parametres_language_section")}
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">{t("parametres_language_hint")}</p>
        <div className="flex gap-2">
          <Button
            variant={language === "fr" ? "default" : "outline"}
            size="sm"
            onClick={() => setLanguage("fr" as Language)}
          >
            🇫🇷 Français
          </Button>
          <Button
            variant={language === "en" ? "default" : "outline"}
            size="sm"
            onClick={() => setLanguage("en" as Language)}
          >
            🇬🇧 English
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-lg text-foreground">
          <Bell className="size-4 text-primary" /> {t("parametres_alerts_section")}
        </h3>
        <label className="mb-4 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={settings?.alerts_enabled ?? true}
            onChange={(e) => setSettings({ ...settings!, alerts_enabled: e.target.checked })}
            className="size-4 rounded border-input accent-accent"
          />
          {t("parametres_alerts_enabled")}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seuil de gel (°C)" hint="Alerte en dessous de cette température.">
            <Input
              type="number"
              value={settings?.frost_threshold ?? 2}
              onChange={(e) => setSettings({ ...settings!, frost_threshold: Number(e.target.value) })}
              disabled={!settings?.alerts_enabled}
            />
          </Field>
          <Field label="Seuil de surchauffe serre (°C)" hint="Alerte au-dessus de cette température.">
            <Input
              type="number"
              value={settings?.heat_threshold ?? 35}
              onChange={(e) => setSettings({ ...settings!, heat_threshold: Number(e.target.value) })}
              disabled={!settings?.alerts_enabled}
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Thème">
            <Select
              value={settings?.theme ?? "botanical"}
              onChange={(e) => setSettings({ ...settings!, theme: e.target.value })}
            >
              <option value="botanical">Botanique Épuré</option>
              <option value="dark">Sombre</option>
              <option value="light">Clair</option>
            </Select>
          </Field>
          <Field label="Unités">
            <Select
              value={settings?.units ?? "metric"}
              onChange={(e) => setSettings({ ...settings!, units: e.target.value })}
            >
              <option value="metric">Métrique (°C, mm)</option>
              <option value="imperial">Impérial (°F, in)</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="size-4" /> {saving ? "Enregistrement…" : "Enregistrer les paramètres"}
          </Button>
          {saved ? <Badge tone="success">Enregistré</Badge> : null}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 font-serif text-lg text-foreground">{t("parametres_data_section")}</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportAll} className="gap-1.5">
            <Download className="size-4" /> Exporter toutes mes données (JSON)
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Pour la suppression de votre compte (RGPD), utilisez le formulaire d'aide ci-dessous.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-lg text-foreground">
          <LifeBuoy className="size-4 text-primary" /> {t("parametres_help_section")}
        </h3>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            {sent ? (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                <Check className="size-4" /> Votre message a été envoyé. Nous vous répondrons par e-mail.
              </div>
            ) : null}

            <form onSubmit={handleSupportSubmit} className="flex flex-col gap-4">
              <Field label="Motif">
                <Select value={supportForm.category} onChange={(e) => setSupportForm({ ...supportForm, category: e.target.value })}>
                  {SUPPORT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Sujet">
                <Input
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                  placeholder="Résumé de votre demande"
                />
              </Field>
              <Field label="Message">
                <Textarea
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                  placeholder="Décrivez votre demande, le bug ou la suggestion en détail…"
                  className="min-h-[120px]"
                  required
                />
              </Field>
              <Button type="submit" disabled={sending || !supportForm.message.trim()} className="gap-1.5">
                <Send className="size-4" /> {sending ? "Envoi…" : "Envoyer"}
              </Button>
            </form>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">FAQ</h4>
            <div className="grid gap-4">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-foreground">{item.q}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
