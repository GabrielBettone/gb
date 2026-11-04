/**
 * Gerador de sitemap.xml (roda no "prebuild", antes do vite build).
 *
 * Fontes de dados suportadas (a mesma lógica do dataAdapter do app):
 *  (a) Supabase self-hosted — VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (REST /rest/v1)
 *  (b) PocketBase / Skip Cloud — VITE_POCKETBASE_URL (REST /api/collections)
 *
 * Regra crítica: se a geração falhar, o build FALHA (process.exit(1)).
 * Nunca mascarar erro como sucesso — o sitemap antigo não pode ir para o ar em silêncio.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Carrega variáveis do .env local (scripts Node não carregam .env automaticamente)
function carregarEnvLocal() {
  try {
    const envPath = path.join(ROOT, '.env')
    if (!fs.existsSync(envPath)) return
    const conteudo = fs.readFileSync(envPath, 'utf8')
    for (const linha of conteudo.split('\n')) {
      const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const chave = m[1]
      let valor = m[2].trim()
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1)
      }
      if (process.env[chave] === undefined && valor) {
        process.env[chave] = valor
      }
    }
  } catch (errEnv) {
    console.warn('[sitemap] Aviso: não foi possível ler o .env local:', errEnv.message)
  }
}

carregarEnvLocal()

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const POCKETBASE_URL = (process.env.VITE_POCKETBASE_URL || '').replace(/\/+$/, '')

function fonteAtiva() {
  if (SUPABASE_URL && SUPABASE_KEY) return 'supabase'
  if (POCKETBASE_URL) return 'pocketbase'
  return 'nenhuma'
}

/** Fallback de slug derivado do nome, igual ao hook do PocketBase */
function slugify(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function campo(registro, ...nomes) {
  for (const n of nomes) {
    const v = registro && registro[n]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function dataMod(registro) {
  const iso = campo(registro, 'updated', 'updated_at', 'created', 'created_at')
  const d = iso ? new Date(iso) : null
  if (d && !isNaN(d.getTime())) return d.toISOString().substring(0, 10)
  return new Date().toISOString().substring(0, 10)
}

async function fetchJson(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} em ${url}${corpo ? ' — ' + corpo.slice(0, 300) : ''}`)
  }
  return res.json()
}

/**
 * Busca registros de uma coleção na fonte de dados ativa.
 * Lança erro (que falha o build) se a consulta não funcionar.
 */
async function fetchRows(colecao, campoAtivo) {
  if (fonteAtiva() === 'supabase') {
    const url = `${SUPABASE_URL}/rest/v1/${colecao}?select=*&${campoAtivo}=eq.true&limit=1000`
    const dados = await fetchJson(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
      },
    })
    if (!Array.isArray(dados)) {
      throw new Error(`Resposta inesperada do Supabase em ${colecao}`)
    }
    return dados
  }

  // PocketBase (Skip Cloud)
  const filtro = encodeURIComponent(`${campoAtivo}=true`)
  const url = `${POCKETBASE_URL}/api/collections/${colecao}/records?perPage=1000&filter=${filtro}`
  const dados = await fetchJson(url, { headers: { Accept: 'application/json' } })
  if (!dados || !Array.isArray(dados.items)) {
    throw new Error(`Resposta inesperada do PocketBase em ${colecao}`)
  }
  return dados.items
}

/** URL Base do Site — mesma fonte usada pelas demais URLs do sitemap */
async function obterSiteUrl() {
  try {
    if (fonteAtiva() === 'supabase') {
      const url = `${SUPABASE_URL}/rest/v1/site_settings?select=site_url&chave=eq.geral&limit=1`
      const linhas = await fetchJson(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: 'application/json',
        },
      })
      const u = linhas && linhas[0] && linhas[0].site_url
      if (u) return String(u).trim().replace(/\/+$/, '')
    } else if (fonteAtiva() === 'pocketbase') {
      const filtro = encodeURIComponent(`chave="geral"`)
      const url = `${POCKETBASE_URL}/api/collections/site_settings/records?perPage=1&filter=${filtro}`
      const dados = await fetchJson(url, { headers: { Accept: 'application/json' } })
      const u = dados && dados.items && dados.items[0] && dados.items[0].site_url
      if (u) return String(u).trim().replace(/\/+$/, '')
    }
  } catch (errCfg) {
    console.warn(
      '[sitemap] Aviso: não foi possível ler site_url das Configurações:',
      errCfg.message,
    )
  }
  return 'https://gessobettone.com.br'
}

function montarUrlUrl(registro, siteUrl, prefixo, campoSlug) {
  let slug = campo(registro, campoSlug)
  if (!slug) {
    slug = slugify(campo(registro, 'nome', 'titulo', 'title'))
  }
  if (!slug) return null
  const isDestaque = campo(registro, 'destaque') === true
  return {
    loc: `${siteUrl}${prefixo}/${slug}`,
    lastmod: dataMod(registro),
    priority: isDestaque ? '0.85' : '0.8',
  }
}

function adicionarUrl(xml, u, changefreq) {
  xml += '  <url>\n'
  xml += `    <loc>${u.loc}</loc>\n`
  xml += `    <lastmod>${u.lastmod}</lastmod>\n`
  xml += `    <changefreq>${changefreq}</changefreq>\n`
  xml += `    <priority>${u.priority}</priority>\n`
  xml += '  </url>\n'
  return xml
}

async function coletarSecao(nome, colecao, campoAtivo, siteUrl, prefixo, changefreq, campoSlug) {
  try {
    const registros = await fetchRows(colecao, campoAtivo)
    const urls = []
    for (const r of registros) {
      const u = montarUrlUrl(r, siteUrl, prefixo, campoSlug)
      if (u) urls.push(u)
    }
    console.log(`[sitemap] ${nome}: ${urls.length} URL(s) ativa(s) encontradas.`)
    return urls
  } catch (err) {
    // FALHA REAL: propaga — o build deve quebrar, nunca mascarar
    throw new Error(
      `[sitemap] Falha ao consultar "${colecao}" (fonte: ${fonteAtiva()}) para o sitemap: ${err.message}`,
    )
  }
}

async function main() {
  console.log(`[sitemap] Fonte de dados: ${fonteAtiva()}`)
  if (fonteAtiva() === 'nenhuma') {
    throw new Error(
      '[sitemap] Nenhuma fonte de dados configurada. Defina VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (self-hosted) ou VITE_POCKETBASE_URL (Skip Cloud).',
    )
  }

  const siteUrl = await obterSiteUrl()
  console.log(`[sitemap] URL base do site: ${siteUrl}`)

  const hoje = new Date().toISOString().substring(0, 10)

  const rotasEstaticas = [
    { loc: `${siteUrl}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${siteUrl}/servicos`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${siteUrl}/portfolio`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${siteUrl}/parceiros`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${siteUrl}/sobre`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${siteUrl}/contato`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${siteUrl}/simulador`, priority: '0.85', changefreq: 'weekly' },
  ]

  // 3.2 Serviços ativos
  const urlsServicos = await coletarSecao(
    'Serviços',
    'site_services',
    'ativo',
    siteUrl,
    '/servicos',
    'monthly',
    'slug',
  )
  // 3.3 Projetos de portfólio ativos
  const urlsPortfolio = await coletarSecao(
    'Portfólio',
    'site_portfolio',
    'ativo',
    siteUrl,
    '/portfolio',
    'monthly',
    'slug',
  )
  // 3.4 Categorias de parceiros ativas (/parceiros/categoria/:slug)
  const urlsCategorias = await coletarSecao(
    'Categorias de parceiros',
    'partner_categories',
    'ativa',
    siteUrl,
    '/parceiros/categoria',
    'weekly',
    'slug',
  )
  // 3.5 Parceiros ativos (/parceiros/:slug)
  const urlsParceiros = await coletarSecao(
    'Parceiros',
    'site_partners',
    'ativo',
    siteUrl,
    '/parceiros',
    'weekly',
    'slug',
  )

  if (urlsCategorias.length === 0) {
    console.warn(
      '[sitemap] ATENÇÃO: nenhuma categoria de parceiro ativa retornada (consulta OK, base vazia ou todas inativas).',
    )
  }
  if (urlsParceiros.length === 0) {
    console.warn(
      '[sitemap] ATENÇÃO: nenhum parceiro ativo retornado (consulta OK, base vazia ou todos inativos).',
    )
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  for (const r of rotasEstaticas) {
    xml = adicionarUrl(xml, { loc: r.loc, lastmod: hoje, priority: r.priority }, r.changefreq)
  }
  for (const u of urlsServicos) xml = adicionarUrl(xml, u, 'monthly')
  for (const u of urlsPortfolio) xml = adicionarUrl(xml, u, 'monthly')
  for (const u of urlsCategorias) xml = adicionarUrl(xml, u, 'weekly')
  for (const u of urlsParceiros) xml = adicionarUrl(xml, u, 'weekly')
  xml += '</urlset>'

  const destino = path.join(ROOT, 'public', 'sitemap.xml')
  fs.writeFileSync(destino, xml, 'utf8')

  const total =
    rotasEstaticas.length +
    urlsServicos.length +
    urlsPortfolio.length +
    urlsCategorias.length +
    urlsParceiros.length
  console.log(
    `[sitemap] OK: ${destino} gerado com ${total} URL(s) (parceiros: ${urlsParceiros.length}, categorias: ${urlsCategorias.length}).`,
  )
}

main().catch((err) => {
  // SEM máscara: erro na geração do sitemap precisa FALHAR o build.
  console.error('\n========================================')
  console.error('[sitemap] FALHA NA GERAÇÃO DO SITEMAP:')
  console.error(err && err.message ? err.message : err)
  console.error('========================================\n')
  process.exit(1)
})
