import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getAccountInsights, parseActions, parseActionValues } from "@/lib/facebook"
import { sendTelegramMessage, formatAlertMessage, generateLossSuggestions, generateProfitSuggestions } from "@/lib/telegram"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createServiceClient()

    const { data: configs } = await supabase
      .from("alert_configs")
      .select("*")
      .eq("is_active", true)

    if (!configs || configs.length === 0) {
      return NextResponse.json({ message: "No active alerts" })
    }

    let sent = 0

    for (const config of configs) {
      try {
        const now = new Date()
        if (config.last_checked_at) {
          const lastChecked = new Date(config.last_checked_at)
          const minutesSince = (now.getTime() - lastChecked.getTime()) / 60000
          if (minutesSince < config.check_interval_minutes) continue
        }

        let accountsToCheck: { id: string; account_id: string; access_token: string; name: string }[] = []

        if (config.fb_ad_account_id) {
          const { data } = await supabase
            .from("fb_ad_accounts")
            .select("*")
            .eq("id", config.fb_ad_account_id)
            .eq("status", "active")
          accountsToCheck = data || []
        } else {
          const { data } = await supabase.from("fb_ad_accounts").select("*").eq("status", "active")
          accountsToCheck = data || []
        }

        const conditions = config.conditions as {
          metric: string
          operator: string
          value: number
          min_spend?: number
        }

        const today = new Date().toISOString().split("T")[0]

        for (const account of accountsToCheck) {
          try {
            const insightsRes = await getAccountInsights(
              account.account_id,
              account.access_token,
              { since: today, until: today },
              "campaign"
            )

            for (const insight of insightsRes.data || []) {
              const { conversions } = parseActions(insight.actions)
              const { conversionValue } = parseActionValues(insight.action_values)
              const spend = parseFloat(insight.spend || "0")

              if (conditions.min_spend && spend < conditions.min_spend) continue

              const metrics: Record<string, number> = {
                spend,
                cpa: conversions > 0 ? spend / conversions : 0,
                roas: spend > 0 ? conversionValue / spend : 0,
                ctr: parseFloat(insight.ctr || "0"),
                cpc: parseFloat(insight.cpc || "0"),
                conversions,
                impressions: parseInt(insight.impressions || "0"),
              }

              const metricValue = metrics[conditions.metric] || 0
              const triggered = evaluateCondition(metricValue, conditions.operator, conditions.value)

              if (!triggered) continue

              // Check cooldown
              const { data: recentAlerts } = await supabase
                .from("alert_logs")
                .select("created_at")
                .eq("alert_config_id", config.id)
                .eq("fb_ad_account_id", account.id)
                .order("created_at", { ascending: false })
                .limit(1)

              if (recentAlerts && recentAlerts.length > 0) {
                const lastAlert = new Date(recentAlerts[0].created_at)
                const minutesSince = (now.getTime() - lastAlert.getTime()) / 60000
                if (minutesSince < config.cooldown_minutes) continue
              }

              const isLoss = config.alert_type === "loss" || (conditions.metric === "roas" && metricValue < 1)
              const severity = isLoss ? "warning" : "info"

              const suggestions = config.include_suggestions
                ? isLoss
                  ? generateLossSuggestions({
                      spend,
                      conversions,
                      cpa: metrics.cpa,
                      roas: metrics.roas,
                      ctr: metrics.ctr,
                      cpc: metrics.cpc,
                      frequency: parseFloat(insight.frequency || "0"),
                    })
                  : generateProfitSuggestions({ roas: metrics.roas, spend, conversions })
                : undefined

              const title = isLoss
                ? `Campagna in perdita: ${insight.campaign_name}`
                : `Campagna profittevole: ${insight.campaign_name}`

              const message = `Spesa: €${spend.toFixed(2)} | ROAS: ${metrics.roas.toFixed(2)} | Conv: ${conversions} | CPA: €${metrics.cpa.toFixed(2)}`

              const chatId = config.telegram_chat_id
              let telegramSent = false
              let telegramMessageId: string | undefined

              if (chatId) {
                try {
                  const formattedMsg = formatAlertMessage({
                    title,
                    type: config.alert_type,
                    severity,
                    accountName: account.name,
                    campaignName: insight.campaign_name,
                    message,
                    suggestions,
                  })
                  telegramMessageId = await sendTelegramMessage(chatId, formattedMsg)
                  telegramSent = true
                  sent++
                } catch { /* ignore telegram errors */ }
              }

              const { data: dbCampaign } = await supabase
                .from("campaigns")
                .select("id")
                .eq("fb_campaign_id", insight.campaign_id)
                .eq("fb_ad_account_id", account.id)
                .single()

              await supabase.from("alert_logs").insert({
                alert_config_id: config.id,
                fb_ad_account_id: account.id,
                campaign_id: dbCampaign?.id || null,
                alert_type: config.alert_type,
                severity,
                title,
                message,
                suggestions,
                telegram_sent: telegramSent,
                telegram_message_id: telegramMessageId,
              })
            }
          } catch { /* ignore account errors */ }
        }

        await supabase
          .from("alert_configs")
          .update({ last_checked_at: now.toISOString() })
          .eq("id", config.id)
      } catch { /* ignore config errors */ }
    }

    return NextResponse.json({ success: true, sent })
  } catch (error) {
    return NextResponse.json({ error: "Check failed" }, { status: 500 })
  }
}

function evaluateCondition(value: number, operator: string, target: number): boolean {
  switch (operator) {
    case "gt": return value > target
    case "lt": return value < target
    case "gte": return value >= target
    case "lte": return value <= target
    case "eq": return value === target
    case "neq": return value !== target
    default: return false
  }
}
