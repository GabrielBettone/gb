import React from 'react'
import { PARCEIROS } from '@/data/landingData'
import { Handshake } from 'lucide-react'

export const LandingParceiros: React.FC = () => {
  return (
    <section className="py-14 bg-[#F6F7F9]" id="parceiros">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#1C4E3D] mb-2">
          <Handshake className="w-3.5 h-3.5 text-[#C2A24B]" />
          RELACIONAMENTO & CONFIANÇA
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#22272A] tracking-tight">
          Nossos parceiros
        </h2>
        <p className="text-xs sm:text-sm text-[#5B6470] mt-1.5 max-w-xl mx-auto">
          Empresas, construtoras e escritórios de arquitetura que confiam na excelência técnica da
          Gesso Bettone para seus projetos.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PARCEIROS.map((parceiro) => (
            <div
              key={parceiro.nome}
              className="bg-white p-6 rounded-xl border border-[#E3E6EA] hover:border-[#1C4E3D]/30 transition-all hover:shadow-sm flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 rounded-xl bg-[#F6F7F9] border border-[#E3E6EA] p-3 flex items-center justify-center mb-4 overflow-hidden group-hover:scale-105 transition-transform">
                <img
                  src={parceiro.logo}
                  alt={`Logo de ${parceiro.nome}`}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all"
                />
              </div>
              <h3 className="font-bold text-base text-[#22272A] group-hover:text-[#1C4E3D] transition-colors">
                {parceiro.nome}
              </h3>
              {parceiro.papel && (
                <span className="text-xs font-medium text-[#C2A24B] mt-0.5">{parceiro.papel}</span>
              )}
              {parceiro.descricao && (
                <p className="text-xs text-[#5B6470] mt-2 leading-relaxed">{parceiro.descricao}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default LandingParceiros
