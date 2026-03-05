"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Users, UserPlus, Shield, Trash2 } from "lucide-react"
import type { Profile } from "@/types/database"

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"user" | "admin">("user")

  const load = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    const { data } = await supabase.from("profiles").select("*").order("created_at")
    setUsers((data || []) as Profile[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleInvite = async () => {
    try {
      await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      setShowInvite(false)
      setInviteEmail("")
    } catch { /* ignore */ }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    const supabase = createClient()
    await supabase.from("profiles").update({ role }).eq("id", userId)
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: role as "admin" | "user" } : u)))
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo utente?")) return
    try {
      await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      load()
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestione Utenti</h1>
          <p className="text-gray-500">{users.length} utenti registrati</p>
        </div>
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button><UserPlus size={16} /> Invita Utente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invita Nuovo Utente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Email</label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@esempio.com" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Ruolo</label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "user" | "admin")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utente</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInvite(false)}>Annulla</Button>
              <Button onClick={handleInvite} disabled={!inviteEmail}>Invia Invito</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Nessun utente trovato</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.full_name || user.email}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {user.telegram_chat_id && (
                      <Badge variant="outline" className="text-xs">Telegram collegato</Badge>
                    )}
                    <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Utente</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Registrato il {new Date(user.created_at).toLocaleDateString("it-IT")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
