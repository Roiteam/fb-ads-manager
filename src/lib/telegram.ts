const TELEGRAM_API = 'https://api.telegram.org/bot'

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured')
  return token
}

export async function sendTelegramMessage(chatId: string, message: string, parseMode: 'HTML' | 'Markdown' = 'HTML') {
  const token = getBotToken()
  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Telegram error: ${error.description}`)
  }

  const data = await res.json()
  return data.result.message_id?.toString()
}

export function formatAlertMessage(alert: {
  title: string
  type: string
  severity: string
  accountName: string
  campaignName?: string
  message: string
  suggestions?: string[]
}): string {
  const severityIcon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵'
  const typeIcon = alert.type === 'loss' ? '📉' : alert.type === 'profit' ? '📈' : '⚙️'

  let msg = `${severityIcon}${typeIcon} <b>${alert.title}</b>\n\n`
  msg += `📊 <b>Account:</b> ${alert.accountName}\n`
  if (alert.campaignName) {
    msg += `🎯 <b>Campagna:</b> ${alert.campaignName}\n`
  }
  msg += `\n${alert.message}\n`

  if (alert.suggestions && alert.suggestions.length > 0) {
    msg += `\n💡 <b>Suggerimenti:</b>\n`
    alert.suggestions.forEach((s, i) => {
      msg += `${i + 1}. ${s}\n`
    })
  }

  msg += `\n⏰ ${new Date().toLocaleString('it-IT')}`
  return msg
}

export function generateLossSuggestions(metrics: {
  spend: number
  conversions: number
  cpa: number
  roas: number
  ctr: number
  cpc: number
  frequency: number
}): string[] {
  const suggestions: string[] = []

  if (metrics.ctr < 1) {
    suggestions.push('CTR basso: prova a rinnovare le creatività o testare nuovi copy/hook')
  }
  if (metrics.frequency > 3) {
    suggestions.push(`Frequenza alta (${metrics.frequency.toFixed(1)}): il pubblico è saturo, espandi il targeting o escludi chi ha già visto l'annuncio`)
  }
  if (metrics.cpc > 2) {
    suggestions.push('CPC alto: verifica la rilevanza dell\'annuncio e ottimizza il targeting')
  }
  if (metrics.roas < 1 && metrics.roas > 0) {
    suggestions.push(`ROAS sotto 1 (${metrics.roas.toFixed(2)}): la campagna sta perdendo. Considera di mettere in pausa e rivedere la strategia`)
  }
  if (metrics.conversions === 0 && metrics.spend > 20) {
    suggestions.push('Nessuna conversione con spesa significativa: verifica il pixel/CAPI e la landing page')
  }
  if (suggestions.length === 0) {
    suggestions.push('Monitora la campagna nelle prossime ore prima di prendere decisioni')
  }

  return suggestions
}

export function generateProfitSuggestions(metrics: {
  roas: number
  spend: number
  conversions: number
}): string[] {
  const suggestions: string[] = []

  if (metrics.roas > 3) {
    suggestions.push(`ROAS eccellente (${metrics.roas.toFixed(2)}): considera di scalare il budget del 20-30%`)
  } else if (metrics.roas > 2) {
    suggestions.push(`Buon ROAS (${metrics.roas.toFixed(2)}): aumenta gradualmente il budget del 10-15%`)
  }
  if (metrics.conversions > 10) {
    suggestions.push('Volume conversioni buono: prova a duplicare l\'adset con audience lookalike')
  }
  suggestions.push('Continua a monitorare: i risultati possono variare nei prossimi giorni')

  return suggestions
}
