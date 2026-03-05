"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAppStore } from "@/lib/store"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatNumber, formatPercent, getStatusBadgeColor } from "@/lib/utils"
import {
  DollarSign,
  MousePointerClick,
  Eye,
  TrendingUp,
  Target,
  BarChart3,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import type { Campaign, CampaignInsight } from "@/types/database"

export default function DashboardPage() {
  const { selectedAccountId } = useAppStore()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      setLoading(true)

      let campaignQuery = supabase.from("campaigns").select("*, fb_ad_account:fb_ad_accounts(name)")
      if (selectedAccountId) campaignQuery = campaignQuery.eq("fb_ad_account_id", selectedAccountId)
      const { data: campaignData } = await campaignQuery

      let insightQuery = supabase
        .from("campaign_insights")
        .select("*")
        .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("date", { ascending: true })
      if (selectedAccountId) insightQuery = insightQuery.eq("fb_ad_account_id", selectedAccountId)
      const { data: insightData } = await insightQuery

      setCampaigns((campaignData || []) as Campaign[])
      setInsights((insightData || []) as CampaignInsight[])
      setLoading(false)
    }

    load()
  }, [selectedAccountId])

  const totals = insights.reduce(
    (acc, i) => ({
      spend: acc.spend + Number(i.spend),
      impressions: acc.impressions + i.impressions,
      clicks: acc.clicks + i.clicks,
      conversions: acc.conversions + i.conversions,
      conversionValue: acc.conversionValue + Number(i.conversion_value),
      reach: acc.reach + i.reach,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0, reach: 0 }
  )

  const roas = totals.spend > 0 ? totals.conversionValue / totals.spend : 0
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0

  const dailyData = insights.reduce((acc, i) => {
    const existing = acc.find((d) => d.date === i.date)
    if (existing) {
      existing.spend += Number(i.spend)
      existing.conversions += i.conversions
      existing.revenue += Number(i.conversion_value)
    } else {
      acc.push({
        date: i.date,
        spend: Number(i.spend),
        conversions: i.conversions,
        revenue: Number(i.conversion_value),
      })
    }
    return acc
  }, [] as { date: string; spend: number; conversions: number; revenue: number }[])

  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE")

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Panoramica degli ultimi 7 giorni</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Spesa" value={formatCurrency(totals.spend)} icon={DollarSign} iconColor="text-red-500" />
        <StatCard title="Impressioni" value={formatNumber(totals.impressions)} icon={Eye} iconColor="text-blue-500" />
        <StatCard title="Click" value={formatNumber(totals.clicks)} icon={MousePointerClick} iconColor="text-purple-500" />
        <StatCard title="CTR" value={formatPercent(ctr)} icon={BarChart3} iconColor="text-orange-500" />
        <StatCard title="Conversioni" value={formatNumber(totals.conversions)} icon={Target} iconColor="text-green-500" />
        <StatCard title="ROAS" value={roas.toFixed(2) + "x"} icon={TrendingUp} iconColor={roas >= 1 ? "text-green-500" : "text-red-500"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spesa vs Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Bar dataKey="spend" fill="#ef4444" name="Spesa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" fill="#22c55e" name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversioni giornaliere</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Conversioni"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campagne Attive ({activeCampaigns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeCampaigns.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nessuna campagna attiva trovata</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Campagna</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Stato</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Obiettivo</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Budget giorn.</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCampaigns.slice(0, 10).map((campaign) => (
                    <tr key={campaign.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{campaign.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="success" className={getStatusBadgeColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{campaign.objective || "-"}</td>
                      <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                        {campaign.daily_budget ? formatCurrency(campaign.daily_budget / 100) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
