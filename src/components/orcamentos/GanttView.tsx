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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

interface GanttViewProps {
  orcamentos: Orcamento[]
  onAtualizarDatas: (id: string, novaDataInicio: string, novaDataFim: string) => void
  onAbrirDetalhes: (orcamento: Orcamento) => void
  exibirSemData?: boolean
}

type DragMode = 'move' | 'resize-left' | 'resize-right' | null

interface DragState {
  orcamentoId: string
  mode: DragMode
  startX: number
  lastX: number
  origInicioMs: number
  origFimMs: number
  currentInicioMs: number
  currentFimMs: number
  hasMoved: boolean
}

const DIA_MS = 24 * 60 * 60 * 1000

// Parse defensivo e simétrico em data local (ano, mês, dia) sem derivação de fuso horário
export const parseDataGantt = (str?: string | null): Date | null => {
  if (!str) return null
  const clean = String(str).trim()
  if (!clean || clean === 'null' || clean === 'undefined' || clean === '0000-00-00') return null
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const y = parseInt(m[1], 10)
    const month = parseInt(m[2], 10) - 1
    const d = parseInt(m[3], 10)
    if (isNaN(y) || isNaN(month) || isNaN(d)) return null
    return new Date(y, month, d, 12, 0, 0, 0)
  }
  const d = new Date(clean)
  if (isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
}

// Formatação simétrica correspondente: YYYY-MM-DD 12:00:00.000Z
const formatIsoGantt = (d: Date): string => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day} 12:00:00.000Z`
}

export const GanttView: React.FC<GanttViewProps> = ({
  orcamentos,
  onAtualizarDatas,
  onAbrirDetalhes,
  exibirSemData = false,
}) => {
  // Configuração de zoom / pixels por dia
  const [pixelsPorDia, setPixelsPorDia] = useState<number>(44) // 32 = compacto, 44 = padrão, 60 = expandido
  const [offsetDias, setOffsetDias] = useState<number>(0) // Navegação no tempo
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [colunaRecolhida, setColunaRecolhida] = useState<boolean>(false)
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
    // Normaliza para início do dia (00:00:00) para índice exato de colunas
    const dNormalizada = new Date(data.getFullYear(), data.getMonth(), data.getDate(), 0, 0, 0, 0)
    const inicioNormalizado = new Date(
      dataInicioTimeline.getFullYear(),
      dataInicioTimeline.getMonth(),
      dataInicioTimeline.getDate(),
      0,
      0,
      0,
      0,
    )
    return Math.round((dNormalizada.getTime() - inicioNormalizado.getTime()) / DIA_MS)
  }

  // Prepara orçamentos para o Gantt — filtra itens sem data se exibirSemData estiver desmarcado
  const itensGantt = useMemo(() => {
    return orcamentos
      .filter((orc) => {
        if (!exibirSemData) {
          const parsedInicio = parseDataGantt(orc.data_inicio_prevista)
          const parsedFim = parseDataGantt(orc.data_fim_prevista)
          return Boolean(parsedInicio || parsedFim)
        }
        return true
      })
      .map((orc) => {
        const parsedInicio = parseDataGantt(orc.data_inicio_prevista)
        const parsedFim = parseDataGantt(orc.data_fim_prevista)
        const temData = Boolean(parsedInicio || parsedFim)

        let dInicio: Date
        let dFim: Date

        if (parsedInicio && parsedFim) {
          dInicio = parsedInicio
          dFim = parsedFim >= parsedInicio ? parsedFim : parsedInicio
        } else if (parsedInicio) {
          dInicio = parsedInicio
          dFim = parsedInicio
        } else if (parsedFim) {
          dInicio = parsedFim
          dFim = parsedFim
        } else {
          // Sem datas: usa placeholder apenas se vier a ser arrastado
          dInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1, 12, 0, 0, 0)
          dFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1, 12, 0, 0, 0)
        }

        // Se este item estiver em drag ativo, usa as datas atuais do drag
        if (dragState && dragState.orcamentoId === orc.id && dragState.hasMoved) {
          dInicio = new Date(dragState.currentInicioMs)
          dFim = new Date(dragState.currentFimMs)
        }

        const duracaoDias = temData
          ? Math.max(
              1,
              Math.round(
                (new Date(dFim.getFullYear(), dFim.getMonth(), dFim.getDate()).getTime() -
                  new Date(
                    dInicio.getFullYear(),
                    dInicio.getMonth(),
                    dInicio.getDate(),
                  ).getTime()) /
                  DIA_MS,
              ) + 1,
            )
          : 0

        const prodNome =
          orc.expand?.produto_principal?.nome ||
          parseItens(orc.itens)[0]?.descricao ||
          'Serviço Sob Medida'

        return {
          orcamento: orc,
          temData,
          dInicio,
          dFim,
          duracaoDias,
          prodNome,
        }
      })
  }, [orcamentos, hoje, dragState, exibirSemData])

  // Drag handlers compatíveis com Mouse e Touch (mobile + desktop)
  const handleStartDrag = (
    clientX: number,
    orcId: string,
    mode: DragMode,
    dInicio: Date,
    dFim: Date,
  ) => {
    // Guarda o ponto inicial sem tratar como arrasto ativo ainda
    setDragState({
      orcamentoId: orcId,
      mode,
      startX: clientX,
      lastX: clientX,
      origInicioMs: dInicio.getTime(),
      origFimMs: dFim.getTime(),
      currentInicioMs: dInicio.getTime(),
      currentFimMs: dFim.getTime(),
      hasMoved: false,
    })
  }

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!dragState) return

      const deltaXTotal = clientX - dragState.startX
      const isRealDrag = Math.abs(deltaXTotal) >= 4

      if (!isRealDrag && !dragState.hasMoved) {
        // Movimento insignificante (< 4px): é clique simples, não altera datas
        setDragState((prev) => (prev ? { ...prev, lastX: clientX } : null))
        return
      }

      const deltaDias = Math.round(deltaXTotal / pixelsPorDia)
      const deltaMs = deltaDias * DIA_MS

      if (dragState.mode === 'move') {
        // Move barra inteira mantendo a duração
        const duracao = dragState.origFimMs - dragState.origInicioMs
        const novoInicio = dragState.origInicioMs + deltaMs
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                lastX: clientX,
                hasMoved: true,
                currentInicioMs: novoInicio,
                currentFimMs: novoInicio + duracao,
              }
            : null,
        )
      } else if (dragState.mode === 'resize-left') {
        // Estica ou encolhe a borda esquerda (início)
        let novoInicio = dragState.origInicioMs + deltaMs
        // Não permite passar do fim (início <= fim)
        if (novoInicio > dragState.origFimMs) {
          novoInicio = dragState.origFimMs
        }
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                lastX: clientX,
                hasMoved: true,
                currentInicioMs: novoInicio,
              }
            : null,
        )
      } else if (dragState.mode === 'resize-right') {
        // Estica ou encolhe a borda direita (fim)
        let novoFim = dragState.origFimMs + deltaMs
        // Não permite ser anterior ao início (fim >= início)
        if (novoFim < dragState.origInicioMs) {
          novoFim = dragState.origInicioMs
        }
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                lastX: clientX,
                hasMoved: true,
                currentFimMs: novoFim,
              }
            : null,
        )
      }
    },
    [dragState, pixelsPorDia],
  )

  const handleEndDrag = useCallback(() => {
    if (!dragState) return

    const {
      orcamentoId,
      startX,
      lastX,
      hasMoved,
      origInicioMs,
      origFimMs,
      currentInicioMs,
      currentFimMs,
    } = dragState

    // 1. Se o deslocamento absoluto foi menor que 4px ou não houve movimento real, descarta SEM persistir
    const deltaTotal = Math.abs(lastX - startX)
    if (!hasMoved || deltaTotal < 4) {
      setDragState(null)
      return
    }

    const dInicio = new Date(currentInicioMs)
    const dFim = new Date(currentFimMs)
    const dOrigInicio = new Date(origInicioMs)
    const dOrigFim = new Date(origFimMs)

    const novaInicioStr = formatIsoGantt(dInicio)
    const novaFimStr = formatIsoGantt(dFim)
    const origInicioStr = formatIsoGantt(dOrigInicio)
    const origFimStr = formatIsoGantt(dOrigFim)

    // 2. Se as datas formatadas forem idênticas às originais (ou se ms for idêntico), descarta sem persistir
    if (
      (currentInicioMs === origInicioMs && currentFimMs === origFimMs) ||
      (novaInicioStr === origInicioStr && novaFimStr === origFimStr)
    ) {
      setDragState(null)
      return
    }

    // 3. Persiste no banco de dados com round-trip simétrico
    onAtualizarDatas(orcamentoId, novaInicioStr, novaFimStr)
    setDragState(null)
  }, [dragState, onAtualizarDatas])

  useEffect(() => {
    if (dragState) {
      const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX)
      const onMouseUp = () => handleEndDrag()
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          handlePointerMove(e.touches[0].clientX)
        }
      }
      const onTouchEnd = () => handleEndDrag()

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      window.addEventListener('touchmove', onTouchMove, { passive: true })
      window.addEventListener('touchend', onTouchEnd)
      window.addEventListener('touchcancel', onTouchEnd)
      return () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        window.removeEventListener('touchcancel', onTouchEnd)
      }
    }
  }, [dragState, handlePointerMove, handleEndDrag])

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

  // Largura da coluna esquerda: recolhível para liberar até +180px para o cronograma
  // Em modo recolhido mostra ORC + status + cliente compacto
  const COL_INFO_WIDTH = colunaRecolhida ? 140 : 260
  const timelineWidth = totalDias * pixelsPorDia
  const totalGanttWidth = COL_INFO_WIDTH + timelineWidth

  // Centraliza o scroll no "Hoje" ao inicializar ou mudar offset
  useEffect(() => {
    if (!containerRef.current) return
    const diasHoje = diasDesdeInicio(hoje)
    if (diasHoje >= 0 && diasHoje < totalDias) {
      // Posiciona o 'hoje' a cerca de 1/3 da largura visível
      const targetLeft = diasHoje * pixelsPorDia - 100
      containerRef.current.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      })
    }
  }, [offsetDias])

  return (
    <div className="w-full flex flex-col bg-white rounded-xl border border-[#E3E6EA] shadow-sm overflow-hidden select-none">
      {/* BARRA SUPERIOR DE CONTROLE DO GANTT */}
      <div className="p-3 bg-[#F6F7F9] border-b border-[#E3E6EA] flex flex-wrap items-center justify-between gap-2.5">
        {/* Navegação de Tempo */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOffsetDias((prev) => prev - 7)}
            className="h-8 px-2 sm:px-2.5 text-xs bg-white border-[#E3E6EA] text-[#22272A]"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-0.5 sm:mr-1" />
            <span className="hidden xs:inline">-7 dias</span>
            <span className="xs:hidden">-7d</span>
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
            className="h-8 px-2 sm:px-2.5 text-xs bg-white border-[#E3E6EA] text-[#22272A]"
          >
            <span className="hidden xs:inline">+7 dias</span>
            <span className="xs:hidden">+7d</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5 sm:mr-1" />
          </Button>
        </div>

        {/* Dica de Uso e Toggle de Coluna */}
        <div className="flex items-center gap-2">
          {/* Botão para expandir/recolher coluna de informações para dar mais espaço ao cronograma */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setColunaRecolhida((prev) => !prev)}
            className="h-8 px-2.5 text-xs bg-white border-[#E3E6EA] text-[#2C3E50] font-medium"
            title={
              colunaRecolhida ? 'Expandir coluna de trabalhos' : 'Recolher coluna para mais espaço'
            }
          >
            {colunaRecolhida ? (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />
                <span className="hidden sm:inline">Expandir Coluna</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 mr-1 text-[#5B6470]" />
                <span className="hidden sm:inline">Mais Espaço</span>
              </>
            )}
          </Button>

          {/* Dica de Uso do Drag-and-Drop */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#5B6470] bg-white px-3 py-1 rounded-full border border-[#E3E6EA]">
            <MoveHorizontal className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>
              <strong>Arrastar centro:</strong> move | <strong>Bordas:</strong> redimensiona dias
            </span>
          </div>
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-[#5B6470] mr-1 hidden md:inline">Zoom:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPixelsPorDia((prev) => Math.max(30, prev - 6))}
            disabled={pixelsPorDia <= 30}
            className="h-8 w-8 p-0 bg-white"
            title="Diminuir zoom (ver mais dias)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs font-semibold text-[#22272A] w-11 text-center">
            {pixelsPorDia}px
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPixelsPorDia((prev) => Math.min(68, prev + 6))}
            disabled={pixelsPorDia >= 68}
            className="h-8 w-8 p-0 bg-white"
            title="Aumentar zoom (dias mais largos)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* DICA DE ROLAGEM HORIZONTAL PARA DISPOSITIVOS MÓVEIS */}
      <div className="flex sm:hidden items-center justify-between px-3 py-1.5 bg-[#FFF9E6] border-b border-[#F5E6B8] text-[11px] text-[#8C6D1F]">
        <span className="flex items-center gap-1">
          <MoveHorizontal className="w-3 h-3 text-[#D4AF37]" />
          Arraste lateralmente para navegar pelos dias
        </span>
        <button
          type="button"
          onClick={() => {
            if (!containerRef.current) return
            const diasHoje = diasDesdeInicio(hoje)
            containerRef.current.scrollTo({
              left: Math.max(0, diasHoje * pixelsPorDia - 40),
              behavior: 'smooth',
            })
          }}
          className="font-bold underline text-[#2C3E50]"
        >
          Ir para Hoje
        </button>
      </div>

      {/* ÁREA PRINCIPAL DO GANTT COM SCROLL HORIZONTAL COMPLETO (TOUCH + MOUSE) */}
      <div
        ref={containerRef}
        className="overflow-x-auto overflow-y-auto max-h-[640px] touch-pan-x touch-pan-y overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="relative min-w-[960px]"
          style={{
            width: `${totalGanttWidth}px`,
            minWidth: `${Math.max(960, totalGanttWidth)}px`,
          }}
        >
          {/* CABEÇALHO DO CALENDÁRIO / DATAS */}
          <div className="sticky top-0 z-20 flex bg-white border-b border-[#E3E6EA]">
            {/* Coluna fixa esquerda: identificador do trabalho */}
            <div
              className="sticky left-0 z-30 bg-[#F4F6F8] border-r border-[#DEE4EA] px-3 py-2 flex items-center justify-between font-heading font-bold text-xs text-[#2C3E50] shadow-xs select-none"
              style={{ width: `${COL_INFO_WIDTH}px`, minWidth: `${COL_INFO_WIDTH}px` }}
            >
              <span className="truncate">
                {colunaRecolhida ? 'Trabalho' : 'Trabalho / Cliente / Serviço'}
              </span>
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
                        ? 'bg-[#2C3E50]/15 text-[#2C3E50] font-bold ring-1 ring-[#2C3E50] z-10'
                        : isFimDeSemana
                          ? 'bg-[#F9FAFB] text-[#8A94A0]'
                          : 'bg-white text-[#5B6470]'
                    }`}
                    style={{ width: `${pixelsPorDia}px`, minWidth: `${pixelsPorDia}px` }}
                  >
                    {mesStr && (
                      <span className="text-[9px] uppercase font-bold text-[#D4AF37] -mb-0.5 whitespace-nowrap">
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
                // A barra deve ir do início do dia de início ao fim do dia de término
                // (largura = (dias + 1) * larguraDoDia, offset = índiceDoDia(data_inicio) * larguraDoDia)
                const diasInicio = diasDesdeInicio(item.dInicio)
                const diasFim = diasDesdeInicio(item.dFim)
                const diasIntervalo = Math.max(0, diasFim - diasInicio)
                const duracaoDias = diasIntervalo + 1

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
                      className="sticky left-0 z-20 bg-white group-hover:bg-[#F9FAFB] border-r border-[#E3E6EA] px-3 py-1.5 flex flex-col justify-center cursor-pointer shadow-xs overflow-hidden"
                      style={{ width: `${COL_INFO_WIDTH}px`, minWidth: `${COL_INFO_WIDTH}px` }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-[#2C3E50] hover:underline truncate">
                          {orc.numero}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] py-0 px-1 font-medium truncate max-w-[110px] ${config.corBadge}`}
                        >
                          {config.label}
                        </Badge>
                      </div>

                      <span
                        className="text-xs font-semibold text-[#22272A] truncate"
                        title={
                          orc.identificacao ? `${orc.cliente} — ${orc.identificacao}` : orc.cliente
                        }
                      >
                        {orc.cliente}
                        {orc.identificacao && (
                          <span className="text-[#D4AF37] font-medium ml-1 text-[11px]">
                            ({orc.identificacao})
                          </span>
                        )}
                      </span>

                      {!colunaRecolhida && (
                        <div className="flex items-center justify-between text-[11px] text-[#5B6470] mt-0.5 truncate">
                          <span className="truncate">{item.prodNome}</span>
                          <span className="font-bold text-[#2C3E50] ml-1 flex-shrink-0">
                            {item.temData
                              ? `${item.duracaoDias} ${item.duracaoDias === 1 ? 'dia' : 'dias'}`
                              : 'Sem data'}
                          </span>
                        </div>
                      )}
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
                    {item.temData || isBeingDragged ? (
                      <div
                        style={{
                          left: `${barLeft}px`,
                          width: `${barWidth}px`,
                        }}
                        className={`absolute top-2.5 h-11 rounded-lg border shadow-xs flex items-center justify-between px-1.5 cursor-grab active:cursor-grabbing transition-shadow z-10 touch-none ${getCorBarra(
                          orc.status,
                        )} ${isBeingDragged ? 'ring-2 ring-black/40 shadow-lg opacity-90' : 'hover:shadow-md'}`}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          handleStartDrag(e.clientX, orc.id, 'move', item.dInicio, item.dFim)
                        }}
                        onTouchStart={(e) => {
                          if (e.touches.length > 0) {
                            handleStartDrag(
                              e.touches[0].clientX,
                              orc.id,
                              'move',
                              item.dInicio,
                              item.dFim,
                            )
                          }
                        }}
                        title={`${orc.numero} — ${orc.cliente} (${item.duracaoDias} dias)`}
                      >
                        {/* Borda Esquerda para Redimensionar (Aumentar/Diminuir início) */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            handleStartDrag(
                              e.clientX,
                              orc.id,
                              'resize-left',
                              item.dInicio,
                              item.dFim,
                            )
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation()
                            if (e.touches.length > 0) {
                              handleStartDrag(
                                e.touches[0].clientX,
                                orc.id,
                                'resize-left',
                                item.dInicio,
                                item.dFim,
                              )
                            }
                          }}
                          className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center hover:bg-black/20 active:bg-black/30 rounded-l-lg transition-colors touch-none"
                          title="Arrastar borda para alterar data de início"
                        >
                          <div className="w-1.5 h-4 bg-white/80 rounded-full" />
                        </div>

                        {/* Conteúdo Central da Barra */}
                        <div className="flex-1 flex items-center justify-between px-2 overflow-hidden pointer-events-none">
                          <div className="flex items-center gap-1 truncate">
                            <GripHorizontal className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                            <span className="font-semibold text-xs truncate">
                              {orc.numero}: {orc.cliente}
                              {orc.identificacao && ` — ${orc.identificacao}`}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold bg-black/25 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">
                            {item.duracaoDias}d
                          </span>
                        </div>

                        {/* Borda Direita para Redimensionar (Aumentar/Diminuir fim/duração) */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            handleStartDrag(
                              e.clientX,
                              orc.id,
                              'resize-right',
                              item.dInicio,
                              item.dFim,
                            )
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation()
                            if (e.touches.length > 0) {
                              handleStartDrag(
                                e.touches[0].clientX,
                                orc.id,
                                'resize-right',
                                item.dInicio,
                                item.dFim,
                              )
                            }
                          }}
                          className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center hover:bg-black/20 active:bg-black/30 rounded-r-lg transition-colors touch-none"
                          title="Arrastar borda para alterar data de término"
                        >
                          <div className="w-1.5 h-4 bg-white/80 rounded-full" />
                        </div>
                      </div>
                    ) : (
                      <div
                        className="absolute top-3.5 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#F4F4F4] border border-dashed border-[#DEE4EA] text-[11px] text-[#616F7D] cursor-pointer hover:bg-[#E8EDF2]"
                        style={{ left: `${COL_INFO_WIDTH + 16}px` }}
                        onClick={() => onAbrirDetalhes(orc)}
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#8A94A0]" />
                        <span>Sem datas definidas no cronograma — clique para agendar</span>
                      </div>
                    )}
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
