import React, { useState, useEffect } from 'react'
import { WHATSAPP_LINK, WHATSAPP_NUMBER, WHATSAPP_DEFAULT_TEXT } from '@/data/landingData'
import { Button } from '@/components/ui/button'
import { MessageCircle, PhoneCall, Sparkles } from 'lucide-react'
import { obterConfiguracoes, registrarEventoAnalytics } from '@/services/site'

interface Props {
  titulo?: string
  subtitulo?: string
  botaoTexto?: string
  servicoContexto?: string
}

export const LandingCTA: React.FC<Props> = ({
  titulo = 'Vamos transformar seu ambiente?',
  subtitulo = 'Entre em contato com a Gesso Bettone para solicitar um orçamento sob medida, tirar dúvidas técnicas ou agendar uma visita na sua obra.',
  botaoTexto = 'Quero um orçamento',
  servicoContexto,
}) => {
  const [zapNumber, setZapNumber] = useState(WHATSAPP_NUMBER)
  const [defaultMsg, setDefaultMsg] = useState(WHATSAPP_DEFAULT_TEXT)

  useEffect(() => {
    obterConfiguracoes().then((cfg) => {
      if (cfg.whatsapp_principal) setZapNumber(cfg.whatsapp_principal)
      if (cfg.mensagem_orcamento) setDefaultMsg(cfg.mensagem_orcamento)
    })
  }, [])

  const whatsappUrl = servicoContexto
    ? `https://wa.me/${zapNumber}?text=${encodeURIComponent(
        `Olá! Vim pelo site da Gesso Bettone e gostaria de solicitar um orçamento para o serviço de ${servicoContexto}.`,
      )}`
    : `https://wa.me/${zapNumber}?text=${encodeURIComponent(defaultMsg)}`
  return (
    <section className="py-16 bg-[#2C3E50] text-white relative overflow-hidden">
      {/* Detalhes de iluminação de fundo */}
      <div className="absolute inset-0 bg-radial-at-c from-[#395066] to-[#2C3E50] opacity-70" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#ffffff] text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          FALE CONOSCO
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
          {titulo}
        </h2>

        <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
          {subtitulo}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm sm:text-base h-12 px-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => {
              registrarEventoAnalytics({
                tipo: 'click_whatsapp',
                metadata: { contexto: 'landing_cta', servico: servicoContexto },
              })
            }}
          >
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-5 h-5 mr-2 text-[#2C3E50]" />
              {botaoTexto}
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto border-white/30 text-white bg-white/5 hover:bg-white/10 hover:text-white font-medium text-base h-12 px-6 rounded-xl transition-all"
          >
            <a href="tel:+5519981093379">
              <PhoneCall className="w-4 h-4 mr-2" />
              Ligar (19) 98109-3379
            </a>
          </Button>
        </div>

        <p className="text-xs text-white/70 pt-2">
          Atendimento de segunda a sexta, das 07h às 18h • Sábados das 08h às 12h
        </p>
      </div>
    </section>
  )
}

export default LandingCTA
