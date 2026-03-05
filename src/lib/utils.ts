import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('it-IT').format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'text-green-500'
    case 'PAUSED': return 'text-yellow-500'
    case 'DELETED':
    case 'ARCHIVED': return 'text-red-500'
    default: return 'text-gray-500'
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case 'PAUSED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case 'DELETED':
    case 'ARCHIVED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-500'
    case 'warning': return 'text-yellow-500'
    case 'info': return 'text-blue-500'
    default: return 'text-gray-500'
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export const OPERATOR_LABELS: Record<string, string> = {
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  eq: '=',
  neq: '!=',
}

export const METRIC_LABELS: Record<string, string> = {
  spend: 'Spesa',
  cpa: 'CPA',
  cpc: 'CPC',
  cpm: 'CPM',
  ctr: 'CTR',
  roas: 'ROAS',
  conversions: 'Conversioni',
  impressions: 'Impressioni',
  clicks: 'Click',
  reach: 'Copertura',
  frequency: 'Frequenza',
  cost_per_conversion: 'Costo per Conversione',
  conversion_value: 'Valore Conversioni',
}

export const ACTION_LABELS: Record<string, string> = {
  pause: 'Metti in pausa',
  enable: 'Attiva',
  increase_budget: 'Aumenta budget',
  decrease_budget: 'Diminuisci budget',
  send_alert: 'Invia alert',
}
