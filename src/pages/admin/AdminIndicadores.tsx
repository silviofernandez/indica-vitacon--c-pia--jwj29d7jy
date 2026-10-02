import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Check,
  X,
  Copy,
  AlertCircle,
  Loader2,
  Calendar,
  Phone,
  Mail,
  Shield,
  KeyRound,
  RefreshCw,
  Plus,
  Edit2,
  Building2,
  Home,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import {
  listIndicators,
  createIndicatorByMaster,
  updateIndicatorByMaster,
  formatCPF,
  formatPhone,
  type IndicatorRecord,
} from '@/services/indicators'
import {
  listEmpreendimentos,
  listUnidades,
  type EmpreendimentoRecord,
  type UnidadeRecord,
} from '@/services/vitacon'

export default function AdminIndicadores() {
  const [indicators, setIndicators] = useState<IndicatorRecord[]>([])
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'authorized' | 'pending'>('all')

  // Modal Novo / Editar Indicador
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<IndicatorRecord | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formCpf, setFormCpf] = useState('')
  const [formEmpId, setFormEmpId] = useState('')
  const [formUniId, setFormUniId] = useState('')
  const [formUniDesc, setFormUniDesc] = useState('')
  const [formAutorizado, setFormAutorizado] = useState(true)
  const [formPassword, setFormPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string
    pass: string
  } | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      setLoadError(null)
      const [indData, emps, unis] = await Promise.all([
        listIndicators(),
        listEmpreendimentos(false),
        listUnidades(),
      ])
      setIndicators(indData)
      setEmpreendimentos(emps)
      setUnidades(unis)
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
      setLoadError('Não foi possível carregar os indicadores da Vitacon.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const handleRefresh = () => {
    setRefreshing(true)
    void fetchAll()
  }

  // Filtragem
  const filteredIndicators = indicators.filter((item) => {
    const isAuth = item.autorizado !== false && item.approved !== false

    if (activeTab === 'authorized' && !isAuth) return false
    if (activeTab === 'pending' && isAuth) return false

    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    const nameMatch = item.full_name?.toLowerCase().includes(term)
    const emailMatch = item.email?.toLowerCase().includes(term)
    const phoneMatch = item.phone?.toLowerCase().includes(term)
    const cpfMatch = item.cpf_cnpj?.replace(/\D/g, '').includes(term.replace(/\D/g, ''))
    return nameMatch || emailMatch || phoneMatch || cpfMatch
  })

  // Abrir Modal
  const handleOpenModal = (ind?: IndicatorRecord) => {
    setModalError(null)
    setCreatedCredentials(null)

    if (ind) {
      setEditingItem(ind)
      setFormName(ind.full_name || '')
      setFormEmail(ind.email || '')
      setFormPhone(ind.phone || '')
      setFormCpf(ind.cpf_cnpj || '')
      setFormEmpId(ind.empreendimento_id || '')
      setFormUniId(ind.unidade_comprada_id || '')
      setFormUniDesc(ind.unidade_descricao || '')
      setFormAutorizado(ind.autorizado !== false && ind.approved !== false)
      setFormPassword('')
    } else {
      setEditingItem(null)
      setFormName('')
      setFormEmail('')
      setFormPhone('')
      setFormCpf('')
      setFormEmpId(empreendimentos[0]?.id || '')
      setFormUniId('')
      setFormUniDesc('')
      setFormAutorizado(true)
      setFormPassword('Vitacon@2026')
    }
    setModalOpen(true)
  }

  const handleSaveIndicator = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!formName.trim() || !formEmail.trim()) {
      setModalError('Nome completo e e-mail são obrigatórios.')
      return
    }

    if (!editingItem && !formPassword) {
      setModalError('Defina uma senha inicial de acesso.')
      return
    }

    setIsSubmitting(true)

    if (editingItem) {
      const res = await updateIndicatorByMaster(editingItem.id, {
        full_name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        cpf_cnpj: formCpf.trim(),
        empreendimento_id: formEmpId || undefined,
        unidade_comprada_id: formUniId || undefined,
        unidade_descricao: formUniDesc.trim() || undefined,
        autorizado: formAutorizado,
        new_password: formPassword.trim() || undefined,
      })

      setIsSubmitting(false)
      if (res.success) {
        setModalOpen(false)
        void fetchAll()
      } else {
        setModalError(res.error || 'Erro ao atualizar indicador.')
      }
    } else {
      const res = await createIndicatorByMaster({
        full_name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        cpf_cnpj: formCpf.trim(),
        empreendimento_id: formEmpId || undefined,
        unidade_comprada_id: formUniId || undefined,
        unidade_descricao: formUniDesc.trim() || undefined,
        autorizado: formAutorizado,
        initial_password: formPassword.trim(),
      })

      setIsSubmitting(false)
      if (res.success) {
        setCreatedCredentials({
          email: formEmail.trim().toLowerCase(),
          pass: formPassword.trim(),
        })
        void fetchAll()
      } else {
        setModalError(res.error || 'Erro ao cadastrar indicador.')
      }
    }
  }

  const handleToggleAutorizacao = async (ind: IndicatorRecord) => {
    const newState = !(ind.autorizado !== false && ind.approved !== false)
    await updateIndicatorByMaster(ind.id, { autorizado: newState })
    void fetchAll()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-700 mb-2">
            <Shield className="w-3.5 h-3.5" />
            Gestão Master • Vitacon
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Clientes Indicadores Autorizados
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre os clientes que adquiriram unidades Vitacon e autorize-os a indicar e receber
            comissões.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="rounded-xl border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm h-10 px-4 flex items-center gap-2 shadow"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Indicador
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900 rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <span>{loadError}</span>
        </Alert>
      )}

      {/* 2. REGRA DO NEGÓCIO EM DESTAQUE */}
      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-emerald-900 text-sm block">
            Requisito Obrigatório: Unidade Adquirida na Vitacon
          </span>
          <p className="text-emerald-800 leading-relaxed">
            Não existe cadastro público aberto. A administração cadastra cada cliente, vincula a
            unidade comprada por ele e define o e-mail e senha de acesso. Apenas indicadores
            marcados como <strong>Autorizados</strong> podem indicar outros clientes.
          </p>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E TABS */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, e-mail, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 rounded-xl border-slate-200 focus-visible:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Todos ({indicators.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('authorized')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'authorized'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Autorizados
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                Bloqueados / Pendentes
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. LISTA DE INDICADORES */}
      <Card className="border-slate-200 shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 py-4 px-6 bg-slate-50/50">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Clientes Indicadores ({filteredIndicators.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
              Carregando indicadores...
            </div>
          ) : filteredIndicators.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              Nenhum cliente indicador localizado.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredIndicators.map((ind) => {
                const isAuth = ind.autorizado !== false && ind.approved !== false
                const empNome = ind.expand?.empreendimento_id?.nome || 'Vitacon'
                const uniNome =
                  ind.expand?.unidade_comprada_id?.identificacao ||
                  ind.unidade_descricao ||
                  'Unidade cadastrada'

                return (
                  <div
                    key={ind.id}
                    className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900">
                          {ind.full_name}
                        </span>
                        <Badge
                          className={`text-xs font-semibold ${
                            isAuth
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isAuth ? 'Autorizado a Indicar' : 'Não Autorizado'}
                        </Badge>
                      </div>

                      {/* Contato e CPF */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {ind.email && (
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {ind.email}
                          </span>
                        )}
                        {ind.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {formatPhone(ind.phone)}
                          </span>
                        )}
                        {ind.cpf_cnpj && (
                          <span className="flex items-center gap-1">
                            <span className="font-semibold">CPF:</span>
                            {formatCPF(ind.cpf_cnpj)}
                          </span>
                        )}
                      </div>

                      {/* Unidade Comprada pelo Cliente Indicador */}
                      <div className="pt-1 flex items-center gap-1.5 text-xs text-emerald-900 font-semibold">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Unidade Comprada:{' '}
                          <strong className="text-slate-900">
                            {empNome} — {uniNome}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Ações Master */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleToggleAutorizacao(ind)}
                        className={`text-xs h-9 px-3 rounded-xl border ${
                          isAuth
                            ? 'text-amber-800 border-amber-300 hover:bg-amber-50'
                            : 'text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        {isAuth ? 'Desautorizar' : 'Autorizar'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenModal(ind)}
                        className="text-xs h-9 px-3 rounded-xl border-slate-200"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar / Senha
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL CADASTRAR / EDITAR INDICADOR */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Cliente Indicador' : 'Novo Cliente Indicador Vitacon'}
            </DialogTitle>
            <DialogDescription>
              Insira o cadastro, vincule a unidade adquirida e defina a senha de acesso.
            </DialogDescription>
          </DialogHeader>

          {createdCredentials ? (
            <div className="py-4 space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-emerald-950 text-base">
                  Indicador Cadastrado com Sucesso!
                </h3>
                <p className="text-xs text-emerald-800">
                  Envie as credenciais abaixo para o cliente acessar a plataforma Vitacon:
                </p>
                <div className="p-3 bg-white rounded-lg border border-emerald-200 text-left font-mono text-xs space-y-1">
                  <p>
                    <strong>Login / E-mail:</strong> {createdCredentials.email}
                  </p>
                  <p>
                    <strong>Senha:</strong> {createdCredentials.pass}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setModalOpen(false)
                  setCreatedCredentials(null)
                }}
                className="w-full bg-emerald-600 text-white font-bold"
              >
                Concluir
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSaveIndicator} className="space-y-4 py-2">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  {modalError}
                </div>
              )}

              {/* NOME E EMAIL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nome Completo *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex.: Carlos Alberto Souza"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">E-mail de Login *</label>
                  <Input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="carlos@exemplo.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Telefone / WhatsApp</label>
                  <Input
                    value={formPhone}
                    onChange={(e) => setFormPhone(formatPhone(e.target.value))}
                    placeholder="(11) 98765-4321"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">CPF / Cadastro</label>
                <Input
                  value={formCpf}
                  onChange={(e) => setFormCpf(formatCPF(e.target.value))}
                  placeholder="123.456.789-00"
                />
              </div>

              {/* UNIDADE COMPRADA (REQUISITO FUNDAMENTAL) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Unidade Vitacon Adquirida pelo Indicador</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Empreendimento
                    </label>
                    <select
                      value={formEmpId}
                      onChange={(e) => {
                        setFormEmpId(e.target.value)
                        setFormUniId('')
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
                    <label className="text-[11px] font-semibold text-slate-600">
                      Unidade Comprada
                    </label>
                    <select
                      value={formUniId}
                      onChange={(e) => setFormUniId(e.target.value)}
                      disabled={!formEmpId}
                      className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white disabled:opacity-50"
                    >
                      <option value="">
                        {formEmpId ? 'Selecione a unidade...' : 'Escolha o empreendimento'}
                      </option>
                      {unidades
                        .filter((u) => u.empreendimento_id === formEmpId)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.identificacao}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Descrição da unidade (caso não esteja na lista)
                  </label>
                  <Input
                    value={formUniDesc}
                    onChange={(e) => setFormUniDesc(e.target.value)}
                    placeholder="Ex.: Apto 804 - Torre A (Contrato assinado 2024)"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* SENHA E AUTORIZAÇÃO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {editingItem ? 'Nova Senha (opcional)' : 'Senha Inicial *'}
                  </label>
                  <Input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingItem ? 'Manter atual' : 'Vitacon@2026'}
                    required={!editingItem}
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="text-xs font-bold text-slate-700 mb-1">
                    Status de Autorização
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAutorizado}
                      onChange={(e) => setFormAutorizado(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">Autorizado a indicar</span>
                  </label>
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 text-white font-bold"
                >
                  {isSubmitting
                    ? 'Salvando...'
                    : editingItem
                      ? 'Salvar Alterações'
                      : 'Criar Indicador'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
