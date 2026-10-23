import React, { useState, useEffect } from 'react'
import { Handshake, MessageCircle, ExternalLink } from 'lucide-react'
import {
  listarParceiros,
  obterConfiguracoes,
  registrarCliqueParceiro,
  SiteParceiro,
  SiteSettings,
  registrarEventoAnalytics,
} from '@/services/site'
import { PARCEIROS as FALLBACK_PARCEIROS } from '@/data/landingData'

export const LandingParceiros: React.FC = () => {
  const [parceiros, setParceiros] = useState<SiteParceiro[]>([])
  const [settings, setSettings] = useState<SiteSettings | null>(null)

  useEffect(() => {
    let isMounted = true
    async function carregar() {
      try {
        const [parts, cfg] = await Promise.all([listarParceiros(true), obterConfiguracoes()])
        if (!isMounted) return
        setSettings(cfg)
        if (parts.length > 0) {
          setParceiros(parts)
        } else {
          setParceiros(
            FALLBACK_PARCEIROS.map((p, idx) => ({
              id: `fallback-${idx}`,
              nome: p.nome,
              categoria: 'Construção & Reformas',
              papel: p.papel,
              whatsapp: '5519981093379',
              logo: p.logo,
              descricao: p.descricao,
              destaque: true,
              ativo: true,
            })),
          )
        }
      } catch (err) {
        console.error('Erro ao carregar parceiros:', err)
      }
    }
    carregar()
    return () => {
      isMounted = false
    }
  }, [])

  if (settings && settings.pagina_parceiros_ativa === false) {
    return null
  }

  const handleWhatsAppClick = (p: SiteParceiro) => {
    registrarCliqueParceiro(p.id, p.nome)
    registrarEventoAnalytics({
      tipo: 'click_whatsapp',
      metadata: { parceiro_id: p.id, parceiro_nome: p.nome },
    })

    const zap = (p.whatsapp || settings?.whatsapp_principal || '5519981093379').replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Olá! Vim pelo site da Gesso Bettone e gostaria de falar com a equipe de ${p.nome}.`,
    )
    window.open(`https://wa.me/${zap}?text=${msg}`, '_blank')
  }

  return (
    <section className="py-14 bg-[#f4f4f4]" id="parceiros">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#2C3E50] mb-2">
          <Handshake className="w-3.5 h-3.5 text-[#D4AF37]" />
          RELACIONAMENTO & CONFIANÇA
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#2C3E50] tracking-tight">
          Nossos parceiros
        </h2>
        <p className="text-xs sm:text-sm text-[#616F7D] mt-1.5 max-w-xl mx-auto">
          Empresas, construtoras e escritórios de arquitetura que confiam na excelência técnica da
          Gesso Bettone para seus projetos.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {parceiros.map((parceiro) => (
            <div
              key={parceiro.id}
              className="bg-white p-6 rounded-xl border border-[#DEE4EA] hover:border-[#2C3E50]/30 transition-all hover:shadow-sm flex flex-col items-center text-center justify-between group"
            >
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-xl bg-[#f4f4f4] border border-[#DEE4EA] p-3 flex items-center justify-center mb-4 overflow-hidden group-hover:scale-105 transition-transform">
                  {parceiro.logo ? (
                    <img
                      src={parceiro.logo}
                      alt={`Logo de ${parceiro.nome}`}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all"
                    />
                  ) : (
                    <Handshake className="w-8 h-8 text-[#2C3E50]/40" />
                  )}
                </div>
                <h3 className="font-heading font-bold text-base text-[#2C3E50] transition-colors">
                  {parceiro.nome}
                </h3>
                {parceiro.papel && (
                  <span className="text-xs font-medium text-[#D4AF37] mt-0.5">
                    {parceiro.papel}
                  </span>
                )}
                {parceiro.descricao && (
                  <p className="text-xs text-[#616F7D] mt-2 leading-relaxed">
                    {parceiro.descricao}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-[#DEE4EA] w-full">
                <button
                  type="button"
                  onClick={() => handleWhatsAppClick(parceiro)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-[#2C3E50] hover:text-[#D4AF37] hover:bg-[#f4f4f4] rounded-lg transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Contato via WhatsApp</span>
                  <ExternalLink className="w-3 h-3 text-[#616F7D]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default LandingParceiros
