import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import SEO from '@/components/landing/SEO'
import LandingCTA from '@/components/landing/LandingCTA'
import {
  Handshake,
  MessageCircle,
  ExternalLink,
  Sparkles,
  MapPin,
  Globe,
  Instagram,
  Mail,
  ArrowLeft,
  Building2,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import {
  obterParceiroPorSlug,
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

export const ParceiroDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [parceiro, setParceiro] = useState<SiteParceiro | null>(null)
  const [categoria, setCategoria] = useState<CategoriaParceiro | null>(null)
  const [outrosParceiros, setOutrosParceiros] = useState<SiteParceiro[]>([])
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function carregar() {
      setLoading(true)
      try {
        if (!slug) return
        const [p, todos, cats, cfg] = await Promise.all([
          obterParceiroPorSlug(slug),
          listarParceiros(true),
          listarCategoriasParceiros(true),
          obterConfiguracoes(),
        ])

        if (!isMounted) return
        setSettings(cfg)

        if (!p || !p.ativo) {
          setParceiro(null)
          setLoading(false)
          return
        }

        setParceiro(p)

        if (p.categoria) {
          const cat = cats.find(
            (c) => c.nome.toLowerCase() === p.categoria?.toLowerCase() || c.slug === p.categoria,
          )
          setCategoria(cat || null)
        }

        // Outros parceiros da mesma categoria ou gerais
        const relacionados = todos.filter((item) => item.id !== p.id && item.ativo).slice(0, 3)
        setOutrosParceiros(relacionados)
      } catch (err) {
        console.error('Erro ao carregar parceiro:', err)
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

  const handleWhatsAppClick = () => {
    if (!parceiro) return
    registrarCliqueParceiro(parceiro.id, parceiro.nome)
    registrarEventoAnalytics({
      tipo: 'click_whatsapp',
      metadata: {
        contexto: 'pagina_individual_parceiro',
        parceiro_id: parceiro.id,
        parceiro_nome: parceiro.nome,
      },
    })

    const zap = (parceiro.whatsapp || settings?.whatsapp_principal || '5519981093379').replace(
      /\D/g,
      '',
    )
    const msg = encodeURIComponent(
      `Olá! Encontrei o perfil de ${parceiro.nome} no site da Gesso Bettone e gostaria de mais informações.`,
    )
    window.open(`https://wa.me/${zap}?text=${msg}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#f4f4f4]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#2C3E50] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#616F7D]">Carregando parceiro...</p>
        </div>
      </div>
    )
  }

  if (!parceiro) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#f4f4f4] px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-[#DEE4EA] text-center space-y-4 shadow-xs">
          <Handshake className="w-12 h-12 text-[#616F7D] mx-auto opacity-50" />
          <h1 className="font-heading text-2xl font-bold text-[#2C3E50]">
            Parceiro não encontrado
          </h1>
          <p className="text-xs text-[#616F7D] leading-relaxed">
            O parceiro solicitado não está ativo ou o endereço pode ter sido alterado.
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

  const pSlug = parceiro.slug || gerarSlug(parceiro.nome)
  const logoUrl = parceiro.arquivo_logo
    ? resolverUrlMidia('site_partners', parceiro.id, parceiro.arquivo_logo)
    : parceiro.logo
  const capaUrl = parceiro.arquivo_capa
    ? resolverUrlMidia('site_partners', parceiro.id, parceiro.arquivo_capa)
    : parceiro.capa

  const metaTitle = `${parceiro.nome} — Parceiros Gesso Bettone`
  const metaDesc =
    parceiro.descricao ||
    `Conheça ${parceiro.nome}, parceiro homologado da Gesso Bettone em ${parceiro.cidade || 'São Pedro e região'}. ${parceiro.papel || 'Arquitetura, engenharia e construção civil'}.`

  const instagramLink = parceiro.instagram
    ? parceiro.instagram.startsWith('http')
      ? parceiro.instagram
      : `https://instagram.com/${parceiro.instagram.replace('@', '')}`
    : null

  return (
    <>
      <SEO
        title={metaTitle}
        description={metaDesc}
        canonical={`/parceiros/${pSlug}`}
        ogImage={capaUrl || logoUrl || undefined}
        keywords={[
          parceiro.nome.toLowerCase(),
          `parceiro ${parceiro.nome.toLowerCase()}`,
          parceiro.categoria ? parceiro.categoria.toLowerCase() : 'parceiro bettone',
          parceiro.cidade ? parceiro.cidade.toLowerCase() : 'são pedro sp',
          'arquitetura e construção',
          'gesso bettone parceiros',
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
                name: parceiro.nome,
                item: `${baseUrl}/parceiros/${pSlug}`,
              },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            '@id': `${baseUrl}/parceiros/${pSlug}#business`,
            name: parceiro.nome,
            description: metaDesc,
            url: `${baseUrl}/parceiros/${pSlug}`,
            image: logoUrl || capaUrl || undefined,
            telephone: parceiro.whatsapp ? `+${parceiro.whatsapp.replace(/\D/g, '')}` : undefined,
            email: parceiro.email || undefined,
            sameAs: [parceiro.site, instagramLink].filter(Boolean),
            address: {
              '@type': 'PostalAddress',
              streetAddress: parceiro.endereco || undefined,
              addressLocality: parceiro.cidade || 'São Pedro',
              addressRegion: 'SP',
              addressCountry: 'BR',
            },
            areaServed: buildAreaServedCities(settings?.cidades_atendidas),
            parentOrganization: {
              '@type': 'Organization',
              name: 'Gesso Bettone',
              url: `${baseUrl}/`,
            },
          },
        ]}
      />

      {/* Capa do Topo */}
      <section className="relative bg-[#2C3E50] text-white">
        <div className="h-48 sm:h-64 lg:h-72 w-full relative overflow-hidden bg-gradient-to-r from-[#1B2631] via-[#2C3E50] to-[#1B2631]">
          {capaUrl ? (
            <img
              src={capaUrl}
              alt={`Capa ${parceiro.nome}`}
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="absolute inset-0 bg-radial-at-c from-[#395066] to-[#1B2631] opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141C22] via-transparent to-black/20" />
        </div>

        {/* Barra de Navegação de Volta */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative -mt-12 sm:-mt-16 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              {/* Logo ou Iniciais Elegantes */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white border-4 border-white shadow-xl p-2.5 flex items-center justify-center overflow-hidden flex-shrink-0 z-10">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`Logo ${parceiro.nome}`}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full bg-[#2C3E50] text-[#D4AF37] rounded-xl flex items-center justify-center font-heading font-bold text-3xl sm:text-4xl tracking-wider shadow-inner">
                    {parceiro.nome.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider bg-white/10 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Parceiro Homologado
                  </span>
                  {parceiro.destaque && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2C3E50] bg-[#D4AF37] px-2.5 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Destaque
                    </span>
                  )}
                </div>

                <h1 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                  {parceiro.nome}
                </h1>

                {parceiro.papel && (
                  <p className="text-sm sm:text-base text-white/90 font-medium">{parceiro.papel}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/parceiros"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/20 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Todos os parceiros
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <section className="py-12 bg-[#f4f4f4]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna Esquerda: Descrição e Detalhes */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card de Apresentação */}
              <div className="bg-white rounded-2xl border border-[#DEE4EA] p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#DEE4EA] pb-4">
                  <h2 className="font-heading font-bold text-xl text-[#2C3E50]">
                    Sobre o Parceiro
                  </h2>
                  {categoria && (
                    <Link
                      to={`/parceiros/categoria/${categoria.slug}`}
                      className="text-xs font-semibold text-[#D4AF37] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Categoria: {categoria.nome}</span>
                    </Link>
                  )}
                </div>

                <div className="text-sm text-[#2C3E50] leading-relaxed whitespace-pre-line">
                  {parceiro.descricao || (
                    <p className="text-[#616F7D] italic">
                      {parceiro.nome} é uma empresa parceira homologada da Gesso Bettone, com
                      atuação reconhecida em acabamentos, arquitetura e construção civil em{' '}
                      {parceiro.cidade || 'São Pedro e região'}.
                    </p>
                  )}
                </div>

                {/* Selo de Sinergia */}
                <div className="mt-6 p-4 rounded-xl bg-[#f8fafc] border border-[#DEE4EA] flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-[#2C3E50] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#616F7D]">
                    <span className="font-semibold text-[#2C3E50] block mb-0.5">
                      Padrão de Qualidade Gesso Bettone
                    </span>
                    Este parceiro atua com alinhamento técnico e acabamento de alto padrão,
                    garantindo integração com projetos de forros, sancas, drywall e iluminação da
                    Bettone.
                  </div>
                </div>
              </div>

              {/* Botão de Contato Central */}
              {parceiro.whatsapp && (
                <div className="bg-gradient-to-r from-[#2C3E50] to-[#1B2631] text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading font-bold text-lg text-white">
                      Falar diretamente com {parceiro.nome}
                    </h3>
                    <p className="text-xs text-white/80 mt-1">
                      Atendimento rápido via WhatsApp comercial com recomendação Bettone.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleWhatsAppClick}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs shadow-md transition-all whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Iniciar conversa no WhatsApp</span>
                  </button>
                </div>
              )}
            </div>

            {/* Coluna Direita: Contatos e Informações */}
            <div className="space-y-6">
              {/* Card de Informações de Contato */}
              <div className="bg-white rounded-2xl border border-[#DEE4EA] p-6 shadow-xs space-y-4">
                <h3 className="font-heading font-bold text-base text-[#2C3E50]">
                  Canais de Contato
                </h3>

                <div className="space-y-3 text-xs text-[#2C3E50]">
                  {parceiro.whatsapp && (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#f8fafc] border border-[#DEE4EA]">
                      <span className="flex items-center gap-2 text-[#616F7D]">
                        <Phone className="w-4 h-4 text-[#25D366]" />
                        WhatsApp
                      </span>
                      <span className="font-mono font-semibold">{parceiro.whatsapp}</span>
                    </div>
                  )}

                  {parceiro.cidade && (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#f8fafc] border border-[#DEE4EA]">
                      <span className="flex items-center gap-2 text-[#616F7D]">
                        <MapPin className="w-4 h-4 text-[#D4AF37]" />
                        Localização
                      </span>
                      <span className="font-semibold text-right">{parceiro.cidade}</span>
                    </div>
                  )}

                  {parceiro.endereco && (
                    <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#DEE4EA] text-[11px] text-[#616F7D]">
                      <span className="font-semibold text-[#2C3E50] block mb-0.5">Endereço:</span>
                      {parceiro.endereco}
                    </div>
                  )}

                  {parceiro.email && (
                    <a
                      href={`mailto:${parceiro.email}`}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#f8fafc] border border-[#DEE4EA] hover:border-[#2C3E50] transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[#616F7D]">
                        <Mail className="w-4 h-4" />
                        E-mail
                      </span>
                      <span className="font-semibold truncate max-w-[160px]">{parceiro.email}</span>
                    </a>
                  )}

                  {parceiro.site && (
                    <a
                      href={parceiro.site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#f8fafc] border border-[#DEE4EA] hover:border-[#2C3E50] transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[#616F7D]">
                        <Globe className="w-4 h-4 text-[#2C3E50]" />
                        Site Oficial
                      </span>
                      <span className="font-semibold inline-flex items-center gap-1">
                        Visitar
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </a>
                  )}

                  {instagramLink && (
                    <a
                      href={instagramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#f8fafc] border border-[#DEE4EA] hover:border-[#2C3E50] transition-colors"
                    >
                      <span className="flex items-center gap-2 text-[#616F7D]">
                        <Instagram className="w-4 h-4 text-[#E4405F]" />
                        Instagram
                      </span>
                      <span className="font-semibold inline-flex items-center gap-1">
                        {parceiro.instagram?.replace(/^https?:\/\/.*instagram\.com\//, '@')}
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </a>
                  )}
                </div>

                {parceiro.whatsapp && (
                  <button
                    type="button"
                    onClick={handleWhatsAppClick}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs shadow-sm transition-all"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>Chamar no WhatsApp</span>
                  </button>
                )}
              </div>

              {/* Outros Parceiros Recomendados */}
              {outrosParceiros.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#DEE4EA] p-6 shadow-xs space-y-3">
                  <h3 className="font-heading font-bold text-sm text-[#2C3E50]">
                    Outros Parceiros Homologados
                  </h3>
                  <div className="space-y-2">
                    {outrosParceiros.map((out) => {
                      const outSlug = out.slug || gerarSlug(out.nome)
                      const outLogo = out.arquivo_logo
                        ? resolverUrlMidia('site_partners', out.id, out.arquivo_logo)
                        : out.logo
                      return (
                        <Link
                          key={out.id}
                          to={`/parceiros/${outSlug}`}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#f8fafc] transition-colors border border-transparent hover:border-[#DEE4EA]"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#f4f4f4] border border-[#DEE4EA] p-1 flex items-center justify-center flex-shrink-0">
                            {outLogo ? (
                              <img
                                src={outLogo}
                                alt={out.nome}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <span className="font-heading font-bold text-xs text-[#2C3E50]">
                                {out.nome.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-heading font-bold text-xs text-[#2C3E50] block truncate">
                              {out.nome}
                            </span>
                            <span className="text-[11px] text-[#616F7D] block truncate">
                              {out.papel || out.categoria || 'Parceiro'}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <LandingCTA
        titulo="Gostaria de cadastrar sua empresa como parceira?"
        subtitulo="Seja você arquiteto, designer ou engenheiro, atue em conjunto com o padrão de acabamento da Gesso Bettone."
        botaoTexto="Quero ser parceiro homologado"
      />
    </>
  )
}

export default ParceiroDetailPage
