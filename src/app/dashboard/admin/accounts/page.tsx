"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Trash2, Monitor, Download, Loader2, Eye, FileText } from "lucide-react"
import type { FbAdAccount, FbPixel, FbPage } from "@/types/database"

export default function AccountsPage() {
  const { setAccounts } = useAppStore()
  const [fbAccounts, setFbAccounts] = useState<FbAdAccount[]>([])
  const [pixels, setPixels] = useState<FbPixel[]>([])
  const [pages, setPages] = useState<FbPage[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState("")
  const [accessToken, setAccessToken] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const [accRes, pixRes, pageRes] = await Promise.all([
      fetch("/api/admin/data?table=fb_ad_accounts").then(r => r.json()),
      fetch("/api/admin/data?table=fb_pixels").then(r => r.json()),
      fetch("/api/admin/data?table=fb_pages").then(r => r.json()),
    ])
    const accounts = (accRes.data || []) as FbAdAccount[]
    setFbAccounts(accounts)
    setAccounts(accounts)
    setPixels((pixRes.data || []) as FbPixel[])
    setPages((pageRes.data || []) as FbPage[])
    setLoading(false)
  }, [setAccounts])

  useEffect(() => { load() }, [load])

  const handleImport = async () => {
    setImporting(true)
    setImportStatus("Connessione a Facebook...")
    try {
      const res = await fetch("/api/facebook/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      })
      const result = await res.json()
      if (result.error) {
        setImportStatus(`Errore: ${result.error}`)
        setImporting(false)
        return
      }
      const r = result.results
      setImportStatus(`Importati: ${r.accounts} account, ${r.pixels} pixel, ${r.pages} pagine`)
      setAccessToken("")
      load()
      setTimeout(() => { setShowImport(false); setImportStatus("") }, 2500)
    } catch {
      setImportStatus("Errore di connessione")
    }
    setImporting(false)
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Eliminare questo account e tutti i dati associati?")) return
    await fetch("/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", table: "fb_ad_accounts", id }),
    })
    load()
  }

  const handleDeletePixel = async (id: string) => {
    if (!confirm("Eliminare questo pixel?")) return
    await fetch("/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", table: "fb_pixels", id }),
    })
    load()
  }

  const handleDeletePage = async (id: string) => {
    if (!confirm("Eliminare questa pagina?")) return
    await fetch("/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", table: "fb_pages", id }),
    })
    load()
  }

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return "—"
    const acc = fbAccounts.find(a => a.id === accountId)
    return acc?.name || "—"
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Risorse Facebook</h1>
          <p className="text-gray-500">
            {fbAccounts.length} account · {pixels.length} pixel · {pages.length} pagine
          </p>
        </div>
        <Dialog open={showImport} onOpenChange={setShowImport}>
          <DialogTrigger asChild>
            <Button><Download size={16} /> Importa da Facebook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importa da Facebook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Inserisci il tuo Access Token. Verranno importati separatamente: account pubblicitari, pixel e pagine.
              </p>
              <div>
                <label className="text-sm font-medium block mb-1.5">Access Token</label>
                <Input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Incolla il tuo access token"
                  type="password"
                />
              </div>
              {importStatus && (
                <p className={`text-sm ${importStatus.includes("Errore") ? "text-red-500" : "text-blue-500"}`}>
                  {importStatus}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImport(false)}>Annulla</Button>
              <Button onClick={handleImport} disabled={!accessToken || importing}>
                {importing ? <><Loader2 size={16} className="animate-spin" /> Importazione...</> : "Importa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">
            <Monitor size={14} className="mr-1.5" /> Account ({fbAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="pixels">
            <Eye size={14} className="mr-1.5" /> Pixel ({pixels.length})
          </TabsTrigger>
          <TabsTrigger value="pages">
            <FileText size={14} className="mr-1.5" /> Pagine ({pages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          {fbAccounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Monitor size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500">Nessun account. Importa da Facebook.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fbAccounts.map((acc) => (
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
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{acc.currency} · {acc.timezone}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteAccount(acc.id)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pixels" className="mt-4">
          {pixels.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Eye size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500">Nessun pixel trovato.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pixels.map((px) => (
                <Card key={px.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Eye size={18} className="text-blue-500" />
                      <div>
                        <p className="font-medium">{px.name}</p>
                        <p className="text-xs text-gray-400">ID: {px.pixel_id} · Account: {getAccountName(px.fb_ad_account_id)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePixel(px.id)}>
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pages" className="mt-4">
          {pages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500">Nessuna pagina trovata.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pages.map((pg) => (
                <Card key={pg.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText size={18} className="text-purple-500" />
                      <div>
                        <p className="font-medium">{pg.name}</p>
                        <p className="text-xs text-gray-400">ID: {pg.page_id}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePage(pg.id)}>
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
