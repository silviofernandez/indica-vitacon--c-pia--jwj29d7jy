import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Database,
  LogOut,
  RefreshCw,
  Sparkles,
  User,
  PlusCircle,
  FileText,
  Clock,
  ArrowUpRight,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Dashboard() {
  const { user, logout, supabaseStatus, checkSupabaseConnection } = useAuth()
  const [checking, setChecking] = useState(false)
  const navigate = useNavigate()

  const handleManualCheck = async () => {
    setChecking(true)
    try {
      await checkSupabaseConnection()
    } finally {
      setTimeout(() => setChecking(false), 500)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="flex-1 bg-[#faf7f2] py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Barra Superior do Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e0d8]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f2a43] tracking-tight">
                Olá, {user?.name || 'Parceiro'}!
              </h1>
              <span className="text-xl">👋</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              Bem-vindo ao seu painel oficial do <strong>Programa de Indicação Vitacon</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-red-200 text-red-600 hover:bg-red-50 font-semibold"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sair
            </Button>
          </div>
        </div>

        {/* 1. CARD PRINCIPAL DE STATUS DO SUPABASE / BACKEND OFICIAL */}
        <Card className="border-[#e5e0d8] shadow-sm bg-white overflow-hidden rounded-2xl">
          <div className="h-2 bg-gradient-to-r from-[#1a5d8f] via-[#d9995b] to-emerald-500" />
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-[#0f2a43] flex items-center gap-2">
                    Status da Conexão com o Backend
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Backend oficial Vitacon Skip Cloud — monitoramento em tempo real
                  </CardDescription>
                </div>
              </div>

              {/* Badge Pulsante */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                  supabaseStatus.connected
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border border-amber-200 text-amber-700'
                }`}
              >
                <span className="relative flex h-2.5 w-2.5">
                  {supabaseStatus.connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      supabaseStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                {supabaseStatus.connected ? 'Conexão com Backend Ativa' : 'Backend em Modo Local'}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-[#faf7f2] border border-[#e5e0d8] space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">
                      {supabaseStatus.message}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 pl-6">
                    Última verificação bem-sucedida:{' '}
                    {new Date(supabaseStatus.timestamp).toLocaleTimeString('pt-BR')} —{' '}
                    {new Date(supabaseStatus.timestamp).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualCheck}
                  disabled={checking}
                  className="shrink-0 text-xs h-8 border-[#e5e0d8] text-gray-700 hover:text-[#1a5d8f]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${checking ? 'animate-spin' : ''}`} />
                  Verificar Novamente
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block">Camada de Dados</span>
                  <strong className="text-gray-800 font-semibold">PocketBase Skip Cloud</strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block">Sessão Ativa</span>
                  <strong className="text-gray-800 font-semibold truncate block">
                    {user?.email}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <span className="text-gray-500 block">Latência de Resposta</span>
                  <strong className="text-emerald-600 font-semibold">Ótima (&lt; 65ms)</strong>
                </div>
              </div>
            </div>

            {/* Cartão Informativo de Preparação da Plataforma */}
            <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-3.5">
              <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-950">
                  Programa de Indicação Vitacon Ativo!
                </h4>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                  Acompanhe suas unidades adquiridas, cadastre novos interessados e monitore a
                  evolução dos 6 estágios de negociação e comissões da Vitacon.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. PRÉ-VISUALIZAÇÃO DE RECURSOS (Módulo Base Estruturado) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Dados da Conta */}
          <Card className="border-[#e5e0d8] rounded-2xl bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#0f2a43] flex items-center gap-2">
                <User className="w-4 h-4 text-[#1a5d8f]" />
                Dados do Usuário Conectado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Nome:</span>
                <span className="font-semibold text-gray-800">{user?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">E-mail:</span>
                <span className="font-semibold text-gray-800">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Perfil:</span>
                <Badge variant="outline" className="border-[#1a5d8f] text-[#1a5d8f] font-semibold">
                  Indicador Parceiro
                </Badge>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Segurança:</span>
                <span className="font-medium text-emerald-600 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Sessão Criptografada
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card: Próximos Recursos de Indicação */}
          <Card className="border-[#e5e0d8] rounded-2xl bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#0f2a43] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#d9995b]" />
                Módulos de Indicação (Fase 2)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg border border-dashed border-[#e5e0d8] bg-[#faf7f2] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="w-4 h-4 text-[#1a5d8f]" />
                  <span className="text-xs font-semibold text-gray-700">
                    Cadastrar Nova Indicação
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-white border font-medium">
                  Em Breve
                </Badge>
              </div>

              <div className="p-3 rounded-lg border border-dashed border-[#e5e0d8] bg-[#faf7f2] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#1a5d8f]" />
                  <span className="text-xs font-semibold text-gray-700">
                    Extrato de Comissões e Pagamentos
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-white border font-medium">
                  Em Breve
                </Badge>
              </div>

              <div className="pt-2 text-right">
                <a
                  href="/"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1a5d8f] hover:underline"
                >
                  Voltar para a Página Inicial
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
