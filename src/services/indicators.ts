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
  autorizado?: boolean
  empreendimento_id?: string
  unidade_comprada_id?: string
  unidade_descricao?: string
  profile_id?: string
  created?: string
  updated?: string
  expand?: {
    empreendimento_id?: {
      id: string
      nome: string
      bairro?: string
    }
    unidade_comprada_id?: {
      id: string
      identificacao: string
      torre?: string
      valor?: number
    }
  }
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
      expand: 'empreendimento_id,unidade_comprada_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao listar indicadores:', err)
    return []
  }
}

export async function createIndicatorByMaster(data: {
  full_name: string
  email: string
  phone?: string
  cpf_cnpj?: string
  empreendimento_id?: string
  unidade_comprada_id?: string
  unidade_descricao?: string
  autorizado?: boolean
  initial_password?: string
}): Promise<{ success: boolean; data?: IndicatorRecord; error?: string }> {
  try {
    // 1. Cria ou reutiliza usuário no PocketBase se senha ou email fornecido
    const email = data.email.trim().toLowerCase()
    const password = data.initial_password || 'Vitacon@2026'
    let userId = ''
    let profileId = ''

    try {
      const existingUser = await pb.collection('users').getFirstListItem(`email="${email}"`)
      userId = existingUser.id
    } catch {
      // Cria novo usuário
      const newUser = await pb.collection('users').create({
        email: email,
        password: password,
        passwordConfirm: password,
        name: data.full_name,
        verified: true,
      })
      userId = newUser.id
    }

    // 2. Garante profile do usuário como indicador
    try {
      const existingProfile = await pb
        .collection('profiles')
        .getFirstListItem(`user_id="${userId}"`)
      profileId = existingProfile.id
      await pb.collection('profiles').update(profileId, {
        role: 'indicador',
        name: data.full_name,
        phone: data.phone || '',
      })
    } catch {
      const newProfile = await pb.collection('profiles').create({
        user_id: userId,
        name: data.full_name,
        email: email,
        phone: data.phone || '',
        role: 'indicador',
      })
      profileId = newProfile.id
    }

    // 3. Cria registro em indicators
    const rec = await pb.collection('indicators').create<IndicatorRecord>({
      full_name: data.full_name,
      email: email,
      phone: data.phone || '',
      cpf_cnpj: data.cpf_cnpj || '',
      user_id: userId,
      profile_id: profileId,
      empreendimento_id: data.empreendimento_id || '',
      unidade_comprada_id: data.unidade_comprada_id || '',
      unidade_descricao: data.unidade_descricao || '',
      autorizado: data.autorizado ?? true,
      approved: data.autorizado ?? true,
      approval_status: data.autorizado ? 'approved' : 'pending',
    })

    return { success: true, data: rec }
  } catch (err: unknown) {
    const errorObj = err as { response?: { message?: string }; message?: string }
    const errorMsg =
      errorObj?.response?.message || errorObj?.message || 'Não foi possível cadastrar o indicador.'
    return { success: false, error: errorMsg }
  }
}

export async function updateIndicatorByMaster(
  id: string,
  data: Partial<IndicatorRecord> & { new_password?: string },
): Promise<{ success: boolean; data?: IndicatorRecord; error?: string }> {
  try {
    const { new_password, ...fieldsToUpdate } = data

    // Atualiza o registro em indicators
    const updated = await pb.collection('indicators').update<IndicatorRecord>(id, {
      ...fieldsToUpdate,
      approved: fieldsToUpdate.autorizado !== undefined ? fieldsToUpdate.autorizado : undefined,
      approval_status:
        fieldsToUpdate.autorizado !== undefined
          ? fieldsToUpdate.autorizado
            ? 'approved'
            : 'pending'
          : undefined,
    })

    // Se informou nova senha e tem user_id, atualiza no users
    if (new_password && updated.user_id) {
      try {
        await pb.collection('users').update(updated.user_id, {
          password: new_password,
          passwordConfirm: new_password,
        })
      } catch (pwErr) {
        console.warn('Aviso ao atualizar senha do usuário:', pwErr)
      }
    }

    return { success: true, data: updated }
  } catch (err: unknown) {
    const errorObj = err as { response?: { message?: string }; message?: string }
    return {
      success: false,
      error: errorObj?.response?.message || errorObj?.message || 'Erro ao atualizar indicador.',
    }
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
