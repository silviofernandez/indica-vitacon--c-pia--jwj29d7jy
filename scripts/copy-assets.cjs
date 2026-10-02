const fs = require('fs')
const path = require('path')

/**
 * Script de pré-compilação para padronizar e distribuir os assets oficiais da marca Gabriel.
 *
 * Arquivos oficiais de entrada em src/assets/:
 * - img2016-69cdb.jpeg -> Símbolo G circular oficial (bola isolada)
 * - img2018-d5709.jpeg -> Logo horizontal completo (G + Gabriel + Inovações Imobiliárias + CRECI 29.083-J)
 * - img2019-e0ea7.jpeg -> Wordmark só texto (Gabriel + Inovações Imobiliárias + CRECI 29.083-J)
 *
 * Distribui de forma direta e limpa para:
 * 1. src/assets/branding/ (g-symbol.jpeg, logo-completo.jpeg, logo-texto.jpeg)
 * 2. public/branding/ (g-symbol.jpeg, logo-completo.jpeg, logo-texto.jpeg)
 * 3. public/ (fallback legado logo-gabriel.png, g-symbol.jpeg)
 */

try {
  const rootDir = path.resolve(__dirname, '..')
  const srcAssets = path.join(rootDir, 'src/assets')
  const srcBranding = path.join(rootDir, 'src/assets/branding')
  const publicBranding = path.join(rootDir, 'public/branding')

  if (!fs.existsSync(srcBranding)) fs.mkdirSync(srcBranding, { recursive: true })
  if (!fs.existsSync(publicBranding)) fs.mkdirSync(publicBranding, { recursive: true })

  const map = [
    { src: path.join(srcAssets, 'img2016-69cdb.jpeg'), name: 'g-symbol.jpeg' },
    { src: path.join(srcAssets, 'img2018-d5709.jpeg'), name: 'logo-completo.jpeg' },
    { src: path.join(srcAssets, 'img2019-e0ea7.jpeg'), name: 'logo-texto.jpeg' },
  ]

  map.forEach(({ src, name }) => {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(srcBranding, name))
      fs.copyFileSync(src, path.join(publicBranding, name))
      console.log(`[copy-assets] Copied ${name} to src/assets/branding and public/branding`)
    } else {
      console.warn(`[copy-assets] Source file not found: ${src}`)
    }
  })

  // Compatibilidade legada para referências em public/
  const symbolSrc = path.join(srcAssets, 'img2016-69cdb.jpeg')
  if (fs.existsSync(symbolSrc)) {
    fs.copyFileSync(symbolSrc, path.join(rootDir, 'public/logo-gabriel.png'))
    fs.copyFileSync(symbolSrc, path.join(rootDir, 'public/g-symbol.jpeg'))
  }
} catch (err) {
  console.error('[copy-assets] Error copying branding assets:', err)
}
