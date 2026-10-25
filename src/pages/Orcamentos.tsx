import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { dataAdapter } from '@/lib/dataAdapter'
import type { Orcamento, Produto, StatusOrcamento, ClienteGrupo, MetodoPagamento } from '@/types'
import {
  listarOrcamentos,
  atualizarStatusOrcamento,
  atualizarDatasGantt,
  excluirOrcamento,
  ETAPAS_ORCAMENTO,
} from '@/services/orcamentos'
import {
  listarEtapas,
  criarEtapa,
  atualizarEtapa,
  excluirEtapa,
  type OrcamentoEtapa,
} from '@/services/orcamentoEtapas'
import { listarGrupos, listarMetodosPagamento } from '@/services/orcamentoModulo'
import { KanbanView } from '@/components/orcamentos/KanbanView'
import { GanttView } from '@/components/orcamentos/GanttView'
import { TabelaView } from '@/components/orcamentos/TabelaView'
import { OrcamentoModal } from '@/components/orcamentos/OrcamentoModal'
import { OrcamentoDetalhesModal } from '@/components/orcamentos/OrcamentoDetalhesModal'
import { AbaServicosPrecos } from '@/components/orcamentos/AbaServicosPrecos'
import { AbaClientes } from '@/components/orcamentos/AbaClientes'
import { AbaGrupos } from '@/components/orcamentos/AbaGrupos'
import { AbaMetodosPagamento } from '@/components/orcamentos/AbaMetodosPagamento'
import { AbaConfiguracoes } from '@/components/orcamentos/AbaConfiguracoes'
import { AbaContasReceber } from '@/components/orcamentos/AbaContasReceber'
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
  DollarSign,
  Briefcase,
  CheckCircle2,
  Clock,
  RotateCw,
  FolderKanban,
  Tag,
  Users,
  Layers,
  CreditCard,
  Settings,
  Banknote,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'

type AbaModulo =
  | 'funil'
  | 'servicos'
  | 'clientes'
  | 'grupos'
  | 'metodos'
  | 'configuracoes'
  | 'receber'

export const Orcamentos: React.FC = () => {
  const { toast } = useToast()

  // Aba principal selecionada (Padrão das 6 abas do sistema antigo + Funil + Contas a Receber)
  const [abaAtiva, setAbaAtiva] = useState<AbaModulo>('funil')
  const [versaoDados, setVersaoDados] = useState(0)

  // Estados principais
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [etapas, setEtapas] = useState<OrcamentoEtapa[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [grupos, setGrupos] = useState<ClienteGrupo[]>([])
  const [metodos, setMetodos] = useState<MetodoPagamento[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  // Estado para modal de Criar/Editar Etapa Customizada
  const [modalEtapaOpen, setModalEtapaOpen] = useState(false)
  const [etapaEditando, setEtapaEditando] = useState<OrcamentoEtapa | null>(null)
  const [nomeNovaEtapa, setNomeNovaEtapa] = useState('')
  const [corNovaEtapa, setCorNovaEtapa] = useState('#2C3E50')
  const [salvandoEtapa, setSalvandoEtapa] = useState(false)

  // Modo de visualização dentro do Funil: kanban, gantt ou tabela
  const [viewMode, setViewMode] = useState<'kanban' | 'gantt' | 'tabela'>('kanban')

  // Filtros locais do funil
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroCanal, setFiltroCanal] = useState<string>('todos')

  // Modais
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [orcamentoParaEditar, setOrcamentoParaEditar] = useState<Orcamento | null>(null)
  const [orcamentoDetalhes, setOrcamentoDetalhes] = useState<Orcamento | null>(null)
  const [orcamentoParaExcluir, setOrcamentoParaExcluir] = useState<Orcamento | null>(null)

  // Carrega dados de forma resiliente tanto em Supabase quanto em PocketBase
  const carregarDados = useCallback(async (exibirFeedback = false) => {
    try {
      if (exibirFeedback) setAtualizando(true)

      const [orcsRes, etapasRes, prodsRes, grpsRes, metsRes] = await Promise.allSettled([
        listarOrcamentos(),
        listarEtapas(),
        dataAdapter.getFullList<Produto>('produtos', {
          filter: 'ativo = true',
          sort: 'nome',
        }),
        listarGrupos(),
        listarMetodosPagamento(),
      ])

      if (etapasRes.status === 'fulfilled') {
        setEtapas(etapasRes.value)
      } else {
        console.warn('Falha ao listar etapas:', etapasRes.reason)
      }

      if (orcsRes.status === 'fulfilled') {
        setOrcamentos(orcsRes.value)
      } else {
        console.warn('Falha ao listar orçamentos:', orcsRes.reason)
      }

      if (prodsRes.status === 'fulfilled') {
        setProdutos(prodsRes.value)
      } else {
        console.warn('Falha ao listar produtos:', prodsRes.reason)
      }

      if (grpsRes.status === 'fulfilled') {
        setGrupos(grpsRes.value)
      } else {
        console.warn('Falha ao listar grupos:', grpsRes.reason)
      }

      if (metsRes.status === 'fulfilled') {
        setMetodos(metsRes.value)
      } else {
        console.warn('Falha ao listar métodos de pagamento:', metsRes.reason)
      }

      setVersaoDados((v) => v + 1)

      if (exibirFeedback) {
        toast({
          title: 'Dados atualizados',
          description: 'Todas as abas e orçamentos foram sincronizados.',
        })
      }
    } catch (e) {
      console.error('Erro ao carregar dados do módulo de orçamentos:', e)
      if (exibirFeedback) {
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar dados',
          description: 'Não foi possível sincronizar todos os registros. Tente novamente.',
        })
      }
    } finally {
      setLoading(false)
      if (exibirFeedback) setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Realtime updates para orçamentos e parcelas
  useRealtime<Orcamento>('orcamentos', () => {
    carregarDados()
  })

  // Manipulador de mudança de etapa via Drag-and-Drop do Kanban ou Ação Rápida
  const handleMudarStatus = async (id: string, novoStatus: StatusOrcamento | string) => {
    try {
      setOrcamentos((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: novoStatus as any } : o)),
      )

      const res = await atualizarStatusOrcamento(id, novoStatus as any)

      if (res.parcelasEstornadas > 0) {
        toast({
          title: 'Parcelas em aberto estornadas',
          description: `Parcelas em aberto foram estornadas devido ao retorno de etapa (${res.parcelasEstornadas} parcela(s) cancelada(s)).`,
        })
      } else if (novoStatus === 'Concluídos') {
        toast({
          title: 'Trabalho Concluído!',
          description: 'Venda registrada no Dashboard e agenda de pagamentos atualizada.',
        })
      } else if (novoStatus === 'Aprovados aguardando início') {
        toast({
          title: 'Orçamento Aprovado!',
          description: 'Agenda de pagamentos gerada para controle e conciliação bancária.',
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
  // Gerenciamento de Etapas Customizadas
  const handleAbrirNovaEtapa = () => {
    setEtapaEditando(null)
    setNomeNovaEtapa('')
    setCorNovaEtapa('#2C3E50')
    setModalEtapaOpen(true)
  }

  const handleEditarEtapa = (etapa: OrcamentoEtapa) => {
    setEtapaEditando(etapa)
    setNomeNovaEtapa(etapa.nome)
    setCorNovaEtapa(etapa.cor || '#2C3E50')
    setModalEtapaOpen(true)
  }

  const handleSalvarEtapa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeNovaEtapa.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe o nome da etapa.',
      })
      return
    }

    setSalvandoEtapa(true)
    try {
      if (etapaEditando) {
        await atualizarEtapa(etapaEditando.id, {
          nome: nomeNovaEtapa.trim(),
          cor: corNovaEtapa,
        })
        toast({ title: 'Etapa atualizada com sucesso!' })
      } else {
        await criarEtapa({
          nome: nomeNovaEtapa.trim(),
          cor: corNovaEtapa,
        })
        toast({ title: 'Nova etapa criada no funil!' })
      }
      setModalEtapaOpen(false)
      const listaAtualizada = await listarEtapas()
      setEtapas(listaAtualizada)
      carregarDados()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar etapa',
        description: err?.message || 'Falha ao salvar.',
      })
    } finally {
      setSalvandoEtapa(false)
    }
  }

  const handleExcluirEtapa = async (etapa: OrcamentoEtapa) => {
    try {
      await excluirEtapa(etapa.id, etapas, orcamentos, async (orcId, novoStatus) => {
        const r = await atualizarStatusOrcamento(orcId, novoStatus as any)
        return r.orcamento
      })
      toast({
        title: 'Etapa removida',
        description: `A etapa "${etapa.nome}" foi excluída e os trabalhos migrados para a etapa anterior.`,
      })
      const listaAtualizada = await listarEtapas()
      setEtapas(listaAtualizada)
      carregarDados()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível excluir',
        description: err?.message || 'Erro ao remover etapa.',
      })
    }
  }

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

  // Filtragem dos orçamentos para a visualização Funil
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
        const cli = (orc.cliente || '').toLowerCase()
        const numero = (orc.numero || '').toLowerCase()
        const cid = (orc.cidade || '').toLowerCase()
        const prod = (orc.expand?.produto_principal?.nome || '').toLowerCase()

        if (
          !cli.includes(termo) &&
          !numero.includes(termo) &&
          !cid.includes(termo) &&
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
        {/* CABEÇALHO DO MÓDULO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#2C3E50]/10 text-[#2C3E50] border border-[#2C3E50]/20">
                Gesso Bettone
              </span>
              <span className="text-xs text-[#616F7D]">Área Interna • Módulo Comercial</span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#2C3E50] tracking-tight mt-1">
              Módulo de Orçamentos & Contas
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => carregarDados(true)}
              disabled={atualizando}
              className="h-9 text-xs bg-white text-[#616F7D] border-[#DEE4EA] hover:text-[#2C3E50]"
              title="Atualizar dados"
            >
              <RotateCw
                className={`w-3.5 h-3.5 mr-1 ${atualizando ? 'animate-spin text-[#2C3E50]' : ''}`}
              />
              {atualizando ? 'Atualizando...' : 'Atualizar'}
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

        {/* NAVEGAÇÃO ENTRE AS ABAS DO MÓDULO (Padrão 6 Abas do Sistema Antigo + Contas a Receber) */}
        <div className="bg-white p-1.5 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva('funil')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              abaAtiva === 'funil'
                ? 'bg-[#2C3E50] text-white shadow-xs'
                : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-[#f4f4f4]'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Funil de Orçamentos ({orcamentos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('receber')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              abaAtiva === 'receber'
                ? 'bg-[#2C3E50] text-white shadow-xs'
                : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-[#f4f4f4]'
            }`}
          >
            <Banknote className="w-4 h-4 text-[#D4AF37]" />
            <span>Contas a Receber / Baixa</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('servicos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              abaAtiva === 'servicos'
                ? 'bg-[#2C3E50] text-white shadow-xs'
                : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-[#f4f4f4]'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Serviços e Preços</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('clientes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              abaAtiva === 'clientes'
                ? 'bg-[#2C3E50] text-white shadow-xs'
                : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-[#f4f4f4]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('grupos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              abaAtiva === 'grupos'
                ? 'bg-[#2C3E50] text-white shadow-xs'
                : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-[#f4f4f4]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Grupos ({grupos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('metodos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              abaAtiva === 'metodos'
                ? 'bg-[#2C3E50] text-white shadow-xs'
                : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-[#f4f4f4]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Métodos de Pagamento</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('configuracoes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              abaAtiva === 'configuracoes'
                ? 'bg-[#2C3E50] text-white shadow-xs'
                : 'text-[#616F7D] hover:text-[#2C3E50] hover:bg-[#f4f4f4]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA ATIVA */}
        {abaAtiva === 'funil' && (
          <div className="space-y-6">
            {/* 4 CARDS DE RESUMO RÁPIDO DO FUNIL */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#616F7D]">Pipeline Total</span>
                  <p className="text-base sm:text-lg font-bold text-[#2C3E50]">
                    {formatMoeda(metricas.valorGeral)}
                  </p>
                  <span className="text-[10px] text-[#8A94A0] block">
                    {metricas.total} propostas
                  </span>
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
                  <p className="text-base sm:text-lg font-bold text-[#2C3E50]">
                    {metricas.concluidos}
                  </p>
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
                      {(etapas.length > 0 ? etapas.map((e) => e.nome) : ETAPAS_ORCAMENTO).map(
                        (st) => (
                          <SelectItem key={st} value={st} className="text-xs">
                            {st}
                          </SelectItem>
                        ),
                      )}
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

            {/* ÁREA DE VISUALIZAÇÃO ATIVA DO FUNIL */}
            {loading ? (
              <div className="bg-white rounded-xl border border-[#DEE4EA] p-12 flex flex-col items-center justify-center text-xs text-[#616F7D] space-y-2">
                <div className="w-6 h-6 border-2 border-[#2C3E50] border-t-transparent rounded-full animate-spin" />
                <span>Carregando orçamentos e obras...</span>
              </div>
            ) : (
              <div>
                {viewMode === 'kanban' && (
                  <KanbanView
                    orcamentos={orcamentosFiltrados}
                    etapas={etapas}
                    onMudarStatus={handleMudarStatus}
                    onAbrirDetalhes={(orc) => setOrcamentoDetalhes(orc)}
                    onNovoOrcamento={() => {
                      setOrcamentoParaEditar(null)
                      setModalNovoOpen(true)
                    }}
                    onNovaEtapa={handleAbrirNovaEtapa}
                    onEditarEtapa={handleEditarEtapa}
                    onExcluirEtapa={handleExcluirEtapa}
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
        )}

        {/* ABA: CONTAS A RECEBER & CONCILIAÇÃO BANCÁRIA */}
        {abaAtiva === 'receber' && (
          <AbaContasReceber key={`receber-${versaoDados}`} onAtualizarOrcamentos={carregarDados} />
        )}

        {/* ABA: SERVIÇOS E PREÇOS */}
        {abaAtiva === 'servicos' && (
          <AbaServicosPrecos key={`servicos-${versaoDados}`} grupos={grupos} />
        )}

        {/* ABA: CLIENTES */}
        {abaAtiva === 'clientes' && (
          <AbaClientes
            key={`clientes-${versaoDados}`}
            grupos={grupos}
            orcamentos={orcamentos}
            onSelecionarOrcamento={(orc) => {
              setOrcamentoDetalhes(orc)
              setAbaAtiva('funil')
            }}
          />
        )}

        {/* ABA: GRUPOS */}
        {abaAtiva === 'grupos' && (
          <AbaGrupos key={`grupos-${versaoDados}`} grupos={grupos} onAtualizar={carregarDados} />
        )}

        {/* ABA: MÉTODOS DE PAGAMENTO */}
        {abaAtiva === 'metodos' && (
          <AbaMetodosPagamento
            key={`metodos-${versaoDados}`}
            metodos={metodos}
            onAtualizar={carregarDados}
          />
        )}

        {/* ABA: CONFIGURAÇÕES DO ORÇAMENTO */}
        {abaAtiva === 'configuracoes' && <AbaConfiguracoes key={`config-${versaoDados}`} />}
      </div>

      {/* MODAL NOVO OU EDITAR ORÇAMENTO */}
      <OrcamentoModal
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        produtos={produtos}
        etapas={etapas}
        orcamentoParaEditar={orcamentoParaEditar}
        onSuccess={() => {
          carregarDados()
          setOrcamentoParaEditar(null)
        }}
      />

      {/* MODAL CRIAR/EDITAR ETAPA DO FUNIL */}
      <AlertDialog open={modalEtapaOpen} onOpenChange={setModalEtapaOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[#2C3E50]">
              {etapaEditando ? 'Editar Etapa do Funil' : 'Nova Etapa do Funil'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#616F7D]">
              Adicione uma nova coluna customizada ao pipeline de orçamentos e obras.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSalvarEtapa} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#2C3E50]">Nome da Etapa *</label>
              <Input
                value={nomeNovaEtapa}
                onChange={(e) => setNomeNovaEtapa(e.target.value)}
                placeholder="Ex: Medição Técnica ou Em Negociação"
                className="h-9 text-xs bg-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#2C3E50]">Cor de Identificação</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={corNovaEtapa}
                  onChange={(e) => setCorNovaEtapa(e.target.value)}
                  className="w-10 h-9 rounded cursor-pointer border border-[#DEE4EA] p-0.5 bg-white"
                />
                <span className="text-xs text-[#616F7D] font-mono">{corNovaEtapa}</span>
              </div>
            </div>

            <AlertDialogFooter className="pt-2">
              <AlertDialogCancel
                type="button"
                onClick={() => setModalEtapaOpen(false)}
                className="text-xs"
              >
                Cancelar
              </AlertDialogCancel>
              <Button
                type="submit"
                disabled={salvandoEtapa}
                className="bg-[#2C3E50] text-[#D4AF37] hover:bg-[#1B2631] text-xs font-bold"
              >
                {salvandoEtapa ? 'Salvando...' : etapaEditando ? 'Salvar' : 'Criar Etapa'}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogDescription className="text-xs text-[#616F7D]">
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
