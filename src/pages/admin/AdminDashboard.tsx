import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Send,
  Home,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { listAllReferrals, type ReferralRecord } from '@/services/referrals'
import { listIndicators, type IndicatorRecord } from '@/services/indicators'
import {
  listEmpreendimentos,
  listUnidades,
  getConfigRecompensa,
  calculateReward,
  getEstagioMeta,
  ESTAGIOS_VITACON,
  type ConfigRecompensaRecord,
} from '@/services/vitacon'
import { formatCurrency, formatDateTime } from '@/pages/indicador/IndicadorDashboard'
import { formatPhone } from '@/services/indicators'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [indicators, setIndicators] = useState<IndicatorRecord[]>([])
  const [rewardConfig, setRewardConfig] = useState<ConfigRecompensaRecord>({
    id: '',
    tipo: 'percentual',
    valor: 1,
    descricao: '1% Vitacon',
    ativo: true,
  })

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const [refRes, indList, cfg] = await Promise.all([
        listAllReferrals({ perPage: 500 }),
        listIndicators(),
        getConfigRecompensa(),
      ])

      setReferrals(refRes.items)
      setIndicators(indList)
      setRewardConfig(cfg)
    } catch (err) {
      console.warn('Erro ao carregar métricas:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Métricas do Painel Master
  const metrics = useMemo(() => {
    const totalIndicadores = indicators.length
    const autorizados = indicators.filter(
      (i) => i.autorizado !== false && i.approved !== false,
    ).length

    let fechamentos = 0
    let emAndamento = 0
    let totalComissoesGarantidas = 0
    let totalComissoesEstimadas = 0

    // Contagem por estágio
    const estagioCounts: Record<string, number> = {
      lead_enviado: 0,
      reuniao_realizada: 0,
      gostou: 0,
      ficou_de_pensar: 0,
      proposta: 0,
      fechamento: 0,
    }

    referrals.forEach((r) => {
      const est = (r.estagio || 'lead_enviado').toLowerCase()
      if (estagioCounts[est] !== undefined) {
        estagioCounts[est]++
      } else {
        estagioCounts.lead_enviado++
      }

      const isFechado = est === 'fechamento' || r.status === 'closed_won' || r.status === 'closed'
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

      if (isFechado) {
        fechamentos++
        totalComissoesGarantidas += comissao
      } else {
        emAndamento++
        totalComissoesEstimadas += comissao
      }
    })

    return {
      totalIndicadores,
      autorizados,
      totalIndicacoes: referrals.length,
      fechamentos,
      emAndamento,
      totalComissoesGarantidas,
      totalComissoesEstimadas,
      estagioCounts,
    }
  }, [indicators, referrals, rewardConfig])

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* 1. HERO MASTER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 backdrop-blur-sm text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Painel Master Vitacon
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Programa de Indicação Vitacon
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Visão geral de clientes autorizados, indicações em andamento por estágio, fechamentos e
            controle de comissões.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData(true)}
            disabled={isRefreshing || isLoading}
            className="border-white/20 text-white hover:bg-white/10 bg-white/5 h-10 px-3.5 rounded-xl text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            asChild
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-xl text-xs shadow"
          >
            <Link to="/admin/vitacon">
              <Sliders className="w-4 h-4 mr-1.5" />
              Configurar Recompensa
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. CARDS RESUMO EXECUTIVO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Indicadores Autorizados */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Clientes Indicadores
              </CardDescription>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl font-extrabold text-slate-900 mt-1">
              {isLoading ? '...' : metrics.totalIndicadores}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-700 font-semibold">
              {metrics.autorizados} clientes autorizados com unidade
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Indicações */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Indicações Recebidas
              </CardDescription>
              <Send className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle className="text-3xl font-extrabold text-slate-900 mt-1">
              {isLoading ? '...' : metrics.totalIndicacoes}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 font-medium">
              {metrics.emAndamento} em atendimento comercial
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Fechamentos Vitacon */}
        <Card className="border-slate-200 bg-emerald-50/40 shadow-sm rounded-2xl border-emerald-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Fechamentos Concluídos
              </CardDescription>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl font-extrabold text-emerald-800 mt-1">
              {isLoading ? '...' : metrics.fechamentos}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-700 font-semibold">
              Unidades Vitacon vendidas via indicação
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Comissões Fechadas */}
        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Comissões Fechadas
              </CardDescription>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-slate-900 mt-1">
              {isLoading ? '...' : formatCurrency(metrics.totalComissoesGarantidas)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">
              Estimadas em aberto: {formatCurrency(metrics.totalComissoesEstimadas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. VISÃO DO FUNIL POR ESTÁGIO (Os 6 Estágios) */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 py-4 px-6 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Distribuição por Estágio da Negociação
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Acompanhamento das 6 etapas exigidas no fluxo Vitacon
              </CardDescription>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs h-8 rounded-lg self-start sm:self-auto"
            >
              <Link to="/admin/indicacoes">Gerenciar Indicações</Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {ESTAGIOS_VITACON.map((step) => {
              const count = metrics.estagioCounts[step.key] || 0
              return (
                <div
                  key={step.key}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/60 transition-colors space-y-1.5"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Etapa {step.step}
                  </span>
                  <div className="text-sm font-extrabold text-slate-900">{step.label}</div>
                  <div className="text-2xl font-black text-emerald-700">{count}</div>
                  <p className="text-[10px] text-slate-500 leading-tight">{step.description}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4. ATALHOS RÁPIDOS E ÚLTIMAS INDICAÇÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: Últimas Indicações com Estágio e Unidade */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900">
              Últimas Indicações Registradas
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs text-emerald-700">
              <Link to="/admin/indicacoes" className="flex items-center gap-1">
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {referrals.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhuma indicação cadastrada no momento.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {referrals.slice(0, 5).map((r) => {
                  const est = getEstagioMeta(r.estagio)
                  const empNome = r.expand?.empreendimento_id?.nome || 'Vitacon'
                  const uniNome = r.expand?.unidade_escolhida_id?.identificacao || 'Em escolha'

                  return (
                    <div
                      key={r.id}
                      onClick={() => navigate('/admin/indicacoes')}
                      className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{r.client_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${est.badgeColor}`}
                          >
                            {est.label}
                          </span>
                        </div>
                        <p className="text-slate-500">
                          {empNome} • {uniNome} • Indicado por{' '}
                          {r.expand?.indicator_id?.full_name || 'Cliente'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-semibold text-slate-800">
                          {r.client_phone ? formatPhone(r.client_phone) : '-'}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {formatDateTime(r.created)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 3: Regra Vigente e Links Rápidos Master */}
        <div className="space-y-4">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Regra de Recompensa Ativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-3 bg-white rounded-xl border border-emerald-200">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Modo</span>
                <span className="text-lg font-black text-slate-900">
                  {rewardConfig.tipo === 'percentual'
                    ? `${rewardConfig.valor}% sobre o valor da compra`
                    : formatCurrency(rewardConfig.valor)}
                </span>
                <p className="text-slate-500 text-[11px] mt-1">{rewardConfig.descricao}</p>
              </div>

              <Button
                asChild
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9"
              >
                <Link to="/admin/vitacon">Alterar Percentual ou Valor Fixo</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ações Administrativas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Link
                to="/admin/indicadores"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 font-semibold text-slate-800"
              >
                <span>Cadastrar Cliente com Unidade</span>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </Link>
              <Link
                to="/admin/vitacon"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 font-semibold text-slate-800"
              >
                <span>Cadastrar Empreendimentos e Unidades</span>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
