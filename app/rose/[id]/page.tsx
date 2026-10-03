"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Flower2, Pencil, Trash2, Sprout, Palette, Ruler, Snowflake, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WeatherBanner } from "@/components/weather/weather-banner"
import { supabase } from "@/lib/supabase-client"
import { Card, Badge, EmptyState } from "@/components/breeding/ui"
import { formatDate } from "@/components/breeding/format"
import { detectTraitsFromDescription, resolveTrait } from "@/lib/domain/description-traits"
import { VarietyEditModal } from "@/components/breeding/variety-edit-modal"
import { VarietyCrossHistory } from "@/components/breeding/croisement/variety-cross-history"
import type { VarietyRecord } from "@/app/page"

interface VarietyPhoto {
  id: string
  photo_url: string
  is_primary?: boolean | null
  caption?: string | null
}

interface VarietyDetail {
  id: string
  name: string
  commercial_name?: string | null
  registration_name?: string | null
  obtenteur?: string | null
  type?: string | null
  color?: string | null
  flowering?: string | null
  fragrance?: string | null
  parents?: string | null
  description?: string | null
  photo_url?: string | null
  image_url?: string | null
  adr_label?: boolean | null
  created_at?: string
}

export default function VarietyDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [variety, setVariety] = useState<VarietyDetail | null>(null)
  const [photos, setPhotos] = useState<VarietyPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!params?.id) return

    async function fetchVariety() {
      setLoading(true)

      const [varietyRes, photosRes] = await Promise.all([
        supabase.from("varieties").select("*").eq("id", params.id).maybeSingle(),
        supabase
          .from("varieties_photos")
          .select("id, photo_url, is_primary, caption")
          .eq("variety_id", params.id),
      ])

      if (varietyRes.error || !varietyRes.data) {
        if (varietyRes.error) console.error("Erreur lors du chargement de la variété :", varietyRes.error)
        setNotFound(true)
      } else {
        setVariety(varietyRes.data as VarietyDetail)
      }

      if (!photosRes.error && photosRes.data) {
        setPhotos(photosRes.data as VarietyPhoto[])
      }

      setLoading(false)
    }

    fetchVariety()
  }, [params?.id])

  const mainPhoto =
    photos.find((p) => p.is_primary)?.photo_url ??
    photos[0]?.photo_url ??
    variety?.photo_url ??
    variety?.image_url ??
    null

  const gallery = photos.filter((p) => p.photo_url !== mainPhoto)

  const detected = useMemo(() => detectTraitsFromDescription(variety?.description), [variety?.description])
  const flowering = resolveTrait(variety?.flowering, detected.flowering)
  const fragrance = resolveTrait(variety?.fragrance, detected.fragrance)
  const height = resolveTrait(null, detected.height)
  const width = resolveTrait(null, detected.width)
  const flowerDiameter = resolveTrait(null, detected.flowerDiameter)
  const hardiness = resolveTrait(null, detected.hardiness)
  const habit = resolveTrait(null, detected.habit)
  const foliage = resolveTrait(null, detected.foliage)
  const soil = resolveTrait(null, detected.soil)

  const hasApparence = Boolean(foliage.value || habit.value || flowerDiameter.value)
  const hasDimensions = Boolean(height.value || width.value)
  const hasCulture = Boolean(hardiness.value || soil.value)

  return (
    <div className="min-h-svh bg-background">
      <WeatherBanner />
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => router.push("/")}>
            <ArrowLeft className="size-4" /> Retour au catalogue
          </Button>
          {variety ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> Modifier
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  if (!variety) return
                  if (!confirm(`Supprimer « ${variety.name} » du catalogue ? Cette action est irréversible.`)) return
                  const { error } = await supabase.from("varieties").delete().eq("id", variety.id)
                  if (error) {
                    alert(`Suppression impossible : ${error.message}`)
                    return
                  }
                  router.push("/")
                }}
              >
                <Trash2 className="size-3.5" /> Supprimer
              </Button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Flower2 className="size-8 animate-pulse text-primary" />
          </div>
        ) : notFound || !variety ? (
          <EmptyState
            icon={<Flower2 className="size-8" />}
            title="Variété introuvable"
            description="Cette fiche n'existe pas ou plus, ou a peut-être été supprimée."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card className="overflow-hidden">
              <div className="relative aspect-square bg-muted">
                {mainPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mainPhoto} alt={variety.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-primary/5">
                    <Flower2 className="size-16 text-primary/30" />
                  </div>
                )}
                {variety.adr_label ? (
                  <div className="absolute top-3 right-3">
                    <Badge tone="accent">ADR</Badge>
                  </div>
                ) : null}
              </div>
              {gallery.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 p-2">
                  {gallery.map((photo) => (
                    <div key={photo.id} className="aspect-square overflow-hidden rounded-md bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.photo_url} alt={photo.caption ?? variety.name} className="size-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>

            <div>
              <h1 className="font-serif text-3xl text-foreground text-balance">{variety.name}</h1>
              {variety.commercial_name && variety.commercial_name !== variety.name ? (
                <p className="mt-1 text-sm font-medium text-muted-foreground">{variety.commercial_name}</p>
              ) : null}
              {variety.registration_name ? (
                <p className="mt-0.5 text-xs text-muted-foreground">Dénomination : {variety.registration_name}</p>
              ) : null}
              {variety.obtenteur ? (
                <p className="mt-1 text-sm text-muted-foreground">Obtenteur : {variety.obtenteur}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {variety.type ? <Badge tone="neutral">{variety.type}</Badge> : null}
                {variety.color ? <Badge tone="primary">{variety.color}</Badge> : null}
                {flowering.value ? (
                  <Badge tone={flowering.isDetected ? "warning" : "neutral"}>
                    {flowering.value}
                    {flowering.isDetected ? " · détecté" : ""}
                  </Badge>
                ) : null}
                {fragrance.value ? (
                  <Badge tone={fragrance.isDetected ? "warning" : "neutral"}>
                    Parfum : {fragrance.value}
                    {fragrance.isDetected ? " · détecté" : ""}
                  </Badge>
                ) : null}
              </div>

              <Section icon={<Sprout className="size-4" />} title="Identification">
                <InfoRow label="Famille" value="Rosacées" />
                <InfoRow label="Nom commun" value={variety.name} />
              </Section>

              {hasApparence ? (
                <Section icon={<Palette className="size-4" />} title="Apparence">
                  <InfoRow label="Feuillage" value={foliage.value} detected={foliage.isDetected} />
                  <InfoRow label="Type de port" value={habit.value} detected={habit.isDetected} />
                  <InfoRow label="Diamètre de la fleur" value={flowerDiameter.value} detected={flowerDiameter.isDetected} />
                </Section>
              ) : null}

              {hasDimensions ? (
                <Section icon={<Ruler className="size-4" />} title="Dimensions & port">
                  <InfoRow label="Hauteur" value={height.value} detected={height.isDetected} />
                  <InfoRow label="Largeur adulte" value={width.value} detected={width.isDetected} />
                </Section>
              ) : null}

              {hasCulture ? (
                <Section icon={<Snowflake className="size-4" />} title="Culture">
                  <InfoRow label="Rusticité" value={hardiness.value} detected={hardiness.isDetected} />
                  <InfoRow label="Type de sol" value={soil.value} detected={soil.isDetected} />
                </Section>
              ) : null}

              <Section icon={<Info className="size-4" />} title="Informations complémentaires">
                <InfoRow label="Label ADR" value={variety.adr_label ? "Oui" : "Non"} />
                {variety.registration_name ? (
                  <InfoRow label="Nom d'enregistrement" value={variety.registration_name} />
                ) : null}
              </Section>

              {variety.parents ? (
                <Card className="mt-3 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parentage</p>
                  <p className="mt-1 text-sm italic text-foreground">{variety.parents}</p>
                </Card>
              ) : null}

              <VarietyCrossHistory varietyId={variety.id} />

              {variety.description ? (
                <Card className="mt-3 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground text-pretty">{variety.description}</p>
                </Card>
              ) : null}

              <p className="mt-5 text-xs text-muted-foreground">
                Ajoutée au catalogue le {formatDate(variety.created_at)}
              </p>

              <Link href="/" className="mt-2 inline-block text-sm text-primary hover:underline">
                ← Retour au catalogue
              </Link>
            </div>
          </div>
        )}
      </div>

      <VarietyEditModal
        variety={editing ? (variety as unknown as VarietyRecord) : null}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setVariety((prev) => (prev ? { ...prev, ...updated } : prev))
          setEditing(false)
        }}
        onDeleted={() => {
          router.push("/")
        }}
      />
    </div>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="mt-3 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </Card>
  )
}

function InfoRow({ label, value, detected }: { label: string; value?: string; detected?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">
        {value}
        {detected ? <span className="ml-1 text-xs font-normal text-muted-foreground">(détecté)</span> : null}
      </span>
    </div>
  )
}
