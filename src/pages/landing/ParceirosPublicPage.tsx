import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SEO from '@/components/landing/SEO'
import LandingCTA from '@/components/landing/LandingCTA'
import {
  Handshake,
  MessageCircle,
  ExternalLink,
  Sparkles,
  MapPin,
  ArrowRight,
  Globe,
  Instagram,
} from 'lucide-react'
import {
  listarParceiros,
  listarCategoriasParceiros,
  obterConfiguracoes,
  registrarCliqueParceiro,
  SiteParceiro,
  CategoriaParceiro,
  SiteSettings,
  registrarEventoAnalytics,
} from '@/services/site'
import { resolverUrlMidia } from '@/lib/watermark'
import { buildAreaServedCities } from '@/lib/geoStructuredData'

function gerarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const ParceirosPublicPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const catParam = searchParams.get('categoria')

  const [parceiros, setParceiros] = useState<SiteParceiro[]>([])
  const [categorias, setCategorias] = useState<CategoriaParceiro[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todos')
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function carregar() {
      try {
        const [parts, cats, cfg] = await Promise.all([
          listarParceiros(true),
          listarCategoriasParceiros(true),
          obterConfiguracoes(),
        ])
        if (!isMounted) return
        setParceiros(parts)
        setCategorias(cats)
        setSettings(cfg)

        if (catParam) {
          const matchCat = cats.find(
            (c) => c.slug === catParam || c.nome.toLowerCase() === catParam.toLowerCase(),
          )
          if (matchCat) {
            setFiltroCategoria(matchCat.nome)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar parceiros:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    carregar()
    return () => {
      isMounted = false
    }
  }, [catParam])

  const filtered = parceiros.filter((p) => {
    if (filtroCategoria === 'Todos') return true
    return p.categoria === filtroCategoria
  })

  const handleWhatsAppClick = (p: SiteParceiro, e: React.MouseEvent) => {
    e.stopPropagation()
    registrarCliqueParceiro(p.id, p.nome)
    registrarEventoAnalytics({
      tipo: 'click_whatsapp',
      metadata: { contexto: 'pagina_publica_parceiros', parceiro_id: p.id, parceiro_nome: p.nome },
    })

    const zap = (p.whatsapp || settings?.whatsapp_principal || '5519981093379').replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Olá! Vim pela página de parceiros do site da Gesso Bettone e gostaria de falar com a equipe de ${p.nome}.`,
    )
    window.open(`https://wa.me/${zap}?text=${msg}`, '_blank')
  }

  const baseUrl = (settings?.site_url || 'https://gessobettone.com.br').replace(/\/+$/, '')

  return (
    <>
      <SEO
        title="Parceiros de Arquitetura, Construção e Pintura | Gesso Bettone"
        description="Conheça os parceiros homologados da Gesso Bettone: arquitetos, designers de interiores, engenheiros, construtores e especialistas em acabamentos em São Pedro, Piracicaba e região."
        canonical="/parceiros"
        keywords={[
          'parceiros gesso bettone',
          'arquitetos são pedro sp',
          'engenheiros são pedro',
          'construção piracicaba',
          'design de interiores são pedro',
          'pintores homologados',
          'reformas águas de são pedro',
        ]}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Início',
                item: `${baseUrl}/`,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Parceiros',
                item: `${baseUrl}/parceiros`,
              },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Rede de Parceiros Homologados Gesso Bettone',
            description:
              'Arquitetos, designers de interiores, engenheiros e construtores recomendados pela Gesso Bettone.',
            numberOfItems: parceiros.length,
            itemListElement: parceiros.map((p, idx) => {
              const pSlug = p.slug || gerarSlug(p.nome)
              const logoUrl = p.arquivo_logo
                ? resolverUrlMidia('site_partners', p.id, p.arquivo_logo)
                : p.logo
              return {
                '@type': 'ListItem',
                position: idx + 1,
                url: `${baseUrl}/parceiros/${pSlug}`,
                item: {
                  '@type': 'LocalBusiness',
                  name: p.nome,
                  url: `${baseUrl}/parceiros/${pSlug}`,
                  description:
                    p.descricao ||
                    `${p.papel || 'Parceiro homologado'} em ${p.cidade || 'São Pedro e região'}`,
                  telephone: p.whatsapp ? `+${p.whatsapp.replace(/\D/g, '')}` : undefined,
                  image: logoUrl || undefined,
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: p.cidade || 'São Pedro',
                    addressRegion: 'SP',
                    addressCountry: 'BR',
                  },
                  areaServed: buildAreaServedCities(settings?.cidades_atendidas),
                },
              }
            }),
          },
        ]}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#2C3E50] to-[#1B2631] text-white py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-at-c from-[#395066] to-[#1B2631] opacity-70" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-xs font-semibold tracking-wider uppercase text-white">
            <Handshake className="w-3.5 h-3.5 text-[#D4AF37]" />
            REDE DE CONFIANÇA BETTONE
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Nossos Parceiros Homologados
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Arquitetos, designers de interiores, engenheiros e construtores de alta reputação que
            recomendamos e atuam em sinergia com os padrões de acabamento da Gesso Bettone.
          </p>
        </div>
      </section>

      {/* Lista e Filtros */}
      <section className="py-16 bg-[#f4f4f4] min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Barra de Filtros por Categoria */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <button
              onClick={() => setFiltroCategoria('Todos')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filtroCategoria === 'Todos'
                  ? 'bg-[#2C3E50] text-white shadow-sm'
                  : 'bg-white text-[#616F7D] hover:bg-white/80 border border-[#DEE4EA]'
              }`}
            >
              Todos ({parceiros.length})
            </button>
            {categorias.map((cat) => {
              const count = parceiros.filter((p) => p.categoria === cat.nome).length
              return (
                <button
                  key={cat.id}
                  onClick={() => setFiltroCategoria(cat.nome)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    filtroCategoria === cat.nome
                      ? 'bg-[#2C3E50] text-white shadow-sm'
                      : 'bg-white text-[#616F7D] hover:bg-white/80 border border-[#DEE4EA]'
                  }`}
                >
                  {cat.nome} {count > 0 && `(${count})`}
                </button>
              )
            })}
          </div>

          {/* Grid de Parceiros */}
          {loading ? (
            <div className="text-center py-16 text-[#616F7D] text-sm">Carregando parceiros...</div>
          ) : parceiros.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#DEE4EA] p-10 max-w-xl mx-auto shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#2C3E50]/10 text-[#2C3E50] flex items-center justify-center mx-auto mb-4">
                <Handshake className="w-7 h-7 text-[#2C3E50]" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#2C3E50]">
                Rede de parceiros em homologação
              </h3>
              <p className="text-xs sm:text-sm text-[#616F7D] mt-2 leading-relaxed">
                Estamos selecionando e atualizando a lista de arquitetos, engenheiros, construtores
                e especialistas em acabamento da nossa região (São Pedro, Piracicaba e cidades
                vizinhas).
              </p>
              <div className="pt-6">
                <a
                  href={`https://wa.me/5519981093379?text=${encodeURIComponent('Olá! Sou profissional da construção/arquitetura e gostaria de me conectar à rede de parceiros da Gesso Bettone.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Cadastre sua empresa como parceira
                </a>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#DEE4EA] p-8 max-w-lg mx-auto">
              <Handshake className="w-12 h-12 text-[#DEE4EA] mx-auto mb-3" />
              <h3 className="font-heading font-bold text-base text-[#2C3E50]">
                Nenhum parceiro nesta categoria
              </h3>
              <p className="text-xs text-[#616F7D] mt-1">
                Selecione outra categoria ou clique em &quot;Todos&quot; para visualizar os demais
                parceiros recomendados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((p) => {
                const pSlug = p.slug || gerarSlug(p.nome)
                const logoUrl = p.arquivo_logo
                  ? resolverUrlMidia('site_partners', p.id, p.arquivo_logo)
                  : p.logo
                const catObj = categorias.find((c) => c.nome === p.categoria)

                return (
                  <article
                    key={p.id}
                    className="bg-white rounded-2xl border border-[#DEE4EA] p-6 flex flex-col justify-between hover:shadow-md hover:border-[#2C3E50]/40 transition-all group relative"
                  >
                    {p.destaque && (
                      <div className="absolute top-4 right-4 inline-flex items-center gap-1 text-[10px] font-bold bg-[#D4AF37]/15 text-[#2C3E50] px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40">
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        Destaque
                      </div>
                    )}

                    <div>
                      {/* Logo ou Iniciais Elegantes */}
                      <Link
                        to={`/parceiros/${pSlug}`}
                        className="w-24 h-24 rounded-2xl bg-[#f4f4f4] border border-[#DEE4EA] p-3 flex items-center justify-center mb-5 overflow-hidden group-hover:scale-105 transition-transform block"
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={`Logo ${p.nome}`}
                            className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#2C3E50] text-[#D4AF37] rounded-xl flex items-center justify-center font-heading font-bold text-2xl tracking-wider shadow-xs">
                            {p.nome.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </Link>

                      <h2 className="font-heading font-bold text-xl text-[#2C3E50] mb-1 group-hover:text-[#D4AF37] transition-colors">
                        <Link to={`/parceiros/${pSlug}`}>{p.nome}</Link>
                      </h2>

                      {p.papel && (
                        <span className="inline-block text-xs font-semibold text-[#D4AF37] mb-2">
                          {p.papel}
                        </span>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#616F7D] mb-3">
                        {p.categoria && (
                          <span className="bg-[#f4f4f4] px-2 py-0.5 rounded-md font-medium">
                            {p.categoria}
                          </span>
                        )}
                        {p.cidade && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#D4AF37]" />
                            {p.cidade}
                          </span>
                        )}
                      </div>

                      {p.descricao && (
                        <p className="text-xs text-[#616F7D] leading-relaxed mb-4 line-clamp-3">
                          {p.descricao}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#DEE4EA] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/parceiros/${pSlug}`}
                          className="text-xs font-semibold text-[#2C3E50] hover:text-[#D4AF37] inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Ver perfil completo</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>

                        {catObj && (
                          <Link
                            to={`/parceiros/categoria/${catObj.slug}`}
                            className="text-[11px] text-[#616F7D] hover:underline"
                          >
                            Ver categoria
                          </Link>
                        )}
                      </div>

                      {p.whatsapp && (
                        <button
                          type="button"
                          onClick={(e) => handleWhatsAppClick(p, e)}
                          className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-xs transition-all"
                        >
                          <MessageCircle className="w-4 h-4 fill-current" />
                          <span>Falar no WhatsApp</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Final */}
      <LandingCTA
        titulo="Quer se tornar um parceiro oficial Gesso Bettone?"
        subtitulo="Se você é arquiteto, engenheiro ou construtor e preza por acabamento impecável em suas obras, junte-se à nossa rede de parceiros homologados."
        botaoTexto="Quero ser parceiro"
      />
    </>
  )
}

export default ParceirosPublicPage
