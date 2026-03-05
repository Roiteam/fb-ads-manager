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
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data
}

export const maxDuration = 25

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

    const results = { accounts: 0, pixels: 0, pages: 0, errors: [] as string[] }

    // 1. Fetch ad accounts
    let adAccounts: any[] = []
    try {
      const meData = await fbGet("/me/adaccounts", accessToken, {
        fields: "id,name,account_id,currency,timezone_name,account_status",
        limit: "100",
      })
      adAccounts = meData.data || []
    } catch (e) {
      return NextResponse.json({
        error: `Errore Facebook: ${e instanceof Error ? e.message : "Token non valido"}`,
      }, { status: 400 })
    }

    if (adAccounts.length === 0) {
      return NextResponse.json({ error: "Nessun account pubblicitario trovato" }, { status: 400 })
    }

    // 2. Save ad accounts
    const accountMap: Record<string, string> = {} // fb account_id -> db uuid
    for (const acc of adAccounts) {
      try {
        const { data: existing } = await serviceClient
          .from("fb_ad_accounts")
          .select("id")
          .eq("account_id", acc.id)
          .maybeSingle()

        if (existing) {
          accountMap[acc.id] = existing.id
          await serviceClient.from("fb_ad_accounts").update({
            name: acc.name,
            access_token: accessToken,
            currency: acc.currency || "EUR",
            timezone: acc.timezone_name || "Europe/Rome",
            status: acc.account_status === 1 ? "active" : "paused",
          }).eq("id", existing.id)
        } else {
          const { data: inserted } = await serviceClient.from("fb_ad_accounts").insert({
            account_id: acc.id,
            name: acc.name,
            access_token: accessToken,
            currency: acc.currency || "EUR",
            timezone: acc.timezone_name || "Europe/Rome",
            status: acc.account_status === 1 ? "active" : "paused",
          }).select("id").single()
          if (inserted) accountMap[acc.id] = inserted.id
        }
        results.accounts++
      } catch (e) {
        results.errors.push(`Account ${acc.name}: ${e instanceof Error ? e.message : "error"}`)
      }
    }

    // 3. Fetch pixels per account (each account has its own pixels)
    for (const acc of adAccounts) {
      const dbId = accountMap[acc.id]
      if (!dbId) continue
      try {
        const pixelData = await fbGet(`/${acc.id}/adspixels`, accessToken, { fields: "id,name" })
        for (const px of pixelData.data || []) {
          await serviceClient.from("fb_pixels").upsert({
            pixel_id: px.id,
            name: px.name,
            fb_ad_account_id: dbId,
          }, { onConflict: "pixel_id" })
          results.pixels++
        }
      } catch { /* some accounts may not have pixel access */ }
    }

    // 4. Fetch pages (global, linked to first account as reference)
    try {
      const pageData = await fbGet("/me/accounts", accessToken, {
        fields: "id,name,access_token",
        limit: "100",
      })
      for (const pg of pageData.data || []) {
        await serviceClient.from("fb_pages").upsert({
          page_id: pg.id,
          name: pg.name,
          access_token: pg.access_token || null,
          fb_ad_account_id: null,
        }, { onConflict: "page_id" })
        results.pages++
      }
    } catch (e) {
      results.errors.push(`Pagine: ${e instanceof Error ? e.message : "error"}`)
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Errore interno",
    }, { status: 500 })
  }
}
