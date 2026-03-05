export type UserRole = 'admin' | 'user'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  telegram_chat_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface FbAdAccount {
  id: string
  account_id: string
  name: string
  access_token: string
  currency: string
  timezone: string
  status: 'active' | 'paused' | 'disabled'
  business_id: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface FbPixel {
  id: string
  pixel_id: string
  name: string
  fb_ad_account_id: string
  created_at: string
}

export interface FbPage {
  id: string
  page_id: string
  name: string
  access_token: string | null
  fb_ad_account_id: string
  created_at: string
}

export interface Campaign {
  id: string
  fb_campaign_id: string
  fb_ad_account_id: string
  name: string
  status: string
  objective: string | null
  daily_budget: number | null
  lifetime_budget: number | null
  bid_strategy: string | null
  start_time: string | null
  stop_time: string | null
  created_time: string | null
  updated_time: string | null
  last_synced_at: string
  fb_ad_account?: FbAdAccount
}

export interface AdSet {
  id: string
  fb_adset_id: string
  campaign_id: string
  fb_ad_account_id: string
  name: string
  status: string
  daily_budget: number | null
  lifetime_budget: number | null
  bid_amount: number | null
  optimization_goal: string | null
  targeting: Record<string, unknown> | null
  last_synced_at: string
}

export interface Ad {
  id: string
  fb_ad_id: string
  adset_id: string
  fb_ad_account_id: string
  name: string
  status: string
  creative_id: string | null
  preview_url: string | null
  last_synced_at: string
}

export interface CampaignInsight {
  id: string
  campaign_id: string
  fb_ad_account_id: string
  date: string
  impressions: number
  clicks: number
  spend: number
  reach: number
  cpm: number
  cpc: number
  ctr: number
  conversions: number
  cost_per_conversion: number
  conversion_value: number
  roas: number
  frequency: number
  actions: Record<string, unknown> | null
}

export interface AutomationRule {
  id: string
  name: string
  fb_ad_account_id: string
  created_by: string
  is_active: boolean
  entity_type: 'campaign' | 'adset' | 'ad'
  entity_ids: string[] | null
  conditions: RuleCondition[]
  actions: RuleAction[]
  evaluation_window: string
  check_interval_minutes: number
  last_checked_at: string | null
  last_triggered_at: string | null
  trigger_count: number
  created_at: string
  updated_at: string
  fb_ad_account?: FbAdAccount
}

export interface RuleCondition {
  metric: string
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq'
  value: number
}

export interface RuleAction {
  type: 'pause' | 'enable' | 'increase_budget' | 'decrease_budget' | 'send_alert'
  params: Record<string, unknown>
}

export interface AlertConfig {
  id: string
  name: string
  fb_ad_account_id: string | null
  created_by: string
  is_active: boolean
  alert_type: 'loss' | 'profit' | 'budget' | 'performance' | 'custom'
  conditions: Record<string, unknown>
  telegram_chat_id: string | null
  include_suggestions: boolean
  check_interval_minutes: number
  last_checked_at: string | null
  cooldown_minutes: number
  created_at: string
  updated_at: string
}

export interface AlertLog {
  id: string
  alert_config_id: string | null
  fb_ad_account_id: string | null
  campaign_id: string | null
  alert_type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  suggestions: string[] | null
  telegram_sent: boolean
  telegram_message_id: string | null
  created_at: string
  campaign?: Campaign
  fb_ad_account?: FbAdAccount
}

export interface RuleLog {
  id: string
  rule_id: string
  entity_type: string
  entity_id: string
  entity_name: string | null
  conditions_met: Record<string, unknown> | null
  actions_taken: Record<string, unknown> | null
  status: 'success' | 'failed' | 'skipped'
  error_message: string | null
  created_at: string
}
