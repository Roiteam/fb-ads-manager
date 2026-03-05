"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, RefreshCw, Monitor, Download, Loader2 } from "lucide-react"
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
      setTimeout(() => {
        setShowImport(false)
        setImportStatus("")
      }, 2000)
    } catch {
      setImportStatus("Errore di connessione")
    }
    setImporting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo account?")) return
    await fetch("/api/admin/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", table: "fb_ad_accounts", id }),
    })
    load()
  }

  const handleRefresh = async () => {
    if (fbAccounts.length === 0) return
    const token = fbAccounts[0].access_token
    if (!token) return
    setImportStatus("Aggiornamento in corso...")
    try {
      const res = await fetch("/api/facebook/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      })
      const result = await res.json()
      if (result.results) {
        const r = result.results
        setImportStatus(`Aggiornati: ${r.accounts} account, ${r.pixels} pixel, ${r.pages} pagine`)
      }
      load()
      setTimeout(() => setImportStatus(""), 3000)
    } catch {
      setImportStatus("Errore aggiornamento")
    }
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
          {importStatus && <p className="text-sm text-blue-500 mt-1">{importStatus}</p>}
        </div>
        <div className="flex gap-2">
          {fbAccounts.length > 0 && (
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw size={16} /> Aggiorna Tutti
            </Button>
          )}
          <Dialog open={showImport} onOpenChange={setShowImport}>
            <DialogTrigger asChild>
              <Button><Download size={16} /> Importa da Facebook</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importa Account Facebook</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Inserisci il tuo Access Token di Facebook. Verranno importati automaticamente tutti gli account pubblicitari, pixel e pagine associati.
                </p>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Access Token</label>
                  <Input
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Incolla qui il tuo access token"
                    type="password"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Puoi ottenere il token da Facebook Business Settings o dal Graph API Explorer.
                </p>
                {importStatus && (
                  <p className={`text-sm ${importStatus.includes("Errore") ? "text-red-500" : "text-blue-500"}`}>
                    {importStatus}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowImport(false)}>Annulla</Button>
                <Button onClick={handleImport} disabled={!accessToken || importing}>
                  {importing ? <><Loader2 size={16} className="animate-spin" /> Importazione...</> : <><Plus size={16} /> Importa</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {fbAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Monitor size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Nessun account collegato</p>
            <p className="text-gray-400 text-sm mt-1">Clicca &quot;Importa da Facebook&quot; e inserisci il tuo token</p>
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
                    <span>-</span>
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
                  <div className="flex gap-2 pt-2 justify-end">
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
