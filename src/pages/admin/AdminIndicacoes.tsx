import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Users,
  Building2,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  Home,
  Sparkles,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Check,
  Edit2,
  Save,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { listAllReferrals, updateVitaconReferral, type ReferralRecord } from '@/services/referrals'
import { formatPhone } from '@/services/indicators'
import {
  listEmpreendimentos,
  listUnidades,
  getConfigRecompensa,
  calculateReward,
  getEstagioMeta,
  ESTAGIOS_VITACON,
  type EmpreendimentoRecord,
  type UnidadeRecord,
  type ConfigRecompensaRecord,
  type EstagioVitacon,
} from '@/services/vitacon'
import { formatCurrency, formatDateTime } from '@/pages/indicador/IndicadorDashboard'

export default function AdminIndicacoes() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [rewardConfig, setRewardConfig] = useState<ConfigRecompensaRecord>({
    id: '',
    tipo: 'percentual',
    valor: 1,
    descricao: '1% Vitacon',
    ativo: true,
  })

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [estagioFilter, setEstagioFilter] = useState<string>('all')

  // Modal de Atualização da Negociação Vitacon
  const [editingRef, setEditingRef] = useState<ReferralRecord | null>(null)
  const [modalEstagio, setModalEstagio] = useState<EstagioVitacon>('lead_enviado')
  const [modalEmpId, setModalEmpId] = useState<string>('')
  const [modalUniId, setModalUniId] = useState<string>('')
  const [modalValorCompra, setModalValorCompra] = useState<string>('')
  const [modalNotes, setModalNotes] = useState<string>('')
  const [savingRef, setSavingRef] = useState(false)

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const [refRes, emps, unis, cfg] = await Promise.all([
        listAllReferrals({ perPage: 500 }),
        listEmpreendimentos(false),
        listUnidades(),
        getConfigRecompensa(),
      ])

      setReferrals(refRes.items)
      setEmpreendimentos(emps)
      setUnidades(unis)
      setRewardConfig(cfg)
    } catch (err) {
      console.warn('Erro ao carregar dados:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Filtragem
  const filteredReferrals = useMemo(() => {
    let list = referrals

    if (estagioFilter !== 'all') {
      list = list.filter((r) => {
        const est = (r.estagio || 'lead_enviado').toLowerCase()
        return est === estagioFilter
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((r) => {
        const name = (r.client_name || '').toLowerCase()
        const phone = (r.client_phone || '').toLowerCase()
        const indName = (r.expand?.indicator_id?.full_name || '').toLowerCase()
        const empName = (r.expand?.empreendimento_id?.nome || '').toLowerCase()
        return name.includes(q) || phone.includes(q) || indName.includes(q) || empName.includes(q)
      })
    }

    return list
  }, [referrals, estagioFilter, searchQuery])

  // Abrir Modal de Edição da Indicação
  const handleOpenEdit = (ref: ReferralRecord) => {
    setEditingRef(ref)
    setModalEstagio((ref.estagio as EstagioVitacon) || 'lead_enviado')
    setModalEmpId(ref.empreendimento_id || '')
    setModalUniId(ref.unidade_escolhida_id || '')
    setModalValorCompra(
      ref.valor_compra ? String(ref.valor_compra) : ref.deal_value ? String(ref.deal_value) : '',
    )
    setModalNotes(ref.notes || '')
  }

  // Salvar Atualização
  const handleSaveReferral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRef) return

    setSavingRef(true)
    const valorCompraNum = modalValorCompra ? parseFloat(modalValorCompra.replace(',', '.')) : 0

    // Calcula comissão conforme regra vigente no momento
    const comissaoCalc = calculateReward(valorCompraNum, rewardConfig)
    const regraTexto =
      rewardConfig.tipo === 'percentual'
        ? `${rewardConfig.valor}% sobre o valor da compra`
        : `${formatCurrency(rewardConfig.valor)} fixos`

    const res = await updateVitaconReferral({
      referral_id: editingRef.id,
      estagio: modalEstagio,
      empreendimento_id: modalEmpId || undefined,
      unidade_escolhida_id: modalUniId || undefined,
      valor_compra: valorCompraNum > 0 ? valorCompraNum : undefined,
      comissao_calculada: comissaoCalc,
      comissao_regra_aplicada: regraTexto,
      notes: modalNotes,
    })

    setSavingRef(false)
    if (res.success) {
      setEditingRef(null)
      void loadData(true)
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* 1. CABEÇALHO */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 backdrop-blur-sm text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Gestão Operacional de Negociações Vitacon
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Indicações e Negociações
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Consulte nome e contato do indicado, avance o estágio da negociação (Reunião realizada →
            Gostou → Pensar → Proposta → Fechamento), registre a unidade comprada e calcule a
            comissão.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void loadData(true)}
          disabled={isRefreshing || isLoading}
          className="border-white/20 text-white hover:bg-white/10 bg-white/5 h-10 px-4 rounded-xl text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* 2. BARRA DE BUSCA E FILTROS */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar cliente indicado, telefone, indicador ou empreendimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl border-slate-200 focus-visible:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={estagioFilter}
                onChange={(e) => setEstagioFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 font-semibold"
              >
                <option value="all">Todos os Estágios</option>
                {ESTAGIOS_VITACON.map((e) => (
                  <option key={e.key} value={e.key}>
                    {e.step}. {e.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. LISTA DE INDICAÇÕES */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 py-4 px-6 bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Indicações ({filteredReferrals.length})
          </CardTitle>
          <span className="text-xs text-slate-500">
            Regra Vigente:{' '}
            <strong>
              {rewardConfig.tipo === 'percentual'
                ? `${rewardConfig.valor}%`
                : formatCurrency(rewardConfig.valor)}
            </strong>
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500 text-sm">Carregando indicações...</div>
          ) : filteredReferrals.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Nenhuma indicação encontrada.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReferrals.map((r) => {
                const estagio = getEstagioMeta(r.estagio)
                const valorCompra = Number(
                  r.valor_compra || r.deal_value || r.expand?.unidade_escolhida_id?.valor || 0,
                )
                const comissao =
                  r.comissao_calculada !== undefined &&
                  r.comissao_calculada !== null &&
                  r.comissao_calculada > 0
                    ? Number(r.comissao_calculada)
                    : calculateReward(valorCompra, rewardConfig)

                const empNome = r.expand?.empreendimento_id?.nome || 'A definir'
                const uniNome = r.expand?.unidade_escolhida_id?.identificacao || 'Em escolha'
                const indicatorName = r.expand?.indicator_id?.full_name || 'Cliente Indicador'

                return (
                  <div
                    key={r.id}
                    className="p-5 sm:p-6 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      {/* Linha 1: Nome do Indicado e Estágio */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-base sm:text-lg text-slate-900">
                          {r.client_name}
                        </span>
                        <Badge className={`text-xs font-bold border ${estagio.badgeColor}`}>
                          {estagio.step}/6: {estagio.label}
                        </Badge>
                      </div>

                      {/* Linha 2: Contato e Indicador */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        {r.client_phone && (
                          <span className="flex items-center gap-1 font-semibold text-slate-900">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            {formatPhone(r.client_phone)}
                          </span>
                        )}
                        {r.client_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {r.client_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-700">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Indicado por: <strong>{indicatorName}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateTime(r.created)}
                        </span>
                      </div>

                      {/* Linha 3: Empreendimento e Unidade Escolhida */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 pt-1">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          Empreendimento: <strong>{empNome}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="w-3.5 h-3.5 text-emerald-600" />
                          Unidade Escolhida: <strong>{uniNome}</strong>
                        </span>
                        {valorCompra > 0 && (
                          <span className="flex items-center gap-1 font-semibold text-slate-900">
                            Valor: {formatCurrency(valorCompra)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lado Direito: Comissão Calculada e Botão de Ação */}
                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-right">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                          Comissão Calculada
                        </span>
                        <div className="text-base sm:text-lg font-black text-emerald-800">
                          {formatCurrency(comissao)}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleOpenEdit(r)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Atualizar Estágio
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL PARA AVANÇAR ESTÁGIO DA NEGOCIAÇÃO E REGISTRAR UNIDADE COMPRADA */}
      <Dialog open={!!editingRef} onOpenChange={(open) => !open && setEditingRef(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atualizar Estágio da Negociação Vitacon</DialogTitle>
            <DialogDescription>
              Avance o funil de compra, registre a unidade escolhida e confirme o valor de compra
              para a comissão.
            </DialogDescription>
          </DialogHeader>

          {editingRef && (
            <form onSubmit={handleSaveReferral} className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <p>
                  <strong>Cliente Indicado:</strong> {editingRef.client_name}
                </p>
                <p>
                  <strong>Contato:</strong> {editingRef.client_phone}{' '}
                  {editingRef.client_email ? `• ${editingRef.client_email}` : ''}
                </p>
                <p>
                  <strong>Indicador:</strong>{' '}
                  {editingRef.expand?.indicator_id?.full_name || 'Cliente Vitacon'}
                </p>
              </div>

              {/* SELEÇÃO DO ESTÁGIO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Estágio da Negociação (Visível para o Indicador) *
                </label>
                <select
                  value={modalEstagio}
                  onChange={(e) => setModalEstagio(e.target.value as EstagioVitacon)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:ring-emerald-600"
                  required
                >
                  {ESTAGIOS_VITACON.map((step) => (
                    <option key={step.key} value={step.key}>
                      Etapa {step.step}: {step.label} — {step.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* EMPREENDIMENTO E UNIDADE ESCOLHIDA PELO INDICADO */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                  Unidade Escolhida / Comprada pelo Indicado
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Empreendimento
                    </label>
                    <select
                      value={modalEmpId}
                      onChange={(e) => {
                        setModalEmpId(e.target.value)
                        setModalUniId('')
                      }}
                      className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">Selecione o empreendimento...</option>
                      {empreendimentos.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Unidade Específica
                    </label>
                    <select
                      value={modalUniId}
                      onChange={(e) => {
                        setModalUniId(e.target.value)
                        const uni = unidades.find((u) => u.id === e.target.value)
                        if (uni?.valor && !modalValorCompra) {
                          setModalValorCompra(String(uni.valor))
                        }
                      }}
                      disabled={!modalEmpId}
                      className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white disabled:opacity-50"
                    >
                      <option value="">
                        {modalEmpId ? 'Selecione a unidade...' : 'Escolha o empreendimento'}
                      </option>
                      {unidades
                        .filter((u) => u.empreendimento_id === modalEmpId)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.identificacao}{' '}
                            {u.valor ? `(R$ ${u.valor.toLocaleString('pt-BR')})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Valor da Compra da Unidade (R$)
                  </label>
                  <Input
                    type="number"
                    value={modalValorCompra}
                    onChange={(e) => setModalValorCompra(e.target.value)}
                    placeholder="Ex.: 490000"
                    className="h-10 text-sm font-bold border-slate-200 bg-white"
                  />
                  <span className="text-[11px] text-slate-500">
                    A comissão é calculada sobre este valor conforme a regra ativa no momento do
                    fechamento.
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Observações Internas</label>
                <Input
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Ex.: Reunião realizada com corretor da Vitacon. Proposta enviada para o 12º andar."
                  className="h-10 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingRef(null)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingRef}
                  className="bg-emerald-600 text-white font-bold"
                >
                  {savingRef ? 'Salvando...' : 'Salvar e Notificar Indicador'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
