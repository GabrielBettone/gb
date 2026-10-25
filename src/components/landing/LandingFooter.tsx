import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  WHATSAPP_LINK,
  SERVICOS,
  CIDADES_ATENDIDAS,
  WHATSAPP_DEFAULT_TEXT,
} from '@/data/landingData'
import { MessageCircle, MapPin, Phone, Lock, Heart } from 'lucide-react'
import { obterConfiguracoes, SiteSettings, registrarEventoAnalytics } from '@/services/site'
import LogoBettone from '@/components/LogoBettone'

export const LandingFooter: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [zapLink, setZapLink] = useState(WHATSAPP_LINK)

  useEffect(() => {
    obterConfiguracoes().then((cfg) => {
      setSettings(cfg)
      if (cfg.whatsapp_principal) {
        const text = encodeURIComponent(cfg.mensagem_orcamento || WHATSAPP_DEFAULT_TEXT)
        setZapLink(`https://wa.me/${cfg.whatsapp_principal}?text=${text}`)
      }
    })
  }, [])

  const cidades = settings?.cidades_atendidas || CIDADES_ATENDIDAS
  const cnpj = settings?.cnpj || '53.242.055/0001-74'
  return (
    <footer className="bg-[#1B2631] text-[#f4f4f4] border-t border-[#2C3E50]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Coluna 1: Marca & Resumo */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-12 p-1.5 rounded-xl bg-white flex items-center justify-center border border-white/20 group-hover:scale-105 transition-transform">
                <LogoBettone
                  className="h-full w-auto"
                  customLogoUrl={settings?.logo_url}
                  theme="light"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-heading font-bold text-xl text-white tracking-tight">
                  {settings?.nome_site || 'Gesso Bettone'}
                </span>
                <span className="text-[11px] tracking-widest text-[#D4AF37] uppercase font-semibold">
                  30+ Anos de Excelência
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Especialistas em projetos de gesso acartonado, forros tabicados, divisórias drywall,
              sancas, boiseries e acabamentos arquitetônicos de alto padrão.
            </p>

            <div className="pt-2 text-xs space-y-1.5 text-white/90">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <span>São Pedro - SP e Região</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <a
                  href={zapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    registrarEventoAnalytics({
                      tipo: 'click_whatsapp',
                      metadata: { contexto: 'footer_phone_link' },
                    })
                  }}
                  className="hover:text-[#D4AF37] transition-colors"
                >
                  WhatsApp:{' '}
                  {settings?.whatsapp_principal
                    ? `+${settings.whatsapp_principal}`
                    : '(19) 98109-3379'}
                </a>
              </div>
            </div>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
              Navegação
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-[#D4AF37] transition-colors">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/servicos" className="hover:text-[#D4AF37] transition-colors">
                  Todos os Serviços
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="hover:text-[#D4AF37] transition-colors">
                  Portfólio de Obras
                </Link>
              </li>
              <li>
                <Link to="/sobre" className="hover:text-[#D4AF37] transition-colors">
                  Sobre a Gesso Bettone
                </Link>
              </li>
              <li>
                <Link to="/contato" className="hover:text-[#D4AF37] transition-colors">
                  Solicitar Orçamento
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Principais Serviços (SEO links internos) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
              Serviços Populares
            </h3>
            <ul className="space-y-2 text-xs">
              {SERVICOS.slice(0, 6).map((servico) => (
                <li key={servico.slug}>
                  <Link
                    to={`/servicos/${servico.slug}`}
                    className="hover:text-[#D4AF37] transition-colors line-clamp-1"
                  >
                    {servico.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna 4: Cidades e Acesso Restrito */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
              Cidades Atendidas
            </h3>
            <p className="text-[11px] text-white/70 leading-relaxed">
              {cidades.slice(0, 7).join(' • ')} e cidades vizinhas.
            </p>

            <div className="pt-3 border-t border-white/10">
              <a
                href={zapLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  registrarEventoAnalytics({
                    tipo: 'click_whatsapp',
                    metadata: { contexto: 'footer_whatsapp_button' },
                  })
                }}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs transition-colors shadow-sm"
              >
                <MessageCircle className="w-4 h-4 text-[#2C3E50]" />
                Chamar no WhatsApp
              </a>

              <div className="mt-3 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-[11px] text-white/60 hover:text-[#D4AF37] transition-colors"
                >
                  <Lock className="w-3 h-3 text-[#D4AF37]" />
                  Acesso Restrito da Equipe (Painel)
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Linha Inferior com Copyright & Informações legais */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/60">
          <div>
            © {new Date().getFullYear()} {settings?.nome_site || 'Gesso Bettone'}. CNPJ: {cnpj}.
            Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-1">
            <span>São Pedro/SP e Região</span>
            <Heart className="w-3 h-3 text-[#D4AF37] fill-current" />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
