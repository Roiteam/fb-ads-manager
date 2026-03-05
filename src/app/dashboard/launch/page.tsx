"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Rocket, Plus, Trash2 } from "lucide-react"

const OBJECTIVES = [
  { value: "OUTCOME_TRAFFIC", label: "Traffico" },
  { value: "OUTCOME_ENGAGEMENT", label: "Interazione" },
  { value: "OUTCOME_LEADS", label: "Contatti" },
  { value: "OUTCOME_SALES", label: "Vendite" },
  { value: "OUTCOME_AWARENESS", label: "Notorietà" },
  { value: "OUTCOME_APP_PROMOTION", label: "Promozione app" },
]

const BID_STRATEGIES = [
  { value: "LOWEST_COST_WITHOUT_CAP", label: "Costo più basso" },
  { value: "LOWEST_COST_WITH_BID_CAP", label: "Cap offerta" },
  { value: "COST_CAP", label: "Cap costo" },
  { value: "LOWEST_COST_WITH_MIN_ROAS", label: "ROAS minimo" },
]

interface AdSetForm {
  id: string
  name: string
  daily_budget: string
  optimization_goal: string
  age_min: string
  age_max: string
  genders: string
  countries: string
  interests: string
}

export default function LaunchPage() {
  const { accounts, selectedAccountId } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [campaignName, setCampaignName] = useState("")
  const [objective, setObjective] = useState("OUTCOME_SALES")
  const [bidStrategy, setBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP")
  const [dailyBudget, setDailyBudget] = useState("")
  const [accountId, setAccountId] = useState(selectedAccountId || "")
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">("PAUSED")

  const [adsets, setAdsets] = useState<AdSetForm[]>([
    {
      id: "1",
      name: "",
      daily_budget: "",
      optimization_goal: "OFFSITE_CONVERSIONS",
      age_min: "18",
      age_max: "65",
      genders: "0",
      countries: "IT",
      interests: "",
    },
  ])

  const addAdSet = () => {
    setAdsets((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: "",
        daily_budget: "",
        optimization_goal: "OFFSITE_CONVERSIONS",
        age_min: "18",
        age_max: "65",
        genders: "0",
        countries: "IT",
        interests: "",
      },
    ])
  }

  const removeAdSet = (id: string) => {
    setAdsets((prev) => prev.filter((a) => a.id !== id))
  }

  const updateAdSet = (id: string, field: keyof AdSetForm, value: string) => {
    setAdsets((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const handleLaunch = async () => {
    if (!campaignName || !accountId) return
    setLoading(true)
    setSuccess(false)

    try {
      const res = await fetch("/api/facebook/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          campaign: {
            name: campaignName,
            objective,
            status,
            daily_budget: dailyBudget ? parseFloat(dailyBudget) : undefined,
            bid_strategy: bidStrategy,
          },
          adsets: adsets.map((a) => ({
            name: a.name || `${campaignName} - AdSet`,
            daily_budget: a.daily_budget ? parseFloat(a.daily_budget) : undefined,
            optimization_goal: a.optimization_goal,
            targeting: {
              age_min: parseInt(a.age_min),
              age_max: parseInt(a.age_max),
              genders: a.genders === "0" ? [] : [parseInt(a.genders)],
              geo_locations: { countries: a.countries.split(",").map((c) => c.trim()) },
              interests: a.interests ? a.interests.split(",").map((i) => ({ name: i.trim() })) : undefined,
            },
            status,
          })),
        }),
      })

      if (res.ok) setSuccess(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lancia Campagna</h1>
        <p className="text-gray-500">Crea e lancia nuove campagne Facebook</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campagna</CardTitle>
          <CardDescription>Configura i parametri principali della campagna</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Account</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Nome campagna</label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Nome campagna" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Obiettivo</label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Strategia offerta</label>
              <Select value={bidStrategy} onValueChange={setBidStrategy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BID_STRATEGIES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Budget giornaliero (€)</label>
              <Input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="Es. 50" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Stato iniziale</label>
              <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "PAUSED")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAUSED">In pausa</SelectItem>
                  <SelectItem value="ACTIVE">Attiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ad Set ({adsets.length})</h2>
        <Button variant="outline" size="sm" onClick={addAdSet}>
          <Plus size={16} /> Aggiungi Ad Set
        </Button>
      </div>

      {adsets.map((adset, idx) => (
        <Card key={adset.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ad Set #{idx + 1}</CardTitle>
            {adsets.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeAdSet(adset.id)}>
                <Trash2 size={16} className="text-red-500" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Nome</label>
                <Input value={adset.name} onChange={(e) => updateAdSet(adset.id, "name", e.target.value)} placeholder="Nome ad set" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Budget giornaliero (€)</label>
                <Input type="number" value={adset.daily_budget} onChange={(e) => updateAdSet(adset.id, "daily_budget", e.target.value)} placeholder="Es. 20" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Paesi (separati da virgola)</label>
                <Input value={adset.countries} onChange={(e) => updateAdSet(adset.id, "countries", e.target.value)} placeholder="IT, DE, FR" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Genere</label>
                <Select value={adset.genders} onValueChange={(v) => updateAdSet(adset.id, "genders", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tutti</SelectItem>
                    <SelectItem value="1">Uomini</SelectItem>
                    <SelectItem value="2">Donne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Età minima</label>
                <Input type="number" value={adset.age_min} onChange={(e) => updateAdSet(adset.id, "age_min", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Età massima</label>
                <Input type="number" value={adset.age_max} onChange={(e) => updateAdSet(adset.id, "age_max", e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">Interessi (separati da virgola)</label>
                <Input value={adset.interests} onChange={(e) => updateAdSet(adset.id, "interests", e.target.value)} placeholder="Es. fitness, nutrition, health" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg">
          Campagna creata con successo!
        </div>
      )}

      <Button size="lg" onClick={handleLaunch} disabled={loading || !campaignName || !accountId} className="w-full">
        <Rocket size={18} />
        {loading ? "Creazione in corso..." : "Lancia Campagna"}
      </Button>
    </div>
  )
}
