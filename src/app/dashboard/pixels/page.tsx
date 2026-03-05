"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye } from "lucide-react"
import type { FbPixel } from "@/types/database"

export default function PixelsPage() {
  const [pixels, setPixels] = useState<FbPixel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data } = await supabase.from("fb_pixels").select("*, fb_ad_account:fb_ad_accounts(name)")
      setPixels((data || []) as FbPixel[])
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pixel</h1>
        <p className="text-gray-500">{pixels.length} pixel disponibili</p>
      </div>

      {pixels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Eye size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500">Nessun pixel trovato. Sincronizza gli account per importare i pixel.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pixels.map((pixel) => (
            <Card key={pixel.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                    <Eye size={20} className="text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{pixel.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">ID: {pixel.pixel_id}</p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {(pixel as unknown as { fb_ad_account?: { name: string } }).fb_ad_account?.name || "N/A"}
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
