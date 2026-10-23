import React, { useState, useEffect } from 'react'
import { WHATSAPP_LINK, WHATSAPP_DEFAULT_TEXT } from '@/data/landingData'
import { MessageCircle, ArrowUp } from 'lucide-react'
import { obterConfiguracoes, registrarEventoAnalytics } from '@/services/site'

export const FloatingWhatsApp: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [link, setLink] = useState(WHATSAPP_LINK)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    obterConfiguracoes().then((cfg) => {
      if (cfg.whatsapp_principal) {
        const text = encodeURIComponent(cfg.mensagem_orcamento || WHATSAPP_DEFAULT_TEXT)
        setLink(`https://wa.me/${cfg.whatsapp_principal}?text=${text}`)
      }
    })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClick = () => {
    registrarEventoAnalytics({
      tipo: 'click_whatsapp',
      metadata: { contexto: 'floating_whatsapp_button' },
    })
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
      {/* Botão Subir ao Topo */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Voltar ao topo da página"
          className="w-10 h-10 rounded-full bg-white border border-[#DEE4EA] text-[#2C3E50] hover:bg-[#E8EDF2] flex items-center justify-center shadow-md transition-all hover:scale-105"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Botão Flutuante do WhatsApp */}
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label="Falar com a Gesso Bettone no WhatsApp"
        className="group flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-hidden"
      >
        <MessageCircle className="w-6 h-6 fill-current flex-shrink-0" />
        <span className="text-xs font-bold hidden sm:inline-block pr-1 group-hover:inline-block">
          Orçamento no WhatsApp
        </span>
      </a>
    </div>
  )
}

export default FloatingWhatsApp
