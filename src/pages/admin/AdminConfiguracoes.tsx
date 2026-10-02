import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Settings,
  Shield,
  Percent,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  Users2,
  UserPlus,
  Plus,
  Edit2,
  Trash2,
  Crown,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import {
  listBonusSettings,
  updateBonusSetting,
  listAllTeams,
  createTeam,
  updateTeam,
  listTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  listEligibleTeamUsers,
  type BonusSettingItem,
  type TeamItem,
  type TeamMemberItem,
  type EligibleUserItem,
} from '@/services/adminSettings'

export default function AdminConfiguracoes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isMaster = user?.role === 'master'

  // Redirecionamento defensivo caso perfil não seja master
  useEffect(() => {
    if (user && !isMaster) {
      const fallback = user.role === 'indicador' ? '/indicador' : '/admin'
      navigate(fallback, { replace: true })
    }
  }, [user, isMaster, navigate])

  // Estado das configurações de bônus
  const [settings, setSettings] = useState<BonusSettingItem[]>([])
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [loadSettingsError, setLoadSettingsError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [settingValues, setSettingValues] = useState<Record<string, string>>({
    rental_fixed_amount: '200',
    buyer_percent: '0.5',
    sale_percent: '1',
    vitacon_percent: '1',
  })
  const [bonusSuccessMsg, setBonusSuccessMsg] = useState<string | null>(null)
  const [bonusErrorMsg, setBonusErrorMsg] = useState<string | null>(null)

  // Estado das equipes e membros
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [members, setMembers] = useState<TeamMemberItem[]>([])
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUserItem[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [loadTeamsError, setLoadTeamsError] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
  const [teamSearch, setTeamSearch] = useState('')

  // Modais de Equipe
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null)
  const [teamFormName, setTeamFormName] = useState('')
  const [teamFormDescription, setTeamFormDescription] = useState('')
  const [teamFormLeaderId, setTeamFormLeaderId] = useState<string>('none')
  const [teamFormActive, setTeamFormActive] = useState(true)
  const [teamModalLoading, setTeamModalLoading] = useState(false)
  const [teamModalError, setTeamModalError] = useState<string | null>(null)

  // Modais de Membro
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [memberTargetTeamId, setMemberTargetTeamId] = useState<string>('')
  const [memberUserId, setMemberUserId] = useState<string>('')
  const [memberRoleInTeam, setMemberRoleInTeam] = useState<'leader' | 'member'>('member')
  const [memberModalLoading, setMemberModalLoading] = useState(false)
  const [memberModalError, setMemberModalError] = useState<string | null>(null)

  // Ações de confirmação
  const [memberToRemove, setMemberToRemove] = useState<TeamMemberItem | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  // Tab ativa (bonificações x equipes)
  const defaultTab = searchParams.get('tab') === 'equipas' ? 'teams' : 'bonus'
  const [activeSection, setActiveSection] = useState<'bonus' | 'teams'>(defaultTab)

  // Sincroniza se query param mudar
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'equipas' || tabParam === 'equipes') {
      setActiveSection('teams')
    } else if (tabParam === 'bonus') {
      setActiveSection('bonus')
    }
  }, [searchParams])

  // 1. Carregar Configurações de Bônus
  const loadBonusSettings = useCallback(async () => {
    setLoadingSettings(true)
    setLoadSettingsError(null)
    try {
      const records = await listBonusSettings()
      setSettings(records)

      const valuesMap: Record<string, string> = {
        rental_fixed_amount: '200',
        buyer_percent: '0.5',
        sale_percent: '1',
        vitacon_percent: '1',
      }

      records.forEach((r) => {
        valuesMap[r.key] = r.value
      })

      setSettingValues(valuesMap)
    } catch (err) {
      console.warn('Erro ao carregar configurações de bônus:', err)
      setLoadSettingsError('Não foi possível carregar os parâmetros de bonificação.')
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  // 2. Carregar Equipes, Membros e Usuários
  const loadTeamsAndMembers = useCallback(async () => {
    setLoadingTeams(true)
    setLoadTeamsError(null)
    try {
      const [teamsData, membersData, usersData] = await Promise.all([
        listAllTeams(),
        listTeamMembers(),
        listEligibleTeamUsers(),
      ])
      setTeams(teamsData)
      setMembers(membersData)
      setEligibleUsers(usersData)
    } catch (err) {
      console.warn('Erro ao carregar dados das equipes:', err)
      setLoadTeamsError('Não foi possível carregar as equipes e membros cadastrados.')
    } finally {
      setLoadingTeams(false)
    }
  }, [])

  useEffect(() => {
    void loadBonusSettings()
    void loadTeamsAndMembers()
  }, [loadBonusSettings, loadTeamsAndMembers])

  // Atualiza um input de bonificação
  const handleSettingInputChange = (key: string, val: string) => {
    // Limpeza de caracteres permitindo números e ponto/vírgula
    setSettingValues((prev) => ({
      ...prev,
      [key]: val,
    }))
    setBonusSuccessMsg(null)
    setBonusErrorMsg(null)
  }

  // Salvar uma configuração de bonificação individual
  const handleSaveBonusSetting = async (key: string) => {
    const rawVal = settingValues[key]
    if (rawVal === undefined || rawVal.trim() === '') {
      setBonusErrorMsg('Informe um valor válido.')
      return
    }

    // Normaliza vírgula para ponto se houver
    const normalized = rawVal.replace(',', '.').trim()
    const num = parseFloat(normalized)

    if (isNaN(num) || num < 0) {
      setBonusErrorMsg('O valor deve ser um número positivo.')
      return
    }

    setSavingKey(key)
    setBonusSuccessMsg(null)
    setBonusErrorMsg(null)

    const res = await updateBonusSetting(key, normalized)
    setSavingKey(null)

    if (res.success) {
      setBonusSuccessMsg(`Parâmetro atualizado com sucesso!`)
      // Recarrega do backend para sincronização oficial
      await loadBonusSettings()
      setTimeout(() => setBonusSuccessMsg(null), 4000)
    } else {
      setBonusErrorMsg(res.error || 'Erro ao salvar parâmetro.')
    }
  }

  // Salvar todos os bônus em lote
  const handleSaveAllBonus = async () => {
    setSavingKey('all')
    setBonusSuccessMsg(null)
    setBonusErrorMsg(null)

    const keys = ['rental_fixed_amount', 'buyer_percent', 'sale_percent', 'vitacon_percent']
    let hasError = false
    let lastError = ''

    for (const k of keys) {
      const rawVal = settingValues[k] || '0'
      const normalized = rawVal.replace(',', '.').trim()
      const res = await updateBonusSetting(k, normalized)
      if (!res.success) {
        hasError = true
        lastError = res.error || `Erro ao salvar ${k}`
        break
      }
    }

    setSavingKey(null)

    if (!hasError) {
      setBonusSuccessMsg('Todos os 4 parâmetros foram salvos e atualizados no backend!')
      await loadBonusSettings()
      setTimeout(() => setBonusSuccessMsg(null), 5000)
    } else {
      setBonusErrorMsg(lastError || 'Não foi possível salvar todos os parâmetros.')
    }
  }

  // Abrir modal de criação de equipe
  const handleOpenCreateTeamModal = () => {
    setEditingTeam(null)
    setTeamFormName('')
    setTeamFormDescription('')
    setTeamFormLeaderId('none')
    setTeamFormActive(true)
    setTeamModalError(null)
    setIsTeamModalOpen(true)
  }

  // Abrir modal de edição de equipe
  const handleOpenEditTeamModal = (team: TeamItem) => {
    setEditingTeam(team)
    setTeamFormName(team.name || '')
    setTeamFormDescription(team.description || '')
    setTeamFormLeaderId(team.leader_id || 'none')
    setTeamFormActive(team.active !== false)
    setTeamModalError(null)
    setIsTeamModalOpen(true)
  }

  // Salvar Equipe (Create ou Update)
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamFormName.trim()) {
      setTeamModalError('Por favor informe o nome da equipe.')
      return
    }

    setTeamModalLoading(true)
    setTeamModalError(null)

    const leaderId = teamFormLeaderId === 'none' ? undefined : teamFormLeaderId

    if (editingTeam) {
      const res = await updateTeam(editingTeam.id, {
        name: teamFormName.trim(),
        description: teamFormDescription.trim(),
        leader_id: leaderId,
        active: teamFormActive,
      })

      setTeamModalLoading(false)
      if (res.success) {
        setIsTeamModalOpen(false)
        await loadTeamsAndMembers()
      } else {
        setTeamModalError(res.error || 'Erro ao atualizar equipe.')
      }
    } else {
      const res = await createTeam({
        name: teamFormName.trim(),
        description: teamFormDescription.trim(),
        leader_id: leaderId,
        active: teamFormActive,
      })

      setTeamModalLoading(false)
      if (res.success) {
        setIsTeamModalOpen(false)
        await loadTeamsAndMembers()
      } else {
        setTeamModalError(res.error || 'Erro ao criar equipe.')
      }
    }
  }

  // Alternar status ativo/inativo da equipe diretamente
  const handleToggleTeamActive = async (team: TeamItem) => {
    const newActiveState = !team.active
    const res = await updateTeam(team.id, { active: newActiveState })
    if (res.success) {
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, active: newActiveState } : t)))
    }
  }

  // Abrir modal para adicionar membro a uma equipe
  const handleOpenAddMemberModal = (teamId?: string) => {
    setMemberTargetTeamId(teamId || (teams.length > 0 ? teams[0].id : ''))
    setMemberUserId('')
    setMemberRoleInTeam('member')
    setMemberModalError(null)
    setIsMemberModalOpen(true)
  }

  // Salvar Membro
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberTargetTeamId) {
      setMemberModalError('Selecione uma equipe.')
      return
    }
    if (!memberUserId) {
      setMemberModalError('Selecione um usuário para vincular.')
      return
    }

    setMemberModalLoading(true)
    setMemberModalError(null)

    const res = await addTeamMember({
      team_id: memberTargetTeamId,
      user_id: memberUserId,
      role_in_team: memberRoleInTeam,
    })

    setMemberModalLoading(false)
    if (res.success) {
      setIsMemberModalOpen(false)
      await loadTeamsAndMembers()
    } else {
      setMemberModalError(res.error || 'Erro ao adicionar membro à equipe.')
    }
  }

  // Alternar papel de membro (leader <-> member)
  const handleToggleMemberRole = async (member: TeamMemberItem) => {
    const newRole: 'leader' | 'member' = member.role_in_team === 'leader' ? 'member' : 'leader'
    const res = await updateTeamMemberRole(member.id, newRole)
    if (res.success) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role_in_team: newRole } : m)),
      )
    }
  }

  // Remover membro da equipe
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return
    setIsRemovingMember(true)
    const res = await removeTeamMember(memberToRemove.id)
    setIsRemovingMember(false)

    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id))
      setMemberToRemove(null)
    }
  }

  // Membros agrupados por equipe
  const membersByTeam = useMemo(() => {
    const map: Record<string, TeamMemberItem[]> = {}
    members.forEach((m) => {
      if (!map[m.team_id]) map[m.team_id] = []
      map[m.team_id].push(m)
    })
    return map
  }, [members])

  // Filtragem de Equipes
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (selectedTeamId !== 'all' && t.id !== selectedTeamId) {
        return false
      }
      if (teamSearch.trim()) {
        const query = teamSearch.toLowerCase()
        const matchName = t.name?.toLowerCase().includes(query)
        const matchDesc = t.description?.toLowerCase().includes(query)
        const matchLeader = t.expand?.leader_id?.name?.toLowerCase().includes(query)
        return matchName || matchDesc || matchLeader
      }
      return true
    })
  }, [teams, selectedTeamId, teamSearch])

  // Usuários elegíveis disponíveis para a equipe selecionada no modal
  const availableUsersForModal = useMemo(() => {
    if (!memberTargetTeamId) return eligibleUsers
    const currentTeamUserIds = new Set(
      members.filter((m) => m.team_id === memberTargetTeamId).map((m) => m.user_id),
    )
    return eligibleUsers.filter((u) => !currentTeamUserIds.has(u.id))
  }, [eligibleUsers, members, memberTargetTeamId])

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a5d8f]/10 text-xs font-semibold text-[#1a5d8f] mb-2">
            <Shield className="w-3.5 h-3.5" />
            Acesso Restrito: Master
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2a43]">
            Painel de Configurações
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie parâmetros de bonificação e organize equipes comerciais e corretores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void loadBonusSettings()
              void loadTeamsAndMembers()
            }}
            disabled={loadingSettings || loadingTeams}
            className="border-[#e5e0d8] text-gray-700 hover:bg-[#faf7f2] rounded-xl"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loadingSettings || loadingTeams ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* TABS DE SELEÇÃO ENTRE BONIFICAÇÕES E EQUIPES */}
      <div className="flex p-1 bg-white border border-[#e5e0d8] rounded-xl shadow-xs max-w-md">
        <button
          onClick={() => setActiveSection('bonus')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            activeSection === 'bonus'
              ? 'bg-[#1a5d8f] text-white shadow-xs'
              : 'text-gray-600 hover:text-[#0f2a43] hover:bg-black/5'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Bonificações</span>
          <Badge
            variant="secondary"
            className={`text-[10px] ml-1 px-1.5 py-0 ${
              activeSection === 'bonus' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            4
          </Badge>
        </button>

        <button
          onClick={() => setActiveSection('teams')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            activeSection === 'teams'
              ? 'bg-[#1a5d8f] text-white shadow-xs'
              : 'text-gray-600 hover:text-[#0f2a43] hover:bg-black/5'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>Equipes & Membros</span>
          <Badge
            variant="secondary"
            className={`text-[10px] ml-1 px-1.5 py-0 ${
              activeSection === 'teams' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {teams.length}
          </Badge>
        </button>
      </div>

      {/* MENSAGENS GLOBAIS DE FEEDBACK */}
      {bonusSuccessMsg && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 rounded-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="font-bold">Sucesso!</AlertTitle>
          <AlertDescription className="text-xs">{bonusSuccessMsg}</AlertDescription>
        </Alert>
      )}

      {bonusErrorMsg && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold">Atenção</AlertTitle>
          <AlertDescription className="text-xs">{bonusErrorMsg}</AlertDescription>
        </Alert>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO 1: BONIFICAÇÕES                                    */}
      {/* ======================================================== */}
      {activeSection === 'bonus' && (
        <div className="space-y-6">
          {loadSettingsError && (
            <Alert
              variant="destructive"
              className="bg-red-50 border-red-200 text-red-900 rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Falha ao buscar parâmetros</h4>
                  <p className="text-xs text-red-700">{loadSettingsError}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadBonusSettings()}
                className="border-red-300 text-red-800 hover:bg-red-100 text-xs shrink-0 rounded-lg h-8"
              >
                Tentar novamente
              </Button>
            </Alert>
          )}
          <Card className="border-[#e5e0d8] shadow-xs bg-white">
            <CardHeader className="border-b border-[#e5e0d8] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#1a5d8f]/10 flex items-center justify-center text-[#1a5d8f]">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-[#0f2a43]">
                      Regras de Bonificação do Indica Gabriel
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      Tabela <code>bonus_settings</code> • Lida pela rotina de cálculo{' '}
                      <code>calculate-bonus</code>
                    </CardDescription>
                  </div>
                </div>

                <Button
                  onClick={handleSaveAllBonus}
                  disabled={savingKey !== null}
                  className="bg-[#1a5d8f] hover:bg-[#144a72] text-white font-semibold rounded-xl"
                >
                  {savingKey === 'all' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Salvando Todos...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Salvar Todas as Bonificações
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Locação (rental_fixed_amount) */}
                <div className="p-5 rounded-2xl border border-[#e5e0d8] bg-[#faf7f2]/50 hover:border-[#1a5d8f]/40 transition-colors flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                          <DollarSign className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-[#0f2a43]">Locação (Aluguel)</h3>
                      </div>
                      <Badge className="bg-emerald-600 text-white font-mono text-xs">
                        Valor Fixo em R$
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Valor fixo pago ao indicador quando uma locação for fechada e concluída.
                      Chave:{' '}
                      <code className="text-[#1a5d8f] font-semibold">rental_fixed_amount</code>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="rental_fixed_amount"
                      className="text-xs font-semibold text-gray-700"
                    >
                      Valor do Bônus em Reais (R$)
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-sm font-semibold text-gray-500">
                          R$
                        </span>
                        <Input
                          id="rental_fixed_amount"
                          type="text"
                          inputMode="decimal"
                          value={settingValues.rental_fixed_amount || ''}
                          onChange={(e) =>
                            handleSettingInputChange('rental_fixed_amount', e.target.value)
                          }
                          className="pl-10 h-10 rounded-xl font-bold text-base text-[#0f2a43] border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                          placeholder="200"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleSaveBonusSetting('rental_fixed_amount')}
                        disabled={savingKey !== null}
                        className="border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#1a5d8f] hover:text-white rounded-xl h-10 shrink-0"
                      >
                        {savingKey === 'rental_fixed_amount' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Salvar'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 2. Indicação de Comprador (buyer_percent) */}
                <div className="p-5 rounded-2xl border border-[#e5e0d8] bg-[#faf7f2]/50 hover:border-[#1a5d8f]/40 transition-colors flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-blue-100 text-blue-800 font-bold">
                          <Percent className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-[#0f2a43]">Comprador Indicado</h3>
                      </div>
                      <Badge className="bg-blue-600 text-white font-mono text-xs">Percentual</Badge>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Percentual sobre o valor do imóvel pago ao indicador e ao indicado fechando
                      compra. Chave:{' '}
                      <code className="text-[#1a5d8f] font-semibold">buyer_percent</code>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="buyer_percent" className="text-xs font-semibold text-gray-700">
                      Percentual (%) sobre o valor da transação
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="buyer_percent"
                          type="text"
                          inputMode="decimal"
                          value={settingValues.buyer_percent || ''}
                          onChange={(e) =>
                            handleSettingInputChange('buyer_percent', e.target.value)
                          }
                          className="pr-8 h-10 rounded-xl font-bold text-base text-[#0f2a43] border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                          placeholder="0.5"
                        />
                        <span className="absolute right-3 top-2.5 text-sm font-semibold text-gray-500">
                          %
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleSaveBonusSetting('buyer_percent')}
                        disabled={savingKey !== null}
                        className="border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#1a5d8f] hover:text-white rounded-xl h-10 shrink-0"
                      >
                        {savingKey === 'buyer_percent' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Salvar'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 3. Venda / Proprietário (sale_percent) */}
                <div className="p-5 rounded-2xl border border-[#e5e0d8] bg-[#faf7f2]/50 hover:border-[#1a5d8f]/40 transition-colors flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-amber-100 text-amber-800 font-bold">
                          <Percent className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-[#0f2a43]">Venda (Proprietário)</h3>
                      </div>
                      <Badge className="bg-amber-600 text-white font-mono text-xs">
                        Percentual
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Percentual de referência para comissão sobre valor transacionado do imóvel
                      para venda. Chave:{' '}
                      <code className="text-[#1a5d8f] font-semibold">sale_percent</code>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="sale_percent" className="text-xs font-semibold text-gray-700">
                      Percentual (%) do bônus
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="sale_percent"
                          type="text"
                          inputMode="decimal"
                          value={settingValues.sale_percent || ''}
                          onChange={(e) => handleSettingInputChange('sale_percent', e.target.value)}
                          className="pr-8 h-10 rounded-xl font-bold text-base text-[#0f2a43] border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                          placeholder="1"
                        />
                        <span className="absolute right-3 top-2.5 text-sm font-semibold text-gray-500">
                          %
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleSaveBonusSetting('sale_percent')}
                        disabled={savingKey !== null}
                        className="border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#1a5d8f] hover:text-white rounded-xl h-10 shrink-0"
                      >
                        {savingKey === 'sale_percent' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Salvar'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 4. Parceiro Vitacon (vitacon_percent) */}
                <div className="p-5 rounded-2xl border border-[#e5e0d8] bg-[#faf7f2]/50 hover:border-[#1a5d8f]/40 transition-colors flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-purple-100 text-purple-800 font-bold">
                          <Percent className="w-4 h-4" />
                        </span>
                        <h3 className="font-bold text-[#0f2a43]">Vitacon SP (Exclusivo)</h3>
                      </div>
                      <Badge className="bg-purple-600 text-white font-mono text-xs">
                        Percentual
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Percentual de bônus sobre unidades ou projetos parceiros Vitacon SP fechados.
                      Chave: <code className="text-[#1a5d8f] font-semibold">vitacon_percent</code>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="vitacon_percent"
                      className="text-xs font-semibold text-gray-700"
                    >
                      Percentual (%) sobre o valor da unidade
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="vitacon_percent"
                          type="text"
                          inputMode="decimal"
                          value={settingValues.vitacon_percent || ''}
                          onChange={(e) =>
                            handleSettingInputChange('vitacon_percent', e.target.value)
                          }
                          className="pr-8 h-10 rounded-xl font-bold text-base text-[#0f2a43] border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                          placeholder="1"
                        />
                        <span className="absolute right-3 top-2.5 text-sm font-semibold text-gray-500">
                          %
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleSaveBonusSetting('vitacon_percent')}
                        disabled={savingKey !== null}
                        className="border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#1a5d8f] hover:text-white rounded-xl h-10 shrink-0"
                      >
                        {savingKey === 'vitacon_percent' ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Salvar'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabela de Auditoria dos Registros */}
              <div className="mt-8 pt-6 border-t border-[#e5e0d8]">
                <h4 className="text-sm font-bold text-[#0f2a43] mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Registros Atuais na Coleção bonus_settings
                </h4>
                <div className="overflow-x-auto rounded-xl border border-[#e5e0d8]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#faf7f2] text-xs font-semibold uppercase text-gray-500 border-b border-[#e5e0d8]">
                      <tr>
                        <th className="py-2.5 px-4">Chave (Key)</th>
                        <th className="py-2.5 px-4">Valor Cadastrado</th>
                        <th className="py-2.5 px-4">Última Atualização</th>
                        <th className="py-2.5 px-4">Descrição Oficial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e0d8] bg-white text-xs">
                      {settings.map((item) => (
                        <tr key={item.id} className="hover:bg-[#faf7f2]/50">
                          <td className="py-2.5 px-4 font-mono font-semibold text-[#1a5d8f]">
                            {item.key}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-[#0f2a43]">
                            {item.key.includes('amount') ? `R$ ${item.value}` : `${item.value}%`}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500">
                            {item.updated ? new Date(item.updated).toLocaleString('pt-BR') : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-gray-600">{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO 2: EQUIPES E MEMBROS                               */}
      {/* ======================================================== */}
      {activeSection === 'teams' && (
        <div className="space-y-6">
          {loadTeamsError && (
            <Alert
              variant="destructive"
              className="bg-red-50 border-red-200 text-red-900 rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Falha ao buscar equipes</h4>
                  <p className="text-xs text-red-700">{loadTeamsError}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadTeamsAndMembers()}
                className="border-red-300 text-red-800 hover:bg-red-100 text-xs shrink-0 rounded-lg h-8"
              >
                Tentar novamente
              </Button>
            </Alert>
          )}
          {/* Card Superior de Ações e Filtros de Equipes */}
          <Card className="border-[#e5e0d8] shadow-xs bg-white">
            <CardHeader className="pb-4 border-b border-[#e5e0d8]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-[#0f2a43] flex items-center gap-2">
                    <Users2 className="w-5 h-5 text-[#1a5d8f]" />
                    Gestão de Equipes Comerciais
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Crie equipes, atribua gestores líderes e vincule corretores membros para
                    encaminhamento de indicações.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleOpenCreateTeamModal}
                    className="bg-[#1a5d8f] hover:bg-[#144a72] text-white font-semibold rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Nova Equipe
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenAddMemberModal()}
                    disabled={teams.length === 0}
                    className="border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#1a5d8f] hover:text-white rounded-xl"
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Vincular Membro
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar equipe por nome, descrição ou líder..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="w-[180px] h-10 rounded-xl border-[#e5e0d8]">
                      <SelectValue placeholder="Todas as Equipes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Equipes</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LISTAGEM RESPONSIVA DAS EQUIPES */}
          {loadingTeams ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-[#e5e0d8]">
              <RefreshCw className="w-8 h-8 text-[#1a5d8f] animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Carregando equipes e colaboradores...</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-[#e5e0d8] px-4">
              <div className="w-12 h-12 rounded-full bg-[#faf7f2] border border-[#e5e0d8] flex items-center justify-center mx-auto text-gray-400">
                <Users2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0f2a43]">Nenhuma equipe encontrada</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {teamSearch || selectedTeamId !== 'all'
                  ? 'Nenhum resultado corresponde aos filtros aplicados.'
                  : 'Nenhuma equipe foi cadastrada até o momento. Comece criando uma nova equipe!'}
              </p>
              {!teamSearch && selectedTeamId === 'all' && (
                <Button
                  onClick={handleOpenCreateTeamModal}
                  className="bg-[#1a5d8f] text-white rounded-xl mt-2"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Criar Primeira Equipe
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTeams.map((team) => {
                const teamMemberList = membersByTeam[team.id] || []
                const leaders = teamMemberList.filter((m) => m.role_in_team === 'leader')
                const regulars = teamMemberList.filter((m) => m.role_in_team === 'member')
                const isActive = team.active !== false

                return (
                  <Card
                    key={team.id}
                    className={`border transition-all bg-white shadow-xs ${
                      isActive ? 'border-[#e5e0d8]' : 'border-gray-200 bg-gray-50/50 opacity-90'
                    }`}
                  >
                    {/* Header da Equipe */}
                    <CardHeader className="pb-3 border-b border-[#e5e0d8]">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                              isActive ? 'bg-[#1a5d8f]' : 'bg-gray-400'
                            }`}
                          >
                            <Users2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-bold text-[#0f2a43]">
                                {team.name}
                              </h3>
                              <Badge
                                variant={isActive ? 'default' : 'secondary'}
                                className={
                                  isActive
                                    ? 'bg-emerald-600 text-white text-[11px]'
                                    : 'bg-gray-200 text-gray-700 text-[11px]'
                                }
                              >
                                {isActive ? 'Ativa' : 'Inativa'}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="border-[#e5e0d8] text-gray-600 text-[11px]"
                              >
                                {teamMemberList.length}{' '}
                                {teamMemberList.length === 1 ? 'membro' : 'membros'}
                              </Badge>
                            </div>
                            {team.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{team.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Ações da Equipe */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleTeamActive(team)}
                            title={isActive ? 'Desativar equipe' : 'Ativar equipe'}
                            className="h-8 px-2 text-xs text-gray-600 hover:text-[#0f2a43]"
                          >
                            {isActive ? (
                              <ToggleRight className="w-5 h-5 text-emerald-600 mr-1.5" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400 mr-1.5" />
                            )}
                            <span className="hidden sm:inline">
                              {isActive ? 'Ativa' : 'Inativa'}
                            </span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditTeamModal(team)}
                            className="h-8 px-2.5 text-xs border-[#e5e0d8] text-gray-700 hover:bg-[#faf7f2] rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Editar
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleOpenAddMemberModal(team.id)}
                            className="h-8 px-2.5 text-xs bg-[#1a5d8f] hover:bg-[#144a72] text-white rounded-lg"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            Membro
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Membros da Equipe */}
                    <CardContent className="pt-4">
                      {teamMemberList.length === 0 ? (
                        <div className="p-4 rounded-xl bg-[#faf7f2] border border-dashed border-[#e5e0d8] text-center text-xs text-gray-500">
                          Nenhum corretor ou gestor vinculado a esta equipe ainda.{' '}
                          <button
                            onClick={() => handleOpenAddMemberModal(team.id)}
                            className="font-bold text-[#1a5d8f] hover:underline"
                          >
                            Clique aqui para vincular
                          </button>
                          .
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Destaque para Líderes */}
                          {leaders.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                                <Crown className="w-3.5 h-3.5" />
                                Líder da Equipe / Gestor Responsável
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {leaders.map((m) => (
                                  <div
                                    key={m.id}
                                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                        <Crown className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0 truncate">
                                        <p className="text-xs font-bold text-[#0f2a43] truncate">
                                          {m.expand?.user_id?.name ||
                                            m.expand?.user_id?.email ||
                                            'Líder'}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate">
                                          {m.expand?.user_id?.email || ''}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleMemberRole(m)}
                                        title="Rebaixar para membro comum"
                                        className="h-7 w-7 text-amber-700 hover:bg-amber-100 rounded-md"
                                      >
                                        <UserCheck className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setMemberToRemove(m)}
                                        title="Remover da equipe"
                                        className="h-7 w-7 text-red-600 hover:bg-red-50 rounded-md"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Corretores Membros */}
                          {regulars.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                Corretores Membros ({regulars.length})
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {regulars.map((m) => (
                                  <div
                                    key={m.id}
                                    className="p-2.5 rounded-xl border border-[#e5e0d8] bg-white hover:bg-[#faf7f2]/50 flex items-center justify-between gap-2 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 rounded-full bg-[#1a5d8f]/10 text-[#1a5d8f] flex items-center justify-center font-bold text-xs shrink-0">
                                        {m.expand?.user_id?.name
                                          ? m.expand.user_id.name.charAt(0).toUpperCase()
                                          : 'C'}
                                      </div>
                                      <div className="min-w-0 truncate">
                                        <p className="text-xs font-semibold text-[#0f2a43] truncate">
                                          {m.expand?.user_id?.name ||
                                            m.expand?.user_id?.email ||
                                            'Corretor'}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate">
                                          {m.expand?.user_id?.email || ''}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleMemberRole(m)}
                                        title="Promover a líder da equipe"
                                        className="h-7 w-7 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md"
                                      >
                                        <Crown className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setMemberToRemove(m)}
                                        title="Remover da equipe"
                                        className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR OU EDITAR EQUIPE                            */}
      {/* ======================================================== */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl bg-white border-[#e5e0d8]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0f2a43] flex items-center gap-2">
              <Users2 className="w-5 h-5 text-[#1a5d8f]" />
              {editingTeam ? 'Editar Equipe' : 'Criar Nova Equipe'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {editingTeam
                ? 'Atualize o nome, líder e status da equipe comercial.'
                : 'Defina o nome da equipe e indique opcionalmente um gestor responsável.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTeam} className="space-y-4 py-2">
            {teamModalError && (
              <Alert variant="destructive" className="py-2 text-xs rounded-xl">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{teamModalError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="team_name" className="text-xs font-semibold text-[#0f2a43]">
                Nome da Equipe <span className="text-red-500">*</span>
              </Label>
              <Input
                id="team_name"
                value={teamFormName}
                onChange={(e) => setTeamFormName(e.target.value)}
                placeholder="Ex: Equipe Jardins / Vendas SP"
                className="rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="team_description" className="text-xs font-semibold text-[#0f2a43]">
                Descrição / Foco de Atuação
              </Label>
              <Input
                id="team_description"
                value={teamFormDescription}
                onChange={(e) => setTeamFormDescription(e.target.value)}
                placeholder="Ex: Foco em lançamentos Vitacon e zona sul"
                className="rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="team_leader" className="text-xs font-semibold text-[#0f2a43]">
                Gestor / Líder Responsável (Opcional)
              </Label>
              <Select value={teamFormLeaderId} onValueChange={setTeamFormLeaderId}>
                <SelectTrigger id="team_leader" className="rounded-xl border-[#e5e0d8]">
                  <SelectValue placeholder="Selecione um líder (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum líder atribuído agora</SelectItem>
                  {eligibleUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf7f2] border border-[#e5e0d8]">
              <div>
                <p className="text-xs font-bold text-[#0f2a43]">Status da Equipe</p>
                <p className="text-[11px] text-gray-500">
                  Equipes ativas recebem encaminhamentos no painel.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTeamFormActive(!teamFormActive)}
                className="h-8 text-xs font-bold"
              >
                {teamFormActive ? (
                  <span className="flex items-center text-emerald-600">
                    <ToggleRight className="w-5 h-5 mr-1" /> Ativa
                  </span>
                ) : (
                  <span className="flex items-center text-gray-500">
                    <ToggleLeft className="w-5 h-5 mr-1" /> Inativa
                  </span>
                )}
              </Button>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTeamModalOpen(false)}
                disabled={teamModalLoading}
                className="rounded-xl border-[#e5e0d8]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={teamModalLoading}
                className="bg-[#1a5d8f] hover:bg-[#144a72] text-white rounded-xl"
              >
                {teamModalLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : editingTeam ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Equipe'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: VINCULAR MEMBRO A UMA EQUIPE                      */}
      {/* ======================================================== */}
      <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl bg-white border-[#e5e0d8]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0f2a43] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#1a5d8f]" />
              Vincular Membro à Equipe
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Selecione o corretor ou colaborador e defina sua função nesta equipe.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMember} className="space-y-4 py-2">
            {memberModalError && (
              <Alert variant="destructive" className="py-2 text-xs rounded-xl">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{memberModalError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="member_team" className="text-xs font-semibold text-[#0f2a43]">
                Equipe Destino <span className="text-red-500">*</span>
              </Label>
              <Select value={memberTargetTeamId} onValueChange={setMemberTargetTeamId}>
                <SelectTrigger id="member_team" className="rounded-xl border-[#e5e0d8]">
                  <SelectValue placeholder="Selecione a equipe" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member_user" className="text-xs font-semibold text-[#0f2a43]">
                Colaborador / Corretor <span className="text-red-500">*</span>
              </Label>
              <Select value={memberUserId} onValueChange={setMemberUserId}>
                <SelectTrigger id="member_user" className="rounded-xl border-[#e5e0d8]">
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsersForModal.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      Nenhum outro usuário disponível
                    </SelectItem>
                  ) : (
                    availableUsersForModal.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} — ({u.role})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="member_role" className="text-xs font-semibold text-[#0f2a43]">
                Papel na Equipe
              </Label>
              <Select
                value={memberRoleInTeam}
                onValueChange={(val: 'leader' | 'member') => setMemberRoleInTeam(val)}
              >
                <SelectTrigger id="member_role" className="rounded-xl border-[#e5e0d8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro / Corretor</SelectItem>
                  <SelectItem value="leader">Líder / Gestor da Equipe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMemberModalOpen(false)}
                disabled={memberModalLoading}
                className="rounded-xl border-[#e5e0d8]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={memberModalLoading || !memberUserId}
                className="bg-[#1a5d8f] hover:bg-[#144a72] text-white rounded-xl"
              >
                {memberModalLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  'Confirmar Vínculo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR REMOÇÃO DE MEMBRO                       */}
      {/* ======================================================== */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl bg-white border-[#e5e0d8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Remover Membro da Equipe
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Tem certeza que deseja remover este membro da equipe? Esta ação desvincula o acesso
              dele a esta equipe comercial.
            </DialogDescription>
          </DialogHeader>

          {memberToRemove && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1 my-2">
              <p>
                <strong>Colaborador:</strong>{' '}
                {memberToRemove.expand?.user_id?.name || memberToRemove.expand?.user_id?.email}
              </p>
              <p>
                <strong>Função atual:</strong>{' '}
                {memberToRemove.role_in_team === 'leader' ? 'Líder' : 'Membro'}
              </p>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMemberToRemove(null)}
              disabled={isRemovingMember}
              className="rounded-xl border-[#e5e0d8]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRemoveMember}
              disabled={isRemovingMember}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {isRemovingMember ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Sim, Remover'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
