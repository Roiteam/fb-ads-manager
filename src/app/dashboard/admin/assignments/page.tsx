"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, X, Monitor, Eye, FileText, Users } from "lucide-react"
import type { Profile, FbAdAccount, FbPixel, FbPage } from "@/types/database"

interface Assignment {
  id: string
  user_id: string
  fb_ad_account_id?: string
  fb_pixel_id?: string
  fb_page_id?: string
}

export default function AssignmentsPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [accounts, setAccounts] = useState<FbAdAccount[]>([])
  const [pixels, setPixels] = useState<FbPixel[]>([])
  const [pages, setPages] = useState<FbPage[]>([])
  const [accountAssignments, setAccountAssignments] = useState<Assignment[]>([])
  const [pixelAssignments, setPixelAssignments] = useState<Assignment[]>([])
  const [pageAssignments, setPageAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedUser, setSelectedUser] = useState("")
  const [selectedAccount, setSelectedAccount] = useState("")
  const [selectedPixel, setSelectedPixel] = useState("")
  const [selectedPage, setSelectedPage] = useState("")

  const load = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    const [usersRes, accountsRes, pixelsRes, pagesRes, accAssRes, pixAssRes, pageAssRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "user").order("email"),
      supabase.from("fb_ad_accounts").select("*").order("name"),
      supabase.from("fb_pixels").select("*").order("name"),
      supabase.from("fb_pages").select("*").order("name"),
      supabase.from("user_account_assignments").select("*"),
      supabase.from("user_pixel_assignments").select("*"),
      supabase.from("user_page_assignments").select("*"),
    ])

    setUsers((usersRes.data || []) as Profile[])
    setAccounts((accountsRes.data || []) as FbAdAccount[])
    setPixels((pixelsRes.data || []) as FbPixel[])
    setPages((pagesRes.data || []) as FbPage[])
    setAccountAssignments((accAssRes.data || []) as Assignment[])
    setPixelAssignments((pixAssRes.data || []) as Assignment[])
    setPageAssignments((pageAssRes.data || []) as Assignment[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const assignAccount = async () => {
    if (!selectedUser || !selectedAccount) return
    const supabase = createClient()
    await supabase.from("user_account_assignments").insert({
      user_id: selectedUser,
      fb_ad_account_id: selectedAccount,
    })
    load()
  }

  const assignPixel = async () => {
    if (!selectedUser || !selectedPixel) return
    const supabase = createClient()
    await supabase.from("user_pixel_assignments").insert({
      user_id: selectedUser,
      fb_pixel_id: selectedPixel,
    })
    load()
  }

  const assignPage = async () => {
    if (!selectedUser || !selectedPage) return
    const supabase = createClient()
    await supabase.from("user_page_assignments").insert({
      user_id: selectedUser,
      fb_page_id: selectedPage,
    })
    load()
  }

  const removeAssignment = async (table: string, id: string) => {
    const supabase = createClient()
    await supabase.from(table).delete().eq("id", id)
    load()
  }

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    return user?.full_name || user?.email || userId
  }

  const getAccountName = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId)
    return acc?.name || accountId
  }

  const getPixelName = (pixelId: string) => {
    const px = pixels.find((p) => p.id === pixelId)
    return px?.name || pixelId
  }

  const getPageName = (pageId: string) => {
    const pg = pages.find((p) => p.id === pageId)
    return pg?.name || pageId
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assegnazioni</h1>
        <p className="text-gray-500">Assegna account, pixel e pagine agli utenti</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts"><Monitor size={14} className="mr-1" /> Account ({accountAssignments.length})</TabsTrigger>
          <TabsTrigger value="pixels"><Eye size={14} className="mr-1" /> Pixel ({pixelAssignments.length})</TabsTrigger>
          <TabsTrigger value="pages"><FileText size={14} className="mr-1" /> Pagine ({pageAssignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assegna Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleziona utente" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleziona account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={assignAccount} disabled={!selectedUser || !selectedAccount}><Plus size={16} /> Assegna</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {accountAssignments.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Users size={18} className="text-gray-400" />
                    <span className="font-medium">{getUserName(a.user_id)}</span>
                    <span className="text-gray-400">&rarr;</span>
                    <Badge variant="outline">{getAccountName(a.fb_ad_account_id!)}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAssignment("user_account_assignments", a.id)}>
                    <X size={16} className="text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pixels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assegna Pixel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleziona utente" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedPixel} onValueChange={setSelectedPixel}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleziona pixel" /></SelectTrigger>
                  <SelectContent>
                    {pixels.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={assignPixel} disabled={!selectedUser || !selectedPixel}><Plus size={16} /> Assegna</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {pixelAssignments.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Users size={18} className="text-gray-400" />
                    <span className="font-medium">{getUserName(a.user_id)}</span>
                    <span className="text-gray-400">&rarr;</span>
                    <Badge variant="outline">{getPixelName(a.fb_pixel_id!)}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAssignment("user_pixel_assignments", a.id)}>
                    <X size={16} className="text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assegna Pagine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleziona utente" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedPage} onValueChange={setSelectedPage}>
                  <SelectTrigger className="w-[250px]"><SelectValue placeholder="Seleziona pagina" /></SelectTrigger>
                  <SelectContent>
                    {pages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={assignPage} disabled={!selectedUser || !selectedPage}><Plus size={16} /> Assegna</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {pageAssignments.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Users size={18} className="text-gray-400" />
                    <span className="font-medium">{getUserName(a.user_id)}</span>
                    <span className="text-gray-400">&rarr;</span>
                    <Badge variant="outline">{getPageName(a.fb_page_id!)}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAssignment("user_page_assignments", a.id)}>
                    <X size={16} className="text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
