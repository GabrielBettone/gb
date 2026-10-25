import pb from '@/lib/pocketbase/client'

export interface MidiaInventarioItem {
  pasta: string
  nome_arquivo: string
  url: string
  tipo: 'arquivo_nativo' | 'url_externa'
}

export interface MidiaInventarioResponse {
  total: number
  itens: MidiaInventarioItem[]
  contagem: {
    projetos: number
    servicos: number
    parceiros: number
  }
}

/**
 * Obtém a lista completa de mídias cadastradas para o empacotamento ZIP
 */
export async function obterInventarioMidias(): Promise<MidiaInventarioResponse> {
  const pbBase = import.meta.env.VITE_POCKETBASE_URL || ''
  const token = pb.authStore.token
  const res = await fetch(`${pbBase.replace(/\/+$/, '')}/backend/v1/site/midias-inventario`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || `Falha ao obter inventário (Status ${res.status})`)
  }

  return res.json()
}

/**
 * Baixa uma imagem como Uint8Array
 */
async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const fullUrl = url.startsWith('http')
      ? url
      : `${(import.meta.env.VITE_POCKETBASE_URL || '').replace(/\/+$/, '')}${url}`
    const res = await fetch(fullUrl)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    return new Uint8Array(buffer)
  } catch {
    return null
  }
}

/**
 * Implementação pura em JS para gerar ZIP no navegador sem dependências pesadas
 * Utiliza o formato ZIP padrão PKWARE (sem compressão ou Deflate básico via CompressionStream)
 */
class SimpleZipBuilder {
  private files: { path: string; data: Uint8Array; modTime: Date }[] = []

  addFile(path: string, data: Uint8Array) {
    this.files.push({
      path: path.replace(/^\/+/, ''),
      data,
      modTime: new Date(),
    })
  }

  async buildBlob(): Promise<Blob> {
    const parts: Uint8Array[] = []
    const centralDirectoryHeaders: Uint8Array[] = []
    let offset = 0

    // CRC32 Table
    const crcTable = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      crcTable[i] = c
    }

    const calcCrc32 = (buf: Uint8Array): number => {
      let crc = -1
      for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff]
      }
      return (crc ^ -1) >>> 0
    }

    const encoder = new TextEncoder()

    for (const file of this.files) {
      const fileNameBytes = encoder.encode(file.path)
      const crc = calcCrc32(file.data)
      const size = file.data.length

      // Local File Header (30 bytes + filename)
      const localHeader = new Uint8Array(30 + fileNameBytes.length)
      const dvLocal = new DataView(localHeader.buffer)
      dvLocal.setUint32(0, 0x04034b50, true) // Local file header signature
      dvLocal.setUint16(4, 20, true) // Version needed (2.0)
      dvLocal.setUint16(6, 0x0800, true) // Flags (UTF-8)
      dvLocal.setUint16(8, 0, true) // Compression method: 0 = Store (sem compressão - preserva imagens já comprimidas)
      dvLocal.setUint16(10, 0, true) // Mod time
      dvLocal.setUint16(12, 0, true) // Mod date
      dvLocal.setUint32(14, crc, true)
      dvLocal.setUint32(18, size, true) // Compressed size
      dvLocal.setUint32(22, size, true) // Uncompressed size
      dvLocal.setUint16(26, fileNameBytes.length, true)
      dvLocal.setUint16(28, 0, true) // Extra field length
      localHeader.set(fileNameBytes, 30)

      parts.push(localHeader)
      parts.push(file.data)

      // Central Directory Header (46 bytes + filename)
      const cdHeader = new Uint8Array(46 + fileNameBytes.length)
      const dvCd = new DataView(cdHeader.buffer)
      dvCd.setUint32(0, 0x02014b50, true) // Central directory header signature
      dvCd.setUint16(4, 20, true) // Version made by
      dvCd.setUint16(6, 20, true) // Version needed
      dvCd.setUint16(8, 0x0800, true) // Flags UTF-8
      dvCd.setUint16(10, 0, true) // Compression 0 (Store)
      dvCd.setUint16(12, 0, true)
      dvCd.setUint16(14, 0, true)
      dvCd.setUint32(16, crc, true)
      dvCd.setUint32(20, size, true)
      dvCd.setUint32(24, size, true)
      dvCd.setUint16(28, fileNameBytes.length, true)
      dvCd.setUint16(30, 0, true) // Extra len
      dvCd.setUint16(32, 0, true) // Comment len
      dvCd.setUint16(34, 0, true) // Disk num
      dvCd.setUint16(36, 0, true) // Internal attrs
      dvCd.setUint32(38, 0, true) // External attrs
      dvCd.setUint32(42, offset, true) // Relative offset of local header
      cdHeader.set(fileNameBytes, 46)

      centralDirectoryHeaders.push(cdHeader)

      offset += localHeader.length + file.data.length
    }

    const cdOffset = offset
    let cdSize = 0
    for (const h of centralDirectoryHeaders) {
      parts.push(h)
      cdSize += h.length
    }

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22)
    const dvEocd = new DataView(eocd.buffer)
    dvEocd.setUint32(0, 0x06054b50, true) // EOCD signature
    dvEocd.setUint16(4, 0, true) // Disk number
    dvEocd.setUint16(6, 0, true) // Start disk
    dvEocd.setUint16(8, this.files.length, true) // Records on this disk
    dvEocd.setUint16(10, this.files.length, true) // Total records
    dvEocd.setUint32(12, cdSize, true) // Size of central directory
    dvEocd.setUint32(16, cdOffset, true) // Offset of central directory
    dvEocd.setUint16(20, 0, true) // Comment length

    parts.push(eocd)

    return new Blob(parts, { type: 'application/zip' })
  }
}

/**
 * Função principal que processa e dispara o download do ZIP completo com feedback de progresso
 */
export async function baixarTodasMidiasZip(
  onProgress?: (progresso: { atual: number; total: number; mensagem: string }) => void,
): Promise<void> {
  onProgress?.({ atual: 0, total: 100, mensagem: 'Consultando inventário de mídias...' })
  const inventario = await obterInventarioMidias()

  if (!inventario.itens || inventario.itens.length === 0) {
    throw new Error('Nenhuma mídia encontrada no banco de dados para download.')
  }

  const zip = new SimpleZipBuilder()
  const total = inventario.itens.length

  for (let i = 0; i < total; i++) {
    const item = inventario.itens[i]
    onProgress?.({
      atual: i + 1,
      total,
      mensagem: `Baixando [${i + 1}/${total}]: ${item.pasta}/${item.nome_arquivo}...`,
    })

    const bytes = await fetchImageBytes(item.url)
    if (bytes) {
      const caminhoCompleto = `${item.pasta}/${item.nome_arquivo}`
      zip.addFile(caminhoCompleto, bytes)
    }
  }

  onProgress?.({ atual: total, total, mensagem: 'Empacotando arquivo ZIP final...' })
  const blobZip = await zip.buildBlob()

  // Disparar download no navegador
  const urlBlob = URL.createObjectURL(blobZip)
  const a = document.createElement('a')
  const dataHoje = new Date().toISOString().substring(0, 10)
  a.href = urlBlob
  a.download = `Gesso_Bettone_Midias_Originais_${dataHoje}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlBlob)
}
