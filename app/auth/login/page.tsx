"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, ArrowRight, ArrowLeft, Flower2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { Card, Field, Input, Label } from "@/components/breeding/ui"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, resetPassword } = useAuth()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    router.push("/")
  }

  async function handleResetPassword() {
    if (!email) {
      setError("Saisissez votre e-mail d'abord.")
      return
    }
    setError(null)
    const { error } = await resetPassword(email)
    if (error) {
      setError(error)
    } else {
      setResetSent(true)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Flower2 className="size-7" />
          </span>
          <h1 className="font-serif text-2xl text-foreground">Sélection Rosiers</h1>
          <p className="text-sm text-muted-foreground">Carnet de croisements horticole</p>
        </div>

        <Card className="p-6">
          <h2 className="mb-1 font-serif text-lg text-foreground">Connexion</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Accédez à votre espace d'hybridation.
          </p>

          {error ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {resetSent ? (
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
              Un lien de réinitialisation a été envoyé à {email}.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="E-mail professionnel" htmlFor="email">
              <Input
                id="email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    passwordRef.current?.focus()
                  }
                }}
                placeholder="vous@pepiniere.fr"
                required
              />
            </Field>

            <Field label="Mot de passe" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" disabled={loading} className="w-full gap-1.5">
              {loading ? "Connexion…" : "Se connecter"}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <button
            onClick={handleResetPassword}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Mot de passe oublié ?
          </button>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/auth/signup" className="font-medium text-primary hover:underline">
            Créer un compte
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Retour au catalogue
          </Link>
        </div>
      </div>
    </div>
  )
}
