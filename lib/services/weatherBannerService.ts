// ---------------------------------------------------------------------------
// weatherBannerService — météo du bandeau, sans jamais lever d'erreur.
//
// Avant : l'appel à Open-Meteo se faisait dans le rappel de la géolocalisation,
// hors de tout try/catch. Quand le réseau était coupé (ERR_NAME_NOT_RESOLVED) ou
// bloqué, la promesse était rejetée sans être attrapée et Next affichait l'écran
// « Runtime TypeError : Failed to fetch ».
// Maintenant : chaque étape est protégée (délai maximal, réponse invalide, réseau
// absent, position refusée) et, en cas d'échec, la dernière météo connue est
// affichée avec son ancienneté. Aucune exception ne sort de ce module.
// ---------------------------------------------------------------------------

import { supabase } from "@/lib/supabase-client"
import type { WeatherData } from "@/lib/domain/supabase-types"

export const WEATHER_CACHE_KEY = "seedling:weather:last"
export const FETCH_TIMEOUT_MS = 8000
export const GPS_TIMEOUT_MS = 5000

export interface WeatherResult {
  weather: WeatherData
  /** Vrai : la météo affichée est la dernière connue, pas une mesure du moment. */
  stale: boolean
  /** Horodatage (ms) de la mesure, pour afficher « il y a 2 h ». */
  measuredAt: number | null
  /** Raison lisible quand la météo du moment n'a pas pu être obtenue. */
  problem: "hors_ligne" | "service_indisponible" | "localisation" | null
}

const UNAVAILABLE: WeatherData = { temperature: null, humidity: null, uvIndex: null, cloudCover: null, location: "Indisponible", source: "manual" }

function readCache(): { weather: WeatherData; savedAt: number } | null {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(WEATHER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { weather?: WeatherData; savedAt?: number }
    return parsed.weather && typeof parsed.savedAt === "number" ? { weather: parsed.weather, savedAt: parsed.savedAt } : null
  } catch {
    return null
  }
}

function writeCache(weather: WeatherData, now: number) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ weather, savedAt: now }))
  } catch {
    // Stockage plein ou refusé : sans importance.
  }
}

class WeatherFetchError extends Error {
  constructor(public problem: NonNullable<WeatherResult["problem"]>) {
    super(problem)
  }
}

async function fetchJson(url: string, fetcher: typeof fetch, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetcher(url, { signal: controller.signal })
    if (!response.ok) throw new WeatherFetchError("service_indisponible")
    return await response.json()
  } catch (error) {
    if (error instanceof WeatherFetchError) throw error
    // TypeError « Failed to fetch » (DNS, hors ligne, bloqueur de publicités) ou délai dépassé.
    throw new WeatherFetchError("hors_ligne")
  } finally {
    clearTimeout(timer)
  }
}

export function getBrowserPosition(timeoutMs: number = GPS_TIMEOUT_MS): Promise<{ lat: number; lon: number } | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
        () => resolve(null),
        { timeout: timeoutMs },
      )
    } catch {
      resolve(null)
    }
  })
}

async function profilePosition(fetcher: typeof fetch): Promise<{ lat: number; lon: number; name: string } | "connexion" | "ville" | null> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return "connexion"
  const { data: profile } = await supabase.from("profiles").select("city, postal_code").eq("id", userData.user.id).maybeSingle()
  const city = (profile as { city?: string | null; postal_code?: string | null } | null)?.city || (profile as { postal_code?: string | null } | null)?.postal_code
  if (!city) return "ville"
  const data = (await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`, fetcher, FETCH_TIMEOUT_MS)) as { results?: Array<{ latitude: number; longitude: number; name: string }> }
  const geo = data?.results?.[0]
  return geo ? { lat: geo.latitude, lon: geo.longitude, name: geo.name } : null
}

async function currentWeather(lat: number, lon: number, source: "gps" | "profile", location: string, fetcher: typeof fetch): Promise<WeatherData> {
  const data = (await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,uv_index,cloud_cover`,
    fetcher,
    FETCH_TIMEOUT_MS,
  )) as { current?: { temperature_2m?: number; relative_humidity_2m?: number; uv_index?: number; cloud_cover?: number } }
  return {
    temperature: data?.current?.temperature_2m ?? null,
    humidity: data?.current?.relative_humidity_2m ?? null,
    uvIndex: data?.current?.uv_index ?? null,
    cloudCover: data?.current?.cloud_cover ?? null,
    location,
    source,
  }
}

/** Météo du moment. Ne lève jamais d'exception ; retombe sur la dernière météo connue. */
export async function loadBannerWeather(options: { fetcher?: typeof fetch; now?: () => number; position?: () => Promise<{ lat: number; lon: number } | null> } = {}): Promise<WeatherResult> {
  const fetcher = options.fetcher ?? (typeof fetch === "undefined" ? (undefined as unknown as typeof fetch) : fetch)
  const now = options.now ?? Date.now
  let problem: WeatherResult["problem"] = "service_indisponible"
  let label: string | null = null

  try {
    if (!fetcher) throw new WeatherFetchError("hors_ligne")
    const gps = await (options.position ?? getBrowserPosition)()
    let weather: WeatherData | null = null
    if (gps) {
      weather = await currentWeather(gps.lat, gps.lon, "gps", "Position GPS", fetcher)
    } else {
      const place = await profilePosition(fetcher)
      if (place === "connexion") { label = "Connectez-vous"; problem = "localisation" }
      else if (place === "ville") { label = "Ville non renseignée"; problem = "localisation" }
      else if (place) weather = await currentWeather(place.lat, place.lon, "profile", place.name, fetcher)
      else problem = "localisation"
    }
    if (weather) {
      const measuredAt = now()
      writeCache(weather, measuredAt)
      return { weather, stale: false, measuredAt, problem: null }
    }
  } catch (error) {
    problem = error instanceof WeatherFetchError ? error.problem : "service_indisponible"
  }

  const cached = readCache()
  if (cached) return { weather: cached.weather, stale: true, measuredAt: cached.savedAt, problem }
  return { weather: { ...UNAVAILABLE, location: label ?? UNAVAILABLE.location }, stale: false, measuredAt: null, problem }
}

/** « il y a 5 min », « il y a 2 h », « il y a 3 j ». */
export function ageLabel(measuredAt: number | null, now: number = Date.now()): string {
  if (measuredAt == null) return ""
  const minutes = Math.max(0, Math.round((now - measuredAt) / 60000))
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `il y a ${hours} h`
  return `il y a ${Math.round(hours / 24)} j`
}

export const PROBLEM_MESSAGES: Record<NonNullable<WeatherResult["problem"]>, string> = {
  hors_ligne: "Connexion à la météo impossible (réseau coupé ou bloqué).",
  service_indisponible: "Le service météo ne répond pas pour le moment.",
  localisation: "Position inconnue : autorisez la localisation ou renseignez votre ville dans le profil.",
}
