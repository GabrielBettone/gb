import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { Orcamento } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ETAPAS_CONFIG, getEtapaConfig, parseItens } from '@/services/orcamentos'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Info,
  Layers,
  MoveHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

interface GanttViewProps {
  orcamentos: Orcamento[]
  onAtualizarDatas: (id: string, novaDataInicio: string, novaDataFim: string) => void
  onAbrirDetalhes: (orcamento: Orcamento) => void
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | null

interface DragState {
  orcamentoId: string
  mode: DragMode
  startX: number
  origInicioMs: number
  origFimMs: number
  currentInicioMs: number
  currentFimMs: number
}

const DIA_MS = 24 * 60 * 60 * 1000

export const GanttView: React.FC<GanttViewProps> = ({
  orcamentos,
  onAtualizarDatas,
  onAbrirDetalhes,
}) => {
  // Configuração de zoom / pixels por dia
  const [pixelsPorDia, setPixelsPorDia] = useState<number>(44) // 32 = compacto, 44 = padrão, 60 = expandido
  const [offsetDias, setOffsetDias] = useState<number>(0) // Navegação no tempo
  const [dragState, setDragState] = useState<DragState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Determina o intervalo do calendário do Gantt
  // Centraliza próximo do momento atual com margens para o passado e futuro
  const { dataInicioTimeline, totalDias, diasTimeline } = useMemo(() => {
    const hoje = new Date()
    // Inicia 10 dias antes de hoje (ajustado por offsetDias)
    const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 10 + offsetDias)
    base.setHours(0, 0, 0, 0)

    const numDias = 45 // exibe 45 dias na linha do tempo
    const dias: Date[] = []
    for (let i = 0; i < numDias; i++) {
      const d = new Date(base.getTime() + i * DIA_MS)
      dias.push(d)
    }

    return {
      dataInicioTimeline: base,
      totalDias: numDias,
      diasTimeline: dias,
    }
  }, [offsetDias])

  // Identifica a data atual para linha vermelha "Hoje"
  const hoje = useMemo(() => {
    const h = new Date()
    h.setHours(0, 0, 0, 0)
    return h
  }, [])

  const diasDesdeInicio = (data: Date) => {
    return (data.getTime() - dataInicioTimeline.getTime()) / DIA_MS
  }

  // Prepara orçamentos com datas válidas para o Gantt
  const itensGantt = useMemo(() => {
    return orcamentos.map((orc, index) => {
      let dInicio: Date
      let dFim: Date

      if (orc.data_inicio_prevista) {
        dInicio = new Date(orc.data_inicio_prevista)
      } else {
        // Fallback: hoje + 1 dia
        dInicio = new Date(hoje.getTime() + DIA_MS)
      }

      if (orc.data_fim_prevista) {
        dFim = new Date(orc.data_fim_prevista)
      } else {
        // Fallback: 5 dias após início
        dFim = new Date(dInicio.getTime() + 5 * DIA_MS)
      }

      // Garante que o fim seja >= início
      if (dFim < dInicio) {
        dFim = new Date(dInicio.getTime() + DIA_MS)
      }

      // Se este item estiver em drag ativo, usa as datas atuais do drag
      if (dragState && dragState.orcamentoId === orc.id) {
        dInicio = new Date(dragState.currentInicioMs)
        dFim = new Date(dragState.currentFimMs)
      }

      const duracaoDias = Math.max(1, Math.round((dFim.getTime() - dInicio.getTime()) / DIA_MS))
      const prodNome =
        orc.expand?.produto_principal?.nome ||
        parseItens(orc.itens)[0]?.descricao ||
        'Serviço Sob Medida'

      return {
        orcamento: orc,
        dInicio,
        dFim,
        duracaoDias,
        prodNome,
      }
    })
  }, [orcamentos, hoje, dragState])

  // Mouse drag handlers globais
  const handleMouseDown = (
    e: React.MouseEvent,
    orcId: string,
    mode: DragMode,
    dInicio: Date,
    dFim: Date,
  ) => {
    e.stopPropagation()
    e.preventDefault()

    setDragState({
      orcamentoId: orcId,
      mode,
      startX: e.clientX,
      origInicioMs: dInicio.getTime(),
      origFimMs: dFim.getTime(),
      currentInicioMs: dInicio.getTime(),
      currentFimMs: dFim.getTime(),
    })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState) return

      const deltaX = e.clientX - dragState.startX
      const deltaDias = Math.round(deltaX / pixelsPorDia)
      const deltaMs = deltaDias * DIA_MS

      if (dragState.mode === 'move') {
        // Move barra inteira mantendo a duração
        const duracao = dragState.origFimMs - dragState.origInicioMs
        const novoInicio = dragState.origInicioMs + deltaMs
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                currentInicioMs: novoInicio,
                currentFimMs: novoInicio + duracao,
              }
            : null,
        )
      } else if (dragState.mode === 'resize-left') {
        // Estica ou encolhe a borda esquerda (início)
        let novoInicio = dragState.origInicioMs + deltaMs
        // Não permite passar do fim
        if (novoInicio > dragState.origFimMs - DIA_MS) {
          novoInicio = dragState.origFimMs - DIA_MS
        }
        setDragState((prev) => (prev ? { ...prev, currentInicioMs: novoInicio } : null))
      } else if (dragState.mode === 'resize-right') {
        // Estica ou encolhe a borda direita (fim)
        let novoFim = dragState.origFimMs + deltaMs
        // Não permite ser anterior ao início
        if (novoFim < dragState.origInicioMs + DIA_MS) {
          novoFim = dragState.origInicioMs + DIA_MS
        }
        setDragState((prev) => (prev ? { ...prev, currentFimMs: novoFim } : null))
      }
    },
    [dragState, pixelsPorDia],
  )

  const handleMouseUp = useCallback(() => {
    if (!dragState) return

    const { orcamentoId, currentInicioMs, currentFimMs } = dragState
    const dInicio = new Date(currentInicioMs)
    const dFim = new Date(currentFimMs)

    const formatIso = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day} 12:00:00.000Z`
    }

    // Persiste no banco de dados se houve mudança
    onAtualizarDatas(orcamentoId, formatIso(dInicio), formatIso(dFim))
    setDragState(null)
  }, [dragState, onAtualizarDatas])

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState, handleMouseMove, handleMouseUp])

  // Cores por status no Gantt
  const getCorBarra = (status: string) => {
    switch (status) {
      case 'Orçamentos a realizar':
        return 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white'
      case 'Aguardando aprovação':
        return 'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white'
      case 'Aprovados aguardando início':
        return 'bg-purple-600 hover:bg-purple-700 border-purple-700 text-white'
      case 'Trabalhos iniciados':
        return 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white'
      case 'Concluídos':
        return 'bg-[#2C3E50] hover:bg-[#1B2631] border-[#1B2631] text-[#D4AF37]'
      default:
        return 'bg-[#2C3E50] text-white'
    }
  }

  // Largura da coluna esquerda (lista de trabalhos)
  const COL_INFO_WIDTH = 320
  const timelineWidth = totalDias * pixelsPorDia

  return (
    <div className="w-full flex flex-col bg-white rounded-xl border border-[#E3E6EA] shadow-sm overflow-hidden select-none">
      {/* BARRA SUPERIOR DE CONTROLE DO GANTT */}
      <div className="p-3.5 bg-[#F6F7F9] border-b border-[#E3E6EA] flex flex-wrap items-center justify-between gap-3">
        {/* Navegação de Tempo */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffsetDias((prev) => prev - 7)}
            className="h-8 px-2.5 text-xs bg-white border-[#E3E6EA] text-[#22272A]"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> -7 dias
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffsetDias(0)}
            className="h-8 px-2.5 text-xs bg-white border-[#DEE4EA] text-[#2C3E50] font-semibold"
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffsetDias((prev) => prev + 7)}
            className="h-8 px-2.5 text-xs bg-white border-[#E3E6EA] text-[#22272A]"
          >
            +7 dias <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {/* Dica de Uso do Drag-and-Drop */}
        <div className="hidden md:flex items-center gap-2 text-xs text-[#5B6470] bg-white px-3 py-1 rounded-full border border-[#E3E6EA]">
          <MoveHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>
            <strong>Arrastar centro:</strong> move trabalho | <strong>Arrastar bordas:</strong>{' '}
            aumenta/diminui dias
          </span>
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#5B6470] mr-1 hidden sm:inline">Zoom:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPixelsPorDia((prev) => Math.max(30, prev - 8))}
            disabled={pixelsPorDia <= 30}
            className="h-8 w-8 p-0 bg-white"
            title="Diminuir zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs font-semibold text-[#22272A] w-12 text-center">
            {pixelsPorDia}px
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPixelsPorDia((prev) => Math.min(70, prev + 8))}
            disabled={pixelsPorDia >= 70}
            className="h-8 w-8 p-0 bg-white"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL DO GANTT COM SCROLL HORIZONTAL */}
      <div ref={containerRef} className="overflow-x-auto overflow-y-auto max-h-[640px]">
        <div
          className="relative min-w-full"
          style={{ width: `${COL_INFO_WIDTH + timelineWidth}px` }}
        >
          {/* CABEÇALHO DO CALENDÁRIO / DATAS */}
          <div className="sticky top-0 z-20 flex bg-white border-b border-[#E3E6EA]">
            {/* Coluna fixa esquerda: identificador do trabalho */}
            <div
              className="sticky left-0 z-30 bg-[#f4f4f4] border-r border-[#DEE4EA] px-4 py-2.5 flex items-center font-heading font-bold text-xs text-[#2C3E50] shadow-xs"
              style={{ width: `${COL_INFO_WIDTH}px`, minWidth: `${COL_INFO_WIDTH}px` }}
            >
              Trabalho / Cliente / Serviço
            </div>

            {/* Linha dos Dias da Linha do Tempo */}
            <div className="flex" style={{ width: `${timelineWidth}px` }}>
              {diasTimeline.map((dia, idx) => {
                const isHoje = dia.toDateString() === hoje.toDateString()
                const isFimDeSemana = dia.getDay() === 0 || dia.getDay() === 6
                const diaDoMes = dia.getDate()
                const diaSemanaStr = dia.toLocaleDateString('pt-BR', { weekday: 'narrow' })
                const mesStr =
                  diaDoMes === 1 || idx === 0
                    ? dia.toLocaleDateString('pt-BR', { month: 'short' })
                    : ''

                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center border-r border-[#E3E6EA] text-center transition-colors ${
                      isHoje
                        ? 'bg-[#2C3E50]/10 text-[#2C3E50] font-bold ring-1 ring-[#2C3E50]'
                        : isFimDeSemana
                          ? 'bg-[#F9FAFB] text-[#8A94A0]'
                          : 'bg-white text-[#5B6470]'
                    }`}
                    style={{ width: `${pixelsPorDia}px`, minWidth: `${pixelsPorDia}px` }}
                  >
                    {mesStr && (
                      <span className="text-[9px] uppercase font-bold text-[#D4AF37] -mb-0.5">
                        {mesStr}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold">{diaDoMes}</span>
                    <span className="text-[9px] uppercase text-[#8A94A0]">{diaSemanaStr}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* LINHAS DOS TRABALHOS */}
          <div className="divide-y divide-[#E3E6EA] relative">
            {/* Marcador vertical da linha do dia atual "Hoje" */}
            {(() => {
              const diasHoje = diasDesdeInicio(hoje)
              if (diasHoje >= 0 && diasHoje < totalDias) {
                const leftHoje = COL_INFO_WIDTH + diasHoje * pixelsPorDia + pixelsPorDia / 2
                return (
                  <div
                    className="absolute top-0 bottom-0 z-10 pointer-events-none flex flex-col items-center"
                    style={{ left: `${leftHoje}px` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm -mt-1" />
                    <div className="w-0.5 flex-1 bg-red-500/70" />
                  </div>
                )
              }
              return null
            })()}

            {itensGantt.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8A94A0]">
                Nenhum orçamento encontrado para o cronograma.
              </div>
            ) : (
              itensGantt.map((item) => {
                const orc = item.orcamento
                const config = getEtapaConfig(orc.status)

                // Cálculo da posição no eixo X
                const diasInicio = diasDesdeInicio(item.dInicio)
                const diasFim = diasDesdeInicio(item.dFim)
                const duracaoDias = Math.max(1, diasFim - diasInicio)

                const barLeft = COL_INFO_WIDTH + diasInicio * pixelsPorDia
                const barWidth = Math.max(pixelsPorDia, duracaoDias * pixelsPorDia)

                const isBeingDragged = dragState?.orcamentoId === orc.id

                return (
                  <div
                    key={orc.id}
                    className="flex h-16 hover:bg-[#F9FAFB] transition-colors relative group"
                  >
                    {/* Painel Esquerdo Fixo: Info do Trabalho */}
                    <div
                      onClick={() => onAbrirDetalhes(orc)}
                      className="sticky left-0 z-20 bg-white group-hover:bg-[#F9FAFB] border-r border-[#E3E6EA] px-3.5 py-2 flex flex-col justify-center cursor-pointer shadow-xs overflow-hidden"
                      style={{ width: `${COL_INFO_WIDTH}px`, minWidth: `${COL_INFO_WIDTH}px` }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-[#2C3E50] hover:underline">
                          {orc.numero}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 font-medium ${config.corBadge}`}
                        >
                          {config.label}
                        </Badge>
                      </div>

                      <span
                        className="text-xs font-semibold text-[#22272A] truncate"
                        title={orc.cliente}
                      >
                        {orc.cliente}
                      </span>

                      <div className="flex items-center justify-between text-[11px] text-[#5B6470] mt-0.5 truncate">
                        <span className="truncate">{item.prodNome}</span>
                        <span className="font-bold text-[#2C3E50] ml-1">
                          {item.duracaoDias} {item.duracaoDias === 1 ? 'dia' : 'dias'}
                        </span>
                      </div>
                    </div>

                    {/* Grade de fundo dos dias */}
                    <div className="flex h-full" style={{ width: `${timelineWidth}px` }}>
                      {diasTimeline.map((dia, idx) => {
                        const isFimDeSemana = dia.getDay() === 0 || dia.getDay() === 6
                        return (
                          <div
                            key={idx}
                            className={`border-r border-[#F0F2F5] h-full ${
                              isFimDeSemana ? 'bg-[#FAFAFA]' : ''
                            }`}
                            style={{ width: `${pixelsPorDia}px`, minWidth: `${pixelsPorDia}px` }}
                          />
                        )
                      })}
                    </div>

                    {/* BARRA DO GANTT (ARRASTÁVEL E REDIMENSIONÁVEL NAS BORDAS) */}
                    <div
                      style={{
                        left: `${barLeft}px`,
                        width: `${barWidth}px`,
                      }}
                      className={`absolute top-2.5 h-11 rounded-lg border shadow-xs flex items-center justify-between px-2 cursor-grab active:cursor-grabbing transition-shadow z-10 ${getCorBarra(
                        orc.status,
                      )} ${isBeingDragged ? 'ring-2 ring-black/40 shadow-lg opacity-90' : 'hover:shadow-md'}`}
                      onMouseDown={(e) =>
                        handleMouseDown(e, orc.id, 'move', item.dInicio, item.dFim)
                      }
                      title={`${orc.numero} — ${orc.cliente} (${item.duracaoDias} dias)`}
                    >
                      {/* Borda Esquerda para Redimensionar (Aumentar/Diminuir início) */}
                      <div
                        onMouseDown={(e) =>
                          handleMouseDown(e, orc.id, 'resize-left', item.dInicio, item.dFim)
                        }
                        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center hover:bg-black/20 rounded-l-lg transition-colors group/handle"
                        title="Arrastar borda para alterar data de início"
                      >
                        <div className="w-1 h-4 bg-white/70 rounded-full" />
                      </div>

                      {/* Conteúdo Central da Barra */}
                      <div className="flex-1 flex items-center justify-between px-2 overflow-hidden pointer-events-none">
                        <div className="flex items-center gap-1.5 truncate">
                          <GripHorizontal className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                          <span className="font-semibold text-xs truncate">
                            {orc.numero}: {orc.cliente}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-black/20 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">
                          {item.duracaoDias}d
                        </span>
                      </div>

                      {/* Borda Direita para Redimensionar (Aumentar/Diminuir fim/duração) */}
                      <div
                        onMouseDown={(e) =>
                          handleMouseDown(e, orc.id, 'resize-right', item.dInicio, item.dFim)
                        }
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center hover:bg-black/20 rounded-r-lg transition-colors group/handle"
                        title="Arrastar borda para aumentar ou diminuir dias de duração"
                      >
                        <div className="w-1 h-4 bg-white/70 rounded-full" />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
