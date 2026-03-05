import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const FB_API_VERSION = "v21.0"
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`

async function fbGet(endpoint: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${FB_BASE}${endpoint}`)
  url.searchParams.set("access_token", token)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceClient = await createServiceClient()
    const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

    const { accessToken } = await request.json()
    if (!accessToken) return NextResponse.json({ error: "Token mancante" }, { status: 400 })

    const meData = await fbGet("/me/adaccounts", accessToken, {
      fields: "id,name,account_id,currency,timezone_name,account_status",
      limit: "100",
    })

    const adAccounts = meData.data || []
    const results = { accounts: 0, pixels: 0, pages: 0, errors: [] as string[] }

    for (const acc of adAccounts) {
      const { data: existing } = await serviceClient
        .from("fb_ad_accounts")
        .select("id")
        .eq("account_id", acc.id)
        .single()

      let dbAccountId: string

      if (existing) {
        dbAccountId = existing.id
        await serviceClient.from("fb_ad_accounts").update({
          name: acc.name,
          access_token: accessToken,
          currency: acc.currency || "EUR",
          timezone: acc.timezone_name || "Europe/Rome",
          status: acc.account_status === 1 ? "active" : "paused",
        }).eq("id", dbAccountId)
      } else {
        const { data: inserted } = await serviceClient.from("fb_ad_accounts").insert({
          account_id: acc.id,
          name: acc.name,
          access_token: accessToken,
          currency: acc.currency || "EUR",
          timezone: acc.timezone_name || "Europe/Rome",
          status: acc.account_status === 1 ? "active" : "paused",
        }).select("id").single()
        dbAccountId = inserted!.id
      }
      results.accounts++

      try {
        const pixelData = await fbGet(`/${acc.id}/adspixels`, accessToken, {
          fields: "id,name",
        })
        for (const px of pixelData.data || []) {
          await serviceClient.from("fb_pixels").upsert({
            pixel_id: px.id,
            name: px.name,
            fb_ad_account_id: dbAccountId,
          }, { onConflict: "pixel_id" })
          results.pixels++
        }
      } catch (e) {
        results.errors.push(`Pixel ${acc.name}: ${e instanceof Error ? e.message : "error"}`)
      }

      try {
        const pageData = await fbGet("/me/accounts", accessToken, {
          fields: "id,name,access_token",
        })
        for (const pg of pageData.data || []) {
          await serviceClient.from("fb_pages").upsert({
            page_id: pg.id,
            name: pg.name,
            access_token: pg.access_token,
            fb_ad_account_id: dbAccountId,
          }, { onConflict: "page_id" })
          results.pages++
        }
      } catch (e) {
        results.errors.push(`Pages ${acc.name}: ${e instanceof Error ? e.message : "error"}`)
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
