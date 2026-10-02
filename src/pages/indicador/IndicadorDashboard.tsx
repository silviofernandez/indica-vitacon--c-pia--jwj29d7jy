import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusCircle,
  Building2,
  Home,
  CheckCircle2,
  DollarSign,
  Send,
  AlertCircle,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Check,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import {
  listIndicatorReferrals,
  getLoggedInIndicator,
  type ReferralRecord,
} from '@/services/referrals'
import { formatPhone } from '@/services/indicators'
import {
  getConfigRecompensa,
  calculateReward,
  getEstagioMeta,
  ESTAGIOS_VITACON,
  type ConfigRecompensaRecord,
} from '@/services/vitacon'

export interface StatusConfig {
  label: string
  description: string
  badgeClass: string
  icon: React.ComponentType<{ className?: string }>
  dotClass: string
}

export function getStatusConfig(status?: string): StatusConfig {
  const s = (status || '').toLowerCase().trim()
  if (s === 'closed_won' || s === 'closed' || s === 'fechamento') {
    return {
      label: 'Compra Fechada',
      description: 'Negócio fechado e contrato assinado na Vitacon!',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dotClass: 'bg-emerald-500',
      icon: CheckCircle2,
    }
  }
  return {
    label: 'Em Negociação',
    description: 'Atendimento comercial ativo com o cliente.',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    dotClass: 'bg-blue-500',
    icon: TrendingUp,
  }
}

export function getPropertyTypeLabel(type?: string): {
  label: string
  icon: React.ComponentType<{ className?: string }>
} {
  return { label: 'Vitacon SP', icon: Sparkles }
}

export function formatCurrency(value?: number): string {
  const val = Number(value) || 0
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export function formatSlaNotice(
  slaDeadline?: string,
  status?: string,
): { text: string; isPast: boolean } | null {
  return null
}

export default function IndicadorDashboard() {
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Dados do indicador logado (inclui unidade adquirida pelo indicador)
  const [indicatorProfile, setIndicatorProfile] = useState<{
    id: string
    full_name?: string
    autorizado?: boolean
    unidade_descricao?: string
    unidade_comprada_id?: string
    expand?: {
      empreendimento_id?: { nome: string }
      unidade_comprada_id?: { identificacao: string; torre?: string; valor?: number }
    }
  } | null>(null)

  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [rewardConfig, setRewardConfig] = useState<ConfigRecompensaRecord>({
    id: '',
    tipo: 'percentual',
    valor: 1,
    descricao: '1% de comissão padrão Vitacon',
    ativo: true,
  })

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'andamento' | 'fechamento'>('all')

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true)
      else setIsLoading(true)

      try {
        setErrorMessage(null)
        const [config, ind] = await Promise.all([
          getConfigRecompensa(),
          user?.id ? getLoggedInIndicator(user.id) : null,
        ])

        setRewardConfig(config)
        setIndicatorProfile(ind)

        if (ind?.id) {
          const refs = await listIndicatorReferrals(ind.id)
          setReferrals(refs)
        } else {
          setReferrals([])
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do indicador Vitacon:', err)
        setErrorMessage(
          'Não foi possível carregar os dados. Verifique a conexão e tente novamente.',
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

  // Métricas calculadas
  const metrics = useMemo(() => {
    let fechadas = 0
    let andamento = 0
    let totalComissaoRecebida = 0
    let totalComissaoEstimada = 0

    referrals.forEach((r) => {
      const isFechado =
        r.estagio === 'fechamento' || r.status === 'closed_won' || r.status === 'closed'
      const valorCompra = Number(r.valor_compra || r.deal_value || r.expected_value || 0)
      const comissao =
        r.comissao_calculada !== undefined &&
        r.comissao_calculada !== null &&
        r.comissao_calculada > 0
          ? Number(r.comissao_calculada)
          : calculateReward(valorCompra, rewardConfig)

      if (isFechado) {
        fechadas++
        totalComissaoRecebida += comissao
      } else {
        andamento++
        totalComissaoEstimada += comissao
      }
    })

    return {
      total: referrals.length,
      fechadas,
      andamento,
      totalComissaoRecebida,
      totalComissaoEstimada,
      totalGeral: totalComissaoRecebida + totalComissaoEstimada,
    }
  }, [referrals, rewardConfig])

  // Filtragem
  const filteredReferrals = useMemo(() => {
    let list = referrals

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((r) => {
        const name = (r.client_name || '').toLowerCase()
        const phone = (r.client_phone || '').toLowerCase()
        const emp = (r.expand?.empreendimento_id?.nome || '').toLowerCase()
        const uni = (r.expand?.unidade_escolhida_id?.identificacao || '').toLowerCase()
        return name.includes(q) || phone.includes(q) || emp.includes(q) || uni.includes(q)
      })
    }

    if (activeTab === 'andamento') {
      list = list.filter(
        (r) => r.estagio !== 'fechamento' && r.status !== 'closed_won' && r.status !== 'closed',
      )
    } else if (activeTab === 'fechamento') {
      list = list.filter(
        (r) => r.estagio === 'fechamento' || r.status === 'closed_won' || r.status === 'closed',
      )
    }

    return list
  }, [referrals, searchQuery, activeTab])

  const firstName = user?.name ? user.name.split(' ')[0] : 'Indicador Vitacon'

  return (
    <div className="space-y-6 pb-14">
      {/* 1. TOPO: SAUDAÇÃO E UNIDADE COMPRADA DO INDICADOR */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative overflow-hidden">
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 backdrop-blur-sm text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Programa de Indicação Vitacon
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Olá, {firstName}!</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Acompanhe o estágio de cada indicação, as unidades escolhidas e os valores que você
            receberá por cada fechamento.
          </p>

          {/* Destaque da Unidade Comprada pelo Cliente Indicador */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Sua Unidade Vitacon Adquirida:</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              <KeyRound className="w-3.5 h-3.5" />
              <span>
                {indicatorProfile?.expand?.empreendimento_id?.nome || 'Vitacon'} •{' '}
                {indicatorProfile?.expand?.unidade_comprada_id?.identificacao ||
                  indicatorProfile?.unidade_descricao ||
                  'Unidade confirmada'}
              </span>
            </div>
            {indicatorProfile?.autorizado ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Autorizado a indicar
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                <Clock className="w-3.5 h-3.5" /> Aguardando autorização
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 z-10">
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 h-11 rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <Link to="/indicador/nova-indicacao" className="flex items-center justify-center gap-2">
              <PlusCircle className="w-5 h-5" />
              <span>Nova Indicação</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. CARDS RESUMO: RECOMPENSA E STATUS GERAIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Comissões e Recompensa */}
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40 rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Comissões e Valores
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Regra vigente:{' '}
                    <strong>
                      {rewardConfig.tipo === 'percentual'
                        ? `${rewardConfig.valor}% sobre a compra`
                        : formatCurrency(rewardConfig.valor)}
                    </strong>
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">
                Total a Receber / Recebido
              </span>
              <div className="text-3xl font-extrabold text-emerald-700 mt-0.5">
                {isLoading ? '...' : formatCurrency(metrics.totalGeral)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Fechadas (Garantidas):</span>
                <span className="font-bold text-emerald-700 text-sm">
                  {isLoading ? '...' : formatCurrency(metrics.totalComissaoRecebida)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Em andamento (Estimadas):</span>
                <span className="font-bold text-blue-700 text-sm">
                  {isLoading ? '...' : formatCurrency(metrics.totalComissaoEstimada)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Contatos Indicados */}
        <Card className="border-slate-200 shadow-sm bg-white rounded-2xl flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Indicações Realizadas
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Total de compradores indicados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-slate-900">
                {isLoading ? '...' : metrics.total}
              </span>
              <span className="text-xs text-slate-500 font-medium">amigos indicados</span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Em andamento / negociação:</span>
                <strong className="text-blue-700">{metrics.andamento}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Compras fechadas:</span>
                <strong className="text-emerald-700">{metrics.fechadas}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Como funciona a Remuneração */}
        <Card className="border-slate-200 shadow-sm bg-slate-50/70 rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Transparência de Recompensa
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Definida pelo painel administrativo
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-2 pt-2">
            <p>
              • Sua comissão é aplicada sobre o <strong>valor da compra da unidade Vitacon</strong>{' '}
              escolhida pelo seu indicado.
            </p>
            <p>
              • Você acompanha cada passo do cliente desde o primeiro contato até a assinatura
              formal da proposta.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. LISTA E DETALHE DE CADA INDICAÇÃO COM LINHA DO TEMPO DOS 6 ESTÁGIOS */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-100 pb-4 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Controle das Minhas Indicações</span>
                <Badge
                  variant="secondary"
                  className="bg-slate-200/80 text-slate-800 text-xs font-bold"
                >
                  {referrals.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Linha do tempo dos estágios (Reunião → Gostou → Pensar → Proposta → Fechamento),
                unidade escolhida e comissão.
              </CardDescription>
            </div>

            <div className="w-full sm:w-64 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar cliente, empreendimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200 focus-visible:ring-emerald-600"
              />
            </div>
          </div>

          <div className="pt-3">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as typeof activeTab)}
              className="w-full"
            >
              <TabsList className="bg-slate-100 border border-slate-200 p-0.5 h-9 rounded-xl flex">
                <TabsTrigger
                  value="all"
                  className="text-xs rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-semibold"
                >
                  Todas ({referrals.length})
                </TabsTrigger>
                <TabsTrigger
                  value="andamento"
                  className="text-xs rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-semibold"
                >
                  Em Andamento ({metrics.andamento})
                </TabsTrigger>
                <TabsTrigger
                  value="fechamento"
                  className="text-xs rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-semibold"
                >
                  Fechadas ({metrics.fechadas})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {errorMessage && (
            <div className="p-6 text-center max-w-md mx-auto space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <p className="text-xs text-slate-600">{errorMessage}</p>
              <Button
                type="button"
                onClick={() => void loadData(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 rounded-xl"
              >
                Tentar novamente
              </Button>
            </div>
          )}

          {isLoading && !errorMessage && (
            <div className="py-16 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500">Carregando suas indicações Vitacon...</p>
            </div>
          )}

          {!isLoading && !errorMessage && referrals.length === 0 && (
            <div className="py-16 px-4 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Nenhuma indicação cadastrada</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Você está autorizado a indicar compradores para a Vitacon. Cadastre sua primeira
                  indicação e acompanhe todas as etapas.
                </p>
              </div>
              <Button
                asChild
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 h-11 rounded-xl shadow"
              >
                <Link to="/indicador/nova-indicacao" className="flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Cadastrar Primeira Indicação
                </Link>
              </Button>
            </div>
          )}

          {!isLoading && referrals.length > 0 && filteredReferrals.length === 0 && (
            <div className="py-12 px-4 text-center max-w-md mx-auto space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                Nenhum resultado para os filtros atuais.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setActiveTab('all')
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}

          {!isLoading && filteredReferrals.length > 0 && (
            <div className="divide-y divide-slate-100">
              {filteredReferrals.map((r) => {
                const estagioAtual = getEstagioMeta(r.estagio)
                const valorCompra = Number(
                  r.valor_compra ||
                    r.deal_value ||
                    r.expected_value ||
                    r.expand?.unidade_escolhida_id?.valor ||
                    0,
                )
                const comissao =
                  r.comissao_calculada !== undefined &&
                  r.comissao_calculada !== null &&
                  r.comissao_calculada > 0
                    ? Number(r.comissao_calculada)
                    : calculateReward(valorCompra, rewardConfig)

                const isFechado =
                  r.estagio === 'fechamento' || r.status === 'closed_won' || r.status === 'closed'

                const empreendimentoNome =
                  r.expand?.empreendimento_id?.nome || 'Empreendimento em definição'
                const unidadeIdent =
                  r.expand?.unidade_escolhida_id?.identificacao ||
                  (r.expand?.empreendimento_id ? 'Unidade em escolha' : 'A definir na visita')

                return (
                  <div
                    key={r.id}
                    className="p-5 sm:p-6 hover:bg-slate-50/80 transition-colors space-y-4"
                  >
                    {/* Linha 1: Nome do Indicado, Status e Comissão */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-base sm:text-lg text-slate-900">
                            {r.client_name}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${estagioAtual.badgeColor}`}
                          >
                            Estágio: {estagioAtual.label}
                          </span>
                        </div>

                        {/* Contato do indicado */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          {r.client_phone && (
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {formatPhone(r.client_phone)}
                            </span>
                          )}
                          {r.client_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {r.client_email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Cadastrado em {formatDateTime(r.created)}
                          </span>
                        </div>
                      </div>

                      {/* Caixa de Comissão para o Indicador */}
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 text-right shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                          {isFechado ? 'Sua Comissão Fechada' : 'Comissão Estimada'}
                        </span>
                        <div className="text-lg sm:text-xl font-black text-emerald-800">
                          {formatCurrency(comissao)}
                        </div>
                        <span className="text-[10px] text-emerald-700 block">
                          {r.comissao_regra_aplicada ||
                            (rewardConfig.tipo === 'percentual'
                              ? `${rewardConfig.valor}% sobre o valor`
                              : 'Valor fixo configurado')}
                        </span>
                      </div>
                    </div>

                    {/* Linha 2: Empreendimento e Unidade Escolhidos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Empreendimento Escolhido
                          </span>
                          <span className="font-semibold text-slate-800">{empreendimentoNome}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Unidade Escolhida / Comprada
                          </span>
                          <span className="font-semibold text-slate-800">
                            {unidadeIdent}
                            {valorCompra > 0 ? ` • ${formatCurrency(valorCompra)}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Linha 3: LINHA DO TEMPO DOS 6 ESTÁGIOS DA NEGOCIAÇÃO */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Evolução da Negociação com a Vitacon
                        </span>
                        <span className="text-xs text-slate-600 font-medium">
                          Etapa {estagioAtual.step} de 6: <strong>{estagioAtual.label}</strong>
                        </span>
                      </div>

                      {/* Timeline em Steps */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                        {ESTAGIOS_VITACON.map((stepMeta) => {
                          const isCompleted = estagioAtual.step > stepMeta.step
                          const isCurrent = estagioAtual.step === stepMeta.step

                          return (
                            <div
                              key={stepMeta.key}
                              className={`p-2 rounded-xl border text-center transition-all ${
                                isCompleted
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                  : isCurrent
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-200'
                                    : 'bg-white border-slate-200 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-center mb-1">
                                {isCompleted ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                                ) : (
                                  <span
                                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                                      isCurrent
                                        ? 'bg-white text-emerald-700'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {stepMeta.step}
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-[11px] font-bold truncate ${
                                  isCurrent ? 'text-white' : ''
                                }`}
                                title={stepMeta.label}
                              >
                                {stepMeta.label}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2 italic">
                        * O estágio da negociação é atualizado pela equipe comercial e
                        administrativa da Vitacon conforme o cliente avança.
                      </p>
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
