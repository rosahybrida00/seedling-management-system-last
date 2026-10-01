"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Flower2, Sprout, CloudSun, ChartBar as BarChart3, User, Settings, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WeatherBanner } from "@/components/weather/weather-banner"
import { useAuth } from "@/components/auth/auth-provider"
import { useLanguage } from "@/lib/i18n/language-provider"
import { cn } from "@/lib/utils"
import type { TranslationKey } from "@/lib/i18n/translations"

const NAV_ITEMS: { href: string; key: TranslationKey; icon: typeof Flower2 }[] = [
  { href: "/", key: "nav_catalogue", icon: Flower2 },
  { href: "/croisement", key: "nav_croisement", icon: Flower2 },
  { href: "/serre", key: "nav_serre", icon: Sprout },
  { href: "/meteo", key: "nav_meteo", icon: CloudSun },
  { href: "/bilans", key: "nav_bilans", icon: BarChart3 },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-svh bg-background">
      <WeatherBanner />
      <header className="sticky top-0 z-40 border-b border-border bg-sidebar/95 backdrop-blur">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flower2 className="size-5" />
              </span>
              <span className="font-serif text-lg text-foreground">Sélection Rosiers</span>
            </Link>

            <nav className="ml-auto hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    {t(item.key)}
                  </Link>
                )
              })}
            </nav>

            {/* Profil / Paramètres : toujours en haut à droite, distincts de la nav principale */}
            <div className="ml-2 flex items-center gap-1 border-l border-border pl-2">
              <div className="hidden items-center gap-1 md:flex">
                <Link
                  href="/profil"
                  title={t("nav_profil")}
                  aria-label={t("nav_profil")}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md transition-colors",
                    pathname === "/profil" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <User className="size-4" />
                </Link>
                <Link
                  href="/parametres"
                  title={t("nav_parametres")}
                  aria-label={t("nav_parametres")}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-md transition-colors",
                    pathname === "/parametres" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Settings className="size-4" />
                </Link>
                {user && (
                  <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-1.5" title={t("nav_logout")}>
                    <LogOut className="size-4" />
                  </Button>
                )}
              </div>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>

          {menuOpen ? (
            <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    {t(item.key)}
                  </Link>
                )
              })}
              <div className="mt-1 border-t border-border pt-1">
                <Link
                  href="/profil"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <User className="size-4" /> {t("nav_profil")}
                </Link>
                <Link
                  href="/parametres"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Settings className="size-4" /> {t("nav_parametres")}
                </Link>
              </div>
              {user && (
                <Button variant="ghost" size="sm" onClick={() => signOut()} className="mt-1 gap-1.5">
                  <LogOut className="size-4" /> {t("nav_logout")}
                </Button>
              )}
            </nav>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  )
}
