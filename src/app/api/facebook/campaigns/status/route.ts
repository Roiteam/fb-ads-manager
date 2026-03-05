import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateCampaignStatus } from "@/lib/facebook"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { campaignId, accountId, status } = await request.json()

    const { data: account } = await supabase
      .from("fb_ad_accounts")
      .select("access_token")
      .eq("id", accountId)
      .single()

    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    await updateCampaignStatus(campaignId, status, account.access_token)

    await supabase
      .from("campaigns")
      .update({ status })
      .eq("fb_campaign_id", campaignId)
      .eq("fb_ad_account_id", accountId)

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
