// Utilitário de marca d'água e processamento de imagem para a Gesso Bettone
import pb from '@/lib/pocketbase/client'
import { isSupabaseConfigured, supabaseGetPublicUrl } from '@/lib/supabase/client'
import logoSvgAsset from '@/assets/logo-6927a.svg'

// Cache da imagem do logotipo oficial carregada em memória para uso no Canvas
let cachedLogoImage: HTMLImageElement | null = null

function carregarImagemLogo(): Promise<HTMLImageElement> {
  if (cachedLogoImage && cachedLogoImage.complete && cachedLogoImage.naturalWidth > 0) {
    return Promise.resolve(cachedLogoImage)
  }
  return new Promise((resolve, reject) => {
    const imgLogo = new Image()
    imgLogo.crossOrigin = 'anonymous'
    imgLogo.onload = () => {
      cachedLogoImage = imgLogo
      resolve(imgLogo)
    }
    imgLogo.onerror = (e) => {
      console.warn(
        'Não foi possível carregar logo oficial para canvas, usando fallback vetorial:',
        e,
      )
      reject(e)
    }
    imgLogo.src = logoSvgAsset
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

    const processarImagem = () => {
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

        // 3. Desenhar a marca d'água Gesso Bettone
        ctx.save()
        ctx.globalAlpha = opacidade

        // Dimensionar marca d'água proporcionalmente
        const escala = Math.max(0.6, Math.min(width, height) / 1000)
        const badgeWidth = 240 * escala
        const badgeHeight = 56 * escala
        const margem = 24 * escala

        let posX = width - badgeWidth - margem
        let posY = height - badgeHeight - margem

        if (posicao === 'canto-inferior-esquerdo') {
          posX = margem
          posY = height - badgeHeight - margem
        } else if (posicao === 'centro') {
          posX = (width - badgeWidth) / 2
          posY = (height - badgeHeight) / 2
        }

        // Fundo em pílula semitransparente (Azul Ardósia translúcido)
        ctx.fillStyle = 'rgba(28, 37, 43, 0.75)'
        ctx.beginPath()
        const radius = 10 * escala
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(posX, posY, badgeWidth, badgeHeight, radius)
        } else {
          ctx.rect(posX, posY, badgeWidth, badgeHeight)
        }
        ctx.fill()

        // Borda sutil dourada
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)'
        ctx.lineWidth = 1.5 * escala
        ctx.stroke()

        // Monograma GB em dourado
        const boxSize = 38 * escala
        const boxX = posX + 9 * escala
        const boxY = posY + (badgeHeight - boxSize) / 2

        ctx.fillStyle = '#2C3E50'
        ctx.beginPath()
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxSize, boxSize, 6 * escala)
        } else {
          ctx.rect(boxX, boxY, boxSize, boxSize)
        }
        ctx.fill()
        ctx.strokeStyle = '#D4AF37'
        ctx.lineWidth = 1 * escala
        ctx.stroke()

        // Letras GB
        ctx.fillStyle = '#D4AF37'
        ctx.font = `bold ${18 * escala}px 'Tenor Sans', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('GB', boxX + boxSize / 2, boxY + boxSize / 2 + 1)

        // Texto "Gesso Bettone"
        const textX = boxX + boxSize + 10 * escala
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'

        ctx.fillStyle = '#FFFFFF'
        ctx.font = `bold ${13 * escala}px 'Inter Tight', sans-serif`
        ctx.fillText('Gesso Bettone', textX, posY + 23 * escala)

        // Subtítulo "Gesso • Drywall"
        ctx.fillStyle = '#D4AF37'
        ctx.font = `${10 * escala}px 'Inter Tight', sans-serif`
        ctx.fillText('Gesso & Drywall • São Pedro/SP', textX, posY + 40 * escala)

        ctx.restore()

        // 4. Exportar como Blob JPEG de alta qualidade
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Falha ao exportar blob do canvas.'))
            }
          },
          'image/jpeg',
          0.9,
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
      if (typeof imagemFonte === 'string' && imagemFonte.startsWith('http')) {
        fetch(imagemFonte)
          .then((res) => {
            if (!res.ok) throw new Error('Falha no fetch HTTP')
            return res.blob()
          })
          .then((blob) => {
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
          .catch((err) => reject(err))
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
