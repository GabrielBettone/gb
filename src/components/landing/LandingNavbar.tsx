import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { WHATSAPP_LINK } from '@/data/landingData'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { MessageCircle, Menu, Lock } from 'lucide-react'

export const LandingNavbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { label: 'Início', to: '/' },
    { label: 'Serviços', to: '/servicos' },
    { label: 'Portfólio', to: '/portfolio' },
    { label: 'Sobre nós', to: '/sobre' },
    { label: 'Contato', to: '/contato' },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E3E6EA] transition-all">
      {/* Barra superior de atendimento discreta */}
      <div className="bg-[#1C4E3D] text-[#E7EFEA] text-[11px] sm:text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-[#C2A24B] animate-pulse inline-block" />
            <span className="truncate">
              Atendendo São Pedro, Piracicaba, Águas de São Pedro e região • Mais de 30 anos de
              tradição
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#C2A24B] transition-colors flex items-center gap-1 font-medium"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#C2A24B]" />
              (19) 98109-3379
            </a>
            <span className="text-white/30">|</span>
            <Link
              to="/login"
              className="hover:text-[#C2A24B] transition-colors flex items-center gap-1 opacity-80 hover:opacity-100"
              title="Acesso restrito para equipe Bettone"
            >
              <Lock className="w-3 h-3 text-[#C2A24B]" />
              Área interna
            </Link>
          </div>
        </div>
      </div>

      {/* Barra de Navegação Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-[#1C4E3D] text-[#C2A24B] flex items-center justify-center font-bold text-lg shadow-sm border border-[#C2A24B]/30 transition-transform group-hover:scale-105">
            GB
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg sm:text-xl text-[#1C4E3D] tracking-tight group-hover:text-[#163D30]">
              Gesso Bettone
            </span>
            <span className="text-[11px] tracking-widest text-[#5B6470] uppercase font-semibold">
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
                    ? 'text-[#1C4E3D] bg-[#EEF4F0] font-semibold'
                    : 'text-[#22272A] hover:text-[#1C4E3D] hover:bg-[#F6F7F9]'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* CTAs Desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            asChild
            className="bg-[#1C4E3D] hover:bg-[#163D30] text-white font-semibold text-sm shadow-sm h-10 px-5 rounded-lg transition-all"
          >
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 mr-2 text-[#C2A24B]" />
              Quero um orçamento
            </a>
          </Button>
        </div>

        {/* Menu Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <Button asChild size="sm" className="bg-[#1C4E3D] text-white text-xs h-9 px-3 rounded-lg">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-3.5 h-3.5 mr-1 text-[#C2A24B]" />
              Orçamento
            </a>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-[#1C4E3D]"
                aria-label="Menu principal"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0 bg-white flex flex-col">
              <SheetHeader className="p-5 border-b border-[#E3E6EA] text-left">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1C4E3D] text-[#C2A24B] flex items-center justify-center font-bold text-base shadow-sm border border-[#C2A24B]/30">
                    GB
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="font-bold text-base text-[#1C4E3D]">Gesso Bettone</span>
                    <span className="text-[10px] uppercase tracking-wider text-[#5B6470]">
                      Desde 1993
                    </span>
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
                          ? 'bg-[#EEF4F0] text-[#1C4E3D] font-bold border-l-4 border-[#C2A24B]'
                          : 'text-[#22272A] hover:bg-[#F6F7F9]'
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
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-[#1C4E3D] text-white font-semibold text-sm shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 text-[#C2A24B]" />
                    Falar no WhatsApp
                  </a>

                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg border border-[#E3E6EA] text-[#5B6470] hover:text-[#1C4E3D] text-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Acesso à Área Interna
                  </Link>
                </div>
              </div>

              <div className="p-4 border-t border-[#E3E6EA] bg-[#F6F7F9] text-center text-xs text-[#5B6470]">
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
