import React from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Ícone SVG oficial do WhatsApp
export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="0"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.676.15-.2.301-.776.979-.951 1.18-.175.2-.351.226-.652.075-.301-.15-1.272-.469-2.424-1.496-.897-.799-1.503-1.786-1.679-2.087-.175-.301-.019-.464.132-.614.136-.135.301-.351.451-.527.15-.175.2-.301.301-.501.1-.2.05-.376-.025-.526-.075-.15-.676-1.63-.927-2.232-.244-.587-.492-.507-.676-.516-.175-.009-.375-.01-.576-.01-.2 0-.526.075-.802.376-.276.301-1.052 1.028-1.052 2.508 0 1.48 1.077 2.909 1.227 3.109.15.201 2.12 3.238 5.137 4.542.718.311 1.278.497 1.716.636.722.23 1.378.197 1.898.12.579-.087 1.78-.727 2.03-1.43.25-.702.25-1.303.175-1.43-.075-.125-.276-.2-.577-.35zM12.04 2C6.505 2 2.02 6.485 2.02 12.02c0 1.942.553 3.75 1.512 5.285L2 22l4.838-1.505c1.48.868 3.21 1.365 5.202 1.365 5.535 0 10.02-4.485 10.02-10.02C22.06 6.485 17.575 2 12.04 2zm0 18.28c-1.715 0-3.32-.486-4.698-1.332l-.337-.207-3.486 1.084 1.107-3.402-.227-.361a8.232 8.232 0 01-1.282-4.422c0-4.57 3.714-8.285 8.283-8.285 4.568 0 8.283 3.714 8.283 8.285 0 4.57-3.715 8.283-8.283 8.283z" />
  </svg>
)

interface WhatsAppShareButtonProps {
  /**
   * Texto customizado ou mensagem padrão
   */
  message?: string
  /**
   * Classes extras de estilo Tailwind
   */
  className?: string
  /**
   * Variante visual
   */
  variant?: 'primary' | 'outline' | 'compact' | 'floating'
  /**
   * Rótulo do botão
   */
  label?: string
}

export const WhatsAppShareButton: React.FC<WhatsAppShareButtonProps> = ({
  message,
  className = '',
  variant = 'primary',
  label = 'Compartilhar no WhatsApp',
}) => {
  const getShareUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const defaultText = `Olá! Conheça o Programa de Indicação Vitacon Smart Living. Você que é cliente pode indicar compradores para unidades Vitacon e receber comissão por cada fechamento! Acesse: ${origin}`
    const textToSend = message || defaultText
    return `https://wa.me/?text=${encodeURIComponent(textToSend)}`
  }

  const handleShare = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const title = 'Programa de Indicação Vitacon'
    const text =
      message ||
      'Conheça o Programa de Indicação Vitacon. Indique compradores para apartamentos e estúdios Vitacon e receba comissão direta por cada fechamento!'

    // Se estiver em smartphone/tablet com suporte à Web Share API nativa, utiliza primeiro
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title,
          text,
          url: origin,
        })
        return
      } catch (err: unknown) {
        // Se usuário cancelou o share nativo, não abre wa.me
        if ((err as Error)?.name === 'AbortError') {
          return
        }
      }
    }

    // Fallback garantido: abre WhatsApp Web / App
    window.open(getShareUrl(), '_blank', 'noopener,noreferrer')
  }

  if (variant === 'floating') {
    return (
      <button
        onClick={handleShare}
        aria-label="Compartilhar no WhatsApp"
        className={`fixed bottom-20 right-4 sm:right-6 z-40 bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center ${className}`}
        title="Compartilhar no WhatsApp"
      >
        <WhatsAppIcon className="w-6 h-6 fill-current" />
      </button>
    )
  }

  if (variant === 'compact') {
    return (
      <Button
        type="button"
        onClick={handleShare}
        variant="outline"
        size="sm"
        className={`bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] hover:text-[#075E54] border-[#25D366]/30 font-semibold rounded-xl text-xs flex items-center gap-1.5 h-9 ${className}`}
      >
        <WhatsAppIcon className="w-4 h-4 fill-current text-[#25D366]" />
        <span>{label}</span>
      </Button>
    )
  }

  if (variant === 'outline') {
    return (
      <Button
        type="button"
        onClick={handleShare}
        variant="outline"
        className={`border-[#25D366] text-[#128C7E] hover:bg-[#25D366]/10 font-bold rounded-xl px-5 py-6 text-base transition-all flex items-center justify-center gap-2.5 ${className}`}
      >
        <WhatsAppIcon className="w-5 h-5 fill-current text-[#25D366]" />
        <span>{label}</span>
      </Button>
    )
  }

  // Padrão: Botão verde vibrante do WhatsApp
  return (
    <Button
      type="button"
      onClick={handleShare}
      className={`bg-[#25D366] hover:bg-[#20ba59] text-white font-bold rounded-xl px-6 py-6 text-base shadow-lg shadow-[#25D366]/25 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 ${className}`}
    >
      <WhatsAppIcon className="w-5 h-5 fill-current" />
      <span>{label}</span>
    </Button>
  )
}

export default WhatsAppShareButton
