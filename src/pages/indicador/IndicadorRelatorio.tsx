import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  Send,
  HelpCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { generateReport, downloadReportUrl, type ReportFormat } from '@/services/reports'

export default function IndicadorRelatorio() {
  const [isGenerating, setIsGenerating] = useState<ReportFormat | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<{
    format: ReportFormat
    url: string
    fileName: string
    timestamp: string
  } | null>(null)

  const handleDownload = async (format: ReportFormat) => {
    setIsGenerating(format)
    setErrorMessage(null)

    try {
      const res = await generateReport({
        kind: 'indicator',
        format,
      })

      if (!res.success || !res.report_url) {
        setErrorMessage(res.error || 'Não foi possível gerar o relatório. Tente novamente.')
        return
      }

      setLastGenerated({
        format,
        url: res.report_url,
        fileName: res.file_name || `relatorio-indicador.${format === 'pdf' ? 'pdf' : 'xls'}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      })

      // Inicia o download no navegador
      downloadReportUrl(res.report_url, res.file_name)
    } catch (err) {
      console.error('Erro ao gerar relatório do indicador:', err)
      setErrorMessage('Não foi possível gerar o relatório. Tente novamente.')
    } finally {
      setIsGenerating(null)
    }
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* 1. TOPO DE NAVEGAÇÃO & TÍTULO */}
      <div className="space-y-3">
        <Link
          to="/indicador"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#1a5d8f] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o Painel do Indicador</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#1a5d8f]/10 text-[#1a5d8f] flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f2a43]">
                  Meu Relatório de Indicações
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Demonstrativo completo das suas indicações e do saldo de bonificação acumulado
                </p>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold py-1 self-start sm:self-auto"
          >
            Atualizado em tempo real
          </Badge>
        </div>
      </div>

      {/* 2. CARD PRINCIPAL DE GERAÇÃO */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#0f2a43] via-[#15466d] to-[#1a5d8f] text-white p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d9995b] mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Extrato Oficial do Parceiro</span>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">
            Baixar Relatório em PDF ou Excel
          </CardTitle>
          <CardDescription className="text-gray-200 text-xs sm:text-sm mt-1 leading-relaxed">
            Escolha o formato desejado para salvar ou imprimir o extrato de todas as oportunidades
            que você já cadastrou na Imobiliária Gabriel, com os valores e status de pagamento.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Mensagem de Erro amigável se houver falha */}
          {errorMessage && (
            <Alert
              variant="destructive"
              className="rounded-xl border-red-200 bg-red-50 text-red-900 p-4 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <AlertTitle className="font-bold text-xs sm:text-sm text-red-900">
                    Falha ao gerar extrato
                  </AlertTitle>
                  <AlertDescription className="text-xs text-red-700 mt-1">
                    {errorMessage}
                  </AlertDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setErrorMessage(null)
                  void handleDownload('pdf')
                }}
                className="border-red-300 text-red-800 hover:bg-red-100 text-xs shrink-0 rounded-lg h-8"
              >
                Tentar novamente
              </Button>
            </Alert>
          )}

          {/* Mensagem de Sucesso do último download */}
          {lastGenerated && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">
                    Relatório gerado com sucesso às {lastGenerated.timestamp}!
                  </p>
                  <p className="text-emerald-700 text-[11px]">
                    Arquivo: <span className="font-mono font-medium">{lastGenerated.fileName}</span>
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadReportUrl(lastGenerated.url, lastGenerated.fileName)}
                className="border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 rounded-lg text-xs h-8 font-semibold shrink-0"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Baixar novamente
              </Button>
            </div>
          )}

          {/* BOTÕES DE DOWNLOAD PDF E EXCEL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opção 1: PDF */}
            <div className="p-5 rounded-2xl border-2 border-[#e5e0d8] hover:border-[#1a5d8f] transition-all bg-[#faf7f2]/50 hover:bg-white flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-700 flex items-center justify-center font-bold">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#0f2a43]">Formato PDF</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ideal para leitura no celular, envio por WhatsApp ou impressão. Layout oficial com
                  logotipo e resumo financeiro.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => void handleDownload('pdf')}
                disabled={isGenerating !== null}
                className="w-full bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold h-11 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {isGenerating === 'pdf' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gerando PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Baixar PDF</span>
                  </>
                )}
              </Button>
            </div>

            {/* Opção 2: Excel */}
            <div className="p-5 rounded-2xl border-2 border-[#e5e0d8] hover:border-emerald-600 transition-all bg-[#faf7f2]/50 hover:bg-white flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#0f2a43]">Planilha Excel (XLS)</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Perfeito para abrir no Excel ou Google Planilhas, aplicar filtros e somas por
                  conta própria.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => void handleDownload('excel')}
                disabled={isGenerating !== null}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-11 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {isGenerating === 'excel' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gerando Excel...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Baixar Excel</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. O QUE ESTÁ INCLUSO NO RELATÓRIO (LINGUAGEM LEIGA) */}
      <Card className="border-[#e5e0d8] shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#0f2a43] flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#1a5d8f]" />
            <span>O que você encontrará no relatório?</span>
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Todas as informações são apresentadas em formato claro e sem jargões complicados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-[#faf7f2] border border-[#e5e0d8] space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0f2a43]">
                <Send className="w-4 h-4 text-[#1a5d8f]" />
                <span>Suas Indicações</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Data do envio, nome do cliente indicado, telefone, tipo de negócio (compra, locação,
                Vitacon SP) e status do atendimento.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#faf7f2] border border-[#e5e0d8] space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Bonificação Acumulada</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Soma total das recompensas conquistadas, com separação exata entre o valor já pago
                no PIX e os valores em liberação.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#faf7f2] border border-[#e5e0d8] space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Data de Pagamento</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Lembrete do calendário financeiro: as bonificações liberadas são liquidadas sempre
                no <strong>dia 10 de cada mês</strong> via PIX.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
