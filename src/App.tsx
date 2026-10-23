import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { FilterProvider } from '@/contexts/FilterContext'
import Layout from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Páginas da Landing Page Pública
import PublicLayout from '@/components/landing/PublicLayout'
import LandingHomePage from '@/pages/landing/LandingHomePage'
import ServicosListPage from '@/pages/landing/ServicosListPage'
import ServicoDetailPage from '@/pages/landing/ServicoDetailPage'
import PortfolioListPage from '@/pages/landing/PortfolioListPage'
import ProjetoDetailPage from '@/pages/landing/ProjetoDetailPage'
import SobrePage from '@/pages/landing/SobrePage'
import ContatoPage from '@/pages/landing/ContatoPage'

// Páginas Autenticadas Internas
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
    return <Navigate to="/painel" replace />
  }
  return <>{children}</>
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* 1. ROTAS PÚBLICAS DA LANDING PAGE (Sem login) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingHomePage />} />
        <Route path="/servicos" element={<ServicosListPage />} />
        <Route path="/servicos/:slug" element={<ServicoDetailPage />} />
        <Route path="/portfolio" element={<PortfolioListPage />} />
        <Route path="/portfolio/:slug" element={<ProjetoDetailPage />} />
        {/* Redirecionamento amigável para URLs de projetos do site anterior */}
        <Route path="/projetos/:slug" element={<ProjetoRedirect />} />
        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/contato" element={<ContatoPage />} />
      </Route>

      {/* 2. ROTAS PÚBLICAS DE AUTENTICAÇÃO */}
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

      {/* 3. ROTAS INTERNAS PROTEGIDAS (Painel de Gestão & Análise) */}
      <Route
        element={
          <ProtectedRoute>
            <FilterProvider>
              <Layout />
            </FilterProvider>
          </ProtectedRoute>
        }
      >
        {/* Rotas canônicas do painel */}
        <Route path="/painel" element={<Index />} />
        <Route path="/painel/vendas" element={<Vendas />} />
        <Route path="/painel/orcamentos" element={<Orcamentos />} />
        <Route path="/painel/produtos" element={<Produtos />} />
        <Route path="/painel/alertas" element={<Alertas />} />

        {/* Alias de retrocompatibilidade para rotas internas antigas */}
        <Route path="/dashboard" element={<Navigate to="/painel" replace />} />
        <Route path="/vendas" element={<Navigate to="/painel/vendas" replace />} />
        <Route path="/orcamentos" element={<Navigate to="/painel/orcamentos" replace />} />
        <Route path="/produtos" element={<Navigate to="/painel/produtos" replace />} />
        <Route path="/alertas" element={<Navigate to="/painel/alertas" replace />} />
      </Route>

      {/* Rota 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

// Redirecionador para manter compatibilidade com links antigos /projetos/:slug
const ProjetoRedirect: React.FC = () => {
  const { slug } = useParams()
  return <Navigate to={`/portfolio/${slug || ''}`} replace />
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
