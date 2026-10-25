import React, { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import LandingNavbar from './LandingNavbar'
import LandingFooter from './LandingFooter'
import FloatingWhatsApp from './FloatingWhatsApp'
import { obterConfiguracoes, registrarEventoAnalytics, SiteSettings } from '@/services/site'
import { CIDADES_ATENDIDAS } from '@/data/landingData'

export const PublicLayout: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const location = useLocation()

  useEffect(() => {
    obterConfiguracoes().then(setSettings)
  }, [])

  useEffect(() => {
    // Registrar pageview real
    registrarEventoAnalytics({
      tipo: 'pageview',
      pagina: location.pathname,
    })
  }, [location.pathname])

  // Injetar JSON-LD LocalBusiness fixo no layout público para presença local forte
  useEffect(() => {
    const scriptId = 'local-business-schema'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }

    const localBusinessLd = {
      '@context': 'https://schema.org',
      '@type': 'HomeAndConstructionBusiness',
      name: settings?.nome_site || 'Gesso Bettone',
      alternateName: 'Gesso Bettone — Gesso, Drywall e Acabamentos',
      image:
        settings?.logo_url ||
        'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
      logo:
        settings?.logo_url ||
        'https://gessobettone.com.br/watermark.php?src=%2Fuploads%2Fservices%2F156c0c6b5734cd5a91f3f5a371396fce.jpg',
      url: 'https://gessobettone.com.br',
      telephone: settings?.whatsapp_principal
        ? `+${settings.whatsapp_principal.replace(/\D/g, '')}`
        : '+5519981093379',
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'São Pedro',
        addressRegion: 'SP',
        addressCountry: 'BR',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: -22.5486,
        longitude: -47.9139,
      },
      areaServed: (settings?.cidades_atendidas && settings.cidades_atendidas.length > 0
        ? settings.cidades_atendidas
        : CIDADES_ATENDIDAS
      ).map((cidade) => ({
        '@type': 'City',
        name: cidade,
      })),
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '07:30',
          closes: '18:00',
        },
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Saturday'],
          opens: '08:00',
          closes: '12:00',
        },
      ],
      sameAs: [settings?.instagram || 'https://www.instagram.com/gessobettone_saopedro'],
    }

    script.textContent = JSON.stringify(localBusinessLd)
  }, [settings])

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#2C3E50] selection:bg-[#D4AF37]/30 selection:text-[#2C3E50]">
      <LandingNavbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <LandingFooter />
      <FloatingWhatsApp />
    </div>
  )
}

export default PublicLayout
