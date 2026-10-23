import React from 'react'
import { DIFERENCIAIS } from '@/data/landingData'
import { Compass, Sparkles, Award, Headphones, ShieldCheck, Clock } from 'lucide-react'

export const LandingDiferenciais: React.FC = () => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Compass':
        return <Compass className="w-6 h-6 text-[#2C3E50]" />
      case 'Sparkles':
        return <Sparkles className="w-6 h-6 text-[#D4AF37]" />
      case 'Award':
        return <Award className="w-6 h-6 text-[#2C3E50]" />
      case 'Headphones':
        return <Headphones className="w-6 h-6 text-[#D4AF37]" />
      case 'Clock':
        return <Clock className="w-6 h-6 text-[#2C3E50]" />
      default:
        return <ShieldCheck className="w-6 h-6 text-[#2C3E50]" />
    }
  }

  return (
    <section className="py-12 bg-white border-b border-[#DEE4EA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DIFERENCIAIS.map((item, index) => (
            <div
              key={index}
              className="p-5 rounded-xl bg-[#f4f4f4] border border-[#DEE4EA] hover:border-[#2C3E50]/30 transition-all hover:shadow-sm group"
            >
              <div className="w-12 h-12 rounded-lg bg-white border border-[#DEE4EA] flex items-center justify-center mb-4 shadow-xs group-hover:scale-105 transition-transform">
                {getIcon(item.iconName)}
              </div>
              <h3 className="font-heading font-bold text-base text-[#2C3E50] mb-1.5 transition-colors">
                {item.titulo}
              </h3>
              <p className="text-xs sm:text-sm text-[#616F7D] leading-relaxed">{item.descricao}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default LandingDiferenciais
