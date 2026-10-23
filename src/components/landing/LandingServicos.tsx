import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { SERVICOS } from '@/data/landingData'
import { ArrowRight, Star, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Props {
  limit?: number
  showFilter?: boolean
}

export const LandingServicos: React.FC<Props> = ({ limit, showFilter = false }) => {
  const [filter, setFilter] = useState<'Todos' | 'Residencial' | 'Fachadas'>('Todos')

  const filtered = SERVICOS.filter((s) => {
    if (filter === 'Todos') return true
    return s.categoria === filter
  })

  const displayed = limit ? filtered.slice(0, limit) : filtered

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
            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-[#DEE4EA] self-start md:self-auto">
              {(['Todos', 'Residencial', 'Fachadas'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
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
                Ver todos os {SERVICOS.length} serviços
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
              {/* Imagem do Serviço */}
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <img
                  src={servico.imagemPrincipal}
                  alt={servico.titulo}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {servico.destaque && (
                    <Badge className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] text-[10px] font-bold border-none shadow-xs flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Destaque
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="bg-black/60 backdrop-blur text-white text-[10px] font-medium border-none"
                  >
                    {servico.categoria}
                  </Badge>
                </div>
              </div>

              {/* Conteúdo do Card */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#2C3E50] group-hover:text-[#2C3E50] transition-colors mb-2">
                    <Link to={`/servicos/${servico.slug}`} className="focus:outline-hidden">
                      {servico.titulo}
                    </Link>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#616F7D] line-clamp-3 leading-relaxed">
                    {servico.descricaoCurta}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#DEE4EA] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2C3E50] group-hover:text-[#D4AF37] transition-colors flex items-center">
                    Ver detalhes e fotos
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="text-[11px] text-[#616F7D]">
                    {servico.galeria.length} {servico.galeria.length === 1 ? 'foto' : 'fotos'}
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
              Explorar catálogo completo de serviços ({SERVICOS.length})
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

export default LandingServicos
