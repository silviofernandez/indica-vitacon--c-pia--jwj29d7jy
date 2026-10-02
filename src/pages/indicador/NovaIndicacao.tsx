import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  RotateCcw,
  Sparkles,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPhone } from '@/services/indicators'
import { createVitaconReferral } from '@/services/referrals'
import {
  listEmpreendimentos,
  listUnidades,
  type EmpreendimentoRecord,
  type UnidadeRecord,
} from '@/services/vitacon'

export default function NovaIndicacao() {
  const navigate = useNavigate()

  // Dados do formulário da indicação
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [empreendimentoId, setEmpreendimentoId] = useState('')
  const [unidadeEscolhidaId, setUnidadeEscolhidaId] = useState('')
  const [notes, setNotes] = useState('')

  // Listas de empreendimentos e unidades disponíveis
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoRecord[]>([])
  const [unidades, setUnidades] = useState<UnidadeRecord[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // Estados de envio
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{
    id: string
    name: string
    contact: string
  } | null>(null)

  // Carrega opções de empreendimentos
  useEffect(() => {
    async function loadData() {
      setLoadingOptions(true)
      const emps = await listEmpreendimentos(true)
      setEmpreendimentos(emps)
      setLoadingOptions(false)
    }
    void loadData()
  }, [])

  // Carrega unidades quando o empreendimento de interesse for selecionado
  useEffect(() => {
    async function loadUnis() {
      if (!empreendimentoId) {
        setUnidades([])
        setUnidadeEscolhidaId('')
        return
      }
      const unis = await listUnidades(empreendimentoId)
      setUnidades(unis)
    }
    void loadUnis()
  }, [empreendimentoId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!clientName.trim()) {
      setSubmitError('Por favor, informe o nome completo da pessoa indicada.')
      return
    }

    const contactDigits = clientPhone.replace(/\D/g, '')
    if (contactDigits.length < 8) {
      setSubmitError('Por favor, informe um telefone ou WhatsApp com DDD.')
      return
    }

    setIsSubmitting(true)
    const res = await createVitaconReferral({
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      client_email: clientEmail.trim() || undefined,
      empreendimento_id: empreendimentoId || undefined,
      unidade_escolhida_id: unidadeEscolhidaId || undefined,
      notes: notes.trim() || undefined,
    })
    setIsSubmitting(false)

    if (!res.success) {
      setSubmitError(res.error || 'Erro ao registrar a indicação.')
      return
    }

    setSuccessInfo({
      id: res.data?.id || '',
      name: clientName.trim(),
      contact: clientPhone.trim(),
    })
  }

  const handleResetForm = () => {
    setClientName('')
    setClientPhone('')
    setClientEmail('')
    setEmpreendimentoId('')
    setUnidadeEscolhidaId('')
    setNotes('')
    setSubmitError(null)
    setSuccessInfo(null)
  }

  if (successInfo) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <Card className="border-emerald-200 bg-white shadow-lg overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Indicação Enviada com Sucesso!
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-md mx-auto">
              Sua indicação para a Vitacon já foi registrada. Você pode acompanhar todas as etapas
              em tempo real no seu painel.
            </p>
          </div>

          <CardContent className="pt-6 pb-8 px-6 space-y-6">
            <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Resumo da Indicação Vitacon
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Indicado:</span>
                  <span className="font-semibold text-slate-900">{successInfo.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Contato:</span>
                  <span className="font-semibold text-slate-900">{successInfo.contact}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-slate-500 block">Estágio Inicial:</span>
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 mt-1">
                    Lead enviado (Em análise comercial)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                onClick={handleResetForm}
                variant="outline"
                className="flex-1 h-12 rounded-xl border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Fazer outra indicação
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/indicador')}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow"
              >
                Voltar para o Painel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Botão Superior Voltar */}
      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-emerald-700 -ml-2"
        >
          <Link to="/indicador" className="flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o painel
          </Link>
        </Button>
        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          Programa de Indicação Vitacon
        </span>
      </div>

      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-100 pb-5 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900">
                Nova Indicação Vitacon
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Informe os dados do interessado. Nossa equipe conduzirá a apresentação e negociação.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 sm:pt-8 pb-8 px-4 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p>{submitError}</p>
              </div>
            )}

            {/* DADOS DO INDICADO */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Dados de Contato do Indicado
              </h3>

              <div className="space-y-1.5">
                <label
                  htmlFor="client_name"
                  className="text-sm font-semibold text-slate-900 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  Nome completo da pessoa indicada <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="client_name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex.: Mariana Fernandes Ribeiro"
                  className="h-11 rounded-xl text-base border-slate-200 focus-visible:ring-emerald-600"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="client_phone"
                    className="text-sm font-semibold text-slate-900 flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    Telefone / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="client_phone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="h-11 rounded-xl text-base border-slate-200 focus-visible:ring-emerald-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="client_email"
                    className="text-sm font-semibold text-slate-900 flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4 text-emerald-600" />
                    E-mail <span className="text-xs font-normal text-slate-400">(opcional)</span>
                  </label>
                  <Input
                    id="client_email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="mariana@exemplo.com"
                    className="h-11 rounded-xl text-base border-slate-200 focus-visible:ring-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* INTERESSE OU UNIDADE PRÉ-ESCOLHIDA (OPCIONAL) */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Empreendimento de Interesse (Opcional)
                </h3>
                <span className="text-xs text-slate-500">
                  Pode ser definido ou ajustado durante a negociação
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="emp_select"
                    className="text-sm font-semibold text-slate-900 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Empreendimento Vitacon
                  </label>
                  <select
                    id="emp_select"
                    value={empreendimentoId}
                    onChange={(e) => setEmpreendimentoId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">Selecione se já souber o interesse...</option>
                    {empreendimentos.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome} {emp.bairro ? `(${emp.bairro})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="uni_select"
                    className="text-sm font-semibold text-slate-900 flex items-center gap-2"
                  >
                    <Home className="w-4 h-4 text-emerald-600" />
                    Unidade específica
                  </label>
                  <select
                    id="uni_select"
                    value={unidadeEscolhidaId}
                    onChange={(e) => setUnidadeEscolhidaId(e.target.value)}
                    disabled={!empreendimentoId || unidades.length === 0}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50"
                  >
                    <option value="">
                      {!empreendimentoId
                        ? 'Selecione primeiro o empreendimento'
                        : unidades.length === 0
                          ? 'Nenhuma unidade disponível no momento'
                          : 'Deixar em aberto / a escolher'}
                    </option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.identificacao}{' '}
                        {u.valor ? `• R$ ${Number(u.valor).toLocaleString('pt-BR')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* OBSERVAÇÕES / DETALHES */}
            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="text-sm font-semibold text-slate-900 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Observações sobre o perfil ou preferências
                </span>
                <span className="text-xs font-normal text-slate-400">Opcional</span>
              </label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: Interesse para moradia ou investimento em locação. Prefere contato no período da tarde via WhatsApp."
                className="rounded-xl text-sm border-slate-200 focus-visible:ring-emerald-600"
              />
            </div>

            {/* AVISO DE VISIBILIDADE E COMISSÃO */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Transparência total na negociação</span>
              </div>
              <p className="leading-relaxed text-emerald-800">
                Assim que enviada, você acompanhará cada estágio no painel (Reunião realizada →
                Gostou → Ficou de pensar → Proposta → Fechamento). A unidade definitiva e o valor da
                compra serão confirmados no fechamento para cálculo da sua comissão.
              </p>
            </div>

            {/* SUBMIT BUTTON */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando indicação...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Cadastrar Indicação Vitacon
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
