import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { GlobalFilters } from '@/components/GlobalFilters'
import { useFilters } from '@/contexts/FilterContext'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import type { Venda, Produto, CanalVenda } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const CANAIS: CanalVenda[] = ['WhatsApp', 'E-mail', 'Instagram', 'Loja física']

export const Vendas: React.FC = () => {
  const { filtros } = useFilters()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
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

  // Formulário Nova Venda
  const [formData, setFormData] = useState({
    data: new Date().toISOString().substring(0, 10),
    cliente: '',
    produto: '',
    canal: 'WhatsApp' as CanalVenda,
    cidade: 'São Pedro',
    valor: '',
  })
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})

  const { toast } = useToast()

  const carregarDados = useCallback(async () => {
    try {
      const [vendasRes, produtosRes] = await Promise.all([
        pb.collection<Venda>('vendas').getFullList({
          sort: '-data',
          expand: 'produto',
        }),
        pb.collection<Produto>('produtos').getFullList({
          sort: 'nome',
        }),
      ])
      setVendas(vendasRes)
      setProdutos(produtosRes)
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

    const headers = ['Data', 'Cliente', 'Produto', 'Canal', 'Cidade', 'Valor (R$)']
    const rows = vendasOrdenadas.map((v) => {
      const dataFormatada = new Date(v.data).toLocaleDateString('pt-BR')
      const prodNome =
        v.expand?.produto?.nome || produtos.find((p) => p.id === v.produto)?.nome || ''
      const valorStr = v.valor ? v.valor.toFixed(2).replace('.', ',') : '0,00'
      return [
        `"${dataFormatada}"`,
        `"${v.cliente.replace(/"/g, '""')}"`,
        `"${prodNome.replace(/"/g, '""')}"`,
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

  // Máscara e parse de moeda
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      setFormData((prev) => ({ ...prev, valor: '' }))
      return
    }
    const valFloat = (parseInt(raw, 10) / 100).toFixed(2)
    const formatted = valFloat.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
    setFormData((prev) => ({ ...prev, valor: formatted }))
  }

  const validateNovaVenda = () => {
    const errs: { [key: string]: string } = {}
    if (!formData.data) errs.data = 'Data é obrigatória'
    if (!formData.cliente.trim()) errs.cliente = 'Nome do cliente é obrigatório'
    if (!formData.produto) errs.produto = 'Selecione um produto'
    if (!formData.canal) errs.canal = 'Selecione o canal de venda'
    if (!formData.valor) errs.valor = 'Informe o valor da venda'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreateVenda = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateNovaVenda()) return

    setSavingVenda(true)
    try {
      const cleanValor = parseFloat(formData.valor.replace(/\./g, '').replace(',', '.'))
      await pb.collection('vendas').create({
        data: `${formData.data} 12:00:00.000Z`,
        cliente: formData.cliente.trim(),
        produto: formData.produto,
        canal: formData.canal,
        cidade: formData.cidade.trim() || 'São Pedro',
        valor: cleanValor,
      })

      toast({
        title: 'Venda registrada!',
        description: 'A nova venda foi salva e os indicadores já foram atualizados.',
      })
      setNovaVendaOpen(false)
      setFormData({
        data: new Date().toISOString().substring(0, 10),
        cliente: '',
        produto: '',
        canal: 'WhatsApp',
        cidade: 'São Pedro',
        valor: '',
      })
      carregarDados()
    } catch (err: unknown) {
      const eObj = err as { message?: string }
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar venda',
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
      await pb.collection('vendas').delete(vendaToDelete.id)
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
              onClick={() => {
                if (produtos.length > 0 && !formData.produto) {
                  setFormData((prev) => ({ ...prev, produto: produtos[0].id }))
                }
                setNovaVendaOpen(true)
              }}
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
                    Produto
                    {sortField === 'produto' ? (
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
                  const prodNome =
                    venda.expand?.produto?.nome ||
                    produtos.find((p) => p.id === venda.produto)?.nome ||
                    'Produto'
                  const dataFormatada = new Date(venda.data).toLocaleDateString('pt-BR')

                  return (
                    <TableRow
                      key={venda.id}
                      className="hover:bg-[#F6F7F9]/80 group transition-colors"
                    >
                      <TableCell className="text-xs text-[#5B6470] py-3 font-mono">
                        {dataFormatada}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[#22272A] py-3">
                        {venda.cliente}
                      </TableCell>
                      <TableCell className="text-xs text-[#22272A] py-3">{prodNome}</TableCell>
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
                      <TableCell className="text-center py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVendaToDelete(venda)}
                          className="h-7 w-7 p-0 text-[#8A94A0] hover:text-[#C4453C] hover:bg-[#FBEFEE] opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Excluir venda"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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
              const prodNome =
                venda.expand?.produto?.nome ||
                produtos.find((p) => p.id === venda.produto)?.nome ||
                'Produto'
              const dataFormatada = new Date(venda.data).toLocaleDateString('pt-BR')

              return (
                <Card
                  key={venda.id}
                  className="rounded-xl border border-[#E3E6EA] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
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

                  <div className="mt-3 pt-3 border-t border-[#E3E6EA] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8EDF2] text-[#2C3E50]">
                        {venda.canal}
                      </span>
                      <span className="text-[#5B6470] truncate max-w-[140px]">{prodNome}</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVendaToDelete(venda)}
                      className="h-7 w-7 p-0 text-[#8A94A0] hover:text-[#C4453C]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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

      {/* MODAL NOVA VENDA */}
      <Dialog open={novaVendaOpen} onOpenChange={setNovaVendaOpen}>
        <DialogContent className="max-w-md bg-white border-[#E3E6EA] rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-[#2C3E50] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D4AF37]" />
              Lançar Nova Venda
            </DialogTitle>{' '}
            <DialogDescription className="text-xs text-[#5B6470]">
              Insira os dados da ordem de serviço ou pedido manual
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateVenda} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">Data *</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className={formErrors.data ? 'border-destructive' : ''}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#22272A]">Valor (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8A94A0]">
                    R$
                  </span>
                  <Input
                    type="text"
                    placeholder="0,00"
                    value={formData.valor}
                    onChange={handleValorChange}
                    className={`pl-8 ${formErrors.valor ? 'border-destructive' : ''}`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#22272A]">Cliente *</Label>
              <Input
                type="text"
                placeholder="Ex: Construtora Alfa ou Resid. Silva"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                className={formErrors.cliente ? 'border-destructive' : ''}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#22272A]">Produto / Serviço *</Label>
              <Select
                value={formData.produto}
                onValueChange={(val) => setFormData({ ...formData, produto: val })}
              >
                <SelectTrigger
                  className={`text-xs ${formErrors.produto ? 'border-destructive' : ''}`}
                >
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                ) : (
                  'Salvar venda'
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
