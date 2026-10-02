import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Send,
  Building,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  History,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Sparkles,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import {
  getReferralById,
  listReferralStatusHistory,
  listTeams,
  listTeamManagers,
  assignReferral,
  updateReferralStatus,
  type ReferralRecord,
  type ReferralStatusHistoryRecord,
  type TeamRecord,
  type TeamManagerUser,
} from '@/services/referrals'
import { formatPhone } from '@/services/indicators'
import {
  getStatusConfig,
  getPropertyTypeLabel,
  formatDateTime,
  formatCurrency,
} from '@/pages/indicador/IndicadorDashboard'

export default function AdminIndicacaoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [referral, setReferral] = useState<ReferralRecord | null>(null)
  const [history, setHistory] = useState<ReferralStatusHistoryRecord[]>([])
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [managers, setManagers] = useState<TeamManagerUser[]>([])

  // Formulário de Atribuição (Encaminhar)
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [selectedManagerId, setSelectedManagerId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)

  // Formulário de Mudança de Status
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [statusNotes, setStatusNotes] = useState<string>('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!id) return
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        const [refData, histData, teamsData, managersData] = await Promise.all([
          getReferralById(id),
          listReferralStatusHistory(id),
          listTeams(),
          listTeamManagers(),
        ])

        if (refData) {
          setReferral(refData)
          setSelectedTeamId(refData.assigned_team_id || '')
          setSelectedManagerId(refData.assigned_manager_id || '')
          setSelectedStatus(refData.status || 'sent')
        }
        setHistory(histData)
        setTeams(teamsData)
        setManagers(managersData)
      } catch (err) {
        console.warn('Erro ao carregar detalhes da indicação:', err)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [id],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Submissão do Encaminhamento
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!referral) return

    if (!selectedTeamId && !selectedManagerId) {
      setAssignError('Selecione uma equipe ou gestor para encaminhar.')
      return
    }

    setIsAssigning(true)
    setAssignError(null)
    setAssignSuccess(null)

    const res = await assignReferral({
      referral_id: referral.id,
      assigned_team_id: selectedTeamId || undefined,
      assigned_manager_id: selectedManagerId || undefined,
    })

    setIsAssigning(false)

    if (res.success) {
      setAssignSuccess('Indicação encaminhada com sucesso!')
      setTimeout(() => {
        void loadData(true)
        setAssignSuccess(null)
      }, 1000)
    } else {
      setAssignError(res.error || 'Falha ao encaminhar indicação.')
    }
  }

  // Submissão da Mudança de Status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!referral || !selectedStatus) return

    setIsUpdatingStatus(true)
    setStatusError(null)
    setStatusSuccess(null)

    const res = await updateReferralStatus({
      referral_id: referral.id,
      status: selectedStatus,
      notes: statusNotes,
    })

    setIsUpdatingStatus(false)

    if (res.success) {
      setStatusSuccess('Status atualizado e registrado no histórico com sucesso!')
      setStatusNotes('')
      setTimeout(() => {
        void loadData(true)
        setStatusSuccess(null)
      }, 1000)
    } else {
      setStatusError(res.error || 'Falha ao atualizar status.')
    }
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4 px-4">
        <div className="w-10 h-10 border-3 border-[#1a5d8f] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500 font-medium">Carregando ficha da indicação...</p>
        <div className="max-w-xl mx-auto space-y-3 pt-3">
          <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!referral) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4 px-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#0f2a43]">Indicação não encontrada</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          O registro solicitado não existe, pode ter sido removido ou você não possui permissão para
          acessá-lo.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData(true)}
            className="border-gray-300 text-xs h-9 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Tentar novamente
          </Button>
          <Button
            asChild
            className="bg-[#1a5d8f] hover:bg-[#144a72] text-white text-xs h-9 rounded-xl"
          >
            <Link to="/admin">Voltar ao Painel</Link>
          </Button>
        </div>
      </div>
    )
  }

  const typeInfo = getPropertyTypeLabel(referral.property_type)
  const statusCfg = getStatusConfig(referral.status)
  const TypeIcon = typeInfo.icon
  const indicatorData = referral.expand?.indicator_id

  // Cálculo de SLA
  const now = new Date().getTime()
  const isSlaDelayed =
    !['closed_won', 'closed', 'paid', 'bonus_paid', 'closed_lost', 'cancelled', 'expired'].includes(
      (referral.status || '').toLowerCase(),
    ) &&
    (Boolean(referral.sla_breached) ||
      (Boolean(referral.sla_deadline) && new Date(referral.sla_deadline).getTime() < now))

  return (
    <div className="space-y-6 pb-16">
      {/* 1. BARRA SUPERIOR DE NAVEGAÇÃO E TÍTULO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="rounded-xl border-[#e5e0d8] h-10 px-3 text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0f2a43]">
                {referral.client_name}
              </h1>
              <Badge className={`${statusCfg.badgeClass} text-xs font-semibold px-2.5 py-0.5`}>
                {statusCfg.label}
              </Badge>
              {isSlaDelayed && (
                <Badge className="bg-red-600 text-white hover:bg-red-700 border-red-700 text-xs font-bold inline-flex items-center gap-1 shadow-xs animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  <span>SLA atrasado</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Registrado em {formatDateTime(referral.created)} • Código #{referral.id}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void loadData(true)}
          disabled={isRefreshing}
          className="rounded-xl border-[#e5e0d8] h-10 px-3.5 text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA: FICHA DO INDICADO E DO INDICADOR */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Ficha do Cliente Indicado */}
          <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#e5e0d8] pb-4 bg-gradient-to-r from-[#faf7f2] to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#1a5d8f]" />
                  <CardTitle className="text-base font-bold text-[#0f2a43]">
                    Dados da Pessoa Indicada
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className="bg-white text-gray-700 border-[#e5e0d8] text-xs font-medium inline-flex items-center gap-1"
                >
                  <TypeIcon className="w-3.5 h-3.5 text-[#1a5d8f]" />
                  <span>{typeInfo.label}</span>
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-xs text-gray-400 block font-medium uppercase">
                    Nome Completo
                  </span>
                  <span className="font-bold text-[#0f2a43] text-base">{referral.client_name}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-gray-400 block font-medium uppercase">
                    Telefone / WhatsApp
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0f2a43]">
                      {referral.client_phone ? formatPhone(referral.client_phone) : 'Não informado'}
                    </span>
                    {referral.client_phone && (
                      <a
                        href={`https://wa.me/55${referral.client_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md"
                      >
                        Abrir WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                {referral.client_email && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 block font-medium uppercase">
                      E-mail
                    </span>
                    <span className="text-gray-700">{referral.client_email}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-xs text-gray-400 block font-medium uppercase">
                    Prazo Limite de Atendimento (SLA 3h)
                  </span>
                  <span
                    className={`font-semibold ${isSlaDelayed ? 'text-amber-800' : 'text-gray-700'}`}
                  >
                    {referral.sla_deadline ? formatDateTime(referral.sla_deadline) : 'Não definido'}
                  </span>
                </div>
              </div>

              {/* Detalhes / Observações fornecidas */}
              {referral.property_description && (
                <div className="pt-3 border-t border-[#e5e0d8] space-y-1">
                  <span className="text-xs text-gray-400 block font-medium uppercase">
                    Detalhes do Imóvel / Necessidade
                  </span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-[#faf7f2] p-3 rounded-xl border border-[#e5e0d8]">
                    {referral.property_description}
                  </p>
                </div>
              )}

              {/* Texto Bruto Transcrito por Áudio Whisper (se houver) */}
              {referral.raw_transcription && (
                <div className="pt-3 border-t border-[#e5e0d8] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#1a5d8f] font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-[#d9995b]" />
                    <span>Transcrição do Áudio Original (Whisper IA)</span>
                  </div>
                  <p className="text-xs text-gray-600 italic bg-blue-50/40 p-3 rounded-xl border border-blue-200 leading-relaxed">
                    "{referral.raw_transcription}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Dados do Indicador de Origem */}
          <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#e5e0d8] pb-4 bg-gradient-to-r from-[#faf7f2] to-white">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1a5d8f]" />
                <CardTitle className="text-base font-bold text-[#0f2a43]">
                  Indicador de Origem (Parceiro)
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {indicatorData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 block font-medium uppercase">
                      Nome do Indicador
                    </span>
                    <span className="font-bold text-[#0f2a43]">
                      {indicatorData.full_name || 'Não informado'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-gray-400 block font-medium uppercase">
                      Contato do Indicador
                    </span>
                    <span className="text-gray-700">
                      {indicatorData.phone ? formatPhone(indicatorData.phone) : 'Não informado'}
                    </span>
                  </div>

                  {indicatorData.email && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-400 block font-medium uppercase">
                        E-mail
                      </span>
                      <span className="text-gray-700">{indicatorData.email}</span>
                    </div>
                  )}

                  {indicatorData.pix_key && (
                    <div className="space-y-1">
                      <span className="text-xs text-gray-400 block font-medium uppercase">
                        Chave PIX Cadastrada
                      </span>
                      <span className="text-emerald-700 font-mono text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-md inline-block">
                        {indicatorData.pix_key} ({indicatorData.pix_key_type || 'PIX'})
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Dados detalhados do indicador parceiro não estão vinculados diretamente a este
                  registro.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Histórico de Status (Linha do Tempo) */}
          <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#e5e0d8] pb-4 bg-gradient-to-r from-[#faf7f2] to-white">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#1a5d8f]" />
                <CardTitle className="text-base font-bold text-[#0f2a43]">
                  Histórico de Mudanças de Status ({history.length})
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-gray-500">
                Auditoria de cada transição de status com responsável e notas gravadas.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Nenhuma mudança de status registrada além da criação inicial.
                </p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e5e0d8]">
                  {history.map((hist) => {
                    const statusInfo = getStatusConfig(hist.new_status)
                    const authorName = hist.expand?.changed_by?.name || 'Sistema'

                    return (
                      <div key={hist.id} className="relative space-y-1">
                        {/* Marcador na linha do tempo */}
                        <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#1a5d8f] border-2 border-white ring-2 ring-[#1a5d8f]/20" />

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${statusInfo.badgeClass} text-xs font-bold`}>
                            {statusInfo.label}
                          </Badge>

                          <span className="text-xs text-gray-400">
                            {formatDateTime(hist.created)}
                          </span>

                          <span className="text-xs text-gray-500">
                            por <strong className="text-gray-700">{authorName}</strong>
                          </span>
                        </div>

                        {hist.notes && (
                          <p className="text-xs text-gray-600 bg-[#faf7f2] p-2.5 rounded-xl border border-[#e5e0d8] mt-1">
                            {hist.notes}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: AÇÕES OPERACIONAIS (ENCAMINHAMENTO E STATUS) */}
        <div className="space-y-6">
          {/* Card Ação 1: Encaminhar / Atribuição */}
          <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#e5e0d8] pb-4 bg-gradient-to-r from-blue-50/50 to-white">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#1a5d8f]" />
                <CardTitle className="text-base font-bold text-[#0f2a43]">
                  Encaminhar Indicação
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-gray-500">
                Atribua a oportunidade à equipe comercial ou a um gestor responsável.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              <form onSubmit={handleAssign} className="space-y-4">
                {/* Selecionar Equipe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Equipe Comercial</label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="rounded-xl border-[#e5e0d8] h-10 text-xs">
                      <SelectValue placeholder="Selecione a equipe..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#e5e0d8] rounded-xl text-xs">
                      {teams.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma equipe disponível
                        </SelectItem>
                      ) : (
                        teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selecionar Gestor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Gestor / Corretor Responsável
                  </label>
                  <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                    <SelectTrigger className="rounded-xl border-[#e5e0d8] h-10 text-xs">
                      <SelectValue placeholder="Selecione o gestor..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#e5e0d8] rounded-xl text-xs">
                      {managers.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum gestor encontrado
                        </SelectItem>
                      ) : (
                        managers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.role})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Feedback atual de atribuição */}
                {referral.assigned_at && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-0.5">
                    <p className="font-semibold">Último encaminhamento:</p>
                    <p className="text-blue-800">
                      {formatDateTime(referral.assigned_at)} por{' '}
                      {referral.expand?.assigned_by?.name || 'Operador'}
                    </p>
                  </div>
                )}

                {assignError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                    {assignError}
                  </p>
                )}

                {assignSuccess && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    {assignSuccess}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isAssigning}
                  className="w-full bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold h-10 rounded-xl text-xs"
                >
                  {isAssigning ? 'Salvando...' : 'Salvar Encaminhamento'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Card Ação 2: Mudança de Status */}
          <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#e5e0d8] pb-4 bg-gradient-to-r from-emerald-50/40 to-white">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <CardTitle className="text-base font-bold text-[#0f2a43]">
                  Atualizar Status da Indicação
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-gray-500">
                Avança a indicação no funil de atendimento e grava no histórico.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Novo Status</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="rounded-xl border-[#e5e0d8] h-10 text-xs">
                      <SelectValue placeholder="Selecione o status..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#e5e0d8] rounded-xl text-xs">
                      <SelectItem value="sent">Aguardando análise</SelectItem>
                      <SelectItem value="in_analysis">Em andamento (análise)</SelectItem>
                      <SelectItem value="in_progress">Em andamento (contato)</SelectItem>
                      <SelectItem value="visited">Visita agendada</SelectItem>
                      <SelectItem value="negotiating">Em negociação</SelectItem>
                      <SelectItem value="closed_won">Concluída com sucesso</SelectItem>
                      <SelectItem value="bonus_paid">Bonificação paga</SelectItem>
                      <SelectItem value="closed_lost">Cancelada (não fechou)</SelectItem>
                      <SelectItem value="expired">Expirada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Anotação do Atendimento (Opcional)
                  </label>
                  <Textarea
                    placeholder="Descreva o andamento da negociação, feedback da visita, etc..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={3}
                    className="rounded-xl border-[#e5e0d8] text-xs resize-none"
                  />
                </div>

                {statusError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                    {statusError}
                  </p>
                )}

                {statusSuccess && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    {statusSuccess}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-10 rounded-xl text-xs"
                >
                  {isUpdatingStatus ? 'Atualizando...' : 'Confirmar Mudança de Status'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
