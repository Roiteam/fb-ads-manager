import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getAccountInsights, updateCampaignStatus, updateCampaignBudget, parseActions, parseActionValues } from "@/lib/facebook"
import { sendTelegramMessage, formatAlertMessage } from "@/lib/telegram"
import type { AutomationRule, RuleCondition } from "@/types/database"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createServiceClient()

    const { data: rules } = await supabase
      .from("automation_rules")
      .select("*, fb_ad_account:fb_ad_accounts(*)")
      .eq("is_active", true)

    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: "No active rules" })
    }

    let processed = 0

    for (const rule of rules as (AutomationRule & { fb_ad_account: { account_id: string; access_token: string; name: string } })[]) {
      try {
        const account = rule.fb_ad_account
        if (!account) continue

        const dateRange = getDateRange(rule.evaluation_window)
        const insightsRes = await getAccountInsights(
          account.account_id,
          account.access_token,
          dateRange,
          rule.entity_type as "campaign" | "adset" | "ad"
        )

        const insights = insightsRes.data || []

        for (const insight of insights) {
          const { conversions } = parseActions(insight.actions)
          const { conversionValue } = parseActionValues(insight.action_values)
          const spend = parseFloat(insight.spend || "0")

          const metrics: Record<string, number> = {
            spend,
            impressions: parseInt(insight.impressions || "0"),
            clicks: parseInt(insight.clicks || "0"),
            ctr: parseFloat(insight.ctr || "0"),
            cpm: parseFloat(insight.cpm || "0"),
            cpc: parseFloat(insight.cpc || "0"),
            conversions,
            cost_per_conversion: conversions > 0 ? spend / conversions : 0,
            cpa: conversions > 0 ? spend / conversions : 0,
            conversion_value: conversionValue,
            roas: spend > 0 ? conversionValue / spend : 0,
            frequency: parseFloat(insight.frequency || "0"),
          }

          const allConditionsMet = rule.conditions.every((cond: RuleCondition) => {
            const metricValue = metrics[cond.metric] || 0
            return evaluateCondition(metricValue, cond.operator, cond.value)
          })

          if (!allConditionsMet) continue

          const entityId = insight.campaign_id || insight.adset_id || insight.ad_id
          const entityName = insight.campaign_name || insight.adset_name || insight.ad_name

          for (const action of rule.actions) {
            try {
              switch (action.type) {
                case "pause":
                  await updateCampaignStatus(entityId, "PAUSED", account.access_token)
                  break
                case "enable":
                  await updateCampaignStatus(entityId, "ACTIVE", account.access_token)
                  break
                case "increase_budget": {
                  const pct = (action.params as { percentage?: number }).percentage || 10
                  const currentBudget = parseFloat(insight.daily_budget || "0")
                  if (currentBudget > 0) {
                    await updateCampaignBudget(entityId, {
                      daily_budget: (currentBudget / 100) * (1 + pct / 100),
                    }, account.access_token)
                  }
                  break
                }
                case "decrease_budget": {
                  const pct = (action.params as { percentage?: number }).percentage || 10
                  const currentBudget = parseFloat(insight.daily_budget || "0")
                  if (currentBudget > 0) {
                    await updateCampaignBudget(entityId, {
                      daily_budget: (currentBudget / 100) * (1 - pct / 100),
                    }, account.access_token)
                  }
                  break
                }
                case "send_alert": {
                  const { data: profile } = await supabase
                    .from("profiles")
                    .select("telegram_chat_id")
                    .eq("id", rule.created_by)
                    .single()

                  if (profile?.telegram_chat_id) {
                    const msg = formatAlertMessage({
                      title: `Regola "${rule.name}" attivata`,
                      type: "custom",
                      severity: "warning",
                      accountName: account.name,
                      campaignName: entityName,
                      message: `Condizioni soddisfatte per ${entityName}`,
                    })
                    await sendTelegramMessage(profile.telegram_chat_id, msg)
                  }
                  break
                }
              }

              await supabase.from("rule_logs").insert({
                rule_id: rule.id,
                entity_type: rule.entity_type,
                entity_id: entityId,
                entity_name: entityName,
                conditions_met: metrics,
                actions_taken: action,
                status: "success",
              })
            } catch (e) {
              await supabase.from("rule_logs").insert({
                rule_id: rule.id,
                entity_type: rule.entity_type,
                entity_id: entityId,
                entity_name: entityName,
                conditions_met: metrics,
                actions_taken: action,
                status: "failed",
                error_message: e instanceof Error ? e.message : "Unknown error",
              })
            }
          }

          processed++
        }

        await supabase
          .from("automation_rules")
          .update({ last_checked_at: new Date().toISOString(), trigger_count: rule.trigger_count + 1 })
          .eq("id", rule.id)
      } catch {
        // Skip rule errors
      }
    }

    return NextResponse.json({ success: true, processed })
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

function getDateRange(window: string): { since: string; until: string } {
  const until = new Date().toISOString().split("T")[0]
  const since = new Date()

  switch (window) {
    case "1h": since.setHours(since.getHours() - 1); break
    case "6h": since.setHours(since.getHours() - 6); break
    case "1d": since.setDate(since.getDate() - 1); break
    case "3d": since.setDate(since.getDate() - 3); break
    case "7d": since.setDate(since.getDate() - 7); break
    default: since.setDate(since.getDate() - 1)
  }

  return { since: since.toISOString().split("T")[0], until }
}
