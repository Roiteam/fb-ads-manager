import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCampaign, createAdSet } from "@/lib/facebook"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { accountId, campaign, adsets } = await request.json()

    const { data: account } = await supabase
      .from("fb_ad_accounts")
      .select("*")
      .eq("id", accountId)
      .single()

    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    const campaignRes = await createCampaign(account.account_id, account.access_token, campaign)
    const fbCampaignId = campaignRes.id

    await supabase.from("campaigns").insert({
      fb_campaign_id: fbCampaignId,
      fb_ad_account_id: account.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      daily_budget: campaign.daily_budget ? campaign.daily_budget * 100 : null,
      bid_strategy: campaign.bid_strategy,
    })

    const createdAdSets = []
    for (const adset of adsets || []) {
      try {
        const adsetRes = await createAdSet(account.account_id, account.access_token, {
          ...adset,
          campaign_id: fbCampaignId,
          billing_event: "IMPRESSIONS",
          daily_budget: adset.daily_budget ? adset.daily_budget * 100 : undefined,
        })
        createdAdSets.push(adsetRes)
      } catch (e) {
        console.error("Failed to create adset:", e)
      }
    }

    return NextResponse.json({ 
      success: true, 
      campaignId: fbCampaignId,
      adsets: createdAdSets.length 
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Launch failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
