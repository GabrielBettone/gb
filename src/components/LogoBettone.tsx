import React from 'react'
import logoSvg from '@/assets/logo-6927a.svg'
import logoPng from '@/assets/logo-gesso-bettone-eb5aa.png'

interface LogoBettoneProps {
  className?: string
  variant?: 'full' | 'icon' | 'horizontal'
  customLogoUrl?: string | null
  theme?: 'dark' | 'light'
}

/**
 * Componente oficial de exibição da marca Gesso Bettone.
 * Usa SVG vetorial por padrão com fallback para PNG ou logo personalizado enviado nas configurações.
 */
export const LogoBettone: React.FC<LogoBettoneProps> = ({
  className = 'h-10 w-auto',
  variant = 'full',
  customLogoUrl,
  theme = 'light',
}) => {
  if (customLogoUrl) {
    return <img src={customLogoUrl} alt="Gesso Bettone" className={`object-contain ${className}`} />
  }

  // Se for apenas o ícone quadrado/brasão
  if (variant === 'icon') {
    return (
      <div
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs border border-[#DEE4EA] p-1 ${className}`}
      >
        <img
          src={logoSvg}
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src = logoPng
          }}
          alt="Gesso Bettone Ícone"
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <img
        src={logoSvg}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).src = logoPng
        }}
        alt="Gesso Bettone"
        className={`w-auto h-full max-h-full object-contain ${
          theme === 'dark' ? 'brightness-110 drop-shadow-xs' : ''
        }`}
      />
    </div>
  )
}

export default LogoBettone
