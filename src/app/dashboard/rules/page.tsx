"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { METRIC_LABELS, OPERATOR_LABELS, ACTION_LABELS } from "@/lib/utils"
import { Plus, Trash2, Zap, History } from "lucide-react"
import type { AutomationRule, RuleCondition, RuleAction, RuleLog } from "@/types/database"

export default function RulesPage() {
  const { selectedAccountId, accounts, profile } = useAppStore()
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [logs, setLogs] = useState<RuleLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showLogs, setShowLogs] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [entityType, setEntityType] = useState<"campaign" | "adset" | "ad">("campaign")
  const [ruleAccountId, setRuleAccountId] = useState(selectedAccountId || "")
  const [evalWindow, setEvalWindow] = useState("1d")
  const [checkInterval, setCheckInterval] = useState("60")
  const [conditions, setConditions] = useState<RuleCondition[]>([{ metric: "spend", operator: "gt", value: 0 }])
  const [actions, setActions] = useState<RuleAction[]>([{ type: "pause", params: {} }])

  const load = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    let q = supabase.from("automation_rules").select("*, fb_ad_account:fb_ad_accounts(name)").order("created_at", { ascending: false })
    if (selectedAccountId) q = q.eq("fb_ad_account_id", selectedAccountId)
    const { data } = await q

    setRules((data || []) as AutomationRule[])
    setLoading(false)
  }, [selectedAccountId])

  useEffect(() => { load() }, [load])

  const loadLogs = async (ruleId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("rule_logs")
      .select("*")
      .eq("rule_id", ruleId)
      .order("created_at", { ascending: false })
      .limit(50)
    setLogs((data || []) as RuleLog[])
    setShowLogs(ruleId)
  }

  const handleCreate = async () => {
    const supabase = createClient()
    await supabase.from("automation_rules").insert({
      name,
      fb_ad_account_id: ruleAccountId,
      created_by: profile?.id,
      entity_type: entityType,
      conditions,
      actions,
      evaluation_window: evalWindow,
      check_interval_minutes: parseInt(checkInterval),
    })
    setShowCreate(false)
    resetForm()
    load()
  }

  const resetForm = () => {
    setName("")
    setEntityType("campaign")
    setConditions([{ metric: "spend", operator: "gt", value: 0 }])
    setActions([{ type: "pause", params: {} }])
  }

  const toggleRule = async (rule: AutomationRule) => {
    const supabase = createClient()
    await supabase.from("automation_rules").update({ is_active: !rule.is_active }).eq("id", rule.id)
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)))
  }

  const deleteRule = async (id: string) => {
    const supabase = createClient()
    await supabase.from("automation_rules").delete().eq("id", id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }

  const addCondition = () => setConditions((prev) => [...prev, { metric: "cpa", operator: "gt", value: 0 }])
  const removeCondition = (idx: number) => setConditions((prev) => prev.filter((_, i) => i !== idx))
  const updateCondition = (idx: number, field: keyof RuleCondition, value: string | number) => {
    setConditions((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const addAction = () => setActions((prev) => [...prev, { type: "send_alert", params: {} }])
  const removeAction = (idx: number) => setActions((prev) => prev.filter((_, i) => i !== idx))
  const updateAction = (idx: number, field: string, value: string | Record<string, unknown>) => {
    setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)))
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Regole Automatiche</h1>
          <p className="text-gray-500">Automatizza la gestione delle campagne</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> Nuova Regola</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crea Nuova Regola</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5">Nome regola</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Stop CPA alto" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Account</label>
                  <Select value={ruleAccountId} onValueChange={setRuleAccountId}>
                    <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Applica a</label>
                  <Select value={entityType} onValueChange={(v) => setEntityType(v as "campaign" | "adset" | "ad")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campaign">Campagne</SelectItem>
                      <SelectItem value="adset">Ad Set</SelectItem>
                      <SelectItem value="ad">Annunci</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Finestra valutazione</label>
                  <Select value={evalWindow} onValueChange={setEvalWindow}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Ultima ora</SelectItem>
                      <SelectItem value="6h">Ultime 6 ore</SelectItem>
                      <SelectItem value="1d">Oggi</SelectItem>
                      <SelectItem value="3d">Ultimi 3 giorni</SelectItem>
                      <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold">Condizioni (tutte devono essere vere)</label>
                  <Button variant="outline" size="sm" onClick={addCondition}><Plus size={14} /></Button>
                </div>
                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <Select value={cond.metric} onValueChange={(v) => updateCondition(idx, "metric", v)}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(METRIC_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={cond.operator} onValueChange={(v) => updateCondition(idx, "operator", v)}>
                      <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(OPERATOR_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={cond.value}
                      onChange={(e) => updateCondition(idx, "value", parseFloat(e.target.value) || 0)}
                      className="w-[100px]"
                    />
                    {conditions.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeCondition(idx)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold">Azioni</label>
                  <Button variant="outline" size="sm" onClick={addAction}><Plus size={14} /></Button>
                </div>
                {actions.map((action, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <Select value={action.type} onValueChange={(v) => updateAction(idx, "type", v)}>
                      <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ACTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {(action.type === "increase_budget" || action.type === "decrease_budget") && (
                      <Input
                        type="number"
                        placeholder="% variazione"
                        onChange={(e) => updateAction(idx, "params", { percentage: parseFloat(e.target.value) })}
                        className="w-[120px]"
                      />
                    )}
                    {actions.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeAction(idx)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={!name || !ruleAccountId}>Crea Regola</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Zap size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Nessuna regola creata</p>
            <p className="text-gray-400 text-sm">Crea la tua prima regola di automazione</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
                      <Badge variant={rule.is_active ? "success" : "secondary"}>
                        {rule.is_active ? "Attiva" : "Disattivata"}
                      </Badge>
                      <Badge variant="outline">{rule.entity_type}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      Account: {(rule.fb_ad_account as { name: string } | undefined)?.name || "-"} | Finestra: {rule.evaluation_window} | Eseguita {rule.trigger_count} volte
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs font-medium text-gray-500">SE:</span>
                      {rule.conditions.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {METRIC_LABELS[c.metric] || c.metric} {OPERATOR_LABELS[c.operator]} {c.value}
                        </Badge>
                      ))}
                      <span className="text-xs font-medium text-gray-500 ml-2">ALLORA:</span>
                      {rule.actions.map((a, i) => (
                        <Badge key={i} variant="default" className="text-xs">
                          {ACTION_LABELS[a.type] || a.type}
                          {a.params && 'percentage' in a.params ? ` ${a.params.percentage}%` : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => loadLogs(rule.id)}>
                      <History size={16} />
                    </Button>
                    <Switch checked={rule.is_active} onCheckedChange={() => toggleRule(rule)} />
                    <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!showLogs} onOpenChange={() => setShowLogs(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Esecuzioni</DialogTitle>
          </DialogHeader>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nessuna esecuzione registrata</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.entity_name || log.entity_id}</span>
                    <Badge variant={log.status === "success" ? "success" : log.status === "failed" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{new Date(log.created_at).toLocaleString("it-IT")}</p>
                  {log.error_message && <p className="text-xs text-red-500 mt-1">{log.error_message}</p>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
