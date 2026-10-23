import React, { useState } from 'react'
import type { Orcamento, StatusOrcamento } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ETAPAS_ORCAMENTO, ETAPAS_CONFIG, parseItens } from '@/services/orcamentos'
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  Layers,
  ArrowRight,
  GripVertical,
  CheckCircle2,
  Phone,
} from 'lucide-react'

interface KanbanViewProps {
  orcamentos: Orcamento[]
  onMudarStatus: (id: string, novoStatus: StatusOrcamento) => void
  onAbrirDetalhes: (orcamento: Orcamento) => void
  onNovoOrcamento?: (statusPadrao?: StatusOrcamento) => void
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  orcamentos,
  onMudarStatus,
  onAbrirDetalhes,
  onNovoOrcamento,
}) => {
  // Estado de drag: id do orçamento arrastado
  const [draggedOrcamentoId, setDraggedOrcamentoId] = useState<string | null>(null)
  const [colunaHover, setColunaHover] = useState<StatusOrcamento | null>(null)

  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    })
  }

  const formatData = (d?: string) => {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedOrcamentoId(id)
  }

  const handleDragEnd = () => {
    setDraggedOrcamentoId(null)
    setColunaHover(null)
  }

  const handleDragOver = (e: React.DragEvent, status: StatusOrcamento) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (colunaHover !== status) {
      setColunaHover(status)
    }
  }

  const handleDragLeave = (e: React.DragEvent, status: StatusOrcamento) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (colunaHover === status) {
      setColunaHover(null)
    }
  }

  const handleDrop = (e: React.DragEvent, statusDestino: StatusOrcamento) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || draggedOrcamentoId
    if (id) {
      onMudarStatus(id, statusDestino)
    }
    setDraggedOrcamentoId(null)
    setColunaHover(null)
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      {/* 5 colunas com largura mínima fixa para permitir scroll horizontal suave */}
      <div className="flex gap-4 min-w-[1250px] items-start">
        {ETAPAS_ORCAMENTO.map((etapa) => {
          const config = ETAPAS_CONFIG[etapa]
          const orcamentosDaEtapa = orcamentos.filter((o) => o.status === etapa)
          const totalValor = orcamentosDaEtapa.reduce((acc, o) => acc + (o.valor_total || 0), 0)
          const isHovered = colunaHover === etapa

          return (
            <div
              key={etapa}
              onDragOver={(e) => handleDragOver(e, etapa)}
              onDragLeave={(e) => handleDragLeave(e, etapa)}
              onDrop={(e) => handleDrop(e, etapa)}
              className={`flex-1 flex flex-col bg-[#F6F7F9] rounded-xl border transition-all duration-200 min-h-[580px] ${
                isHovered
                  ? 'border-[#2C3E50] ring-2 ring-[#2C3E50]/20 bg-[#E8EDF2]/60'
                  : 'border-[#E3E6EA]'
              }`}
            >
              {/* Topo da Coluna: Título + Badge de Contagem + Total em R$ */}
              <div
                className={`p-3.5 border-b rounded-t-xl flex flex-col gap-1.5 transition-colors ${config.corHeader}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider">
                      {config.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/80 shadow-xs border border-black/5">
                      {orcamentosDaEtapa.length}
                    </span>
                  </div>
                  {onNovoOrcamento && etapa === 'Orçamentos a realizar' && (
                    <button
                      type="button"
                      onClick={() => onNovoOrcamento(etapa)}
                      className="text-[11px] font-semibold text-[#2C3E50] hover:underline"
                    >
                      + Criar
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#5B6470] pt-1 border-t border-black/5">
                  <span>Total coluna:</span>
                  <span className="font-bold text-[#2C3E50] text-xs">
                    {formatMoeda(totalValor)}
                  </span>
                </div>
              </div>

              {/* Área de Cards Arrasta-e-Solta */}
              <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
                {orcamentosDaEtapa.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-[#D5DAE0] rounded-lg flex flex-col items-center justify-center p-3 text-center text-xs text-[#8A94A0]">
                    <span>Nenhum trabalho nesta etapa</span>
                    <span className="text-[10px] mt-1 text-[#5B6470]">
                      Arraste um card até aqui
                    </span>
                  </div>
                ) : (
                  orcamentosDaEtapa.map((orc) => {
                    const isDragging = draggedOrcamentoId === orc.id
                    const prodNome =
                      orc.expand?.produto_principal?.nome ||
                      parseItens(orc.itens)[0]?.descricao ||
                      'Serviço Sob Medida'

                    return (
                      <div
                        key={orc.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, orc.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onAbrirDetalhes(orc)}
                        className={`group bg-white rounded-xl p-3.5 border shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-l-4 ${
                          config.corBorda
                        } ${
                          isDragging
                            ? 'opacity-40 scale-95 border-dashed border-[#2C3E50]'
                            : 'border-[#DEE4EA] hover:border-[#2C3E50]/40'
                        }`}
                      >
                        {/* Linha 1: Número e Origem */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-bold text-[11px] text-[#2C3E50] flex items-center gap-1">
                            <GripVertical className="w-3 h-3 text-[#8A94A0] opacity-0 group-hover:opacity-100 transition-opacity" />
                            {orc.numero}
                          </span>
                          <span className="text-[10px] text-[#5B6470] bg-[#F6F7F9] px-2 py-0.5 rounded-full border border-[#E3E6EA]">
                            {orc.canal_origem}
                          </span>
                        </div>

                        {/* Linha 2: Cliente */}
                        <h4 className="font-semibold text-xs text-[#22272A] line-clamp-2 leading-tight mb-2">
                          {orc.cliente}
                        </h4>

                        {/* Linha 3: Serviço Principal */}
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5B6470] mb-2.5 truncate">
                          <Layers className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                          <span className="truncate">{prodNome}</span>
                        </div>

                        {/* Linha 4: Valor + Datas */}
                        <div className="pt-2 border-t border-[#F0F2F5] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-[10px] text-[#5B6470]">
                            <Calendar className="w-3 h-3 text-[#8A94A0]" />
                            {orc.data_inicio_prevista ? (
                              <span>
                                {formatData(orc.data_inicio_prevista)}
                                {orc.data_fim_prevista && ` → ${formatData(orc.data_fim_prevista)}`}
                              </span>
                            ) : (
                              <span>Sem data</span>
                            )}
                          </div>
                          <span className="font-bold text-xs text-[#2C3E50]">
                            {formatMoeda(orc.valor_total)}
                          </span>
                        </div>

                        {/* Indicador de Concluído se estiver na coluna final */}
                        {orc.status === 'Concluídos' && (
                          <div className="mt-2 pt-1.5 border-t border-emerald-100 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Venda sincronizada no dashboard</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
