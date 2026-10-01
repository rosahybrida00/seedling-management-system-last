"use client"

import { useEffect, useState } from "react"
import { Thermometer, Droplets, Sun, Cloud, MapPin, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import type { WeatherData } from "@/lib/domain/supabase-types"

export function WeatherBanner() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeather()
  }, [])

  async function fetchWeather() {
    setLoading(true)
    try {
      // Try GPS first
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords
            await fetchFromOpenMeteo(latitude, longitude, "gps", "Position GPS")
          },
          async () => {
            await fetchFromProfile()
          },
          { timeout: 5000 },
        )
      } else {
        await fetchFromProfile()
      }
    } catch {
      setWeather({
        temperature: null,
        humidity: null,
        uvIndex: null,
        cloudCover: null,
        location: "Indisponible",
        source: "manual",
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchFromProfile() {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setWeather({
          temperature: null,
          humidity: null,
          uvIndex: null,
          cloudCover: null,
          location: "Connectez-vous",
          source: "manual",
        })
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("city, postal_code")
        .eq("id", userData.user.id)
        .maybeSingle()

      const city = profile?.city || profile?.postal_code
      if (!city) {
        setWeather({
          temperature: null,
          humidity: null,
          uvIndex: null,
          cloudCover: null,
          location: "Ville non renseignée",
          source: "manual",
        })
        return
      }

      // Geocode city name via Open-Meteo geocoding API
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`,
      )
      if (!geoRes.ok) throw new Error("geocoding failed")
      const geoData = await geoRes.json()
      const geo = geoData?.results?.[0]
      if (!geo) throw new Error("city not found")

      await fetchFromOpenMeteo(geo.latitude, geo.longitude, "profile", geo.name)
    } catch {
      setWeather({
        temperature: null,
        humidity: null,
        uvIndex: null,
        cloudCover: null,
        location: "Indisponible",
        source: "manual",
      })
    }
  }

  async function fetchFromOpenMeteo(
    lat: number,
    lon: number,
    source: "gps" | "profile",
    locationName: string,
  ) {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,uv_index,cloud_cover`,
    )
    if (!res.ok) throw new Error("weather fetch failed")
    const data = await res.json()
    setWeather({
      temperature: data?.current?.temperature_2m ?? null,
      humidity: data?.current?.relative_humidity_2m ?? null,
      uvIndex: data?.current?.uv_index ?? null,
      cloudCover: data?.current?.cloud_cover ?? null,
      location: locationName,
      source,
    })
  }

  return (
    <div className="border-b border-border bg-primary/5 px-4 py-2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1.5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <MapPin className="size-3.5 text-primary" />
          {weather?.location ?? "Localisation…"}
        </div>
        {loading ? (
          <span className="text-xs text-muted-foreground">Chargement météo…</span>
        ) : weather?.temperature != null ? (
          <>
            <WeatherMetric
              icon={<Thermometer className="size-3.5" />}
              label="Temp."
              value={weather.temperature != null ? `${Math.round(weather.temperature)}°C` : "—"}
            />
            <WeatherMetric
              icon={<Droplets className="size-3.5" />}
              label="Humidité"
              value={weather.humidity != null ? `${Math.round(weather.humidity)}%` : "—"}
            />
            <WeatherMetric
              icon={<Sun className="size-3.5" />}
              label="UV"
              value={weather.uvIndex != null ? String(Math.round(weather.uvIndex)) : "—"}
            />
            <WeatherMetric
              icon={<Cloud className="size-3.5" />}
              label="Couverture"
              value={weather.cloudCover != null ? `${Math.round(weather.cloudCover)}%` : "—"}
            />
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Météo indisponible</span>
        )}
        <button
          onClick={fetchWeather}
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          title="Rafraîchir"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>
    </div>
  )
}

function WeatherMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="text-primary">{icon}</span>
      <span className="text-xs uppercase tracking-wide">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
