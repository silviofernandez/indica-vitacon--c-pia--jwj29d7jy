import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Send,
  Eye,
  Award,
  ShieldCheck,
  Building2,
  Sparkles,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import VitaconLogo from '@/components/VitaconLogo'
import { Sparkles, Check, KeyRound, Building, TrendingUp } from 'lucide-react'

export default function Index() {
  return (
    <div className="flex flex-col w-full">
      {/* 1. SEÇÃO HERO: Vitacon Smart Living & Remuneração Exclusiva */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white pt-16 pb-24 md:pt-24 md:pb-32 min-h-[calc(100vh-80px)] flex items-center">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Bloco de Texto */}
            <div className="lg:col-span-7 flex flex-col items-start space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Exclusivo para Proprietários Vitacon</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                Indique amigos para comprar na{' '}
                <span className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-8">
                  Vitacon
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl font-normal">
                Você que já adquiriu uma unidade Vitacon pode indicar novos compradores e receber
                comissão direta por cada fechamento realizado. Acompanhe todas as etapas da
                negociação em tempo real.
              </p>

              {/* Botões CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto pt-2">
                <Button
                  asChild
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-7 py-6 rounded-xl shadow-lg shadow-emerald-900/30 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Link to="/login" className="flex items-center justify-center gap-2">
                    Acessar Meu Painel
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold text-base px-6 py-6 rounded-xl backdrop-blur-sm transition-all duration-200"
                >
                  <a href="#como-funciona" className="flex items-center justify-center">
                    Como Funciona
                  </a>
                </Button>
              </div>

              {/* Regras Claras */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Requer unidade comprada na Vitacon</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Cadastro autorizado pela administração</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Comissão configurável por compra</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Controle total dos 6 estágios</span>
                </div>
              </div>
            </div>

            {/* Simulação Visual do Card da Linha do Tempo */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-white/20">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <VitaconLogo size="sm" />
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">
                    Estágio 5 de 6: Proposta
                  </Badge>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600 border border-slate-200/80">
                  <p className="font-bold text-slate-900 text-sm">ON Paulista Vitacon</p>
                  <p>
                    Unidade Escolhida:{' '}
                    <strong className="text-slate-800">Studio 1202 - Torre A</strong>
                  </p>
                  <p>
                    Indicado: <strong className="text-slate-800">Mariana Ribeiro</strong>
                  </p>
                  <div className="pt-2 flex justify-between items-center text-emerald-700 font-bold border-t border-slate-200 mt-2">
                    <span>Comissão Estimada (1%):</span>
                    <span className="text-base text-emerald-800">R$ 4.900,00</span>
                  </div>
                </div>

                {/* 6 Estágios Mini-Timeline */}
                <div className="mt-5 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Linha do Tempo da Negociação
                  </p>
                  <div className="grid grid-cols-6 gap-1 text-[9px] text-center font-semibold">
                    <div className="p-1 rounded bg-emerald-500 text-white">Lead</div>
                    <div className="p-1 rounded bg-emerald-500 text-white">Reunião</div>
                    <div className="p-1 rounded bg-emerald-500 text-white">Gostou</div>
                    <div className="p-1 rounded bg-emerald-500 text-white">Pensar</div>
                    <div className="p-1 rounded bg-orange-500 text-white animate-pulse">
                      Proposta
                    </div>
                    <div className="p-1 rounded bg-slate-100 text-slate-400">Fechou</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Atualizado pela gestão Vitacon</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    100% Transparente
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEÇÃO COMO FUNCIONA: 3 Cards com Ícone, Título e Descrição */}
      <section id="como-funciona" className="py-20 md:py-28 bg-[#faf7f2] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#d9995b] bg-[#d9995b]/10 px-3 py-1 rounded-full">
              Passo a Passo
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f2a43] tracking-tight">
              Como funciona a indicação?
            </h2>
            <p className="text-base sm:text-lg text-[#6b7280]">
              Um processo simples, ágil e recompensador em apenas três passos descomplicados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group bg-white rounded-2xl p-8 border border-[#e5e0d8] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6">
                  <KeyRound className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-emerald-700 mb-1">REQUISITO EXCLUSIVO</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Tenha sua unidade Vitacon</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Para ser aceito como indicador, é necessário possuir uma unidade adquirida na
                  Vitacon cadastrada e aprovada pela administração.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center text-xs font-semibold text-emerald-700">
                Acesso exclusivo para clientes
              </div>
            </div>

            {/* Card 2 */}
            <div className="group bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6">
                  <Send className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-emerald-700 mb-1">PASSO 02</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Indique novos compradores</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Insira o nome e contato do interessado em seu painel. A equipe comercial assume o
                  atendimento e você acompanha tudo.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center text-xs font-semibold text-emerald-700">
                Leva menos de 1 minuto
              </div>
            </div>

            {/* Card 3 */}
            <div className="group bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-6">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-emerald-700 mb-1">PASSO 03</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Receba sua comissão</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Após o fechamento e assinatura, você recebe a recompensa definida pela regra
                  vigente (comissão percentual ou fixa).
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center text-xs font-semibold text-emerald-700">
                Transparência de valores
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SEÇÃO CTA FINAL */}
      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Pronto para acompanhar suas indicações?
          </h2>
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal">
            Acesse o portal do indicador com suas credenciais fornecidas pela equipe Vitacon.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 py-6 rounded-xl shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Link to="/login" className="flex items-center justify-center gap-2">
                Entrar no Programa
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
