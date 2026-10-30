import { isSelfHostedSupabase, dataAdapter } from '@/lib/dataAdapter'
import { resolverUrlMidia } from '@/lib/watermark'
import JSZip from 'jszip'

export interface MidiaDownloadProgress {
  atual: number
  total: number
  mensagem: string
  pulados: number
}

export interface MidiaDownloadItem {
  pasta: string // ex: "projetos/nome-do-projeto" ou "servicos/nome-do-servico"
  nomeArquivo: string
  url: string
}

/**
 * Sanitiza o nome de pastas e arquivos para o ZIP
 */
function limparCaracteresInvalidos(str: string): string {
  let res = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    const char = str[i]
    if (
      code < 32 ||
      char === '<' ||
      char === '>' ||
      char === ':' ||
      char === '"' ||
      char === '/' ||
      char === '\\' ||
      char === '|' ||
      char === '?' ||
      char === '*'
    ) {
      res += '_'
    } else {
      res += char
    }
  }
  return res
}

export function sanitizarNomePasta(nome: string): string {
  if (!nome) return 'sem_nome'
  const limpo = limparCaracteresInvalidos(nome.trim()).replace(/\s+/g, ' ').trim()
  return limpo || 'item'
}

/**
 * Extrai a extensão e nome do arquivo de uma URL ou path
 */
function extrairNomeExtensao(
  urlOuPath: string,
  padraoExt: string = 'jpg',
): { nome: string; ext: string } {
  try {
    const semQuery = urlOuPath.split('?')[0].split('#')[0]
    const partes = semQuery.split('/')
    const ultimo = partes[partes.length - 1] || 'arquivo'
    const pontoIdx = ultimo.lastIndexOf('.')
    if (pontoIdx > 0 && pontoIdx < ultimo.length - 1) {
      const nomeBase = limparCaracteresInvalidos(ultimo.substring(0, pontoIdx))
      const ext = ultimo.substring(pontoIdx + 1).toLowerCase()
      return { nome: nomeBase || 'arquivo', ext }
    }
    return {
      nome: limparCaracteresInvalidos(ultimo) || 'arquivo',
      ext: padraoExt,
    }
  } catch {
    return { nome: 'arquivo', ext: padraoExt }
  }
}

/**
 * Baixa um arquivo como ArrayBuffer com timeout e proteção contra CORS/falhas
 */
async function baixarArquivoBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000) // 20s timeout por arquivo
    const res = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-store',
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch (err) {
    console.warn(`[baixarArquivoBytes] Falha ao baixar ${url}:`, err)
    return null
  }
}

/**
 * Coleta todas as mídias estruturadas de Projetos e Serviços
 */
export async function coletarTodasMidiasEstruturadas(): Promise<MidiaDownloadItem[]> {
  const [projetos, servicos] = await Promise.all([
    dataAdapter.getFullList<any>('site_portfolio').catch(() => []),
    dataAdapter.getFullList<any>('site_servicos').catch(() => []),
  ])

  const itens: MidiaDownloadItem[] = []

  // 1. Processar Projetos
  for (const proj of projetos) {
    const nomeProjeto = sanitizarNomePasta(proj.titulo || proj.slug || `projeto_${proj.id}`)
    const pasta = `projetos/${nomeProjeto}`
    const urlsVistas = new Set<string>()

    const adicionarMidia = (midiaRaw: string | undefined | null, isVideo: boolean = false) => {
      if (!midiaRaw || typeof midiaRaw !== 'string') return
      const trimmed = midiaRaw.trim()
      if (!trimmed) return

      let urlFinal = trimmed
      if (proj.id) {
        urlFinal = resolverUrlMidia('site_portfolio', proj.id, trimmed)
      }

      if (!urlFinal || urlsVistas.has(urlFinal)) return
      urlsVistas.add(urlFinal)

      const { nome, ext } = extrairNomeExtensao(trimmed, isVideo ? 'mp4' : 'jpg')
      itens.push({
        pasta,
        nomeArquivo: `${nome}.${ext}`,
        url: urlFinal,
      })
    }

    // Capa
    if (proj.arquivo_capa) adicionarMidia(proj.arquivo_capa)
    if (proj.imagem_capa) adicionarMidia(proj.imagem_capa)

    // Galeria
    const galeriaArquivos = Array.isArray(proj.arquivos_galeria) ? proj.arquivos_galeria : []
    galeriaArquivos.forEach((f: string) => adicionarMidia(f))

    const galeriaLegada = Array.isArray(proj.galeria) ? proj.galeria : []
    galeriaLegada.forEach((f: string) => adicionarMidia(f))

    // Vídeos
    const videosArquivos = Array.isArray(proj.arquivos_videos) ? proj.arquivos_videos : []
    videosArquivos.forEach((f: string) => adicionarMidia(f, true))

    const videosLegados = Array.isArray(proj.videos) ? proj.videos : []
    videosLegados.forEach((f: string) => adicionarMidia(f, true))
  }

  // 2. Processar Serviços
  for (const serv of servicos) {
    const nomeServico = sanitizarNomePasta(serv.nome || serv.slug || `servico_${serv.id}`)
    const pasta = `servicos/${nomeServico}`
    const urlsVistas = new Set<string>()

    const adicionarMidia = (midiaRaw: string | undefined | null, isVideo: boolean = false) => {
      if (!midiaRaw || typeof midiaRaw !== 'string') return
      const trimmed = midiaRaw.trim()
      if (!trimmed) return

      let urlFinal = trimmed
      if (serv.id) {
        urlFinal = resolverUrlMidia('site_services', serv.id, trimmed)
      }

      if (!urlFinal || urlsVistas.has(urlFinal)) return
      urlsVistas.add(urlFinal)

      const { nome, ext } = extrairNomeExtensao(trimmed, isVideo ? 'mp4' : 'jpg')
      itens.push({
        pasta,
        nomeArquivo: `${nome}.${ext}`,
        url: urlFinal,
      })
    }

    // Imagem principal / capa
    if (serv.arquivo_principal) adicionarMidia(serv.arquivo_principal)
    if (serv.imagem_principal) adicionarMidia(serv.imagem_principal)

    // Galeria
    const galeriaArquivos = Array.isArray(serv.arquivos_galeria) ? serv.arquivos_galeria : []
    galeriaArquivos.forEach((f: string) => adicionarMidia(f))

    const galeriaLegada = Array.isArray(serv.galeria) ? serv.galeria : []
    galeriaLegada.forEach((f: string) => adicionarMidia(f))

    // Vídeos
    const videosArquivos = Array.isArray(serv.arquivos_videos) ? serv.arquivos_videos : []
    videosArquivos.forEach((f: string) => adicionarMidia(f, true))

    const videosLegados = Array.isArray(serv.videos) ? serv.videos : []
    videosLegados.forEach((f: string) => adicionarMidia(f, true))
  }

  return itens
}

/**
 * Função principal que processa e dispara o download do ZIP estruturado:
 * /projetos/<nome-do-projeto>/<arquivos>
 * /servicos/<nome-do-servico>/<arquivos>
 */
export async function baixarTodasMidiasZip(
  onProgress?: (progresso: MidiaDownloadProgress) => void,
): Promise<{ total: number; baixados: number; pulados: number }> {
  onProgress?.({
    atual: 0,
    total: 100,
    mensagem: 'Localizando projetos, serviços e suas mídias...',
    pulados: 0,
  })

  const itens = await coletarTodasMidiasEstruturadas()

  if (!itens || itens.length === 0) {
    throw new Error('Nenhuma mídia de projetos ou serviços foi encontrada para download.')
  }

  const zip = new JSZip()
  const total = itens.length
  let baixados = 0
  let pulados = 0

  // Controle de nomes colidentes na mesma pasta
  const nomesPorPasta = new Map<string, Set<string>>()

  for (let i = 0; i < total; i++) {
    const item = itens[i]
    onProgress?.({
      atual: i + 1,
      total,
      mensagem: `Baixando [${i + 1}/${total}]: ${item.pasta}/${item.nomeArquivo}...`,
      pulados,
    })

    const bytes = await baixarArquivoBytes(item.url)

    if (!bytes) {
      pulados++
      console.warn(`[ZIP] Arquivo não acessível ou ignorado: ${item.pasta}/${item.nomeArquivo}`)
      continue
    }

    // Resolver colisão de nomes na mesma subpasta
    let pastaSet = nomesPorPasta.get(item.pasta)
    if (!pastaSet) {
      pastaSet = new Set<string>()
      nomesPorPasta.set(item.pasta, pastaSet)
    }

    let nomeFinal = item.nomeArquivo
    if (pastaSet.has(nomeFinal.toLowerCase())) {
      const pontoIdx = nomeFinal.lastIndexOf('.')
      const nomeBase = pontoIdx > 0 ? nomeFinal.substring(0, pontoIdx) : nomeFinal
      const ext = pontoIdx > 0 ? nomeFinal.substring(pontoIdx) : ''
      let contador = 2
      while (pastaSet.has(`${nomeBase}_${contador}${ext}`.toLowerCase())) {
        contador++
      }
      nomeFinal = `${nomeBase}_${contador}${ext}`
    }
    pastaSet.add(nomeFinal.toLowerCase())

    const caminhoZip = `${item.pasta}/${nomeFinal}`
    zip.file(caminhoZip, bytes)
    baixados++
  }

  if (baixados === 0) {
    throw new Error('Nenhum arquivo pôde ser baixado com sucesso das URLs públicas.')
  }

  onProgress?.({
    atual: total,
    total,
    mensagem: 'Compactando pastas em arquivo ZIP...',
    pulados,
  })

  const blobZip = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // Disparar download no navegador
  const urlBlob = URL.createObjectURL(blobZip)
  const a = document.createElement('a')
  const dataHoje = new Date().toISOString().substring(0, 10)
  a.href = urlBlob
  a.download = `Gesso_Bettone_Midias_Projetos_Servicos_${dataHoje}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlBlob)

  return { total, baixados, pulados }
}

// Mantém export legado para compatibilidade se algum ponto ainda chamar
export async function obterInventarioMidias() {
  const itens = await coletarTodasMidiasEstruturadas()
  return {
    total: itens.length,
    itens: itens.map((it) => ({
      origem: it.pasta.startsWith('projetos') ? 'Portfólio' : 'Serviços',
      pasta: it.pasta,
      nome_arquivo: it.nomeArquivo,
      url: it.url,
    })),
  }
}
