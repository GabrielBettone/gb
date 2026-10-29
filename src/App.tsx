import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { FilterProvider } from '@/contexts/FilterContext'
import Layout from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Páginas da Landing Page Pública
import PublicLayout from '@/components/landing/PublicLayout'
import LandingHomePage from '@/pages/landing/LandingHomePage'
import ServicosListPage from '@/pages/landing/ServicosListPage'
import ServicoRouteWrapper from '@/components/landing/ServicoRouteWrapper'
import PortfolioListPage from '@/pages/landing/PortfolioListPage'
import ProjetoDetailPage from '@/pages/landing/ProjetoDetailPage'
import SobrePage from '@/pages/landing/SobrePage'
import ContatoPage from '@/pages/landing/ContatoPage'
import ParceirosPublicPage from '@/pages/landing/ParceirosPublicPage'
import SimuladorPublicPage from '@/pages/landing/SimuladorPublicPage'

// Páginas Autenticadas Internas
import Index from '@/pages/Index'
import Vendas from '@/pages/Vendas'
import Produtos from '@/pages/Produtos'
import Alertas from '@/pages/Alertas'
import Orcamentos from '@/pages/Orcamentos'
import SiteDashboardPage from '@/pages/site/SiteDashboardPage'
import SiteServicosPage from '@/pages/site/SiteServicosPage'
import SiteCategoriasPage from '@/pages/site/SiteCategoriasPage'
import SitePortfolioPage from '@/pages/site/SitePortfolioPage'
import SiteProjetoMidiasPage from '@/pages/site/SiteProjetoMidiasPage'
import SiteServicoMidiasPage from '@/pages/site/SiteServicoMidiasPage'
import SiteDepoimentosPage from '@/pages/site/SiteDepoimentosPage'
import SiteParceirosPage from '@/pages/site/SiteParceirosPage'
import SiteConfiguracoesPage from '@/pages/site/SiteConfiguracoesPage'
import SiteSimuladorAdminPage from '@/pages/site/SiteSimuladorAdminPage'

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
        <Route path="/servicos/:slug" element={<ServicoRouteWrapper />} />
        <Route path="/portfolio" element={<PortfolioListPage />} />
        <Route
          path="/portfolio/:slug"
          element={
            <ErrorBoundary
              fallbackTitle="Projeto indisponível no momento"
              fallbackMessage="Não foi possível exibir os detalhes deste projeto. Você pode consultar nosso portfólio completo ou falar diretamente com nossa equipe."
              returnUrl="/portfolio"
              returnLabel="Ver portfólio completo"
            >
              <ProjetoDetailPage />
            </ErrorBoundary>
          }
        />
        {/* Redirecionamento amigável para URLs de projetos do site anterior */}
        <Route path="/projetos/:slug" element={<ProjetoRedirect />} />
        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/contato" element={<ContatoPage />} />
        <Route path="/parceiros" element={<ParceirosPublicPage />} />
        <Route path="/simulador" element={<SimuladorPublicPage />} />
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

        {/* Rotas do Grupo Site (Gerenciador do Site Público) */}
        <Route path="/painel/site" element={<SiteDashboardPage />} />
        <Route path="/painel/site/servicos" element={<SiteServicosPage />} />
        <Route path="/painel/site/servicos/:id/midias" element={<SiteServicoMidiasPage />} />
        <Route path="/painel/site/categorias" element={<SiteCategoriasPage />} />
        <Route path="/painel/site/portfolio" element={<SitePortfolioPage />} />
        <Route path="/painel/site/portfolio/:id/midias" element={<SiteProjetoMidiasPage />} />
        <Route path="/painel/site/depoimentos" element={<SiteDepoimentosPage />} />
        <Route path="/painel/site/parceiros" element={<SiteParceirosPage />} />
        <Route path="/painel/site/simulador" element={<SiteSimuladorAdminPage />} />
        <Route path="/painel/site/configuracoes" element={<SiteConfiguracoesPage />} />

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
