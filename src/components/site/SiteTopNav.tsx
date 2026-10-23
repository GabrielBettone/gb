import React from 'react'
import { NavLink } from 'react-router-dom'

export const SiteTopNav: React.FC = () => {
  const tabs = [
    { label: 'Dashboard', path: '/painel/site' },
    { label: 'Serviços', path: '/painel/site/servicos' },
    { label: 'Categorias', path: '/painel/site/categorias' },
    { label: 'Portfólio', path: '/painel/site/portfolio' },
    { label: 'Depoimentos', path: '/painel/site/depoimentos' },
    { label: 'Parceiros', path: '/painel/site/parceiros' },
    { label: 'Configurações', path: '/painel/site/configuracoes' },
  ]

  return (
    <div className="bg-[#1C252B] border-b border-[#2C3E50] px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/painel/site'}
            className={({ isActive }) =>
              `relative px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-[#D4AF37] font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default SiteTopNav
