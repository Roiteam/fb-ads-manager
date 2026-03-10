import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceClient = await createServiceClient()
    const limit = Number(request.nextUrl.searchParams.get("limit") || "30")

    const { data: memories } = await serviceClient
      .from("agent_memory")
      .select("*")
      .eq("user_id", user.id)
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit)

    return NextResponse.json({ memories: memories || [] })
  } catch (error) {
    return NextResponse.json({ error: "Error fetching memories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceClient = await createServiceClient()
    const body = await request.json()

    if (body.action === "learn") {
      return await handleLearn(serviceClient, user.id, body)
    }

    if (body.action === "increment_use") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

      const { data: current } = await serviceClient
        .from("agent_memory")
        .select("times_used")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      await serviceClient
        .from("agent_memory")
        .update({
          times_used: (current?.times_used || 0) + 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)

      return NextResponse.json({ success: true })
    }

    if (body.action === "save") {
      const { category, content, context, importance } = body
      if (!category || !content) return NextResponse.json({ error: "Category and content required" }, { status: 400 })

      const { data: existing } = await serviceClient
        .from("agent_memory")
        .select("id, content, importance, times_used")
        .eq("user_id", user.id)
        .eq("category", category)
        .ilike("content", `%${content.substring(0, 50)}%`)
        .limit(1)
        .single()

      if (existing) {
        await serviceClient
          .from("agent_memory")
          .update({
            content,
            importance: Math.min(10, Math.max(importance || existing.importance, existing.importance + 1)),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
        return NextResponse.json({ success: true, updated: true, id: existing.id })
      }

      const { data: memory, error } = await serviceClient
        .from("agent_memory")
        .insert({
          user_id: user.id,
          category,
          content,
          context: context || null,
          importance: importance || 5,
        })
        .select("id")
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, id: memory?.id })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}

async function handleLearn(
  serviceClient: any,
  userId: string,
  body: { conversation: string; actionResult?: string; actionName?: string; wasSuccessful?: boolean; userCorrection?: string }
) {
  const learnings: { category: string; content: string; context: string; importance: number }[] = []

  if (body.userCorrection) {
    learnings.push({
      category: "correction",
      content: body.userCorrection,
      context: body.conversation?.substring(0, 300) || "",
      importance: 9,
    })
  }

  if (body.actionName && body.actionResult) {
    if (body.wasSuccessful) {
      learnings.push({
        category: "successful_pattern",
        content: `Azione "${body.actionName}" eseguita con successo. Risultato: ${body.actionResult.substring(0, 500)}`,
        context: body.conversation?.substring(0, 300) || "",
        importance: 6,
      })
    } else {
      learnings.push({
        category: "mistake_learned",
        content: `Azione "${body.actionName}" fallita. Errore: ${body.actionResult.substring(0, 500)}`,
        context: body.conversation?.substring(0, 300) || "",
        importance: 8,
      })
    }
  }

  for (const learning of learnings) {
    const { data: existing } = await serviceClient
      .from("agent_memory")
      .select("id, content, importance")
      .eq("user_id", userId)
      .eq("category", learning.category)
      .ilike("content", `%${learning.content.substring(0, 40)}%`)
      .limit(1)
      .single()

    if (existing) {
      await serviceClient
        .from("agent_memory")
        .update({
          content: learning.content,
          importance: Math.min(10, existing.importance + 1),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    } else {
      await serviceClient
        .from("agent_memory")
        .insert({ user_id: userId, ...learning })
    }
  }

  const { count } = await serviceClient
    .from("agent_memory")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (count && count > 100) {
    const { data: old } = await serviceClient
      .from("agent_memory")
      .select("id")
      .eq("user_id", userId)
      .order("importance", { ascending: true })
      .order("updated_at", { ascending: true })
      .limit(count - 80)

    if (old && old.length > 0) {
      await serviceClient
        .from("agent_memory")
        .delete()
        .in("id", old.map((m: any) => m.id))
    }
  }

  return NextResponse.json({ success: true, learned: learnings.length })
}
