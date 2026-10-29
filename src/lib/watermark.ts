// Utilitário de marca d'água e processamento de imagem para a Gesso Bettone
import pb from '@/lib/pocketbase/client'
import { isSupabaseConfigured, supabaseGetPublicUrl } from '@/lib/supabase/client'
import logoSvgAsset from '@/assets/logo-6927a.svg'
import logoPngAsset from '@/assets/logo-gesso-bettone-eb5aa.png'

// Cache da imagem do logotipo oficial carregada em memória para uso no Canvas
let cachedLogoImage: HTMLImageElement | null = null

function carregarImagemLogo(): Promise<HTMLImageElement> {
  if (cachedLogoImage && cachedLogoImage.complete && cachedLogoImage.naturalWidth > 0) {
    return Promise.resolve(cachedLogoImage)
  }
  return new Promise((resolve, reject) => {
    const imgLogo = new Image()
    // Como é asset local empacotado pelo Vite (mesma origem ou data-uri), não exige crossOrigin restritivo
    imgLogo.onload = () => {
      cachedLogoImage = imgLogo
      resolve(imgLogo)
    }
    imgLogo.onerror = () => {
      // Fallback para o PNG caso o SVG falhe no browser antigo
      const fallbackPng = new Image()
      fallbackPng.onload = () => {
        cachedLogoImage = fallbackPng
        resolve(fallbackPng)
      }
      fallbackPng.onerror = (err) => reject(err)
      fallbackPng.src = logoPngAsset
    }
    imgLogo.src = logoPngAsset || logoSvgAsset
  })
}

/**
 * Aplica a marca d'água elegante da Gesso Bettone sobre uma imagem (File, Blob ou URL)
 * e retorna um novo Blob com a marca d'água impressa diretamente nos pixels da imagem.
 * Inclui o logotipo oficial em vetor SVG + tipografia oficial + subtítulo institucional.
 */
export async function aplicarMarcaDagua(
  imagemFonte: File | Blob | string,
  opcoes: {
    posicao?: 'canto-inferior-direito' | 'canto-inferior-esquerdo' | 'centro'
    opacidade?: number
    maxWidth?: number
    maxHeight?: number
    telefone?: string
    siteUrl?: string
  } = {},
): Promise<Blob> {
  const {
    posicao = 'canto-inferior-direito',
    opacidade = 0.85,
    maxWidth = 1920,
    maxHeight = 1080,
  } = opcoes

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    let objectUrl = ''
    if (typeof imagemFonte === 'string') {
      img.src = imagemFonte
    } else {
      objectUrl = URL.createObjectURL(imagemFonte)
      img.src = objectUrl
    }

    const processarImagem = async () => {
      try {
        // 1. Redimensionar preservando proporção
        let width = img.naturalWidth || img.width
        let height = img.naturalHeight || img.height

        if (width === 0 || height === 0) {
          reject(new Error('Dimensões inválidas da imagem.'))
          return
        }

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Não foi possível obter contexto 2D do Canvas.'))
          return
        }

        // 2. Desenhar a imagem base
        ctx.drawImage(img, 0, 0, width, height)

        // 3. Tentar carregar o logotipo oficial para carimbo
        let logoImg: HTMLImageElement | null = null
        try {
          logoImg = await carregarImagemLogo()
        } catch (logoErr) {
          console.debug('Logo image carregar falhou, usando monograma vetorial', logoErr)
        }

        // 4. Desenhar a marca d'água Gesso Bettone VISÍVEL e elegante
        ctx.save()
        ctx.globalAlpha = Math.min(1, Math.max(0.7, opacidade))

        // Dimensionar marca d'água proporcionalmente
        // Aumentado ligeiramente para garantir perfeita visibilidade conforme solicitado pelo usuário
        const menorLado = Math.min(width, height)
        const escala = Math.max(0.75, Math.min(menorLado / 750, 2.2))

        const badgeWidth = 270 * escala
        const badgeHeight = 64 * escala
        const margem = Math.max(16, 22 * escala)

        let posX = width - badgeWidth - margem
        let posY = height - badgeHeight - margem

        if (posicao === 'canto-inferior-esquerdo') {
          posX = margem
          posY = height - badgeHeight - margem
        } else if (posicao === 'centro') {
          posX = (width - badgeWidth) / 2
          posY = (height - badgeHeight) / 2
        }

        // Sombra de fundo suave para destacar a marca em qualquer foto (escura ou clara)
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
        ctx.shadowBlur = 10 * escala
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 3 * escala

        // Fundo em pílula semitransparente (Azul Ardósia #1C252B com boa opacidade 0.88)
        ctx.fillStyle = 'rgba(28, 37, 43, 0.90)'
        ctx.beginPath()
        const radius = 12 * escala
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(posX, posY, badgeWidth, badgeHeight, radius)
        } else {
          ctx.rect(posX, posY, badgeWidth, badgeHeight)
        }
        ctx.fill()

        // Reset de sombra para traços internos
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        // Borda dourada nítida
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)'
        ctx.lineWidth = 1.8 * escala
        ctx.stroke()

        // Container do Logo Oficial
        const boxSize = 46 * escala
        const boxX = posX + 9 * escala
        const boxY = posY + (badgeHeight - boxSize) / 2

        // Fundo branco sutil no logo para contraste perfeito do logotipo original
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxSize, boxSize, 8 * escala)
        } else {
          ctx.rect(boxX, boxY, boxSize, boxSize)
        }
        ctx.fill()
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)'
        ctx.lineWidth = 1 * escala
        ctx.stroke()

        if (logoImg && logoImg.width > 0) {
          // Renderiza o logo oficial da Gesso Bettone centralizado dentro da caixinha
          const logoPadding = 4 * escala
          const drawLogoW = boxSize - logoPadding * 2
          const drawLogoH = boxSize - logoPadding * 2
          ctx.drawImage(logoImg, boxX + logoPadding, boxY + logoPadding, drawLogoW, drawLogoH)
        } else {
          // Monograma GB em dourado como fallback vetorial
          ctx.fillStyle = '#2C3E50'
          ctx.fillRect(boxX + 2, boxY + 2, boxSize - 4, boxSize - 4)
          ctx.fillStyle = '#D4AF37'
          ctx.font = `bold ${20 * escala}px 'Tenor Sans', sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('GB', boxX + boxSize / 2, boxY + boxSize / 2 + 1)
        }

        // Texto principal: "Gesso Bettone"
        const textX = boxX + boxSize + 11 * escala
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'

        ctx.fillStyle = '#FFFFFF'
        ctx.font = `bold ${15 * escala}px 'Inter Tight', sans-serif`
        ctx.fillText('Gesso Bettone', textX, posY + 27 * escala)

        // Subtítulo oficial dourado: "Gesso & Drywall • Alto Padrão"
        ctx.fillStyle = '#D4AF37'
        ctx.font = `600 ${10.5 * escala}px 'Inter Tight', sans-serif`
        ctx.fillText('Gesso & Drywall • Alto Padrão', textX, posY + 46 * escala)

        ctx.restore()

        // 5. Exportar como Blob JPEG de alta qualidade
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Falha ao exportar blob do canvas.'))
            }
          },
          'image/jpeg',
          0.92,
        )
      } catch (err) {
        reject(err)
      }
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      processarImagem()
    }

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      // Se falhar ao carregar via URL direta por CORS, tentar via fetch blob
      // NUNCA lança erro não tratado — degrada rejeitando a Promise suavemente
      if (typeof imagemFonte === 'string' && imagemFonte.startsWith('http')) {
        fetch(imagemFonte)
          .then((res) => {
            if (!res.ok) {
              // Degrada graciosamente sem estourar throw não capturado
              reject(new Error(`Falha no fetch HTTP (${res.status}): ${imagemFonte.slice(0, 80)}`))
              return null
            }
            return res.blob()
          })
          .then((blob) => {
            if (!blob) return
            const fallbackUrl = URL.createObjectURL(blob)
            const fallbackImg = new Image()
            fallbackImg.onload = () => {
              URL.revokeObjectURL(fallbackUrl)
              // Substitui img e processa
              img.width = fallbackImg.naturalWidth
              img.height = fallbackImg.naturalHeight
              processarImagem()
            }
            fallbackImg.onerror = () => {
              URL.revokeObjectURL(fallbackUrl)
              reject(new Error('Erro no fallback de imagem.'))
            }
            fallbackImg.src = fallbackUrl
          })
          .catch((err) => {
            reject(err instanceof Error ? err : new Error(String(err || 'Erro no fetch HTTP')))
          })
      } else {
        reject(new Error('Erro ao carregar a imagem para aplicar marca d água.'))
      }
    }
  })
}

/**
 * Converte um Blob para um arquivo File com nome
 */
export function blobToFile(blob: Blob, nomeOriginal: string): File {
  const nomeLimpo = nomeOriginal.replace(/\.[^/.]+$/, '') + '_gb.jpg'
  return new File([blob], nomeLimpo, { type: 'image/jpeg' })
}

/**
 * Retorna a URL completa para imagens do PocketBase ou URLs remotas
 */
export function resolverUrlMidia(
  collectionIdOrName: string,
  recordId: string,
  fileNameOrUrl: string,
): string {
  if (!fileNameOrUrl) return ''
  if (
    fileNameOrUrl.startsWith('http://') ||
    fileNameOrUrl.startsWith('https://') ||
    fileNameOrUrl.startsWith('data:') ||
    fileNameOrUrl.startsWith('blob:')
  ) {
    return fileNameOrUrl
  }

  // Em modo Supabase: apenas 'public-media' e 'simulador' são buckets válidos.
  // Caminhos como 'portfolio/arquivo.jpg', 'services/arquivo.jpg' ou 'partners/logo.jpg'
  // são pastas DENTRO do bucket 'public-media' (nunca buckets separados).
  if (isSupabaseConfigured()) {
    const clean = fileNameOrUrl.replace(/^\/+/, '')

    // Se já especifica o bucket explicitamente no início:
    if (clean.startsWith('simulador/')) {
      return supabaseGetPublicUrl('simulador', clean.slice('simulador/'.length))
    }
    if (clean.startsWith('public-media/')) {
      return supabaseGetPublicUrl('public-media', clean.slice('public-media/'.length))
    }

    // Se já contém subpasta (ex: 'portfolio/...', 'services/...', 'partners/...', 'uploads/...'):
    if (clean.includes('/')) {
      return supabaseGetPublicUrl('public-media', clean)
    }

    // Se for apenas o nome de arquivo sem subpasta (ex: 'capa.jpg'):
    const pastaPadrao =
      collectionIdOrName === 'site_portfolio'
        ? 'portfolio'
        : collectionIdOrName === 'site_services'
          ? 'services'
          : collectionIdOrName === 'site_partners'
            ? 'partners'
            : collectionIdOrName.replace(/^site_/, '')

    return supabaseGetPublicUrl('public-media', `${pastaPadrao}/${clean}`)
  }

  const pbBase = pb.baseUrl || ''
  return `${pbBase.replace(/\/+$/, '')}/api/files/${collectionIdOrName}/${recordId}/${fileNameOrUrl}`
}
