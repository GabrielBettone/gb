import React, { useState } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFilters } from '@/contexts/FilterContext'
import {
  LayoutDashboard,
  Receipt,
  Calculator,
  Boxes,
  Bell,
  LogOut,
  Upload,
  Menu,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ImportModal } from './ImportModal'

const navItems = [
  { path: '/painel', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/painel/vendas', label: 'Vendas', icon: Receipt },
  { path: '/painel/orcamentos', label: 'Orçamentos', icon: Calculator },
  { path: '/painel/produtos', label: 'Produtos', icon: Boxes },
  { path: '/painel/alertas', label: 'Alertas', icon: Bell },
  { path: '/painel/site', label: 'Site (Gerenciador)', icon: Globe },
]

export const Layout: React.FC = () => {
  const { user, logout } = useAuth()
  const { filtros, importModalOpen, setImportModalOpen } = useFilters()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Título dinâmico da página atual
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/painel':
      case '/painel/':
      case '/dashboard':
        return 'Dashboard de Vendas'
      case '/painel/vendas':
      case '/vendas':
        return 'Gestão de Vendas'
      case '/painel/orcamentos':
      case '/orcamentos':
        return 'Gestão de Orçamentos & Obras'
      case '/painel/produtos':
      case '/produtos':
        return 'Catálogo de Produtos'
      case '/painel/alertas':
      case '/alertas':
        return 'Regras e Alertas'
      case '/painel/site':
        return 'Site • Dashboard & Analytics'
      case '/painel/site/servicos':
        return 'Site • Catálogo de Serviços'
      case '/painel/site/categorias':
        return 'Site • Categorias'
      case '/painel/site/portfolio':
        return 'Site • Portfólio de Obras'
      case '/painel/site/depoimentos':
        return 'Site • Depoimentos & Avaliações'
      case '/painel/site/parceiros':
        return 'Site • Dashboard de Parceiros'
      case '/painel/site/configuracoes':
        return 'Site • Configurações do Site'
      default:
        return 'Análise de Vendas'
    }
  }

  // Texto resumido do filtro de período para o header
  const getPeriodoSummary = () => {
    switch (filtros.periodoPredefinido) {
      case '7d':
        return 'Últimos 7 dias'
      case '30d':
        return 'Últimos 30 dias'
      case 'mes':
        return 'Este mês'
      case '3m':
        return 'Últimos 3 meses'
      case 'ano':
        return 'Este ano'
      case 'tudo':
        return 'Todo o histórico'
      case 'custom':
        return filtros.dataInicio && filtros.dataFim
          ? `${filtros.dataInicio} — ${filtros.dataFim}`
          : 'Personalizado'
      default:
        return 'Últimos 30 dias'
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'GB'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex flex-col md:flex-row">
      {/* SIDEBAR DESKTOP & TABLET */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-[#DEE4EA] transition-all duration-200 sticky top-0 h-screen z-30 select-none ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Topo: Logo & Monograma */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#DEE4EA]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center font-heading font-bold text-base shadow-sm border border-[#D4AF37]/30 flex-shrink-0">
              GB
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-none truncate">
                <span className="font-heading font-bold text-sm text-[#2C3E50] tracking-tight">
                  Gesso Bettone
                </span>
                <span className="text-[11px] text-[#616F7D] mt-0.5">Análise de Vendas</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-7 w-7 p-0 text-[#616F7D] hover:text-[#2C3E50] hidden lg:flex"
            aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Menu de Navegação */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path ||
              (item.path === '/painel' && location.pathname === '/painel') ||
              (item.path !== '/painel' &&
                location.pathname.endsWith(item.path.replace('/painel', '')))

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.path}
                      className={`flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors relative ${
                        isActive
                          ? 'bg-[#E8EDF2] text-[#2C3E50] font-semibold'
                          : 'text-[#616F7D] hover:bg-[#E8EDF2] hover:text-[#2C3E50]'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#D4AF37] rounded-r-full" />
                      )}
                      <Icon className="w-5 h-5" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#2C3E50] text-white text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs transition-colors relative ${
                  isActive
                    ? 'bg-[#E8EDF2] text-[#2C3E50] font-semibold shadow-[0_1px_2px_rgba(28,35,43,0.03)]'
                    : 'text-[#616F7D] hover:bg-[#E8EDF2] hover:text-[#2C3E50]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#D4AF37] rounded-r-full" />
                )}
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#2C3E50]' : 'text-[#616F7D]'}`} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Link para voltar ao site público */}
        <div className="px-3 pb-2">
          {!collapsed ? (
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#2C3E50] bg-[#E8EDF2] hover:bg-[#DEE4EA] transition-colors"
            >
              <span>Ir para o Site Público</span>
              <span className="text-[10px] text-[#D4AF37] font-bold">↗</span>
            </Link>
          ) : (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Link
                  to="/"
                  className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-[#2C3E50] bg-[#E8EDF2] hover:bg-[#DEE4EA] transition-colors"
                >
                  <span className="text-xs font-bold">Site</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#2C3E50] text-white text-xs">
                Ir para o Site Público
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Rodapé da Sidebar: Usuário logado & Logout */}
        <div className="p-3 border-t border-[#DEE4EA]">
          {collapsed ? (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg text-[#C4453C] hover:bg-[#FBEFEE] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#2C3E50] text-white text-xs">
                Sair da conta
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#f4f4f4] border border-[#DEE4EA]">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar className="w-8 h-8 rounded-full border border-[#DEE4EA] bg-white text-[#2C3E50]">
                  <AvatarFallback className="text-[11px] font-bold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-[#2C3E50] truncate">
                    {user?.name || 'Administrador'}
                  </span>
                  <span className="text-[10px] text-[#616F7D] truncate">{user?.email}</span>
                </div>
              </div>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="h-7 w-7 p-0 text-[#616F7D] hover:text-[#C4453C] hover:bg-[#FBEFEE]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Sair da conta</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER FIXO SUPERIOR */}
        <header className="h-16 bg-white border-b border-[#DEE4EA] sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-sm">
          {/* Esquerda: Hambúrguer Mobile + Título */}
          <div className="flex items-center gap-3">
            {/* Menu Mobile Hambúrguer */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden h-9 w-9 p-0 text-[#2C3E50]"
                  aria-label="Abrir menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 bg-white">
                <SheetHeader className="p-4 border-b border-[#DEE4EA]">
                  <SheetTitle className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center font-heading font-bold text-sm shadow-sm border border-[#D4AF37]/30 flex-shrink-0">
                      GB
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="font-heading font-bold text-sm text-[#2C3E50]">
                        Gesso Bettone
                      </span>
                      <span className="text-[11px] text-[#616F7D] mt-0.5">Análise de Vendas</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4 px-3 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      location.pathname === item.path ||
                      (item.path !== '/painel' &&
                        location.pathname.endsWith(item.path.replace('/painel', '')))
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs transition-colors ${
                          isActive
                            ? 'bg-[#E8EDF2] text-[#2C3E50] font-semibold border-l-4 border-[#D4AF37]'
                            : 'text-[#616F7D] hover:bg-[#E8EDF2]'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-[#2C3E50]" />
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  })}
                  <div className="pt-2 border-t border-[#DEE4EA]">
                    <Link
                      to="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#2C3E50] hover:bg-[#E8EDF2] rounded-lg"
                    >
                      <span>Ver Site Público (Landing)</span>
                      <span className="text-[10px] text-[#D4AF37] font-bold">↗</span>
                    </Link>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#DEE4EA] bg-[#f4f4f4]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8 rounded-full border bg-white">
                        <AvatarFallback className="text-xs font-bold text-[#2C3E50]">
                          {getInitials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col truncate max-w-[140px]">
                        <span className="text-xs font-semibold truncate">
                          {user?.name || 'Administrador'}
                        </span>
                        <span className="text-[10px] text-[#616F7D] truncate">{user?.email}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleLogout()
                      }}
                      className="text-[#C4453C] hover:bg-[#FBEFEE] h-8 w-8 p-0"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="font-heading text-base sm:text-xl font-bold text-[#2C3E50] tracking-tight truncate">
              {getPageTitle()}
            </h1>
          </div>

          {/* Direita: Resumo do Período + Botão Nova Importação + Avatar Mobile */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center text-xs text-[#616F7D] bg-[#f4f4f4] px-3 py-1.5 rounded-full border border-[#DEE4EA]">
              <span className="font-medium text-[#2C3E50] mr-1">Período:</span>
              <span>{getPeriodoSummary()}</span>
            </div>

            <Button
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold h-9 px-3.5 shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
              <span>Nova importação</span>
            </Button>

            <div className="md:hidden">
              <Avatar className="w-8 h-8 rounded-full border border-[#DEE4EA] bg-white text-[#2C3E50]">
                <AvatarFallback className="text-[11px] font-bold">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL COM CONTAINER RESPONSIVO */}
        <main className="flex-1 w-full pb-12">
          <Outlet />
        </main>
      </div>

      {/* MODAL GLOBAL DE IMPORTAÇÃO */}
      <ImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </div>
  )
}

export default Layout
