import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  DollarSign,
  Send,
  Building2,
  Home,
  Tag,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  ChevronRight,
  TrendingUp,
  Wallet,
  Phone,
  Calendar,
  XCircle,
  Info,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import {
  getIndicatorDashboardData,
  type ReferralRecord,
  type BonusRecord,
  type IndicatorSummary,
} from '@/services/referrals'
import { formatPhone } from '@/services/indicators'

/**
 * Mapeamento e rótulos leigos para cada status de indicação.
 * Nenhum jargão técnico (nada de RLS, SLA, status code).
 */
export interface StatusConfig {
  label: string
  description: string
  badgeClass: string
  icon: React.ComponentType<{ className?: string }>
  dotClass: string
}

export function getStatusConfig(status?: string): StatusConfig {
  const s = (status || '').toLowerCase().trim()

  switch (s) {
    case 'sent':
      return {
        label: 'Aguardando análise',
        description: 'Recebemos sua indicação e já iniciamos a verificação.',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        dotClass: 'bg-amber-500',
        icon: Clock,
      }
    case 'in_analysis':
    case 'in_progress':
      return {
        label: 'Em andamento',
        description: 'Nossa equipe está entrando em contato com o cliente.',
        badgeClass: 'bg-blue-100 text-[#1a5d8f] border-blue-300',
        dotClass: 'bg-[#1a5d8f]',
        icon: RefreshCw,
      }
    case 'visited':
      return {
        label: 'Visita agendada',
        description: 'O cliente está em fase de visita aos imóveis.',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
        dotClass: 'bg-purple-500',
        icon: Building2,
      }
    case 'negotiating':
      return {
        label: 'Em negociação',
        description: 'Proposta em elaboração ou fechamento de contrato.',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        dotClass: 'bg-indigo-500',
        icon: TrendingUp,
      }
    case 'closed_won':
    case 'closed':
      return {
        label: 'Concluída com sucesso',
        description: 'Negócio fechado! O processo de bonificação foi iniciado.',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dotClass: 'bg-emerald-500',
        icon: CheckCircle2,
      }
    case 'paid':
    case 'bonus_paid':
      return {
        label: 'Bonificação paga',
        description: 'O valor da sua recompensa já foi depositado via PIX.',
        badgeClass: 'bg-emerald-600 text-white border-emerald-600',
        dotClass: 'bg-white',
        icon: DollarSign,
      }
    case 'closed_lost':
    case 'cancelled':
      return {
        label: 'Cancelada',
        description: 'O cliente não deu continuidade no momento.',
        badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
        dotClass: 'bg-gray-400',
        icon: XCircle,
      }
    case 'expired':
      return {
        label: 'Expirada',
        description: 'O prazo desta oportunidade encerrou sem contato.',
        badgeClass: 'bg-stone-100 text-stone-700 border-stone-300',
        dotClass: 'bg-stone-400',
        icon: Clock,
      }
    default:
      return {
        label: 'Em análise',
        description: 'Sua indicação está sendo processada pela equipe.',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        dotClass: 'bg-blue-500',
        icon: Clock,
      }
  }
}

/**
 * Tradução amigável dos tipos de imóveis
 */
export function getPropertyTypeLabel(type?: string): {
  label: string
  icon: React.ComponentType<{ className?: string }>
} {
  const t = (type || '').toLowerCase().trim()
  if (t === 'vitacon' || t.includes('vitacon')) {
    return { label: 'Vitacon SP', icon: Sparkles }
  }
  if (t === 'rental' || t.includes('alug')) {
    return { label: 'Imóvel para alugar', icon: Home }
  }
  if (t === 'buyer' || t.includes('compra')) {
    return { label: 'Comprador', icon: Tag }
  }
  if (t === 'sale' || t.includes('venda')) {
    return { label: 'Imóvel para vender', icon: Building2 }
  }
  return { label: 'Oportunidade Imobiliária', icon: Home }
}

/**
 * Formata valores em R$ padrão pt-BR
 */
export function formatCurrency(value?: number): string {
  const val = Number(value) || 0
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * Formata data legível (ex: 28 out 2026, 14:20)
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Formata o prazo de contato (SLA de 3 horas) em linguagem simples e leiga.
 * Exemplo: "Prazo de contato: até hoje às 17:30" ou "Prazo de contato: até 17:30"
 */
export function formatSlaNotice(
  slaDeadline?: string,
  status?: string,
): { text: string; isPast: boolean } | null {
  // Apenas relevante se a indicação estiver pendente/recente (sent ou in_analysis)
  const s = (status || '').toLowerCase()
  if (s !== 'sent' && s !== 'in_analysis') {
    return null
  }
  if (!slaDeadline) return null

  try {
    const deadline = new Date(slaDeadline)
    if (isNaN(deadline.getTime())) return null

    const now = new Date()
    const isPast = deadline.getTime() < now.getTime()

    const timeStr = deadline.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const isToday =
      deadline.getDate() === now.getDate() &&
      deadline.getMonth() === now.getMonth() &&
      deadline.getFullYear() === now.getFullYear()

    if (isPast) {
      return {
        text: 'Nossa equipe está finalizando a triagem com prioridade.',
        isPast: true,
      }
    }

    return {
      text: isToday
        ? `Prazo de contato: até ${timeStr}`
        : `Prazo de contato: até ${deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às ${timeStr}`,
      isPast: false,
    }
  } catch {
    return null
  }
}

export default function IndicadorDashboard() {
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [data, setData] = useState<IndicatorSummary>({
    totalReferrals: 0,
    inProgressCount: 0,
    closedCount: 0,
    totalBonusAccumulated: 0,
    totalBonusPaid: 0,
    totalBonusPending: 0,
    referrals: [],
    bonuses: [],
  })

  // Filtros de busca e abas
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'closed' | 'paid'>(
    'all',
  )

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        setErrorMessage(null)
        const summary = await getIndicatorDashboardData(user?.id)
        setData(summary)
      } catch (err) {
        console.warn('Erro ao carregar dados do indicador:', err)
        setErrorMessage(
          'Não conseguimos carregar suas informações no momento. Verifique sua conexão e tente novamente.',
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [user?.id],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Filtragem das indicações
  const filteredReferrals = useMemo(() => {
    let list = data.referrals

    // Filtro por busca de texto (nome, telefone, tipo)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((r) => {
        const name = (r.client_name || '').toLowerCase()
        const phone = (r.client_phone || '').toLowerCase()
        const type = (r.property_type || '').toLowerCase()
        const desc = (r.property_description || '').toLowerCase()
        return name.includes(q) || phone.includes(q) || type.includes(q) || desc.includes(q)
      })
    }

    // Filtro por abas amigáveis
    if (activeTab === 'pending') {
      list = list.filter((r) => {
        const s = (r.status || '').toLowerCase()
        return s === 'sent'
      })
    } else if (activeTab === 'in_progress') {
      list = list.filter((r) => {
        const s = (r.status || '').toLowerCase()
        return s === 'in_analysis' || s === 'in_progress' || s === 'visited' || s === 'negotiating'
      })
    } else if (activeTab === 'closed') {
      list = list.filter((r) => {
        const s = (r.status || '').toLowerCase()
        return s === 'closed_won' || s === 'closed'
      })
    } else if (activeTab === 'paid') {
      list = list.filter((r) => {
        const s = (r.status || '').toLowerCase()
        return s === 'paid' || s === 'bonus_paid'
      })
    }

    return list
  }, [data.referrals, searchQuery, activeTab])

  // Primeiro nome para saudação
  const firstName = user?.name ? user.name.split(' ')[0] : 'Indicador'

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================== */}
      {/* 1. TOPO: BANNER BOAS-VINDAS + BOTÃO NOVA INDICAÇÃO */}
      {/* ============================================================== */}
      <div className="bg-gradient-to-r from-[#0f2a43] via-[#15466d] to-[#1a5d8f] rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative overflow-hidden">
        {/* Detalhe de fundo suave */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-[#d9995b] border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            Portal do Indicador Gabriel
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Olá, {firstName}!</h1>
          <p className="text-sm text-gray-200 leading-relaxed">
            Acompanhe o andamento em tempo real de cada pessoa que você indicou e visualize o valor
            acumulado das suas bonificações.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData(true)}
            disabled={isRefreshing || isLoading}
            className="border-white/20 text-white hover:bg-white/10 bg-white/5 h-11 px-3 rounded-xl font-medium"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="sm:inline ml-2 text-xs">Atualizar</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 bg-white/5 h-11 px-4 rounded-xl font-semibold transition-all"
          >
            <Link to="/indicador/relatorio" className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4 text-[#d9995b]" />
              <span>Ver Relatório</span>
            </Link>
          </Button>

          <Button
            asChild
            className="bg-[#d9995b] hover:bg-[#c48548] text-white font-bold px-6 h-11 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Link to="/indicador/nova-indicacao" className="flex items-center justify-center gap-2">
              <PlusCircle className="w-5 h-5" />
              <span>Nova Indicação</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CARD DE DESTAQUE: VALOR DE BONIFICAÇÃO ACUMULADO */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card Principal de Bonificação Acumulada */}
        <Card className="lg:col-span-2 border-[#e5e0d8] shadow-sm bg-gradient-to-br from-white via-[#faf7f2] to-amber-50/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#d9995b]/10 rounded-full blur-2xl pointer-events-none" />

          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold text-[#0f2a43]">
                    Bonificação Acumulada
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Soma de todas as suas recompensas geradas por indicações
                  </CardDescription>
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-200"
              >
                Pagamento via PIX
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 py-2">
              <div>
                <span className="text-xs text-gray-500 block font-medium uppercase tracking-wider">
                  Valor Total Acumulado
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight mt-1">
                  {isLoading ? (
                    <span className="text-gray-300 animate-pulse">R$ ...,..</span>
                  ) : (
                    formatCurrency(data.totalBonusAccumulated)
                  )}
                </div>
              </div>

              {/* Subtotais detalhados: Pago vs A Receber */}
              <div className="grid grid-cols-2 gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#e5e0d8] sm:pl-6">
                <div>
                  <span className="text-[11px] text-gray-500 block font-medium">Já Recebido</span>
                  <span className="text-base sm:text-lg font-bold text-[#0f2a43]">
                    {isLoading ? '...' : formatCurrency(data.totalBonusPaid)}
                  </span>
                  <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Pago via PIX
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 block font-medium">A Receber</span>
                  <span className="text-base sm:text-lg font-bold text-[#1a5d8f]">
                    {isLoading ? '...' : formatCurrency(data.totalBonusPending)}
                  </span>
                  <span className="text-[11px] text-blue-600 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> Em liberação
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-[#e5e0d8]/80 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>
                As bonificações são liberadas automaticamente conforme o contrato do imóvel indicado
                é assinado e formalizado.
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Card Resumo de Indicações Realizadas */}
        <Card className="border-[#e5e0d8] shadow-sm bg-white flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#1a5d8f]/10 text-[#1a5d8f] flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#0f2a43]">
                  Minhas Oportunidades
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Total de contatos enviados
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-[#0f2a43]">
                {isLoading ? '...' : data.totalReferrals}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {data.totalReferrals === 1 ? 'indicação feita' : 'indicações feitas'}
              </span>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#e5e0d8] text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1a5d8f]" />
                  Em andamento / análise:
                </span>
                <span className="font-bold text-[#0f2a43]">
                  {isLoading ? '...' : data.inProgressCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Concluídas com sucesso:
                </span>
                <span className="font-bold text-[#0f2a43]">
                  {isLoading ? '...' : data.closedCount}
                </span>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#1a5d8f]/5 rounded-xl font-semibold mt-2"
            >
              <Link
                to="/indicador/nova-indicacao"
                className="flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Fazer nova indicação
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================== */}
      {/* 3. HISTÓRICO DAS INDICAÇÕES */}
      {/* ============================================================== */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-[#e5e0d8] pb-4 bg-gradient-to-b from-[#faf7f2]/50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-[#0f2a43] flex items-center gap-2">
                <span>Histórico de Indicações</span>
                {!isLoading && (
                  <Badge
                    variant="secondary"
                    className="bg-[#e5e0d8]/50 text-gray-700 font-semibold text-xs"
                  >
                    {data.referrals.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">
                Acompanhe o status atual e o prazo de primeiro contato de cada cliente indicado.
              </CardDescription>
            </div>

            {/* Barra de pesquisa simples */}
            <div className="w-full sm:w-64 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar pelo nome ou contato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
              />
            </div>
          </div>

          {/* Abas de filtro amigáveis */}
          <div className="pt-3">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as typeof activeTab)}
              className="w-full"
            >
              <TabsList className="bg-[#faf7f2] border border-[#e5e0d8] p-0.5 h-9 rounded-xl flex flex-wrap max-w-full overflow-x-auto justify-start">
                <TabsTrigger
                  value="all"
                  className="text-xs rounded-lg data-[state=active]:bg-[#1a5d8f] data-[state=active]:text-white data-[state=active]:shadow-xs px-3 py-1"
                >
                  Todas ({data.referrals.length})
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="text-xs rounded-lg data-[state=active]:bg-[#1a5d8f] data-[state=active]:text-white data-[state=active]:shadow-xs px-3 py-1"
                >
                  Aguardando análise
                </TabsTrigger>
                <TabsTrigger
                  value="in_progress"
                  className="text-xs rounded-lg data-[state=active]:bg-[#1a5d8f] data-[state=active]:text-white data-[state=active]:shadow-xs px-3 py-1"
                >
                  Em andamento
                </TabsTrigger>
                <TabsTrigger
                  value="closed"
                  className="text-xs rounded-lg data-[state=active]:bg-[#1a5d8f] data-[state=active]:text-white data-[state=active]:shadow-xs px-3 py-1"
                >
                  Concluídas
                </TabsTrigger>
                <TabsTrigger
                  value="paid"
                  className="text-xs rounded-lg data-[state=active]:bg-[#1a5d8f] data-[state=active]:text-white data-[state=active]:shadow-xs px-3 py-1"
                >
                  Bonificação paga
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Estado de Erro Amigável */}
          {errorMessage && (
            <div className="p-6 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#0f2a43]">
                Não foi possível carregar suas indicações
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">{errorMessage}</p>
              <Button
                type="button"
                onClick={() => void loadData(true)}
                className="bg-[#1a5d8f] hover:bg-[#144a72] text-white text-xs h-9 px-4 rounded-xl"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Estado de Carregamento com Skeleton e Spinner */}
          {isLoading && !errorMessage && (
            <div className="py-16 text-center space-y-4 px-4">
              <div className="w-10 h-10 border-3 border-[#1a5d8f] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500">Carregando suas indicações...</p>
              <div className="max-w-2xl mx-auto space-y-3 pt-2">
                <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            </div>
          )}

          {/* Estado Vazio Amigável: Sem nenhuma indicação criada ainda */}
          {!isLoading && !errorMessage && data.referrals.length === 0 && (
            <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#faf7f2] border-2 border-[#e5e0d8] flex items-center justify-center mx-auto text-[#1a5d8f] shadow-xs">
                <Sparkles className="w-8 h-8 text-[#d9995b]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#0f2a43]">Ainda não tens indicações</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Ganhe recompensas indicando compradores, inquilinos ou proprietários que queiram
                  vender ou alugar imóveis.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  asChild
                  className="bg-[#1a5d8f] hover:bg-[#154a73] text-white font-bold px-6 h-11 rounded-xl shadow"
                >
                  <Link to="/indicador/nova-indicacao" className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Fazer Minha Primeira Indicação
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Estado Vazio de Filtro ou Pesquisa */}
          {!isLoading && data.referrals.length > 0 && filteredReferrals.length === 0 && (
            <div className="py-12 px-4 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#0f2a43]">Nenhuma indicação encontrada</h4>
              <p className="text-xs text-gray-500">
                Não localizamos indicações com o filtro ou busca selecionada. Tente limpar os
                filtros.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setActiveTab('all')
                }}
                className="border-[#e5e0d8] text-gray-700 rounded-xl"
              >
                Limpar filtros
              </Button>
            </div>
          )}

          {/* Listagem das Indicações */}
          {!isLoading && filteredReferrals.length > 0 && (
            <div className="divide-y divide-[#e5e0d8]">
              {filteredReferrals.map((referral) => {
                const statusCfg = getStatusConfig(referral.status)
                const typeInfo = getPropertyTypeLabel(referral.property_type)
                const slaInfo = formatSlaNotice(referral.sla_deadline, referral.status)
                const StatusIcon = statusCfg.icon
                const TypeIcon = typeInfo.icon

                // Busca se há bônus vinculado a esta indicação
                const linkedBonus = data.bonuses.find((b) => b.referral_id === referral.id)

                return (
                  <div
                    key={referral.id}
                    className="p-4 sm:p-5 hover:bg-[#faf7f2]/60 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    {/* Lado Esquerdo: Dados Principais do Cliente e Tipo */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base sm:text-lg text-[#0f2a43] truncate">
                          {referral.client_name}
                        </span>

                        {/* Badge de Tipo de Imóvel */}
                        <Badge
                          variant="outline"
                          className="bg-white text-gray-700 border-[#e5e0d8] text-xs font-medium inline-flex items-center gap-1 shrink-0"
                        >
                          <TypeIcon className="w-3 h-3 text-[#1a5d8f]" />
                          <span>{typeInfo.label}</span>
                        </Badge>

                        {/* Badge do Status em Rótulo Leigo */}
                        <Badge
                          className={`${statusCfg.badgeClass} text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shrink-0 border`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusCfg.label}</span>
                        </Badge>
                      </div>

                      {/* Informações complementares: Contato, Data e Descrição */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        {referral.client_phone && (
                          <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {formatPhone(referral.client_phone)}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          Enviado em {formatDateTime(referral.created)}
                        </span>
                      </div>

                      {/* Descrição resumida da indicação (se houver) */}
                      {referral.property_description && (
                        <p className="text-xs text-gray-600 line-clamp-2 italic pt-0.5 max-w-2xl">
                          "{referral.property_description}"
                        </p>
                      )}

                      {/* Aviso de Prazo de Contato (SLA 3 horas) em linguagem simples */}
                      {slaInfo && (
                        <div className="pt-1">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              slaInfo.isPast
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : 'bg-blue-50 text-[#1a5d8f] border border-blue-200'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{slaInfo.text}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lado Direito: Bônus desta indicação ou status explicativo */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-[#e5e0d8] shrink-0">
                      {linkedBonus ? (
                        <div className="text-right">
                          <span className="text-[11px] text-gray-500 block uppercase font-medium">
                            Bonificação
                          </span>
                          <span className="text-base sm:text-lg font-bold text-emerald-600">
                            {formatCurrency(linkedBonus.amount)}
                          </span>
                          <span className="text-[10px] text-gray-500 block">
                            {linkedBonus.status === 'paid'
                              ? 'Valor pago no PIX'
                              : linkedBonus.status === 'approved'
                                ? 'Aprovado para pagamento'
                                : 'Em processamento'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-left md:text-right">
                          <span className="text-[11px] text-gray-400 block font-medium">
                            Status do atendimento
                          </span>
                          <span className="text-xs text-gray-600">{statusCfg.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* 4. GUIA SIMPLES: COMO FUNCIONA O PROGRAMA INDICA GABRIEL */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-2xl bg-white border border-[#e5e0d8] shadow-2xs space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-[#1a5d8f]/10 text-[#1a5d8f] flex items-center justify-center font-bold text-xs mb-1">
            1
          </div>
          <h4 className="text-sm font-bold text-[#0f2a43]">Indicação Fácil</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Grave um áudio de poucos segundos ou informe o nome e WhatsApp do cliente que quer
            comprar, alugar ou vender.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e5e0d8] shadow-2xs space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-[#d9995b]/10 text-[#c48548] flex items-center justify-center font-bold text-xs mb-1">
            2
          </div>
          <h4 className="text-sm font-bold text-[#0f2a43]">Atendimento Ágil</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            Nossos corretores entram em contato com seu indicado em até 3 horas com foco total e
            atendimento personalizado.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e5e0d8] shadow-2xs space-y-1.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-xs mb-1">
            3
          </div>
          <h4 className="text-sm font-bold text-[#0f2a43]">PIX na sua Conta</h4>
          <p className="text-xs text-gray-500 leading-relaxed">
            A cada negócio concluído, sua bonificação é depositada diretamente na sua chave PIX
            cadastrada.
          </p>
        </div>
      </div>
    </div>
  )
}
