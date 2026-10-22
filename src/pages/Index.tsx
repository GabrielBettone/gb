import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlobalFilters } from '@/components/GlobalFilters'
import { useFilters } from '@/contexts/FilterContext'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import type { Venda, Produto, Alerta } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Receipt,
  Bell,
  ArrowRight,
  Upload,
  Calendar,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export const Index: React.FC = () => {
  const { filtros, setImportModalOpen, atualizarFiltro } = useFilters()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [graficoAba, setGraficoAba] = useState<'semanal' | 'mensal'>('mensal')
  const [selectedPonto, setSelectedPonto] = useState<{
    label: string
    vendas: Venda[]
  } | null>(null)

  const navigate = useNavigate()

  // Cores do Design System oficial da especificação
  const CORES_CANAIS = {
    WhatsApp: '#1C4E3D',
    'E-mail': '#58788C',
    Instagram: '#C97A5A',
    'Loja física': '#C2A24B',
  }

  // Carrega vendas e produtos
  const carregarDados = useCallback(async () => {
    try {
      const [vendasRes, produtosRes, alertasRes] = await Promise.all([
        pb.collection<Venda>('vendas').getFullList({
          sort: '-data',
          expand: 'produto',
        }),
        pb.collection<Produto>('produtos').getFullList({
          sort: 'nome',
        }),
        pb.collection<Alerta>('alertas').getList(1, 10, {
          sort: '-created',
          expand: 'regra',
        }),
      ])

      setVendas(vendasRes)
      setProdutos(produtosRes)
      setAlertas(alertasRes.items)

      // Se não houver vendas, abre o modal de importação com convite
      if (vendasRes.length === 0) {
        setImportModalOpen(true)
      }
    } catch (e) {
      console.error('Erro ao carregar dados do PocketBase:', e)
    } finally {
      setLoading(false)
    }
  }, [setImportModalOpen])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Assinaturas Realtime
  useRealtime<Venda>('vendas', () => {
    carregarDados()
  })
  useRealtime<Alerta>('alertas', () => {
    carregarDados()
  })

  // Calcula faixas de data com base no filtro global
  const { dataInicioFiltro, dataFimFiltro, dataInicioAnterior, dataFimAnterior } = useMemo(() => {
    const agora = new Date()
    let dInicio: Date | null = null
    let dFim: Date | null = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate(),
      23,
      59,
      59,
    )

    switch (filtros.periodoPredefinido) {
      case '7d':
        dInicio = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        dInicio = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'mes':
        dInicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
        break
      case '3m':
        dInicio = new Date(agora.getFullYear(), agora.getMonth() - 3, agora.getDate())
        break
      case 'ano':
        dInicio = new Date(agora.getFullYear(), 0, 1)
        break
      case 'custom':
        if (filtros.dataInicio) dInicio = new Date(`${filtros.dataInicio}T00:00:00`)
        if (filtros.dataFim) dFim = new Date(`${filtros.dataFim}T23:59:59`)
        break
      case 'tudo':
      default:
        dInicio = null
        dFim = null
        break
    }

    // Período anterior equivalente para cálculo de variação
    let dInicioAnt: Date | null = null
    let dFimAnt: Date | null = null

    if (dInicio && dFim) {
      const duracao = dFim.getTime() - dInicio.getTime()
      dFimAnt = new Date(dInicio.getTime() - 1)
      dInicioAnt = new Date(dFimAnt.getTime() - duracao)
    }

    return {
      dataInicioFiltro: dInicio,
      dataFimFiltro: dFim,
      dataInicioAnterior: dInicioAnt,
      dataFimAnterior: dFimAnt,
    }
  }, [filtros.periodoPredefinido, filtros.dataInicio, filtros.dataFim])

  // Vendas filtradas pelo período, produto e canal
  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      const dataVenda = new Date(v.data)

      if (dataInicioFiltro && dataVenda < dataInicioFiltro) return false
      if (dataFimFiltro && dataVenda > dataFimFiltro) return false

      if (filtros.produtoId && v.produto !== filtros.produtoId) return false
      if (filtros.canal && v.canal !== filtros.canal) return false

      return true
    })
  }, [vendas, dataInicioFiltro, dataFimFiltro, filtros.produtoId, filtros.canal])

  // Vendas do período anterior para comparação de variação
  const vendasPeriodoAnterior = useMemo(() => {
    if (!dataInicioAnterior || !dataFimAnterior) return []

    return vendas.filter((v) => {
      const dataVenda = new Date(v.data)
      if (dataVenda < dataInicioAnterior || dataVenda > dataFimAnterior) return false
      if (filtros.produtoId && v.produto !== filtros.produtoId) return false
      if (filtros.canal && v.canal !== filtros.canal) return false
      return true
    })
  }, [vendas, dataInicioAnterior, dataFimAnterior, filtros.produtoId, filtros.canal])

  // Cálculo dos 3 indicadores principais
  const kpis = useMemo(() => {
    const faturamentoAtual = vendasFiltradas.reduce((acc, v) => acc + (v.valor || 0), 0)
    const qtdAtual = vendasFiltradas.length
    const ticketAtual = qtdAtual > 0 ? faturamentoAtual / qtdAtual : 0

    const faturamentoAnt = vendasPeriodoAnterior.reduce((acc, v) => acc + (v.valor || 0), 0)
    const qtdAnt = vendasPeriodoAnterior.length
    const ticketAnt = qtdAnt > 0 ? faturamentoAnt / qtdAnt : 0

    const varFaturamento =
      faturamentoAnt > 0 ? ((faturamentoAtual - faturamentoAnt) / faturamentoAnt) * 100 : 0
    const varQtd = qtdAnt > 0 ? ((qtdAtual - qtdAnt) / qtdAnt) * 100 : 0
    const varTicket = ticketAnt > 0 ? ((ticketAtual - ticketAnt) / ticketAnt) * 100 : 0

    return {
      faturamento: faturamentoAtual,
      varFaturamento,
      ticketMedio: ticketAtual,
      varTicket,
      quantidade: qtdAtual,
      varQtd,
    }
  }, [vendasFiltradas, vendasPeriodoAnterior])

  // Formatação em moeda brasileira
  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    })
  }

  // Agrupamento para o gráfico de evolução (semanal / mensal)
  const dadosGraficoEvolucao = useMemo(() => {
    const agrupado: {
      [chave: string]: { label: string; faturamento: number; quantidade: number; vendas: Venda[] }
    } = {}

    // Ordena vendas cronologicamente
    const ordenadas = [...vendasFiltradas].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    )

    ordenadas.forEach((v) => {
      const d = new Date(v.data)
      let chave = ''
      let label = ''

      if (graficoAba === 'mensal') {
        const ano = d.getFullYear()
        const mes = d.getMonth()
        chave = `${ano}-${mes < 9 ? '0' : ''}${mes + 1}`
        label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      } else {
        // Agrupamento semanal: identifica início da semana (segunda-feira)
        const diaSemana = d.getDay()
        const diff = d.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1)
        const seg = new Date(d.setDate(diff))
        chave = `${seg.getFullYear()}-W${Math.ceil((seg.getDate() + 6) / 7)}-${seg.getMonth()}`
        label = `Semana ${seg.getDate()}/${seg.getMonth() + 1}`
      }

      if (!agrupado[chave]) {
        agrupado[chave] = { label, faturamento: 0, quantidade: 0, vendas: [] }
      }

      agrupado[chave].faturamento += v.valor || 0
      agrupado[chave].quantidade += 1
      agrupado[chave].vendas.push(v)
    })

    return Object.values(agrupado)
  }, [vendasFiltradas, graficoAba])

  // Dados para distribuição por produto (barras horizontais)
  const dadosDistribuicaoProduto = useMemo(() => {
    const prodSoma: { [prodId: string]: { nome: string; valor: number; qtd: number } } = {}

    vendasFiltradas.forEach((v) => {
      const prodNome =
        v.expand?.produto?.nome || produtos.find((p) => p.id === v.produto)?.nome || 'Outros'
      if (!prodSoma[v.produto]) {
        prodSoma[v.produto] = { nome: prodNome, valor: 0, qtd: 0 }
      }
      prodSoma[v.produto].valor += v.valor || 0
      prodSoma[v.produto].qtd += 1
    })

    return Object.values(prodSoma)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 7) // Top 7 mais vendidos
  }, [vendasFiltradas, produtos])

  // Dados para distribuição por canal (gráfico de rosca)
  const dadosDistribuicaoCanal = useMemo(() => {
    const canalSoma: { [canal: string]: number } = {
      WhatsApp: 0,
      'E-mail': 0,
      Instagram: 0,
      'Loja física': 0,
    }

    let totalGeral = 0
    vendasFiltradas.forEach((v) => {
      const c = v.canal || 'Loja física'
      canalSoma[c] = (canalSoma[c] || 0) + (v.valor || 0)
      totalGeral += v.valor || 0
    })

    return Object.entries(canalSoma).map(([nome, valor]) => ({
      name: nome,
      value: valor,
      percent: totalGeral > 0 ? (valor / totalGeral) * 100 : 0,
    }))
  }, [vendasFiltradas])

  return (
    <div className="flex flex-col min-h-screen">
      {/* BARRA DE FILTROS GLOBAIS STICKY */}
      <GlobalFilters />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* BANNER INICIAL QUANDO NÃO HÁ VENDAS */}
        {vendas.length === 0 && !loading && (
          <div className="bg-[#E7EFEA] border border-[#1C4E3D]/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-bold text-[#1C4E3D] text-lg">
                Conecte sua planilha de vendas para começar a análise
              </h3>
              <p className="text-xs text-[#5B6470] max-w-xl">
                Importe seu arquivo CSV ou Excel da Gesso Bettone para visualizar o faturamento,
                ticket médio e gráficos consolidados em segundos.
              </p>
            </div>
            <Button
              onClick={() => setImportModalOpen(true)}
              className="bg-[#1C4E3D] hover:bg-[#163D30] text-white font-semibold text-xs h-10 px-4 flex items-center gap-2 flex-shrink-0"
            >
              <Upload className="w-4 h-4" />
              Importar Planilha Agora
            </Button>
          </div>
        )}

        {/* 1. SEÇÃO DE RESUMO: 3 CARDS DE INDICADOR COM VARIAÇÃO */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Faturamento (Destaque) */}
          <Card className="rounded-xl border border-[#E3E6EA] bg-white shadow-sm p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5B6470] uppercase tracking-wider">
                Faturamento Total
              </span>
              <div className="w-10 h-10 rounded-full bg-[#E7EFEA] flex items-center justify-center text-[#1C4E3D]">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-[#1C4E3D] tracking-tight font-mono">
                {formatMoeda(kpis.faturamento)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {kpis.varFaturamento >= 0 ? (
                  <span className="flex items-center font-semibold text-[#2E7D5B] bg-[#EAF6EF] px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" />+{kpis.varFaturamento.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center font-semibold text-[#C4453C] bg-[#FBEFEE] px-1.5 py-0.5 rounded">
                    <TrendingDown className="w-3.5 h-3.5 mr-1" />
                    {kpis.varFaturamento.toFixed(1)}%
                  </span>
                )}
                <span className="text-[#8A94A0]">vs. período anterior</span>
              </div>
            </div>
            <div className="absolute left-0 bottom-0 top-0 w-1.5 bg-[#1C4E3D]" />
          </Card>

          {/* Card 2: Ticket Médio */}
          <Card className="rounded-xl border border-[#E3E6EA] bg-white shadow-sm p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5B6470] uppercase tracking-wider">
                Ticket Médio
              </span>
              <div className="w-10 h-10 rounded-full bg-[#FDF3E1] flex items-center justify-center text-[#C2A24B]">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-[#22272A] tracking-tight font-mono">
                {formatMoeda(kpis.ticketMedio)}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {kpis.varTicket >= 0 ? (
                  <span className="flex items-center font-semibold text-[#2E7D5B] bg-[#EAF6EF] px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" />+{kpis.varTicket.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center font-semibold text-[#C4453C] bg-[#FBEFEE] px-1.5 py-0.5 rounded">
                    <TrendingDown className="w-3.5 h-3.5 mr-1" />
                    {kpis.varTicket.toFixed(1)}%
                  </span>
                )}
                <span className="text-[#8A94A0]">vs. período anterior</span>
              </div>
            </div>
            <div className="absolute left-0 bottom-0 top-0 w-1.5 bg-[#C2A24B]" />
          </Card>

          {/* Card 3: Quantidade de Vendas */}
          <Card className="rounded-xl border border-[#E3E6EA] bg-white shadow-sm p-5 relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5B6470] uppercase tracking-wider">
                Quantidade de Vendas
              </span>
              <div className="w-10 h-10 rounded-full bg-[#E7EFEA] flex items-center justify-center text-[#1C4E3D]">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-[#22272A] tracking-tight font-mono">
                {kpis.quantidade}{' '}
                <span className="text-xs font-normal text-[#5B6470]">pedidos</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                {kpis.varQtd >= 0 ? (
                  <span className="flex items-center font-semibold text-[#2E7D5B] bg-[#EAF6EF] px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" />+{kpis.varQtd.toFixed(1)}%
                  </span>
                ) : (
                  <span className="flex items-center font-semibold text-[#C4453C] bg-[#FBEFEE] px-1.5 py-0.5 rounded">
                    <TrendingDown className="w-3.5 h-3.5 mr-1" />
                    {kpis.varQtd.toFixed(1)}%
                  </span>
                )}
                <span className="text-[#8A94A0]">vs. período anterior</span>
              </div>
            </div>
            <div className="absolute left-0 bottom-0 top-0 w-1.5 bg-[#58788C]" />
          </Card>
        </section>

        {/* 2. GRÁFICO PRINCIPAL DE EVOLUÇÃO (SEMANAL / MENSAL) */}
        <Card className="rounded-xl border border-[#E3E6EA] bg-white shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#E3E6EA] gap-3">
            <div>
              <CardTitle className="text-base font-bold text-[#1C4E3D]">
                Evolução de Vendas
              </CardTitle>
              <p className="text-xs text-[#5B6470] mt-0.5">
                Acompanhamento temporal do faturamento (clique em um ponto para detalhes)
              </p>
            </div>
            <Tabs
              value={graficoAba}
              onValueChange={(val: any) => {
                setGraficoAba(val)
                setSelectedPonto(null)
              }}
            >
              <TabsList className="h-8 bg-[#F6F7F9] border border-[#E3E6EA]">
                <TabsTrigger value="semanal" className="text-xs h-7 px-3">
                  Semanal
                </TabsTrigger>
                <TabsTrigger value="mensal" className="text-xs h-7 px-3">
                  Mensal
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="h-[280px] sm:h-[320px] w-full">
              {dadosGraficoEvolucao.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#8A94A0]">
                  Nenhum dado encontrado para o período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dadosGraficoEvolucao}
                    onClick={(e: any) => {
                      if (e && e.activePayload && e.activePayload.length > 0) {
                        const payload = e.activePayload[0].payload
                        setSelectedPonto({
                          label: payload.label,
                          vendas: payload.vendas || [],
                        })
                      }
                    }}
                  >
                    {' '}
                    <defs>
                      <linearGradient id="corFaturamento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1C4E3D" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#1C4E3D" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      stroke="#8A94A0"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#8A94A0"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatMoeda(Number(val)), 'Faturamento']}
                      labelFormatter={(lbl) => `Período: ${lbl}`}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E3E6EA',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="faturamento"
                      stroke="#1C4E3D"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#corFaturamento)"
                      activeDot={{ r: 6, fill: '#C2A24B', stroke: '#1C4E3D', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Mini-tabela das vendas do ponto clicado */}
            {selectedPonto && (
              <div className="mt-4 p-4 border border-[#E3E6EA] rounded-xl bg-[#F6F7F9] animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#1C4E3D]" />
                    <span className="text-xs font-bold text-[#22272A]">
                      Vendas em {selectedPonto.label} ({selectedPonto.vendas.length} registros)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigate('/vendas')
                    }}
                    className="text-xs text-[#1C4E3D] hover:text-[#C2A24B] h-7 px-2"
                  >
                    Ver todas no módulo de Vendas <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {selectedPonto.vendas.slice(0, 5).map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#E3E6EA] text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[#22272A]">{v.cliente}</span>
                        <span className="text-[#5B6470]">
                          {v.expand?.produto?.nome ||
                            produtos.find((p) => p.id === v.produto)?.nome}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E7EFEA] text-[#1C4E3D]">
                          {v.canal}
                        </span>
                      </div>
                      <span className="font-bold text-[#1C4E3D] font-mono">
                        {formatMoeda(v.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. SEÇÃO DE DISTRIBUIÇÃO (PRODUTO & CANAL LADO A LADO) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Distribuição por Produto (Barras Horizontais) */}
          <Card className="rounded-xl border border-[#E3E6EA] bg-white shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E6EA]">
              <div>
                <h4 className="text-sm font-bold text-[#1C4E3D]">Produtos Mais Vendidos</h4>
                <p className="text-xs text-[#5B6470] mt-0.5">Ranking por faturamento total</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/produtos')}
                className="text-xs text-[#1C4E3D] h-7 px-2"
              >
                Ver catálogo
              </Button>
            </div>
            <div className="h-[260px] w-full pt-4">
              {dadosDistribuicaoProduto.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#8A94A0]">
                  Sem dados para exibição.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={dadosDistribuicaoProduto}
                    margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      stroke="#22272A"
                      fontSize={11}
                      width={120}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatMoeda(Number(val)), 'Total']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E3E6EA',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="valor" fill="#1C4E3D" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Distribuição por Canal de Venda (Gráfico de Rosca) */}
          <Card className="rounded-xl border border-[#E3E6EA] bg-white shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E6EA]">
              <div>
                <h4 className="text-sm font-bold text-[#1C4E3D]">Participação por Canal</h4>
                <p className="text-xs text-[#5B6470] mt-0.5">Origem das vendas e conversões</p>
              </div>
            </div>
            <div className="h-[260px] w-full pt-2">
              {vendasFiltradas.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#8A94A0]">
                  Sem dados para exibição.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosDistribuicaoCanal}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {dadosDistribuicaoCanal.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={CORES_CANAIS[entry.name as keyof typeof CORES_CANAIS] || '#1C4E3D'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [formatMoeda(Number(val)), name]}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E3E6EA',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(val, entry: any) => {
                        const item = dadosDistribuicaoCanal.find((c) => c.name === val)
                        const pct = item ? item.percent.toFixed(0) : 0
                        return (
                          <span className="text-xs text-[#22272A] ml-1">
                            {val} ({pct}%)
                          </span>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </section>

        {/* 4. SEÇÃO DE ALERTAS ATIVOS */}
        <section>
          <Card className="rounded-xl border border-[#E3E6EA] bg-white shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E6EA]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#C2A24B]" />
                <div>
                  <h4 className="text-sm font-bold text-[#1C4E3D]">Alertas do Sistema</h4>
                  <p className="text-xs text-[#5B6470]">
                    Desvios e marcos monitorados automaticamente
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/alertas')}
                className="text-xs text-[#1C4E3D] hover:text-[#C2A24B] h-8 px-2"
              >
                Gerenciar regras <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="pt-4">
              {alertas.length === 0 ? (
                <div className="p-4 rounded-lg bg-[#F6F7F9] border border-[#E3E6EA] text-xs text-[#5B6470] text-center">
                  Nenhum alerta registrado no momento. Todos os indicadores estão dentro das margens
                  normais.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alertas.slice(0, 3).map((alerta) => (
                    <div
                      key={alerta.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        alerta.tipo === 'positivo'
                          ? 'bg-[#EAF6EF] border-[#2E7D5B]/30 text-[#2E7D5B]'
                          : 'bg-[#FBEFEE] border-[#C4453C]/30 text-[#C4453C]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm leading-tight">
                            {alerta.expand?.regra?.nome || 'Alerta de Indicador'}
                          </p>
                          <p className="mt-0.5 opacity-90">{alerta.mensagem}</p>
                        </div>
                      </div>
                      <span className="text-[11px] opacity-75 whitespace-nowrap self-end sm:self-center">
                        {new Date(alerta.created).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}

export default Index
