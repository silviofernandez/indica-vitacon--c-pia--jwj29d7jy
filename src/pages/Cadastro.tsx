import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, ArrowRight, Building2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VitaconLogo from '@/components/VitaconLogo'

export default function Cadastro() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl mx-auto w-full text-center space-y-6">
        <div className="flex justify-center mb-2">
          <VitaconLogo variant="dark" size="lg" />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20 text-slate-900 space-y-6 text-left">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Acesso Exclusivo a Clientes Vitacon
              </h1>
              <p className="text-xs text-slate-500">
                Programa restrito a compradores de unidades Vitacon
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              O Programa de Indicação Vitacon{' '}
              <strong>não possui auto-cadastro público aberto</strong> na web.
            </p>
            <p>
              Conforme a política do programa, apenas clientes com{' '}
              <strong>unidade comprovadamente adquirida</strong> na Vitacon são autorizados como
              indicadores pela administração e recebem suas credenciais oficiais (e-mail e senha de
              acesso).
            </p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Já comprou sua unidade Vitacon?</span>
            </div>
            <p className="leading-relaxed">
              Entre em contato com o seu corretor ou gestor administrativo da Vitacon para ativação
              imediata do seu acesso de indicador.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow"
            >
              <Link to="/login" className="flex items-center justify-center gap-2">
                Acessar Plataforma (Login)
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 h-11 rounded-xl"
            >
              <Link to="/">Voltar ao Início</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
