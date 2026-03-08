import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceClient = await createServiceClient()
    const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", user.id).single()
    const isAdmin = profile?.role === "admin"

    let managers, managerData
    if (isAdmin) {
      const res = await serviceClient.from("traffic_managers").select("*").order("name")
      managers = res.data
    } else {
      const res = await serviceClient.from("traffic_managers").select("*").eq("created_by", user.id).order("name")
      managers = res.data
    }

    const ids = (managers || []).map((m: any) => m.id)
    if (ids.length > 0) {
      const res = await serviceClient.from("traffic_manager_data").select("*").in("traffic_manager_id", ids).order("date", { ascending: false }).limit(500)
      managerData = res.data
    }

    return NextResponse.json({ managers: managers || [], data: managerData || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceClient = await createServiceClient()

    const body = await request.json()
    const { action } = body

    if (action === "create") {
      let baseUrl = body.api_base_url || ""
      let endpointPath = ""
      try {
        const parsed = new URL(baseUrl)
        if (parsed.pathname && parsed.pathname !== "/") {
          endpointPath = parsed.pathname
          baseUrl = `${parsed.protocol}//${parsed.host}`
        }
      } catch { /* not a valid URL yet */ }

      const { data, error } = await serviceClient.from("traffic_managers").insert({
        name: body.name,
        api_base_url: baseUrl,
        api_key: body.api_key || null,
        api_secret: body.api_secret || null,
        auth_type: body.auth_type || "bearer",
        auth_param_name: body.auth_param_name || "Authorization",
        endpoint_path: endpointPath || body.endpoint_path || "/",
        response_mapping: body.response_mapping || {},
        extra_params: body.extra_params || {},
        is_active: true,
        created_by: user.id,
      }).select().single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, manager: data })
    }

    if (action === "update") {
      const { id, ...updates } = body
      delete updates.action
      const { error } = await serviceClient.from("traffic_managers").update(updates).eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === "delete") {
      await serviceClient.from("traffic_manager_data").delete().eq("traffic_manager_id", body.id)
      await serviceClient.from("traffic_managers").delete().eq("id", body.id)
      return NextResponse.json({ success: true })
    }

    if (action === "fetch") {
      const { data: manager } = await serviceClient.from("traffic_managers").select("*").eq("id", body.id).single()
      if (!manager) return NextResponse.json({ error: "Not found" }, { status: 404 })

      const dateFrom = body.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      const dateTo = body.dateTo || new Date().toISOString().split("T")[0]

      let apiUrl = manager.api_base_url || ""
      if (manager.endpoint_path && manager.endpoint_path !== "/") {
        apiUrl = apiUrl.replace(/\/$/, "") + manager.endpoint_path
      }
      apiUrl = apiUrl.replace(/\/$/, "") + `/${dateFrom}/${dateTo}`

      const headers: Record<string, string> = { "Accept": "application/json" }
      if (manager.api_key) headers["x-api-key"] = manager.api_key
      if (manager.api_secret) headers["x-user-id"] = manager.api_secret

      try {
        const res = await fetch(apiUrl, { headers })
        if (!res.ok) {
          const errText = await res.text()
          return NextResponse.json({ error: `API Error ${res.status}: ${errText.slice(0, 200)}` }, { status: 400 })
        }

        const apiData = await res.json()

        let records: any[] = []
        if (Array.isArray(apiData)) {
          records = apiData
        } else if (apiData?.data && Array.isArray(apiData.data)) {
          records = apiData.data
        } else if (typeof apiData === "object" && apiData !== null) {
          records = [apiData]
        }

        let totalLeads = 0
        let totalConfirmed = 0
        let totalCanceled = 0
        let totalPending = 0
        let totalRevenue = 0
        let totalApprovedConv = 0

        const num = (v: any) => Number(v) || 0

        for (const r of records) {
          totalLeads += num(r.total_leads) || num(r.total_with_trash) || num(r.total) || 0
          totalConfirmed += num(r.confirmed?.total)
          totalCanceled += num(r.canceled?.total)
          totalPending += num(r.to_call_back?.total) + num(r.conversions?.pending?.total)
          totalApprovedConv += num(r.conversions?.approved?.total)
          totalRevenue += num(r.confirmed?.payout) + num(r.conversions?.approved?.payout)
        }

        const approved = totalApprovedConv > 0 ? totalApprovedConv : totalConfirmed
        const approvalRate = totalLeads > 0
          ? (approved / totalLeads) * 100
          : (records[0]?.confirmed?.percent || records[0]?.conversions?.approved?.percent || 0)

        const upsertData = {
          traffic_manager_id: manager.id,
          date: dateTo,
          total_conversions: totalLeads,
          approved_conversions: approved,
          rejected_conversions: totalCanceled,
          pending_conversions: totalPending,
          approval_rate: Math.round(approvalRate * 100) / 100,
          revenue: totalRevenue,
          raw_data: apiData,
        }

        const { error: upsertError } = await serviceClient.from("traffic_manager_data").upsert(
          upsertData, { onConflict: "traffic_manager_id,date" }
        )

        await serviceClient.from("traffic_managers").update({ last_synced_at: new Date().toISOString() }).eq("id", manager.id)

        return NextResponse.json({
          success: true,
          records: records.length,
          parsed: { totalLeads, approved, totalCanceled, totalPending, totalRevenue, approvalRate: Math.round(approvalRate * 100) / 100 },
          upsertError: upsertError?.message || null,
          raw_sample: records.length > 0 ? Object.keys(records[0]) : [],
          raw_first: records.length > 0 ? records[0] : null,
        })
      } catch (e) {
        return NextResponse.json({
          error: `Connessione fallita: ${e instanceof Error ? e.message : "errore"}`,
        }, { status: 400 })
      }
    }

    if (action === "test") {
      const today = new Date().toISOString().split("T")[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      let testUrl = (body.api_base_url || "").replace(/\/$/, "")
      try {
        const parsed = new URL(testUrl)
        if (parsed.pathname === "/" || parsed.pathname === "") {
          if (body.endpoint_path && body.endpoint_path !== "/") {
            testUrl = testUrl + body.endpoint_path
          }
        }
      } catch { /* not valid URL */ }
      testUrl = testUrl + `/${weekAgo}/${today}`

      const headers: Record<string, string> = { "Accept": "application/json" }
      if (body.api_key) headers["x-api-key"] = body.api_key
      if (body.api_secret) headers["x-user-id"] = body.api_secret

      try {
        const res = await fetch(testUrl, { headers })
        const text = await res.text()
        let json = null
        try { json = JSON.parse(text) } catch { /* not json */ }
        return NextResponse.json({ status: res.status, ok: res.ok, data: json, raw: json ? undefined : text.slice(0, 1000) })
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Connection failed" }, { status: 400 })
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 })
  }
}
