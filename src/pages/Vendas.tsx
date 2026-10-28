import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { GlobalFilters } from '@/components/GlobalFilters'
import { useFilters } from '@/contexts/FilterContext'
import { dataAdapter } from '@/lib/dataAdapter'
import { useRealtime } from '@/hooks/use-realtime'
import type { Venda, Produto, CanalVenda, ItemVenda, UnidadeMedida } from '@/types'
import {
  listarUnidadesMedida,
  calcularQuantidadePorDimensoes,
  identificarTipoFormula,
} from '@/services/unidadesMedida'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  Download,
  Plus,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  MapPin,
  Calendar,
  Layers,
  Pencil,
  Package,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const CANAIS: CanalVenda[] = ['WhatsApp', 'E-mail', 'Instagram', 'Loja física']

export const Vendas: React.FC = () => {
  const { filtros } = useFilters()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [unidadesList, setUnidadesList] = useState<UnidadeMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const itensPorPagina = 10

  // Ordenação
  const [sortField, setSortField] = useState<
    'data' | 'cliente' | 'produto' | 'canal' | 'cidade' | 'valor'
  >('data')
  const [sortAsc, setSortAsc] = useState(false) // Padrão: mais recentes primeiro

  // Modais
  const [novaVendaOpen, setNovaVendaOpen] = useState(false)
  const [savingVenda, setSavingVenda] = useState(false)
  const [vendaToDelete, setVendaToDelete] = useState<Venda | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Formulário Nova / Edição de Venda
  const [editandoVenda, setEditandoVenda] = useState<Venda | null>(null)
  const [itensLinhas, setItensLinhas] = useState<ItemVenda[]>([])
  const [formData, setFormData] = useState({
    data: new Date().toISOString().substring(0, 10),
    cliente: '',
    canal: 'WhatsApp' as CanalVenda,
    cidade: 'São Pedro',
    valorManual: '',
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  const { toast } = useToast()

  const carregarDados = useCallback(async () => {
    try {
      const [vendasRes, produtosRes, unidadesRes] = await Promise.all([
        dataAdapter.getFullList<Venda>('vendas', {
          sort: '-data',
          expand: 'produto',
        }),
        dataAdapter.getFullList<Produto>('produtos', {
          sort: 'nome',
        }),
        listarUnidadesMedida(false),
      ])
      setVendas(vendasRes)
      setProdutos(produtosRes)
      setUnidadesList(unidadesRes)
    } catch (e) {
      console.error('Erro ao carregar vendas:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Realtime
  useRealtime<Venda>('vendas', () => {
    carregarDados()
  })

  // Parse de itens de uma venda (compatibilidade com vendas antigas)
  const extrairItensVenda = useCallback(
    (v: Venda): ItemVenda[] => {
      if (v.itens) {
        if (Array.isArray(v.itens) && v.itens.length > 0) {
          return v.itens
        }
        if (typeof v.itens === 'string') {
          try {
            const parsed = JSON.parse(v.itens)
            if (Array.isArray(parsed) && parsed.length > 0) return parsed
          } catch {
            // fallback
          }
        }
      }
      // Venda legada sem itens: mapeia produto/valor legado
      const prodEncontrado = produtos.find((p) => p.id === v.produto)
      const nomeProd = v.expand?.produto?.nome || prodEncontrado?.nome || 'Serviço de Gesso'
      return [
        {
          produto_id: v.produto,
          nome: nomeProd,
          quantidade: 1,
          valor_unitario: v.valor || 0,
          total: v.valor || 0,
        },
      ]
    },
    [produtos],
  )

  // Calcula datas de filtro
  const { dataInicioFiltro, dataFimFiltro } = useMemo(() => {
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

    return { dataInicioFiltro: dInicio, dataFimFiltro: dFim }
  }, [filtros.periodoPredefinido, filtros.dataInicio, filtros.dataFim])

  // Filtragem (Filtros Globais + Busca em tempo real)
  const vendasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim()

    return vendas.filter((v) => {
      const dataVenda = new Date(v.data)
      if (dataInicioFiltro && dataVenda < dataInicioFiltro) return false
      if (dataFimFiltro && dataVenda > dataFimFiltro) return false

      if (filtros.produtoId && v.produto !== filtros.produtoId) return false
      if (filtros.canal && v.canal !== filtros.canal) return false

      if (termo) {
        const prodNome = (
          v.expand?.produto?.nome ||
          produtos.find((p) => p.id === v.produto)?.nome ||
          ''
        ).toLowerCase()
        const clienteNome = (v.cliente || '').toLowerCase()
        const cidadeNome = (v.cidade || '').toLowerCase()

        if (
          !clienteNome.includes(termo) &&
          !prodNome.includes(termo) &&
          !cidadeNome.includes(termo)
        ) {
          return false
        }
      }

      return true
    })
  }, [vendas, dataInicioFiltro, dataFimFiltro, filtros.produtoId, filtros.canal, busca, produtos])

  // Ordenação
  const vendasOrdenadas = useMemo(() => {
    return [...vendasFiltradas].sort((a, b) => {
      let valA: any
      let valB: any

      if (sortField === 'data') {
        valA = new Date(a.data).getTime()
        valB = new Date(b.data).getTime()
      } else if (sortField === 'valor') {
        valA = a.valor || 0
        valB = b.valor || 0
      } else if (sortField === 'produto') {
        valA = a.expand?.produto?.nome || produtos.find((p) => p.id === a.produto)?.nome || ''
        valB = b.expand?.produto?.nome || produtos.find((p) => p.id === b.produto)?.nome || ''
      } else {
        valA = (a[sortField] || '').toString().toLowerCase()
        valB = (b[sortField] || '').toString().toLowerCase()
      }

      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })
  }, [vendasFiltradas, sortField, sortAsc, produtos])

  // Paginação
  const totalRegistros = vendasOrdenadas.length
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina) || 1
  const indiceInicio = (pagina - 1) * itensPorPagina
  const indiceFim = Math.min(indiceInicio + itensPorPagina, totalRegistros)
  const vendasPaginadas = vendasOrdenadas.slice(indiceInicio, indiceFim)

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
    setPagina(1)
  }

  // Exportação CSV da lista filtrada
  const handleExportCSV = () => {
    if (vendasOrdenadas.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum dado',
        description: 'Não há vendas para exportar com os filtros atuais.',
      })
      return
    }

    const headers = ['Data', 'Cliente', 'Itens/Produtos', 'Canal', 'Cidade', 'Valor Total (R$)']
    const rows = vendasOrdenadas.map((v) => {
      const dataFormatada = new Date(v.data).toLocaleDateString('pt-BR')
      const itensDaVenda = extrairItensVenda(v)
      const resumoItens = itensDaVenda
        .map((it) => `${it.quantidade}x ${it.nome} (R$ ${it.total.toFixed(2)})`)
        .join(' | ')
      const valorStr = v.valor ? v.valor.toFixed(2).replace('.', ',') : '0,00'
      return [
        `"${dataFormatada}"`,
        `"${v.cliente.replace(/"/g, '""')}"`,
        `"${resumoItens.replace(/"/g, '""')}"`,
        `"${v.canal}"`,
        `"${(v.cidade || '').replace(/"/g, '""')}"`,
        `"${valorStr}"`,
      ].join(';')
    })

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `vendas_gesso_bettone_${new Date().toISOString().substring(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Exportação gerada',
      description: `${vendasOrdenadas.length} vendas foram exportadas para CSV.`,
    })
  }

  // Adiciona linha de item na venda
  const adicionarLinhaItem = () => {
    const prodPadrao = produtos[0]
    const unidPadrao = unidadesList.find((u) => u.padrao) || unidadesList[0]
    setItensLinhas((prev) => [
      ...prev,
      {
        produto_id: prodPadrao?.id || '',
        nome: prodPadrao?.nome || 'Serviço de Gesso',
        unidade_id: unidPadrao?.id,
        unidade: unidPadrao?.sigla || 'm²',
        metodo_calculo: unidPadrao?.metodo_calculo || 'AxB',
        dimensao_a: undefined,
        dimensao_b: undefined,
        quantidade: 1,
        valor_unitario: prodPadrao?.preco_base || 0,
        total: prodPadrao?.preco_base || 0,
      },
    ])
  }

  // Atualiza campo de uma linha
  const atualizarLinhaItem = (index: number, campo: keyof ItemVenda, valor: any) => {
    setItensLinhas((prev) => {
      const copy = [...prev]
      const linha = { ...copy[index] }

      if (campo === 'produto_id') {
        linha.produto_id = valor
        const achado = produtos.find((p) => p.id === valor)
        if (achado) {
          linha.nome = achado.nome
          if (!linha.valor_unitario) {
            linha.valor_unitario = achado.preco_base || 0
          }
        }
      } else if (campo === 'nome') {
        linha.nome = valor
      } else if (campo === 'unidade_id') {
        const u = unidadesList.find((x) => x.id === valor)
        linha.unidade_id = valor || undefined
        linha.unidade = u?.sigla || linha.unidade || 'm²'
        linha.metodo_calculo = u?.metodo_calculo || ''
        if (identificarTipoFormula(linha.metodo_calculo) === 'livre') {
          linha.dimensao_a = undefined
          linha.dimensao_b = undefined
        }
        const calc = calcularQuantidadePorDimensoes(
          linha.dimensao_a,
          linha.dimensao_b,
          linha.metodo_calculo,
        )
        if (calc !== null) {
          linha.quantidade = calc
        }
      } else if (campo === 'dimensao_a' || campo === 'dimensao_b') {
        const a = campo === 'dimensao_a' ? parseFloat(valor) || 0 : linha.dimensao_a || 0
        const b = campo === 'dimensao_b' ? parseFloat(valor) || 0 : linha.dimensao_b || 0
        linha.dimensao_a = a
        linha.dimensao_b = b
        const calc = calcularQuantidadePorDimensoes(a, b, linha.metodo_calculo)
        if (calc !== null) {
          linha.quantidade = calc
        }
      } else if (campo === 'quantidade') {
        const q = Math.max(0.01, parseFloat(valor) || 0)
        linha.quantidade = q
      } else if (campo === 'valor_unitario') {
        const vu = Math.max(0, parseFloat(valor) || 0)
        linha.valor_unitario = vu
      }

      linha.total = Number(((linha.quantidade || 0) * (linha.valor_unitario || 0)).toFixed(2))
      copy[index] = linha
      return copy
    })
  }

  // Remove uma linha
  const removerLinhaItem = (index: number) => {
    setItensLinhas((prev) => prev.filter((_, i) => i !== index))
  }

  // Total somado das linhas
  const totalItens = useMemo(() => {
    return itensLinhas.reduce((acc, it) => acc + (it.total || 0), 0)
  }, [itensLinhas])

  const abrirNovaVenda = () => {
    setEditandoVenda(null)
    const prodPadrao = produtos[0]
    const unidPadrao = unidadesList.find((u) => u.padrao) || unidadesList[0]
    setItensLinhas([
      {
        produto_id: prodPadrao?.id || '',
        nome: prodPadrao?.nome || 'Serviço de Gesso',
        unidade_id: unidPadrao?.id,
        unidade: unidPadrao?.sigla || 'm²',
        metodo_calculo: unidPadrao?.metodo_calculo || 'AxB',
        quantidade: 1,
        valor_unitario: prodPadrao?.preco_base || 0,
        total: prodPadrao?.preco_base || 0,
      },
    ])
    setFormData({
      data: new Date().toISOString().substring(0, 10),
      cliente: '',
      canal: 'WhatsApp',
      cidade: 'São Pedro',
      valorManual: '',
    })
    setFormErrors({})
    setNovaVendaOpen(true)
  }

  const abrirEdicaoVenda = (venda: Venda) => {
    setEditandoVenda(venda)
    const itensExistentes = extrairItensVenda(venda)
    // Complementa unidade_id se faltar mas existir sigla compatível
    const itensNormalizados = itensExistentes.map((it) => {
      if (!it.unidade_id && it.unidade) {
        const match = unidadesList.find((u) => u.sigla === it.unidade)
        if (match) {
          return {
            ...it,
            unidade_id: match.id,
            metodo_calculo: it.metodo_calculo || match.metodo_calculo,
          }
        }
      }
      return it
    })
    setItensLinhas(itensNormalizados)
    const dataIso = venda.data
      ? venda.data.substring(0, 10)
      : new Date().toISOString().substring(0, 10)
    setFormData({
      data: dataIso,
      cliente: venda.cliente || '',
      canal: venda.canal || 'WhatsApp',
      cidade: venda.cidade || 'São Pedro',
      valorManual: '',
    })
    setFormErrors({})
    setNovaVendaOpen(true)
  }

  const validateVenda = () => {
    const errs: { [key: string]: string } = {}
    if (!formData.data) errs.data = 'Data é obrigatória'
    if (!formData.cliente.trim()) errs.cliente = 'Nome do cliente é obrigatório'
    if (!formData.canal) errs.canal = 'Selecione o canal de venda'
    if (itensLinhas.length === 0) {
      errs.itens = 'Adicione ao menos um produto/item na venda'
    } else {
      const temInvalido = itensLinhas.some((it) => !it.nome || it.quantidade <= 0)
      if (temInvalido) {
        errs.itens = 'Todos os itens precisam de produto válido e quantidade > 0'
      }
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveVenda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateVenda()) return

    setSavingVenda(true)
    try {
      const valorFinal = Number(totalItens.toFixed(2))
      const produtoPrincipalId =
        itensLinhas[0]?.produto_id || (produtos.length > 0 ? produtos[0].id : '')

      const payload = {
        data: `${formData.data} 12:00:00.000Z`,
        cliente: formData.cliente.trim(),
        produto: produtoPrincipalId,
        canal: formData.canal,
        cidade: formData.cidade.trim() || 'São Pedro',
        valor: valorFinal,
        itens: itensLinhas,
      }

      if (editandoVenda) {
        await dataAdapter.update('vendas', editandoVenda.id, payload)
        toast({
          title: 'Venda atualizada!',
          description: 'As alterações na venda e itens foram salvas.',
        })
      } else {
        await dataAdapter.create('vendas', payload)
        toast({
          title: 'Venda registrada!',
          description: 'A nova venda foi salva com múltiplos itens.',
        })
      }

      setNovaVendaOpen(false)
      setEditandoVenda(null)
      carregarDados()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar venda',
        description: eObj?.message || 'Verifique as informações fornecidas.',
      })
    } finally {
      setSavingVenda(false)
    }
  }

  const handleDeleteVenda = async () => {
    if (!vendaToDelete) return
    setDeleting(true)
    try {
      await dataAdapter.delete('vendas', vendaToDelete.id)
      toast({
        title: 'Venda excluída',
        description: 'O registro foi removido com sucesso.',
      })
      setVendaToDelete(null)
      carregarDados()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: eObj?.message || 'Não foi possível excluir a venda.',
      })
    } finally {
      setDeleting(false)
    }
  }

  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <GlobalFilters />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 w-full space-y-5">
        {/* BARRA DE AÇÕES: BUSCA + EXPORTAR + NOVA VENDA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8A94A0] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por cliente, produto ou cidade..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPagina(1)
              }}
              className="pl-9 h-10 text-xs bg-white border-[#DEE4EA] focus:ring-[#2C3E50] rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-10 text-xs border-[#E3E6EA] bg-white text-[#22272A] hover:bg-[#F6F7F9] font-medium"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-[#2C3E50]" />
              Exportar CSV
            </Button>

            <Button
              size="sm"
              onClick={abrirNovaVenda}
              className="h-10 text-xs bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nova venda
            </Button>
          </div>
        </div>

        {/* TABELA DESKTOP / TABLET */}
        <div className="hidden sm:block border border-[#E3E6EA] rounded-xl bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-[#F6F7F9]">
              <TableRow>
                <TableHead
                  onClick={() => handleSort('data')}
                  className="cursor-pointer text-xs font-semibold text-[#22272A] py-3 select-none"
                >
                  <div className="flex items-center gap-1">
                    Data
                    {sortField === 'data' ? (
                      sortAsc ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#2C3E50]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#2C3E50]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                    )}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('cliente')}
                  className="cursor-pointer text-xs font-semibold text-[#22272A] py-3 select-none"
                >
                  <div className="flex items-center gap-1">
                    Cliente
                    {sortField === 'cliente' ? (
                      sortAsc ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#1C4E3D]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#1C4E3D]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                    )}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('produto')}
                  className="cursor-pointer text-xs font-semibold text-[#22272A] py-3 select-none"
                >
                  <div className="flex items-center gap-1">
                    Itens / Produtos
                    {sortField === 'produto' ? (
                      sortAsc ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#2C3E50]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#2C3E50]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                    )}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('canal')}
                  className="cursor-pointer text-xs font-semibold text-[#22272A] py-3 select-none"
                >
                  <div className="flex items-center gap-1">
                    Canal
                    {sortField === 'canal' ? (
                      sortAsc ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#1C4E3D]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#1C4E3D]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                    )}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('cidade')}
                  className="cursor-pointer text-xs font-semibold text-[#22272A] py-3 select-none"
                >
                  <div className="flex items-center gap-1">
                    Cidade
                    {sortField === 'cidade' ? (
                      sortAsc ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#1C4E3D]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#1C4E3D]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                    )}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort('valor')}
                  className="cursor-pointer text-xs font-semibold text-[#22272A] py-3 text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    Valor (R$)
                    {sortField === 'valor' ? (
                      sortAsc ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#1C4E3D]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#1C4E3D]" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#8A94A0]" />
                    )}
                  </div>
                </TableHead>

                <TableHead className="w-12 py-3 text-center"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-[#5B6470]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#2C3E50] mb-1.5" />
                    Carregando dados de vendas...
                  </TableCell>
                </TableRow>
              ) : vendasPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-[#8A94A0]">
                    Nenhuma venda encontrada para os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                vendasPaginadas.map((venda) => {
                  const itensV = extrairItensVenda(venda)
                  const dataFormatada = new Date(venda.data).toLocaleDateString('pt-BR')

                  return (
                    <TableRow
                      key={venda.id}
                      className="hover:bg-[#F6F7F9]/80 group transition-colors cursor-pointer"
                      onClick={() => abrirEdicaoVenda(venda)}
                    >
                      <TableCell className="text-xs text-[#5B6470] py-3 font-mono">
                        {dataFormatada}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[#22272A] py-3">
                        {venda.cliente}
                      </TableCell>
                      <TableCell className="text-xs text-[#22272A] py-3">
                        <div className="flex flex-col gap-0.5 max-w-[260px]">
                          {itensV.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 truncate">
                              <Badge
                                variant="outline"
                                className="border-[#DEE4EA] text-[10px] px-1 py-0 h-4 font-mono"
                              >
                                {it.quantidade}x
                              </Badge>
                              <span className="truncate text-xs text-[#2C3E50] font-medium">
                                {it.nome}
                              </span>
                            </div>
                          ))}
                          {itensV.length > 2 && (
                            <span className="text-[10px] text-[#8A94A0]">
                              +{itensV.length - 2} outro(s) item(ns)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8EDF2] text-[#2C3E50]">
                          {venda.canal}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-[#5B6470] py-3">
                        {venda.cidade || 'São Pedro'}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-[#2C3E50] text-right py-3 font-mono">
                        {formatMoeda(venda.valor)}
                      </TableCell>
                      <TableCell className="text-center py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirEdicaoVenda(venda)}
                            className="h-7 w-7 p-0 text-[#8A94A0] hover:text-[#2C3E50] hover:bg-[#DEE4EA] opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Editar venda"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVendaToDelete(venda)}
                            className="h-7 w-7 p-0 text-[#8A94A0] hover:text-[#C4453C] hover:bg-[#FBEFEE] opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir venda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* LISTA EM CARDS NO MOBILE (0 - 640px) */}
        <div className="sm:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#5B6470]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2C3E50] mb-2" />
              Carregando vendas...
            </div>
          ) : vendasPaginadas.length === 0 ? (
            <div className="p-6 bg-white border border-[#E3E6EA] rounded-xl text-center text-xs text-[#8A94A0]">
              Nenhuma venda encontrada.
            </div>
          ) : (
            vendasPaginadas.map((venda) => {
              const itensV = extrairItensVenda(venda)
              const dataFormatada = new Date(venda.data).toLocaleDateString('pt-BR')

              return (
                <Card
                  key={venda.id}
                  className="rounded-xl border border-[#E3E6EA] bg-white p-4 shadow-sm"
                >
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => abrirEdicaoVenda(venda)}
                  >
                    <div>
                      <h4 className="font-bold text-sm text-[#22272A]">{venda.cliente}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-[#5B6470] mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{dataFormatada}</span>
                      </div>
                    </div>
                    <span className="font-bold text-[#2C3E50] text-sm font-mono">
                      {formatMoeda(venda.valor)}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 text-xs space-y-1">
                    {itensV.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[#5B6470]">
                        <span>
                          {it.quantidade}x {it.nome}
                        </span>
                        <span className="font-mono text-[#2C3E50]">{formatMoeda(it.total)}</span>
                      </div>
                    ))}
                    {itensV.length > 3 && (
                      <span className="text-[10px] text-[#8A94A0]">
                        +{itensV.length - 3} outro(s) item(ns)
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#E3E6EA] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8EDF2] text-[#2C3E50]">
                        {venda.canal}
                      </span>
                      <span className="text-[#5B6470]">{venda.cidade || 'São Pedro'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEdicaoVenda(venda)}
                        className="h-7 w-7 p-0 text-[#8A94A0] hover:text-[#2C3E50]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVendaToDelete(venda)}
                        className="h-7 w-7 p-0 text-[#8A94A0] hover:text-[#C4453C]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* CONTROLES DE PAGINAÇÃO */}
        {totalRegistros > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[#5B6470]">
            <div>
              Mostrando <strong>{indiceInicio + 1}</strong>–<strong>{indiceFim}</strong> de{' '}
              <strong>{totalRegistros}</strong> registros
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                disabled={pagina === 1}
                className="h-8 px-2.5 text-xs border-[#E3E6EA]"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Anterior
              </Button>
              <span className="px-2 font-medium text-[#22272A]">
                Página {pagina} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
                disabled={pagina === totalPaginas}
                className="h-8 px-2.5 text-xs border-[#E3E6EA]"
              >
                Próxima
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL NOVA / EDITAR VENDA COM MÚLTIPLOS ITENS */}
      <Dialog open={novaVendaOpen} onOpenChange={setNovaVendaOpen}>
        <DialogContent className="max-w-3xl bg-white border-[#E3E6EA] rounded-xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-[#2C3E50] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#D4AF37]" />
              {editandoVenda ? 'Editar Venda' : 'Lançar Nova Venda com Múltiplos Itens'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Adicione produtos/serviços do catálogo, quantidades e valores por linha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVenda} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">Data *</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className={formErrors.data ? 'border-destructive' : ''}
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold text-[#22272A]">Cliente *</Label>
                <Input
                  type="text"
                  placeholder="Ex: Construtora Alfa ou Residencial Silva"
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className={formErrors.cliente ? 'border-destructive' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">Canal de Venda *</Label>
                <Select
                  value={formData.canal}
                  onValueChange={(val: any) => setFormData({ ...formData, canal: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANAIS.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">Cidade</Label>
                <Input
                  type="text"
                  placeholder="Ex: São Pedro"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
            </div>

            {/* SEÇÃO: ITENS / PRODUTOS DA VENDA */}
            <div className="space-y-2 pt-2 border-t border-[#E3E6EA]">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-[#2C3E50]">
                    Produtos e Serviços da Venda ({itensLinhas.length})
                  </Label>
                  <p className="text-[11px] text-[#5B6470]">
                    Selecione produtos cadastrados ou informe itens sob medida.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={adicionarLinhaItem}
                  className="h-8 text-xs border-[#D4AF37] text-[#2C3E50] hover:bg-[#D4AF37]/10 font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />+ Adicionar produto
                </Button>
              </div>

              {formErrors.itens && (
                <p className="text-xs text-red-600 font-semibold">{formErrors.itens}</p>
              )}

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {itensLinhas.map((item, idx) => {
                  const unidAtual = item.unidade_id
                    ? unidadesList.find((u) => u.id === item.unidade_id)
                    : unidadesList.find((u) => u.sigla === item.unidade)
                  const metodoCalculo = unidAtual?.metodo_calculo ?? item.metodo_calculo ?? ''
                  const tipoFormula = identificarTipoFormula(metodoCalculo)

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-[#f8fafc] border border-[#DEE4EA] rounded-xl grid grid-cols-12 gap-2 items-end"
                    >
                      {/* Seletor de Produto */}
                      <div className="col-span-12 sm:col-span-4 space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">Produto / Serviço *</Label>
                        <Select
                          value={item.produto_id || 'manual'}
                          onValueChange={(val) => {
                            if (val === 'manual') {
                              atualizarLinhaItem(idx, 'produto_id', '')
                            } else {
                              atualizarLinhaItem(idx, 'produto_id', val)
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Selecione o produto" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[220px]">
                            {produtos.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.nome} {p.preco_base ? `(R$ ${p.preco_base.toFixed(2)})` : ''}
                              </SelectItem>
                            ))}
                            <SelectItem
                              value="manual"
                              className="text-xs font-medium text-[#2C3E50]"
                            >
                              Outro item / Descrição livre
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {!item.produto_id && (
                          <Input
                            placeholder="Nome do produto ou serviço..."
                            value={item.nome}
                            onChange={(e) => atualizarLinhaItem(idx, 'nome', e.target.value)}
                            className="h-7 text-xs bg-white mt-1"
                          />
                        )}
                      </div>

                      {/* Unidade de Medida */}
                      <div className="col-span-6 sm:col-span-2 space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">Unidade</Label>
                        <Select
                          value={
                            item.unidade_id ||
                            unidadesList.find((u) => u.sigla === item.unidade)?.id ||
                            (unidadesList.find((u) => u.padrao) || unidadesList[0])?.id ||
                            ''
                          }
                          onValueChange={(val) => atualizarLinhaItem(idx, 'unidade_id', val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Unid." />
                          </SelectTrigger>
                          <SelectContent>
                            {unidadesList.map((u) => (
                              <SelectItem key={u.id} value={u.id} className="text-xs">
                                {u.sigla} {u.metodo_calculo ? `(${u.metodo_calculo})` : ''} -{' '}
                                {u.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dimensões A e B quando método não for livre */}
                      {tipoFormula !== 'livre' ? (
                        <>
                          <div className="col-span-3 sm:col-span-1 space-y-1">
                            <Label className="text-[10px] text-[#616F7D]" title="Largura / Lado A">
                              A (m)
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="A"
                              value={item.dimensao_a ?? ''}
                              onChange={(e) =>
                                atualizarLinhaItem(idx, 'dimensao_a', e.target.value)
                              }
                              className="h-8 text-xs bg-white text-center px-1"
                            />
                          </div>
                          <div className="col-span-3 sm:col-span-1 space-y-1">
                            <Label className="text-[10px] text-[#616F7D]" title="Altura / Lado B">
                              B (m)
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              placeholder="B"
                              value={item.dimensao_b ?? ''}
                              onChange={(e) =>
                                atualizarLinhaItem(idx, 'dimensao_b', e.target.value)
                              }
                              className="h-8 text-xs bg-white text-center px-1"
                            />
                          </div>
                        </>
                      ) : null}

                      {/* Quantidade */}
                      <div
                        className={
                          tipoFormula !== 'livre'
                            ? 'col-span-4 sm:col-span-1 space-y-1'
                            : 'col-span-6 sm:col-span-2 space-y-1'
                        }
                      >
                        <Label className="text-[11px] text-[#616F7D]">
                          Qtd ({item.unidade || 'm²'})
                        </Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantidade}
                          onChange={(e) => atualizarLinhaItem(idx, 'quantidade', e.target.value)}
                          className="h-8 text-xs bg-white text-center font-mono font-semibold"
                        />
                      </div>

                      {/* Valor Unitário */}
                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">Unitário (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valor_unitario}
                          onChange={(e) =>
                            atualizarLinhaItem(idx, 'valor_unitario', e.target.value)
                          }
                          className="h-8 text-xs bg-white text-right font-mono"
                        />
                      </div>

                      {/* Total da Linha */}
                      <div className="col-span-3 sm:col-span-1 space-y-1 text-right">
                        <Label className="text-[11px] text-[#616F7D]">Total</Label>
                        <div className="h-8 flex items-center justify-end font-bold text-xs font-mono text-[#2C3E50]">
                          {formatMoeda(item.total)}
                        </div>
                      </div>

                      {/* Remover */}
                      <div className="col-span-1 sm:col-span-1 flex items-end justify-center pb-0.5">
                        <button
                          type="button"
                          onClick={() => removerLinhaItem(idx)}
                          disabled={itensLinhas.length <= 1}
                          className="p-1.5 text-[#8A94A0] hover:text-[#C4453C] hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                          title="Remover linha"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totalizador da Venda */}
              <div className="flex items-center justify-between p-3 bg-[#2C3E50]/5 rounded-xl border border-[#2C3E50]/15">
                <span className="text-xs font-bold text-[#2C3E50] uppercase tracking-wide">
                  Total Geral da Venda:
                </span>
                <span className="font-heading text-lg font-bold text-[#2C3E50] font-mono">
                  {formatMoeda(totalItens)}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#E3E6EA]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNovaVendaOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingVenda}
                className="bg-[#2C3E50] hover:bg-[#1B2631] text-white text-xs font-semibold"
              >
                {savingVenda ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : editandoVenda ? (
                  'Salvar alterações'
                ) : (
                  'Registrar venda'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(vendaToDelete)}
        onOpenChange={(val) => !val && setVendaToDelete(null)}
      >
        <AlertDialogContent className="bg-white border-[#E3E6EA] rounded-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-[#22272A]">
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#5B6470]">
              Tem certeza que deseja excluir permanentemente o registro de venda de{' '}
              <strong>{vendaToDelete?.cliente}</strong> no valor de{' '}
              <strong>{vendaToDelete ? formatMoeda(vendaToDelete.valor) : ''}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVenda}
              disabled={deleting}
              className="bg-[#C4453C] hover:bg-[#A83B33] text-white text-xs font-semibold"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Vendas
