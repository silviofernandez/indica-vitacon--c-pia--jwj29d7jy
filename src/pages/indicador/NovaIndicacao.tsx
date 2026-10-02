import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Building2,
  User,
  Phone,
  FileText,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPhone } from '@/services/indicators'
import {
  createReferral,
  transcribeReferralAudio,
  type ReferralPropertyType,
} from '@/services/referrals'

const PROPERTY_TYPES: Array<{
  id: ReferralPropertyType
  label: string
  description: string
}> = [
  {
    id: 'buyer',
    label: 'Comprador',
    description: 'Pessoa interessada em comprar um imóvel',
  },
  {
    id: 'rental',
    label: 'Imóvel para alugar',
    description: 'Proprietário quer colocar para locação ou inquilino buscando',
  },
  {
    id: 'sale',
    label: 'Imóvel para vender',
    description: 'Proprietário quer anunciar imóvel para venda',
  },
  {
    id: 'vitacon',
    label: 'Vitacon SP',
    description: 'Oportunidades ou studios e apartamentos Vitacon em SP',
  },
]

export default function NovaIndicacao() {
  const navigate = useNavigate()

  // Estados do formulário
  const [clientName, setClientName] = useState('')
  const [clientContact, setClientContact] = useState('')
  const [propertyType, setPropertyType] = useState<ReferralPropertyType>('buyer')
  const [details, setDetails] = useState('')
  const [rawTranscription, setRawTranscription] = useState('')

  // Estados de áudio e gravação
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [audioSuccessMessage, setAudioSuccessMessage] = useState<string | null>(null)

  // Estados de envio
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{
    id: string
    name: string
    contact: string
    type: string
    slaDeadline: string
  } | null>(null)

  // Refs de controle de gravação
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<number | null>(null)

  // Limpeza de timers ao desmontar componente
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }, [])

  // Iniciar gravação de voz
  const startRecording = async () => {
    setAudioError(null)
    setAudioSuccessMessage(null)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioError(
        'Seu navegador não suporta gravação de áudio direto. Por favor, preencha os campos abaixo manualmente.',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      // Tenta tipos MIME suportados pelo navegador
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg'
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        // Encerra faixas do microfone
        stream.getTracks().forEach((track) => track.stop())

        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
        setIsRecording(false)

        const recordedBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        if (recordedBlob.size < 500) {
          setAudioError(
            'O áudio gravado ficou muito curto. Tente falar novamente por mais alguns segundos.',
          )
          return
        }

        // Envia para o backend para transcrição Whisper
        await handleTranscription(recordedBlob)
      }

      recorder.start(250) // coleta fatias a cada 250ms
      setIsRecording(true)
      setRecordingSeconds(0)

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch (err: unknown) {
      console.warn('Erro ao acessar microfone:', err)
      const isPermissionDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      if (isPermissionDenied) {
        setAudioError(
          'Permissão do microfone negada no seu navegador. Você pode liberar o acesso ou preencher os campos abaixo manualmente.',
        )
      } else {
        setAudioError(
          'Não conseguimos acessar o seu microfone. Você pode preencher os campos abaixo manualmente.',
        )
      }
      setIsRecording(false)
    }
  }

  // Parar gravação de voz
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop()
      } catch (err) {
        console.warn('Erro ao finalizar gravação:', err)
      }
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setIsRecording(false)
  }

  // Envio do Blob de áudio ao backend
  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true)
    setAudioError(null)

    const res = await transcribeReferralAudio(blob)
    setIsTranscribing(false)

    if (!res.success || !res.data) {
      setAudioError(
        res.error || 'Não consegui ouvir o áudio, tente de novo ou preencha manualmente.',
      )
      return
    }

    const { text, name, phone } = res.data
    const cleanText = (text || '').trim()

    if (!cleanText) {
      setAudioError(
        'Não consegui ouvir nenhuma fala no áudio gravado. Tente de novo ou preencha manualmente.',
      )
      return
    }

    // Guarda texto bruto
    setRawTranscription(cleanText)

    // Preenche nome se extraído
    if (name && !clientName) {
      setClientName(name)
    }

    // Preenche telefone se extraído
    if (phone && !clientContact) {
      setClientContact(phone)
    }

    // Adiciona o texto bruto aos detalhes caso o usuário queira complementar
    setDetails((prev) => {
      if (!prev) return cleanText
      return `${prev}\n\n[Transcrição da fala]: ${cleanText}`
    })

    const extractedItems: string[] = []
    if (name) extractedItems.push(`Nome: ${name}`)
    if (phone) extractedItems.push(`Contato: ${phone}`)

    if (extractedItems.length > 0) {
      setAudioSuccessMessage(
        `Áudio transcrito com sucesso! Identificamos ${extractedItems.join(' e ')}. Você pode conferir ou ajustar os campos.`,
      )
    } else {
      setAudioSuccessMessage(
        'Áudio transcrito com sucesso! Inserimos o conteúdo nos Detalhes para você.',
      )
    }
  }

  // Formatação de minutos:segundos do temporizador
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Envio da indicação
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    // Validação mínima
    if (!clientName.trim()) {
      setSubmitError('Por favor, informe o nome da pessoa indicada.')
      return
    }

    const contactDigits = clientContact.replace(/\D/g, '')
    if (contactDigits.length < 8) {
      setSubmitError('Por favor, informe um telefone ou WhatsApp de contato válido com DDD.')
      return
    }

    if (!propertyType) {
      setSubmitError('Selecione o tipo da indicação.')
      return
    }

    setIsSubmitting(true)

    const res = await createReferral({
      client_name: clientName.trim(),
      client_contact: clientContact.trim(),
      property_type: propertyType,
      details: details.trim(),
      raw_transcription: rawTranscription.trim(),
    })

    setIsSubmitting(false)

    if (!res.success || !res.data) {
      setSubmitError(
        res.error || 'Não foi possível registrar a sua indicação. Tente novamente em instantes.',
      )
      return
    }

    // Define tela de sucesso com SLA visível
    const typeLabel = PROPERTY_TYPES.find((t) => t.id === propertyType)?.label || 'Indicação'
    setSuccessInfo({
      id: res.data.id || '',
      name: clientName.trim(),
      contact: clientContact.trim(),
      type: typeLabel,
      slaDeadline: res.data.sla_deadline || '',
    })
  }

  // Reiniciar formulário para cadastrar outra indicação
  const handleResetForm = () => {
    setClientName('')
    setClientContact('')
    setPropertyType('buyer')
    setDetails('')
    setRawTranscription('')
    setAudioError(null)
    setAudioSuccessMessage(null)
    setSubmitError(null)
    setSuccessInfo(null)
  }

  // Visualização de sucesso
  if (successInfo) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        <Card className="border-emerald-200 bg-white shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Indicação enviada com sucesso!
            </h1>
            <p className="text-emerald-50 text-sm mt-1 max-w-md mx-auto">
              Recebemos os dados do cliente e já acionamos nossa equipe imobiliária.
            </p>
          </div>

          <CardContent className="pt-6 pb-8 px-6 space-y-6">
            {/* Box com SLA em destaque e linguagem simples */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-950">
                  Prazo de primeiro contato: até 3 horas
                </p>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                  Nossa equipe de especialistas entrará em contato com o cliente em até 3 horas para
                  iniciar o atendimento com prioridade total.
                </p>
              </div>
            </div>

            {/* Resumo da indicação */}
            <div className="space-y-3 border border-[#e5e0d8] rounded-2xl p-4 bg-[#faf7f2]/50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Resumo da indicação
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-gray-500 block">Cliente:</span>
                  <span className="font-semibold text-[#0f2a43]">{successInfo.name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Contato:</span>
                  <span className="font-semibold text-[#0f2a43]">{successInfo.contact}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-500 block">Tipo:</span>
                  <Badge className="bg-[#1a5d8f] text-white hover:bg-[#1a5d8f] mt-0.5">
                    {successInfo.type}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Ações pós envio */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                onClick={handleResetForm}
                variant="outline"
                className="flex-1 h-12 rounded-xl border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#1a5d8f]/5 font-semibold flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Fazer outra indicação
              </Button>
              <Button
                type="button"
                onClick={() => navigate('/indicador')}
                className="flex-1 h-12 rounded-xl bg-[#1a5d8f] hover:bg-[#154a73] text-white font-bold flex items-center justify-center gap-2 shadow"
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
          className="text-gray-600 hover:text-[#1a5d8f] -ml-2"
        >
          <Link to="/indicador" className="flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o início
          </Link>
        </Button>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          Atendimento em até 3h
        </span>
      </div>

      <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden">
        {/* Cabeçalho da Página */}
        <CardHeader className="border-b border-[#e5e0d8] pb-5 bg-gradient-to-b from-[#faf7f2] to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1a5d8f] text-white flex items-center justify-center shadow-sm shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-[#0f2a43]">
                Nova Indicação
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Indique alguém pelo microfone em poucos segundos ou preencha o formulário abaixo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 sm:pt-8 pb-8 px-4 sm:px-8 space-y-8">
          {/* ============================================================== */}
          {/* 1. SEÇÃO DE MICROFONE EM DESTAQUE (Elemento Principal da Tela) */}
          {/* ============================================================== */}
          <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#faf7f2] via-[#f5f0e6] to-[#faf7f2] border-2 border-[#d9995b]/40 text-center shadow-sm">
            <div className="max-w-md mx-auto space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#d9995b]/40 text-[#c48548] text-xs font-bold uppercase tracking-wider shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#d9995b]" />
                Modo Rápido por Voz
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#0f2a43]">
                  Grave um áudio falando sobre o cliente
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Exemplo:{' '}
                  <span className="italic">
                    "Quero indicar a Mariana Santos, o telefone dela é 11 98888-7777, quer comprar
                    um apartamento na zona sul."
                  </span>
                </p>
              </div>

              {/* Botão de Microfone Gigante em Destaque Mobile-First (Dominante no celular) */}
              <div className="py-4 sm:py-6 flex flex-col items-center justify-center">
                {!isRecording && !isTranscribing && (
                  <div className="flex flex-col items-center text-center space-y-3">
                    <button
                      type="button"
                      onClick={startRecording}
                      className="group relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#0f2a43] via-[#1a5d8f] to-[#2b88c9] text-white flex flex-col items-center justify-center shadow-2xl hover:shadow-[#1a5d8f]/40 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-hidden focus:ring-4 focus:ring-[#1a5d8f]/40 touch-manipulation cursor-pointer border-4 border-white ring-4 ring-[#1a5d8f]/20"
                      aria-label="Iniciar gravação de áudio por voz"
                    >
                      <span className="p-3 rounded-full bg-white/15 backdrop-blur-xs group-hover:scale-110 transition-transform">
                        <Mic className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-sm text-white" />
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold mt-1.5 tracking-wider uppercase drop-shadow-sm">
                        Toque e Fale
                      </span>
                      {/* Anéis visuais de destaque chamativos no celular */}
                      <span className="absolute -inset-1 rounded-full border-2 border-[#1a5d8f]/30 animate-pulse pointer-events-none" />
                      <span className="absolute -inset-3 rounded-full border border-[#1a5d8f]/20 pointer-events-none" />
                    </button>
                    <p className="text-xs font-semibold text-[#1a5d8f] max-w-xs">
                      Fale o nome e WhatsApp do indicado que nós preenchemos tudo para você!
                    </p>
                  </div>
                )}

                {isRecording && (
                  <div className="flex flex-col items-center space-y-3.5">
                    <div className="relative">
                      {/* Animação de pulso vermelho forte de gravação em celular */}
                      <span className="absolute -inset-4 rounded-full bg-rose-500/25 animate-ping pointer-events-none" />
                      <span className="absolute -inset-2 rounded-full bg-rose-500/30 animate-pulse pointer-events-none" />
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-rose-700 to-rose-500 hover:bg-rose-700 text-white flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-transform touch-manipulation cursor-pointer border-4 border-white ring-4 ring-rose-400/40"
                        aria-label="Parar gravação"
                      >
                        <span className="p-3 rounded-full bg-white/20 backdrop-blur-xs">
                          <Square className="w-10 h-10 fill-current" />
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold mt-1 tracking-wider uppercase">
                          Concluir Áudio
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-rose-100 border border-rose-300 text-rose-900 text-sm font-mono font-extrabold animate-pulse shadow-xs">
                      <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                      Gravando: {formatTimer(recordingSeconds)}
                    </div>
                    <p className="text-xs font-medium text-gray-600 text-center max-w-xs">
                      Toque no botão vermelho acima para transcrever com a inteligência artificial.
                    </p>
                  </div>
                )}

                {isTranscribing && (
                  <div className="flex flex-col items-center space-y-3 py-2">
                    <div className="w-20 h-20 rounded-full bg-[#1a5d8f]/10 text-[#1a5d8f] flex items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-[#0f2a43]">Ouvindo seu áudio...</p>
                      <p className="text-xs text-gray-500">
                        Identificando o nome e telefone do cliente indicado
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mensagens de Sucesso ou Erro no Áudio */}
              {audioSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5 text-left">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{audioSuccessMessage}</p>
                </div>
              )}

              {audioError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 text-left">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{audioError}</p>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* 2. FORMULÁRIO COM POUCOS CAMPOS (Mobile-First, sem jargão) */}
          {/* ============================================================== */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-[#e5e0d8] pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                Dados da Indicação
              </h3>
            </div>

            {/* Campo 1: Nome da Pessoa Indicada */}
            <div className="space-y-2">
              <label
                htmlFor="client_name"
                className="text-sm font-bold text-[#0f2a43] flex items-center gap-2"
              >
                <User className="w-4 h-4 text-[#1a5d8f]" />
                Nome do cliente <span className="text-rose-500">*</span>
              </label>
              <Input
                id="client_name"
                name="client_name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex.: Carlos Eduardo Santos"
                className="h-12 rounded-xl text-base border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                required
              />
            </div>

            {/* Campo 2: Telefone / WhatsApp com máscara */}
            <div className="space-y-2">
              <label
                htmlFor="client_contact"
                className="text-sm font-bold text-[#0f2a43] flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-[#1a5d8f]" />
                Telefone ou WhatsApp <span className="text-rose-500">*</span>
              </label>
              <Input
                id="client_contact"
                name="client_contact"
                type="tel"
                value={clientContact}
                onChange={(e) => setClientContact(formatPhone(e.target.value))}
                placeholder="(11) 98765-4321"
                className="h-12 rounded-xl text-base border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                required
              />
              <p className="text-xs text-gray-500">
                Número com DDD para nossa equipe entrar em contato.
              </p>
            </div>

            {/* Campo 3: Tipo de Indicação (4 opções em botões/chips de toque fácil) */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-[#0f2a43] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1a5d8f]" />
                Tipo de indicação <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROPERTY_TYPES.map((type) => {
                  const isSelected = propertyType === type.id
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setPropertyType(type.id)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between min-h-[76px] cursor-pointer ${
                        isSelected
                          ? 'border-[#1a5d8f] bg-[#1a5d8f]/5 ring-2 ring-[#1a5d8f]'
                          : 'border-[#e5e0d8] bg-white hover:bg-[#faf7f2]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-sm font-bold ${
                            isSelected ? 'text-[#1a5d8f]' : 'text-[#0f2a43]'
                          }`}
                        >
                          {type.label}
                        </span>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-[#1a5d8f] bg-[#1a5d8f]'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-snug">{type.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Campo 4: Detalhes opcionais */}
            <div className="space-y-2">
              <label
                htmlFor="details"
                className="text-sm font-bold text-[#0f2a43] flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1a5d8f]" />
                  Detalhes adicionais
                </span>
                <span className="text-xs font-normal text-gray-500">Opcional</span>
              </label>
              <Textarea
                id="details"
                name="details"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Ex.: Procura imóvel de 2 dormitórios com garagem na região central. Preferência por atendimento após as 14h."
                className="rounded-xl text-sm border-[#e5e0d8] focus-visible:ring-[#1a5d8f] resize-y"
              />
            </div>

            {/* Painel visível com o texto bruto da transcrição se houver */}
            {rawTranscription && (
              <div className="p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e5e0d8] text-xs text-gray-600 space-y-1">
                <span className="font-bold text-[#0f2a43] block">
                  Texto capturado pelo microfone:
                </span>
                <p className="italic leading-relaxed text-gray-700">"{rawTranscription}"</p>
              </div>
            )}

            {/* Erro no envio */}
            {submitError && (
              <div className="flex items-start justify-between gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{submitError}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    setSubmitError(null)
                    void handleSubmit(e)
                  }}
                  className="border-red-300 text-red-800 hover:bg-red-100 text-xs shrink-0 rounded-lg h-7 px-2"
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {/* Botão de Envio Principal */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || isRecording || isTranscribing}
                className="w-full h-14 rounded-2xl bg-[#1a5d8f] hover:bg-[#154a73] text-white font-bold text-base shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando indicação...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Indicação
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-gray-500 mt-2 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Nossa equipe responde em até 3 horas.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
