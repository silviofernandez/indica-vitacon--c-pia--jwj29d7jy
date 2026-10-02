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
  MapPin,
  FileText,
  Shield,
  KeyRound,
  RefreshCw,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  listIndicators,
  approveIndicator,
  rejectIndicator,
  type IndicatorRecord,
  type ApproveIndicatorResult,
} from '@/services/indicators'

export default function AdminIndicadores() {
  const [indicators, setIndicators] = useState<IndicatorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')

  // Modais de ação
  const [approvingItem, setApprovingItem] = useState<IndicatorRecord | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [approvalResult, setApprovalResult] = useState<ApproveIndicatorResult | null>(null)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const [rejectingItem, setRejectingItem] = useState<IndicatorRecord | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionError, setRejectionError] = useState<string | null>(null)

  const [viewingItem, setViewingItem] = useState<IndicatorRecord | null>(null)

  const fetchIndicators = useCallback(async () => {
    try {
      setLoadError(null)
      const data = await listIndicators()
      setIndicators(data)
    } catch (err) {
      console.error('Erro ao buscar indicadores:', err)
      setLoadError('Não foi possível carregar a lista de indicadores.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchIndicators()
  }, [fetchIndicators])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchIndicators()
  }

  // Filtragem e busca
  const filteredIndicators = indicators.filter((item) => {
    // Filtro por tab/status
    const status = item.approval_status || (item.approved ? 'approved' : 'pending')
    if (activeTab !== 'all' && status !== activeTab) {
      return false
    }

    // Busca textual por nome, CPF, e-mail ou telefone
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    const nameMatch = item.full_name?.toLowerCase().includes(term)
    const emailMatch = item.email?.toLowerCase().includes(term)
    const phoneMatch = item.phone?.toLowerCase().includes(term)
    const cpfMatch = item.cpf_cnpj?.replace(/\D/g, '').includes(term.replace(/\D/g, ''))
    return nameMatch || emailMatch || phoneMatch || cpfMatch
  })

  // Contagens
  const counts = {
    pending: indicators.filter(
      (i) => (i.approval_status || (i.approved ? 'approved' : 'pending')) === 'pending',
    ).length,
    approved: indicators.filter(
      (i) => (i.approval_status || (i.approved ? 'approved' : 'pending')) === 'approved',
    ).length,
    rejected: indicators.filter((i) => i.approval_status === 'rejected').length,
    all: indicators.length,
  }

  // Ação: Confirmar Aprovação
  const handleConfirmApproval = async () => {
    if (!approvingItem) return
    setIsApproving(true)
    setApprovalError(null)

    try {
      const res = await approveIndicator(approvingItem.id)
      if (res.success && res.data) {
        setApprovalResult(res.data)
        // Atualiza a lista local
        setIndicators((prev) =>
          prev.map((ind) =>
            ind.id === approvingItem.id
              ? {
                  ...ind,
                  approval_status: 'approved',
                  approved: true,
                  profile_id: res.data?.profile_id,
                  user_id: res.data?.user_id,
                }
              : ind,
          ),
        )
      } else {
        setApprovalError(res.error || 'Não foi possível aprovar este indicador.')
      }
    } catch {
      setApprovalError('Erro inesperado durante a aprovação.')
    } finally {
      setIsApproving(false)
    }
  }

  // Ação: Copiar senha temporária
  const handleCopyPassword = () => {
    if (!approvalResult?.temp_password) return
    navigator.clipboard.writeText(approvalResult.temp_password)
    setCopiedPassword(true)
    setTimeout(() => setCopiedPassword(false), 3000)
  }

  // Ação: Confirmar Rejeição
  const handleConfirmRejection = async () => {
    if (!rejectingItem) return
    if (!rejectionReason.trim()) {
      setRejectionError('Por favor, informe o motivo da rejeição.')
      return
    }

    setIsRejecting(true)
    setRejectionError(null)

    try {
      const res = await rejectIndicator(rejectingItem.id, rejectionReason.trim())
      if (res.success) {
        // Atualiza a lista local
        setIndicators((prev) =>
          prev.map((ind) =>
            ind.id === rejectingItem.id
              ? {
                  ...ind,
                  approval_status: 'rejected',
                  approved: false,
                  rejection_reason: rejectionReason.trim(),
                }
              : ind,
          ),
        )
        setRejectingItem(null)
        setRejectionReason('')
      } else {
        setRejectionError(res.error || 'Não foi possível rejeitar este indicador.')
      }
    } catch {
      setRejectionError('Erro inesperado durante a rejeição.')
    } finally {
      setIsRejecting(false)
    }
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-'
    try {
      const date = new Date(isoString)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return isoString
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a5d8f]/10 text-xs font-semibold text-[#1a5d8f] mb-2">
            <Shield className="w-3.5 h-3.5" />
            Gestão Master
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2a43]">
            Aprovação de Indicadores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Analise cadastros públicos de novos indicadores parceiros, aprove ou rejeite
            solicitações.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="border-[#e5e0d8] hover:bg-[#faf7f2] text-gray-700 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
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
              <h4 className="text-sm font-bold text-red-900">Falha ao buscar indicadores</h4>
              <p className="text-xs text-red-700">{loadError}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-red-300 text-red-800 hover:bg-red-100 text-xs shrink-0 rounded-lg h-8"
          >
            Tentar novamente
          </Button>
        </Alert>
      )}

      {/* Cards de Métricas / Abas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
              : 'bg-white border-[#e5e0d8] hover:bg-[#faf7f2]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Pendentes
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-[#0f2a43] mt-2">{counts.pending}</p>
          <span className="text-[11px] text-gray-500">Aguardando validação</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'approved'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/40 shadow-sm'
              : 'bg-white border-[#e5e0d8] hover:bg-[#faf7f2]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Aprovados
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-[#0f2a43] mt-2">{counts.approved}</p>
          <span className="text-[11px] text-gray-500">Com acesso ativo</span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'rejected'
              ? 'bg-red-50/70 border-red-300 ring-2 ring-red-400/40 shadow-sm'
              : 'bg-white border-[#e5e0d8] hover:bg-[#faf7f2]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
              Rejeitados
            </span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-extrabold text-[#0f2a43] mt-2">{counts.rejected}</p>
          <span className="text-[11px] text-gray-500">Com motivo registrado</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'all'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-400/40 shadow-sm'
              : 'bg-white border-[#e5e0d8] hover:bg-[#faf7f2]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1a5d8f] uppercase tracking-wider">Todos</span>
            <Users className="w-4 h-4 text-[#1a5d8f]" />
          </div>
          <p className="text-2xl font-extrabold text-[#0f2a43] mt-2">{counts.all}</p>
          <span className="text-[11px] text-gray-500">Total de cadastros</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome completo, e-mail, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#faf7f2] border border-[#e5e0d8] text-xs font-semibold text-gray-600">
                <Filter className="w-3.5 h-3.5 text-[#1a5d8f]" />
                <span>
                  Exibindo: <strong className="text-[#0f2a43]">{filteredIndicators.length}</strong>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listagem de Indicadores */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-[#e5e0d8] py-4 px-6 bg-gradient-to-r from-[#faf7f2] to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1a5d8f]" />
              <CardTitle className="text-base font-bold text-[#0f2a43]">
                {activeTab === 'pending' && 'Indicadores Aguardando Aprovação'}
                {activeTab === 'approved' && 'Indicadores Aprovados (Ativos)'}
                {activeTab === 'rejected' && 'Cadastros Rejeitados'}
                {activeTab === 'all' && 'Todos os Indicadores'}
              </CardTitle>
            </div>
            <span className="text-xs text-gray-500">Fase 2: Gestão Master</span>
          </div>
          <CardDescription className="text-xs text-gray-500">
            A aprovação cria automaticamente a conta de acesso e o perfil de indicador parceiro com
            forçamento de troca de senha no primeiro acesso.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#1a5d8f] animate-spin mx-auto" />
              <p className="text-sm font-medium text-gray-500">Carregando cadastros...</p>
            </div>
          ) : filteredIndicators.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-14 h-14 rounded-2xl bg-[#faf7f2] border border-[#e5e0d8] flex items-center justify-center mx-auto text-gray-400">
                <Users className="w-7 h-7" />
              </div>
              <p className="text-base font-semibold text-[#0f2a43]">Nenhum indicador encontrado</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {searchTerm
                  ? 'Nenhum resultado corresponde aos termos da pesquisa.'
                  : activeTab === 'pending'
                    ? 'Não há solicitações pendentes de aprovação no momento.'
                    : 'Nenhum registro para esta categoria.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e0d8]">
              {filteredIndicators.map((item) => {
                const status = item.approval_status || (item.approved ? 'approved' : 'pending')
                return (
                  <div
                    key={item.id}
                    className="p-5 sm:p-6 hover:bg-[#faf7f2]/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Dados do Indicador */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-[#0f2a43] text-base truncate">
                          {item.full_name}
                        </h3>
                        {status === 'pending' && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                        {status === 'approved' && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aprovado
                          </Badge>
                        )}
                        {status === 'rejected' && (
                          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejeitado
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600 pt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{item.email || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{item.phone || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>CPF: {item.cpf_cnpj || 'Não informado'}</span>
                        </div>
                        {item.rg && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>RG: {item.rg}</span>
                          </div>
                        )}
                        {item.address && (
                          <div className="flex items-center gap-1.5 sm:col-span-2 truncate">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{item.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>Cadastrado em: {formatDate(item.created)}</span>
                        </div>
                      </div>

                      {/* Motivo da Rejeição (se rejeitado) */}
                      {status === 'rejected' && item.rejection_reason && (
                        <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                          <strong className="font-semibold block mb-0.5">
                            Motivo da Rejeição:
                          </strong>
                          <span>{item.rejection_reason}</span>
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingItem(item)}
                        className="text-gray-600 hover:text-[#1a5d8f] hover:bg-white rounded-xl h-9 px-3"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Detalhes
                      </Button>

                      {status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setApprovingItem(item)
                              setApprovalResult(null)
                              setApprovalError(null)
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-9 px-3.5 shadow-sm"
                          >
                            <Check className="w-4 h-4 mr-1.5" />
                            Aprovar
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectingItem(item)
                              setRejectionReason('')
                              setRejectionError(null)
                            }}
                            className="border-red-300 text-red-700 hover:bg-red-50 rounded-xl h-9 px-3.5"
                          >
                            <X className="w-4 h-4 mr-1.5" />
                            Rejeitar
                          </Button>
                        </>
                      )}

                      {status === 'rejected' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setApprovingItem(item)
                            setApprovalResult(null)
                            setApprovalError(null)
                          }}
                          className="bg-[#1a5d8f] hover:bg-[#144a72] text-white font-semibold rounded-xl h-9 px-3.5"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Reavaliar e Aprovar
                        </Button>
                      )}

                      {status === 'approved' && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          Conta Vinculada
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: APROVAÇÃO E GERAÇÃO DE SENHA TEMPORÁRIA */}
      <Dialog
        open={Boolean(approvingItem)}
        onOpenChange={(open) => {
          if (!open) {
            setApprovingItem(null)
            setApprovalResult(null)
            setApprovalError(null)
            setCopiedPassword(false)
          }
        }}
      >
        <DialogContent className="max-w-md bg-white rounded-2xl border-[#e5e0d8]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0f2a43] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Aprovação de Indicador</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Esta ação criará a conta de acesso e o perfil do indicador com senha temporária.
            </DialogDescription>
          </DialogHeader>

          {!approvalResult ? (
            /* Confirmação Prévia */
            <div className="space-y-4 py-2">
              {approvalError && (
                <Alert className="bg-red-50 border-red-200 text-red-800 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <AlertDescription className="text-xs font-medium">
                    {approvalError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-4 rounded-xl bg-[#faf7f2] border border-[#e5e0d8] space-y-2 text-xs">
                <p>
                  <strong>Nome:</strong> {approvingItem?.full_name}
                </p>
                <p>
                  <strong>E-mail:</strong> {approvingItem?.email}
                </p>
                <p>
                  <strong>Telefone:</strong> {approvingItem?.phone}
                </p>
                <p>
                  <strong>CPF:</strong> {approvingItem?.cpf_cnpj}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  Aviso (Fase 2 sem e-mail automático):
                </p>
                <p className="leading-relaxed">
                  A senha temporária gerada será exibida na tela a seguir para que você possa copiar
                  e enviar ao parceiro pelo WhatsApp. O envio automático de e-mail será ativado na
                  Fase 3.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setApprovingItem(null)}
                  disabled={isApproving}
                  className="border-[#e5e0d8] text-gray-700 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmApproval}
                  disabled={isApproving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aprovando...
                    </>
                  ) : (
                    'Confirmar Aprovação'
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Sucesso: Exibição da Senha Temporária com Botão Copiar */
            <div className="space-y-5 py-2">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#0f2a43]">
                  Indicador Aprovado com Sucesso!
                </h3>
                <p className="text-xs text-gray-500">
                  A conta foi criada e vinculada. Copie a senha temporária abaixo para fornecer ao
                  indicador.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0f2a43] text-white space-y-3 shadow-inner">
                <div>
                  <span className="text-[11px] text-gray-300 block font-medium">
                    E-mail de Login:
                  </span>
                  <span className="text-sm font-bold text-[#d9995b]">{approvalResult.email}</span>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <span className="text-[11px] text-gray-300 block font-medium">
                    Senha Temporária:
                  </span>
                  <div className="flex items-center justify-between gap-2 mt-1 bg-white/10 p-2.5 rounded-xl border border-white/15">
                    <code className="text-base font-mono font-bold text-white tracking-wider">
                      {approvalResult.temp_password}
                    </code>
                    <Button
                      size="sm"
                      onClick={handleCopyPassword}
                      className="bg-[#1a5d8f] hover:bg-[#144a72] text-white rounded-lg h-8 px-3 font-semibold text-xs"
                    >
                      {copiedPassword ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-300" />
                          Copiada!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copiar Senha
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <p className="leading-relaxed">
                  Ao realizar o primeiro login com esta senha, o sistema exigirá obrigatoriamente
                  que o indicador defina sua própria senha pessoal definitiva.
                </p>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setApprovingItem(null)
                    setApprovalResult(null)
                  }}
                  className="w-full bg-[#1a5d8f] hover:bg-[#144a72] text-white font-semibold rounded-xl"
                >
                  Concluir e Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REJEIÇÃO COM MOTIVO OBRIGATÓRIO */}
      <Dialog
        open={Boolean(rejectingItem)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingItem(null)
            setRejectionReason('')
            setRejectionError(null)
          }
        }}
      >
        <DialogContent className="max-w-md bg-white rounded-2xl border-[#e5e0d8]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-700 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span>Rejeitar Cadastro de Indicador</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Informe o motivo detalhado para justificar a recusa desta solicitação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {rejectionError && (
              <Alert className="bg-red-50 border-red-200 text-red-800 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <AlertDescription className="text-xs font-medium">
                  {rejectionError}
                </AlertDescription>
              </Alert>
            )}

            <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#e5e0d8] text-xs">
              <p>
                <strong>Indicador:</strong> {rejectingItem?.full_name}
              </p>
              <p>
                <strong>CPF:</strong> {rejectingItem?.cpf_cnpj}
              </p>
              <p>
                <strong>E-mail:</strong> {rejectingItem?.email}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rejection-reason" className="text-xs font-bold text-[#1f2933]">
                Motivo da Rejeição <span className="text-red-500">* (Obrigatório)</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Ex: Documento de identidade divergente ou CPF inválido; ou área geográfica fora da cobertura..."
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="rounded-xl border-[#e5e0d8] focus-visible:ring-red-500 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectingItem(null)}
              disabled={isRejecting}
              className="border-[#e5e0d8] text-gray-700 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRejection}
              disabled={isRejecting || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-md"
            >
              {isRejecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                'Confirmar Rejeição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: VISUALIZAR DETALHES COMPLETOS */}
      <Dialog
        open={Boolean(viewingItem)}
        onOpenChange={(open) => {
          if (!open) setViewingItem(null)
        }}
      >
        <DialogContent className="max-w-lg bg-white rounded-2xl border-[#e5e0d8]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0f2a43] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1a5d8f]" />
              <span>Ficha Completa do Indicador</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Dados cadastrados no formulário de parceria.
            </DialogDescription>
          </DialogHeader>

          {viewingItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#faf7f2] border border-[#e5e0d8]">
                <div>
                  <span className="text-gray-500 block">Nome Completo:</span>
                  <span className="font-bold text-[#0f2a43] text-sm">{viewingItem.full_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Status de Aprovação:</span>
                  <span className="font-bold text-[#1a5d8f] uppercase">
                    {viewingItem.approval_status || (viewingItem.approved ? 'approved' : 'pending')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">E-mail:</span>
                  <span className="font-semibold">{viewingItem.email || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Telefone:</span>
                  <span className="font-semibold">{viewingItem.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">CPF:</span>
                  <span className="font-semibold">{viewingItem.cpf_cnpj || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">RG:</span>
                  <span className="font-semibold">{viewingItem.rg || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 block">Endereço Residencial:</span>
                  <span className="font-semibold">{viewingItem.address || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Data de Solicitação:</span>
                  <span className="font-semibold">{formatDate(viewingItem.created)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">ID do Registro:</span>
                  <code className="text-[11px] text-gray-600">{viewingItem.id}</code>
                </div>
              </div>

              {viewingItem.rejection_reason && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800">
                  <strong className="font-semibold block mb-1">Motivo da Rejeição:</strong>
                  <span>{viewingItem.rejection_reason}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setViewingItem(null)}
              className="bg-[#1a5d8f] text-white rounded-xl"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
