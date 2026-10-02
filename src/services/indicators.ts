import pb from '@/lib/pocketbase/client'

export type IndicatorApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface IndicatorRecord {
  id: string
  user_id?: string
  full_name: string
  cpf_cnpj?: string
  phone?: string
  email?: string
  address?: string
  rg?: string
  approval_status?: IndicatorApprovalStatus
  rejection_reason?: string
  approved?: boolean
  profile_id?: string
  created?: string
  updated?: string
}

export interface SubmitRegistrationData {
  full_name: string
  email: string
  phone: string
  cpf: string
  rg: string
  address: string
}

export interface ApproveIndicatorResult {
  success: boolean
  message: string
  indicator_id: string
  user_id: string
  profile_id: string
  email: string
  temp_password: string
}

export interface RejectIndicatorResult {
  success: boolean
  message: string
  indicator_id: string
  rejection_reason: string
}

/**
 * Validação client-side dos dígitos do CPF
 */
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false

  // Rejeita sequências conhecidas (000.000.000-00, 111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(digits)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i)
  }
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(digits[9], 10)) return false

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i)
  }
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(digits[10], 10)) return false

  return true
}

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

/**
 * Formata telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

/**
 * Chama o backend /backend/v1/submit-indicator-registration
 */
export async function submitIndicatorRegistration(
  data: SubmitRegistrationData,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await pb.send<{ success: boolean; message: string; error?: string }>(
      '/backend/v1/submit-indicator-registration',
      {
        method: 'POST',
        body: data,
      },
    )
    return { success: true, message: res.message }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Não foi possível registrar seu cadastro. Verifique os dados digitados e tente novamente.'
    return { success: false, error: errorMsg }
  }
}

/**
 * Lista todos os indicadores para o painel de administração (Master)
 */
export async function listIndicators(): Promise<IndicatorRecord[]> {
  try {
    const records = await pb.collection('indicators').getFullList<IndicatorRecord>({
      sort: '-created',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar indicadores:', err)
    return []
  }
}

/**
 * Aprova indicador: chama /backend/v1/approve-indicator
 */
export async function approveIndicator(
  indicatorId: string,
): Promise<{ success: boolean; data?: ApproveIndicatorResult; error?: string }> {
  try {
    const res = await pb.send<ApproveIndicatorResult>('/backend/v1/approve-indicator', {
      method: 'POST',
      body: { indicator_id: indicatorId },
    })
    return { success: true, data: res }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Erro ao aprovar o indicador.'
    return { success: false, error: errorMsg }
  }
}

/**
 * Rejeita indicador: chama /backend/v1/reject-indicator
 */
export async function rejectIndicator(
  indicatorId: string,
  rejectionReason: string,
): Promise<{ success: boolean; data?: RejectIndicatorResult; error?: string }> {
  try {
    const res = await pb.send<RejectIndicatorResult>('/backend/v1/reject-indicator', {
      method: 'POST',
      body: { indicator_id: indicatorId, rejection_reason: rejectionReason },
    })
    return { success: true, data: res }
  } catch (err: unknown) {
    const errorObj = err as { response?: { error?: string; message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.error ||
      errorObj?.response?.message ||
      errorObj?.message ||
      'Erro ao rejeitar o indicador.'
    return { success: false, error: errorMsg }
  }
}
