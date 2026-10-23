import React, { useState, useEffect, useMemo, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { Orcamento, Produto, StatusOrcamento } from '@/types'
import {
  listarOrcamentos,
  atualizarStatusOrcamento,
  atualizarDatasGantt,
  excluirOrcamento,
  ETAPAS_ORCAMENTO,
} from '@/services/orcamentos'
import { KanbanView } from '@/components/orcamentos/KanbanView'
import { GanttView } from '@/components/orcamentos/GanttView'
import { TabelaView } from '@/components/orcamentos/TabelaView'
import { OrcamentoModal } from '@/components/orcamentos/OrcamentoModal'
import { OrcamentoDetalhesModal } from '@/components/orcamentos/OrcamentoDetalhesModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Kanban,
  CalendarDays,
  Table as TableIcon,
  Plus,
  Search,
  Filter,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Clock,
  RotateCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'

export const Orcamentos: React.FC = () => {
  const { toast } = useToast()

  // Estados principais
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)

  // Modo de visualização: kanban, gantt ou tabela
  const [viewMode, setViewMode] = useState<'kanban' | 'gantt' | 'tabela'>('kanban')

  // Filtros locais
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroCanal, setFiltroCanal] = useState<string>('todos')

  // Modais
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [orcamentoParaEditar, setOrcamentoParaEditar] = useState<Orcamento | null>(null)
  const [orcamentoDetalhes, setOrcamentoDetalhes] = useState<Orcamento | null>(null)
  const [orcamentoParaExcluir, setOrcamentoParaExcluir] = useState<Orcamento | null>(null)

  // Carrega dados do PocketBase
  const carregarDados = useCallback(async () => {
    try {
      const [orcs, prods] = await Promise.all([
        listarOrcamentos(),
        pb.collection<Produto>('produtos').getFullList({
          filter: 'ativo = true',
          sort: 'nome',
        }),
      ])
      setOrcamentos(orcs)
      setProdutos(prods)
    } catch (e) {
      console.error('Erro ao carregar orçamentos e produtos:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Realtime updates
  useRealtime<Orcamento>('orcamentos', () => {
    carregarDados()
  })

  // Manipulador de mudança de etapa via Drag-and-Drop do Kanban ou Ação Rápida
  const handleMudarStatus = async (id: string, novoStatus: StatusOrcamento) => {
    try {
      // Atualização otimista
      setOrcamentos((prev) => prev.map((o) => (o.id === id ? { ...o, status: novoStatus } : o)))

      await atualizarStatusOrcamento(id, novoStatus)

      if (novoStatus === 'Concluídos') {
        toast({
          title: 'Trabalho Concluído!',
          description: 'Venda criada automaticamente na coleção Vendas e adicionada ao Dashboard.',
        })
      } else {
        toast({
          title: 'Status atualizado',
          description: `Orçamento movido para "${novoStatus}".`,
        })
      }
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao mover orçamento:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err?.message || 'Não foi possível mover o trabalho.',
      })
      carregarDados()
    }
  }

  // Manipulador de datas via Drag-and-Drop / Resize do Gantt
  const handleAtualizarDatasGantt = async (
    id: string,
    novaDataInicio: string,
    novaDataFim: string,
  ) => {
    try {
      // Atualização otimista
      setOrcamentos((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, data_inicio_prevista: novaDataInicio, data_fim_prevista: novaDataFim }
            : o,
        ),
      )

      await atualizarDatasGantt(id, novaDataInicio, novaDataFim)
      toast({
        title: 'Cronograma ajustado',
        description: 'Datas do trabalho recalculadas e salvas com sucesso.',
      })
      carregarDados()
    } catch (err: any) {
      console.error('Erro ao atualizar datas no Gantt:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao reagendar',
        description: err?.message || 'Não foi possível atualizar as datas.',
      })
      carregarDados()
    }
  }

  // Exclusão
  const handleConfirmarExclusao = async () => {
    if (!orcamentoParaExcluir) return
    try {
      await excluirOrcamento(orcamentoParaExcluir.id)
      toast({
        title: 'Orçamento excluído',
        description: `${orcamentoParaExcluir.numero} foi removido.`,
      })
      setOrcamentoParaExcluir(null)
      if (orcamentoDetalhes?.id === orcamentoParaExcluir.id) {
        setOrcamentoDetalhes(null)
      }
      carregarDados()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao remover o registro.',
      })
    }
  }

  // Filtragem dos orçamentos
  const orcamentosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim()

    return orcamentos.filter((orc) => {
      if (filtroStatus !== 'todos' && orc.status !== filtroStatus) {
        return false
      }
      if (filtroCanal !== 'todos' && orc.canal_origem !== filtroCanal) {
        return false
      }

      if (termo) {
        const cliente = (orc.cliente || '').toLowerCase()
        const numero = (orc.numero || '').toLowerCase()
        const cidade = (orc.cidade || '').toLowerCase()
        const prod = (orc.expand?.produto_principal?.nome || '').toLowerCase()

        if (
          !cliente.includes(termo) &&
          !numero.includes(termo) &&
          !cidade.includes(termo) &&
          !prod.includes(termo)
        ) {
          return false
        }
      }

      return true
    })
  }, [orcamentos, busca, filtroStatus, filtroCanal])

  // Métricas de resumo rápido
  const metricas = useMemo(() => {
    const total = orcamentos.length
    const valorGeral = orcamentos.reduce((acc, o) => acc + (o.valor_total || 0), 0)
    const emAndamento = orcamentos.filter((o) => o.status === 'Trabalhos iniciados').length
    const aguardandoAprovacao = orcamentos.filter(
      (o) => o.status === 'Aguardando aprovação' || o.status === 'Orçamentos a realizar',
    ).length
    const concluidos = orcamentos.filter((o) => o.status === 'Concluídos').length

    return { total, valorGeral, emAndamento, aguardandoAprovacao, concluidos }
  }, [orcamentos])

  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* CABEÇALHO DO MÓDULO & CARDS DE RESUMO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2C3E50]/10 text-[#2C3E50] border border-[#2C3E50]/20">
                Gesso Bettone
              </span>
              <span className="text-xs text-[#616F7D]">Funil de Obras & Trabalhos</span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#2C3E50] tracking-tight mt-1">
              Gestão de Orçamentos & Obras
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => carregarDados()}
              className="h-9 text-xs bg-white text-[#616F7D] border-[#DEE4EA] hover:text-[#2C3E50]"
              title="Atualizar dados"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1" />
              Atualizar
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setOrcamentoParaEditar(null)
                setModalNovoOpen(true)
              }}
              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] text-xs font-bold h-9 px-4 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5 text-[#2C3E50]" />
              Novo Orçamento
            </Button>
          </div>
        </div>

        {/* 4 CARDS DE MÉTRICAS RÁPIDAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-[#616F7D]">Pipeline Total</span>
              <p className="text-base sm:text-lg font-bold text-[#2C3E50]">
                {formatMoeda(metricas.valorGeral)}
              </p>
              <span className="text-[10px] text-[#8A94A0] block">{metricas.total} propostas</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#E8EDF2] text-[#2C3E50] flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-[#616F7D]">Ag. Aprovação</span>
              <p className="text-base sm:text-lg font-bold text-amber-700">
                {metricas.aguardandoAprovacao}
              </p>
              <span className="text-[10px] text-[#8A94A0] block">A realizar ou propostas</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-[#616F7D]">Obras em Andamento</span>
              <p className="text-base sm:text-lg font-bold text-emerald-700">
                {metricas.emAndamento}
              </p>
              <span className="text-[10px] text-[#8A94A0] block">Trabalhos iniciados</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-[#616F7D]">Concluídos</span>
              <p className="text-base sm:text-lg font-bold text-[#2C3E50]">{metricas.concluidos}</p>
              <span className="text-[10px] text-[#8A94A0] block">Vendas sincronizadas</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#2C3E50]/10 text-[#2C3E50] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* BARRA DE CONTROLE: TABS DE VISUALIZAÇÃO + BUSCA + FILTROS */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Alternância de Visualizações (Kanban / Gantt / Tabela) */}
          <div className="flex items-center bg-[#f4f4f4] p-1 rounded-lg border border-[#DEE4EA] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-[#2C3E50] shadow-xs'
                  : 'text-[#616F7D] hover:text-[#2C3E50]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'gantt'
                  ? 'bg-white text-[#2C3E50] shadow-xs'
                  : 'text-[#616F7D] hover:text-[#2C3E50]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Gantt (Cronograma)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'tabela'
                  ? 'bg-white text-[#2C3E50] shadow-xs'
                  : 'text-[#616F7D] hover:text-[#2C3E50]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela</span>
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 md:max-w-2xl justify-end">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8A94A0] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Buscar por cliente, número ou serviço..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-xs bg-white"
              />
            </div>

            <div className="w-full sm:w-44">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Todas as etapas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todas as Etapas
                  </SelectItem>
                  {ETAPAS_ORCAMENTO.map((st) => (
                    <SelectItem key={st} value={st} className="text-xs">
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-36">
              <Select value={filtroCanal} onValueChange={setFiltroCanal}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Canais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos os Canais
                  </SelectItem>
                  <SelectItem value="WhatsApp" className="text-xs">
                    WhatsApp
                  </SelectItem>
                  <SelectItem value="E-mail" className="text-xs">
                    E-mail
                  </SelectItem>
                  <SelectItem value="Instagram" className="text-xs">
                    Instagram
                  </SelectItem>
                  <SelectItem value="Loja física" className="text-xs">
                    Loja física
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ÁREA DE VISUALIZAÇÃO ATIVA */}
        {loading ? (
          <div className="bg-white rounded-xl border border-[#E3E6EA] p-12 flex flex-col items-center justify-center text-xs text-[#5B6470] space-y-2">
            <div className="w-6 h-6 border-2 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
            <span>Carregando orçamentos e obras...</span>
          </div>
        ) : (
          <div>
            {viewMode === 'kanban' && (
              <KanbanView
                orcamentos={orcamentosFiltrados}
                onMudarStatus={handleMudarStatus}
                onAbrirDetalhes={(orc) => setOrcamentoDetalhes(orc)}
                onNovoOrcamento={() => {
                  setOrcamentoParaEditar(null)
                  setModalNovoOpen(true)
                }}
              />
            )}

            {viewMode === 'gantt' && (
              <GanttView
                orcamentos={orcamentosFiltrados}
                onAtualizarDatas={handleAtualizarDatasGantt}
                onAbrirDetalhes={(orc) => setOrcamentoDetalhes(orc)}
              />
            )}

            {viewMode === 'tabela' && (
              <TabelaView
                orcamentos={orcamentosFiltrados}
                onAbrirDetalhes={(orc) => setOrcamentoDetalhes(orc)}
                onMudarStatus={handleMudarStatus}
              />
            )}
          </div>
        )}
      </div>

      {/* MODAL NOVO OU EDITAR ORÇAMENTO */}
      <OrcamentoModal
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        produtos={produtos}
        orcamentoParaEditar={orcamentoParaEditar}
        onSuccess={() => {
          carregarDados()
          setOrcamentoParaEditar(null)
        }}
      />

      {/* MODAL DETALHES DO ORÇAMENTO */}
      <OrcamentoDetalhesModal
        orcamento={orcamentoDetalhes}
        open={Boolean(orcamentoDetalhes)}
        onOpenChange={(open) => {
          if (!open) setOrcamentoDetalhes(null)
        }}
        onEditar={(orc) => {
          setOrcamentoDetalhes(null)
          setOrcamentoParaEditar(orc)
          setModalNovoOpen(true)
        }}
        onConcluir={(orc) => {
          handleMudarStatus(orc.id, 'Concluídos')
          setOrcamentoDetalhes(null)
        }}
        onExcluir={(orc) => {
          setOrcamentoParaExcluir(orc)
        }}
      />

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(orcamentoParaExcluir)}
        onOpenChange={(open) => {
          if (!open) setOrcamentoParaExcluir(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[#2C3E50]">
              Excluir Orçamento {orcamentoParaExcluir?.numero}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#5B6470]">
              Tem certeza que deseja remover este orçamento de {orcamentoParaExcluir?.cliente}? Esta
              ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              className="bg-[#C4453C] hover:bg-[#a5372f] text-white text-xs font-semibold"
            >
              Excluir Registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Orcamentos
