import React from 'react'
import { PARCEIROS } from '@/data/landingData'
import { Handshake } from 'lucide-react'

export const LandingParceiros: React.FC = () => {
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
          {PARCEIROS.map((parceiro) => (
            <div
              key={parceiro.nome}
              className="bg-white p-6 rounded-xl border border-[#DEE4EA] hover:border-[#2C3E50]/30 transition-all hover:shadow-sm flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 rounded-xl bg-[#f4f4f4] border border-[#DEE4EA] p-3 flex items-center justify-center mb-4 overflow-hidden group-hover:scale-105 transition-transform">
                <img
                  src={parceiro.logo}
                  alt={`Logo de ${parceiro.nome}`}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all"
                />
              </div>
              <h3 className="font-heading font-bold text-base text-[#2C3E50] transition-colors">
                {parceiro.nome}
              </h3>
              {parceiro.papel && (
                <span className="text-xs font-medium text-[#D4AF37] mt-0.5">{parceiro.papel}</span>
              )}
              {parceiro.descricao && (
                <p className="text-xs text-[#616F7D] mt-2 leading-relaxed">{parceiro.descricao}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default LandingParceiros
