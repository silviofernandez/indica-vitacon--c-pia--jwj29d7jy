import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Sparkles,
  Building2,
  Home,
  DollarSign,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  Phone,
  Mail,
  User,
  Plus,
  Edit2,
  Trash2,
  Save,
  Check,
  Percent,
  Sliders,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  listEmpreendimentos,
  createEmpreendimento,
  updateEmpreendimento,
  deleteEmpreendimento,
  listUnidades,
  createUnidade,
  updateUnidade,
  deleteUnidade,
  getConfigRecompensa,
  saveConfigRecompensa,
  type EmpreendimentoRecord,
  type UnidadeRecord,
  type ConfigRecompensaRecord,
  type TipoRecompensa,
} from '@/services/vitacon'
import { formatCurrency } from '@/pages/indicador/IndicadorDashboard'

export default function AdminVitacon() {
  const [activeTab, setActiveTab] = useState<'recompensa' | 'empreendimentos' | 'unidades'>(
    'recompensa',
  )

  // Estado da Configuração de Recompensa
  const [rewardConfig, setRewardConfig] = useState<ConfigRecompensaRecord>({
    id: '',
    tipo: 'percentual',
    valor: 1,
    descricao: '1% de comissão padrão Vitacon',
    ativo: true,
  })
  const [tipoInput, setTipoInput] = useState<TipoRecompensa>('percentual')
  const [valorInput, setValorInput] = useState<string>('1')
  const [descricaoInput, setDescricaoInput] = useState<string>('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null)
  const [configErrorMsg, setConfigErrorMsg] = useState<string | null>(null)

  // Empreendimentos
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoRecord[]>([])
  const [empModalOpen, setEmpModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState<EmpreendimentoRecord | null>(null)
  const [empNome, setEmpNome] = useState('')
  const [empBairro, setEmpBairro] = useState('')
  const [empCidade, setEmpCidade] = useState('')
  const [empStatusObra, setEmpStatusObra] = useState('')
  const [empDescricao, setEmpDescricao] = useState('')
  const [empSaving, setEmpSaving] = useState(false)

  // Unidades
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [selectedEmpFilter, setSelectedEmpFilter] = useState<string>('all')
  const [uniModalOpen, setUniModalOpen] = useState(false)
  const [editingUni, setEditingUni] = useState<UnidadeRecord | null>(null)
  const [uniEmpId, setUniEmpId] = useState('')
  const [uniIdent, setUniIdent] = useState('')
  const [uniTorre, setUniTorre] = useState('')
  const [uniMetragem, setUniMetragem] = useState('')
  const [uniValor, setUniValor] = useState('')
  const [uniStatus, setUniStatus] = useState('disponivel')
  const [uniSaving, setUniSaving] = useState(false)

  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [cfg, emps, unis] = await Promise.all([
        getConfigRecompensa(),
        listEmpreendimentos(false),
        listUnidades(),
      ])

      setRewardConfig(cfg)
      setTipoInput(cfg.tipo)
      setValorInput(String(cfg.valor))
      setDescricaoInput(cfg.descricao || '')

      setEmpreendimentos(emps)
      setUnidades(unis)
    } catch (err) {
      console.warn('Erro ao carregar dados Vitacon:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Salvar Recompensa
  const handleSaveRewardConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    setConfigSuccessMsg(null)
    setConfigErrorMsg(null)

    const numVal = parseFloat(valorInput.replace(',', '.'))
    if (isNaN(numVal) || numVal <= 0) {
      setConfigErrorMsg('Informe um valor numérico válido maior que zero.')
      setSavingConfig(false)
      return
    }

    try {
      const updated = await saveConfigRecompensa({
        id: rewardConfig.id || undefined,
        tipo: tipoInput,
        valor: numVal,
        descricao:
          descricaoInput.trim() ||
          (tipoInput === 'percentual'
            ? `${numVal}% sobre o valor da compra`
            : `${formatCurrency(numVal)} fixos por fechamento`),
      })

      setRewardConfig(updated)
      setConfigSuccessMsg('Regra de comissão atualizada com sucesso no banco de dados!')
      setTimeout(() => setConfigSuccessMsg(null), 4000)
    } catch (err) {
      console.error('Erro ao salvar regra:', err)
      setConfigErrorMsg('Não foi possível salvar a regra de recompensa.')
    } finally {
      setSavingConfig(false)
    }
  }

  // Empreendimento: Modal e CRUD
  const handleOpenEmpModal = (emp?: EmpreendimentoRecord) => {
    if (emp) {
      setEditingEmp(emp)
      setEmpNome(emp.nome)
      setEmpBairro(emp.bairro || '')
      setEmpCidade(emp.cidade || '')
      setEmpStatusObra(emp.status_obra || '')
      setEmpDescricao(emp.descricao || '')
    } else {
      setEditingEmp(null)
      setEmpNome('')
      setEmpBairro('')
      setEmpCidade('São Paulo - SP')
      setEmpStatusObra('Pronto para morar')
      setEmpDescricao('')
    }
    setEmpModalOpen(true)
  }

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empNome.trim()) return

    setEmpSaving(true)
    try {
      if (editingEmp) {
        await updateEmpreendimento(editingEmp.id, {
          nome: empNome.trim(),
          bairro: empBairro.trim(),
          cidade: empCidade.trim(),
          status_obra: empStatusObra.trim(),
          descricao: empDescricao.trim(),
        })
      } else {
        await createEmpreendimento({
          nome: empNome.trim(),
          bairro: empBairro.trim(),
          cidade: empCidade.trim(),
          status_obra: empStatusObra.trim(),
          descricao: empDescricao.trim(),
        })
      }
      setEmpModalOpen(false)
      const emps = await listEmpreendimentos(false)
      setEmpreendimentos(emps)
    } catch (err) {
      console.error('Erro ao salvar empreendimento:', err)
    } finally {
      setEmpSaving(false)
    }
  }

  const handleDeleteEmp = async (id: string) => {
    if (!confirm('Deseja realmente excluir este empreendimento e suas unidades vinculadas?')) return
    await deleteEmpreendimento(id)
    const emps = await listEmpreendimentos(false)
    setEmpreendimentos(emps)
    const unis = await listUnidades()
    setUnidades(unis)
  }

  // Unidade: Modal e CRUD
  const handleOpenUniModal = (uni?: UnidadeRecord) => {
    if (uni) {
      setEditingUni(uni)
      setUniEmpId(uni.empreendimento_id)
      setUniIdent(uni.identificacao)
      setUniTorre(uni.torre || '')
      setUniMetragem(uni.metragem ? String(uni.metragem) : '')
      setUniValor(uni.valor ? String(uni.valor) : '')
      setUniStatus(uni.status || 'disponivel')
    } else {
      setEditingUni(null)
      setUniEmpId(empreendimentos[0]?.id || '')
      setUniIdent('')
      setUniTorre('Torre A')
      setUniMetragem('28')
      setUniValor('450000')
      setUniStatus('disponivel')
    }
    setUniModalOpen(true)
  }

  const handleSaveUni = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uniEmpId || !uniIdent.trim()) return

    setUniSaving(true)
    try {
      const payload = {
        empreendimento_id: uniEmpId,
        identificacao: uniIdent.trim(),
        torre: uniTorre.trim() || undefined,
        metragem: uniMetragem ? Number(uniMetragem) : undefined,
        valor: uniValor ? Number(uniValor) : undefined,
        status: uniStatus,
      }

      if (editingUni) {
        await updateUnidade(editingUni.id, payload)
      } else {
        await createUnidade(payload)
      }
      setUniModalOpen(false)
      const unis = await listUnidades()
      setUnidades(unis)
    } catch (err) {
      console.error('Erro ao salvar unidade:', err)
    } finally {
      setUniSaving(false)
    }
  }

  const handleDeleteUni = async (id: string) => {
    if (!confirm('Deseja excluir esta unidade?')) return
    await deleteUnidade(id)
    const unis = await listUnidades()
    setUnidades(unis)
  }

  // Unidades filtradas
  const filteredUnidades = useMemo(() => {
    if (selectedEmpFilter === 'all') return unidades
    return unidades.filter((u) => u.empreendimento_id === selectedEmpFilter)
  }, [unidades, selectedEmpFilter])

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* 1. CABEÇALHO */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 backdrop-blur-sm text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Gestão Master Vitacon
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Empreendimentos, Unidades e Recompensa
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Configure a regra de comissão (percentual ou valor fixo) e mantenha os empreendimentos e
            unidades disponíveis para os indicadores e negociações.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="border-white/20 text-white hover:bg-white/10 bg-white/5 h-10 px-4 rounded-xl text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* 2. NAVEGAÇÃO POR ABAS */}
      <div className="border-b border-slate-200">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger
              value="recompensa"
              className="text-xs sm:text-sm font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg flex items-center gap-2"
            >
              <Sliders className="w-4 h-4" />
              Regra de Comissão
            </TabsTrigger>
            <TabsTrigger
              value="empreendimentos"
              className="text-xs sm:text-sm font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Empreendimentos ({empreendimentos.length})
            </TabsTrigger>
            <TabsTrigger
              value="unidades"
              className="text-xs sm:text-sm font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-lg flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Unidades ({unidades.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 3. CONTEÚDO DAS ABAS */}

      {/* ABA 1: CONFIGURAÇÃO DE RECOMPENSA (Percentual ou Valor Fixo) */}
      {activeTab === 'recompensa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardHeader className="pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  %
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">
                    Configuração de Recompensa do Indicador
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Defina se a remuneração é um percentual sobre a compra ou um valor monetário
                    fixo.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 pb-6 space-y-6">
              {configSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{configSuccessMsg}</span>
                </div>
              )}

              {configErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-800 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{configErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveRewardConfig} className="space-y-6">
                {/* Escolha do Tipo: Percentual vs Fixo */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tipo de Remuneração
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoInput('percentual')
                        if (valorInput === '5000' || valorInput === '10000') setValorInput('1')
                      }}
                      className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                        tipoInput === 'percentual'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          Percentual (%)
                        </span>
                        <span className="text-xs text-slate-500">
                          Ex.: 1% ou 1.5% sobre a compra da unidade
                        </span>
                      </div>
                      <Percent className="w-5 h-5 text-emerald-700" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTipoInput('valor_fixo')
                        if (valorInput === '1' || valorInput === '1.5') setValorInput('5000')
                      }}
                      className={`p-4 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                        tipoInput === 'valor_fixo'
                          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          Valor Fixo (R$)
                        </span>
                        <span className="text-xs text-slate-500">
                          Ex.: R$ 5.000 fixos por cliente fechado
                        </span>
                      </div>
                      <DollarSign className="w-5 h-5 text-emerald-700" />
                    </button>
                  </div>
                </div>

                {/* Input do Valor */}
                <div className="space-y-2">
                  <label htmlFor="valor_input" className="text-sm font-bold text-slate-800">
                    {tipoInput === 'percentual'
                      ? 'Percentual da Comissão (%)'
                      : 'Valor Fixo da Recompensa (R$)'}
                  </label>
                  <div className="relative">
                    <Input
                      id="valor_input"
                      value={valorInput}
                      onChange={(e) => setValorInput(e.target.value)}
                      placeholder={tipoInput === 'percentual' ? '1.5' : '5000'}
                      className="h-12 rounded-xl text-lg font-bold border-slate-200 focus-visible:ring-emerald-600 pr-14"
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      {tipoInput === 'percentual' ? '%' : 'BRL'}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {tipoInput === 'percentual' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setValorInput('1')}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                        >
                          Padrão: 1%
                        </button>
                        <button
                          type="button"
                          onClick={() => setValorInput('1.5')}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                        >
                          Campanha: 1.5%
                        </button>
                        <button
                          type="button"
                          onClick={() => setValorInput('2')}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                        >
                          Especial: 2%
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setValorInput('3000')}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                        >
                          R$ 3.000
                        </button>
                        <button
                          type="button"
                          onClick={() => setValorInput('5000')}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                        >
                          R$ 5.000
                        </button>
                        <button
                          type="button"
                          onClick={() => setValorInput('10000')}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                        >
                          R$ 10.000
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Descrição / Nota Administrativa */}
                <div className="space-y-1.5">
                  <label htmlFor="desc_input" className="text-xs font-semibold text-slate-700">
                    Descrição Pública / Explicativa
                  </label>
                  <Input
                    id="desc_input"
                    value={descricaoInput}
                    onChange={(e) => setDescricaoInput(e.target.value)}
                    placeholder="Ex.: 1% sobre o valor da compra da unidade Vitacon"
                    className="h-10 rounded-xl text-xs border-slate-200"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow"
                >
                  <Save className="w-4 h-4" />
                  {savingConfig ? 'Salvando...' : 'Salvar Regra de Recompensa'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Card Resumo da Regra Ativa */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-white rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Regra Vigente em Produção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-xs">
                <span className="text-xs text-slate-400 block font-medium">Modo Atual:</span>
                <span className="text-xl font-black text-slate-900 block mt-0.5">
                  {rewardConfig.tipo === 'percentual'
                    ? `${rewardConfig.valor}% sobre a compra`
                    : formatCurrency(rewardConfig.valor)}
                </span>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {rewardConfig.descricao || 'Aplicada a todas as novas indicações fechadas.'}
                </p>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800">Como é calculada:</p>
                <p>
                  Quando o admin marca o estágio como <strong>Fechamento</strong> e registra o valor
                  da unidade comprada pelo indicado, a comissão é salva automaticamente conforme
                  esta regra.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ABA 2: EMPREENDIMENTOS VITACON */}
      {activeTab === 'empreendimentos' && (
        <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Empreendimentos Vitacon Cadastrados
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Edifícios e complexos inteligentes da Vitacon para vinculação de unidades.
              </CardDescription>
            </div>
            <Button
              onClick={() => handleOpenEmpModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-xl text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Empreendimento
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {empreendimentos.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Nenhum empreendimento cadastrado ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {empreendimentos.map((emp) => {
                  const totalUnis = unidades.filter((u) => u.empreendimento_id === emp.id).length
                  return (
                    <div
                      key={emp.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-900">{emp.nome}</span>
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200"
                          >
                            {totalUnis} {totalUnis === 1 ? 'unidade' : 'unidades'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {emp.bairro ? `${emp.bairro} • ` : ''}
                          {emp.cidade || 'São Paulo - SP'} • Status: {emp.status_obra || 'Ativo'}
                        </p>
                        {emp.descricao && (
                          <p className="text-xs text-slate-600 italic max-w-xl">{emp.descricao}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEmpModal(emp)}
                          className="h-8 px-3 rounded-lg text-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeleteEmp(emp.id)}
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ABA 3: UNIDADES DOS EMPREENDIMENTOS */}
      {activeTab === 'unidades' && (
        <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Unidades Vitacon</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Cadastre e consulte os números de apartamentos/studios para indicar ou registrar
                como compradas.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedEmpFilter}
                onChange={(e) => setSelectedEmpFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:ring-emerald-600"
              >
                <option value="all">Todos os Empreendimentos</option>
                {empreendimentos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>

              <Button
                onClick={() => handleOpenUniModal()}
                disabled={empreendimentos.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-xl text-xs flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Unidade
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredUnidades.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Nenhuma unidade cadastrada com o filtro atual.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredUnidades.map((u) => {
                  const emp = empreendimentos.find((e) => e.id === u.empreendimento_id)
                  return (
                    <div
                      key={u.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-900">
                            {u.identificacao}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              u.status === 'vendida'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.status === 'vendida' ? 'Adquirida / Vendida' : 'Disponível'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                          {emp?.nome || 'Empreendimento'}
                          {u.torre ? ` • ${u.torre}` : ''}
                          {u.metragem ? ` • ${u.metragem}m²` : ''}
                          {u.valor ? ` • ${formatCurrency(u.valor)}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenUniModal(u)}
                          className="h-8 px-3 rounded-lg text-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeleteUni(u.id)}
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL CRIAR/EDITAR EMPREENDIMENTO */}
      <Dialog open={empModalOpen} onOpenChange={setEmpModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEmp ? 'Editar Empreendimento Vitacon' : 'Novo Empreendimento Vitacon'}
            </DialogTitle>
            <DialogDescription>
              Cadastre o nome oficial do empreendimento e a localização.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEmp} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Nome do Empreendimento *</label>
              <Input
                value={empNome}
                onChange={(e) => setEmpNome(e.target.value)}
                placeholder="Ex.: ON Paulista Vitacon"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bairro</label>
                <Input
                  value={empBairro}
                  onChange={(e) => setEmpBairro(e.target.value)}
                  placeholder="Ex.: Bela Vista"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Cidade - UF</label>
                <Input
                  value={empCidade}
                  onChange={(e) => setEmpCidade(e.target.value)}
                  placeholder="Ex.: São Paulo - SP"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Status da Obra</label>
              <Input
                value={empStatusObra}
                onChange={(e) => setEmpStatusObra(e.target.value)}
                placeholder="Ex.: Pronto para morar / Em obras"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Descrição / Conceito</label>
              <Input
                value={empDescricao}
                onChange={(e) => setEmpDescricao(e.target.value)}
                placeholder="Ex.: Smart Living a 200m da Av. Paulista"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEmpModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={empSaving}
                className="bg-emerald-600 text-white font-bold"
              >
                {empSaving ? 'Salvando...' : 'Salvar Empreendimento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL CRIAR/EDITAR UNIDADE */}
      <Dialog open={uniModalOpen} onOpenChange={setUniModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUni ? 'Editar Unidade Vitacon' : 'Nova Unidade Vitacon'}
            </DialogTitle>
            <DialogDescription>
              Informe o empreendimento, número ou identificação e o valor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUni} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Empreendimento *</label>
              <select
                value={uniEmpId}
                onChange={(e) => setUniEmpId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white"
                required
              >
                {empreendimentos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Identificação / Numeração *
              </label>
              <Input
                value={uniIdent}
                onChange={(e) => setUniIdent(e.target.value)}
                placeholder="Ex.: Studio 1204 - Torre A"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Torre</label>
                <Input
                  value={uniTorre}
                  onChange={(e) => setUniTorre(e.target.value)}
                  placeholder="Ex.: Torre Única"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Metragem (m²)</label>
                <Input
                  type="number"
                  value={uniMetragem}
                  onChange={(e) => setUniMetragem(e.target.value)}
                  placeholder="Ex.: 28"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Valor Estimado (R$)</label>
                <Input
                  type="number"
                  value={uniValor}
                  onChange={(e) => setUniValor(e.target.value)}
                  placeholder="Ex.: 490000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Status</label>
                <select
                  value={uniStatus}
                  onChange={(e) => setUniStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="disponivel">Disponível</option>
                  <option value="vendida">Adquirida / Vendida</option>
                  <option value="reservada">Reservada</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setUniModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uniSaving}
                className="bg-emerald-600 text-white font-bold"
              >
                {uniSaving ? 'Salvando...' : 'Salvar Unidade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
