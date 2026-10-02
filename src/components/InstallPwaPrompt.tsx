import React, { useState, useEffect } from 'react'
import { Download, Share2, X, PlusSquare, Monitor, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import GabrielLogo from '@/components/GabrielLogo'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export const InstallPwaPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIosSafari, setIsIosSafari] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 1. Detecta se já está rodando em modo standalone (já instalado)
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - navigator.standalone exists on iOS Safari
      Boolean(window.navigator.standalone)

    setIsStandalone(isRunningStandalone)
    if (isRunningStandalone) return

    // 2. Verifica se o usuário já dispensou hoje
    const dismissedAt = localStorage.getItem('indica_gabriel_pwa_dismissed')
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      // Relembra apenas após 48 horas
      if (Date.now() - dismissedTime < 48 * 60 * 60 * 1000) {
        setDismissed(true)
        return
      }
    }

    // 3. Captura o evento nativo beforeinstallprompt (Chrome, Edge, Android, Opera)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // 4. Detecção de Safari no iOS (onde o beforeinstallprompt não existe)
    const ua = window.navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(ua)
    const isSafari = /safari/.test(ua) && !/crios|fxios|chrome/.test(ua)
    if (isIos && isSafari && !isRunningStandalone) {
      setIsIosSafari(true)
      // Aguarda 3 segundos após carregar para não poluir
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
        clearTimeout(timer)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
    } catch (err) {
      console.warn('Erro ao disparar prompt de instalação:', err)
    } finally {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('indica_gabriel_pwa_dismissed', Date.now().toString())
  }

  // Não renderiza se já instalado, se dispensado ou se nada para mostrar
  if (isStandalone || dismissed || !showPrompt) {
    return null
  }

  // Banner discreto flutuante na parte inferior (responsivo: centralizado no desktop, colado no mobile)
  return (
    <div
      role="region"
      aria-label="Instalação do Aplicativo Indica Gabriel"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fade-in-up"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-[#14522a]/20 shadow-[#14522a]/10 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0 p-1 bg-white rounded-xl shadow-sm border border-gray-100">
              <GabrielLogo variant="symbol" size={38} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0f2a43] flex items-center gap-1.5 leading-tight">
                Instalar Indica Gabriel
                <span className="text-[10px] bg-[#14522a]/10 text-[#14522a] font-semibold px-1.5 py-0.5 rounded">
                  App Grátis
                </span>
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Salve na tela de início do seu PC, tablet ou smartphone para acesso rápido.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Fechar convite de instalação"
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Caso 1: Navegadores com suporte nativo ao prompt */}
        {deferredPrompt && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="flex-1 bg-[#14522a] hover:bg-[#0e3b1e] text-white font-semibold text-xs h-9 rounded-xl shadow-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Adicionar à Tela de Início
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 hover:text-gray-800 h-9 px-3 rounded-xl"
            >
              Agora não
            </Button>
          </div>
        )}

        {/* Caso 2: iOS Safari - Instruções discretas */}
        {isIosSafari && !deferredPrompt && (
          <div className="bg-[#faf7f2] border border-[#e5e0d8] rounded-xl p-2.5 text-xs text-gray-700 flex flex-col gap-1.5">
            <p className="font-semibold text-[#0f2a43] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#14522a]" />
              Como salvar no iPhone / iPad:
            </p>
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <span>1. Toque no botão Compartilhar</span>
              <Share2 className="w-3.5 h-3.5 text-blue-600 inline shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <span>2. Escolha &quot;Adicionar à Tela de Início&quot;</span>
              <PlusSquare className="w-3.5 h-3.5 text-gray-700 inline shrink-0" />
            </div>
            <div className="pt-1 flex justify-end">
              <button
                onClick={handleDismiss}
                className="text-[11px] font-semibold text-[#14522a] hover:underline"
              >
                Entendi
              </button>
            </div>
          </div>
        )}

        {/* Dispositivos compatíveis */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
          <span className="flex items-center gap-1">
            <Monitor className="w-3 h-3" /> Computador
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Smartphone className="w-3 h-3" /> Celular e Tablet
          </span>
          <span>•</span>
          <span>Funciona Offline</span>
        </div>
      </div>
    </div>
  )
}

export default InstallPwaPrompt
