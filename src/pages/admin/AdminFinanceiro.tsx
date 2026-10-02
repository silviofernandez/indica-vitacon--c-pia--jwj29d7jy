import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  DollarSign,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  Wallet,
  AlertCircle,
  Copy,
  Check,
  Building2,
  Calendar,
  Sparkles,
  User,
  FileText,
  FileSpreadsheet,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { listAllBonuses, registerBonusPayment, type BonusRecord } from '@/services/referrals'
import { formatCurrency, formatDateTime } from '@/pages/indicador/IndicadorDashboard'
import { formatPhone } from '@/services/indicators'
import { generateReport, downloadReportUrl, type ReportFormat } from '@/services/reports'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminFinanceiro() {
  const { user } = useAuth()
  const isMaster = user?.role === 'master'

  // Estados de geração de relatório financeiro do dia 10
  const [isGeneratingReport, setIsGeneratingReport] = useState<ReportFormat | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState<string | null>(null)
  const [bonuses, setBonuses] = useState<BonusRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'all'>('pending')

  // Estado do modal de pagamento
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedBonus, setSelectedBonus] = useState<BonusRecord | null>(null)
  const [pixKeyUsed, setPixKeyUsed] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // Carregar dados dos bônus
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      setLoadError(null)
      const records = await listAllBonuses()
      setBonuses(records)
    } catch (err) {
      console.warn('Erro ao carregar bônus no painel financeiro:', err)
      setLoadError('Não foi possível carregar os registros financeiros e bônus.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Filtragem dos registros
  const filteredBonuses = useMemo(() => {
    let list = bonuses

    // Filtro por aba de status
    if (activeTab === 'pending') {
      list = list.filter((b) => b.status === 'pending' || b.status === 'approved')
    } else if (activeTab === 'paid') {
      list = list.filter((b) => b.status === 'paid' || b.payment_status === 'paid')
    }

    // Filtro por busca de texto (nome indicador, chave pix, cliente ou id)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((b) => {
        const indName = (b.expand?.indicator_id?.full_name || '').toLowerCase()
        const indPix = (b.expand?.indicator_id?.pix_key || '').toLowerCase()
        const indPhone = (b.expand?.indicator_id?.phone || '').toLowerCase()
        const clientName = (b.expand?.referral_id?.client_name || '').toLowerCase()
        const bId = b.id.toLowerCase()
        return (
          indName.includes(q) ||
          indPix.includes(q) ||
          indPhone.includes(q) ||
          clientName.includes(q) ||
          bId.includes(q)
        )
      })
    }

    return list
  }, [bonuses, activeTab, searchQuery])

  // Agrupamento por Indicador (para visão consolidada de valores a pagar)
  const groupedByIndicator = useMemo(() => {
    const map = new Map<
      string,
      {
        indicatorId: string
        indicatorName: string
        indicatorPhone?: string
        indicatorPix?: string
        indicatorPixType?: string
        totalPending: number
        totalPaid: number
        bonuses: BonusRecord[]
      }
    >()

    for (const b of filteredBonuses) {
      const indId = b.indicator_id || b.expand?.indicator_id?.id || 'desconhecido'
      const indName = b.expand?.indicator_id?.full_name || 'Indicador Parceiro'
      const indPhone = b.expand?.indicator_id?.phone
      const indPix = b.expand?.indicator_id?.pix_key
      const indPixType = b.expand?.indicator_id?.pix_key_type

      if (!map.has(indId)) {
        map.set(indId, {
          indicatorId: indId,
          indicatorName: indName,
          indicatorPhone: indPhone,
          indicatorPix: indPix,
          indicatorPixType: indPixType,
          totalPending: 0,
          totalPaid: 0,
          bonuses: [],
        })
      }

      const item = map.get(indId)!
      item.bonuses.push(b)
      const isPaid = b.status === 'paid' || b.payment_status === 'paid'
      if (isPaid) {
        item.totalPaid += Number(b.amount) || 0
      } else {
        item.totalPending += Number(b.amount) || 0
      }
    }

    return Array.from(map.values())
  }, [filteredBonuses])

  // Totais globais
  const stats = useMemo(() => {
    let pendingSum = 0
    let paidSum = 0
    let pendingCount = 0
    let paidCount = 0

    for (const b of bonuses) {
      const isPaid = b.status === 'paid' || b.payment_status === 'paid'
      const val = Number(b.amount) || 0
      if (isPaid) {
        paidSum += val
        paidCount++
      } else {
        pendingSum += val
        pendingCount++
      }
    }

    return {
      pendingSum,
      paidSum,
      totalSum: pendingSum + paidSum,
      pendingCount,
      paidCount,
      totalCount: bonuses.length,
    }
  }, [bonuses])

  // Abertura do modal de confirmação de pagamento
  const handleOpenPayment = (bonus: BonusRecord) => {
    setSelectedBonus(bonus)
    const defaultPix = bonus.expand?.indicator_id?.pix_key || ''
    setPixKeyUsed(defaultPix)
    setPaymentNotes('')
    setPaymentError(null)
    setCopiedKey(false)
    setPaymentModalOpen(true)
  }

  // Execução da quitação via register-bonus-payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBonus) return

    setIsSubmittingPayment(true)
    setPaymentError(null)

    const res = await registerBonusPayment({
      bonus_id: selectedBonus.id,
      pix_key_used: pixKeyUsed.trim(),
      payment_notes: paymentNotes.trim(),
    })

    setIsSubmittingPayment(false)

    if (!res.success) {
      setPaymentError(res.error || 'Não foi possível registrar o pagamento do bônus.')
      return
    }

    setPaymentModalOpen(false)
    setSelectedBonus(null)
    // Recarrega lista atualizada
    void loadData(true)
  }

  // Copiar chave PIX com clique único
  const handleCopyPix = (key: string) => {
    if (!key) return
    navigator.clipboard.writeText(key)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  // Geração de Relatório Financeiro do Dia 10 (PDF ou Excel)
  const handleGenerateFinancialReport = async (format: ReportFormat) => {
    if (!isMaster) return
    setIsGeneratingReport(format)
    setReportError(null)
    setReportSuccess(null)

    try {
      const res = await generateReport({
        kind: 'financial',
        format,
      })

      if (!res.success || !res.report_url) {
        setReportError(res.error || 'Não foi possível gerar o relatório financeiro.')
        return
      }

      setReportSuccess(`Relatório ${format === 'pdf' ? 'PDF' : 'Excel'} gerado com sucesso!`)
      downloadReportUrl(res.report_url, res.file_name)
      setTimeout(() => setReportSuccess(null), 5000)
    } catch (err) {
      console.error('Erro ao gerar relatório financeiro:', err)
      setReportError('Não foi possível gerar o relatório financeiro. Tente novamente.')
    } finally {
      setIsGeneratingReport(null)
    }
  }

  // Rótulos de tipo de bônus
  const getBonusTypeBadge = (b: BonusRecord) => {
    if (b.is_vitacon || b.bonus_type === 'vitacon_percent') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[11px] font-semibold">
          <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
          Vitacon SP (1%)
        </Badge>
      )
    }
    if (b.bonus_type === 'rental_fixed') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[11px] font-semibold">
          Locação (Valor Fixo)
        </Badge>
      )
    }
    if (b.bonus_type === 'buyer_percent') {
      const recipient = b.recipient_type === 'referred' ? 'Comprador Indicado' : 'Indicador'
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[11px] font-semibold">
          Comprador ({recipient} 0,5%)
        </Badge>
      )
    }
    if (b.bonus_type === 'sale_percent') {
      return (
        <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-[11px] font-semibold">
          Venda (5% de 6%)
        </Badge>
      )
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-[11px]">
        {b.bonus_type || 'Bônus'}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* 1. TOPO: TÍTULO E BOTÃO ATUALIZAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f2a43]">
                Gestão Financeira de Bonificações
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Acompanhamento e liquidação de recompensas a pagar para parceiros e indicados
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void loadData(true)}
          disabled={isRefreshing || isLoading}
          className="rounded-xl border-[#e5e0d8] h-10 px-4 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar Valores
        </Button>
      </div>

      {/* 1.1 BANNER DE DESTAQUE: RELATÓRIO DO PAGAMENTO DO DIA 10 (EXCLUSIVO MASTER) */}
      {isMaster ? (
        <Card className="border-[#1a5d8f]/30 bg-gradient-to-r from-[#0f2a43] via-[#15466d] to-[#1a5d8f] text-white shadow-md overflow-hidden relative">
          <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-radial from-white/10 to-transparent pointer-events-none" />
          <CardContent className="p-5 sm:p-6 relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold border border-white/15">
                <Calendar className="w-3.5 h-3.5 text-[#d9995b]" />
                <span>Fechamento Mensal • Pagamento Dia 10</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Relatório de Pagamento do Dia 10 (Lote PIX)
              </h2>
              <p className="text-xs text-gray-200 leading-relaxed">
                Gere a relação completa de indicadores parceiros com bonificações pendentes, CPF,
                chave PIX e valor total consolidado para facilitar os pagamentos bancários.
              </p>
              {reportError && (
                <p className="text-xs text-red-200 bg-red-900/40 p-2 rounded-lg border border-red-400/40 font-medium">
                  {reportError}
                </p>
              )}
              {reportSuccess && (
                <p className="text-xs text-emerald-200 bg-emerald-900/40 p-2 rounded-lg border border-emerald-400/40 font-medium">
                  {reportSuccess}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <Button
                type="button"
                onClick={() => void handleGenerateFinancialReport('pdf')}
                disabled={isGeneratingReport !== null}
                className="bg-white/10 hover:bg-white/20 text-white font-bold h-10 px-4 rounded-xl border border-white/20 text-xs shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingReport === 'pdf' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 text-red-300" />
                )}
                <span>{isGeneratingReport === 'pdf' ? 'Gerando...' : 'Baixar PDF'}</span>
              </Button>

              <Button
                type="button"
                onClick={() => void handleGenerateFinancialReport('excel')}
                disabled={isGeneratingReport !== null}
                className="bg-[#d9995b] hover:bg-[#c48548] text-white font-bold h-10 px-4 rounded-xl shadow-xs text-xs transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingReport === 'excel' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span>{isGeneratingReport === 'excel' ? 'Gerando...' : 'Baixar Excel (XLS)'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="p-3 bg-[#faf7f2] border border-[#e5e0d8] rounded-xl text-xs text-gray-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
          <span>
            A geração de relatórios de pagamento do lote do dia 10 é restrita ao perfil Master.
          </span>
        </div>
      )}

      {/* Alerta de erro com botão de retentativa */}
      {loadError && (
        <Alert
          variant="destructive"
          className="bg-red-50 border-red-200 text-red-900 rounded-xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Falha ao buscar dados financeiros</h4>
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

      {/* 2. CARDS DE INDICADORES / TOTAIS GLOBAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* A Pagar (Pendente) */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/60 to-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Total a Pagar (Pendente)
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
              {isLoading ? '...' : formatCurrency(stats.pendingSum)}
            </div>
            <p className="text-xs text-amber-900/80 mt-1">
              {stats.pendingCount}{' '}
              {stats.pendingCount === 1 ? 'bônus aguardando' : 'bônus aguardando liberação'}
            </p>
          </CardContent>
        </Card>

        {/* Já Pago (Histórico) */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Total Quitado (Já Pago)
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {isLoading ? '...' : formatCurrency(stats.paidSum)}
            </div>
            <p className="text-xs text-emerald-900/80 mt-1">
              {stats.paidCount}{' '}
              {stats.paidCount === 1 ? 'pagamento liquidado' : 'pagamentos liquidados via PIX'}
            </p>
          </CardContent>
        </Card>

        {/* Total Geral de Bonificações Geradas */}
        <Card className="border-[#e5e0d8] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total Histórico Gerado
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-[#1a5d8f]/10 text-[#1a5d8f] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0f2a43]">
              {isLoading ? '...' : formatCurrency(stats.totalSum)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalCount}{' '}
              {stats.totalCount === 1
                ? 'bonificação calculada'
                : 'bonificações calculadas no total'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. FILTROS E BUSCA */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Abas amigáveis */}
            <div className="flex items-center gap-1.5 p-1 bg-[#faf7f2] rounded-xl border border-[#e5e0d8] self-start md:self-auto overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'pending'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-amber-800'
                }`}
              >
                A Pagar ({stats.pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paid')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'paid'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-gray-700 hover:text-emerald-800'
                }`}
              >
                Histórico Pagos ({stats.paidCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-[#1a5d8f] text-white shadow-sm'
                    : 'text-gray-700 hover:text-[#1a5d8f]'
                }`}
              >
                Todos ({stats.totalCount})
              </button>
            </div>

            {/* Campo de Busca por Indicador / Cliente / PIX */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por indicador, PIX ou cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-[#e5e0d8] text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. VISÃO CONSOLIDADA POR INDICADOR (QUANDO NA ABA 'A PAGAR') */}
      {activeTab === 'pending' && groupedByIndicator.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0f2a43] flex items-center gap-2">
              <User className="w-4 h-4 text-[#1a5d8f]" />
              Resumo Consolidado por Indicador ({groupedByIndicator.length})
            </h2>
            <span className="text-xs text-gray-500">
              Agrupamento para pagamento de lote ou conferência rápida de PIX
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedByIndicator.map((grp) => (
              <Card
                key={grp.indicatorId}
                className="border-amber-200/80 bg-white hover:border-amber-300 transition-colors shadow-sm"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-[#0f2a43] leading-snug">
                        {grp.indicatorName}
                      </h3>
                      {grp.indicatorPhone && (
                        <p className="text-xs text-gray-500">{formatPhone(grp.indicatorPhone)}</p>
                      )}
                    </div>
                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-extrabold px-2 py-0.5">
                      {grp.bonuses.length} {grp.bonuses.length === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>

                  {/* PIX do Indicador */}
                  <div className="p-2.5 bg-[#faf7f2] rounded-xl border border-[#e5e0d8] text-xs flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase">
                        Chave PIX ({grp.indicatorPixType || 'PIX'}):
                      </span>
                      <span className="font-mono font-bold text-emerald-800 truncate block">
                        {grp.indicatorPix || 'Não cadastrada'}
                      </span>
                    </div>
                    {grp.indicatorPix && (
                      <button
                        type="button"
                        onClick={() => handleCopyPix(grp.indicatorPix!)}
                        className="text-gray-500 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#e5e0d8] shrink-0"
                        title="Copiar Chave PIX"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Total a Pagar ao Indicador */}
                  <div className="flex items-baseline justify-between pt-1 border-t border-[#e5e0d8]">
                    <span className="text-xs text-gray-500 font-medium">Total a Pagar:</span>
                    <span className="text-lg font-extrabold text-amber-700">
                      {formatCurrency(grp.totalPending)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 5. TABELA / LISTA DETALHADA DE BÔNUS */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-[#e5e0d8] pb-4 bg-gradient-to-r from-[#faf7f2] to-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#0f2a43]">
                Lista Detalhada de Bônus ({filteredBonuses.length})
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Cada registro de bonificação individual gerado por indicações concluídas
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1a5d8f]" />
              Carregando dados financeiros...
            </div>
          ) : filteredBonuses.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0f2a43]">Nenhum bônus encontrado</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {activeTab === 'pending'
                  ? 'Não há bônus pendentes de pagamento no momento. Todas as bonificações geradas estão quitadas.'
                  : 'Nenhum registro corresponde aos filtros ou busca selecionados.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e5e0d8]">
              {filteredBonuses.map((bonus) => {
                const indicator = bonus.expand?.indicator_id
                const referral = bonus.expand?.referral_id
                const isPaid = bonus.status === 'paid' || bonus.payment_status === 'paid'

                return (
                  <div
                    key={bonus.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-[#faf7f2]/50 transition-colors"
                  >
                    {/* Informações do Indicador e da Indicação */}
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#0f2a43]">
                          {indicator?.full_name || 'Indicador Parceiro'}
                        </span>
                        {getBonusTypeBadge(bonus)}
                        {isPaid ? (
                          <Badge className="bg-emerald-600 text-white text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Pago via PIX
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[11px] font-semibold">
                            <Clock className="w-3 h-3 mr-1 text-amber-700" />
                            Aguardando Pagamento
                          </Badge>
                        )}
                      </div>

                      {/* Dados da Indicação Associada */}
                      <div className="text-xs text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {referral && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            Cliente:{' '}
                            <strong className="text-gray-800">{referral.client_name}</strong>
                          </span>
                        )}

                        {indicator?.pix_key && (
                          <span className="inline-flex items-center gap-1 font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                            PIX: {indicator.pix_key}
                          </span>
                        )}

                        {bonus.deal_value ? (
                          <span className="text-gray-500">
                            Negócio: {formatCurrency(bonus.deal_value)}
                          </span>
                        ) : null}

                        <span className="text-gray-400 inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Gerado em {formatDateTime(bonus.created)}
                        </span>
                      </div>

                      {/* Dados adicionais caso já pago */}
                      {isPaid && bonus.paid_at && (
                        <p className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                          Liquidado em {formatDateTime(bonus.paid_at)}
                          {bonus.pix_key_used && (
                            <>
                              {' '}
                              • Chave: <span className="font-mono">{bonus.pix_key_used}</span>
                            </>
                          )}
                          {bonus.payment_notes && <> • Obs: "{bonus.payment_notes}"</>}
                        </p>
                      )}
                    </div>

                    {/* Valor e Ação */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e5e0d8]">
                      <div className="sm:text-right">
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">
                          Valor do Bônus
                        </span>
                        <span
                          className={`text-xl sm:text-2xl font-extrabold ${
                            isPaid ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {formatCurrency(bonus.amount)}
                        </span>
                      </div>

                      {!isPaid && (
                        <Button
                          type="button"
                          onClick={() => handleOpenPayment(bonus)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-10 px-4 rounded-xl text-xs shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Marcar como Pago
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. MODAL DE CONFIRMAÇÃO DE PAGAMENTO PIX */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#e5e0d8] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0f2a43] flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-700" />
              Confirmar Pagamento de Bonificação
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Registrar o PIX realizado. A indicação será automaticamente movida para o status
              "Bonificação paga".
            </DialogDescription>
          </DialogHeader>

          {selectedBonus && (
            <form onSubmit={handleConfirmPayment} className="space-y-4 pt-2">
              {/* Box de Resumo do Pagamento */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-emerald-900 font-semibold">Valor a Pagar:</span>
                  <span className="text-2xl font-extrabold text-emerald-800">
                    {formatCurrency(selectedBonus.amount)}
                  </span>
                </div>
                <div className="text-xs text-emerald-950/80 pt-1 border-t border-emerald-200/80 space-y-0.5">
                  <p>
                    <strong>Beneficiário:</strong>{' '}
                    {selectedBonus.expand?.indicator_id?.full_name || 'Indicador'}
                  </p>
                  {selectedBonus.expand?.referral_id?.client_name && (
                    <p>
                      <strong>Indicação:</strong> {selectedBonus.expand?.referral_id?.client_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Chave PIX */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">Chave PIX Utilizada</label>
                  {pixKeyUsed && (
                    <button
                      type="button"
                      onClick={() => handleCopyPix(pixKeyUsed)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold"
                    >
                      {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedKey ? 'Copiado!' : 'Copiar Chave'}
                    </button>
                  )}
                </div>
                <Input
                  type="text"
                  placeholder="Ex: CPF, Telefone, E-mail ou Chave Aleatória"
                  value={pixKeyUsed}
                  onChange={(e) => setPixKeyUsed(e.target.value)}
                  className="rounded-xl border-[#e5e0d8] h-10 text-xs font-mono"
                  required
                />
              </div>

              {/* Notas de Pagamento (Comprovante / ID Transação) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Comprovante / ID de Transação (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: ID PIX E123... ou 'Enviado pelo Nubank'"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="rounded-xl border-[#e5e0d8] h-10 text-xs"
                />
              </div>

              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={isSubmittingPayment}
                  className="rounded-xl border-[#e5e0d8] text-xs h-10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs h-10"
                >
                  {isSubmittingPayment ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  )}
                  {isSubmittingPayment ? 'Salvando...' : 'Confirmar e Quitar'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
