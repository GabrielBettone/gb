import React from 'react'
import { WHATSAPP_LINK } from '@/data/landingData'
import { Button } from '@/components/ui/button'
import { MessageCircle, PhoneCall, Sparkles } from 'lucide-react'

interface Props {
  titulo?: string
  subtitulo?: string
  botaoTexto?: string
}

export const LandingCTA: React.FC<Props> = ({
  titulo = 'Vamos transformar seu ambiente?',
  subtitulo = 'Entre em contato com a Gesso Bettone para solicitar um orçamento sob medida, tirar dúvidas técnicas ou agendar uma visita na sua obra.',
  botaoTexto = 'Quero um orçamento',
}) => {
  return (
    <section className="py-16 bg-[#1C4E3D] text-white relative overflow-hidden">
      {/* Detalhes de iluminação de fundo */}
      <div className="absolute inset-0 bg-radial-at-c from-[#23634e] to-[#1C4E3D] opacity-70" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#C2A24B]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C2A24B]/20 border border-[#C2A24B]/40 text-[#E7EFEA] text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#C2A24B]" />
          FALE CONOSCO
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
          {titulo}
        </h2>

        <p className="text-base sm:text-lg text-[#E7EFEA]/90 max-w-2xl mx-auto leading-relaxed">
          {subtitulo}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto bg-[#C2A24B] hover:bg-[#b0913e] text-[#1C4E3D] font-bold text-base h-12 px-8 rounded-xl shadow-xl transition-all hover:scale-[1.02]"
          >
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-5 h-5 mr-2" />
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

        <p className="text-xs text-[#E7EFEA]/70 pt-2">
          Atendimento de segunda a sexta, das 07h às 18h • Sábados das 08h às 12h
        </p>
      </div>
    </section>
  )
}

export default LandingCTA
