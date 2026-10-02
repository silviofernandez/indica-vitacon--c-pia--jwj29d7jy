const fs = require('fs')
const path = require('path')

/**
 * Gera ícones PWA e favicon em SVG incorporando a imagem oficial da bola G
 * em base64 puro (sem necessidade de compilação C++, Canvas ou decoders externos).
 *
 * Símbolo oficial: src/assets/img2016-69cdb.jpeg (1203 x 1214)
 */

try {
  const rootDir = path.resolve(__dirname, '..')
  const symbolJpegPath = path.join(rootDir, 'src/assets/img2016-69cdb.jpeg')
  const publicDir = path.join(rootDir, 'public')

  if (!fs.existsSync(symbolJpegPath)) {
    console.warn('[generate-icons] Arquivo de símbolo oficial não encontrado:', symbolJpegPath)
    process.exit(0)
  }

  const jpegBuffer = fs.readFileSync(symbolJpegPath)
  const base64Data = jpegBuffer.toString('base64')
  const mimeType = 'image/jpeg'
  const dataUri = `data:${mimeType};base64,${base64Data}`

  // 1. Favicon SVG (64x64 com a bola G perfeitamente recortada em círculo com acabamento fino)
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <clipPath id="circleClip">
      <circle cx="32" cy="32" r="30" />
    </clipPath>
  </defs>
  <!-- Fundo suave e aro sutil -->
  <circle cx="32" cy="32" r="31" fill="#0f2a43" />
  <!-- Imagem Oficial do Símbolo G isolado -->
  <g clip-path="url(#circleClip)">
    <image href="${dataUri}" x="1" y="1" width="62" height="62" preserveAspectRatio="xMidYMid slice" />
  </g>
  <circle cx="32" cy="32" r="30" fill="none" stroke="#66cc33" stroke-width="1.5" opacity="0.6" />
</svg>`
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg, 'utf8')

  // 2. pwa-icon.svg e pwa-512x512.svg
  const pwa512Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgPwa512" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#144a72" />
      <stop offset="100%" stop-color="#0f2a43" />
    </radialGradient>
    <clipPath id="circleClip512">
      <circle cx="256" cy="256" r="236" />
    </clipPath>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgPwa512)" />
  <g clip-path="url(#circleClip512)">
    <image href="${dataUri}" x="20" y="20" width="472" height="472" preserveAspectRatio="xMidYMid slice" />
  </g>
  <circle cx="256" cy="256" r="236" fill="none" stroke="#66cc33" stroke-width="6" opacity="0.4" />
</svg>`
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.svg'), pwa512Svg, 'utf8')
  fs.writeFileSync(path.join(publicDir, 'pwa-icon.svg'), pwa512Svg, 'utf8')

  // 3. pwa-192x192.svg
  const pwa192Svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <defs>
    <radialGradient id="bgPwa192" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#144a72" />
      <stop offset="100%" stop-color="#0f2a43" />
    </radialGradient>
    <clipPath id="circleClip192">
      <circle cx="96" cy="96" r="88" />
    </clipPath>
  </defs>
  <rect width="192" height="192" rx="42" fill="url(#bgPwa192)" />
  <g clip-path="url(#circleClip192)">
    <image href="${dataUri}" x="8" y="8" width="176" height="176" preserveAspectRatio="xMidYMid slice" />
  </g>
  <circle cx="96" cy="96" r="88" fill="none" stroke="#66cc33" stroke-width="3" opacity="0.4" />
</svg>`
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.svg'), pwa192Svg, 'utf8')

  // 4. maskable-icon.svg
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgMask" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#144a72" />
      <stop offset="100%" stop-color="#0f2a43" />
    </radialGradient>
    <clipPath id="circleMask">
      <circle cx="256" cy="256" r="190" />
    </clipPath>
  </defs>
  <rect width="512" height="512" fill="url(#bgMask)" />
  <g clip-path="url(#circleMask)">
    <image href="${dataUri}" x="66" y="66" width="380" height="380" preserveAspectRatio="xMidYMid slice" />
  </g>
  <circle cx="256" cy="256" r="190" fill="none" stroke="#66cc33" stroke-width="6" opacity="0.5" />
</svg>`
  fs.writeFileSync(path.join(publicDir, 'maskable-icon.svg'), maskableSvg, 'utf8')

  console.log('[generate-icons] Ícones PWA e Favicons oficiais gerados com sucesso!')
} catch (err) {
  console.error('[generate-icons] Falha ao gerar ícones:', err)
}
