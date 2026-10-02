/**
 * Gabriel Branding Assets - Indica Gabriel
 *
 * Arquivo central de caminhos e referências visuais oficiais da Imobiliária Gabriel.
 * Permite ao usuário substituir os arquivos posteriormente em /public/branding/ ou em /src/assets/branding/
 * sem quebrar o código:
 *
 * 1. Símbolo G isolado (a bola G oficial):
 *    - Origem: src/assets/img2016-69cdb.jpeg
 *    - Distribuído em: public/branding/g-symbol.jpeg
 *
 * 2. Logo Completo (horizontal com Bola G + Gabriel + Inovações Imobiliárias + CRECI 29.083-J):
 *    - Origem: src/assets/img2018-d5709.jpeg
 *    - Distribuído em: public/branding/logo-completo.jpeg
 *
 * 3. Wordmark / Logo só texto (sem a bola G):
 *    - Origem: src/assets/img2019-e0ea7.jpeg
 *    - Distribuído em: public/branding/logo-texto.jpeg
 */

import gSymbolOrig from '@/assets/branding/g-symbol.jpeg'
import logoCompletoOrig from '@/assets/branding/logo-completo.jpeg'
import logoTextoOrig from '@/assets/branding/logo-texto.jpeg'

export interface BrandAssetConfig {
  /** Caminho do arquivo processado/importado pelo Vite */
  src: string
  /** Caminho público direto servido em /branding/... para fácil substituição estática */
  publicPath: string
  /** Texto alternativo acessível */
  alt: string
  /** Proporção típica (largura / altura) */
  aspectRatio: number
}

export const GABRIEL_BRAND = {
  // Paleta oficial retirada dos assets enviados
  limeGreen: '#66cc33',
  darkGreen: '#1b4d24',
  darkBg: '#0f171d',
  navyBg: '#0f2a43',
  creci: '29.083-J',
  companyName: 'Imobiliária Gabriel',
  tagline: 'Inovações Imobiliárias',
  website: 'https://www.imobiliariagabriel.com.br',
  assets: {
    symbol: {
      src: gSymbolOrig,
      publicPath: '/branding/g-symbol.jpeg',
      alt: 'Símbolo G Oficial — Imobiliária Gabriel',
      aspectRatio: 1, // 1203 x 1214 (~1:1)
    },
    full: {
      src: logoCompletoOrig,
      publicPath: '/branding/logo-completo.jpeg',
      alt: 'Logo Oficial Completo — Imobiliária Gabriel • CRECI 29.083-J',
      aspectRatio: 1695 / 563, // ~3.01:1
    },
    text: {
      src: logoTextoOrig,
      publicPath: '/branding/logo-texto.jpeg',
      alt: 'Gabriel Inovações Imobiliárias • CRECI 29.083-J',
      aspectRatio: 1101 / 404, // ~2.72:1
    },
  },
}

export { gSymbolOrig, logoCompletoOrig, logoTextoOrig }
