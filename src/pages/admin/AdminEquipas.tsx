import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users2, ArrowRight, Shield, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminEquipas() {
  const navigate = useNavigate()

  // Redireciona suavemente para a visão de equipes em /admin/configuracoes?tab=equipas
  // ou disponibiliza um botão direto caso o usuário prefira navegar conscientemente
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/admin/configuracoes?tab=equipas', { replace: true })
    }, 1200)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a5d8f]/10 text-xs font-semibold text-[#1a5d8f] mb-2">
            <Shield className="w-3.5 h-3.5" />
            Acesso Restrito: Master
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f2a43]">
            Gestão de Equipes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Redirecionando para a central unificada de equipes em Configurações...
          </p>
        </div>
      </div>

      <Card className="border-[#e5e0d8] shadow-xs bg-white">
        <CardHeader className="border-b border-[#e5e0d8] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-[#1a5d8f]" />
              <CardTitle className="text-lg font-bold text-[#0f2a43]">
                Central Unificada de Equipes & Membros
              </CardTitle>
            </div>
          </div>
          <CardDescription>
            A criação de equipes, líderes e vinculação de corretores agora é operada diretamente na
            página de Configurações do Master.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 pb-10 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[#0f2a43]">
              Módulo Ativo em Configurações
            </h3>
            <p className="text-xs text-gray-500">
              Você está sendo transferido para a aba de Equipes e Membros em Configurações.
            </p>
            <Button
              onClick={() => navigate('/admin/configuracoes?tab=equipas')}
              className="bg-[#1a5d8f] hover:bg-[#144a72] text-white font-semibold rounded-xl"
            >
              Acessar Equipes Agora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
