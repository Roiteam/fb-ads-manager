import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPixels, getPages } from "@/lib/facebook"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { accountId } = await request.json()

    const { data: account } = await supabase
      .from("fb_ad_accounts")
      .select("*")
      .eq("id", accountId)
      .single()

    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    // Sync pixels
    try {
      const pixelsRes = await getPixels(account.account_id, account.access_token)
      const fbPixels = pixelsRes.data || []
      for (const pixel of fbPixels) {
        await supabase.from("fb_pixels").upsert({
          pixel_id: pixel.id,
          name: pixel.name,
          fb_ad_account_id: account.id,
        }, { onConflict: "pixel_id" })
      }
    } catch { /* ignore pixel errors */ }

    // Sync pages
    try {
      const pagesRes = await getPages(account.access_token)
      const fbPages = pagesRes.data || []
      for (const page of fbPages) {
        await supabase.from("fb_pages").upsert({
          page_id: page.id,
          name: page.name,
          access_token: page.access_token,
          fb_ad_account_id: account.id,
        }, { onConflict: "page_id" })
      }
    } catch { /* ignore page errors */ }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
