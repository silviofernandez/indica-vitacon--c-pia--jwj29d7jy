import type { ReferralRecord } from '@/services/referrals'

/**
 * Determina se a indicação está concluída/finalizada (não pendente).
 */
export function isReferralCompleted(status?: string): boolean {
  const s = (status || '').toLowerCase().trim()
  return (
    s === 'closed_won' ||
    s === 'closed' ||
    s === 'paid' ||
    s === 'bonus_paid' ||
    s === 'closed_lost' ||
    s === 'cancelled' ||
    s === 'expired'
  )
}

/**
 * Informações sobre o SLA de uma indicação em relação ao instante atual `nowMs`.
 */
export interface SlaEvaluation {
  isPending: boolean
  isBreached: boolean
  remainingMs: number
  remainingFormatted: string | null
  deadlineDate: Date | null
}

/**
 * Formata milissegundos restantes em formato amigável em português (ex: "2h 14min restantes", "45min restantes", "1min restante").
 */
export function formatRemainingTime(remainingMs: number): string {
  if (remainingMs <= 0) {
    return '0min restantes'
  }

  const totalMinutes = Math.floor(remainingMs / (60 * 1000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}h ${minutes}min restantes`
    }
    return `${hours}h restantes`
  }

  if (minutes <= 1) {
    return '1min restante'
  }

  return `${minutes}min restantes`
}

/**
 * Avalia o SLA de um registro de indicação.
 *
 * Condição de atraso:
 * - O registro NÃO está concluído (isPending = true) E
 * - (sla_breached === true OU sla_deadline < now)
 *
 * Caso contrário, se ainda pendente e houver sla_deadline no futuro,
 * retorna o tempo restante formatado.
 */
export function evaluateReferralSla(
  referral: Pick<ReferralRecord, 'status' | 'sla_deadline' | 'sla_breached'>,
  nowMs: number = Date.now(),
): SlaEvaluation {
  const completed = isReferralCompleted(referral.status)
  if (completed) {
    return {
      isPending: false,
      isBreached: false,
      remainingMs: 0,
      remainingFormatted: null,
      deadlineDate: referral.sla_deadline ? new Date(referral.sla_deadline) : null,
    }
  }

  let deadlineDate: Date | null = null
  let deadlineTime: number | null = null

  if (referral.sla_deadline) {
    const d = new Date(referral.sla_deadline)
    if (!isNaN(d.getTime())) {
      deadlineDate = d
      deadlineTime = d.getTime()
    }
  }

  const isBreachedByFlag = Boolean(referral.sla_breached)
  const isBreachedByDeadline = deadlineTime !== null && deadlineTime <= nowMs

  const isBreached = isBreachedByFlag || isBreachedByDeadline

  if (isBreached) {
    return {
      isPending: true,
      isBreached: true,
      remainingMs: 0,
      remainingFormatted: null,
      deadlineDate,
    }
  }

  if (deadlineTime !== null) {
    const remainingMs = Math.max(0, deadlineTime - nowMs)
    return {
      isPending: true,
      isBreached: false,
      remainingMs,
      remainingFormatted: formatRemainingTime(remainingMs),
      deadlineDate,
    }
  }

  return {
    isPending: true,
    isBreached: false,
    remainingMs: 0,
    remainingFormatted: null,
    deadlineDate: null,
  }
}
