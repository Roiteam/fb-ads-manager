"use client"

import { useRouter } from "next/navigation"
import { LogOut, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppStore } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"

export function Header() {
  const router = useRouter()
  const { accounts, selectedAccountId, setSelectedAccountId } = useAppStore()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 dark:border-gray-700 dark:bg-gray-900/80">
      <div className="flex items-center gap-4">
        <Select
          value={selectedAccountId || "all"}
          onValueChange={(v) => setSelectedAccountId(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Tutti gli account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli account</SelectItem>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={() => router.refresh()}>
          <RefreshCw size={18} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500">
          <LogOut size={18} />
          <span className="ml-1">Esci</span>
        </Button>
      </div>
    </header>
  )
}
