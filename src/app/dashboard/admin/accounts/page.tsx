"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, RefreshCw, Monitor } from "lucide-react"
import type { FbAdAccount, FbPixel, FbPage } from "@/types/database"

export default function AccountsPage() {
  const { setAccounts } = useAppStore()
  const [fbAccounts, setFbAccounts] = useState<FbAdAccount[]>([])
  const [pixels, setPixels] = useState<FbPixel[]>([])
  const [pages, setPages] = useState<FbPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const [accountId, setAccountId] = useState("")
  const [accountName, setAccountName] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [currency, setCurrency] = useState("EUR")
  const [timezone, setTimezone] = useState("Europe/Rome")

  const load = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    const { data: accData } = await supabase.from("fb_ad_accounts").select("*").order("name")
    const { data: pixelData } = await supabase.from("fb_pixels").select("*")
    const { data: pageData } = await supabase.from("fb_pages").select("*")

    const accounts = (accData || []) as FbAdAccount[]
    setFbAccounts(accounts)
    setAccounts(accounts)
    setPixels((pixelData || []) as FbPixel[])
    setPages((pageData || []) as FbPage[])
    setLoading(false)
  }, [setAccounts])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const supabase = createClient()
    const { error } = await supabase.from("fb_ad_accounts").insert({
      account_id: accountId.startsWith("act_") ? accountId : `act_${accountId}`,
      name: accountName,
      access_token: accessToken,
      currency,
      timezone,
    })
    if (!error) {
      setShowAdd(false)
      setAccountId("")
      setAccountName("")
      setAccessToken("")
      load()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo account?")) return
    const supabase = createClient()
    await supabase.from("fb_ad_accounts").delete().eq("id", id)
    load()
  }

  const handleSyncPixelsPages = async (account: FbAdAccount) => {
    try {
      await fetch("/api/facebook/sync-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Facebook</h1>
          <p className="text-gray-500">{fbAccounts.length} account collegati</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> Aggiungi Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Account Facebook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Account ID</label>
                <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="act_XXXXXXXXX" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Nome</label>
                <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Nome account" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Access Token</label>
                <Input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Token di accesso" type="password" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Valuta</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Timezone</label>
                  <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Annulla</Button>
              <Button onClick={handleAdd} disabled={!accountId || !accountName || !accessToken}>Aggiungi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {fbAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Monitor size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Nessun account collegato</p>
            <p className="text-gray-400 text-sm">Aggiungi il tuo primo account Facebook Ads</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fbAccounts.map((acc) => {
            const accPixels = pixels.filter((p) => p.fb_ad_account_id === acc.id)
            const accPages = pages.filter((p) => p.fb_ad_account_id === acc.id)
            return (
              <Card key={acc.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{acc.name}</CardTitle>
                      <p className="text-xs text-gray-400 mt-1">{acc.account_id}</p>
                    </div>
                    <Badge variant={acc.status === "active" ? "success" : "secondary"}>
                      {acc.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>{acc.currency}</span>
                    <span>•</span>
                    <span>{acc.timezone}</span>
                  </div>

                  {accPixels.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Pixel ({accPixels.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {accPixels.map((p) => (
                          <Badge key={p.id} variant="outline" className="text-xs">{p.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {accPages.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Pagine ({accPages.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {accPages.map((p) => (
                          <Badge key={p.id} variant="outline" className="text-xs">{p.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleSyncPixelsPages(acc)}>
                      <RefreshCw size={14} /> Sync Pixel/Pagine
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(acc.id)}>
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
