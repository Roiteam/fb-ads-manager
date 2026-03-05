"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { LogIn } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"login" | "signup">("login")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const supabase = createClient()

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: email.split("@")[0] } },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setError("Controlla la tua email per confermare la registrazione")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <LogIn className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl">FB Ads Manager</CardTitle>
          <CardDescription>
            {mode === "login" ? "Accedi al tuo account" : "Crea un nuovo account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                Email
              </label>
              <Input
                type="email"
                placeholder="email@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className={`text-sm p-3 rounded-lg ${error.includes("email") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Caricamento..." : mode === "login" ? "Accedi" : "Registrati"}
            </Button>

            <p className="text-center text-sm text-gray-500">
              {mode === "login" ? "Non hai un account?" : "Hai già un account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-blue-600 hover:underline font-medium cursor-pointer"
              >
                {mode === "login" ? "Registrati" : "Accedi"}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
