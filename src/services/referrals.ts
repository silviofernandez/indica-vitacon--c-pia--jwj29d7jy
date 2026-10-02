import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'

export type ReferralPropertyType = 'buyer' | 'rental' | 'sale' | 'vitacon'

export interface CreateReferralPayload {
  client_name: string
  client_contact: string
  property_type: ReferralPropertyType
  details?: string
  raw_transcription?: string
}

/**
 * Obtém o registro do indicator correspondente ao usuário autenticado ou perfil
 */
export async function getLoggedInIndicator(userId?: string): Promise<{
  id: string
  full_name?: string
  user_id?: string
  profile_id?: string
} | null> {
  const currentUserId = userId || pb.authStore.record?.id
  if (!currentUserId) return null

  // 1. Tenta buscar em indicators por user_id
  try {
    const ind = await pb.collection('indicators').getFirstListItem(`user_id="${currentUserId}"`)
    if (ind) {
      return {
        id: ind.id,
        full_name: ind.full_name,
        user_id: ind.user_id,
        profile_id: ind.profile_id,
      }
    }
  } catch {
    // Continua para fallback
  }

  // 2. Se não encontrou diretamente por user_id, tenta buscar pelo profile_id
  try {
    const profile = await pb.collection('profiles').getFirstListItem(`user_id="${currentUserId}"`)
    if (profile) {
      const ind = await pb.collection('indicators').getFirstListItem(`profile_id="${profile.id}"`)
      if (ind) {
        return {
          id: ind.id,
          full_name: ind.full_name,
          user_id: ind.user_id,
          profile_id: ind.profile_id,
        }
      }
    }
  } catch {
    // Silencioso
  }

  return null
}

/**
 * Busca as indicações pertencentes ao indicador logado respeitando o RLS/regras da API.
 * Se o indicador tiver seu ID em 'indicators', filtra por indicator_id="{id}".
 * Também se apoia na listRule: indicator_id.user_id = @request.auth.id
 */
export async function listIndicatorReferrals(indicatorId?: string): Promise<ReferralRecord[]> {
  try {
    const filter = indicatorId ? `indicator_id = "${indicatorId}"` : ''
    const records = await pb.collection('referrals').getFullList<ReferralRecord>({
      filter: filter || undefined,
      sort: '-created',
    })
    return records
  } catch (err) {
    console.warn('Erro ao listar indicações do indicador:', err)
    return []
  }
}

/**
 * Busca os bônus acumulados do indicador logado.
 */
export async function listIndicatorBonuses(indicatorId?: string): Promise<BonusRecord[]> {
  try {
    const filter = indicatorId ? `indicator_id = "${indicatorId}"` : ''
    const records = await pb.collection('bonuses').getFullList<BonusRecord>({
      filter: filter || undefined,
      sort: '-created',
      expand: 'referral_id',
    })
    return records
  } catch (err) {
    console.warn('Erro ao listar bônus do indicador:', err)
    return []
  }
}

/**
 * Carrega todos os dados consolidados do painel do indicador:
 * - Histórico de indicações
 * - Registros de bônus
 * - Totalizadores agregados
 */
export async function getIndicatorDashboardData(userId?: string): Promise<IndicatorSummary> {
  const indicator = await getLoggedInIndicator(userId)
  const indicatorId = indicator?.id

  // Executa leituras em paralelo
  const [referrals, bonuses] = await Promise.all([
    listIndicatorReferrals(indicatorId),
    listIndicatorBonuses(indicatorId),
  ])

  // Cálculo de bônus
  let totalBonusAccumulated = 0
  let totalBonusPaid = 0
  let totalBonusPending = 0

  for (const b of bonuses) {
    const val = Number(b.amount) || 0
    totalBonusAccumulated += val
    if (b.status === 'paid') {
      totalBonusPaid += val
    } else {
      totalBonusPending += val
    }
  }

  // Contadores de indicações
  // Em andamento: sent, in_analysis, visited, negotiating, in_progress
  // Concluídas: closed_won, closed, paid
  let inProgressCount = 0
  let closedCount = 0

  for (const r of referrals) {
    const s = (r.status || '').toLowerCase()
    if (s === 'closed_won' || s === 'closed' || s === 'paid') {
      closedCount++
    } else if (s === 'closed_lost' || s === 'cancelled' || s === 'expired') {
      // finalizadas sem sucesso
    } else {
      inProgressCount++
    }
  }

  return {
    indicatorId,
    totalReferrals: referrals.length,
    inProgressCount,
    closedCount,
    totalBonusAccumulated,
    totalBonusPaid,
    totalBonusPending,
    referrals,
    bonuses,
  }
}

export interface CreateReferralResponse {
  success: boolean
  id?: string
  client_name?: string
  client_contact?: string
  property_type?: string
  status?: string
  sla_deadline?: string
  sla_hours?: number
  message?: string
  error?: string
}

export type ReferralStatus =
  | 'sent'
  | 'in_analysis'
  | 'visited'
  | 'negotiating'
  | 'closed_won'
  | 'closed_lost'
  | 'paid'
  | 'bonus_paid'
  | 'in_progress'
  | 'closed'
  | 'cancelled'
  | 'expired'
  | string

export interface ReferralRecord extends RecordModel {
  id: string
  indicator_id: string
  client_name: string
  client_phone: string
  client_email?: string
  property_description?: string
  property_type: 'rental' | 'sale' | 'vitacon' | 'buyer' | string
  expected_value?: number
  deal_value?: number
  status: ReferralStatus
  assigned_to?: string
  assigned_team_id?: string
  assigned_manager_id?: string
  assigned_by?: string
  assigned_at?: string
  notes?: string
  raw_transcription?: string
  sla_deadline?: string
  sla_breached?: boolean
  created: string
  updated: string
  // Expansões opcionais PocketBase
  expand?: {
    indicator_id?: {
      id: string
      full_name?: string
      user_id?: string
      phone?: string
      email?: string
      pix_key?: string
      pix_key_type?: string
    }
    assigned_team_id?: {
      id: string
      name: string
      leader_id?: string
    }
    assigned_manager_id?: {
      id: string
      name: string
      email?: string
    }
    assigned_by?: {
      id: string
      name: string
    }
  }
}

export interface ReferralStatusHistoryRecord {
  id: string
  referral_id: string
  old_status?: string
  new_status: string
  changed_by?: string
  notes?: string
  notified?: boolean
  created: string
  updated: string
  expand?: {
    changed_by?: {
      id: string
      name: string
      email?: string
    }
  }
}

export interface TeamRecord {
  id: string
  name: string
  description?: string
  leader_id?: string
  active?: boolean
  created: string
  updated: string
  expand?: {
    leader_id?: {
      id: string
      name: string
      email?: string
    }
  }
}

export interface TeamManagerUser {
  id: string
  name: string
  email: string
  role?: string
  team_id?: string
}

export type BonusType =
  | 'rental_fixed'
  | 'buyer_percent'
  | 'sale_percent'
  | 'vitacon_percent'
  | string
export type BonusStatus = 'pending' | 'approved' | 'paid' | string

export interface BonusRecord {
  id: string
  referral_id: string
  indicator_id: string
  bonus_type: BonusType
  amount: number
  status: BonusStatus
  payment_status?: 'pending' | 'paid' | 'cancelled' | string
  is_vitacon?: boolean
  recipient_type?: 'indicator' | 'referred' | string
  payment_notes?: string
  pix_key_used?: string
  deal_value?: number
  paid_at?: string
  created: string
  updated: string
  expand?: {
    referral_id?: ReferralRecord
    indicator_id?: {
      id: string
      full_name?: string
      user_id?: string
      phone?: string
      email?: string
      pix_key?: string
      pix_key_type?: string
      cpf_cnpj?: string
    }
  }
}

export interface IndicatorSummary {
  indicatorId?: string
  totalReferrals: number
  inProgressCount: number
  closedCount: number
  totalBonusAccumulated: number // Total de bônus acumulados (aprovados + pagos ou soma total dos bônus gerados)
  totalBonusPaid: number // Total de bônus já pagos
  totalBonusPending: number // Total de bônus pendentes / a receber
  referrals: ReferralRecord[]
  bonuses: BonusRecord[]
}

export interface TranscribeAudioResponse {
  text: string
  name?: string
  phone?: string
  error?: string
}

/**
 * Envia arquivo de áudio gravado para transcrição Whisper e extração heurística de Nome e Telefone
 */
export async function transcribeReferralAudio(audioBlob: Blob): Promise<{
  success: boolean
  data?: TranscribeAudioResponse
  error?: string
}> {
  try {
    const formData = new FormData()
    // Determina extensão apropriada
    const ext = audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a') ? 'm4a' : 'webm'
    formData.append('audio', audioBlob, `audio_referral.${ext}`)

    const res = await pb.send<TranscribeAudioResponse>('/backend/v1/transcribe-referral-audio', {
      method: 'POST',
      body: formData,
    })

    return {
      success: true,
      data: res,
    }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Não consegui ouvir o áudio, tente de novo ou preencha manualmente.'
    return {
      success: false,
      error: errorMsg,
    }
  }
}

/**
 * Lista todas as indicações (visão administrativa para operador, gerente ou master)
 */
export async function listAllReferrals(options?: {
  filter?: string
  sort?: string
  page?: number
  perPage?: number
}): Promise<{ items: ReferralRecord[]; totalItems: number }> {
  try {
    const res = await pb
      .collection('referrals')
      .getList<ReferralRecord>(options?.page || 1, options?.perPage || 200, {
        filter: options?.filter,
        sort: options?.sort || '-created',
        expand: 'indicator_id,assigned_team_id,assigned_manager_id,assigned_by',
      })
    return {
      items: res.items,
      totalItems: res.totalItems,
    }
  } catch (err) {
    console.warn('Erro ao listar todas as indicações:', err)
    return { items: [], totalItems: 0 }
  }
}

/**
 * Obtém uma única indicação pelo ID com todas as expansões (indicador, equipe, gestor)
 */
export async function getReferralById(id: string): Promise<ReferralRecord | null> {
  try {
    const rec = await pb.collection('referrals').getOne<ReferralRecord>(id, {
      expand: 'indicator_id,assigned_team_id,assigned_manager_id,assigned_by',
    })
    return rec
  } catch (err) {
    console.warn('Erro ao buscar indicação por ID:', err)
    return null
  }
}

/**
 * Lista o histórico de status de uma indicação específica
 */
export async function listReferralStatusHistory(
  referralId: string,
): Promise<ReferralStatusHistoryRecord[]> {
  try {
    const records = await pb
      .collection('referral_status_history')
      .getFullList<ReferralStatusHistoryRecord>({
        filter: `referral_id = "${referralId}"`,
        sort: '-created',
        expand: 'changed_by',
      })
    return records
  } catch (err) {
    console.warn('Erro ao listar histórico de status:', err)
    return []
  }
}

/**
 * Lista as equipes ativas do sistema
 */
export async function listTeams(): Promise<TeamRecord[]> {
  try {
    const records = await pb.collection('teams').getFullList<TeamRecord>({
      filter: 'active = true || active = null',
      sort: 'name',
      expand: 'leader_id',
    })
    return records
  } catch (err) {
    console.warn('Erro ao listar equipes:', err)
    return []
  }
}

/**
 * Lista gestores e líderes elegíveis para atribuição
 */
export async function listTeamManagers(): Promise<TeamManagerUser[]> {
  try {
    // Busca perfis com role 'manager' ou 'master' ou 'operator'
    const profiles = await pb.collection('profiles').getFullList({
      filter: 'role = "manager" || role = "master" || role = "operator"',
      sort: 'name',
      expand: 'user_id',
    })

    return profiles.map((p) => ({
      id: p.user_id,
      name: p.name || p.email,
      email: p.email,
      role: p.role,
      team_id: p.team_id,
    }))
  } catch (err) {
    console.warn('Erro ao listar gestores:', err)
    return []
  }
}

export interface AssignReferralPayload {
  referral_id: string
  assigned_team_id?: string
  assigned_manager_id?: string
}

export interface AssignReferralResponse {
  success: boolean
  message: string
  referral_id?: string
  assigned_team_id?: string | null
  assigned_manager_id?: string | null
  assigned_by?: string
  assigned_at?: string
  status?: string
  error?: string
}

/**
 * Chama o endpoint backend para encaminhar a indicação (assign-referral)
 */
export async function assignReferral(
  payload: AssignReferralPayload,
): Promise<{ success: boolean; data?: AssignReferralResponse; error?: string }> {
  try {
    const res = await pb.send<AssignReferralResponse>('/backend/v1/assign-referral', {
      method: 'POST',
      body: {
        referral_id: payload.referral_id,
        assigned_team_id: payload.assigned_team_id,
        assigned_manager_id: payload.assigned_manager_id,
      },
    })
    return { success: true, data: res }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Não foi possível encaminhar a indicação.'
    return { success: false, error: errorMsg }
  }
}

export interface UpdateReferralStatusPayload {
  referral_id: string
  status: string
  notes?: string
  deal_value?: number
}

export interface UpdateReferralStatusResponse {
  success: boolean
  message: string
  referral_id?: string
  old_status?: string
  new_status?: string
  notes?: string
  history_id?: string
  created_bonuses?: Array<{
    id: string
    recipient: string
    type: string
    amount: number
  }>
  error?: string
}

/**
 * Chama o endpoint backend para atualizar status da indicação (update-referral-status)
 */
export async function updateReferralStatus(
  payload: UpdateReferralStatusPayload,
): Promise<{ success: boolean; data?: UpdateReferralStatusResponse; error?: string }> {
  try {
    const res = await pb.send<UpdateReferralStatusResponse>('/backend/v1/update-referral-status', {
      method: 'POST',
      body: {
        referral_id: payload.referral_id,
        status: payload.status,
        notes: payload.notes || '',
        deal_value: payload.deal_value,
      },
    })
    return { success: true, data: res }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Não foi possível atualizar o status da indicação.'
    return { success: false, error: errorMsg }
  }
}

export interface CalculateBonusPayload {
  referral_id: string
  deal_value?: number
  force_recalculate?: boolean
}

export interface CalculateBonusResponse {
  success: boolean
  message: string
  referral_id?: string
  property_type?: string
  deal_value?: number
  already_calculated?: boolean
  created_bonuses?: Array<{
    id: string
    recipient: string
    type: string
    amount: number
  }>
  error?: string
}

/**
 * Dispara o cálculo e geração de bônus via RPC fn_calculate_bonus
 */
export async function calculateBonus(
  payload: CalculateBonusPayload,
): Promise<{ success: boolean; data?: CalculateBonusResponse; error?: string }> {
  try {
    const res = await pb.send<CalculateBonusResponse>('/backend/v1/calculate-bonus', {
      method: 'POST',
      body: {
        referral_id: payload.referral_id,
        deal_value: payload.deal_value,
        force_recalculate: payload.force_recalculate,
      },
    })
    return { success: true, data: res }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Não foi possível calcular o bônus desta indicação.'
    return { success: false, error: errorMsg }
  }
}

export interface RegisterBonusPaymentPayload {
  bonus_id: string
  pix_key_used?: string
  payment_notes?: string
  paid_at?: string
}

export interface RegisterBonusPaymentResponse {
  success: boolean
  message: string
  bonus_id?: string
  amount?: number
  paid_at?: string
  pix_key_used?: string
  referral_id?: string
  referral_new_status?: string
  already_paid?: boolean
  error?: string
}

/**
 * Dispara o registro e quitação de pagamento do bônus (register-bonus-payment)
 */
export async function registerBonusPayment(
  payload: RegisterBonusPaymentPayload,
): Promise<{ success: boolean; data?: RegisterBonusPaymentResponse; error?: string }> {
  try {
    const res = await pb.send<RegisterBonusPaymentResponse>('/backend/v1/register-bonus-payment', {
      method: 'POST',
      body: {
        bonus_id: payload.bonus_id,
        pix_key_used: payload.pix_key_used,
        payment_notes: payload.payment_notes,
        paid_at: payload.paid_at,
      },
    })
    return { success: true, data: res }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Não foi possível registrar o pagamento do bônus.'
    return { success: false, error: errorMsg }
  }
}

/**
 * Lista todos os bônus com opções de filtro e expansão (para gestão financeira e vitacon)
 */
export async function listAllBonuses(options?: {
  filter?: string
  sort?: string
}): Promise<BonusRecord[]> {
  try {
    const records = await pb.collection('bonuses').getFullList<BonusRecord>({
      filter: options?.filter,
      sort: options?.sort || '-created',
      expand: 'referral_id,indicator_id',
    })
    return records
  } catch (err) {
    console.warn('Erro ao listar todos os bônus:', err)
    return []
  }
}

/**
 * Cria indicação no backend PocketBase calculando SLA de 3 horas e registrando histórico inicial
 */
export async function createReferral(payload: CreateReferralPayload): Promise<{
  success: boolean
  data?: CreateReferralResponse
  error?: string
}> {
  try {
    const res = await pb.send<CreateReferralResponse>('/backend/v1/create-referral', {
      method: 'POST',
      body: {
        client_name: payload.client_name,
        client_contact: payload.client_contact,
        property_type: payload.property_type,
        details: payload.details || '',
        raw_transcription: payload.raw_transcription || '',
      },
    })

    return {
      success: true,
      data: res,
    }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Não foi possível registrar a indicação. Verifique os dados e tente novamente.'
    return {
      success: false,
      error: errorMsg,
    }
  }
}
