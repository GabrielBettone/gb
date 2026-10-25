import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const publicDir = path.resolve(projectRoot, 'public')
const sitemapPath = path.resolve(publicDir, 'sitemap.xml')

// Fallback de rotas estáticas públicas da aplicação Bettone
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/servicos', changefreq: 'weekly', priority: '0.9' },
  { path: '/portfolio', changefreq: 'weekly', priority: '0.9' },
  { path: '/parceiros', changefreq: 'weekly', priority: '0.8' },
  { path: '/sobre', changefreq: 'monthly', priority: '0.7' },
  { path: '/contato', changefreq: 'monthly', priority: '0.8' },
  { path: '/simulador', changefreq: 'weekly', priority: '0.85' },
]

// Fallback das URLs estáticas do catálogo padrão de serviços (caso a API remota esteja inacessível na build)
const FALLBACK_SERVICOS = [
  'forros-de-gesso',
  'parede-drywall',
  'molduras-e-boiseries',
  'molduras-de-gesso',
  'rebaixo-de-teto',
  'cortineiros-de-gesso',
  'sancas-e-cortineiros',
  'moveis',
  'revestimento-em-placa-3d',
  'molduras-externas-em-cimento-celular',
  'colunas-de-gesso',
  'vitrais',
  'forro-de-madeira',
  'pintura',
  'impermeabilizacao-de-telhados',
]

function getHoje() {
  return new Date().toISOString().substring(0, 10)
}

function normalizeDate(d) {
  if (!d) return getHoje()
  try {
    return d.substring(0, 10)
  } catch {
    return getHoje()
  }
}

async function fetchFromSupabase(baseUrl, anonKey) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  }

  let siteUrl = 'https://gessobettone.com.br'

  // 1. Tentar ler site_settings
  try {
    const resCfg = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/rest/v1/site_settings?chave=eq.geral&select=site_url,updated_at`,
      { headers },
    )
    if (resCfg.ok) {
      const dataCfg = await resCfg.json()
      if (Array.isArray(dataCfg) && dataCfg.length > 0 && dataCfg[0].site_url) {
        siteUrl = String(dataCfg[0].site_url).trim().replace(/\/+$/, '')
      }
    }
  } catch (err) {
    console.warn('[sitemap-generator] Aviso ao consultar site_settings no Supabase:', err.message)
  }

  // 2. Buscar serviços ativos
  let servicos = []
  try {
    const resSrv = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/rest/v1/site_services?ativo=eq.true&select=slug,updated_at,created_at,destaque&order=destaque.desc,ordem.asc`,
      { headers },
    )
    if (resSrv.ok) {
      servicos = await resSrv.json()
    }
  } catch (err) {
    console.warn('[sitemap-generator] Aviso ao consultar site_services no Supabase:', err.message)
  }

  // 3. Buscar portfolio ativo
  let portfolio = []
  try {
    const resPort = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/rest/v1/site_portfolio?ativo=eq.true&select=slug,updated_at,created_at,destaque&order=destaque.desc,ordem.asc`,
      { headers },
    )
    if (resPort.ok) {
      portfolio = await resPort.json()
    }
  } catch (err) {
    console.warn('[sitemap-generator] Aviso ao consultar site_portfolio no Supabase:', err.message)
  }

  return { siteUrl, servicos, portfolio }
}

async function fetchFromPocketBase(baseUrl) {
  let siteUrl = 'https://gessobettone.com.br'

  try {
    const resCfg = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/api/collections/site_settings/records?filter=chave='geral'&perPage=1`,
    )
    if (resCfg.ok) {
      const jsonCfg = await resCfg.json()
      if (jsonCfg.items && jsonCfg.items[0] && jsonCfg.items[0].site_url) {
        siteUrl = String(jsonCfg.items[0].site_url).trim().replace(/\/+$/, '')
      }
    }
  } catch (_) {}

  let servicos = []
  try {
    const resSrv = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/api/collections/site_services/records?filter=ativo=true&perPage=500&sort=-destaque,ordem`,
    )
    if (resSrv.ok) {
      const jsonSrv = await resSrv.json()
      servicos = jsonSrv.items || []
    }
  } catch (_) {}

  let portfolio = []
  try {
    const resPort = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/api/collections/site_portfolio/records?filter=ativo=true&perPage=500&sort=-destaque,ordem`,
    )
    if (resPort.ok) {
      const jsonPort = await resPort.json()
      portfolio = jsonPort.items || []
    }
  } catch (_) {}

  return { siteUrl, servicos, portfolio }
}

function buildXml(siteUrl, itens) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  for (const item of itens) {
    xml += '  <url>\n'
    xml += `    <loc>${item.loc}</loc>\n`
    xml += `    <lastmod>${item.lastmod}</lastmod>\n`
    xml += `    <changefreq>${item.changefreq}</changefreq>\n`
    xml += `    <priority>${item.priority}</priority>\n`
    xml += '  </url>\n'
  }

  xml += '</urlset>\n'
  return xml
}

async function main() {
  console.log('[sitemap-generator] Iniciando geração do sitemap.xml para indexação Google...')

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const pbUrl = process.env.VITE_POCKETBASE_URL

  let siteUrl = 'https://gessobettone.com.br'
  let servicos = []
  let portfolio = []
  let dataFetched = false

  try {
    if (supabaseUrl && supabaseKey) {
      console.log('[sitemap-generator] Consultando serviços na API Supabase...')
      const res = await fetchFromSupabase(supabaseUrl, supabaseKey)
      siteUrl = res.siteUrl || siteUrl
      servicos = res.servicos || []
      portfolio = res.portfolio || []
      dataFetched = true
    } else if (pbUrl) {
      console.log('[sitemap-generator] Consultando serviços no PocketBase...')
      const res = await fetchFromPocketBase(pbUrl)
      siteUrl = res.siteUrl || siteUrl
      servicos = res.servicos || []
      portfolio = res.portfolio || []
      dataFetched = true
    }
  } catch (err) {
    console.warn(
      '[sitemap-generator] Aviso: não foi possível obter os dados da API remota durante a build:',
      err.message,
    )
  }

  const hoje = getHoje()
  const itens = []

  // 1. Adicionar rotas estáticas públicas (sem /painel, /login, etc.)
  for (const r of STATIC_ROUTES) {
    itens.push({
      loc: `${siteUrl}${r.path}`,
      lastmod: hoje,
      changefreq: r.changefreq,
      priority: r.priority,
    })
  }

  // 2. Adicionar cada serviço ativo
  if (servicos.length > 0) {
    console.log(`[sitemap-generator] Adicionando ${servicos.length} serviços dinâmicos ativos...`)
    for (const s of servicos) {
      const slug = s.slug
      if (!slug) continue
      const lastmod = normalizeDate(s.updated_at || s.updated || s.created_at || s.created)
      const isDestaque = !!s.destaque
      itens.push({
        loc: `${siteUrl}/servicos/${slug}`,
        lastmod,
        changefreq: 'monthly',
        priority: isDestaque ? '0.85' : '0.8',
      })
    }
  } else {
    console.log(
      `[sitemap-generator] Usando catálogo padrão de serviços (${FALLBACK_SERVICOS.length} itens)...`,
    )
    for (const slug of FALLBACK_SERVICOS) {
      itens.push({
        loc: `${siteUrl}/servicos/${slug}`,
        lastmod: hoje,
        changefreq: 'monthly',
        priority: '0.8',
      })
    }
  }

  // 3. Adicionar cada projeto de portfólio ativo
  if (portfolio.length > 0) {
    console.log(
      `[sitemap-generator] Adicionando ${portfolio.length} projetos de portfólio ativos...`,
    )
    for (const p of portfolio) {
      const slug = p.slug
      if (!slug) continue
      const lastmod = normalizeDate(p.updated_at || p.updated || p.created_at || p.created)
      const isDestaque = !!p.destaque
      itens.push({
        loc: `${siteUrl}/portfolio/${slug}`,
        lastmod,
        changefreq: 'monthly',
        priority: isDestaque ? '0.85' : '0.8',
      })
    }
  }

  // 4. Gravar public/sitemap.xml de forma resiliente
  const xml = buildXml(siteUrl, itens)
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  fs.writeFileSync(sitemapPath, xml, 'utf8')
  console.log(
    `[sitemap-generator] Sucesso! ${itens.length} URLs gravadas em public/sitemap.xml (Domínio: ${siteUrl})`,
  )
}

main().catch((err) => {
  // Garantir que a build NUNCA quebre mesmo se algo der errado
  console.error('[sitemap-generator] Erro não fatal durante geração do sitemap:', err)
  process.exit(0)
})
