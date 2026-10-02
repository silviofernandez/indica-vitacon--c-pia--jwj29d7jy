import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Building2,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  Phone,
  User,
  ArrowUpRight,
  TrendingUp,
  Percent,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import {
  listAllReferrals,
  listAllBonuses,
  type ReferralRecord,
  type BonusRecord,
} from '@/services/referrals'
import {
  getStatusConfig,
  formatCurrency,
  formatDateTime,
} from '@/pages/indicador/IndicadorDashboard'
import { formatPhone } from '@/services/indicators'

export default function AdminVitacon() {
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [bonuses, setBonuses] = useState<BonusRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Carregar dados exclusivos de Vitacon SP
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      setLoadError(null)
      const [refRes, bonusList] = await Promise.all([
        listAllReferrals({
          filter: 'property_type = "vitacon"',
          sort: '-created',
        }),
        listAllBonuses({
          filter: 'is_vitacon = true || bonus_type = "vitacon_percent"',
          sort: '-created',
        }),
      ])

      setReferrals(refRes.items)
      setBonuses(bonusList)
    } catch (err) {
      console.warn('Erro ao carregar dados Vitacon SP:', err)
      setLoadError('Não foi possível carregar as oportunidades Vitacon SP.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Filtragem das indicações Vitacon
  const filteredReferrals = useMemo(() => {
    let list = referrals

    if (statusFilter !== 'all') {
      list = list.filter((r) => {
        const s = (r.status || '').toLowerCase()
        if (statusFilter === 'closed_won') {
          return s === 'closed_won' || s === 'closed'
        }
        if (statusFilter === 'paid') {
          return s === 'paid' || s === 'bonus_paid'
        }
        if (statusFilter === 'in_progress') {
          return (
            s === 'in_analysis' || s === 'in_progress' || s === 'visited' || s === 'negotiating'
          )
        }
        return s === statusFilter
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((r) => {
        const name = (r.client_name || '').toLowerCase()
        const phone = (r.client_phone || '').toLowerCase()
        const indName = (r.expand?.indicator_id?.full_name || '').toLowerCase()
        const desc = (r.property_description || '').toLowerCase()
        const rId = r.id.toLowerCase()
        return (
          name.includes(q) ||
          phone.includes(q) ||
          indName.includes(q) ||
          desc.includes(q) ||
          rId.includes(q)
        )
      })
    }

    return list
  }, [referrals, statusFilter, searchQuery])

  // Totais e métricas de Vitacon SP
  const metrics = useMemo(() => {
    let totalDealVolume = 0
    let closedWonCount = 0
    let inProgressCount = 0
    let vitaconBonusGenerated = 0
    let vitaconBonusPaid = 0
    let vitaconBonusPending = 0

    for (const r of referrals) {
      const val = Number(r.deal_value) || Number(r.expected_value) || 0
      totalDealVolume += val
      const s = (r.status || '').toLowerCase()
      if (s === 'closed_won' || s === 'paid' || s === 'bonus_paid' || s === 'closed') {
        closedWonCount++
      } else if (
        s === 'in_analysis' ||
        s === 'in_progress' ||
        s === 'visited' ||
        s === 'negotiating'
      ) {
        inProgressCount++
      }
    }

    for (const b of bonuses) {
      const val = Number(b.amount) || 0
      vitaconBonusGenerated += val
      const isPaid = b.status === 'paid' || b.payment_status === 'paid'
      if (isPaid) {
        vitaconBonusPaid += val
      } else {
        vitaconBonusPending += val
      }
    }

    return {
      totalReferrals: referrals.length,
      closedWonCount,
      inProgressCount,
      totalDealVolume,
      vitaconBonusGenerated,
      vitaconBonusPaid,
      vitaconBonusPending,
    }
  }, [referrals, bonuses])

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* 1. CABEÇALHO VITACON SP */}
      <div className="bg-gradient-to-r from-[#170e38] via-[#241352] to-[#3b1c85] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-purple-400/10 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-purple-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Parceria Exclusiva • Vitacon São Paulo
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Painel de Indicações Vitacon SP
          </h1>
          <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
            Visão gerencial de oportunidades para unidades compactas, studios e projetos Vitacon na
            capital paulista. Bonificação de <strong>1,0% do valor do imóvel</strong> para o
            indicador (sem bônus de indicado).
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData(true)}
            disabled={isRefreshing || isLoading}
            className="border-white/20 text-white hover:bg-white/10 bg-white/5 h-11 px-4 rounded-xl font-medium text-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
        </div>
      </div>

      {/* Alerta de erro com botão de retentativa */}
      {loadError && (
        <Alert
          variant="destructive"
          className="bg-red-50 border-red-200 text-red-900 rounded-xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Falha ao buscar dados Vitacon</h4>
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

      {/* 2. CARDS DE MÉTRICAS VITACON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Oportunidades Vitacon */}
        <Card className="border-purple-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total de Oportunidades
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0f2a43]">
              {isLoading ? '...' : metrics.totalReferrals}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.closedWonCount} fechadas • {metrics.inProgressCount} em andamento
            </p>
          </CardContent>
        </Card>

        {/* Volume de Negócios Vitacon */}
        <Card className="border-purple-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Volume em Imóveis
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0f2a43]">
              {isLoading ? '...' : formatCurrency(metrics.totalDealVolume)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Soma de valores pretendidos/negociados</p>
          </CardContent>
        </Card>

        {/* Total Bônus Vitacon 1% */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50/60 to-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Bônus Vitacon (1%)
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-800 flex items-center justify-center font-bold">
                <Percent className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-800">
              {isLoading ? '...' : formatCurrency(metrics.vitaconBonusGenerated)}
            </div>
            <p className="text-xs text-purple-900/80 mt-1">Gerado para indicadores parceiros</p>
          </CardContent>
        </Card>

        {/* Bônus Vitacon a Pagar */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Bônus Vitacon a Pagar
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
              {isLoading ? '...' : formatCurrency(metrics.vitaconBonusPending)}
            </div>
            <p className="text-xs text-amber-900/80 mt-1">
              Já quitado: {formatCurrency(metrics.vitaconBonusPaid)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. FILTROS E BUSCA */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-[#faf7f2] rounded-xl border border-[#e5e0d8] self-start md:self-auto overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-purple-800 text-white shadow-sm'
                    : 'text-gray-700 hover:text-purple-900'
                }`}
              >
                Todas ({referrals.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === 'in_progress'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-blue-800'
                }`}
              >
                Em Andamento
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('closed_won')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === 'closed_won'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-gray-700 hover:text-emerald-800'
                }`}
              >
                Concluídas (Fechadas)
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-gray-700 hover:text-emerald-900'
                }`}
              >
                Bonificação Paga
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar cliente, indicador ou detalhes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-[#e5e0d8] text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. LISTA DAS INDICAÇÕES VITACON SP */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-[#e5e0d8] pb-4 bg-gradient-to-r from-purple-50/40 via-[#faf7f2] to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <div>
                <CardTitle className="text-base font-bold text-[#0f2a43]">
                  Oportunidades Vitacon SP ({filteredReferrals.length})
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Lista completa de indicações vinculadas à linha de empreendimentos Vitacon
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-700" />
              Carregando indicações Vitacon SP...
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0f2a43]">Nenhuma indicação encontrada</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Não há indicações de Vitacon SP com os filtros ou buscas selecionados.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e0d8]">
              {filteredReferrals.map((referral) => {
                const statusCfg = getStatusConfig(referral.status)
                const indicator = referral.expand?.indicator_id
                const linkedBonus = bonuses.find((b) => b.referral_id === referral.id)
                const dealVal = referral.deal_value || referral.expected_value || 0
                const calculatedVitaconBonus = dealVal ? dealVal * 0.01 : 0

                return (
                  <div
                    key={referral.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-[#faf7f2]/50 transition-colors"
                  >
                    {/* Dados Principais */}
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/indicacao/${referral.id}`}
                          className="font-bold text-sm text-[#0f2a43] hover:text-[#1a5d8f] flex items-center gap-1"
                        >
                          {referral.client_name}
                          <ArrowUpRight className="w-3.5 h-3.5 text-gray-400" />
                        </Link>
                        <Badge
                          className={`${statusCfg.badgeClass} text-[11px] font-semibold px-2 py-0.5`}
                        >
                          {statusCfg.label}
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[11px] font-semibold">
                          Vitacon SP
                        </Badge>
                      </div>

                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {referral.client_phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {formatPhone(referral.client_phone)}
                          </span>
                        )}

                        {indicator && (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            Indicador:{' '}
                            <strong className="text-gray-800">{indicator.full_name}</strong>
                          </span>
                        )}

                        <span className="text-gray-400">{formatDateTime(referral.created)}</span>
                      </div>

                      {referral.property_description && (
                        <p className="text-xs text-gray-600 line-clamp-1 italic bg-[#faf7f2] p-1.5 rounded-lg border border-[#e5e0d8] max-w-lg">
                          "{referral.property_description}"
                        </p>
                      )}
                    </div>

                    {/* Bloco de Valores & Bônus */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e5e0d8]">
                      {/* Valor do Imóvel */}
                      <div className="sm:text-right">
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">
                          Valor Imóvel
                        </span>
                        <span className="text-sm font-bold text-[#0f2a43]">
                          {dealVal > 0 ? formatCurrency(dealVal) : 'A definir'}
                        </span>
                      </div>

                      {/* Bônus do Indicador (1%) */}
                      <div className="sm:text-right">
                        <span className="text-[10px] text-purple-700 block uppercase font-bold">
                          Bônus 1% Vitacon
                        </span>
                        <span className="text-base sm:text-lg font-extrabold text-purple-800">
                          {linkedBonus
                            ? formatCurrency(linkedBonus.amount)
                            : calculatedVitaconBonus > 0
                              ? formatCurrency(calculatedVitaconBonus)
                              : 'A calcular'}
                        </span>
                        {linkedBonus && (
                          <span className="block text-[10px] font-semibold text-gray-500">
                            {linkedBonus.status === 'paid' ? (
                              <span className="text-emerald-700">Quitado via PIX</span>
                            ) : (
                              <span className="text-amber-700">Pendente de quitação</span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Botão Ver Detalhes */}
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-[#e5e0d8] h-9 px-3 text-xs"
                      >
                        <Link to={`/admin/indicacao/${referral.id}`}>Ver Ficha</Link>
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
