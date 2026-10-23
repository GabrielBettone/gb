import React from 'react'
import { Link } from 'react-router-dom'
import { WHATSAPP_LINK, SERVICOS, CIDADES_ATENDIDAS } from '@/data/landingData'
import { MessageCircle, MapPin, Phone, Lock, Heart } from 'lucide-react'

export const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-[#153A2E] text-[#E7EFEA] border-t border-[#1C4E3D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Coluna 1: Marca & Resumo */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-xl bg-white/10 text-[#C2A24B] flex items-center justify-center font-bold text-lg border border-[#C2A24B]/30 group-hover:scale-105 transition-transform">
                GB
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-xl text-white tracking-tight">Gesso Bettone</span>
                <span className="text-[11px] tracking-widest text-[#C2A24B] uppercase font-semibold">
                  30+ Anos de Excelência
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-[#E7EFEA]/80 leading-relaxed">
              Especialistas em projetos de gesso acartonado, forros tabicados, divisórias drywall,
              sancas, boiseries e acabamentos arquitetônicos de alto padrão.
            </p>

            <div className="pt-2 text-xs space-y-1.5 text-[#E7EFEA]/90">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C2A24B] flex-shrink-0" />
                <span>São Pedro - SP e Região</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#C2A24B] flex-shrink-0" />
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#C2A24B] transition-colors"
                >
                  WhatsApp: (19) 98109-3379
                </a>
              </div>
            </div>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#C2A24B]">Navegação</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-[#C2A24B] transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/servicos" className="hover:text-[#C2A24B] transition-colors">
                  Todos os Serviços
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="hover:text-[#C2A24B] transition-colors">
                  Portfólio de Obras
                </Link>
              </li>
              <li>
                <Link to="/sobre" className="hover:text-[#C2A24B] transition-colors">
                  Sobre a Gesso Bettone
                </Link>
              </li>
              <li>
                <Link to="/contato" className="hover:text-[#C2A24B] transition-colors">
                  Solicitar Orçamento
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Principais Serviços (SEO links internos) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#C2A24B]">
              Serviços Populares
            </h3>
            <ul className="space-y-2 text-xs">
              {SERVICOS.slice(0, 6).map((servico) => (
                <li key={servico.slug}>
                  <Link
                    to={`/servicos/${servico.slug}`}
                    className="hover:text-[#C2A24B] transition-colors line-clamp-1"
                  >
                    {servico.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna 4: Cidades e Acesso Restrito */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#C2A24B]">
              Cidades Atendidas
            </h3>
            <p className="text-[11px] text-[#E7EFEA]/70 leading-relaxed">
              {CIDADES_ATENDIDAS.slice(0, 7).join(' • ')} e cidades vizinhas.
            </p>

            <div className="pt-3 border-t border-white/10">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg bg-[#C2A24B] hover:bg-[#b0913e] text-[#1C4E3D] font-bold text-xs transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Chamar no WhatsApp
              </a>

              <div className="mt-3 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#E7EFEA]/60 hover:text-[#C2A24B] transition-colors"
                >
                  <Lock className="w-3 h-3 text-[#C2A24B]" />
                  Acesso Restrito da Equipe (Painel)
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Linha Inferior com Copyright & Informações legais */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#E7EFEA]/60">
          <div>
            © {new Date().getFullYear()} Gesso Bettone. Todos os direitos reservados. CNPJ sob
            consulta.
          </div>
          <div className="flex items-center gap-1">
            <span>Desenvolvido com primor e precisão para São Pedro/SP</span>
            <Heart className="w-3 h-3 text-[#C2A24B] fill-current" />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
