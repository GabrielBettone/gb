import React, { useEffect, useState } from 'react'
import { useFilters } from '@/contexts/FilterContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar, Filter, X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import type { Produto, CanalVenda } from '@/types'

export const GlobalFilters: React.FC = () => {
  const { filtros, atualizarFiltro, limparFiltros } = useFilters()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  useEffect(() => {
    pb.collection<Produto>('produtos')
      .getFullList({ sort: 'nome', filter: 'ativo = true' })
      .then((items) => setProdutos(items))
      .catch(() => {})
  }, [])

  const canais: CanalVenda[] = ['WhatsApp', 'E-mail', 'Instagram', 'Loja física']

  const hasActiveFilters =
    filtros.periodoPredefinido !== '30d' ||
    Boolean(filtros.dataInicio) ||
    Boolean(filtros.dataFim) ||
    Boolean(filtros.produtoId) ||
    Boolean(filtros.canal)

  return (
    <div className="bg-white border-b border-[#E3E6EA] sticky top-[64px] z-20 px-4 sm:px-6 py-3 shadow-[0_1px_2px_rgba(28,35,43,0.03)]">
      <div className="max-w-[1440px] mx-auto">
        {/* Barra Compacta no Mobile */}
        <div className="flex sm:hidden items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="text-xs h-8 border-[#D5DAE0] text-[#22272A] flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5 text-[#2C3E50]" />
            Filtros {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limparFiltros}
              className="text-xs h-8 text-[#5B6470] hover:text-[#C4453C]"
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Linha de Filtros (visível sempre no Desktop/Tablet e toggle no Mobile) */}
        <div
          className={`${
            showMobileFilters ? 'flex' : 'hidden'
          } sm:flex flex-wrap items-center gap-3 pt-2 sm:pt-0`}
        >
          {/* Período */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#5B6470] hidden md:inline">Período:</span>
            <Select
              value={filtros.periodoPredefinido}
              onValueChange={(val: any) => atualizarFiltro('periodoPredefinido', val)}
            >
              <SelectTrigger className="h-8 text-xs w-[140px] border-[#DEE4EA] bg-[#f4f4f4] focus:ring-[#2C3E50]">
                <Calendar className="w-3.5 h-3.5 mr-1 text-[#2C3E50]" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d" className="text-xs">
                  Últimos 7 dias
                </SelectItem>
                <SelectItem value="30d" className="text-xs">
                  Últimos 30 dias
                </SelectItem>
                <SelectItem value="mes" className="text-xs">
                  Este mês
                </SelectItem>
                <SelectItem value="3m" className="text-xs">
                  Últimos 3 meses
                </SelectItem>
                <SelectItem value="ano" className="text-xs">
                  Este ano
                </SelectItem>
                <SelectItem value="tudo" className="text-xs">
                  Tudo
                </SelectItem>
                <SelectItem value="custom" className="text-xs">
                  Personalizado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Faixa Personalizada (quando selecionado custom) */}
          {filtros.periodoPredefinido === 'custom' && (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <Input
                type="date"
                value={filtros.dataInicio || ''}
                onChange={(e) => atualizarFiltro('dataInicio', e.target.value)}
                className="h-8 text-xs w-32 border-[#D5DAE0] bg-white"
              />
              <span className="text-xs text-[#5B6470]">até</span>
              <Input
                type="date"
                value={filtros.dataFim || ''}
                onChange={(e) => atualizarFiltro('dataFim', e.target.value)}
                className="h-8 text-xs w-32 border-[#D5DAE0] bg-white"
              />
            </div>
          )}

          {/* Produto */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#5B6470] hidden md:inline">Produto:</span>
            <Select
              value={filtros.produtoId || 'todos'}
              onValueChange={(val) => atualizarFiltro('produtoId', val === 'todos' ? '' : val)}
            >
              <SelectTrigger className="h-8 text-xs w-[160px] border-[#DEE4EA] bg-[#f4f4f4] focus:ring-[#2C3E50]">
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os produtos
                </SelectItem>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Canal de Venda */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#5B6470] hidden md:inline">Canal:</span>
            <Select
              value={filtros.canal || 'todos'}
              onValueChange={(val) =>
                atualizarFiltro('canal', val === 'todos' ? '' : (val as CanalVenda))
              }
            >
              <SelectTrigger className="h-8 text-xs w-[140px] border-[#DEE4EA] bg-[#f4f4f4] focus:ring-[#2C3E50]">
                <SelectValue placeholder="Todos os canais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os canais
                </SelectItem>
                {canais.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botão Limpar */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limparFiltros}
              className="text-xs h-8 px-2.5 text-[#5B6470] hover:text-[#C4453C] hover:bg-[#FBEFEE]/50 ml-auto"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Chips de filtros ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2.5">
            {filtros.produtoId && (
              <Badge
                variant="secondary"
                className="bg-[#E8EDF2] text-[#2C3E50] hover:bg-[#E8EDF2] font-medium text-[11px] gap-1 pl-2 pr-1"
              >
                Produto: {produtos.find((p) => p.id === filtros.produtoId)?.nome || 'Selecionado'}
                <button
                  type="button"
                  onClick={() => atualizarFiltro('produtoId', '')}
                  className="rounded-full hover:bg-black/10 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filtros.canal && (
              <Badge
                variant="secondary"
                className="bg-[#E8EDF2] text-[#2C3E50] hover:bg-[#E8EDF2] font-medium text-[11px] gap-1 pl-2 pr-1"
              >
                Canal: {filtros.canal}
                <button
                  type="button"
                  onClick={() => atualizarFiltro('canal', '')}
                  className="rounded-full hover:bg-black/10 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filtros.periodoPredefinido !== '30d' && (
              <Badge
                variant="secondary"
                className="bg-[#FDF3E1] text-[#C98A1B] hover:bg-[#FDF3E1] font-medium text-[11px] gap-1 pl-2 pr-1"
              >
                Período: {filtros.periodoPredefinido}
                <button
                  type="button"
                  onClick={() => atualizarFiltro('periodoPredefinido', '30d')}
                  className="rounded-full hover:bg-black/10 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
