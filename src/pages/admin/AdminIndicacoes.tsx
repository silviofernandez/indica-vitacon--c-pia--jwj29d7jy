import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  Users,
  Building2,
  Calendar,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  PlusCircle,
  Home,
  Tag,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRealtime } from '@/hooks/use-realtime'
import { listAllReferrals, getReferralById, type ReferralRecord } from '@/services/referrals'
import { formatPhone } from '@/services/indicators'
import {
  getStatusConfig,
  getPropertyTypeLabel,
  formatDateTime,
} from '@/pages/indicador/IndicadorDashboard'
import { evaluateReferralSla } from '@/lib/sla'

export default function AdminIndicacoes() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [nowMs, setNowMs] = useState<number>(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now())
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  useRealtime<ReferralRecord>(
    'referrals',
    useCallback(async (e) => {
      const { action, record } = e
      if (!record || !record.id) return

      if (action === 'delete') {
        setReferrals((prev) => prev.filter((r) => r.id !== record.id))
        return
      }

      const enriched = await getReferralById(record.id)
      const recordToUse = enriched || record

      setReferrals((prev) => {
        const index = prev.findIndex((r) => r.id === recordToUse.id)
        if (index >= 0) {
          const next = [...prev]
          next[index] = recordToUse
          return next
        }
        return [recordToUse, ...prev]
      })
    }, []),
    true,
  )

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      setLoadError(null)
      const res = await listAllReferrals({ perPage: 500 })
      setReferrals(res.items)
    } catch (err) {
      console.warn('Erro ao carregar indicações:', err)
      setLoadError('Não foi possível carregar a lista de indicações. Tente atualizar.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Filtragem combinada
  const filteredReferrals = useMemo(() => {
    let list = referrals

    // Filtro por tipo: buyer, rental, sale, vitacon
    if (typeFilter !== 'all') {
      list = list.filter((r) => {
        const t = (r.property_type || '').toLowerCase()
        if (typeFilter === 'buyer') return t === 'buyer' || t.includes('compra')
        if (typeFilter === 'rental') return t === 'rental' || t.includes('alug')
        if (typeFilter === 'sale') return t === 'sale' || t.includes('vend')
        if (typeFilter === 'vitacon') return t === 'vitacon' || t.includes('vitacon')
        return t === typeFilter
      })
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      list = list.filter((r) => {
        const s = (r.status || '').toLowerCase()
        if (statusFilter === 'in_progress') {
          return s === 'in_progress' || s === 'in_analysis'
        }
        if (statusFilter === 'closed_won') {
          return s === 'closed_won' || s === 'closed'
        }
        if (statusFilter === 'closed_lost') {
          return s === 'closed_lost' || s === 'cancelled'
        }
        return s === statusFilter
      })
    }

    // Busca textual por nome ou contato do indicado, ou nome do indicador
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((r) => {
        const name = (r.client_name || '').toLowerCase()
        const phone = (r.client_phone || '').toLowerCase()
        const indName = (r.expand?.indicator_id?.full_name || '').toLowerCase()
        const desc = (r.property_description || '').toLowerCase()
        return name.includes(q) || phone.includes(q) || indName.includes(q) || desc.includes(q)
      })
    }

    return list
  }, [referrals, typeFilter, statusFilter, searchQuery])

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOPO: TÍTULO E AÇÃO DE ATUALIZAR */}
      <div className="bg-gradient-to-r from-[#0f2a43] to-[#15466d] rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-semibold text-[#d9995b] mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Gestão Completa de Oportunidades
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Todas as Indicações
          </h1>
          <p className="text-sm text-gray-200 mt-1 max-w-2xl leading-relaxed">
            Consulte todas as indicações enviadas pelos indicadores parceiros, filtre por modalidade
            ou status e acesse o histórico operacional de cada uma.
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
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-white/5 h-10 px-4 rounded-xl font-medium"
          >
            <Link to="/admin" className="text-xs sm:text-sm">
              Painel do Dia
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. CARD DE FILTROS E BUSCA */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Campo de Busca */}
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por nome do indicado, telefone ou indicador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
              />
            </div>

            {/* Filtro por Tipo */}
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="rounded-xl border-[#e5e0d8] h-10 text-xs">
                  <SelectValue placeholder="Tipo de Imóvel" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#e5e0d8] rounded-xl text-xs">
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="buyer">Comprador</SelectItem>
                  <SelectItem value="rental">Imóvel para alugar</SelectItem>
                  <SelectItem value="sale">Imóvel para vender</SelectItem>
                  <SelectItem value="vitacon">Vitacon SP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status (Rótulos Leigos) */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl border-[#e5e0d8] h-10 text-xs">
                  <SelectValue placeholder="Status atual" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#e5e0d8] rounded-xl text-xs">
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="sent">Aguardando análise</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="visited">Visita agendada</SelectItem>
                  <SelectItem value="negotiating">Em negociação</SelectItem>
                  <SelectItem value="closed_won">Concluída com sucesso</SelectItem>
                  <SelectItem value="paid">Bonificação paga</SelectItem>
                  <SelectItem value="closed_lost">Cancelada</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha de resumo do filtro */}
          <div className="flex items-center justify-between pt-2 border-t border-[#e5e0d8] text-xs text-gray-500">
            <span>
              Exibindo <strong>{filteredReferrals.length}</strong> de {referrals.length} indicações
            </span>
            {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setTypeFilter('all')
                  setStatusFilter('all')
                }}
                className="text-[#1a5d8f] hover:text-[#144a72] h-7 px-2 text-xs"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerta de erro de carregamento */}
      {loadError && (
        <Alert
          variant="destructive"
          className="bg-red-50 border-red-200 text-red-900 rounded-xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Falha ao buscar indicações</h4>
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

      {/* 3. LISTA DAS INDICAÇÕES */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center space-y-4 px-4">
              <div className="w-10 h-10 border-3 border-[#1a5d8f] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Carregando lista de indicações...</p>
              <div className="max-w-xl mx-auto space-y-2.5 pt-2">
                <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="py-16 px-4 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <Filter className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#0f2a43]">Nenhuma indicação localizada</h4>
              <p className="text-xs text-gray-500">
                Nenhum registro corresponde aos filtros selecionados. Tente ajustar os critérios de
                busca.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e0d8]">
              {filteredReferrals.map((ref) => {
                const typeInfo = getPropertyTypeLabel(ref.property_type)
                const statusCfg = getStatusConfig(ref.status)
                const TypeIcon = typeInfo.icon
                const indicatorName = ref.expand?.indicator_id?.full_name || 'Indicador parceiro'
                const assignedTeamName = ref.expand?.assigned_team_id?.name
                const assignedMgrName = ref.expand?.assigned_manager_id?.name
                const sla = evaluateReferralSla(ref, nowMs)

                return (
                  <div
                    key={ref.id}
                    onClick={() => navigate(`/admin/indicacao/${ref.id}`)}
                    className={`p-4 sm:p-5 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4 group ${
                      sla.isBreached
                        ? 'bg-red-50/40 hover:bg-red-50/70 border-l-4 border-l-red-600'
                        : 'hover:bg-[#faf7f2]/70'
                    }`}
                  >
                    {/* Dados do Indicado */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-bold text-base transition-colors ${
                            sla.isBreached
                              ? 'text-red-950 group-hover:text-red-700'
                              : 'text-[#0f2a43] group-hover:text-[#1a5d8f]'
                          }`}
                        >
                          {ref.client_name}
                        </span>

                        {sla.isBreached ? (
                          <Badge className="bg-red-600 text-white hover:bg-red-700 border-red-700 text-xs font-bold inline-flex items-center gap-1 shadow-xs animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-white" />
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
                      </div>

                      {/* Informação da equipe ou corretor atribuído */}
                      <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                        {assignedTeamName ? (
                          <span className="text-[#1a5d8f] font-medium bg-[#1a5d8f]/5 px-2 py-0.5 rounded-md">
                            Equipe: {assignedTeamName}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md">
                            Sem equipe atribuída
                          </span>
                        )}

                        {assignedMgrName && (
                          <span className="text-gray-600">
                            Responsável: <strong>{assignedMgrName}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botão de Ação */}
                    <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#e5e0d8] justify-between md:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#1a5d8f]/5 font-semibold text-xs h-9 px-3 rounded-xl"
                      >
                        Ver Detalhes
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
