"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase-client"
import { DEFAULT_LANGUAGE, TRANSLATIONS, type Language, type TranslationKey } from "./translations"

const STORAGE_KEY = "rosa-hybrida:language"

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  // Au montage : préférence locale immédiate, puis on aligne sur le profil
  // Supabase si l'utilisateur est connecté et a déjà choisi une langue.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (stored === "fr" || stored === "en") setLanguageState(stored)

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: settings } = await supabase
        .from("user_settings")
        .select("language")
        .eq("id", data.user.id)
        .maybeSingle()
      const remote = (settings as { language?: string } | null)?.language
      if (remote === "fr" || remote === "en") {
        setLanguageState(remote)
        window.localStorage.setItem(STORAGE_KEY, remote)
      }
    })
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, lang)
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from("user_settings").update({ language: lang }).eq("id", data.user.id)
    })
  }, [])

  const t = useCallback((key: TranslationKey) => TRANSLATIONS[key][language], [language])

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}
