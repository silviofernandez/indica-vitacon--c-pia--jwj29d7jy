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
import GabrielLogo from '@/components/GabrielLogo'
import WhatsAppShareButton from '@/components/WhatsAppShareButton'

export default function Index() {
  return (
    <div className="flex flex-col w-full">
      {/* 1. SEÇÃO HERO: Gradiente Azul Profundo com Ondas SVG */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f2a43] via-[#15466d] to-[#1a5d8f] text-white pt-16 pb-28 md:pt-24 md:pb-36 min-h-[calc(100vh-80px)] flex items-center">
        {/* Efeitos de fundo e partículas de luz */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(217,153,91,0.15),transparent_40%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(26,93,143,0.3),transparent_40%)] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Bloco de Texto (Desliza da esquerda) */}
            <div className="lg:col-span-7 flex flex-col items-start space-y-6 text-left animate-fade-in-up">
              {/* Badge com Logo G Oficial legível */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#d9995b] text-xs font-semibold uppercase tracking-wider">
                <GabrielLogo variant="symbol" size={22} inverted />
                <span>Programa Oficial de Indicações</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                Indique imóveis e ganhe com a{' '}
                <span className="text-[#d9995b] underline decoration-[#d9995b]/40 underline-offset-8">
                  Imobiliária Gabriel
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-200 leading-relaxed max-w-2xl font-normal">
                Cadastre indicações de compradores ou locatários, acompanhe cada etapa da negociação
                em tempo real e seja recompensado por cada cliente que fechar negócio.
              </p>

              {/* Botões CTA com WhatsApp bem simples e fácil */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto pt-2">
                <Button
                  asChild
                  className="bg-[#d9995b] hover:bg-[#c48443] text-white font-bold text-base px-7 py-6 rounded-xl shadow-lg shadow-[#d9995b]/25 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <Link to="/cadastro" className="flex items-center justify-center gap-2">
                    Quero ser Indicador
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>

                {/* BOTÃO PRINCIPAL DE COMPARTILHAR NO WHATSAPP */}
                <WhatsAppShareButton
                  label="Compartilhar no WhatsApp"
                  className="w-full sm:w-auto"
                />

                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white font-semibold text-base px-5 py-6 rounded-xl backdrop-blur-sm transition-all duration-200"
                >
                  <a href="#como-funciona" className="flex items-center justify-center">
                    Saiba Mais
                  </a>
                </Button>
              </div>

              {/* Selos de Confiança */}
              <div className="pt-6 flex flex-wrap items-center gap-6 text-xs text-gray-300 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#d9995b]" />
                  <span>Pagamento 100% Garantido</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#d9995b]" />
                  <span>Tradição & Transparência</span>
                </div>
              </div>
            </div>

            {/* Ilustração / Visual da Indicação à Direita (Desliza com atraso) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end animate-fade-in-up [animation-delay:150ms]">
              <div className="relative w-full max-w-md">
                {/* Efeito Glow atrás do Card */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-[#d9995b] to-[#1a5d8f] rounded-2xl blur-lg opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />

                {/* Card de Exemplo de Indicação */}
                <div className="relative bg-white text-[#1f2933] rounded-2xl p-5 shadow-2xl border border-white/20">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <GabrielLogo variant="symbol" size={40} />
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Imobiliária Gabriel
                        </h4>
                        <p className="text-sm font-bold text-[#0f2a43]">ID #IND-2025-042</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold px-2.5 py-1">
                      Indicação Enviada
                    </Badge>
                  </div>

                  {/* Foto de Imóvel com CDN Oficial */}
                  <div className="mt-4 relative rounded-xl overflow-hidden aspect-[16/10] bg-gray-100">
                    <img
                      src="https://img.usecurling.com/p/600/375?q=apartment,interior&color=blue"
                      alt="Apartamento 2 quartos — Centro"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
                      Comissão Estimada: R$ 3.500,00
                    </div>
                  </div>

                  {/* Detalhes da Indicação */}
                  <div className="mt-4 space-y-2">
                    <h3 className="text-base font-bold text-[#0f2a43]">
                      Apartamento 2 quartos — Centro
                    </h3>
                    <p className="text-xs text-gray-500">
                      Cliente Indicado: <strong className="text-gray-700">Mariana Ribeiro</strong>
                    </p>

                    {/* Barra de Progresso Simulado */}
                    <div className="pt-2">
                      <div className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">
                        <span>Etapa Atual: Em Análise do Corretor</span>
                        <span className="text-[#1a5d8f] font-semibold">60%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#1a5d8f] to-[#d9995b] w-[60%] rounded-full" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Atualizado há 15 min</span>
                    <span className="text-[#1a5d8f] font-semibold flex items-center gap-1">
                      Acompanhamento 100% Online
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Padrão Sutil de Ondas SVG na Base do Hero */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg
            className="relative block w-full h-12 md:h-16 text-[#faf7f2]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 C150,90 350,-40 500,60 C650,160 900,10 1200,40 L1200,120 L0,120 Z"
              fill="currentColor"
            />
          </svg>
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
                <div className="w-14 h-14 rounded-2xl bg-[#1a5d8f]/10 text-[#1a5d8f] flex items-center justify-center mb-6 group-hover:bg-[#1a5d8f] group-hover:text-white transition-colors duration-200">
                  <Send className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-[#d9995b] mb-1">PASSO 01</div>
                <h3 className="text-xl font-bold text-[#0f2a43] mb-3">Cadastre a indicação</h3>
                <p className="text-sm text-[#6b7280] leading-relaxed">
                  Preencha os dados do possível cliente e do imóvel de interesse de forma rápida
                  pelo seu painel.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100 flex items-center text-xs font-semibold text-[#1a5d8f]">
                Leva menos de 1 minuto
              </div>
            </div>

            {/* Card 2 */}
            <div className="group bg-white rounded-2xl p-8 border border-[#e5e0d8] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#d9995b]/10 text-[#d9995b] flex items-center justify-center mb-6 group-hover:bg-[#d9995b] group-hover:text-white transition-colors duration-200">
                  <Eye className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-[#d9995b] mb-1">PASSO 02</div>
                <h3 className="text-xl font-bold text-[#0f2a43] mb-3">Acompanhe o status</h3>
                <p className="text-sm text-[#6b7280] leading-relaxed">
                  Siga cada etapa da negociação em tempo real: primeiro contato, visitas, propostas
                  e fechamento de contrato.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100 flex items-center text-xs font-semibold text-[#1a5d8f]">
                Notificações instantâneas
              </div>
            </div>

            {/* Card 3 */}
            <div className="group bg-white rounded-2xl p-8 border border-[#e5e0d8] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <Award className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-[#d9995b] mb-1">PASSO 03</div>
                <h3 className="text-xl font-bold text-[#0f2a43] mb-3">Receba sua recompensa</h3>
                <p className="text-sm text-[#6b7280] leading-relaxed">
                  Ganhe uma comissão quando o negócio for fechado com o cliente que você indicou,
                  direto na sua conta bancária.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-gray-100 flex items-center text-xs font-semibold text-emerald-600">
                Pagamento via Pix rápido
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SEÇÃO DE CHAMADA PARA AÇÃO (CTA Final) */}
      <section className="bg-gradient-to-r from-[#1a5d8f] via-[#144a72] to-[#0f2a43] text-white py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Pronto para indicar e ganhar?
          </h2>
          <p className="text-base sm:text-xl text-gray-200 max-w-2xl mx-auto font-normal">
            Junte-se aos parceiros da Imobiliária Gabriel e transforme seu círculo de contatos em
            renda extra recorrente.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              className="w-full sm:w-auto bg-white text-[#0f2a43] hover:bg-gray-100 font-bold text-base px-8 py-6 rounded-xl shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Link to="/cadastro" className="flex items-center justify-center gap-2">
                Cadastrar como Indicador Parceiro
                <ArrowRight className="w-5 h-5 text-[#14522a]" />
              </Link>
            </Button>

            <WhatsAppShareButton
              variant="outline"
              label="Convidar um Amigo no WhatsApp"
              className="w-full sm:w-auto bg-white/10 border-white/40 text-white hover:bg-white/20"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
