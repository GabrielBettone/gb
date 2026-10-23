import React from 'react'
import { Outlet } from 'react-router-dom'
import LandingNavbar from './LandingNavbar'
import LandingFooter from './LandingFooter'
import FloatingWhatsApp from './FloatingWhatsApp'

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#22272A] selection:bg-[#C2A24B]/30 selection:text-[#1C4E3D]">
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
