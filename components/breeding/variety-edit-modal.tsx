"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { Field, Input, Textarea } from "@/components/breeding/ui"
import type { VarietyRecord } from "@/app/page"

interface VarietyEditModalProps {
  variety: VarietyRecord | null
  onClose: () => void
  onSaved: (updated: VarietyRecord) => void
  onDeleted: (id: string) => void
}

const EMPTY_FORM = {
  name: "",
  commercial_name: "",
  registration_name: "",
  obtenteur: "",
  type: "",
  color: "",
  flowering: "",
  fragrance: "",
  parents: "",
  description: "",
  photo_url: "",
  adr_label: false,
}

export function VarietyEditModal({ variety, onClose, onSaved, onDeleted }: VarietyEditModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pré-remplit le formulaire à chaque ouverture sur une nouvelle variété.
  useEffect(() => {
    if (variety) {
      setForm({
        name: variety.name ?? "",
        commercial_name: variety.commercial_name ?? "",
        registration_name: variety.registration_name ?? "",
        obtenteur: variety.obtenteur ?? "",
        type: variety.type ?? "",
        color: variety.color ?? "",
        flowering: variety.flowering ?? "",
        fragrance: variety.fragrance ?? "",
        parents: variety.parents ?? "",
        description: variety.description ?? "",
        photo_url: variety.photo_url ?? variety.image_url ?? "",
        adr_label: !!variety.adr_label,
      })
      setError(null)
    }
  }, [variety])

  if (!variety) return null

  async function handleSave() {
    if (!variety) return
    if (!form.name.trim()) {
      setError("Le nom est obligatoire.")
      return
    }
    setSaving(true)
    setError(null)

    const { data, error: updateError } = await supabase
      .from("varieties")
      .update({
        name: form.name.trim(),
        commercial_name: form.commercial_name || null,
        registration_name: form.registration_name || null,
        obtenteur: form.obtenteur || null,
        type: form.type || null,
        color: form.color || null,
        flowering: form.flowering || null,
        fragrance: form.fragrance || null,
        parents: form.parents || null,
        description: form.description || null,
        photo_url: form.photo_url || null,
        adr_label: form.adr_label,
      })
      .eq("id", variety.id)
      .select()
      .maybeSingle()

    setSaving(false)

    if (updateError || !data) {
      console.error("Erreur lors de la mise à jour :", updateError)
      setError(
        updateError?.message ??
          "Mise à jour impossible : la variété n'a pas été trouvée ou les droits (RLS) l'interdisent pour ce compte.",
      )
      return
    }
    onSaved(data as VarietyRecord)
  }

  async function handleDelete() {
    if (!variety) return
    if (!confirm(`Supprimer « ${variety.name} » du catalogue ? Cette action est irréversible.`)) return
    setSaving(true)
    setError(null)
    const { error: deleteError } = await supabase.from("varieties").delete().eq("id", variety.id)
    setSaving(false)
    if (deleteError) {
      console.error("Erreur lors de la suppression :", deleteError)
      setError(deleteError.message)
      return
    }
    onDeleted(variety.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg text-foreground">Modifier « {variety.name} »</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {error ? (
          <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de la variété" htmlFor="e-name">
            <Input id="e-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Nom commercial" htmlFor="e-comm">
            <Input
              id="e-comm"
              value={form.commercial_name}
              onChange={(e) => setForm({ ...form, commercial_name: e.target.value })}
            />
          </Field>
          <Field label="Dénomination enregistrée" htmlFor="e-reg">
            <Input
              id="e-reg"
              value={form.registration_name}
              onChange={(e) => setForm({ ...form, registration_name: e.target.value })}
            />
          </Field>
          <Field label="Obtenteur" htmlFor="e-obt">
            <Input id="e-obt" value={form.obtenteur} onChange={(e) => setForm({ ...form, obtenteur: e.target.value })} />
          </Field>
          <Field label="Type" htmlFor="e-type">
            <Input id="e-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </Field>
          <Field label="Couleur" htmlFor="e-color">
            <Input id="e-color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </Field>
          <Field label="Floraison" htmlFor="e-flow">
            <Input id="e-flow" value={form.flowering} onChange={(e) => setForm({ ...form, flowering: e.target.value })} />
          </Field>
          <Field label="Parfum" htmlFor="e-frag">
            <Input id="e-frag" value={form.fragrance} onChange={(e) => setForm({ ...form, fragrance: e.target.value })} />
          </Field>
          <Field label="Parentage" htmlFor="e-parent">
            <Input id="e-parent" value={form.parents} onChange={(e) => setForm({ ...form, parents: e.target.value })} />
          </Field>
          <Field label="Photo (URL)" htmlFor="e-photo">
            <Input id="e-photo" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description" htmlFor="e-desc" hint="La hauteur, la floraison et le parfum non renseignés ci-dessus sont détectés automatiquement dans ce texte.">
            <Textarea
              id="e-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.adr_label}
            onChange={(e) => setForm({ ...form, adr_label: e.target.checked })}
            className="size-4 rounded border-input accent-accent"
          />
          Label ADR
        </label>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="destructive" onClick={handleDelete} disabled={saving} className="gap-1.5">
            Supprimer
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
