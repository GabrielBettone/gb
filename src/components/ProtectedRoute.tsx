import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#1C4E3D] animate-spin mb-2" />
        <p className="text-xs text-[#5B6470]">Carregando sessão...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
