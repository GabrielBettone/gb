import React, { useState, useEffect } from 'react'
import { CIDADES_ATENDIDAS as FALLBACK_CIDADES, WHATSAPP_LINK } from '@/data/landingData'
import { MapPin, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { obterConfiguracoes, SiteSettings, registrarEventoAnalytics } from '@/services/site'

export const LandingCidades: React.FC = () => {
  const [cidades, setCidades] = useState<string[]>(FALLBACK_CIDADES)
  const [zapLink, setZapLink] = useState(WHATSAPP_LINK)

  useEffect(() => {
    let isMounted = true
    async function carregar() {
      try {
        const cfg = await obterConfiguracoes()
        if (!isMounted) return
        if (cfg.cidades_atendidas && cfg.cidades_atendidas.length > 0) {
          setCidades(cfg.cidades_atendidas)
        }
        if (cfg.whatsapp_principal) {
          const text = encodeURIComponent(
            cfg.mensagem_orcamento || 'Olá! Gostaria de um orçamento.',
          )
          setZapLink(`https://wa.me/${cfg.whatsapp_principal}?text=${text}`)
        }
      } catch (err) {
        console.error('Erro ao carregar cidades das configs:', err)
      }
    }
    carregar()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="py-16 bg-white border-b border-[#DEE4EA]" id="regiao">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-gradient-to-br from-[#2C3E50] to-[#1B2631] rounded-2xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          {/* Fundo decorativo */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-white text-xs font-semibold tracking-wider uppercase">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                ÁREAS DE ATENDIMENTO
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                Levamos qualidade e precisão até a sua obra.
              </h2>

              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                Com base em São Pedro/SP, nossa frota e equipes atendem com agilidade toda a região
                central do estado de São Paulo para obras residenciais, condomínios fechados, lojas
                e reformas corporativas.
              </p>

              {/* Lista das cidades em texto renderizado para indexação Google */}
              <div className="pt-2">
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-3">
                  Cidades atendidas com visita técnica e orçamento:
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {cidades.map((cidade) => (
                    <div
                      key={cidade}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur transition-colors text-xs font-medium text-white"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                      <span className="truncate">{cidade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white/5 border border-white/15 rounded-xl p-6 backdrop-blur space-y-4 text-center lg:text-left">
              <h3 className="font-heading text-lg font-bold text-white">
                Sua cidade está na lista?
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Agende uma visita técnica ou envie a planta/medidas do seu projeto no WhatsApp para
                receber uma estimativa detalhada sem compromisso.
              </p>
              <Button
                asChild
                className="w-full bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-sm h-11 rounded-xl shadow-md transition-all"
                onClick={() => {
                  registrarEventoAnalytics({
                    tipo: 'click_whatsapp',
                    metadata: { contexto: 'visita_minha_cidade' },
                  })
                }}
              >
                <a href={zapLink} target="_blank" rel="noopener noreferrer">
                  Solicitar visita na minha cidade
                  <ArrowRight className="w-4 h-4 ml-1.5 text-[#2C3E50]" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingCidades
