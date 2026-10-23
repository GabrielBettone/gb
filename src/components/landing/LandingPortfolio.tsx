import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PROJETOS } from '@/data/landingData'
import { ArrowRight, Images, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Props {
  limit?: number
  showFilter?: boolean
}

export const LandingPortfolio: React.FC<Props> = ({ limit, showFilter = true }) => {
  const [filter, setFilter] = useState<'Todos' | 'Residencial' | 'Comercial' | 'Fachadas'>('Todos')

  const filtered = PROJETOS.filter((p) => {
    if (filter === 'Todos') return true
    return p.categoria === filter
  })

  const displayed = limit ? filtered.slice(0, limit) : filtered

  return (
    <section className="py-16 bg-white" id="portfolio">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#2C3E50] mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              TRABALHOS REALIZADOS
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-[#2C3E50] tracking-tight">
              Portfólio de Projetos
            </h2>
            <p className="text-sm sm:text-base text-[#616F7D] mt-1.5 max-w-2xl">
              Confira projetos reais executados pela nossa equipe. Fotos reais de obras concluídas
              com alto nível de acabamento.
            </p>
          </div>

          {/* Filtros por Categoria */}
          {showFilter && (
            <div className="flex flex-wrap items-center gap-1.5 bg-[#f4f4f4] p-1.5 rounded-xl border border-[#DEE4EA]">
              {(['Todos', 'Residencial', 'Comercial', 'Fachadas'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    filter === cat
                      ? 'bg-[#2C3E50] text-white shadow-xs font-semibold'
                      : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grade de Projetos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map((proj) => (
            <article
              key={proj.slug}
              className="group bg-white rounded-xl border border-[#DEE4EA] overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col hover:border-[#2C3E50]/40"
            >
              {/* Imagem de Capa com Hover Effect */}
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={proj.imagemCapa}
                  alt={proj.titulo}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Tag Categoria */}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-[#2C3E50] text-white text-[11px] font-semibold border-none shadow-xs">
                    {proj.categoria}
                  </Badge>
                </div>

                {/* Quantidade de Fotos */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs backdrop-blur font-medium">
                  <Images className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{proj.fotosCount} fotos</span>
                </div>
              </div>

              {/* Informações */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {proj.subtitulo && (
                    <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider block mb-1">
                      {proj.subtitulo}
                    </span>
                  )}
                  <h3 className="font-heading text-lg font-bold text-[#2C3E50] group-hover:text-[#2C3E50] transition-colors mb-2">
                    <Link to={`/portfolio/${proj.slug}`}>{proj.titulo}</Link>
                  </h3>
                  <p className="text-xs sm:text-sm text-[#616F7D] line-clamp-3 leading-relaxed">
                    {proj.descricao}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#DEE4EA] flex items-center justify-between">
                  <Link
                    to={`/portfolio/${proj.slug}`}
                    className="inline-flex items-center text-xs font-semibold text-[#2C3E50] group-hover:text-[#D4AF37] transition-colors"
                  >
                    Ver galeria do projeto
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Botão Ver Todos quando limitado */}
        {limit && PROJETOS.length > limit && (
          <div className="mt-10 text-center">
            <Link
              to="/portfolio"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#f4f4f4] border border-[#DEE4EA] text-sm font-semibold text-[#2C3E50] hover:bg-[#E8EDF2] hover:border-[#2C3E50]/30 transition-all shadow-xs"
            >
              Ver todos os {PROJETOS.length} projetos do portfólio
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

export default LandingPortfolio
