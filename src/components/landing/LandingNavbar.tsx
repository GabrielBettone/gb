import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { WHATSAPP_LINK, WHATSAPP_DEFAULT_TEXT } from '@/data/landingData'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MessageCircle, Menu, Lock } from 'lucide-react'
import { obterConfiguracoes, registrarEventoAnalytics, SiteSettings } from '@/services/site'
import LogoBettone from '@/components/LogoBettone'

export const LandingNavbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [whatsappLink, setWhatsappLink] = useState(WHATSAPP_LINK)
  const [phoneDisplay, setPhoneDisplay] = useState('(19) 98109-3379')
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const location = useLocation()

  React.useEffect(() => {
    obterConfiguracoes().then((cfg) => {
      setSettings(cfg)
      if (cfg.whatsapp_principal) {
        const text = encodeURIComponent(cfg.mensagem_orcamento || WHATSAPP_DEFAULT_TEXT)
        setWhatsappLink(`https://wa.me/${cfg.whatsapp_principal}?text=${text}`)
        if (cfg.whatsapp_principal.length >= 10) {
          const num = cfg.whatsapp_principal.replace(/^55/, '')
          setPhoneDisplay(`(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`)
        }
      }
    })
  }, [])

  const navLinks = [
    { label: 'Início', to: '/' },
    { label: 'Serviços', to: '/servicos' },
    { label: 'Portfólio', to: '/portfolio' },
    { label: 'Simulador IA', to: '/simulador' },
    { label: 'Sobre nós', to: '/sobre' },
    { label: 'Contato', to: '/contato' },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E3E6EA] transition-all">
      {/* Barra superior de atendimento discreta em Azul Ardósia #2C3E50 */}
      <div className="bg-[#2C3E50] text-[#ffffff] text-[11px] sm:text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse inline-block" />
            <span className="truncate">
              Atendendo São Pedro, Piracicaba, Águas de São Pedro e região • Mais de 30 anos de
              tradição
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                registrarEventoAnalytics({
                  tipo: 'click_whatsapp',
                  metadata: { contexto: 'navbar_top_phone' },
                })
              }}
              className="hover:text-[#D4AF37] transition-colors flex items-center gap-1 font-medium"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
              {phoneDisplay}
            </a>
            <span className="text-white/30">|</span>
            <Link
              to="/login"
              className="hover:text-[#D4AF37] transition-colors flex items-center gap-1 opacity-85 hover:opacity-100"
              title="Acesso restrito para equipe Bettone"
            >
              <Lock className="w-3 h-3 text-[#D4AF37]" />
              Área interna
            </Link>
          </div>
        </div>
      </div>

      {/* Barra de Navegação Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Logo Oficial */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-12 w-auto max-w-[170px] flex items-center transition-transform group-hover:scale-105">
            <LogoBettone className="h-12 w-auto" customLogoUrl={settings?.logo_url} theme="light" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-heading font-bold text-base sm:text-lg text-[#2C3E50] tracking-tight group-hover:text-[#1B2631]">
              {settings?.nome_site || 'Gesso Bettone'}
            </span>
            <span className="text-[10px] tracking-widest text-[#616F7D] uppercase font-semibold">
              Gesso • Drywall • Acabamentos
            </span>
          </div>
        </Link>

        {/* Links Desktop */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const active = isActive(link.to)
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'text-[#2C3E50] bg-[#E8EDF2] font-semibold'
                    : 'text-[#2C3E50] hover:text-[#2C3E50] hover:bg-[#F2F4F7]'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* CTAs Desktop: Botão Dourado artesão #D4AF37 */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            asChild
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm shadow-sm h-10 px-5 rounded-lg transition-all"
            onClick={() => {
              registrarEventoAnalytics({
                tipo: 'click_whatsapp',
                metadata: { contexto: 'navbar_desktop_cta' },
              })
            }}
          >
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 mr-2 text-[#2C3E50]" />
              Quero um orçamento
            </a>
          </Button>
        </div>

        {/* Menu Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            asChild
            size="sm"
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-9 px-3 rounded-lg"
          >
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-3.5 h-3.5 mr-1 text-[#2C3E50]" />
              Orçamento
            </a>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-[#2C3E50]"
                aria-label="Menu principal"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0 bg-white flex flex-col">
              <SheetHeader className="p-5 border-b border-[#E3E6EA] text-left">
                <SheetTitle className="flex items-center gap-3">
                  <div className="h-11 w-auto max-w-[140px] flex items-center">
                    <LogoBettone
                      className="h-11 w-auto"
                      customLogoUrl={settings?.logo_url}
                      theme="light"
                    />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="font-heading font-bold text-base text-[#2C3E50]">
                      {settings?.nome_site || 'Gesso Bettone'}
                    </span>
                    <span className="font-script text-xs text-[#D4AF37]">Desde 1993</span>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="p-4 flex-1 flex flex-col gap-1 overflow-y-auto">
                {navLinks.map((link) => {
                  const active = isActive(link.to)
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[#E8EDF2] text-[#2C3E50] font-bold border-l-4 border-[#D4AF37]'
                          : 'text-[#2C3E50] hover:bg-[#F2F4F7]'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}

                <div className="pt-4 mt-2 border-t border-[#E3E6EA] space-y-2">
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 text-[#2C3E50]" />
                    Falar no WhatsApp
                  </a>

                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border border-[#DEE4EA] text-[#616F7D] hover:text-[#2C3E50] text-xs font-medium"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#2C3E50]" />
                    Acesso à Área Interna
                  </Link>
                </div>
              </div>

              <div className="p-4 border-t border-[#DEE4EA] bg-[#F4F4F4] text-center text-xs text-[#616F7D]">
                São Pedro • Piracicaba • Região
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export default LandingNavbar
