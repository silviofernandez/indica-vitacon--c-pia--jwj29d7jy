import React from 'react'
import { GABRIEL_BRAND, gSymbolOrig, logoCompletoOrig, logoTextoOrig } from '@/lib/brandAssets'

export type GabrielLogoVariant = 'symbol' | 'full' | 'text' | 'responsive'

export interface GabrielLogoProps {
  /**
   * 'symbol': Mostra apenas a bola G oficial isolada (img2016)
   * 'full': Mostra o logo oficial completo (G + Gabriel + Inovações Imobiliárias + CRECI) (img2018)
   * 'text': Mostra o wordmark oficial só com o texto (img2019)
   * 'responsive': No mobile e desktop exibe a bola G ou logo completo dependendo da configuração solicitada
   */
  variant?: GabrielLogoVariant
  /**
   * Classes extras para estilização
   */
  className?: string
  /**
   * Altura do símbolo ou altura de referência em pixels (padrão 36)
   */
  size?: number
  /**
   * Se o logo está sobre fundo escuro (como Hero ou Rodapé)
   */
  inverted?: boolean
  /**
   * Exibir ou ocultar tagline/subtítulo quando aplicável
   */
  showTagline?: boolean
  /**
   * Título ou label de acessibilidade
   */
  alt?: string
}

/**
 * Componente do Logo Oficial da Imobiliária Gabriel.
 *
 * Utiliza EXCLUSIVAMENTE os 3 arquivos oficiais fornecidos pelo cliente:
 * - Bola G isolada: img2016-69cdb.jpeg
 * - Logo completo: img2018-d5709.jpeg
 * - Só texto: img2019-e0ea7.jpeg
 *
 * Nunca recria o símbolo em SVG/CSS.
 */
export const GabrielLogo: React.FC<GabrielLogoProps> = ({
  variant = 'responsive',
  className = '',
  size = 36,
  inverted = false,
  showTagline = true,
  alt,
}) => {
  // 1. Bola G Isolada Oficial
  const renderSymbol = (customSize = size) => {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full ${
          inverted ? 'bg-white/10 shadow-sm ring-1 ring-white/20 p-0.5' : 'bg-transparent'
        }`}
        style={{
          width: customSize,
          height: customSize,
        }}
        aria-label={alt || GABRIEL_BRAND.assets.symbol.alt}
        title={GABRIEL_BRAND.companyName}
      >
        <img
          src={gSymbolOrig}
          alt={alt || GABRIEL_BRAND.assets.symbol.alt}
          className="w-full h-full object-cover rounded-full select-none pointer-events-none"
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

  // 2. Logo Completo Oficial (img2018)
  const renderFull = () => {
    const height = size || 44
    return (
      <div
        className={`inline-flex items-center shrink-0 select-none ${
          inverted ? 'bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-white/20' : ''
        } ${className}`}
      >
        <img
          src={logoCompletoOrig}
          alt={alt || GABRIEL_BRAND.assets.full.alt}
          style={{ height, width: 'auto', objectFit: 'contain' }}
          className="max-w-full select-none pointer-events-none block"
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  // 3. Wordmark Só Texto Oficial (img2019)
  const renderText = () => {
    const height = Math.round(size * 0.8) || 32
    return (
      <div
        className={`inline-flex items-center shrink-0 select-none ${
          inverted ? 'bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-white/20' : ''
        } ${className}`}
      >
        <img
          src={logoTextoOrig}
          alt={alt || GABRIEL_BRAND.assets.text.alt}
          style={{ height, width: 'auto', objectFit: 'contain' }}
          className="max-w-full select-none pointer-events-none block"
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  if (variant === 'symbol') {
    return <div className={`inline-flex items-center ${className}`}>{renderSymbol(size)}</div>
  }

  if (variant === 'full') {
    return renderFull()
  }

  if (variant === 'text') {
    return renderText()
  }

  // 4. Variante Responsiva:
  // Mostra a bola G oficial acompanhada da tipografia da plataforma "Indica Gabriel"
  // garantindo legibilidade perfeita em qualquer resolução
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 shrink-0 ${className}`}>
      {renderSymbol(size)}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`font-black tracking-tight text-lg sm:text-xl ${
              inverted ? 'text-white' : 'text-[#0f2a43]'
            }`}
            style={{ letterSpacing: '-0.02em' }}
          >
            Indica
          </span>
          <span
            className={`font-bold tracking-tight text-lg sm:text-xl ${
              inverted ? 'text-[#66cc33]' : 'text-[#1b4d24]'
            }`}
            style={{ letterSpacing: '-0.01em' }}
          >
            Gabriel
          </span>
        </div>
        {showTagline && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${
                inverted ? 'text-gray-300' : 'text-gray-500'
              }`}
            >
              Imobiliária Gabriel
            </span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                inverted
                  ? 'bg-white/10 text-emerald-300 border border-white/10'
                  : 'bg-[#1b4d24]/10 text-[#1b4d24]'
              }`}
            >
              CRECI {GABRIEL_BRAND.creci}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Componente do Logo Oficial Completo em Imagem direta
 * Renderiza o logo horizontal oficial com bola + nome + CRECI (img2018)
 */
export const GabrielOfficialLogoImg: React.FC<{
  className?: string
  inverted?: boolean
  maxHeight?: number
  alt?: string
}> = ({ className = '', inverted = false, maxHeight = 60, alt }) => {
  return (
    <div
      className={`inline-block ${
        inverted ? 'p-2 sm:p-2.5 rounded-xl bg-white shadow-sm border border-white/20' : ''
      } ${className}`}
    >
      <img
        src={logoCompletoOrig}
        alt={alt || GABRIEL_BRAND.assets.full.alt}
        style={{ maxHeight, width: 'auto', objectFit: 'contain' }}
        className="select-none pointer-events-none block"
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

/**
 * Componente de Logo Símbolo Isolado Oficial (apenas a bola G)
 */
export const GabrielSymbolImg: React.FC<{
  className?: string
  size?: number
  inverted?: boolean
  alt?: string
}> = ({ className = '', size = 36, inverted = false, alt }) => {
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden ${
        inverted ? 'p-0.5 bg-white/20 ring-1 ring-white/30' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={gSymbolOrig}
        alt={alt || GABRIEL_BRAND.assets.symbol.alt}
        className="w-full h-full object-cover rounded-full select-none"
        loading="eager"
        decoding="async"
      />
    </div>
  )
}

export { VitaconLogo } from './VitaconLogo'
export default GabrielLogo
