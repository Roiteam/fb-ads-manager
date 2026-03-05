import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAdAccountCampaigns, getAdSets, getCampaignInsights, parseActions, parseActionValues } from "@/lib/facebook"

export async function POST() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: accounts } = await supabase.from("fb_ad_accounts").select("*").eq("status", "active")
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: "No accounts found" }, { status: 404 })
    }

    const today = new Date().toISOString().split("T")[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    for (const account of accounts) {
      try {
        const campaignsRes = await getAdAccountCampaigns(account.account_id, account.access_token)
        const fbCampaigns = campaignsRes.data || []

        for (const fbCamp of fbCampaigns) {
          await supabase.from("campaigns").upsert({
            fb_campaign_id: fbCamp.id,
            fb_ad_account_id: account.id,
            name: fbCamp.name,
            status: fbCamp.status,
            objective: fbCamp.objective,
            daily_budget: fbCamp.daily_budget ? parseInt(fbCamp.daily_budget) : null,
            lifetime_budget: fbCamp.lifetime_budget ? parseInt(fbCamp.lifetime_budget) : null,
            bid_strategy: fbCamp.bid_strategy,
            start_time: fbCamp.start_time,
            stop_time: fbCamp.stop_time,
            created_time: fbCamp.created_time,
            updated_time: fbCamp.updated_time,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: "fb_campaign_id,fb_ad_account_id" })
        }

        const { data: dbCampaigns } = await supabase
          .from("campaigns")
          .select("id,fb_campaign_id")
          .eq("fb_ad_account_id", account.id)

        if (dbCampaigns) {
          for (const dbCamp of dbCampaigns) {
            try {
              const insightsRes = await getCampaignInsights(
                dbCamp.fb_campaign_id,
                account.access_token,
                { since: weekAgo, until: today }
              )
              const insightsData = insightsRes.data || []

              for (const insight of insightsData) {
                const { conversions } = parseActions(insight.actions)
                const { conversionValue } = parseActionValues(insight.action_values)
                const spend = parseFloat(insight.spend || "0")

                await supabase.from("campaign_insights").upsert({
                  campaign_id: dbCamp.id,
                  fb_ad_account_id: account.id,
                  date: insight.date_start,
                  impressions: parseInt(insight.impressions || "0"),
                  clicks: parseInt(insight.clicks || "0"),
                  spend,
                  reach: parseInt(insight.reach || "0"),
                  cpm: parseFloat(insight.cpm || "0"),
                  cpc: parseFloat(insight.cpc || "0"),
                  ctr: parseFloat(insight.ctr || "0"),
                  conversions,
                  cost_per_conversion: conversions > 0 ? spend / conversions : 0,
                  conversion_value: conversionValue,
                  roas: spend > 0 ? conversionValue / spend : 0,
                  frequency: parseFloat(insight.frequency || "0"),
                  actions: insight.actions,
                }, { onConflict: "campaign_id,date" })
              }
            } catch {
              // Skip campaign insights errors
            }
          }
        }

        await supabase
          .from("fb_ad_accounts")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", account.id)
      } catch {
        // Skip account errors, continue with next
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
