"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Thermometer, Droplets, Sun, Cloud, MapPin, RefreshCw } from "lucide-react"
import { PROBLEM_MESSAGES, ageLabel, loadBannerWeather, type WeatherResult } from "@/lib/services/weatherBannerService"

export function WeatherBanner() {
  const [result, setResult] = useState<WeatherResult | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    // loadBannerWeather ne lève jamais d'exception : plus d'écran d'erreur si le réseau est coupé.
    const next = await loadBannerWeather()
    if (!mounted.current) return
    setResult(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    // Dès que la connexion revient, la météo se met à jour toute seule.
    const onOnline = () => { void refresh() }
    window.addEventListener("online", onOnline)
    return () => { mounted.current = false; window.removeEventListener("online", onOnline) }
  }, [refresh])

  const weather = result?.weather ?? null
  const problem = result?.problem ? PROBLEM_MESSAGES[result.problem] : null

  return (
    <div className="border-b border-border bg-primary/5 px-4 py-2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1.5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <MapPin className="size-3.5 text-primary" />
          {weather?.location ?? "Localisation…"}
        </div>
        {loading && !weather ? (
          <span className="text-xs text-muted-foreground">Chargement météo…</span>
        ) : weather?.temperature != null ? (
          <>
            <WeatherMetric icon={<Thermometer className="size-3.5" />} label="Temp." value={`${Math.round(weather.temperature)}°C`} />
            <WeatherMetric icon={<Droplets className="size-3.5" />} label="Humidité" value={weather.humidity != null ? `${Math.round(weather.humidity)}%` : "—"} />
            <WeatherMetric icon={<Sun className="size-3.5" />} label="UV" value={weather.uvIndex != null ? String(Math.round(weather.uvIndex)) : "—"} />
            <WeatherMetric icon={<Cloud className="size-3.5" />} label="Couverture" value={weather.cloudCover != null ? `${Math.round(weather.cloudCover)}%` : "—"} />
            {result?.stale ? <span role="status" className="text-xs text-muted-foreground">Dernière météo connue, {ageLabel(result.measuredAt)}</span> : null}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Météo indisponible</span>
        )}
        {problem ? <span role="status" className="text-xs text-muted-foreground">{problem}</span> : null}
        <button
          onClick={() => void refresh()}
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
