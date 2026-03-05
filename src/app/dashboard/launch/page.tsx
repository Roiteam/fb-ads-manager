"use client"

import { useState, useEffect } from "react"
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

const CTA_TYPES = [
  { value: "SHOP_NOW", label: "Acquista ora" },
  { value: "LEARN_MORE", label: "Scopri di più" },
  { value: "SIGN_UP", label: "Iscriviti" },
  { value: "BOOK_TRAVEL", label: "Prenota" },
  { value: "CONTACT_US", label: "Contattaci" },
  { value: "DOWNLOAD", label: "Scarica" },
  { value: "GET_OFFER", label: "Ottieni offerta" },
  { value: "GET_QUOTE", label: "Richiedi preventivo" },
  { value: "SUBSCRIBE", label: "Abbonati" },
  { value: "NO_BUTTON", label: "Nessun pulsante" },
]

interface AdSetForm {
  id: string
  name: string
  daily_budget: string
  optimization_goal: string
  pixel_id: string
  age_min: string
  age_max: string
  genders: string
  countries: string
  interests: string
}

interface AdForm {
  id: string
  name: string
  headline: string
  primary_text: string
  description: string
  link_url: string
  image_url: string
  cta_type: string
  page_id: string
}

interface PixelItem { id: string; pixel_id: string; name: string }
interface PageItem { id: string; page_id: string; name: string }

export default function LaunchPage() {
  const { accounts, selectedAccountId } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [pixels, setPixels] = useState<PixelItem[]>([])
  const [pages, setPages] = useState<PageItem[]>([])

  const [campaignName, setCampaignName] = useState("")
  const [objective, setObjective] = useState("OUTCOME_SALES")
  const [bidStrategy, setBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP")
  const [dailyBudget, setDailyBudget] = useState("")
  const [accountId, setAccountId] = useState(selectedAccountId || "")
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">("PAUSED")

  const [adsets, setAdsets] = useState<AdSetForm[]>([
    {
      id: "1", name: "", daily_budget: "", optimization_goal: "OFFSITE_CONVERSIONS",
      pixel_id: "", age_min: "18", age_max: "65", genders: "0", countries: "IT", interests: "",
    },
  ])

  const [ads, setAds] = useState<AdForm[]>([
    {
      id: "1", name: "", headline: "", primary_text: "", description: "",
      link_url: "", image_url: "", cta_type: "SHOP_NOW", page_id: "",
    },
  ])

  useEffect(() => {
    Promise.all([
      fetch("/api/user/resources?type=pixels").then(r => r.json()),
      fetch("/api/user/resources?type=pages").then(r => r.json()),
    ]).then(([pixRes, pageRes]) => {
      setPixels(pixRes.data || [])
      setPages(pageRes.data || [])
    })
  }, [])

  const addAdSet = () => {
    setAdsets((prev) => [...prev, {
      id: Date.now().toString(), name: "", daily_budget: "", optimization_goal: "OFFSITE_CONVERSIONS",
      pixel_id: "", age_min: "18", age_max: "65", genders: "0", countries: "IT", interests: "",
    }])
  }

  const removeAdSet = (id: string) => setAdsets((prev) => prev.filter((a) => a.id !== id))

  const updateAdSet = (id: string, field: keyof AdSetForm, value: string) => {
    setAdsets((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const addAd = () => {
    setAds((prev) => [...prev, {
      id: Date.now().toString(), name: "", headline: "", primary_text: "", description: "",
      link_url: "", image_url: "", cta_type: "SHOP_NOW", page_id: "",
    }])
  }

  const removeAd = (id: string) => setAds((prev) => prev.filter((a) => a.id !== id))

  const updateAd = (id: string, field: keyof AdForm, value: string) => {
    setAds((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const handleLaunch = async () => {
    if (!campaignName || !accountId) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/facebook/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          campaign: {
            name: campaignName, objective, status,
            daily_budget: dailyBudget ? parseFloat(dailyBudget) : undefined,
            bid_strategy: bidStrategy,
          },
          adsets: adsets.map((a) => ({
            name: a.name || `${campaignName} - AdSet`,
            daily_budget: a.daily_budget ? parseFloat(a.daily_budget) : undefined,
            optimization_goal: a.optimization_goal,
            pixel_id: a.pixel_id || undefined,
            targeting: {
              age_min: parseInt(a.age_min), age_max: parseInt(a.age_max),
              genders: a.genders === "0" ? [] : [parseInt(a.genders)],
              geo_locations: { countries: a.countries.split(",").map((c) => c.trim()) },
              interests: a.interests ? a.interests.split(",").map((i) => ({ name: i.trim() })) : undefined,
            },
            status,
          })),
          ads: ads.map((a) => ({
            name: a.name || `${campaignName} - Ad`,
            page_id: a.page_id || undefined,
            creative: {
              headline: a.headline, primary_text: a.primary_text, description: a.description,
              link_url: a.link_url, image_url: a.image_url, cta_type: a.cta_type,
            },
            status,
          })),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setResult({ type: "success", message: "Campagna creata con successo!" })
      } else {
        setResult({ type: "error", message: data.error || "Errore nella creazione" })
      }
    } catch {
      setResult({ type: "error", message: "Errore di connessione" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lancia Campagna</h1>
        <p className="text-gray-500">Crea e lancia nuove campagne Facebook con Ad Set, Ads, Pixel e Pagine</p>
      </div>

      {/* CAMPAIGN */}
      <Card>
        <CardHeader>
          <CardTitle>Campagna</CardTitle>
          <CardDescription>Parametri principali della campagna</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Account</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Seleziona account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Nome campagna</label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Nome campagna" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Obiettivo</label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Strategia offerta</label>
              <Select value={bidStrategy} onValueChange={setBidStrategy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BID_STRATEGIES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Budget giornaliero (€)</label>
              <Input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} placeholder="Es. 50" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Stato iniziale</label>
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

      {/* AD SETS */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ad Set ({adsets.length})</h2>
        <Button variant="outline" size="sm" onClick={addAdSet}><Plus size={16} /> Aggiungi Ad Set</Button>
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
                <label className="text-sm font-medium block mb-1.5">Nome</label>
                <Input value={adset.name} onChange={(e) => updateAdSet(adset.id, "name", e.target.value)} placeholder="Nome ad set" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Budget giornaliero (€)</label>
                <Input type="number" value={adset.daily_budget} onChange={(e) => updateAdSet(adset.id, "daily_budget", e.target.value)} placeholder="Es. 20" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Pixel (conversioni)</label>
                <Select value={adset.pixel_id} onValueChange={(v) => updateAdSet(adset.id, "pixel_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona pixel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessun pixel</SelectItem>
                    {pixels.map((p) => <SelectItem key={p.id} value={p.pixel_id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Genere</label>
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
                <label className="text-sm font-medium block mb-1.5">Paesi (virgola)</label>
                <Input value={adset.countries} onChange={(e) => updateAdSet(adset.id, "countries", e.target.value)} placeholder="IT, DE, FR" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Età min</label>
                  <Input type="number" value={adset.age_min} onChange={(e) => updateAdSet(adset.id, "age_min", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Età max</label>
                  <Input type="number" value={adset.age_max} onChange={(e) => updateAdSet(adset.id, "age_max", e.target.value)} />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-1.5">Interessi (virgola)</label>
                <Input value={adset.interests} onChange={(e) => updateAdSet(adset.id, "interests", e.target.value)} placeholder="Es. fitness, nutrition, health" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ADS */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ad Creativi ({ads.length})</h2>
        <Button variant="outline" size="sm" onClick={addAd}><Plus size={16} /> Aggiungi Ad</Button>
      </div>

      {ads.map((ad, idx) => (
        <Card key={ad.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ad #{idx + 1}</CardTitle>
            {ads.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeAd(ad.id)}>
                <Trash2 size={16} className="text-red-500" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Pagina Facebook</label>
                <Select value={ad.page_id} onValueChange={(v) => updateAd(ad.id, "page_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona pagina" /></SelectTrigger>
                  <SelectContent>
                    {pages.map((p) => <SelectItem key={p.id} value={p.page_id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Nome ad</label>
                <Input value={ad.name} onChange={(e) => updateAd(ad.id, "name", e.target.value)} placeholder="Nome dell'ad" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Titolo (headline)</label>
                <Input value={ad.headline} onChange={(e) => updateAd(ad.id, "headline", e.target.value)} placeholder="Titolo accattivante" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Call to Action</label>
                <Select value={ad.cta_type} onValueChange={(v) => updateAd(ad.id, "cta_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CTA_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-1.5">Testo principale</label>
                <Input value={ad.primary_text} onChange={(e) => updateAd(ad.id, "primary_text", e.target.value)} placeholder="Il testo che appare sopra l'immagine" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-1.5">Descrizione</label>
                <Input value={ad.description} onChange={(e) => updateAd(ad.id, "description", e.target.value)} placeholder="Descrizione sotto il titolo" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">URL di destinazione</label>
                <Input value={ad.link_url} onChange={(e) => updateAd(ad.id, "link_url", e.target.value)} placeholder="https://tuosito.com/landing" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">URL immagine</label>
                <Input value={ad.image_url} onChange={(e) => updateAd(ad.id, "image_url", e.target.value)} placeholder="https://tuosito.com/immagine.jpg" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {result && (
        <div className={`p-4 rounded-lg ${result.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {result.message}
        </div>
      )}

      <Button size="lg" onClick={handleLaunch} disabled={loading || !campaignName || !accountId} className="w-full">
        <Rocket size={18} />
        {loading ? "Creazione in corso..." : "Lancia Campagna"}
      </Button>
    </div>
  )
}
