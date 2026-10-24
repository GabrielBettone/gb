// Utilitário de marca d'água e processamento de imagem para a Gesso Bettone

/**
 * Aplica a marca d'água elegante da Gesso Bettone sobre uma imagem (File, Blob ou URL)
 * e retorna um novo Blob com a marca d'água impressa diretamente nos pixels da imagem.
 * Logo compacto "GB • Gesso Bettone" com tipografia e monograma translúcido em branco/dourado.
 */
export async function aplicarMarcaDagua(
  imagemFonte: File | Blob | string,
  opcoes: {
    posicao?: 'canto-inferior-direito' | 'canto-inferior-esquerdo' | 'centro'
    opacidade?: number
    maxWidth?: number
    maxHeight?: number
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

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)

      // 1. Redimensionar preservando proporção
      let width = img.naturalWidth || img.width
      let height = img.naturalHeight || img.height

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
      ctx.roundRect(posX, posY, badgeWidth, badgeHeight, radius)
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
      ctx.roundRect(boxX, boxY, boxSize, boxSize, 6 * escala)
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

      // 4. Exportar como Blob JPEG ou WEBP de alta qualidade
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
    }

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      reject(new Error('Erro ao carregar a imagem para aplicar marca d água.'))
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
  if (fileNameOrUrl.startsWith('http://') || fileNameOrUrl.startsWith('https://')) {
    return fileNameOrUrl
  }
  const pbBase = import.meta.env.VITE_POCKETBASE_URL || ''
  return `${pbBase.replace(/\/+$/, '')}/api/files/${collectionIdOrName}/${recordId}/${fileNameOrUrl}`
}
