import pb from '@/lib/pocketbase/client'

export interface BonusSettingItem {
  id: string
  key: string
  value: string
  description: string
  created: string
  updated: string
}

export interface TeamItem {
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
      name?: string
      email?: string
    }
  }
}

export interface TeamMemberItem {
  id: string
  team_id: string
  user_id: string
  role_in_team: 'leader' | 'member'
  joined_at?: string
  created: string
  updated: string
  expand?: {
    user_id?: {
      id: string
      name?: string
      email?: string
    }
    team_id?: TeamItem
  }
}

export interface EligibleUserItem {
  id: string // auth user id
  profile_id: string
  name: string
  email: string
  role: 'master' | 'operator' | 'manager' | 'indicador'
  phone?: string
  team_id?: string
}

// -------------------------------------------------------------
// BONUS SETTINGS
// -------------------------------------------------------------
export async function listBonusSettings(): Promise<BonusSettingItem[]> {
  try {
    const list = await pb.collection('bonus_settings').getFullList<BonusSettingItem>({
      sort: 'key',
    })
    return list
  } catch (err) {
    console.warn('Erro ao carregar bonus_settings:', err)
    return []
  }
}

export async function updateBonusSetting(
  keyOrId: string,
  newValue: string | number,
): Promise<{ success: boolean; data?: BonusSettingItem; error?: string }> {
  try {
    const strVal = String(newValue).trim()
    let recordId = keyOrId

    // Se for passada a chave (ex: 'rental_fixed_amount'), busca o id
    if (!keyOrId.match(/^[a-z0-9]{15}$/i)) {
      const existing = await pb.collection('bonus_settings').getFirstListItem(`key = "${keyOrId}"`)
      recordId = existing.id
    }

    const updated = await pb.collection('bonus_settings').update<BonusSettingItem>(recordId, {
      value: strVal,
    })

    return { success: true, data: updated }
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    return {
      success: false,
      error: errorObj?.message || 'Erro ao salvar configuração.',
    }
  }
}

// -------------------------------------------------------------
// TEAMS
// -------------------------------------------------------------
export async function listAllTeams(): Promise<TeamItem[]> {
  try {
    const list = await pb.collection('teams').getFullList<TeamItem>({
      sort: '-active,name',
      expand: 'leader_id',
    })
    return list
  } catch (err) {
    console.warn('Erro ao listar equipes:', err)
    return []
  }
}

export async function createTeam(payload: {
  name: string
  description?: string
  leader_id?: string
  active?: boolean
}): Promise<{ success: boolean; data?: TeamItem; error?: string }> {
  try {
    if (!payload.name?.trim()) {
      return { success: false, error: 'O nome da equipe é obrigatório.' }
    }

    const created = await pb.collection('teams').create<TeamItem>({
      name: payload.name.trim(),
      description: payload.description?.trim() || '',
      leader_id: payload.leader_id || null,
      active: payload.active !== undefined ? payload.active : true,
    })

    // Se tiver líder definido, já adiciona automaticamente como membro líder em team_members
    if (payload.leader_id) {
      try {
        await addTeamMember({
          team_id: created.id,
          user_id: payload.leader_id,
          role_in_team: 'leader',
        })
      } catch (_) {
        // Se já existir não interrompe a criação
      }
    }

    return { success: true, data: created }
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    return {
      success: false,
      error: errorObj?.message || 'Erro ao criar equipe.',
    }
  }
}

export async function updateTeam(
  id: string,
  payload: {
    name?: string
    description?: string
    leader_id?: string | null
    active?: boolean
  },
): Promise<{ success: boolean; data?: TeamItem; error?: string }> {
  try {
    const updatePayload: Record<string, unknown> = {}
    if (payload.name !== undefined) updatePayload.name = payload.name.trim()
    if (payload.description !== undefined) updatePayload.description = payload.description.trim()
    if (payload.leader_id !== undefined) updatePayload.leader_id = payload.leader_id || null
    if (payload.active !== undefined) updatePayload.active = payload.active

    const updated = await pb.collection('teams').update<TeamItem>(id, updatePayload)

    // Se trocou de líder, garante que o novo líder está como leader em team_members
    if (payload.leader_id) {
      try {
        // Tenta buscar se já é membro
        const existingMembers = await pb.collection('team_members').getFullList<TeamMemberItem>({
          filter: `team_id = "${id}" && user_id = "${payload.leader_id}"`,
        })
        if (existingMembers.length > 0) {
          if (existingMembers[0].role_in_team !== 'leader') {
            await pb.collection('team_members').update(existingMembers[0].id, {
              role_in_team: 'leader',
            })
          }
        } else {
          await addTeamMember({
            team_id: id,
            user_id: payload.leader_id,
            role_in_team: 'leader',
          })
        }
      } catch {
        /* intentionally ignored */
      }
    }

    return { success: true, data: updated }
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    return {
      success: false,
      error: errorObj?.message || 'Erro ao atualizar equipe.',
    }
  }
}

// -------------------------------------------------------------
// TEAM MEMBERS
// -------------------------------------------------------------
export async function listTeamMembers(teamId?: string): Promise<TeamMemberItem[]> {
  try {
    const filter = teamId ? `team_id = "${teamId}"` : ''
    const list = await pb.collection('team_members').getFullList<TeamMemberItem>({
      filter,
      sort: '-role_in_team,-created',
      expand: 'user_id,team_id',
    })
    return list
  } catch (err) {
    console.warn('Erro ao listar membros da equipe:', err)
    return []
  }
}

export async function addTeamMember(payload: {
  team_id: string
  user_id: string
  role_in_team: 'leader' | 'member'
}): Promise<{ success: boolean; data?: TeamMemberItem; error?: string }> {
  try {
    if (!payload.team_id || !payload.user_id) {
      return { success: false, error: 'Equipe e usuário são obrigatórios.' }
    }

    // Verifica se já é membro da equipe (defensivo antes de disparar constraint unique)
    const existing = await pb.collection('team_members').getFullList<TeamMemberItem>({
      filter: `team_id = "${payload.team_id}" && user_id = "${payload.user_id}"`,
    })

    if (existing.length > 0) {
      return {
        success: false,
        error:
          'Este usuário já faz parte desta equipe. Altere sua função se desejar torná-lo líder.',
      }
    }

    const created = await pb.collection('team_members').create<TeamMemberItem>({
      team_id: payload.team_id,
      user_id: payload.user_id,
      role_in_team: payload.role_in_team || 'member',
      joined_at: new Date().toISOString(),
    })

    // Sincroniza team_id no perfil do usuário se ainda não estiver definido ou se for conveniente
    try {
      const profile = await pb
        .collection('profiles')
        .getFirstListItem(`user_id = "${payload.user_id}"`)
      if (profile && profile.team_id !== payload.team_id) {
        await pb.collection('profiles').update(profile.id, {
          team_id: payload.team_id,
        })
      }
    } catch {
      /* intentionally ignored */
    }

    return { success: true, data: created }
  } catch (err: unknown) {
    const errorObj = err as { message?: string; data?: Record<string, unknown> }
    const msg = errorObj?.message || ''
    if (msg.includes('unique') || msg.includes('uk_team_user')) {
      return {
        success: false,
        error: 'Este usuário já está cadastrado nesta equipe.',
      }
    }
    return {
      success: false,
      error: errorObj?.message || 'Erro ao adicionar membro à equipe.',
    }
  }
}

export async function updateTeamMemberRole(
  memberId: string,
  newRole: 'leader' | 'member',
): Promise<{ success: boolean; data?: TeamMemberItem; error?: string }> {
  try {
    const updated = await pb.collection('team_members').update<TeamMemberItem>(memberId, {
      role_in_team: newRole,
    })
    return { success: true, data: updated }
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    return {
      success: false,
      error: errorObj?.message || 'Erro ao alterar função do membro.',
    }
  }
}

export async function removeTeamMember(
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await pb.collection('team_members').delete(memberId)
    return { success: true }
  } catch (err: unknown) {
    const errorObj = err as { message?: string }
    return {
      success: false,
      error: errorObj?.message || 'Erro ao remover membro da equipe.',
    }
  }
}

// -------------------------------------------------------------
// LISTAR USUÁRIOS ELEGÍVEIS (Gestores, Corretores, Staff)
// -------------------------------------------------------------
export async function listEligibleTeamUsers(): Promise<EligibleUserItem[]> {
  try {
    // Busca perfis para exibição de colaboradores elegíveis (gestores, operadores, masters, etc.)
    const profiles = await pb.collection('profiles').getFullList({
      sort: 'name',
    })

    return profiles.map((p) => ({
      id: p.user_id,
      profile_id: p.id,
      name: p.name || p.email,
      email: p.email,
      role: p.role,
      phone: p.phone,
      team_id: p.team_id,
    }))
  } catch (err) {
    console.warn('Erro ao carregar usuários elegíveis:', err)
    return []
  }
}
