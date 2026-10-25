import pb from '@/lib/pocketbase/client'

// --- Tipagens ---

export interface SiteCategoria {
  id: string
  nome: string
  slug: string
  ativa: boolean
  ordem?: number
  created?: string
  updated?: string
}

export interface SiteServico {
  id: string
  nome: string
  slug: string
  categoria: string
  destaque: boolean
  ativo: boolean
  ordem?: number
  descricao_curta: string
  descricao_longa: string
  beneficios: string[]
  imagem_principal: string
  galeria: string[]
  arquivo_principal?: string
  arquivos_galeria?: string[]
  meta_title?: string
  meta_description?: string
  keywords?: string[]
  created?: string
  updated?: string
}

export interface SitePortfolioItem {
  id: string
  titulo: string
  slug: string
  categoria: string
  subtitulo?: string
  cidade?: string
  descricao: string
  detalhes_tecnicos?: string[]
  imagem_capa: string
  galeria: string[]
  arquivo_capa?: string
  arquivos_galeria?: string[]
  fotos_count?: number
  destaque: boolean
  ativo: boolean
  ordem?: number
  meta_title?: string
  meta_description?: string
  created?: string
  updated?: string
}

export interface SiteDepoimento {
  id: string
  nome: string
  cidade?: string
  texto: string
  nota: number
  aprovado: boolean
  ordem?: number
  created?: string
  updated?: string
}

export interface CategoriaParceiro {
  id: string
  nome: string
  slug: string
  ativa: boolean
  ordem?: number
  created?: string
  updated?: string
}

export interface SiteParceiro {
  id: string
  nome: string
  categoria?: string
  papel?: string
  whatsapp?: string
  logo?: string
  arquivo_logo?: string
  descricao?: string
  destaque: boolean
  ativo: boolean
  ordem?: number
  created?: string
  updated?: string
}

export interface PartnerClick {
  id: string
  parceiro_id: string
  parceiro_nome?: string
  data: string
  ano_mes: string
  visitor_id?: string
  created?: string
}

export interface SiteSettings {
  id?: string
  chave: string
  nome_site: string
  whatsapp_principal: string
  email_contato: string
  mensagem_orcamento: string
  instagram: string
  cnpj: string
  exibir_depoimentos: boolean
  cidades_atendidas: string[]
  pagina_parceiros_ativa: boolean
  arquivo_logo?: string
  logo_url?: string
  simulador_ativo?: boolean
  simulador_exigir_login?: boolean
  simulador_cota_padrao?: number
}

export interface SiteAnalyticsEvent {
  id: string
  tipo: 'pageview' | 'click_whatsapp' | 'contato' | 'click_servico' | 'view_categoria'
  pagina?: string
  servico_slug?: string
  servico_nome?: string
  categoria_nome?: string
  visitor_id?: string
  data: string
  data_dia: string
  metadata?: Record<string, any>
  created?: string
}

// Helpers para parser de JSON seguro
function parseJsonArray<T>(val: any, fallback: T[] = []): T[] {
  if (!val) return fallback
  if (Array.isArray(val)) return val
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

// --- SERVIÇOS DO SITE ---

export async function listarServicos(apenasAtivos = false): Promise<SiteServico[]> {
  try {
    const filter = apenasAtivos ? 'ativo = true' : ''
    const records = await pb.collection('site_services').getFullList({
      filter,
      sort: '-destaque,ordem,created',
    })
    return records.map((r) => ({
      id: r.id,
      nome: r.nome,
      slug: r.slug,
      categoria: r.categoria,
      destaque: !!r.destaque,
      ativo: !!r.ativo,
      ordem: r.ordem,
      descricao_curta: r.descricao_curta || '',
      descricao_longa: r.descricao_longa || '',
      beneficios: parseJsonArray<string>(r.beneficios),
      imagem_principal: r.imagem_principal || '',
      galeria: parseJsonArray<string>(r.galeria),
      arquivo_principal: r.arquivo_principal || '',
      arquivos_galeria: Array.isArray(r.arquivos_galeria)
        ? r.arquivos_galeria
        : r.arquivos_galeria
          ? [r.arquivos_galeria]
          : [],
      meta_title: r.meta_title,
      meta_description: r.meta_description,
      keywords: parseJsonArray<string>(r.keywords),
      created: r.created,
      updated: r.updated,
    }))
  } catch (err) {
    console.error('Erro ao listar servicos:', err)
    return []
  }
}

export async function obterServicoPorSlug(slug: string): Promise<SiteServico | null> {
  try {
    const record = await pb.collection('site_services').getFirstListItem(`slug = "${slug}"`)
    return {
      id: record.id,
      nome: record.nome,
      slug: record.slug,
      categoria: record.categoria,
      destaque: !!record.destaque,
      ativo: !!record.ativo,
      ordem: record.ordem,
      descricao_curta: record.descricao_curta || '',
      descricao_longa: record.descricao_longa || '',
      beneficios: parseJsonArray<string>(record.beneficios),
      imagem_principal: record.imagem_principal || '',
      galeria: parseJsonArray<string>(record.galeria),
      arquivo_principal: record.arquivo_principal || '',
      arquivos_galeria: Array.isArray(record.arquivos_galeria)
        ? record.arquivos_galeria
        : record.arquivos_galeria
          ? [record.arquivos_galeria]
          : [],
      meta_title: record.meta_title,
      meta_description: record.meta_description,
      keywords: parseJsonArray<string>(record.keywords),
      created: record.created,
      updated: record.updated,
    }
  } catch {
    return null
  }
}

export async function criarServico(
  data: Partial<SiteServico>,
  arquivos?: { arquivo_principal?: File; arquivos_galeria?: File[] },
): Promise<SiteServico> {
  if (
    arquivos &&
    (arquivos.arquivo_principal ||
      (arquivos.arquivos_galeria && arquivos.arquivos_galeria.length > 0))
  ) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      if (key === 'beneficios' || key === 'galeria' || key === 'keywords') {
        formData.append(key, JSON.stringify(val))
      } else {
        formData.append(key, String(val))
      }
    })
    if (arquivos.arquivo_principal) {
      formData.append('arquivo_principal', arquivos.arquivo_principal)
    }
    if (arquivos.arquivos_galeria && arquivos.arquivos_galeria.length > 0) {
      arquivos.arquivos_galeria.forEach((f) => formData.append('arquivos_galeria', f))
    }
    const record = await pb.collection('site_services').create(formData)
    return {
      ...record,
      beneficios: parseJsonArray<string>(record.beneficios),
      galeria: parseJsonArray<string>(record.galeria),
      keywords: parseJsonArray<string>(record.keywords),
      arquivo_principal: record.arquivo_principal,
      arquivos_galeria: record.arquivos_galeria || [],
    } as unknown as SiteServico
  }

  const payload = {
    ...data,
    beneficios: JSON.stringify(data.beneficios || []),
    galeria: JSON.stringify(data.galeria || []),
    keywords: JSON.stringify(data.keywords || []),
  }
  const record = await pb.collection('site_services').create(payload)
  return {
    ...record,
    beneficios: parseJsonArray<string>(record.beneficios),
    galeria: parseJsonArray<string>(record.galeria),
    keywords: parseJsonArray<string>(record.keywords),
  } as unknown as SiteServico
}

export async function atualizarServico(
  id: string,
  data: Partial<SiteServico>,
  arquivos?: { arquivo_principal?: File; arquivos_galeria?: File[] },
): Promise<SiteServico> {
  if (
    arquivos &&
    (arquivos.arquivo_principal ||
      (arquivos.arquivos_galeria && arquivos.arquivos_galeria.length > 0))
  ) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      if (key === 'beneficios' || key === 'galeria' || key === 'keywords') {
        formData.append(key, JSON.stringify(val))
      } else {
        formData.append(key, String(val))
      }
    })
    if (arquivos.arquivo_principal) {
      formData.append('arquivo_principal', arquivos.arquivo_principal)
    }
    if (arquivos.arquivos_galeria && arquivos.arquivos_galeria.length > 0) {
      arquivos.arquivos_galeria.forEach((f) => formData.append('arquivos_galeria', f))
    }
    const record = await pb.collection('site_services').update(id, formData)
    return {
      ...record,
      beneficios: parseJsonArray<string>(record.beneficios),
      galeria: parseJsonArray<string>(record.galeria),
      keywords: parseJsonArray<string>(record.keywords),
      arquivo_principal: record.arquivo_principal,
      arquivos_galeria: record.arquivos_galeria || [],
    } as unknown as SiteServico
  }

  const payload: any = { ...data }
  if (data.beneficios !== undefined) payload.beneficios = JSON.stringify(data.beneficios)
  if (data.galeria !== undefined) payload.galeria = JSON.stringify(data.galeria)
  if (data.keywords !== undefined) payload.keywords = JSON.stringify(data.keywords)

  const record = await pb.collection('site_services').update(id, payload)
  return {
    ...record,
    beneficios: parseJsonArray<string>(record.beneficios),
    galeria: parseJsonArray<string>(record.galeria),
    keywords: parseJsonArray<string>(record.keywords),
  } as unknown as SiteServico
}

export async function excluirServico(id: string): Promise<boolean> {
  await pb.collection('site_services').delete(id)
  return true
}

// --- CATEGORIAS DO SITE ---

export async function listarCategorias(apenasAtivas = false): Promise<SiteCategoria[]> {
  try {
    const filter = apenasAtivas ? 'ativa = true' : ''
    const records = await pb.collection('site_categories').getFullList({
      filter,
      sort: 'ordem,nome',
    })
    return records.map((r) => ({
      id: r.id,
      nome: r.nome,
      slug: r.slug,
      ativa: !!r.ativa,
      ordem: r.ordem,
      created: r.created,
      updated: r.updated,
    }))
  } catch (err) {
    console.error('Erro ao listar categorias:', err)
    return []
  }
}

export async function criarCategoria(data: Partial<SiteCategoria>): Promise<SiteCategoria> {
  const record = await pb.collection('site_categories').create(data)
  return {
    id: record.id,
    nome: record.nome,
    slug: record.slug,
    ativa: !!record.ativa,
    ordem: record.ordem,
  }
}

export async function atualizarCategoria(
  id: string,
  data: Partial<SiteCategoria>,
): Promise<SiteCategoria> {
  const record = await pb.collection('site_categories').update(id, data)
  return {
    id: record.id,
    nome: record.nome,
    slug: record.slug,
    ativa: !!record.ativa,
    ordem: record.ordem,
  }
}

export async function excluirCategoria(id: string): Promise<boolean> {
  await pb.collection('site_categories').delete(id)
  return true
}

// --- PORTFÓLIO DO SITE ---

export async function listarPortfolio(apenasAtivos = false): Promise<SitePortfolioItem[]> {
  try {
    const filter = apenasAtivos ? 'ativo = true' : ''
    const records = await pb.collection('site_portfolio').getFullList({
      filter,
      sort: '-destaque,ordem,created',
    })
    return records.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      slug: r.slug,
      categoria: r.categoria,
      subtitulo: r.subtitulo,
      cidade: r.cidade,
      descricao: r.descricao,
      detalhes_tecnicos: parseJsonArray<string>(r.detalhes_tecnicos),
      imagem_capa: r.imagem_capa || '',
      galeria: parseJsonArray<string>(r.galeria),
      arquivo_capa: r.arquivo_capa || '',
      arquivos_galeria: Array.isArray(r.arquivos_galeria)
        ? r.arquivos_galeria
        : r.arquivos_galeria
          ? [r.arquivos_galeria]
          : [],
      fotos_count: r.fotos_count || parseJsonArray<string>(r.galeria).length,
      destaque: !!r.destaque,
      ativo: !!r.ativo,
      ordem: r.ordem,
      meta_title: r.meta_title,
      meta_description: r.meta_description,
      created: r.created,
      updated: r.updated,
    }))
  } catch (err) {
    console.error('Erro ao listar portfolio:', err)
    return []
  }
}

export async function obterProjetoPorId(id: string): Promise<SitePortfolioItem | null> {
  try {
    const record = await pb.collection('site_portfolio').getOne(id)
    return {
      id: record.id,
      titulo: record.titulo,
      slug: record.slug,
      categoria: record.categoria,
      subtitulo: record.subtitulo,
      cidade: record.cidade,
      descricao: record.descricao,
      detalhes_tecnicos: parseJsonArray<string>(record.detalhes_tecnicos),
      imagem_capa: record.imagem_capa || '',
      galeria: parseJsonArray<string>(record.galeria),
      arquivo_capa: record.arquivo_capa || '',
      arquivos_galeria: Array.isArray(record.arquivos_galeria)
        ? record.arquivos_galeria
        : record.arquivos_galeria
          ? [record.arquivos_galeria]
          : [],
      fotos_count: record.fotos_count || parseJsonArray<string>(record.galeria).length,
      destaque: !!record.destaque,
      ativo: !!record.ativo,
      ordem: record.ordem,
      meta_title: record.meta_title,
      meta_description: record.meta_description,
      created: record.created,
      updated: record.updated,
    }
  } catch {
    return null
  }
}

export async function obterProjetoPorSlug(slug: string): Promise<SitePortfolioItem | null> {
  try {
    const record = await pb.collection('site_portfolio').getFirstListItem(`slug = "${slug}"`)
    return {
      id: record.id,
      titulo: record.titulo,
      slug: record.slug,
      categoria: record.categoria,
      subtitulo: record.subtitulo,
      cidade: record.cidade,
      descricao: record.descricao,
      detalhes_tecnicos: parseJsonArray<string>(record.detalhes_tecnicos),
      imagem_capa: record.imagem_capa || '',
      galeria: parseJsonArray<string>(record.galeria),
      arquivo_capa: record.arquivo_capa || '',
      arquivos_galeria: Array.isArray(record.arquivos_galeria)
        ? record.arquivos_galeria
        : record.arquivos_galeria
          ? [record.arquivos_galeria]
          : [],
      fotos_count: record.fotos_count || parseJsonArray<string>(record.galeria).length,
      destaque: !!record.destaque,
      ativo: !!record.ativo,
      ordem: record.ordem,
      meta_title: record.meta_title,
      meta_description: record.meta_description,
      created: record.created,
      updated: record.updated,
    }
  } catch {
    return null
  }
}

export async function criarProjeto(
  data: Partial<SitePortfolioItem>,
  arquivos?: { arquivo_capa?: File; arquivos_galeria?: File[] },
): Promise<SitePortfolioItem> {
  if (
    arquivos &&
    (arquivos.arquivo_capa || (arquivos.arquivos_galeria && arquivos.arquivos_galeria.length > 0))
  ) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      if (key === 'detalhes_tecnicos' || key === 'galeria') {
        formData.append(key, JSON.stringify(val))
      } else {
        formData.append(key, String(val))
      }
    })
    if (arquivos.arquivo_capa) {
      formData.append('arquivo_capa', arquivos.arquivo_capa)
    }
    if (arquivos.arquivos_galeria && arquivos.arquivos_galeria.length > 0) {
      arquivos.arquivos_galeria.forEach((f) => formData.append('arquivos_galeria', f))
    }
    const record = await pb.collection('site_portfolio').create(formData)
    return {
      ...record,
      detalhes_tecnicos: parseJsonArray<string>(record.detalhes_tecnicos),
      galeria: parseJsonArray<string>(record.galeria),
      arquivo_capa: record.arquivo_capa,
      arquivos_galeria: record.arquivos_galeria || [],
    } as unknown as SitePortfolioItem
  }

  const payload = {
    ...data,
    detalhes_tecnicos: JSON.stringify(data.detalhes_tecnicos || []),
    galeria: JSON.stringify(data.galeria || []),
  }
  const record = await pb.collection('site_portfolio').create(payload)
  return {
    ...record,
    detalhes_tecnicos: parseJsonArray<string>(record.detalhes_tecnicos),
    galeria: parseJsonArray<string>(record.galeria),
  } as unknown as SitePortfolioItem
}

export async function atualizarProjeto(
  id: string,
  data: Partial<SitePortfolioItem>,
  arquivos?: { arquivo_capa?: File; arquivos_galeria?: File[] },
): Promise<SitePortfolioItem> {
  if (
    arquivos &&
    (arquivos.arquivo_capa || (arquivos.arquivos_galeria && arquivos.arquivos_galeria.length > 0))
  ) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      if (key === 'detalhes_tecnicos' || key === 'galeria') {
        formData.append(key, JSON.stringify(val))
      } else {
        formData.append(key, String(val))
      }
    })
    if (arquivos.arquivo_capa) {
      formData.append('arquivo_capa', arquivos.arquivo_capa)
    }
    if (arquivos.arquivos_galeria && arquivos.arquivos_galeria.length > 0) {
      arquivos.arquivos_galeria.forEach((f) => formData.append('arquivos_galeria', f))
    }
    const record = await pb.collection('site_portfolio').update(id, formData)
    return {
      ...record,
      detalhes_tecnicos: parseJsonArray<string>(record.detalhes_tecnicos),
      galeria: parseJsonArray<string>(record.galeria),
      arquivo_capa: record.arquivo_capa,
      arquivos_galeria: record.arquivos_galeria || [],
    } as unknown as SitePortfolioItem
  }

  const payload: any = { ...data }
  if (data.detalhes_tecnicos !== undefined)
    payload.detalhes_tecnicos = JSON.stringify(data.detalhes_tecnicos)
  if (data.galeria !== undefined) payload.galeria = JSON.stringify(data.galeria)

  const record = await pb.collection('site_portfolio').update(id, payload)
  return {
    ...record,
    detalhes_tecnicos: parseJsonArray<string>(record.detalhes_tecnicos),
    galeria: parseJsonArray<string>(record.galeria),
  } as unknown as SitePortfolioItem
}

export async function excluirProjeto(id: string): Promise<boolean> {
  await pb.collection('site_portfolio').delete(id)
  return true
}

// --- DEPOIMENTOS ---

export async function listarDepoimentos(apenasAprovados = false): Promise<SiteDepoimento[]> {
  try {
    const filter = apenasAprovados ? 'aprovado = true' : ''
    const records = await pb.collection('site_testimonials').getFullList({
      filter,
      sort: 'ordem,-created',
    })
    return records.map((r) => ({
      id: r.id,
      nome: r.nome,
      cidade: r.cidade,
      texto: r.texto,
      nota: r.nota || 5,
      aprovado: !!r.aprovado,
      ordem: r.ordem,
      created: r.created,
      updated: r.updated,
    }))
  } catch (err) {
    console.error('Erro ao listar depoimentos:', err)
    return []
  }
}

export async function criarDepoimento(data: Partial<SiteDepoimento>): Promise<SiteDepoimento> {
  const record = await pb.collection('site_testimonials').create(data)
  return {
    id: record.id,
    nome: record.nome,
    cidade: record.cidade,
    texto: record.texto,
    nota: record.nota || 5,
    aprovado: !!record.aprovado,
    ordem: record.ordem,
    created: record.created,
  }
}

export async function atualizarDepoimento(
  id: string,
  data: Partial<SiteDepoimento>,
): Promise<SiteDepoimento> {
  const record = await pb.collection('site_testimonials').update(id, data)
  return {
    id: record.id,
    nome: record.nome,
    cidade: record.cidade,
    texto: record.texto,
    nota: record.nota || 5,
    aprovado: !!record.aprovado,
    ordem: record.ordem,
  }
}

export async function excluirDepoimento(id: string): Promise<boolean> {
  await pb.collection('site_testimonials').delete(id)
  return true
}

// --- PARCEIROS & CATEGORIAS DE PARCEIROS ---

export async function listarCategoriasParceiros(
  apenasAtivas = false,
): Promise<CategoriaParceiro[]> {
  try {
    const filter = apenasAtivas ? 'ativa = true' : ''
    const records = await pb.collection('partner_categories').getFullList({
      filter,
      sort: 'ordem,nome',
    })
    return records.map((r) => ({
      id: r.id,
      nome: r.nome,
      slug: r.slug,
      ativa: !!r.ativa,
      ordem: r.ordem,
      created: r.created,
    }))
  } catch (err) {
    console.error('Erro ao listar categorias de parceiros:', err)
    return []
  }
}

export async function criarCategoriaParceiro(
  data: Partial<CategoriaParceiro>,
): Promise<CategoriaParceiro> {
  const record = await pb.collection('partner_categories').create(data)
  return {
    id: record.id,
    nome: record.nome,
    slug: record.slug,
    ativa: !!record.ativa,
    ordem: record.ordem,
  }
}

export async function atualizarCategoriaParceiro(
  id: string,
  data: Partial<CategoriaParceiro>,
): Promise<CategoriaParceiro> {
  const record = await pb.collection('partner_categories').update(id, data)
  return {
    id: record.id,
    nome: record.nome,
    slug: record.slug,
    ativa: !!record.ativa,
    ordem: record.ordem,
  }
}

export async function excluirCategoriaParceiro(id: string): Promise<boolean> {
  await pb.collection('partner_categories').delete(id)
  return true
}

export async function listarParceiros(apenasAtivos = false): Promise<SiteParceiro[]> {
  try {
    const filter = apenasAtivos ? 'ativo = true' : ''
    const records = await pb.collection('site_partners').getFullList({
      filter,
      sort: '-destaque,ordem,nome',
    })
    return records.map((r) => ({
      id: r.id,
      nome: r.nome,
      categoria: r.categoria,
      papel: r.papel,
      whatsapp: r.whatsapp,
      logo: r.logo,
      arquivo_logo: r.arquivo_logo || '',
      descricao: r.descricao,
      destaque: !!r.destaque,
      ativo: !!r.ativo,
      ordem: r.ordem,
      created: r.created,
      updated: r.updated,
    }))
  } catch (err) {
    console.error('Erro ao listar parceiros:', err)
    return []
  }
}

export async function criarParceiro(
  data: Partial<SiteParceiro>,
  arquivoLogo?: File,
): Promise<SiteParceiro> {
  if (arquivoLogo) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined && val !== null) formData.append(key, String(val))
    })
    formData.append('arquivo_logo', arquivoLogo)
    const record = await pb.collection('site_partners').create(formData)
    return {
      id: record.id,
      nome: record.nome,
      categoria: record.categoria,
      papel: record.papel,
      whatsapp: record.whatsapp,
      logo: record.logo,
      arquivo_logo: record.arquivo_logo,
      descricao: record.descricao,
      destaque: !!record.destaque,
      ativo: !!record.ativo,
      ordem: record.ordem,
    }
  }

  const record = await pb.collection('site_partners').create(data)
  return {
    id: record.id,
    nome: record.nome,
    categoria: record.categoria,
    papel: record.papel,
    whatsapp: record.whatsapp,
    logo: record.logo,
    arquivo_logo: record.arquivo_logo,
    descricao: record.descricao,
    destaque: !!record.destaque,
    ativo: !!record.ativo,
    ordem: record.ordem,
  }
}

export async function atualizarParceiro(
  id: string,
  data: Partial<SiteParceiro>,
  arquivoLogo?: File,
): Promise<SiteParceiro> {
  if (arquivoLogo) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined && val !== null) formData.append(key, String(val))
    })
    formData.append('arquivo_logo', arquivoLogo)
    const record = await pb.collection('site_partners').update(id, formData)
    return {
      id: record.id,
      nome: record.nome,
      categoria: record.categoria,
      papel: record.papel,
      whatsapp: record.whatsapp,
      logo: record.logo,
      arquivo_logo: record.arquivo_logo,
      descricao: record.descricao,
      destaque: !!record.destaque,
      ativo: !!record.ativo,
      ordem: record.ordem,
    }
  }

  const record = await pb.collection('site_partners').update(id, data)
  return {
    id: record.id,
    nome: record.nome,
    categoria: record.categoria,
    papel: record.papel,
    whatsapp: record.whatsapp,
    logo: record.logo,
    arquivo_logo: record.arquivo_logo,
    descricao: record.descricao,
    destaque: !!record.destaque,
    ativo: !!record.ativo,
    ordem: record.ordem,
  }
}

export async function excluirParceiro(id: string): Promise<boolean> {
  await pb.collection('site_partners').delete(id)
  return true
}

export async function registrarCliqueParceiro(
  parceiroId: string,
  parceiroNome: string,
): Promise<void> {
  try {
    const now = new Date()
    const isoDate = now.toISOString()
    const anoMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const visitorId = getOrCreateVisitorId()
    await pb.collection('partner_clicks').create({
      parceiro_id: parceiroId,
      parceiro_nome: parceiroNome,
      data: isoDate,
      ano_mes: anoMes,
      visitor_id: visitorId,
    })
  } catch (err) {
    console.error('Erro ao registrar clique parceiro:', err)
  }
}

export async function listarCliquesParceiros(anoMes?: string): Promise<PartnerClick[]> {
  try {
    const filter = anoMes ? `ano_mes = "${anoMes}"` : ''
    const records = await pb.collection('partner_clicks').getFullList({
      filter,
      sort: '-created',
    })
    return records.map((r) => ({
      id: r.id,
      parceiro_id: r.parceiro_id,
      parceiro_nome: r.parceiro_nome,
      data: r.data,
      ano_mes: r.ano_mes,
      visitor_id: r.visitor_id,
      created: r.created,
    }))
  } catch (err) {
    console.error('Erro ao listar cliques:', err)
    return []
  }
}

// --- CONFIGURAÇÕES DO SITE ---

const FALLBACK_SETTINGS: SiteSettings = {
  chave: 'geral',
  nome_site: 'Gesso Bettone',
  whatsapp_principal: '5519981093379',
  email_contato: 'contato@gessobettone.com.br',
  mensagem_orcamento: 'Olá! Vim pelo site da Gesso Bettone e gostaria de solicitar um orçamento.',
  instagram: 'https://www.instagram.com/gessobettone_saopedro',
  cnpj: '53.242.055/0001-74',
  exibir_depoimentos: true,
  pagina_parceiros_ativa: true,
  cidades_atendidas: [
    'São Pedro/SP',
    'Águas de São Pedro/SP',
    'Piracicaba/SP',
    'Charqueada/SP',
    'Santa Maria da Serra/SP',
    'Rio Claro/SP',
    'Brotas/SP',
    'Torrinha/SP',
    'Itirapina/SP',
  ],
}

export async function obterConfiguracoes(): Promise<SiteSettings> {
  try {
    const record = await pb.collection('site_settings').getFirstListItem('chave = "geral"')
    const pbBase = import.meta.env.VITE_POCKETBASE_URL || ''
    const logoUrl = record.arquivo_logo
      ? `${pbBase.replace(/\/+$/, '')}/api/files/${record.collectionId}/${record.id}/${record.arquivo_logo}`
      : record.logo_url || ''

    return {
      id: record.id,
      chave: record.chave,
      nome_site: record.nome_site || FALLBACK_SETTINGS.nome_site,
      whatsapp_principal: record.whatsapp_principal || FALLBACK_SETTINGS.whatsapp_principal,
      email_contato: record.email_contato || FALLBACK_SETTINGS.email_contato,
      mensagem_orcamento: record.mensagem_orcamento || FALLBACK_SETTINGS.mensagem_orcamento,
      instagram: record.instagram || FALLBACK_SETTINGS.instagram,
      cnpj: record.cnpj || FALLBACK_SETTINGS.cnpj,
      exibir_depoimentos: record.exibir_depoimentos !== false,
      pagina_parceiros_ativa: record.pagina_parceiros_ativa !== false,
      cidades_atendidas: parseJsonArray<string>(
        record.cidades_atendidas,
        FALLBACK_SETTINGS.cidades_atendidas,
      ),
      arquivo_logo: record.arquivo_logo || '',
      logo_url: logoUrl,
      simulador_ativo: record.simulador_ativo !== false,
      simulador_exigir_login: !!record.simulador_exigir_login,
      simulador_cota_padrao: record.simulador_cota_padrao ?? 5,
    }
  } catch {
    return FALLBACK_SETTINGS
  }
}

export async function salvarConfiguracoes(
  settings: Partial<SiteSettings>,
  arquivoLogo?: File | null,
): Promise<SiteSettings> {
  let existingId: string | null = null
  let existingRecord: any = null
  try {
    existingRecord = await pb.collection('site_settings').getFirstListItem('chave = "geral"')
    existingId = existingRecord.id
  } catch {
    /* intentionally ignored */
  }

  let resultRecord: any

  if (arquivoLogo) {
    const formData = new FormData()
    formData.append('chave', 'geral')
    Object.entries(settings).forEach(([key, val]) => {
      if (val === undefined || val === null) return
      if (key === 'cidades_atendidas') {
        formData.append(key, JSON.stringify(val))
      } else {
        formData.append(key, String(val))
      }
    })
    formData.append('arquivo_logo', arquivoLogo)

    if (existingId) {
      resultRecord = await pb.collection('site_settings').update(existingId, formData)
    } else {
      resultRecord = await pb.collection('site_settings').create(formData)
    }
  } else {
    const payload: any = {
      chave: 'geral',
      ...settings,
    }
    if (settings.cidades_atendidas !== undefined) {
      payload.cidades_atendidas = JSON.stringify(settings.cidades_atendidas)
    }

    if (existingId) {
      resultRecord = await pb.collection('site_settings').update(existingId, payload)
    } else {
      resultRecord = await pb.collection('site_settings').create(payload)
    }
  }

  const pbBase = import.meta.env.VITE_POCKETBASE_URL || ''
  const logoUrl = resultRecord.arquivo_logo
    ? `${pbBase.replace(/\/+$/, '')}/api/files/${resultRecord.collectionId}/${resultRecord.id}/${resultRecord.arquivo_logo}`
    : resultRecord.logo_url || ''

  return {
    id: resultRecord.id,
    chave: resultRecord.chave,
    nome_site: resultRecord.nome_site,
    whatsapp_principal: resultRecord.whatsapp_principal,
    email_contato: resultRecord.email_contato,
    mensagem_orcamento: resultRecord.mensagem_orcamento,
    instagram: resultRecord.instagram,
    cnpj: resultRecord.cnpj,
    exibir_depoimentos: !!resultRecord.exibir_depoimentos,
    pagina_parceiros_ativa: !!resultRecord.pagina_parceiros_ativa,
    cidades_atendidas: parseJsonArray<string>(resultRecord.cidades_atendidas),
    arquivo_logo: resultRecord.arquivo_logo,
    logo_url: logoUrl,
    simulador_ativo: resultRecord.simulador_ativo !== false,
    simulador_exigir_login: !!resultRecord.simulador_exigir_login,
    simulador_cota_padrao: resultRecord.simulador_cota_padrao ?? 5,
  }
}

// --- RASTREAMENTO REAL & ANALYTICS ---

export function getOrCreateVisitorId(): string {
  try {
    const KEY = 'gb_visitor_id'
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = 'v_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36)
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return 'anon_' + Math.random().toString(36).substring(2, 9)
  }
}

export async function registrarEventoAnalytics(params: {
  tipo: 'pageview' | 'click_whatsapp' | 'contato' | 'click_servico' | 'view_categoria'
  pagina?: string
  servico_slug?: string
  servico_nome?: string
  categoria_nome?: string
  metadata?: Record<string, any>
}): Promise<void> {
  try {
    const now = new Date()
    const isoDate = now.toISOString()
    const dataDia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`
    const visitorId = getOrCreateVisitorId()

    await pb.collection('site_analytics_events').create({
      tipo: params.tipo,
      pagina: params.pagina || (typeof window !== 'undefined' ? window.location.pathname : ''),
      servico_slug: params.servico_slug || '',
      servico_nome: params.servico_nome || '',
      categoria_nome: params.categoria_nome || '',
      visitor_id: visitorId,
      data: isoDate,
      data_dia: dataDia,
      metadata: params.metadata || {},
    })
  } catch (err) {
    // Fail silently in public view
    console.debug('Analytics event could not be logged:', err)
  }
}

export async function carregarDadosAnalytics(dias = 30): Promise<{
  visitantesUnicos: number
  visitas: number
  pageviews: number
  eventosCliques: number
  simulador: number
  contatos: number
  visitasPorDia: { data: string; label: string; count: number }[]
  eventosPorDia: { data: string; label: string; count: number }[]
  categoriasMaisAcessadas: { nome: string; count: number }[]
  servicosMaisVisualizados: { nome: string; count: number }[]
}> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - dias)
    const startDateStr = startDate.toISOString()

    const records = await pb.collection('site_analytics_events').getFullList({
      filter: `data >= "${startDateStr}"`,
      sort: 'data',
    })

    const visitorsSet = new Set<string>()
    const visitasSessions = new Set<string>()
    let pageviews = 0
    let eventosCliques = 0
    let contatos = 0
    const simulador = 0

    // Agrupadores por dia
    const visitasDiaMap = new Map<string, Set<string>>()
    const eventosDiaMap = new Map<string, number>()
    const categoriasCountMap = new Map<string, number>()
    const servicosCountMap = new Map<string, number>()

    // Inicializar os dias no range
    for (let i = dias; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`
      visitasDiaMap.set(dStr, new Set())
      eventosDiaMap.set(dStr, 0)
    }

    records.forEach((rec) => {
      const dia = rec.data_dia || (rec.data ? rec.data.substring(0, 10) : '')
      const vId = rec.visitor_id || 'unknown'
      visitorsSet.add(vId)

      // Sessão de visita simples: vId + dia
      visitasSessions.add(`${vId}_${dia}`)

      if (rec.tipo === 'pageview') {
        pageviews++
        if (dia && visitasDiaMap.has(dia)) {
          visitasDiaMap.get(dia)!.add(vId)
        }
      } else {
        eventosCliques++
        if (dia && eventosDiaMap.has(dia)) {
          eventosDiaMap.set(dia, (eventosDiaMap.get(dia) || 0) + 1)
        }
      }

      if (rec.tipo === 'click_whatsapp' || rec.tipo === 'contato') {
        contatos++
      }

      if (rec.categoria_nome) {
        categoriasCountMap.set(
          rec.categoria_nome,
          (categoriasCountMap.get(rec.categoria_nome) || 0) + 1,
        )
      }

      if (rec.servico_nome) {
        servicosCountMap.set(rec.servico_nome, (servicosCountMap.get(rec.servico_nome) || 0) + 1)
      }
    })

    const visitasPorDia = Array.from(visitasDiaMap.entries()).map(([data, vSet]) => {
      const [ano, mes, dia] = data.split('-')
      return {
        data,
        label: `${dia}/${mes}`,
        count: vSet.size,
      }
    })

    const eventosPorDia = Array.from(eventosDiaMap.entries()).map(([data, count]) => {
      const [ano, mes, dia] = data.split('-')
      return {
        data,
        label: `${dia}/${mes}`,
        count,
      }
    })

    const categoriasMaisAcessadas = Array.from(categoriasCountMap.entries())
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const servicosMaisVisualizados = Array.from(servicosCountMap.entries())
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      visitantesUnicos: visitorsSet.size,
      visitas: visitasSessions.size,
      pageviews,
      eventosCliques,
      simulador,
      contatos,
      visitasPorDia,
      eventosPorDia,
      categoriasMaisAcessadas,
      servicosMaisVisualizados,
    }
  } catch (err) {
    console.error('Erro ao carregar dados analytics:', err)
    return {
      visitantesUnicos: 0,
      visitas: 0,
      pageviews: 0,
      eventosCliques: 0,
      simulador: 0,
      contatos: 0,
      visitasPorDia: [],
      eventosPorDia: [],
      categoriasMaisAcessadas: [],
      servicosMaisVisualizados: [],
    }
  }
}
