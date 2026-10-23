import React, { useState } from 'react'
import type { Orcamento, StatusOrcamento } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ETAPAS_CONFIG, parseItens } from '@/services/orcamentos'
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  MapPin,
  Phone,
} from 'lucide-react'

interface TabelaViewProps {
  orcamentos: Orcamento[]
  onAbrirDetalhes: (orcamento: Orcamento) => void
  onMudarStatus: (id: string, novoStatus: StatusOrcamento) => void
}

export const TabelaView: React.FC<TabelaViewProps> = ({
  orcamentos,
  onAbrirDetalhes,
  onMudarStatus,
}) => {
  const [pagina, setPagina] = useState(1)
  const itensPorPagina = 10

  const [sortField, setSortField] = useState<
    'numero' | 'cliente' | 'valor_total' | 'data_inicio' | 'status'
  >('numero')
  const [sortAsc, setSortAsc] = useState(false)

  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const formatData = (d?: string) => {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return d
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const orcamentosOrdenados = [...orcamentos].sort((a, b) => {
    let valA: any
    let valB: any

    if (sortField === 'valor_total') {
      valA = a.valor_total || 0
      valB = b.valor_total || 0
    } else if (sortField === 'data_inicio') {
      valA = a.data_inicio_prevista ? new Date(a.data_inicio_prevista).getTime() : 0
      valB = b.data_inicio_prevista ? new Date(b.data_inicio_prevista).getTime() : 0
    } else {
      valA = (a[sortField] || '').toString().toLowerCase()
      valB = (b[sortField] || '').toString().toLowerCase()
    }

    if (valA < valB) return sortAsc ? -1 : 1
    if (valA > valB) return sortAsc ? 1 : -1
    return 0
  })

  const totalRegistros = orcamentosOrdenados.length
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1
  const indiceInicio = (pagina - 1) * itensPorPagina
  const indiceFim = Math.min(indiceInicio + itensPorPagina, totalRegistros)
  const orcamentosPaginados = orcamentosOrdenados.slice(indiceInicio, indiceFim)

  return (
    <div className="bg-white rounded-xl border border-[#E3E6EA] shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#F6F7F9]">
            <TableRow>
              <TableHead
                onClick={() => handleSort('numero')}
                className="cursor-pointer font-bold text-xs text-[#2C3E50] hover:bg-[#E8EDF2]"
              >
                <div className="flex items-center gap-1">
                  <span>Número</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                </div>
              </TableHead>

              <TableHead
                onClick={() => handleSort('cliente')}
                className="cursor-pointer font-bold text-xs text-[#2C3E50] hover:bg-[#E8EDF2]"
              >
                <div className="flex items-center gap-1">
                  <span>Cliente</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                </div>
              </TableHead>

              <TableHead className="font-bold text-xs text-[#2C3E50]">Serviço Principal</TableHead>

              <TableHead className="font-bold text-xs text-[#2C3E50]">Canal</TableHead>

              <TableHead
                onClick={() => handleSort('status')}
                className="cursor-pointer font-bold text-xs text-[#2C3E50] hover:bg-[#E8EDF2]"
              >
                <div className="flex items-center gap-1">
                  <span>Etapa / Status</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                </div>
              </TableHead>

              <TableHead
                onClick={() => handleSort('data_inicio')}
                className="cursor-pointer font-bold text-xs text-[#2C3E50] hover:bg-[#E8EDF2]"
              >
                <div className="flex items-center gap-1">
                  <span>Início Previsto</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                </div>
              </TableHead>

              <TableHead
                onClick={() => handleSort('valor_total')}
                className="cursor-pointer font-bold text-xs text-[#2C3E50] text-right hover:bg-[#E8EDF2]"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Valor Total</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                </div>
              </TableHead>

              <TableHead className="text-right font-bold text-xs text-[#2C3E50]">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {orcamentosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-xs text-[#8A94A0]">
                  Nenhum orçamento encontrado com os filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              orcamentosPaginados.map((orc) => {
                const config = ETAPAS_CONFIG[orc.status] || {
                  label: orc.status,
                  corBadge: 'bg-gray-100 text-gray-800',
                }
                const prodNome =
                  orc.expand?.produto_principal?.nome ||
                  parseItens(orc.itens)[0]?.descricao ||
                  'Serviço Sob Medida'

                return (
                  <TableRow
                    key={orc.id}
                    className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    onClick={() => onAbrirDetalhes(orc)}
                  >
                    <TableCell className="font-bold text-xs text-[#2C3E50]">{orc.numero}</TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-[#22272A]">{orc.cliente}</span>
                        {orc.contato && (
                          <span className="text-[11px] text-[#5B6470]">{orc.contato}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-[#5B6470] max-w-[200px] truncate">
                      {prodNome}
                    </TableCell>

                    <TableCell className="text-xs text-[#5B6470]">
                      <span className="px-2 py-0.5 rounded-full bg-[#F6F7F9] border border-[#E3E6EA] text-[11px]">
                        {orc.canal_origem}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium ${config.corBadge}`}
                      >
                        {config.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-[#5B6470]">
                      {formatData(orc.data_inicio_prevista)}
                    </TableCell>

                    <TableCell className="text-right font-bold text-xs text-[#2C3E50]">
                      {formatMoeda(orc.valor_total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAbrirDetalhes(orc)}
                          className="h-8 w-8 p-0 text-[#2C3E50] hover:bg-[#E8EDF2]"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {orc.status !== 'Concluídos' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMudarStatus(orc.id, 'Concluídos')}
                            className="h-8 text-[11px] text-[#2C3E50] border-[#2C3E50]/30 hover:bg-[#E8EDF2]"
                            title="Concluir trabalho e gerar venda"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Concluir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="p-3.5 bg-[#F6F7F9] border-t border-[#E3E6EA] flex items-center justify-between text-xs text-[#5B6470]">
          <span>
            Mostrando <strong>{indiceInicio + 1}</strong> a <strong>{indiceFim}</strong> de{' '}
            <strong>{totalRegistros}</strong> orçamentos
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina === 1}
              onClick={() => setPagina((prev) => prev - 1)}
              className="h-8 w-8 p-0 bg-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="font-semibold text-[#22272A]">
              Página {pagina} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina === totalPaginas}
              onClick={() => setPagina((prev) => prev + 1)}
              className="h-8 w-8 p-0 bg-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
