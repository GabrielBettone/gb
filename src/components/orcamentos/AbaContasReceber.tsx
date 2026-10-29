import React, { useState, useEffect, useMemo } from 'react'
import type { PagamentoParcela, ParcelaRecebimento, Orcamento } from '@/types'
import {
  listarParcelasPagamento,
  registrarRecebimentoParcela,
  estornarBaixaParcela,
  excluirRecebimento,
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
  Calendar,
  TrendingUp,
  Trash2,
  SlidersHorizontal,
  History,
  PlusCircle,
  HelpCircle,
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
import { ModalReajusteParcelas } from './ModalReajusteParcelas'
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

  // Modal de Registro de Pagamento (Baixa Parcial ou Integral)
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false)
  const [parcelaSelecionada, setParcelaSelecionada] = useState<PagamentoParcela | null>(null)
  const [valorPago, setValorPago] = useState<string>('0')
  const [dataPagamento, setDataPagamento] = useState<string>('')
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX')
  const [observacoesBaixa, setObservacoesBaixa] = useState<string>('')
  const [salvandoBaixa, setSalvandoBaixa] = useState(false)

  // Modal de Histórico de Recebimentos
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false)
  const [parcelaHistorico, setParcelaHistorico] = useState<PagamentoParcela | null>(null)
  const [estornandoId, setEstornandoId] = useState<string | null>(null)

  // Modal de Reajuste de Parcelamento
  const [modalReajusteOpen, setModalReajusteOpen] = useState(false)
  const [orcamentoParaReajuste, setOrcamentoParaReajuste] = useState<Orcamento | null>(null)

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

  const formatMoeda = (val: number) => {
    return (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatData = (d?: string) => {
    if (!d) return '-'
    const str = String(d).trim()
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, ano, mes, dia] = match
      return `${dia}/${mes}/${ano}`
    }
    const dateObj = new Date(str)
    return isNaN(dateObj.getTime())
      ? str
      : dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Abre modal de registro de pagamento já calculando o saldo faltante
  const abrirModalBaixa = (p: PagamentoParcela) => {
    const jaPago = Number(p.valor_pago) || 0
    const saldoRestante = Math.max(
      0,
      Math.round(((Number(p.valor_previsto) || 0) - jaPago) * 100) / 100,
    )

    setParcelaSelecionada(p)
    setValorPago(saldoRestante.toString())
    setDataPagamento(new Date().toISOString().substring(0, 10))
    setFormaPagamento('PIX')
    setObservacoesBaixa('')
    setModalBaixaOpen(true)
  }

  const handleConfirmarBaixa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parcelaSelecionada) return

    const valNum = parseFloat(valorPago.replace(',', '.'))
    if (isNaN(valNum) || valNum <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Informe um valor maior que zero para o pagamento.',
      })
      return
    }

    setSalvandoBaixa(true)
    try {
      const result = await registrarRecebimentoParcela(parcelaSelecionada.id, {
        valor: valNum,
        data_pagamento: dataPagamento,
        forma_pagamento: formaPagamento,
        observacao: observacoesBaixa.trim(),
        orcamentoId: parcelaSelecionada.orcamento || parcelaSelecionada.orcamento_id,
      })

      const statusTexto = result.parcela.status === 'paga' ? 'quitada (Paga)' : 'parcialmente paga'
      toast({
        title: 'Recebimento registrado!',
        description: `Parcela ${parcelaSelecionada.numero_parcela}/${parcelaSelecionada.total_parcelas} atualizada como ${statusTexto}.`,
      })
      setModalBaixaOpen(false)
      carregar()
      if (onAtualizarOrcamentos) onAtualizarOrcamentos()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar recebimento',
        description: err?.message,
      })
    } finally {
      setSalvandoBaixa(false)
    }
  }

  // Estorno geral da parcela
  const handleEstornarGeral = async (p: PagamentoParcela) => {
    try {
      await estornarBaixaParcela(p.id, false)
      toast({
        title: 'Baixa estornada!',
        description:
          'Todos os pagamentos foram estornados. A parcela retornou ao status "A pagar".',
      })
      carregar()
      if (onAtualizarOrcamentos) onAtualizarOrcamentos()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao estornar',
        description: err?.message,
      })
    }
  }

  // Estorno de recebimento específico pelo histórico
  const handleEstornarRecebimentoItem = async (rec: ParcelaRecebimento, parcelaId: string) => {
    setEstornandoId(rec.id)
    try {
      const atualizada = await excluirRecebimento(rec.id, parcelaId)
      toast({
        title: 'Recebimento estornado!',
        description: `Recebimento de ${formatMoeda(rec.valor)} cancelado com sucesso.`,
      })
      setParcelaHistorico(atualizada)
      carregar()
      if (onAtualizarOrcamentos) onAtualizarOrcamentos()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao estornar recebimento',
        description: err?.message,
      })
    } finally {
      setEstornandoId(null)
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

  const abrirReajusteDoOrcamento = (p: PagamentoParcela) => {
    if (p.expand?.orcamento) {
      setOrcamentoParaReajuste(p.expand.orcamento)
      setModalReajusteOpen(true)
    } else {
      toast({
        variant: 'destructive',
        title: 'Orçamento não encontrado',
        description: 'Não foi possível vincular o orçamento desta parcela.',
      })
    }
  }

  const abrirHistorico = (p: PagamentoParcela) => {
    setParcelaHistorico(p)
    setModalHistoricoOpen(true)
  }

  const hoje = new Date()
  const hojeStr = hoje.toISOString().substring(0, 10)
  const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10)
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  // Métricas do painel A Receber (separa efetivamente recebido do que falta)
  const metricas = useMemo(() => {
    let prox7 = 0
    let prox30 = 0
    let atrasadas = 0
    let recebidoMes = 0
    let totalEfetivamenteRecebido = 0
    let totalPendente = 0

    parcelas.forEach((p) => {
      const venc = p.data_vencimento ? p.data_vencimento.substring(0, 10) : ''
      const previsto = Number(p.valor_previsto) || 0
      const pago = Number(p.valor_pago) || 0
      const saldoRestante = Math.max(0, previsto - pago)

      totalEfetivamenteRecebido += pago

      if (p.status !== 'cancelada') {
        totalPendente += saldoRestante
      }

      // Recebido no mês corrente
      if (p.recebimentos && p.recebimentos.length > 0) {
        p.recebimentos.forEach((r) => {
          if (r.data_pagamento?.substring(0, 7) === mesAtual) {
            recebidoMes += Number(r.valor) || 0
          }
        })
      } else if (p.status === 'paga' && p.data_pagamento?.substring(0, 7) === mesAtual) {
        recebidoMes += pago || previsto
      }

      // Saldos a vencer ou atrasados
      if (p.status === 'a_pagar' || p.status === 'parcial') {
        if (saldoRestante > 0) {
          if (venc < hojeStr) {
            atrasadas += saldoRestante
          } else {
            if (venc <= em7Dias) prox7 += saldoRestante
            if (venc <= em30Dias) prox30 += saldoRestante
          }
        }
      }
    })

    return { prox7, prox30, atrasadas, recebidoMes, totalEfetivamenteRecebido, totalPendente }
  }, [parcelas, hojeStr, em7Dias, em30Dias, mesAtual])

  // Filtros
  const filtradas = useMemo(() => {
    return parcelas.filter((p) => {
      if (statusFiltro !== 'todos') {
        if (statusFiltro === 'parcial' && p.status !== 'parcial') return false
        if (statusFiltro === 'a_pagar' && p.status !== 'a_pagar') return false
        if (statusFiltro === 'paga' && p.status !== 'paga') return false
        if (statusFiltro === 'cancelada' && p.status !== 'cancelada') return false
      }

      const venc = p.data_vencimento ? p.data_vencimento.substring(0, 10) : ''
      const isAbertoOuParcial = p.status === 'a_pagar' || p.status === 'parcial'

      if (periodoFiltro === '7d' && !(isAbertoOuParcial && venc >= hojeStr && venc <= em7Dias)) {
        return false
      }
      if (periodoFiltro === '30d' && !(isAbertoOuParcial && venc >= hojeStr && venc <= em30Dias)) {
        return false
      }
      if (periodoFiltro === 'atrasadas' && !(isAbertoOuParcial && venc < hojeStr)) {
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

  return (
    <div className="space-y-6">
      {/* CARDS DO PAINEL "A RECEBER" COM RECEBIDO VS PENDENTE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
            <span className="text-[10px] text-emerald-600 block">
              Total recebido: {formatMoeda(metricas.totalEfetivamenteRecebido)}
            </span>
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

          <div className="w-full sm:w-44">
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os Status
                </SelectItem>
                <SelectItem value="a_pagar" className="text-xs">
                  A Pagar (Pendente)
                </SelectItem>
                <SelectItem value="parcial" className="text-xs">
                  Parcial (Com saldo)
                </SelectItem>
                <SelectItem value="paga" className="text-xs">
                  Pagas (Quitadas)
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
                  <th className="py-3 px-4">Valor Recebido</th>
                  <th className="py-3 px-4">Falta Receber</th>
                  <th className="py-3 px-4 text-right">Ação / Conciliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DEE4EA]">
                {filtradas.map((p) => {
                  const venc = p.data_vencimento ? p.data_vencimento.substring(0, 10) : ''
                  const emAtraso =
                    (p.status === 'a_pagar' || p.status === 'parcial') && venc < hojeStr
                  const previsto = Number(p.valor_previsto) || 0
                  const pago = Number(p.valor_pago) || 0
                  const falta = Math.max(0, previsto - pago)
                  const qtdRecs = p.recebimentos?.length || (pago > 0 ? 1 : 0)

                  return (
                    <tr key={p.id} className="hover:bg-[#f9f9f9] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-[#2C3E50]">
                              {p.expand?.orcamento?.numero || 'Sem vínculo'}
                            </div>
                            <div className="text-[11px] text-[#616F7D]">
                              {p.expand?.orcamento?.cliente}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#2C3E50]">
                            {p.numero_parcela}/{p.total_parcelas}
                          </span>
                          {p.expand?.orcamento && (
                            <button
                              type="button"
                              onClick={() => abrirReajusteDoOrcamento(p)}
                              title="Reajustar parcelas e vencimentos deste orçamento"
                              className="text-[#8A94A0] hover:text-[#2C3E50] p-0.5 rounded transition-colors"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                            </button>
                          )}
                        </div>
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
                        {formatMoeda(previsto)}
                      </td>

                      <td className="py-3 px-4">
                        {p.status === 'paga' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Paga
                          </Badge>
                        ) : p.status === 'parcial' ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-100 text-[10px]">
                            <Clock className="w-3 h-3 mr-1" />
                            Parcial {p.numero_parcela}/{p.total_parcelas}
                          </Badge>
                        ) : p.status === 'a_pagar' ? (
                          <Badge
                            variant="outline"
                            className={
                              emAtraso
                                ? 'bg-red-50 text-red-700 border-red-200 text-[10px]'
                                : 'bg-slate-50 text-slate-700 border-slate-200 text-[10px]'
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

                      <td className="py-3 px-4">
                        {pago > 0 ? (
                          <div>
                            <div className="font-bold text-emerald-700 flex items-center gap-1">
                              <span>{formatMoeda(pago)}</span>
                              {qtdRecs > 0 && (
                                <button
                                  type="button"
                                  onClick={() => abrirHistorico(p)}
                                  className="text-[10px] text-blue-600 hover:underline flex items-center"
                                  title="Ver histórico de recebimentos desta parcela"
                                >
                                  <History className="w-3 h-3 ml-0.5" />
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-[#8A94A0] block">
                              {p.status === 'parcial'
                                ? `Recebido ${formatMoeda(pago)} de ${formatMoeda(previsto)}`
                                : `Quitada em ${formatData(p.data_pagamento)}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#8A94A0]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold">
                        {falta > 0.05 ? (
                          <span className="text-amber-700">{formatMoeda(falta)}</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">R$ 0,00</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status !== 'paga' && p.status !== 'cancelada' && (
                            <Button
                              size="sm"
                              onClick={() => abrirModalBaixa(p)}
                              className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-7 px-2.5 shadow-xs"
                              title="Registrar recebimento total ou parcial"
                            >
                              <PlusCircle className="w-3 h-3 mr-1" />
                              Registrar pagamento
                            </Button>
                          )}

                          {p.recebimentos && p.recebimentos.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirHistorico(p)}
                              className="text-xs h-7 px-2 border-[#DEE4EA] text-[#2C3E50] hover:bg-[#E8EDF2]"
                              title="Histórico de recebimentos parciais"
                            >
                              <History className="w-3 h-3 mr-1" />
                              Histórico ({p.recebimentos.length})
                            </Button>
                          )}

                          {(p.status === 'paga' || p.status === 'parcial') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEstornarGeral(p)}
                              className="text-xs h-7 border-[#DEE4EA] text-[#616F7D] hover:text-[#C4453C]"
                              title="Estornar todos os pagamentos da parcela"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Estornar
                            </Button>
                          )}

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

      {/* MODAL DE BAIXA / REGISTRO DE RECEBIMENTO (PARCIAL OU INTEGRAL) */}
      <Dialog open={modalBaixaOpen} onOpenChange={setModalBaixaOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="p-5 border-b border-[#DEE4EA] bg-white">
            <DialogTitle className="font-heading text-[#2C3E50]">
              Registrar Pagamento — Parcela {parcelaSelecionada?.numero_parcela}/
              {parcelaSelecionada?.total_parcelas}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmarBaixa} className="p-5 space-y-4 bg-[#f8f9fa]">
            <div className="bg-white p-3.5 rounded-lg border border-[#DEE4EA] text-xs space-y-1.5 shadow-2xs">
              <div className="flex justify-between">
                <span className="text-[#616F7D]">Orçamento / Obra:</span>
                <strong className="text-[#2C3E50]">
                  {parcelaSelecionada?.expand?.orcamento?.numero} -{' '}
                  {parcelaSelecionada?.expand?.orcamento?.cliente}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616F7D]">Valor Previsto da Parcela:</span>
                <strong className="text-[#2C3E50]">
                  {formatMoeda(parcelaSelecionada?.valor_previsto || 0)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616F7D]">Já Recebido Anteriormente:</span>
                <span className="font-bold text-emerald-700">
                  {formatMoeda(parcelaSelecionada?.valor_pago || 0)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#DEE4EA] pt-1">
                <span className="text-[#616F7D] font-semibold">Saldo Restante:</span>
                <span className="font-bold text-amber-700">
                  {formatMoeda(
                    Math.max(
                      0,
                      (parcelaSelecionada?.valor_previsto || 0) -
                        (parcelaSelecionada?.valor_pago || 0),
                    ),
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Valor Recebido Agora (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                  className="h-9 text-xs bg-white font-bold text-[#2C3E50]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Data do Pagamento <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  className="h-9 text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5 col-span-2">
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
                      Dinheiro (Espécie)
                    </SelectItem>
                    <SelectItem value="Transferência TED/DOC" className="text-xs">
                      Transferência Bancária (TED/DOC)
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
                Observação / Comprovante
              </Label>
              <Textarea
                rows={2}
                value={observacoesBaixa}
                onChange={(e) => setObservacoesBaixa(e.target.value)}
                placeholder="Ex: 1º pagamento parcial via PIX, restante na sexta-feira..."
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
                {salvandoBaixa ? 'Registrando...' : 'Confirmar Recebimento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE HISTÓRICO DE RECEBIMENTOS PARCIAIS */}
      <Dialog open={modalHistoricoOpen} onOpenChange={setModalHistoricoOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="p-5 border-b border-[#DEE4EA] bg-white">
            <DialogTitle className="font-heading text-[#2C3E50] flex items-center justify-between">
              <span>Histórico de Recebimentos</span>
              <Badge variant="outline" className="text-xs border-[#DEE4EA]">
                Parcela {parcelaHistorico?.numero_parcela}/{parcelaHistorico?.total_parcelas}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4 bg-[#f8f9fa] max-h-[70vh] overflow-y-auto">
            <div className="bg-white p-3 rounded-lg border border-[#DEE4EA] text-xs flex justify-between">
              <div>
                <span className="text-[#616F7D] block">Valor Total Previsto</span>
                <span className="font-bold text-[#2C3E50]">
                  {formatMoeda(parcelaHistorico?.valor_previsto || 0)}
                </span>
              </div>
              <div>
                <span className="text-[#616F7D] block">Total Já Recebido</span>
                <span className="font-bold text-emerald-700">
                  {formatMoeda(parcelaHistorico?.valor_pago || 0)}
                </span>
              </div>
              <div>
                <span className="text-[#616F7D] block">Saldo a Receber</span>
                <span className="font-bold text-amber-700">
                  {formatMoeda(
                    Math.max(
                      0,
                      (parcelaHistorico?.valor_previsto || 0) - (parcelaHistorico?.valor_pago || 0),
                    ),
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider block">
                Entradas Registradas ({parcelaHistorico?.recebimentos?.length || 0})
              </Label>

              {!parcelaHistorico?.recebimentos || parcelaHistorico.recebimentos.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#616F7D] bg-white rounded-lg border">
                  Nenhum registro parcial detalhado encontrado.
                </div>
              ) : (
                <div className="space-y-2">
                  {parcelaHistorico.recebimentos.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className="bg-white p-3 rounded-lg border border-[#DEE4EA] shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#2C3E50]">
                            {formatMoeda(rec.valor)}
                          </span>
                          <Badge variant="outline" className="text-[10px] bg-[#f4f4f4]">
                            {rec.forma_pagamento || 'PIX'}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-[#616F7D]">
                          Data: <strong>{formatData(rec.data_pagamento)}</strong>
                        </div>
                        {rec.observacao && (
                          <div className="text-[10px] text-[#8A94A0] italic mt-0.5">
                            "{rec.observacao}"
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={estornandoId === rec.id}
                        onClick={() => handleEstornarRecebimentoItem(rec, parcelaHistorico.id)}
                        className="text-xs text-[#8A94A0] hover:text-red-600 hover:bg-red-50 h-8"
                        title="Estornar apenas este recebimento"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Estornar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-[#DEE4EA] bg-white">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalHistoricoOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE REAJUSTE DE PARCELAMENTO INTEGRADO */}
      <ModalReajusteParcelas
        orcamento={orcamentoParaReajuste}
        open={modalReajusteOpen}
        onOpenChange={setModalReajusteOpen}
        onSucesso={() => {
          carregar()
          if (onAtualizarOrcamentos) onAtualizarOrcamentos()
        }}
      />

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
