import React, { useState, useEffect } from 'react'
import type { Orcamento, PagamentoParcela } from '@/types'
import {
  listarParcelasPagamento,
  reajustarParcelamentoOrcamento,
  ItemReajusteParcela,
} from '@/services/orcamentoModulo'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Calendar, DollarSign, Calculator, AlertCircle, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ModalReajusteParcelasProps {
  orcamento: Orcamento | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSucesso?: () => void
  /**
   * Se chamado a partir do botão "Concluir Obra", pode receber uma ação subsequente
   */
  titulo?: string
  subtitulo?: string
}

interface LinhaParcelaLocal {
  idTemp: string
  numero: number
  descricao: string
  valor: number
  dataVencimento: string
  jaTemRecebimento?: boolean
}

export const ModalReajusteParcelas: React.FC<ModalReajusteParcelasProps> = ({
  orcamento,
  open,
  onOpenChange,
  onSucesso,
  titulo,
  subtitulo,
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [parcelasOriginais, setParcelasOriginais] = useState<PagamentoParcela[]>([])
  const [linhas, setLinhas] = useState<LinhaParcelaLocal[]>([])
  const [qtdDivisao, setQtdDivisao] = useState<number>(3)

  const valorTotalOrcamento = Number(orcamento?.valor_total) || 0

  const formatMoeda = (val: number) => {
    return (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Gera data YYYY-MM-DD somando meses
  const gerarDataMes = (base: Date, mesesAdd: number): string => {
    const d = new Date(base.getTime())
    d.setMonth(d.getMonth() + mesesAdd)
    return d.toISOString().substring(0, 10)
  }

  const carregarParcelas = async () => {
    if (!orcamento?.id) return
    setLoading(true)
    try {
      const data = await listarParcelasPagamento({ orcamentoId: orcamento.id })
      setParcelasOriginais(data)

      if (data.length > 0) {
        setLinhas(
          data.map((p, idx) => ({
            idTemp: p.id,
            numero: p.numero_parcela || idx + 1,
            descricao: p.descricao || `Parcela ${p.numero_parcela || idx + 1}/${data.length}`,
            valor: Number(p.valor_previsto) || 0,
            dataVencimento: p.data_vencimento
              ? p.data_vencimento.substring(0, 10)
              : new Date().toISOString().substring(0, 10),
            jaTemRecebimento:
              p.status === 'paga' ||
              p.status === 'parcial' ||
              Boolean(p.recebimentos && p.recebimentos.length > 0),
          })),
        )
      } else {
        // Gera sugestão inicial com 2 parcelas ou à vista
        const hoje = new Date()
        const metade = Math.round((valorTotalOrcamento / 2) * 100) / 100
        const saldo = Math.round((valorTotalOrcamento - metade) * 100) / 100
        setLinhas([
          {
            idTemp: 'temp_1',
            numero: 1,
            descricao: '1ª Parcela - Entrada / Início',
            valor: metade,
            dataVencimento: hoje.toISOString().substring(0, 10),
          },
          {
            idTemp: 'temp_2',
            numero: 2,
            descricao: '2ª Parcela - Saldo na Entrega',
            valor: saldo,
            dataVencimento: gerarDataMes(hoje, 1),
          },
        ])
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar parcelamento',
        description: err?.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && orcamento?.id) {
      carregarParcelas()
    }
  }, [open, orcamento?.id])

  // Divide o valor total em N parcelas iguais
  const handleDividirEmN = (n: number) => {
    if (n < 1) return
    const hoje = new Date()
    const valorParcela = Math.round((valorTotalOrcamento / n) * 100) / 100
    const novas: LinhaParcelaLocal[] = []

    for (let i = 1; i <= n; i++) {
      const val =
        i === n
          ? Math.round((valorTotalOrcamento - valorParcela * (n - 1)) * 100) / 100
          : valorParcela
      novas.push({
        idTemp: `temp_${i}_${Date.now()}`,
        numero: i,
        descricao: n === 1 ? 'Pagamento à vista' : `Parcela ${i}/${n}`,
        valor: val,
        dataVencimento: gerarDataMes(hoje, i - 1),
      })
    }
    setLinhas(novas)
  }

  const handleAdicionarParcela = () => {
    const hoje = new Date()
    const proximoNum = linhas.length + 1
    const somaAtual = linhas.reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
    const restante = Math.max(0, Math.round((valorTotalOrcamento - somaAtual) * 100) / 100)

    setLinhas((prev) => [
      ...prev,
      {
        idTemp: `temp_${proximoNum}_${Date.now()}`,
        numero: proximoNum,
        descricao: `Parcela ${proximoNum}/${proximoNum}`,
        valor: restante > 0 ? restante : 0,
        dataVencimento: gerarDataMes(hoje, proximoNum - 1),
      },
    ])
  }

  const handleRemoverLinha = (idTemp: string) => {
    if (linhas.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Mínimo de 1 parcela',
        description: 'O orçamento precisa ter ao menos uma parcela.',
      })
      return
    }
    setLinhas((prev) => prev.filter((l) => l.idTemp !== idTemp))
  }

  const handleAtualizarLinha = (idTemp: string, campo: keyof LinhaParcelaLocal, valor: any) => {
    setLinhas((prev) => prev.map((l) => (l.idTemp === idTemp ? { ...l, [campo]: valor } : l)))
  }

  const somaPrevista = linhas.reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
  const diferenca = Math.round((valorTotalOrcamento - somaPrevista) * 100) / 100
  const valorBate = Math.abs(diferenca) < 0.05

  const handleSalvar = async () => {
    if (!orcamento?.id) return
    if (linhas.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sem parcelas',
        description: 'Adicione ao menos 1 parcela.',
      })
      return
    }

    if (!valorBate) {
      toast({
        variant: 'destructive',
        title: 'Soma incoerente',
        description: `A soma das parcelas (${formatMoeda(somaPrevista)}) difere do total do orçamento (${formatMoeda(valorTotalOrcamento)}). Ajuste os valores para fechar os ${formatMoeda(valorTotalOrcamento)}.`,
      })
      return
    }

    // Valida datas
    for (const l of linhas) {
      if (!l.dataVencimento) {
        toast({
          variant: 'destructive',
          title: 'Data de vencimento ausente',
          description: 'Informe a data de vencimento de todas as parcelas.',
        })
        return
      }
    }

    setSalvando(true)
    try {
      const payload: ItemReajusteParcela[] = linhas.map((l, idx) => ({
        numero_parcela: idx + 1,
        total_parcelas: linhas.length,
        descricao: l.descricao || `Parcela ${idx + 1}/${linhas.length}`,
        valor_previsto: Number(l.valor) || 0,
        data_vencimento: l.dataVencimento,
      }))

      await reajustarParcelamentoOrcamento(orcamento.id, payload)
      toast({
        title: 'Parcelamento atualizado com sucesso!',
        description: `O orçamento agora possui ${linhas.length} parcela(s) com datas e valores configurados.`,
      })
      onOpenChange(false)
      if (onSucesso) onSucesso()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar parcelamento',
        description: err?.message,
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-5 border-b border-[#DEE4EA] bg-white">
          <DialogTitle className="font-heading text-[#2C3E50] flex items-center justify-between">
            <span>{titulo || 'Reajustar Parcelamento & Vencimentos'}</span>
            <Badge variant="outline" className="font-mono text-xs border-[#DEE4EA] text-[#2C3E50]">
              {orcamento?.numero}
            </Badge>
          </DialogTitle>
          <p className="text-xs text-[#616F7D] mt-1">
            {subtitulo ||
              'Defina em quantas vezes o cliente pagará, com datas de vencimento e valores individuais.'}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8f9fa]">
          {/* Resumo do Orçamento & Botões Rápidos */}
          <div className="bg-white p-4 rounded-xl border border-[#DEE4EA] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <span className="text-[11px] font-medium text-[#616F7D] block">Cliente / Obra</span>
              <span className="text-sm font-bold text-[#2C3E50]">{orcamento?.cliente}</span>
              <span className="text-xs text-[#8A94A0] block">
                Valor Total:{' '}
                <strong className="text-[#2C3E50]">{formatMoeda(valorTotalOrcamento)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-[#616F7D] mr-1">Dividir em:</span>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQtdDivisao(n)
                    handleDividirEmN(n)
                  }}
                  className={`h-7 px-2.5 text-xs font-bold ${
                    linhas.length === n
                      ? 'bg-[#2C3E50] text-[#D4AF37] border-[#2C3E50]'
                      : 'border-[#DEE4EA] text-[#616F7D] hover:text-[#2C3E50]'
                  }`}
                >
                  {n === 1 ? 'À vista' : `${n}x`}
                </Button>
              ))}
            </div>
          </div>

          {/* Lista de Parcelas Editáveis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider">
                Parcelas do Cronograma ({linhas.length})
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAdicionarParcela}
                className="h-7 text-xs border-[#DEE4EA] text-[#2C3E50] hover:bg-[#E8EDF2]"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Parcela
              </Button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-[#616F7D]">Carregando parcelas...</div>
            ) : (
              <div className="space-y-2.5">
                {linhas.map((linha, idx) => (
                  <div
                    key={linha.idTemp}
                    className="bg-white p-3 rounded-lg border border-[#DEE4EA] shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                  >
                    <div className="sm:col-span-1 flex items-center justify-center font-bold text-xs text-[#2C3E50] bg-[#f4f4f4] rounded h-8">
                      #{idx + 1}
                    </div>

                    <div className="sm:col-span-4">
                      <Label className="text-[10px] text-[#616F7D] block">
                        Descrição da Parcela
                      </Label>
                      <Input
                        type="text"
                        value={linha.descricao}
                        onChange={(e) =>
                          handleAtualizarLinha(linha.idTemp, 'descricao', e.target.value)
                        }
                        placeholder={`Parcela ${idx + 1}`}
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <Label className="text-[10px] text-[#616F7D] block">Vencimento</Label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={linha.dataVencimento}
                          onChange={(e) =>
                            handleAtualizarLinha(linha.idTemp, 'dataVencimento', e.target.value)
                          }
                          className="h-8 text-xs bg-white pl-2"
                          required
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <Label className="text-[10px] text-[#616F7D] block">
                        Valor Previsto (R$)
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={linha.valor}
                        onChange={(e) =>
                          handleAtualizarLinha(
                            linha.idTemp,
                            'valor',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-8 text-xs bg-white font-semibold text-[#2C3E50]"
                        required
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-end justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverLinha(linha.idTemp)}
                        disabled={linhas.length <= 1 || linha.jaTemRecebimento}
                        className="h-8 w-8 p-0 text-[#8A94A0] hover:text-red-600 hover:bg-red-50"
                        title={
                          linha.jaTemRecebimento
                            ? 'Parcela com pagamento registrado'
                            : 'Remover parcela'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Validação de Somatório */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              valorBate
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {valorBate ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span>
                Soma das parcelas: <strong>{formatMoeda(somaPrevista)}</strong> de{' '}
                <strong>{formatMoeda(valorTotalOrcamento)}</strong>
              </span>
            </div>

            {!valorBate && (
              <span className="font-bold">
                {diferenca > 0
                  ? `Falta distribuir ${formatMoeda(diferenca)}`
                  : `Excedeu ${formatMoeda(Math.abs(diferenca))}`}
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-[#DEE4EA] bg-white flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={salvando || !valorBate}
            onClick={handleSalvar}
            className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs px-5 shadow-xs"
          >
            {salvando ? 'Salvando...' : 'Salvar Novo Parcelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
