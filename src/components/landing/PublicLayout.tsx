import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import LandingNavbar from './LandingNavbar'
import LandingFooter from './LandingFooter'
import FloatingWhatsApp from './FloatingWhatsApp'
import { registrarEventoAnalytics } from '@/services/site'

export const PublicLayout: React.FC = () => {
  const location = useLocation()

  useEffect(() => {
    // Registrar pageview real
    registrarEventoAnalytics({
      tipo: 'pageview',
      pagina: location.pathname,
    })
  }, [location.pathname])

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
