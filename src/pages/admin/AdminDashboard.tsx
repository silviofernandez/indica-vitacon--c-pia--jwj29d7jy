import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Clock,
  AlertTriangle,
  Send,
  Building,
  Users,
  ArrowRight,
  RefreshCw,
  Phone,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Filter,
  ShieldCheck,
  Tag,
  Building2,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
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
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  listAllReferrals,
  getReferralById,
  listTeams,
  listTeamManagers,
  assignReferral,
  type ReferralRecord,
  type TeamRecord,
  type TeamManagerUser,
} from '@/services/referrals'
import { formatPhone } from '@/services/indicators'
import {
  getStatusConfig,
  getPropertyTypeLabel,
  formatDateTime,
} from '@/pages/indicador/IndicadorDashboard'
import { evaluateReferralSla, isReferralCompleted, type SlaEvaluation } from '@/lib/sla'

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [managers, setManagers] = useState<TeamManagerUser[]>([])

  // "now" reativo atualizado a cada 10 segundos para manter os contadores de SLA vivos
  // e transicionar automaticamente indicações para "SLA atrasado" assim que expiram
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  // Modal de encaminhamento rápido
  const [quickAssignOpen, setQuickAssignOpen] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState<ReferralRecord | null>(null)
  const [targetTeamId, setTargetTeamId] = useState<string>('')
  const [targetManagerId, setTargetManagerId] = useState<string>('')
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)

  // Carrega todas as indicações e metadados de equipes e gestores
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      setLoadError(null)
      const [refRes, teamsRes, managersRes] = await Promise.all([
        listAllReferrals({ perPage: 500 }),
        listTeams(),
        listTeamManagers(),
      ])

      setReferrals(refRes.items)
      setTeams(teamsRes)
      setManagers(managersRes)
    } catch (err) {
      console.warn('Erro ao carregar dados do painel admin:', err)
      setLoadError('Não foi possível carregar os dados operacionais do painel.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Subscrição em TEMPO REAL à coleção 'referrals'
  // Reflete create, update e delete ao vivo sem refresh nem reload
  useRealtime<ReferralRecord>(
    'referrals',
    useCallback(async (e) => {
      const { action, record } = e
      if (!record || !record.id) return

      if (action === 'delete') {
        setReferrals((prev) => prev.filter((r) => r.id !== record.id))
        return
      }

      // Para 'create' e 'update', buscamos com as expansões (indicador, equipe, gestor)
      // para exibir nomes legíveis no card imediatamente
      const enriched = await getReferralById(record.id)
      const recordToUse = enriched || record

      setReferrals((prev) => {
        const index = prev.findIndex((r) => r.id === recordToUse.id)
        if (index >= 0) {
          const next = [...prev]
          next[index] = recordToUse
          return next
        }
        // Se for create ou novo, insere no topo
        return [recordToUse, ...prev]
      })
    }, []),
    true,
  )

  // Mapa memoizado de avaliação de SLA para cada indicação com base no instante atual `nowMs`
  const slaEvaluations = useMemo(() => {
    const map = new Map<string, SlaEvaluation>()
    for (const r of referrals) {
      map.set(r.id, evaluateReferralSla(r, nowMs))
    }
    return map
  }, [referrals, nowMs])

  // Separação em dois grupos operacionais cruciais do dia:
  // 1. A ENCAMINHAR: indicações no status inicial 'sent' ou 'in_analysis' que ainda NÃO têm assigned_team_id nem assigned_manager_id
  // 2. ATRASADAS: indicações pendentes onde sla_breached=true OU sla_deadline < nowMs (ambas as condições checadas)
  const { toAssignList, delayedList, completedCount, totalCount } = useMemo(() => {
    const toAssign: ReferralRecord[] = []
    const delayed: ReferralRecord[] = []
    let completed = 0

    for (const r of referrals) {
      const isCompleted = isReferralCompleted(r.status)
      if (isCompleted) {
        completed++
      }

      const sla = slaEvaluations.get(r.id) || evaluateReferralSla(r, nowMs)

      // Grupo 1: A Encaminhar (sem equipe E sem gestor atribuído, e status pendente inicial)
      const hasAssignment = Boolean(r.assigned_team_id || r.assigned_manager_id)
      const s = (r.status || '').toLowerCase()
      const isPendingStatus = s === 'sent' || s === 'in_analysis'

      if (isPendingStatus && !hasAssignment) {
        toAssign.push(r)
      }

      // Grupo 2: Atrasadas
      // Se estiver pendente e (sla_breached=true OU sla_deadline < nowMs)
      if (sla.isPending && sla.isBreached) {
        delayed.push(r)
      }
    }

    return {
      toAssignList: toAssign,
      delayedList: delayed,
      completedCount: completed,
      totalCount: referrals.length,
    }
  }, [referrals, slaEvaluations, nowMs])

  const handleOpenQuickAssign = (ref: ReferralRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedReferral(ref)
    setTargetTeamId(ref.assigned_team_id || '')
    setTargetManagerId(ref.assigned_manager_id || '')
    setAssignError(null)
    setAssignSuccess(null)
    setQuickAssignOpen(true)
  }

  const handleConfirmAssign = async () => {
    if (!selectedReferral) return
    if (!targetTeamId && !targetManagerId) {
      setAssignError('Selecione ao menos a equipe ou o gestor responsável.')
      return
    }

    setIsSubmittingAssign(true)
    setAssignError(null)

    const res = await assignReferral({
      referral_id: selectedReferral.id,
      assigned_team_id: targetTeamId || undefined,
      assigned_manager_id: targetManagerId || undefined,
    })

    setIsSubmittingAssign(false)

    if (res.success) {
      setAssignSuccess('Indicação encaminhada com sucesso!')
      setTimeout(() => {
        setQuickAssignOpen(false)
        void loadData(true)
      }, 700)
    } else {
      setAssignError(res.error || 'Não foi possível encaminhar.')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOPO: HEADER DO PAINEL DO DIA */}
      <div className="bg-gradient-to-r from-[#0f2a43] to-[#15466d] rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold text-[#d9995b] mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Painel do Dia — Gestão Operacional ({user?.role?.toUpperCase() || 'STAFF'})
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Painel do Dia</h1>
          <p className="text-sm text-gray-200 mt-1 max-w-2xl leading-relaxed">
            Priorize o encaminhamento rápido de novos contatos e destrave atendimentos com prazo de
            SLA vencido.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData(true)}
            disabled={isRefreshing || isLoading}
            className="border-white/20 text-white hover:bg-white/10 bg-white/5 h-10 px-3.5 rounded-xl font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="ml-2 text-xs">Atualizar</span>
          </Button>

          <Button
            asChild
            className="bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold h-10 px-4 rounded-xl shadow-sm"
          >
            <Link to="/admin/indicacoes" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Filter className="w-4 h-4" />
              <span>Ver Todas as Indicações</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Alerta de erro geral com ação de retry */}
      {loadError && (
        <Alert
          variant="destructive"
          className="bg-red-50 border-red-200 text-red-900 rounded-xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Falha na sincronização dos dados</h4>
              <p className="text-xs text-red-700">{loadError}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadData(true)}
            className="border-red-300 text-red-800 hover:bg-red-100 text-xs shrink-0 rounded-lg h-8"
          >
            Tentar novamente
          </Button>
        </Alert>
      )}

      {/* 2. CARDS TOTALIZADORES DO DIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: A Encaminhar (Destaque Principal) */}
        <Card
          className={`border shadow-sm transition-all ${
            toAssignList.length > 0
              ? 'border-blue-300 bg-blue-50/40 ring-1 ring-blue-300/50'
              : 'border-[#e5e0d8] bg-white'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-blue-900">
                A Encaminhar
              </CardDescription>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            </div>
            <CardTitle className="text-3xl font-extrabold text-[#0f2a43] mt-1">
              {isLoading ? '...' : toAssignList.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-800 font-medium flex items-center gap-1">
              <Send className="w-3.5 h-3.5 text-blue-600" />
              Aguardando equipe ou gestor
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Atrasadas (Alerta Vermelho Bem Visível) */}
        <Card
          className={`border shadow-sm transition-all ${
            delayedList.length > 0
              ? 'border-red-300 bg-red-50/60 ring-1 ring-red-400/60'
              : 'border-[#e5e0d8] bg-white'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-red-900">
                SLA atrasado
              </CardDescription>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </span>
            </div>
            <CardTitle className="text-3xl font-extrabold text-red-700 mt-1">
              {isLoading ? '...' : delayedList.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-red-700 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-red-600" />
              Prazo de atendimento estourado
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Geral */}
        <Card className="border-[#e5e0d8] shadow-sm bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium text-gray-500">
                Total Registrado
              </CardDescription>
              <Building className="w-4 h-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl font-extrabold text-[#0f2a43] mt-1">
              {isLoading ? '...' : totalCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Histórico acumulado</p>
          </CardContent>
        </Card>

        {/* Card 4: Concluídas / Fechadas */}
        <Card className="border-[#e5e0d8] shadow-sm bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium text-gray-500">
                Finalizadas
              </CardDescription>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl font-extrabold text-emerald-700 mt-1">
              {isLoading ? '...' : completedCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-700 font-medium">Contratos ou finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. SEÇÃO 1: INDICAÇÕES A ENCAMINHAR (AÇÃO IMEDIATA) */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-[#e5e0d8] pb-4 bg-gradient-to-r from-blue-50/40 via-white to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-[#1a5d8f]" />
                <CardTitle className="text-lg font-bold text-[#0f2a43]">
                  Indicações a Encaminhar ({toAssignList.length})
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-gray-500">
                Indicações recebidas que ainda não foram direcionadas para nenhuma equipe ou gestor.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              Carregando indicações a encaminhar...
            </div>
          ) : toAssignList.length === 0 ? (
            <div className="py-10 px-4 text-center max-w-md mx-auto space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#0f2a43]">Tudo encaminhado!</h4>
              <p className="text-xs text-gray-500">
                Não há nenhuma indicação aguardando encaminhamento neste momento. Bom trabalho!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e0d8]">
              {toAssignList.map((ref) => {
                const typeInfo = getPropertyTypeLabel(ref.property_type)
                const statusCfg = getStatusConfig(ref.status)
                const TypeIcon = typeInfo.icon
                const indicatorName = ref.expand?.indicator_id?.full_name || 'Indicador parceiro'
                const sla = slaEvaluations.get(ref.id) || evaluateReferralSla(ref, nowMs)

                return (
                  <div
                    key={ref.id}
                    onClick={() => navigate(`/admin/indicacao/${ref.id}`)}
                    className={`p-4 sm:p-5 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4 group ${
                      sla.isBreached
                        ? 'bg-red-50/50 hover:bg-red-50/80 border-l-4 border-l-red-600'
                        : 'hover:bg-[#faf7f2]/80'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-bold text-base transition-colors ${
                            sla.isBreached
                              ? 'text-red-900 group-hover:text-red-700'
                              : 'text-[#0f2a43] group-hover:text-[#1a5d8f]'
                          }`}
                        >
                          {ref.client_name}
                        </span>

                        {/* Destaque visual de SLA */}
                        {sla.isBreached ? (
                          <Badge className="bg-red-600 text-white hover:bg-red-700 border-red-700 text-xs font-bold inline-flex items-center gap-1 shadow-xs animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>SLA atrasado</span>
                          </Badge>
                        ) : sla.remainingFormatted ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3 text-emerald-600" />
                            <span>{sla.remainingFormatted}</span>
                          </Badge>
                        ) : null}

                        <Badge
                          variant="outline"
                          className="bg-white text-gray-700 border-[#e5e0d8] text-xs font-medium inline-flex items-center gap-1"
                        >
                          <TypeIcon className="w-3 h-3 text-[#1a5d8f]" />
                          <span>{typeInfo.label}</span>
                        </Badge>

                        <Badge
                          className={`${statusCfg.badgeClass} text-xs font-semibold px-2 py-0.5`}
                        >
                          {statusCfg.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        {ref.client_phone && (
                          <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {formatPhone(ref.client_phone)}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Users className="w-3 h-3 text-gray-400" />
                          Indicado por: <strong className="text-gray-800">{indicatorName}</strong>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {formatDateTime(ref.created)}
                        </span>

                        {ref.sla_deadline && (
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              sla.isBreached ? 'text-red-700 font-bold' : 'text-gray-600'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            Prazo: {formatDateTime(ref.sla_deadline)}
                          </span>
                        )}
                      </div>

                      {ref.property_description && (
                        <p className="text-xs text-gray-600 line-clamp-1 italic max-w-2xl pt-0.5">
                          "{ref.property_description}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#e5e0d8] justify-between md:justify-end">
                      <Button
                        type="button"
                        onClick={(e) => handleOpenQuickAssign(ref, e)}
                        className="bg-[#1a5d8f] hover:bg-[#144a72] text-white font-semibold text-xs h-9 px-3.5 rounded-xl shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Encaminhar Agora
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 group-hover:text-[#1a5d8f] p-1.5 h-9 w-9"
                        title="Ver detalhes"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. SEÇÃO 2: INDICAÇÕES ATRASADAS (SLA) — DESTAQUE EM VERMELHO */}
      <Card className="border-red-200 shadow-sm bg-white overflow-hidden ring-1 ring-red-200">
        <CardHeader className="border-b border-red-200 pb-4 bg-gradient-to-r from-red-100/60 via-red-50/40 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                <CardTitle className="text-lg font-bold text-red-950">
                  Indicações com SLA Atrasado ({delayedList.length})
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-red-800/80">
                Oportunidades pendentes com prazo de SLA estourado ou marcadas como atrasadas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              Carregando indicações atrasadas...
            </div>
          ) : delayedList.length === 0 ? (
            <div className="py-10 px-4 text-center max-w-md mx-auto space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#0f2a43]">Nenhum atraso no momento!</h4>
              <p className="text-xs text-gray-500">
                Todas as indicações em aberto estão dentro do prazo estipulado de SLA.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-red-100">
              {delayedList.map((ref) => {
                const typeInfo = getPropertyTypeLabel(ref.property_type)
                const statusCfg = getStatusConfig(ref.status)
                const TypeIcon = typeInfo.icon
                const indicatorName = ref.expand?.indicator_id?.full_name || 'Indicador parceiro'
                const assignedTeamName = ref.expand?.assigned_team_id?.name
                const assignedMgrName = ref.expand?.assigned_manager_id?.name

                return (
                  <div
                    key={ref.id}
                    onClick={() => navigate(`/admin/indicacao/${ref.id}`)}
                    className="p-4 sm:p-5 bg-red-50/40 hover:bg-red-50/70 border-l-4 border-l-red-600 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-red-950 group-hover:text-red-700 transition-colors">
                          {ref.client_name}
                        </span>

                        {/* Rótulo exato "SLA atrasado" em vermelho bem visível */}
                        <Badge className="bg-red-600 text-white hover:bg-red-700 border-red-700 text-xs font-bold inline-flex items-center gap-1 shadow-xs animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-white" />
                          <span>SLA atrasado</span>
                        </Badge>

                        <Badge
                          variant="outline"
                          className="bg-white text-gray-700 border-red-200 text-xs font-medium inline-flex items-center gap-1"
                        >
                          <TypeIcon className="w-3 h-3 text-[#1a5d8f]" />
                          <span>{typeInfo.label}</span>
                        </Badge>

                        <Badge
                          className={`${statusCfg.badgeClass} text-xs font-semibold px-2 py-0.5`}
                        >
                          {statusCfg.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-red-900/80">
                        {ref.client_phone && (
                          <span className="inline-flex items-center gap-1 text-red-950 font-medium">
                            <Phone className="w-3 h-3 text-red-500" />
                            {formatPhone(ref.client_phone)}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-gray-700">
                          <Users className="w-3 h-3 text-gray-400" />
                          Indicado por: <strong>{indicatorName}</strong>
                        </span>

                        {assignedTeamName && (
                          <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                            <Building className="w-3 h-3" />
                            Equipe: {assignedTeamName}
                          </span>
                        )}

                        {assignedMgrName && (
                          <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                            Responsável: {assignedMgrName}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-100/80 px-2 py-0.5 rounded-md border border-red-200">
                          <Clock className="w-3 h-3 text-red-600" />
                          Prazo expirado:{' '}
                          {ref.sla_deadline ? formatDateTime(ref.sla_deadline) : 'SLA estourado'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-red-200 justify-between md:justify-end">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/admin/indicacao/${ref.id}`)
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs"
                      >
                        Abrir e Cobrar
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 group-hover:text-red-700 p-1.5 h-9 w-9"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. MODAL DE ENCAMINHAMENTO RÁPIDO */}
      <Dialog open={quickAssignOpen} onOpenChange={setQuickAssignOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl border-[#e5e0d8]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0f2a43] flex items-center gap-2">
              <Send className="w-5 h-5 text-[#1a5d8f]" />
              Encaminhar Indicação
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              {selectedReferral && (
                <span>
                  Cliente indicado:{' '}
                  <strong className="text-gray-800">{selectedReferral.client_name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Escolha da Equipe */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Equipe de Destino</label>
              <Select value={targetTeamId} onValueChange={setTargetTeamId}>
                <SelectTrigger className="rounded-xl border-[#e5e0d8] h-10 text-xs">
                  <SelectValue placeholder="Selecione a equipe comercial..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#e5e0d8] rounded-xl">
                  {teams.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhuma equipe cadastrada
                    </SelectItem>
                  ) : (
                    teams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Escolha do Gestor / Responsável */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Gestor / Corretor Responsável
              </label>
              <Select value={targetManagerId} onValueChange={setTargetManagerId}>
                <SelectTrigger className="rounded-xl border-[#e5e0d8] h-10 text-xs">
                  <SelectValue placeholder="Selecione o gestor ou líder..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#e5e0d8] rounded-xl">
                  {managers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum gestor encontrado
                    </SelectItem>
                  ) : (
                    managers.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.name} ({m.role})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickAssignOpen(false)}
              disabled={isSubmittingAssign}
              className="rounded-xl border-[#e5e0d8] text-xs h-10"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAssign}
              disabled={isSubmittingAssign}
              className="bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold rounded-xl text-xs h-10"
            >
              {isSubmittingAssign ? 'Encaminhando...' : 'Confirmar Encaminhamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
