import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1C4E3D] text-[#C2A24B] flex items-center justify-center font-bold text-2xl shadow-md border border-[#C2A24B]/30 mb-4">
        GB
      </div>
      <h1 className="text-4xl font-extrabold text-[#1C4E3D] tracking-tight">404</h1>
      <h2 className="text-xl font-bold text-[#22272A] mt-2">Página não encontrada</h2>
      <p className="text-xs text-[#5B6470] max-w-sm mt-1">
        O caminho acessado não existe ou foi movido. Retorne ao painel da Gesso Bettone.
      </p>
      <Link to="/" className="mt-6">
        <Button className="bg-[#1C4E3D] hover:bg-[#163D30] text-white font-semibold text-xs h-9 px-4">
          <Home className="w-3.5 h-3.5 mr-2" />
          Voltar ao Dashboard
        </Button>
      </Link>
    </div>
  )
}

export default NotFound
