-- ============================================
-- FB Ads Manager - Database Schema
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  telegram_chat_id text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- FACEBOOK AD ACCOUNTS
-- ============================================
create table public.fb_ad_accounts (
  id uuid default uuid_generate_v4() primary key,
  account_id text not null unique, -- act_XXXXXXX
  name text not null,
  access_token text not null,
  currency text default 'EUR',
  timezone text default 'Europe/Rome',
  status text default 'active' check (status in ('active', 'paused', 'disabled')),
  business_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- FACEBOOK PIXELS
-- ============================================
create table public.fb_pixels (
  id uuid default uuid_generate_v4() primary key,
  pixel_id text not null unique,
  name text not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================
-- FACEBOOK PAGES
-- ============================================
create table public.fb_pages (
  id uuid default uuid_generate_v4() primary key,
  page_id text not null unique,
  name text not null,
  access_token text,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================
-- USER <-> ACCOUNT ASSIGNMENTS
-- ============================================
create table public.user_account_assignments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, fb_ad_account_id)
);

-- ============================================
-- USER <-> PIXEL ASSIGNMENTS
-- ============================================
create table public.user_pixel_assignments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  fb_pixel_id uuid references public.fb_pixels on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, fb_pixel_id)
);

-- ============================================
-- USER <-> PAGE ASSIGNMENTS
-- ============================================
create table public.user_page_assignments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  fb_page_id uuid references public.fb_pages on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, fb_page_id)
);

-- ============================================
-- CAMPAIGNS (cached from Facebook)
-- ============================================
create table public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  fb_campaign_id text not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade not null,
  name text not null,
  status text not null, -- ACTIVE, PAUSED, DELETED, ARCHIVED
  objective text,
  daily_budget numeric,
  lifetime_budget numeric,
  bid_strategy text,
  start_time timestamptz,
  stop_time timestamptz,
  created_time timestamptz,
  updated_time timestamptz,
  last_synced_at timestamptz not null default now(),
  unique(fb_campaign_id, fb_ad_account_id)
);

-- ============================================
-- AD SETS (cached from Facebook)
-- ============================================
create table public.adsets (
  id uuid default uuid_generate_v4() primary key,
  fb_adset_id text not null,
  campaign_id uuid references public.campaigns on delete cascade not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade not null,
  name text not null,
  status text not null,
  daily_budget numeric,
  lifetime_budget numeric,
  bid_amount numeric,
  optimization_goal text,
  targeting jsonb,
  last_synced_at timestamptz not null default now(),
  unique(fb_adset_id, fb_ad_account_id)
);

-- ============================================
-- ADS (cached from Facebook)
-- ============================================
create table public.ads (
  id uuid default uuid_generate_v4() primary key,
  fb_ad_id text not null,
  adset_id uuid references public.adsets on delete cascade not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade not null,
  name text not null,
  status text not null,
  creative_id text,
  preview_url text,
  last_synced_at timestamptz not null default now(),
  unique(fb_ad_id, fb_ad_account_id)
);

-- ============================================
-- CAMPAIGN INSIGHTS (daily snapshots)
-- ============================================
create table public.campaign_insights (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns on delete cascade not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade not null,
  date date not null,
  impressions integer default 0,
  clicks integer default 0,
  spend numeric(12,2) default 0,
  reach integer default 0,
  cpm numeric(10,4) default 0,
  cpc numeric(10,4) default 0,
  ctr numeric(8,4) default 0,
  conversions integer default 0,
  cost_per_conversion numeric(10,4) default 0,
  conversion_value numeric(12,2) default 0,
  roas numeric(8,4) default 0,
  frequency numeric(6,2) default 0,
  actions jsonb,
  unique(campaign_id, date)
);

-- ============================================
-- ADSET INSIGHTS (daily snapshots)
-- ============================================
create table public.adset_insights (
  id uuid default uuid_generate_v4() primary key,
  adset_id uuid references public.adsets on delete cascade not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade not null,
  date date not null,
  impressions integer default 0,
  clicks integer default 0,
  spend numeric(12,2) default 0,
  reach integer default 0,
  cpm numeric(10,4) default 0,
  cpc numeric(10,4) default 0,
  ctr numeric(8,4) default 0,
  conversions integer default 0,
  cost_per_conversion numeric(10,4) default 0,
  conversion_value numeric(12,2) default 0,
  roas numeric(8,4) default 0,
  actions jsonb,
  unique(adset_id, date)
);

-- ============================================
-- AD INSIGHTS (daily snapshots)
-- ============================================
create table public.ad_insights (
  id uuid default uuid_generate_v4() primary key,
  ad_id uuid references public.ads on delete cascade not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade not null,
  date date not null,
  impressions integer default 0,
  clicks integer default 0,
  spend numeric(12,2) default 0,
  reach integer default 0,
  cpm numeric(10,4) default 0,
  cpc numeric(10,4) default 0,
  ctr numeric(8,4) default 0,
  conversions integer default 0,
  cost_per_conversion numeric(10,4) default 0,
  conversion_value numeric(12,2) default 0,
  roas numeric(8,4) default 0,
  actions jsonb,
  unique(ad_id, date)
);

-- ============================================
-- AUTOMATION RULES
-- ============================================
create table public.automation_rules (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade not null,
  created_by uuid references public.profiles on delete cascade not null,
  is_active boolean default true,
  entity_type text not null check (entity_type in ('campaign', 'adset', 'ad')),
  entity_ids text[], -- specific entity IDs, null = all
  conditions jsonb not null, -- [{metric, operator, value}]
  actions jsonb not null, -- [{type, params}]
  evaluation_window text default '1d', -- 1h, 6h, 1d, 3d, 7d
  check_interval_minutes integer default 60,
  last_checked_at timestamptz,
  last_triggered_at timestamptz,
  trigger_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- RULE EXECUTION LOG
-- ============================================
create table public.rule_logs (
  id uuid default uuid_generate_v4() primary key,
  rule_id uuid references public.automation_rules on delete cascade not null,
  entity_type text not null,
  entity_id text not null,
  entity_name text,
  conditions_met jsonb,
  actions_taken jsonb,
  status text default 'success' check (status in ('success', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz not null default now()
);

-- ============================================
-- ALERT CONFIGURATIONS
-- ============================================
create table public.alert_configs (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete cascade,
  created_by uuid references public.profiles on delete cascade not null,
  is_active boolean default true,
  alert_type text not null check (alert_type in ('loss', 'profit', 'budget', 'performance', 'custom')),
  conditions jsonb not null,
  telegram_chat_id text,
  include_suggestions boolean default true,
  check_interval_minutes integer default 30,
  last_checked_at timestamptz,
  cooldown_minutes integer default 120, -- min time between same alerts
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- ALERT LOG
-- ============================================
create table public.alert_logs (
  id uuid default uuid_generate_v4() primary key,
  alert_config_id uuid references public.alert_configs on delete set null,
  fb_ad_account_id uuid references public.fb_ad_accounts on delete set null,
  campaign_id uuid references public.campaigns on delete set null,
  alert_type text not null,
  severity text default 'info' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  suggestions text[],
  telegram_sent boolean default false,
  telegram_message_id text,
  created_at timestamptz not null default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.fb_ad_accounts enable row level security;
alter table public.fb_pixels enable row level security;
alter table public.fb_pages enable row level security;
alter table public.user_account_assignments enable row level security;
alter table public.user_pixel_assignments enable row level security;
alter table public.user_page_assignments enable row level security;
alter table public.campaigns enable row level security;
alter table public.adsets enable row level security;
alter table public.ads enable row level security;
alter table public.campaign_insights enable row level security;
alter table public.adset_insights enable row level security;
alter table public.ad_insights enable row level security;
alter table public.automation_rules enable row level security;
alter table public.rule_logs enable row level security;
alter table public.alert_configs enable row level security;
alter table public.alert_logs enable row level security;

-- Profiles: users can read their own, admins can read all
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Admins can update all profiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- FB Ad Accounts: admins see all, users see assigned
create policy "Admins can manage ad accounts" on public.fb_ad_accounts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Users see assigned accounts" on public.fb_ad_accounts
  for select using (
    exists (
      select 1 from public.user_account_assignments
      where user_id = auth.uid() and fb_ad_account_id = fb_ad_accounts.id
    )
  );

-- Pixels: admins see all, users see assigned
create policy "Admins can manage pixels" on public.fb_pixels
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Users see assigned pixels" on public.fb_pixels
  for select using (
    exists (
      select 1 from public.user_pixel_assignments
      where user_id = auth.uid() and fb_pixel_id = fb_pixels.id
    )
  );

-- Pages: admins see all, users see assigned
create policy "Admins can manage pages" on public.fb_pages
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Users see assigned pages" on public.fb_pages
  for select using (
    exists (
      select 1 from public.user_page_assignments
      where user_id = auth.uid() and fb_page_id = fb_pages.id
    )
  );

-- Assignments: admins manage, users read own
create policy "Admins manage account assignments" on public.user_account_assignments
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Users see own account assignments" on public.user_account_assignments
  for select using (user_id = auth.uid());

create policy "Admins manage pixel assignments" on public.user_pixel_assignments
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Users see own pixel assignments" on public.user_pixel_assignments
  for select using (user_id = auth.uid());

create policy "Admins manage page assignments" on public.user_page_assignments
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Users see own page assignments" on public.user_page_assignments
  for select using (user_id = auth.uid());

-- Campaigns: visible if user has access to the account
create policy "Campaigns visible to authorized users" on public.campaigns
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.user_account_assignments
      where user_id = auth.uid() and fb_ad_account_id = campaigns.fb_ad_account_id
    )
  );
create policy "Admins manage campaigns" on public.campaigns
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- AdSets: same pattern
create policy "Adsets visible to authorized users" on public.adsets
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.user_account_assignments
      where user_id = auth.uid() and fb_ad_account_id = adsets.fb_ad_account_id
    )
  );
create policy "Admins manage adsets" on public.adsets
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Ads: same pattern
create policy "Ads visible to authorized users" on public.ads
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.user_account_assignments
      where user_id = auth.uid() and fb_ad_account_id = ads.fb_ad_account_id
    )
  );
create policy "Admins manage ads" on public.ads
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Insights: follow campaign/adset/ad access
create policy "Campaign insights visible" on public.campaign_insights
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.user_account_assignments
      where user_id = auth.uid() and fb_ad_account_id = campaign_insights.fb_ad_account_id
    )
  );
create policy "Admins manage campaign insights" on public.campaign_insights
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Adset insights visible" on public.adset_insights
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.user_account_assignments
      where user_id = auth.uid() and fb_ad_account_id = adset_insights.fb_ad_account_id
    )
  );
create policy "Admins manage adset insights" on public.adset_insights
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Ad insights visible" on public.ad_insights
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.user_account_assignments
      where user_id = auth.uid() and fb_ad_account_id = ad_insights.fb_ad_account_id
    )
  );
create policy "Admins manage ad insights" on public.ad_insights
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Automation rules: owner or admin
create policy "Rules visible to owner and admin" on public.automation_rules
  for select using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Users manage own rules" on public.automation_rules
  for all using (created_by = auth.uid());
create policy "Admins manage all rules" on public.automation_rules
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Rule logs
create policy "Rule logs visible to authorized" on public.rule_logs
  for select using (
    exists (
      select 1 from public.automation_rules
      where id = rule_logs.rule_id and (
        created_by = auth.uid()
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  );

-- Alert configs
create policy "Alert configs visible to owner and admin" on public.alert_configs
  for select using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Users manage own alerts" on public.alert_configs
  for all using (created_by = auth.uid());
create policy "Admins manage all alerts" on public.alert_configs
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Alert logs
create policy "Alert logs visible to authorized" on public.alert_logs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (
      select 1 from public.alert_configs
      where id = alert_logs.alert_config_id and created_by = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'user' end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();
create trigger update_fb_ad_accounts_updated_at before update on public.fb_ad_accounts
  for each row execute procedure public.update_updated_at();
create trigger update_automation_rules_updated_at before update on public.automation_rules
  for each row execute procedure public.update_updated_at();
create trigger update_alert_configs_updated_at before update on public.alert_configs
  for each row execute procedure public.update_updated_at();

-- ============================================
-- INDEXES
-- ============================================
create index idx_campaigns_account on public.campaigns(fb_ad_account_id);
create index idx_campaigns_status on public.campaigns(status);
create index idx_adsets_campaign on public.adsets(campaign_id);
create index idx_ads_adset on public.ads(adset_id);
create index idx_campaign_insights_date on public.campaign_insights(date);
create index idx_campaign_insights_campaign on public.campaign_insights(campaign_id);
create index idx_adset_insights_date on public.adset_insights(date);
create index idx_ad_insights_date on public.ad_insights(date);
create index idx_user_account_assignments_user on public.user_account_assignments(user_id);
create index idx_user_pixel_assignments_user on public.user_pixel_assignments(user_id);
create index idx_user_page_assignments_user on public.user_page_assignments(user_id);
create index idx_rule_logs_rule on public.rule_logs(rule_id);
create index idx_alert_logs_config on public.alert_logs(alert_config_id);
create index idx_alert_logs_campaign on public.alert_logs(campaign_id);
