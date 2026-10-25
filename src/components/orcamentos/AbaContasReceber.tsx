import React, { useState, useEffect, useMemo } from 'react'
import type { PagamentoParcela, StatusParcela } from '@/types'
import {
  listarParcelasPagamento,
  darBaixaParcela,
  estornarBaixaParcela,
  excluirParcela,
} from '@/services/orcamentoModulo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Search,
  RotateCw,
  DollarSign,
  Calendar,
  CreditCard,
  Building,
  TrendingUp,
  Trash2,
} from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

interface AbaContasReceberProps {
  onAtualizarOrcamentos?: () => void
}

export const AbaContasReceber: React.FC<AbaContasReceberProps> = ({ onAtualizarOrcamentos }) => {
  const { toast } = useToast()
  const [parcelas, setParcelas] = useState<PagamentoParcela[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<string>('todos')
  const [periodoFiltro, setPeriodoFiltro] = useState<'todos' | '7d' | '30d' | 'atrasadas' | 'mes'>(
    'todos',
  )

  // Modal de Baixa
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<PagamentoParcela | null>(null)
  const [valorPago, setValorPago] = useState<string>('0')
  const [ajuste, setAjuste] = useState<string>('0')
  const [dataPagamento, setDataPagamento] = useState<string>('')
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX')
  const [observacoesBaixa, setObservacoesBaixa] = useState<string>('')
  const [salvandoBaixa, setSalvandoBaixa] = useState(false)

  // Modal de Exclusão Manual de Parcela
  const [parcelaParaExcluir, setParcelaParaExcluir] = useState<PagamentoParcela | null>(null)
  const [excluindoParcela, setExcluindoParcela] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await listarParcelasPagamento()
      setParcelas(data)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar contas a receber',
        description: e?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const abrirModalBaixa = (p: PagamentoParcela) => {
    setParcelaSelecionada(p)
    setValorPago(p.valor_previsto.toString())
    setAjuste('0')
    setDataPagamento(new Date().toISOString().substring(0, 10))
    setFormaPagamento('PIX')
    setObservacoesBaixa('')
    setModalBaixaOpen(true)
  }

  const handleConfirmarBaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parcelaSelecionada) return

    const valNum = parseFloat(valorPago.replace(',', '.')) || parcelaSelecionada.valor_previsto
    const ajNum = parseFloat(ajuste.replace(',', '.')) || 0

    setSalvandoBaixa(true)
    try {
      await darBaixaParcela(parcelaSelecionada.id, {
        valor_pago: valNum,
        ajuste: ajNum,
        data_pagamento: dataPagamento,
        forma_pagamento: formaPagamento,
        observacoes_baixa: observacoesBaixa.trim(),
      })
      toast({
        title: 'Baixa registrada com sucesso!',
        description: `Parcela ${parcelaSelecionada.numero_parcela}/${parcelaSelecionada.total_parcelas} marcada como paga e conciliada.`,
      })
      setModalBaixaOpen(false)
      carregar()
      if (onAtualizarOrcamentos) onAtualizarOrcamentos()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao dar baixa',
        description: err?.message,
      })
    } finally {
      setSalvandoBaixa(false)
    }
  }

  const handleEstornar = async (p: PagamentoParcela) => {
    try {
      await estornarBaixaParcela(p.id)
      toast({
        title: 'Baixa estornada!',
        description: 'A parcela voltou ao status "A pagar".',
      })
      carregar()
      if (onAtualizarOrcamentos) onAtualizarOrcamentos()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao estornar baixa',
        description: err?.message,
      })
    }
  }

  const handleConfirmarExclusao = async () => {
    if (!parcelaParaExcluir) return
    setExcluindoParcela(true)
    try {
      await excluirParcela(parcelaParaExcluir.id)
      toast({
        title: 'Parcela removida com sucesso!',
        description: `Linha de conciliação do orçamento ${parcelaParaExcluir.expand?.orcamento?.numero || ''} foi excluída.`,
      })
      setParcelaParaExcluir(null)
      carregar()
      if (onAtualizarOrcamentos) onAtualizarOrcamentos()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover parcela',
        description: err?.message,
      })
    } finally {
      setExcluindoParcela(false)
    }
  }

  const hoje = new Date()
  const hojeStr = hoje.toISOString().substring(0, 10)
  const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10)
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  // Métricas do painel A Receber
  const metricas = useMemo(() => {
    let prox7 = 0
    let prox30 = 0
    let atrasadas = 0
    let recebidoMes = 0

    parcelas.forEach((p) => {
      const venc = p.data_vencimento ? p.data_vencimento.substring(0, 10) : ''
      const pgto = p.data_pagamento ? p.data_pagamento.substring(0, 7) : ''

      if (p.status === 'paga') {
        if (pgto === mesAtual) {
          recebidoMes += p.valor_pago || p.valor_previsto
        }
      } else if (p.status === 'a_pagar') {
        if (venc < hojeStr) {
          atrasadas += p.valor_previsto
        } else {
          if (venc <= em7Dias) prox7 += p.valor_previsto
          if (venc <= em30Dias) prox30 += p.valor_previsto
        }
      }
    })

    return { prox7, prox30, atrasadas, recebidoMes }
  }, [parcelas, hojeStr, em7Dias, em30Dias, mesAtual])

  // Filtros
  const filtradas = useMemo(() => {
    return parcelas.filter((p) => {
      if (statusFiltro !== 'todos' && p.status !== statusFiltro) return false

      const venc = p.data_vencimento ? p.data_vencimento.substring(0, 10) : ''
      if (
        periodoFiltro === '7d' &&
        !(p.status === 'a_pagar' && venc >= hojeStr && venc <= em7Dias)
      ) {
        return false
      }
      if (
        periodoFiltro === '30d' &&
        !(p.status === 'a_pagar' && venc >= hojeStr && venc <= em30Dias)
      ) {
        return false
      }
      if (periodoFiltro === 'atrasadas' && !(p.status === 'a_pagar' && venc < hojeStr)) {
        return false
      }
      if (
        periodoFiltro === 'mes' &&
        !(p.data_vencimento?.startsWith(mesAtual) || p.data_pagamento?.startsWith(mesAtual))
      ) {
        return false
      }

      if (busca) {
        const t = busca.toLowerCase()
        const cli = (p.expand?.orcamento?.cliente || '').toLowerCase()
        const num = (p.expand?.orcamento?.numero || '').toLowerCase()
        const desc = (p.descricao || '').toLowerCase()
        return cli.includes(t) || num.includes(t) || desc.includes(t)
      }

      return true
    })
  }, [parcelas, statusFiltro, periodoFiltro, busca, hojeStr, em7Dias, em30Dias, mesAtual])

  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatData = (d?: string) => {
    if (!d) return '-'
    const dateObj = new Date(d)
    return isNaN(dateObj.getTime())
      ? d
      : dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* 4 CARDS DO PAINEL "A RECEBER" */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-[#616F7D]">A Receber em 7 dias</span>
            <p className="text-base sm:text-lg font-bold text-[#2C3E50]">
              {formatMoeda(metricas.prox7)}
            </p>
            <span className="text-[10px] text-[#8A94A0] block">Entradas imediatas</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-[#616F7D]">A Receber em 30 dias</span>
            <p className="text-base sm:text-lg font-bold text-[#2C3E50]">
              {formatMoeda(metricas.prox30)}
            </p>
            <span className="text-[10px] text-[#8A94A0] block">Próximo mês</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#E8EDF2] text-[#2C3E50] flex items-center justify-center font-bold">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-[#616F7D]">Vencidas em Atraso</span>
            <p className="text-base sm:text-lg font-bold text-red-600">
              {formatMoeda(metricas.atrasadas)}
            </p>
            <span className="text-[10px] text-red-500 block">Cobrança necessária</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-[#616F7D]">Recebido no Mês</span>
            <p className="text-base sm:text-lg font-bold text-emerald-700">
              {formatMoeda(metricas.recebidoMes)}
            </p>
            <span className="text-[10px] text-emerald-600 block">Conciliado no caixa</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS & AÇÕES */}
      <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8A94A0] absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por cliente, número do orçamento ou parcela..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 text-xs bg-white"
            />
          </div>

          <div className="w-full sm:w-40">
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os Status
                </SelectItem>
                <SelectItem value="a_pagar" className="text-xs">
                  A Pagar
                </SelectItem>
                <SelectItem value="paga" className="text-xs">
                  Pagas (Conciliadas)
                </SelectItem>
                <SelectItem value="cancelada" className="text-xs">
                  Canceladas
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-44">
            <Select value={periodoFiltro} onValueChange={(v: any) => setPeriodoFiltro(v)}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todo o Período
                </SelectItem>
                <SelectItem value="7d" className="text-xs">
                  Próximos 7 dias
                </SelectItem>
                <SelectItem value="30d" className="text-xs">
                  Próximos 30 dias
                </SelectItem>
                <SelectItem value="atrasadas" className="text-xs">
                  Vencidas em Atraso
                </SelectItem>
                <SelectItem value="mes" className="text-xs">
                  Deste Mês
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={carregar}
          className="h-9 text-xs border-[#DEE4EA] text-[#616F7D]"
        >
          <RotateCw className="w-3.5 h-3.5 mr-1" />
          Atualizar Pagamentos
        </Button>
      </div>

      {/* TABELA DE PARCELAS / CONTAS A RECEBER */}
      <div className="bg-white rounded-xl border border-[#DEE4EA] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#616F7D]">
            Carregando agenda de pagamentos...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#616F7D]">
            Nenhuma parcela de pagamento encontrada com estes filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f4f4f4] text-[#616F7D] font-semibold uppercase text-[10px] tracking-wider border-b border-[#DEE4EA]">
                <tr>
                  <th className="py-3 px-4">Orçamento / Obra</th>
                  <th className="py-3 px-4">Parcela</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor Previsto</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data Pagto / Baixa</th>
                  <th className="py-3 px-4">Valor Recebido</th>
                  <th className="py-3 px-4 text-right">Ação / Conciliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEE4EA]">
                {filtradas.map((p) => {
                  const venc = p.data_vencimento ? p.data_vencimento.substring(0, 10) : ''
                  const emAtraso = p.status === 'a_pagar' && venc < hojeStr

                  return (
                    <tr key={p.id} className="hover:bg-[#f9f9f9] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#2C3E50]">
                          {p.expand?.orcamento?.numero || 'Sem vínculo'}
                        </div>
                        <div className="text-[11px] text-[#616F7D]">
                          {p.expand?.orcamento?.cliente}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#2C3E50]">
                          {p.numero_parcela}/{p.total_parcelas}
                        </span>
                        <span className="text-[11px] text-[#8A94A0] block">{p.descricao}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${emAtraso ? 'text-red-600' : 'text-[#2C3E50]'}`}
                        >
                          {formatData(p.data_vencimento)}
                        </span>
                        {emAtraso && (
                          <span className="text-[10px] text-red-500 font-bold block">
                            Em atraso
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-[#2C3E50]">
                        {formatMoeda(p.valor_previsto)}
                      </td>

                      <td className="py-3 px-4">
                        {p.status === 'paga' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Paga
                          </Badge>
                        ) : p.status === 'a_pagar' ? (
                          <Badge
                            variant="outline"
                            className={
                              emAtraso
                                ? 'bg-red-50 text-red-700 border-red-200 text-[10px]'
                                : 'bg-amber-50 text-amber-800 border-amber-200 text-[10px]'
                            }
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            A Pagar
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Cancelada
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[#616F7D]">
                        {p.data_pagamento ? (
                          <div>
                            <span className="font-semibold text-[#2C3E50]">
                              {formatData(p.data_pagamento)}
                            </span>
                            <span className="text-[10px] text-[#8A94A0] block">
                              Via {p.forma_pagamento || 'PIX'}
                            </span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-[#2C3E50]">
                        {p.valor_pago ? (
                          <div>
                            <span>{formatMoeda(p.valor_pago)}</span>
                            {Boolean(p.ajuste) && (
                              <span className="text-[10px] text-[#8A94A0] block font-normal">
                                Ajuste: {formatMoeda(p.ajuste || 0)}
                              </span>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'a_pagar' ? (
                            <Button
                              size="sm"
                              onClick={() => abrirModalBaixa(p)}
                              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-7 px-3 shadow-xs"
                            >
                              Dar baixa
                            </Button>
                          ) : p.status === 'paga' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEstornar(p)}
                              className="text-xs h-7 border-[#DEE4EA] text-[#616F7D] hover:text-[#C4453C]"
                              title="Estornar baixa bancária"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Estornar
                            </Button>
                          ) : null}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setParcelaParaExcluir(p)}
                            className="text-xs h-7 w-7 p-0 text-[#8A94A0] hover:text-red-600 hover:bg-red-50"
                            title="Remover linha de conciliação / parcela"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE BAIXA / CONCILIAÇÃO BANCÁRIA */}
      <Dialog open={modalBaixaOpen} onOpenChange={setModalBaixaOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="p-5 border-b border-[#DEE4EA] bg-white">
            <DialogTitle className="font-heading text-[#2C3E50]">
              Dar Baixa na Parcela {parcelaSelecionada?.numero_parcela}/
              {parcelaSelecionada?.total_parcelas}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmarBaixa} className="p-5 space-y-4 bg-[#f4f4f4]">
            <div className="bg-white p-3 rounded-lg border border-[#DEE4EA] text-xs space-y-1">
              <div className="text-[#616F7D]">
                Orçamento:{' '}
                <strong className="text-[#2C3E50]">
                  {parcelaSelecionada?.expand?.orcamento?.numero}
                </strong>
              </div>
              <div className="text-[#616F7D]">
                Cliente:{' '}
                <strong className="text-[#2C3E50]">
                  {parcelaSelecionada?.expand?.orcamento?.cliente}
                </strong>
              </div>
              <div className="text-[#616F7D]">
                Valor Previsto:{' '}
                <strong className="text-[#2C3E50]">
                  {formatMoeda(parcelaSelecionada?.valor_previsto || 0)}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Valor Efetivamente Recebido (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                  className="h-9 text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Acréscimo (+) ou Desconto (-)
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={ajuste}
                  onChange={(e) => setAjuste(e.target.value)}
                  placeholder="0.00"
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Data do Pagamento Real <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="h-9 text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Forma de Pagamento <span className="text-red-500">*</span>
                </Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Forma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX" className="text-xs">
                      PIX
                    </SelectItem>
                    <SelectItem value="Dinheiro" className="text-xs">
                      Dinheiro
                    </SelectItem>
                    <SelectItem value="Transferência TED/DOC" className="text-xs">
                      Transferência Bancária
                    </SelectItem>
                    <SelectItem value="Cartão de Crédito" className="text-xs">
                      Cartão de Crédito
                    </SelectItem>
                    <SelectItem value="Cartão de Débito" className="text-xs">
                      Cartão de Débito
                    </SelectItem>
                    <SelectItem value="Boleto" className="text-xs">
                      Boleto
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#2C3E50]">
                Observações da Conciliação
              </Label>
              <Textarea
                rows={2}
                value={observacoesBaixa}
                onChange={(e) => setObservacoesBaixa(e.target.value)}
                placeholder="Ex: Identificado no extrato Itaú / Banco do Brasil..."
                className="text-xs bg-white resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalBaixaOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoBaixa}
                size="sm"
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs"
              >
                {salvandoBaixa ? 'Registrando...' : 'Confirmar Baixa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO MANUAL */}
      <AlertDialog
        open={Boolean(parcelaParaExcluir)}
        onOpenChange={(open) => !open && setParcelaParaExcluir(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#2C3E50]">
              Remover linha de conciliação de pagamentos?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#616F7D] space-y-2">
              <p>
                Você está prestes a remover permanentemente a parcela{' '}
                <strong>
                  {parcelaParaExcluir?.numero_parcela}/{parcelaParaExcluir?.total_parcelas}
                </strong>{' '}
                no valor de <strong>{formatMoeda(parcelaParaExcluir?.valor_previsto || 0)}</strong>{' '}
                referente ao orçamento{' '}
                <strong>
                  {parcelaParaExcluir?.expand?.orcamento?.numero || 'Sem identificador'}
                </strong>{' '}
                ({parcelaParaExcluir?.expand?.orcamento?.cliente || 'Sem cliente'}).
              </p>
              <p className="text-red-600 font-semibold">
                Essa ação é ideal para limpar linhas duplicadas e não pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindoParcela} className="text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmarExclusao()
              }}
              disabled={excluindoParcela}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              {excluindoParcela ? 'Removendo...' : 'Sim, remover linha'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
