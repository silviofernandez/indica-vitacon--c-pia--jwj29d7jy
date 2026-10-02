import pb from '@/lib/pocketbase/client'

export type NotificationChannel = 'email' | 'whatsapp'
export type NotificationEventType =
  | 'registration_received'
  | 'approved_credentials'
  | 'status_changed'
  | 'bonus_paid'
  | 'monthly_payment_reminder'

export interface SendNotificationPayload {
  channel: NotificationChannel
  event_type: NotificationEventType
  recipient?: string
  to?: string
  email?: string
  phone?: string
  user_id?: string
  indicator_id?: string
  referral_id?: string
  payload?: Record<string, unknown>
}

export interface SendNotificationResponse {
  success: boolean
  status: 'sent' | 'failed' | 'skipped'
  channel: NotificationChannel
  event_type: NotificationEventType
  recipient: string
  log_id?: string | null
  reason?: string | null
  idempotent?: boolean
  message?: string
  provider_response?: unknown
}

export interface NotificationLogRecord {
  id: string
  user_id?: string
  indicator_id?: string
  referral_id?: string
  channel?: NotificationChannel
  event_type?: NotificationEventType
  type?: string
  title?: string
  message?: string
  status?: 'sent' | 'failed' | 'skipped'
  recipient?: string
  related_id?: string
  error_message?: string
  payload_json?: Record<string, unknown>
  read?: boolean
  created: string
  updated: string
}

/**
 * Dispara envio de notificação via Edge Function /backend/v1/send-notification
 */
export async function sendNotification(
  data: SendNotificationPayload,
): Promise<{ success: boolean; data?: SendNotificationResponse; error?: string }> {
  try {
    const res = await pb.send<SendNotificationResponse>('/backend/v1/send-notification', {
      method: 'POST',
      body: data,
    })
    return { success: true, data: res }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Erro ao enviar notificação.'
    return { success: false, error: errorMsg }
  }
}

/**
 * Consulta registros de log de notificações (notifications_log)
 */
export async function listNotificationLogs(options?: {
  filter?: string
  sort?: string
  limit?: number
}): Promise<NotificationLogRecord[]> {
  try {
    const records = await pb
      .collection('notifications_log')
      .getList<NotificationLogRecord>(1, options?.limit || 50, {
        filter: options?.filter,
        sort: options?.sort || '-created',
      })
    return records.items
  } catch (err) {
    console.warn('Erro ao listar histórico de notificações:', err)
    return []
  }
}
