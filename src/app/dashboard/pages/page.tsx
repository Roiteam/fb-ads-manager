"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"
import type { FbPage } from "@/types/database"

export default function PagesPage() {
  const [fbPages, setFbPages] = useState<FbPage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data } = await supabase.from("fb_pages").select("*, fb_ad_account:fb_ad_accounts(name)")
      setFbPages((data || []) as FbPage[])
      setLoading(false)
    }
    load()
  }, [])

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pagine Facebook</h1>
        <p className="text-gray-500">{fbPages.length} pagine disponibili</p>
      </div>

      {fbPages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500">Nessuna pagina trovata. Sincronizza gli account per importare le pagine.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fbPages.map((page) => (
            <Card key={page.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                    <FileText size={20} className="text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{page.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">ID: {page.page_id}</p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {(page as unknown as { fb_ad_account?: { name: string } }).fb_ad_account?.name || "N/A"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
