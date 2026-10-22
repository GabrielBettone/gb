import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { FilterProvider } from '@/contexts/FilterContext'
import Layout from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Páginas Autenticadas
import Index from '@/pages/Index'
import Vendas from '@/pages/Vendas'
import Produtos from '@/pages/Produtos'
import Alertas from '@/pages/Alertas'
import Orcamentos from '@/pages/Orcamentos'

// Páginas de Autenticação
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import ConfirmEmailChange from '@/pages/ConfirmEmailChange'
import NotFound from '@/pages/NotFound'

// Componente para redirecionar se já logado
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rotas Públicas de Autenticação */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />

      {/* Rotas Protegidas no Layout Global */}
      <Route
        element={
          <ProtectedRoute>
            <FilterProvider>
              <Layout />
            </FilterProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Index />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/orcamentos" element={<Orcamentos />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/alertas" element={<Alertas />} />
      </Route>

      {/* Rota 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
