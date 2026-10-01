"use client"

import { useEffect, useState } from "react"
import { User, Save, Upload, Lock, Flower2, Sprout, ArrowUpCircle, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/layout/app-shell"
import { supabase } from "@/lib/supabase-client"
import { Card, Field, Input, SectionHeading, Badge } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { useLanguage } from "@/lib/i18n/language-provider"

interface Profile {
  obtenteur_name: string | null
  affixe: string | null
  siret: string | null
  city: string | null
  postal_code: string | null
  address: string | null
  avatar_url: string | null
  subscription: string
}

interface ActivityStats {
  crosses: number
  seedlings: number
  promoted: number
  varieties: number
}

export default function ProfilPage() {
  return (
    <AppShell>
      <ProfilContent />
    </AppShell>
  )
}

function ProfilContent() {
  const { t } = useLanguage()
  const [email, setEmail] = useState<string | null>(null)
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [passwords, setPasswords] = useState({ next: "", confirm: "" })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (!profile?.city && typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async ({ coords }) => {
        try {
          const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=fr`)
          const data = await response.json()
          const city = data.city || data.locality || data.principalSubdivision || null
          if (!city) return
          const postalCode = data.postcode || null
          setProfile((current) => current ? { ...current, city, postal_code: current.postal_code || postalCode } : current)
          const { data: userData } = await supabase.auth.getUser()
          if (userData.user) {
            await supabase.from("profiles").upsert({ id: userData.user.id, city, postal_code: postalCode }, { onConflict: "id" })
          }
        } catch {
          // WeatherBanner still falls back to browser GPS when reverse geocoding is unavailable.
        }
      }, () => undefined, { timeout: 5000 })
    }
  }, [profile?.city])

  async function fetchProfile() {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setLoading(false)
      return
    }
    setEmail(userData.user.email ?? null)
    setMemberSince(userData.user.created_at ?? null)

    const [{ data: profileData }, crossesCount, seedlingsCount, promotedCount, varietiesCount] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle(),
      supabase.from("crosses").select("id", { count: "exact", head: true }).eq("user_id", userData.user.id),
      supabase.from("seedlings").select("id", { count: "exact", head: true }),
      supabase.from("seedlings").select("id", { count: "exact", head: true }).eq("is_promoted_to_variety", true),
      supabase.from("varieties").select("id", { count: "exact", head: true }).eq("created_by", userData.user.id),
    ])

    if (profileData) setProfile(profileData as Profile)
    setStats({
      crosses: crossesCount.count ?? 0,
      seedlings: seedlingsCount.count ?? 0,
      promoted: promotedCount.count ?? 0,
      varieties: varietiesCount.count ?? 0,
    })
    setLoading(false)
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    await supabase.from("profiles").update({
      obtenteur_name: profile.obtenteur_name,
      affixe: profile.affixe,
      siret: profile.siret,
      city: profile.city,
      postal_code: profile.postal_code,
      address: profile.address,
      avatar_url: profile.avatar_url,
    }).eq("id", userData.user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const ext = file.name.split(".").pop()
    const path = `avatars/${userData.user.id}.${ext}`
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true })
    if (upErr) return
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
    const avatarUrl = urlData.publicUrl
    const nextProfile = profile ?? {
      obtenteur_name: userData.user.user_metadata?.name ?? userData.user.email?.split("@")[0] ?? null,
      affixe: null,
      siret: null,
      city: null,
      postal_code: null,
      address: null,
      avatar_url: null,
      subscription: "free",
    }
    setProfile({ ...nextProfile, avatar_url: avatarUrl })
    await supabase.from("profiles").upsert({ id: userData.user.id, avatar_url: avatarUrl }, { onConflict: "id" })
  }

  async function handleChangePassword() {
    setPasswordError(null)
    setPasswordMessage(null)
    if (passwords.next.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.")
      return
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError("Les deux mots de passe ne correspondent pas.")
      return
    }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.next })
    setPasswordSaving(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setPasswordMessage("Mot de passe mis à jour.")
    setPasswords({ next: "", confirm: "" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <User className="size-8 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeading title={t("profil_title")} description={t("profil_description")} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-muted">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="Avatar" className="size-full object-cover" />
              ) : (
                <User className="size-10 text-muted-foreground" />
              )}
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <span className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Upload className="size-4" /> Changer la photo
              </span>
            </label>
            <Badge tone={profile?.subscription === "pro" ? "success" : "neutral"}>
              {profile?.subscription === "pro" ? "Abonnement Pro" : "Compte Gratuit"}
            </Badge>

            <div className="w-full border-t border-border pt-4 text-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("profil_account_section")}
              </p>
              <p className="text-foreground">{profile?.obtenteur_name || "—"}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("profil_email")}</p>
              <p className="text-foreground">{email ?? "—"}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t("profil_member_since")}</p>
              <p className="text-foreground">{memberSince ? formatDate(memberSince) : "—"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-serif text-lg text-foreground">Informations de structure</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom d'obtenteur / Pseudo">
              <Input
                value={profile?.obtenteur_name ?? ""}
                onChange={(e) => setProfile({ ...profile!, obtenteur_name: e.target.value })}
                placeholder="Mon Pépinière"
              />
            </Field>
            <Field label="Affixe de pépinière">
              <Input
                value={profile?.affixe ?? ""}
                onChange={(e) => setProfile({ ...profile!, affixe: e.target.value })}
                placeholder="Les Roses du Val"
              />
            </Field>
            <Field label="SIRET (optionnel)">
              <Input
                value={profile?.siret ?? ""}
                onChange={(e) => setProfile({ ...profile!, siret: e.target.value })}
                placeholder="123 456 789 00012"
              />
            </Field>
            <Field label="Ville (fallback météo)">
              <Input
                value={profile?.city ?? ""}
                onChange={(e) => setProfile({ ...profile!, city: e.target.value })}
                placeholder="Lyon"
              />
            </Field>
            <Field label="Code postal">
              <Input
                value={profile?.postal_code ?? ""}
                onChange={(e) => setProfile({ ...profile!, postal_code: e.target.value })}
                placeholder="69000"
              />
            </Field>
            <Field label="Adresse">
              <Input
                value={profile?.address ?? ""}
                onChange={(e) => setProfile({ ...profile!, address: e.target.value })}
                placeholder="12 chemin des Roses"
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="size-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {saved ? <span className="text-sm text-primary">Enregistré</span> : null}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-lg text-foreground">
          <Lock className="size-4 text-primary" /> {t("profil_security_section")}
        </h3>
        {passwordMessage ? <p className="mb-3 text-sm text-primary">{passwordMessage}</p> : null}
        {passwordError ? <p className="mb-3 text-sm text-destructive">{passwordError}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:w-2/3">
          <Field label={t("profil_new_password")}>
            <Input
              type="password"
              value={passwords.next}
              onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
              placeholder="••••••••"
            />
          </Field>
          <Field label={t("profil_confirm_password")}>
            <Input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder="••••••••"
            />
          </Field>
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={handleChangePassword} disabled={passwordSaving} className="gap-1.5">
            <Lock className="size-4" /> {passwordSaving ? "…" : t("profil_change_password")}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 font-serif text-lg text-foreground">{t("profil_activity_section")}</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile icon={<Flower2 className="size-4" />} label={t("profil_crosses")} value={stats?.crosses ?? 0} />
          <StatTile icon={<Sprout className="size-4" />} label={t("profil_seedlings")} value={stats?.seedlings ?? 0} />
          <StatTile icon={<ArrowUpCircle className="size-4" />} label={t("profil_promoted")} value={stats?.promoted ?? 0} />
          <StatTile icon={<BookOpen className="size-4" />} label={t("profil_varieties")} value={stats?.varieties ?? 0} />
        </div>
      </Card>
    </div>
  )
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 font-serif text-2xl text-foreground">{value}</p>
    </div>
  )
}
