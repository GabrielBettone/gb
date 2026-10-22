import React, { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFilters } from '@/contexts/FilterContext'
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  Bell,
  LogOut,
  Upload,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ImportModal } from './ImportModal'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/vendas', label: 'Vendas', icon: Receipt },
  { path: '/produtos', label: 'Produtos', icon: Boxes },
  { path: '/alertas', label: 'Alertas', icon: Bell },
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
      case '/':
        return 'Dashboard de Vendas'
      case '/vendas':
        return 'Gestão de Vendas'
      case '/produtos':
        return 'Catálogo de Produtos'
      case '/alertas':
        return 'Regras e Alertas'
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
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col md:flex-row">
      {/* SIDEBAR DESKTOP & TABLET */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-[#E3E6EA] transition-all duration-200 sticky top-0 h-screen z-30 select-none ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Topo: Logo & Monograma */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E3E6EA]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#1C4E3D] text-[#C2A24B] flex items-center justify-center font-bold text-base shadow-sm border border-[#C2A24B]/30 flex-shrink-0">
              GB
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-none truncate">
                <span className="font-bold text-sm text-[#1C4E3D] tracking-tight">
                  Gesso Bettone
                </span>
                <span className="text-[11px] text-[#5B6470] mt-0.5">Análise de Vendas</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#1C4E3D] hidden lg:flex"
            aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Menu de Navegação */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.path}
                      className={`flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors relative ${
                        isActive
                          ? 'bg-[#EEF4F0] text-[#1C4E3D] font-semibold'
                          : 'text-[#5B6470] hover:bg-[#E7EFEA] hover:text-[#1C4E3D]'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#C2A24B] rounded-r-full" />
                      )}
                      <Icon className="w-5 h-5" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1C4E3D] text-white text-xs">
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
                    ? 'bg-[#EEF4F0] text-[#1C4E3D] font-semibold shadow-[0_1px_2px_rgba(28,35,43,0.03)]'
                    : 'text-[#5B6470] hover:bg-[#E7EFEA] hover:text-[#1C4E3D]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#C2A24B] rounded-r-full" />
                )}
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#1C4E3D]' : 'text-[#5B6470]'}`} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Rodapé da Sidebar: Usuário logado & Logout */}
        <div className="p-3 border-t border-[#E3E6EA]">
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
              <TooltipContent side="right" className="bg-[#1C4E3D] text-white text-xs">
                Sair da conta
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#F6F7F9] border border-[#E3E6EA]">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar className="w-8 h-8 rounded-full border border-[#D5DAE0] bg-white text-[#1C4E3D]">
                  <AvatarFallback className="text-[11px] font-bold">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold text-[#22272A] truncate">
                    {user?.name || 'Administrador'}
                  </span>
                  <span className="text-[10px] text-[#5B6470] truncate">{user?.email}</span>
                </div>
              </div>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="h-7 w-7 p-0 text-[#5B6470] hover:text-[#C4453C] hover:bg-[#FBEFEE]"
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
        <header className="h-16 bg-white border-b border-[#E3E6EA] sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-sm">
          {/* Esquerda: Hambúrguer Mobile + Título */}
          <div className="flex items-center gap-3">
            {/* Menu Mobile Hambúrguer */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden h-9 w-9 p-0 text-[#1C4E3D]"
                  aria-label="Abrir menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 bg-white">
                <SheetHeader className="p-4 border-b border-[#E3E6EA]">
                  <SheetTitle className="flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-xl bg-[#1C4E3D] text-[#C2A24B] flex items-center justify-center font-bold text-sm shadow-sm border border-[#C2A24B]/30 flex-shrink-0">
                      GB
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="font-bold text-sm text-[#1C4E3D]">Gesso Bettone</span>
                      <span className="text-[11px] text-[#5B6470] mt-0.5">Análise de Vendas</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4 px-3 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs transition-colors ${
                          isActive
                            ? 'bg-[#EEF4F0] text-[#1C4E3D] font-semibold border-l-4 border-[#C2A24B]'
                            : 'text-[#5B6470] hover:bg-[#E7EFEA]'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-[#1C4E3D]" />
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E3E6EA] bg-[#F6F7F9]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8 rounded-full border bg-white">
                        <AvatarFallback className="text-xs font-bold text-[#1C4E3D]">
                          {getInitials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col truncate max-w-[140px]">
                        <span className="text-xs font-semibold truncate">
                          {user?.name || 'Administrador'}
                        </span>
                        <span className="text-[10px] text-[#5B6470] truncate">{user?.email}</span>
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

            <h1 className="text-base sm:text-xl font-bold text-[#22272A] tracking-tight truncate">
              {getPageTitle()}
            </h1>
          </div>

          {/* Direita: Resumo do Período + Botão Nova Importação + Avatar Mobile */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center text-xs text-[#5B6470] bg-[#F6F7F9] px-3 py-1.5 rounded-full border border-[#E3E6EA]">
              <span className="font-medium text-[#22272A] mr-1">Período:</span>
              <span>{getPeriodoSummary()}</span>
            </div>

            <Button
              size="sm"
              onClick={() => setImportModalOpen(true)}
              className="bg-[#1C4E3D] hover:bg-[#163D30] text-white text-xs font-semibold h-9 px-3.5 shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              <span>Nova importação</span>
            </Button>

            <div className="md:hidden">
              <Avatar className="w-8 h-8 rounded-full border border-[#D5DAE0] bg-white text-[#1C4E3D]">
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
