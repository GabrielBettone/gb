import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SERVICOS as FALLBACK_SERVICOS } from '@/data/landingData'
import { ArrowRight, Star, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  listarServicos,
  listarCategorias,
  SiteServico,
  registrarEventoAnalytics,
} from '@/services/site'
import WatermarkedImage from '@/components/landing/WatermarkedImage'
import { resolverUrlMidia } from '@/lib/watermark'

interface Props {
  limit?: number
  showFilter?: boolean
}

export const LandingServicos: React.FC<Props> = ({ limit, showFilter = false }) => {
  const [filter, setFilter] = useState<string>('Todos')
  const [servicos, setServicos] = useState<SiteServico[]>([])
  const [categorias, setCategorias] = useState<string[]>(['Todos', 'Residencial', 'Fachadas'])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function carregar() {
      try {
        const [servs, cats] = await Promise.all([listarServicos(true), listarCategorias(true)])
        if (!isMounted) return
        if (servs.length > 0) {
          setServicos(servs)
        } else {
          // fallback
          setServicos(
            FALLBACK_SERVICOS.map((s, idx) => ({
              id: `fallback-${idx}`,
              nome: s.titulo,
              slug: s.slug,
              categoria: s.categoria,
              destaque: !!s.destaque,
              ativo: true,
              ordem: idx + 1,
              descricao_curta: s.descricaoCurta,
              descricao_longa: s.descricaoCompleta,
              beneficios: s.beneficios,
              imagem_principal: s.imagemPrincipal,
              galeria: s.galeria,
            })),
          )
        }

        if (cats.length > 0) {
          setCategorias(['Todos', ...cats.map((c) => c.nome)])
        }
      } catch (err) {
        console.error('Erro ao carregar servicos do banco:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    carregar()
    return () => {
      isMounted = false
    }
  }, [])

  const filtered = servicos.filter((s) => {
    if (filter === 'Todos') return true
    const lista = s.categorias && s.categorias.length > 0 ? s.categorias : [s.categoria]
    return lista.includes(filter)
  })

  const displayed = limit ? filtered.slice(0, limit) : filtered

  const handleFilterClick = (cat: string) => {
    setFilter(cat)
    if (cat !== 'Todos') {
      registrarEventoAnalytics({
        tipo: 'view_categoria',
        categoria_nome: cat,
      })
    }
  }

  return (
    <section className="py-16 bg-[#f4f4f4]" id="servicos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#2C3E50] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              O QUE FAZEMOS
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2C3E50] tracking-tight">
              Serviços Especializados
            </h2>
            <p className="text-sm sm:text-base text-[#616F7D] mt-1.5 max-w-2xl">
              Soluções completas em gesso acartonado, drywall, sancas, boiseries e acabamentos
              arquitetônicos para transformar seu ambiente.
            </p>
          </div>

          {/* Filtros ou Link Ver Todos */}
          {showFilter ? (
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-[#DEE4EA] self-start md:self-auto">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleFilterClick(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === cat
                      ? 'bg-[#2C3E50] text-white shadow-xs'
                      : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-[#f4f4f4]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : (
            limit && (
              <Link
                to="/servicos"
                className="inline-flex items-center text-sm font-semibold text-[#2C3E50] hover:text-[#D4AF37] group transition-colors"
              >
                Ver todos os {servicos.length} serviços
                <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
              </Link>
            )
          )}
        </div>

        {/* Grade de Cards de Serviços */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map((servico) => (
            <article
              key={servico.slug}
              className="bg-white rounded-xl border border-[#DEE4EA] overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col group hover:border-[#2C3E50]/40"
            >
              {/* Imagem do Serviço com Marca D'Água Automática */}
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                {(() => {
                  const fotoPrincipal = servico.arquivo_principal
                    ? resolverUrlMidia('site_services', servico.id, servico.arquivo_principal)
                    : servico.imagem_principal

                  const primeiraFotoGaleria =
                    servico.arquivos_galeria && servico.arquivos_galeria.length > 0
                      ? resolverUrlMidia('site_services', servico.id, servico.arquivos_galeria[0])
                      : servico.galeria && servico.galeria.length > 0
                        ? resolverUrlMidia('site_services', servico.id, servico.galeria[0])
                        : ''

                  const fotoCapa = fotoPrincipal || primeiraFotoGaleria

                  return (
                    <WatermarkedImage
                      src={fotoCapa}
                      alt={servico.nome}
                      loading="lazy"
                      enableWatermark={true}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )
                })()}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {servico.destaque && (
                    <Badge className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] text-[10px] font-bold border-none shadow-xs flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Destaque
                    </Badge>
                  )}
                  {(servico.categorias && servico.categorias.length > 0
                    ? servico.categorias
                    : [servico.categoria]
                  ).map((catNome, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-black/60 backdrop-blur text-white text-[10px] font-medium border-none"
                    >
                      {catNome}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#2C3E50] group-hover:text-[#2C3E50] transition-colors mb-2">
                    <Link
                      to={`/servicos/${servico.slug}`}
                      className="focus:outline-hidden"
                      onClick={() => {
                        registrarEventoAnalytics({
                          tipo: 'click_servico',
                          servico_slug: servico.slug,
                          servico_nome: servico.nome,
                        })
                      }}
                    >
                      {servico.nome}
                    </Link>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#616F7D] line-clamp-3 leading-relaxed">
                    {servico.descricao_curta}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#DEE4EA] flex items-center justify-between">
                  <Link
                    to={`/servicos/${servico.slug}`}
                    className="text-xs font-semibold text-[#2C3E50] group-hover:text-[#D4AF37] transition-colors flex items-center"
                    onClick={() => {
                      registrarEventoAnalytics({
                        tipo: 'click_servico',
                        servico_slug: servico.slug,
                        servico_nome: servico.nome,
                      })
                    }}
                  >
                    Ver detalhes e fotos
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <span className="text-[11px] text-[#616F7D]">
                    {(() => {
                      const total =
                        (servico.arquivos_galeria?.length || 0) +
                        (servico.galeria?.length || 0) +
                        (servico.arquivo_principal || servico.imagem_principal ? 1 : 0)
                      return `${total} ${total === 1 ? 'foto' : 'fotos'}`
                    })()}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Rodapé da seção (se tiver limite na home) */}
        {limit && (
          <div className="mt-10 text-center">
            <Link
              to="/servicos"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-[#DEE4EA] text-sm font-semibold text-[#2C3E50] hover:bg-[#E8EDF2] hover:border-[#2C3E50]/30 transition-all shadow-xs"
            >
              Explorar catálogo completo de serviços ({servicos.length})
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

export default LandingServicos
