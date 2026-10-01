"use client"

import { useState } from "react"
import { LifeBuoy, Send, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"
import { supabase } from "@/lib/supabase-client"
import { Card, Field, Input, SectionHeading, Select, Textarea } from "@/components/breeding/ui"

const CATEGORIES = [
  { value: "technical", label: "Support technique" },
  { value: "billing", label: "Question Facturation" },
  { value: "dho", label: "Licences DHO" },
  { value: "partnership", label: "Partenariat" },
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

export default function ContactPage() {
  return (
    <AppShell>
      <ContactContent />
    </AppShell>
  )
}

function ContactContent() {
  const [form, setForm] = useState({ subject: "", category: "technical", message: "" })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.message.trim()) return
    setSending(true)
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from("support_messages").insert({
      user_id: userData.user?.id ?? null,
      subject: form.subject || null,
      category: form.category,
      message: form.message,
    })
    setSending(false)
    setSent(true)
    setForm({ subject: "", category: "technical", message: "" })
    setTimeout(() => setSent(false), 3000)
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading
        title="Contact & Support B2B"
        description="Formulaire de support, FAQ et aide sur la nomenclature et l'exportation DHO."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-serif text-lg text-foreground">
            <LifeBuoy className="size-5 text-primary" /> Formulaire de support
          </h3>

          {sent ? (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              <Check className="size-4" /> Votre message a été envoyé. Nous vous répondrons par e-mail.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Motif">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sujet">
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Résumé de votre demande"
              />
            </Field>
            <Field label="Message">
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Décrivez votre demande en détail…"
                className="min-h-[120px]"
                required
              />
            </Field>
            <Button type="submit" disabled={sending || !form.message.trim()} className="gap-1.5">
              <Send className="size-4" /> {sending ? "Envoi…" : "Envoyer"}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-serif text-lg text-foreground">Centre d'aide & FAQ</h3>
          <div className="grid gap-4">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <p className="font-medium text-sm text-foreground">{item.q}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
