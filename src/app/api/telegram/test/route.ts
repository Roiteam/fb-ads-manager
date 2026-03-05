import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendTelegramMessage } from "@/lib/telegram"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { chatId } = await request.json()
    if (!chatId) return NextResponse.json({ error: "Chat ID required" }, { status: 400 })

    const messageId = await sendTelegramMessage(
      chatId,
      "🟢 <b>Test Alert - FB Ads Manager</b>\n\nIl collegamento con Telegram funziona correttamente!\n\nRiceverai qui le notifiche sulle tue campagne."
    )

    return NextResponse.json({ success: true, messageId })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
