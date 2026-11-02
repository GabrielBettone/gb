import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import SEO from '@/components/landing/SEO'
import LandingCTA from '@/components/landing/LandingCTA'
import {
  Handshake,
  MessageCircle,
  ExternalLink,
  Sparkles,
  MapPin,
  ArrowRight,
  ArrowLeft,
  FolderOpen,
} from 'lucide-react'
import {
  obterCategoriaParceiroPorSlug,
  listarCategoriasParceiros,
  listarParceiros,
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

export const ParceirosCategoriaPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()

  const [categoria, setCategoria] = useState<CategoriaParceiro | null>(null)
  const [todasCategorias, setTodasCategorias] = useState<CategoriaParceiro[]>([])
  const [parceiros, setParceiros] = useState<SiteParceiro[]>([])
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function carregar() {
      setLoading(true)
      try {
        if (!slug) return
        const [cat, cats, parts, cfg] = await Promise.all([
          obterCategoriaParceiroPorSlug(slug),
          listarCategoriasParceiros(true),
          listarParceiros(true),
          obterConfiguracoes(),
        ])

        if (!isMounted) return
        setSettings(cfg)
        setTodasCategorias(cats)

        if (!cat) {
          // Tentar encontrar pelo nome
          const match = cats.find(
            (c) =>
              c.slug === slug ||
              gerarSlug(c.nome) === slug ||
              c.nome.toLowerCase() === slug.toLowerCase(),
          )
          setCategoria(match || null)
          if (match) {
            setParceiros(parts.filter((p) => p.categoria === match.nome))
          }
        } else {
          setCategoria(cat)
          setParceiros(parts.filter((p) => p.categoria === cat.nome))
        }
      } catch (err) {
        console.error('Erro ao carregar categoria de parceiros:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    carregar()
    return () => {
      isMounted = false
    }
  }, [slug])

  const baseUrl = (settings?.site_url || 'https://gessobettone.com.br').replace(/\/+$/, '')

  const handleWhatsAppClick = (p: SiteParceiro, e: React.MouseEvent) => {
    e.stopPropagation()
    registrarCliqueParceiro(p.id, p.nome)
    registrarEventoAnalytics({
      tipo: 'click_whatsapp',
      metadata: { contexto: 'categoria_parceiros', parceiro_id: p.id, parceiro_nome: p.nome },
    })

    const zap = (p.whatsapp || settings?.whatsapp_principal || '5519981093379').replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Olá! Vim pela página de parceiros (${categoria?.nome || 'Parceiros'}) da Gesso Bettone e gostaria de falar com a equipe de ${p.nome}.`,
    )
    window.open(`https://wa.me/${zap}?text=${msg}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#f4f4f4]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#2C3E50] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#616F7D]">Carregando parceiros da categoria...</p>
        </div>
      </div>
    )
  }

  if (!categoria) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#f4f4f4] px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#DEE4EA] text-center space-y-4 shadow-xs">
          <FolderOpen className="w-12 h-12 text-[#616F7D] mx-auto opacity-50" />
          <h1 className="font-heading text-2xl font-bold text-[#2C3E50]">
            Categoria não encontrada
          </h1>
          <p className="text-xs text-[#616F7D] leading-relaxed">
            A categoria solicitada não existe ou foi desativada.
          </p>
          <div className="pt-2">
            <Link
              to="/parceiros"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2C3E50] text-white text-xs font-semibold hover:bg-[#1B2631] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Ver todos os parceiros
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const metaTitle = `Parceiros em ${categoria.nome} — Gesso Bettone`
  const metaDesc =
    categoria.descricao ||
    `Parceiros homologados da Gesso Bettone em ${categoria.nome}: arquitetos, engenheiros e construtores de São Pedro, Piracicaba e região.`

  return (
    <>
      <SEO
        title={metaTitle}
        description={metaDesc}
        canonical={`/parceiros/categoria/${categoria.slug}`}
        keywords={[
          categoria.nome.toLowerCase(),
          `parceiros ${categoria.nome.toLowerCase()}`,
          `${categoria.nome.toLowerCase()} são pedro sp`,
          `${categoria.nome.toLowerCase()} piracicaba`,
          'parceiros gesso bettone',
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
              {
                '@type': 'ListItem',
                position: 3,
                name: categoria.nome,
                item: `${baseUrl}/parceiros/categoria/${categoria.slug}`,
              },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `Parceiros Gesso Bettone — ${categoria.nome}`,
            description: metaDesc,
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
                    `${p.papel || 'Parceiro'} em ${p.cidade || 'São Pedro e região'}`,
                  telephone: p.whatsapp ? `+${p.whatsapp.replace(/\D/g, '')}` : undefined,
                  image: logoUrl || undefined,
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <Link
              to="/parceiros"
              className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para todos os parceiros</span>
            </Link>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-xs font-semibold tracking-wider uppercase text-white">
            <Handshake className="w-3.5 h-3.5 text-[#D4AF37]" />
            CATEGORIA DE PARCEIROS
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {categoria.nome}
          </h1>

          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            {categoria.descricao ||
              `Profissionais e empresas homologadas na área de ${categoria.nome} em São Pedro, Piracicaba e região.`}
          </p>
        </div>
      </section>

      {/* Lista de Parceiros da Categoria */}
      <section className="py-16 bg-[#f4f4f4] min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          {/* Navegação entre categorias */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/parceiros"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-[#616F7D] hover:bg-white/80 border border-[#DEE4EA] transition-all"
            >
              Todas as categorias
            </Link>
            {todasCategorias.map((cat) => (
              <Link
                key={cat.id}
                to={`/parceiros/categoria/${cat.slug}`}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  cat.slug === categoria.slug
                    ? 'bg-[#2C3E50] text-white shadow-sm'
                    : 'bg-white text-[#616F7D] hover:bg-white/80 border border-[#DEE4EA]'
                }`}
              >
                {cat.nome}
              </Link>
            ))}
          </div>

          {parceiros.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#DEE4EA] p-10 max-w-xl mx-auto shadow-xs">
              <Handshake className="w-12 h-12 text-[#DEE4EA] mx-auto mb-3" />
              <h3 className="font-heading font-bold text-lg text-[#2C3E50]">
                Nenhum parceiro cadastrado nesta categoria
              </h3>
              <p className="text-xs sm:text-sm text-[#616F7D] mt-2 leading-relaxed">
                Ainda não há parceiros ativos cadastrados em &quot;{categoria.nome}&quot;.
              </p>
              <div className="pt-6">
                <Link
                  to="/parceiros"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2C3E50] text-white font-bold text-xs shadow-sm transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Ver todas as categorias
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parceiros.map((p) => {
                const pSlug = p.slug || gerarSlug(p.nome)
                const logoUrl = p.arquivo_logo
                  ? resolverUrlMidia('site_partners', p.id, p.arquivo_logo)
                  : p.logo

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

                      {p.cidade && (
                        <div className="flex items-center gap-1 text-[11px] text-[#616F7D] mb-3">
                          <MapPin className="w-3 h-3 text-[#D4AF37]" />
                          <span>{p.cidade}</span>
                        </div>
                      )}

                      {p.descricao && (
                        <p className="text-xs text-[#616F7D] leading-relaxed mb-4 line-clamp-3">
                          {p.descricao}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#DEE4EA] space-y-2">
                      <Link
                        to={`/parceiros/${pSlug}`}
                        className="text-xs font-semibold text-[#2C3E50] hover:text-[#D4AF37] inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Ver perfil completo</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

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
        titulo={`Trabalha com ${categoria.nome}? Seja nosso parceiro`}
        subtitulo="Junte-se à rede de parceiros homologados da Gesso Bettone e receba indicações de clientes na região de São Pedro e Piracicaba."
        botaoTexto="Quero ser parceiro"
      />
    </>
  )
}

export default ParceirosCategoriaPage
