"use client"

// Bouton « Notifications » de l'en-tête : une cloche avec le nombre de choses à
// traiter, et un panneau qui les dit en phrases claires. Un clic sur une
// notification ouvre la bonne serre ou parcelle, au bon onglet.
// Les alertes du navigateur sont facultatives : une seule alerte résumée par jour,
// et seulement si la personne les a activées.

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Bell, BellRing, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { loadNotifications } from "@/lib/services/notificationLoader"
import { badgeCount, browserAlert, type AppNotification } from "@/lib/services/notificationService"
import { DATA_CHANGED_EVENT, emitZoneNav } from "@/lib/navigation"

export const BROWSER_ALERTS_KEY = "seedling:notifications:browser"
export const LAST_ALERT_KEY = "seedling:notifications:lastAlert"
const REFRESH_MS = 5 * 60 * 1000

type BrowserState = "indisponible" | "refuse" | "inactif" | "actif"

function readBrowserState(): BrowserState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "indisponible"
  if (Notification.permission === "denied") return "refuse"
  try {
    return Notification.permission === "granted" && localStorage.getItem(BROWSER_ALERTS_KEY) === "on" ? "actif" : "inactif"
  } catch {
    return "inactif"
  }
}

const SEVERITY_STYLE: Record<AppNotification["severity"], string> = {
  urgent: "bg-destructive",
  aujourdhui: "bg-chart-3",
  info: "bg-muted-foreground",
}

export function NotificationBell({ now = () => new Date() }: { now?: () => Date }) {
  const router = useRouter()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [browserState, setBrowserState] = useState<BrowserState>("inactif")
  const panelRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const list = await loadNotifications(now().toISOString().slice(0, 10))
    if (!mounted.current) return
    setNotifications(list)
    setLoaded(true)
    // Alerte du navigateur : une seule par jour, résumée, seulement si activée.
    if (readBrowserState() === "actif") {
      const alert = browserAlert(list)
      const day = now().toISOString().slice(0, 10)
      try {
        if (alert && localStorage.getItem(LAST_ALERT_KEY) !== day) {
          new Notification(alert.title, { body: alert.body })
          localStorage.setItem(LAST_ALERT_KEY, day)
        }
      } catch {
        // Le navigateur refuse l'alerte : sans importance.
      }
    }
  }, [now])

  useEffect(() => {
    mounted.current = true
    setBrowserState(readBrowserState())
    void refresh()
    const timer = setInterval(() => { void refresh() }, REFRESH_MS)
    const onChange = () => { void refresh() }
    window.addEventListener(DATA_CHANGED_EVENT, onChange)
    window.addEventListener("focus", onChange)
    window.addEventListener("online", onChange)
    return () => {
      mounted.current = false
      clearInterval(timer)
      window.removeEventListener(DATA_CHANGED_EVENT, onChange)
      window.removeEventListener("focus", onChange)
      window.removeEventListener("online", onChange)
    }
  }, [refresh])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false) }
    function onClick(event: MouseEvent) { if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false) }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onClick)
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick) }
  }, [open])

  const count = badgeCount(notifications)

  function openNotification(notification: AppNotification) {
    setOpen(false)
    if (!notification.nav || !notification.href) return
    if (pathname === "/serre") {
      window.history.pushState(null, "", notification.href)
      emitZoneNav(notification.nav)
    } else {
      router.push(notification.href)
    }
  }

  async function enableBrowserAlerts() {
    if (typeof Notification === "undefined") return
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission()
    try {
      if (permission === "granted") localStorage.setItem(BROWSER_ALERTS_KEY, "on")
    } catch {
      // Stockage refusé : l'alerte ne sera pas mémorisée.
    }
    setBrowserState(readBrowserState())
  }

  function disableBrowserAlerts() {
    try { localStorage.removeItem(BROWSER_ALERTS_KEY) } catch { /* sans importance */ }
    setBrowserState(readBrowserState())
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); if (!open) void refresh() }}
        aria-label={count > 0 ? `Notifications : ${count} à traiter` : "Notifications : rien à traiter"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex size-9 items-center justify-center rounded-md border border-border-strong bg-background text-foreground hover:bg-muted"
      >
        {count > 0 ? <BellRing className="size-4" /> : <Bell className="size-4" />}
        {count > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-5 text-white" aria-hidden="true">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 top-11 z-50 flex max-h-[70vh] w-[min(92vw,26rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          <div className="border-b border-border p-3">
            <p className="font-serif text-base text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">{count > 0 ? `${count} chose${count > 1 ? "s" : ""} à traiter` : "Rien à traiter pour le moment"}</p>
          </div>
          <ul className="flex flex-col overflow-y-auto">
            {!loaded ? <li className="p-4 text-sm text-muted-foreground">Chargement…</li> : null}
            {loaded && notifications.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">Rien à signaler : aucun soin en retard, ni prévu aujourd&apos;hui ou dans les 2 prochains jours, et aucun problème sanitaire en attente.</li>
            ) : null}
            {notifications.map((notification) => (
              <li key={notification.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  disabled={!notification.nav}
                  className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/50 disabled:cursor-default"
                >
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${SEVERITY_STYLE[notification.severity]}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm leading-snug text-foreground">{notification.message}</span>
                  {notification.nav ? <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border p-3">
            {browserState === "indisponible" ? <p className="text-xs text-muted-foreground">Les alertes du navigateur ne sont pas disponibles ici.</p> : null}
            {browserState === "refuse" ? <p className="text-xs text-muted-foreground">Les alertes du navigateur sont bloquées : autorisez-les dans les réglages du site pour les activer.</p> : null}
            {browserState === "inactif" ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-muted-foreground">Une alerte par jour sur votre ordinateur quand un soin est en retard ou à faire.</p>
                <Button size="sm" variant="outline" onClick={() => void enableBrowserAlerts()}>Activer les alertes</Button>
              </div>
            ) : null}
            {browserState === "actif" ? (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-muted-foreground">Alertes du navigateur activées : une par jour au plus.</p>
                <Button size="sm" variant="ghost" onClick={disableBrowserAlerts}>Désactiver</Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
