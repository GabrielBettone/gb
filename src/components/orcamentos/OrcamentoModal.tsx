import React, { useState, useEffect } from 'react'
import type { Produto, CanalVenda, ItemOrcamento, StatusOrcamento, Orcamento } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Calendar, DollarSign, Calculator, AlertCircle } from 'lucide-react'
import {
  gerarProximoNumeroOrcamento,
  criarOrcamento,
  atualizarOrcamento,
} from '@/services/orcamentos'
import { useToast } from '@/hooks/use-toast'

interface OrcamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produtos: Produto[]
  orcamentoParaEditar?: Orcamento | null
  onSuccess: () => void
}

const CANAIS: CanalVenda[] = ['WhatsApp', 'E-mail', 'Instagram', 'Loja física']
const STATUS_OPTIONS: StatusOrcamento[] = [
  'Orçamentos a realizar',
  'Aguardando aprovação',
  'Aprovados aguardando início',
  'Trabalhos iniciados',
  'Concluídos',
]

// Sugestão de preços médios para os 12 serviços padrão
const PRECOS_SUGERIDOS: Record<string, number> = {
  'Forros de gesso': 80,
  'Parede drywall': 150,
  'Faixas decorativas e boiseries': 60,
  'Molduras de gesso': 45,
  'Rebaixo de teto': 85,
  'Cortineiros de gesso': 55,
  Sancas: 110,
  'Móveis e guarda-roupas em gesso': 3500,
  'Revestimento em placa 3D': 130,
  'Molduras externas em cimento celular': 140,
  'Colunas de gesso': 450,
  Vitrais: 800,
}

export const OrcamentoModal: React.FC<OrcamentoModalProps> = ({
  open,
  onOpenChange,
  produtos,
  orcamentoParaEditar,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [salvando, setSalvando] = useState(false)
  const [numeroPrevisto, setNumeroPrevisto] = useState('')

  // Campos do formulário
  const [cliente, setCliente] = useState('')
  const [contato, setContato] = useState('')
  const [cidade, setCidade] = useState('São Pedro')
  const [canalOrigem, setCanalOrigem] = useState<CanalVenda>('WhatsApp')
  const [status, setStatus] = useState<StatusOrcamento>('Orçamentos a realizar')
  const [produtoPrincipal, setProdutoPrincipal] = useState<string>('')
  const [validade, setValidade] = useState('')
  const [dataInicioPrevista, setDataInicioPrevista] = useState('')
  const [dataFimPrevista, setDataFimPrevista] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [desconto, setDesconto] = useState<string>('0')

  // Itens da tabela
  const [itens, setItens] = useState<ItemOrcamento[]>([])

  // Popula ou limpa dados quando o modal abre ou muda o item a editar
  useEffect(() => {
    if (!open) return

    const hoje = new Date()
    const hojeStr = hoje.toISOString().substring(0, 10)

    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
    const em14Dias = new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000)
    const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)

    if (orcamentoParaEditar) {
      setNumeroPrevisto(orcamentoParaEditar.numero)
      setCliente(orcamentoParaEditar.cliente || '')
      setContato(orcamentoParaEditar.contato || '')
      setCidade(orcamentoParaEditar.cidade || 'São Pedro')
      setCanalOrigem(orcamentoParaEditar.canal_origem || 'WhatsApp')
      setStatus(orcamentoParaEditar.status || 'Orçamentos a realizar')
      setProdutoPrincipal(orcamentoParaEditar.produto_principal || '')
      setValidade(orcamentoParaEditar.validade ? orcamentoParaEditar.validade.substring(0, 10) : '')
      setDataInicioPrevista(
        orcamentoParaEditar.data_inicio_prevista
          ? orcamentoParaEditar.data_inicio_prevista.substring(0, 10)
          : '',
      )
      setDataFimPrevista(
        orcamentoParaEditar.data_fim_prevista
          ? orcamentoParaEditar.data_fim_prevista.substring(0, 10)
          : '',
      )
      setObservacoes(orcamentoParaEditar.observacoes || '')
      setDesconto((orcamentoParaEditar.desconto || 0).toString())

      const parsedItens = Array.isArray(orcamentoParaEditar.itens)
        ? orcamentoParaEditar.itens
        : typeof orcamentoParaEditar.itens === 'string'
          ? JSON.parse(orcamentoParaEditar.itens)
          : []

      setItens(
        parsedItens.length > 0
          ? parsedItens
          : [
              {
                produto_id: orcamentoParaEditar.produto_principal || produtos[0]?.id || '',
                descricao: 'Serviço de gesso / drywall sob medida',
                quantidade: 1,
                unidade: 'serviço',
                valor_unitario: orcamentoParaEditar.valor_total || 1000,
                valor_total: orcamentoParaEditar.valor_total || 1000,
              },
            ],
      )
    } else {
      // Novo orçamento: busca próximo número
      gerarProximoNumeroOrcamento().then((num) => setNumeroPrevisto(num))
      setCliente('')
      setContato('')
      setCidade('São Pedro')
      setCanalOrigem('WhatsApp')
      setStatus('Orçamentos a realizar')
      setProdutoPrincipal(produtos[0]?.id || '')
      setValidade(em30Dias.toISOString().substring(0, 10))
      setDataInicioPrevista(em7Dias.toISOString().substring(0, 10))
      setDataFimPrevista(em14Dias.toISOString().substring(0, 10))
      setObservacoes('')
      setDesconto('0')

      // Inicializa com um item do catálogo
      const primeiroProd = produtos[0]
      const precoSug = primeiroProd ? PRECOS_SUGERIDOS[primeiroProd.nome] || 100 : 100
      setItens([
        {
          produto_id: primeiroProd?.id || '',
          descricao: primeiroProd ? primeiroProd.nome : 'Serviço sob medida',
          quantidade: 1,
          unidade: 'm²',
          valor_unitario: precoSug,
          valor_total: precoSug,
        },
      ])
    }
  }, [open, orcamentoParaEditar, produtos])

  // Cálculos de subtotal, desconto e total
  const subtotal = itens.reduce((acc, it) => acc + (it.valor_total || 0), 0)
  const descontoNum = Math.max(0, parseFloat(desconto.replace(',', '.')) || 0)
  const valorTotal = Math.max(0, subtotal - descontoNum)

  // Gerenciamento dos itens
  const handleAddItem = () => {
    const prod = produtos.find((p) => p.id === produtoPrincipal) || produtos[0]
    const preco = prod ? PRECOS_SUGERIDOS[prod.nome] || 100 : 100
    setItens([
      ...itens,
      {
        produto_id: prod?.id || '',
        descricao: prod?.nome || 'Serviço adicional',
        quantidade: 1,
        unidade: 'm²',
        valor_unitario: preco,
        valor_total: preco,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    if (itens.length <= 1) {
      toast({
        title: 'Mínimo de 1 item',
        description: 'O orçamento precisa conter pelo menos um item de serviço.',
      })
      return
    }
    setItens(itens.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, campo: keyof ItemOrcamento, valor: any) => {
    setItens((prev) => {
      const novos = [...prev]
      const itemAtual = { ...novos[index], [campo]: valor }

      if (campo === 'produto_id') {
        const prod = produtos.find((p) => p.id === valor)
        if (prod) {
          itemAtual.descricao = prod.nome
          const sug = PRECOS_SUGERIDOS[prod.nome]
          if (sug) {
            itemAtual.valor_unitario = sug
            itemAtual.valor_total = Math.round(itemAtual.quantidade * sug * 100) / 100
          }
        }
      }

      if (campo === 'quantidade' || campo === 'valor_unitario') {
        const qtd = campo === 'quantidade' ? parseFloat(valor) || 0 : itemAtual.quantidade || 0
        const un =
          campo === 'valor_unitario' ? parseFloat(valor) || 0 : itemAtual.valor_unitario || 0
        itemAtual.valor_total = Math.round(qtd * un * 100) / 100
      }

      novos[index] = itemAtual
      return novos
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cliente.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome do cliente obrigatório',
        description: 'Por favor, informe o nome do cliente.',
      })
      return
    }

    if (itens.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum item adicionado',
        description: 'Adicione pelo menos um item/serviço ao orçamento.',
      })
      return
    }

    // Se datas estiverem invertidas
    if (dataInicioPrevista && dataFimPrevista && dataInicioPrevista > dataFimPrevista) {
      toast({
        variant: 'destructive',
        title: 'Datas inválidas',
        description: 'A data de fim prevista não pode ser anterior à data de início.',
      })
      return
    }

    setSalvando(true)
    try {
      if (orcamentoParaEditar) {
        await atualizarOrcamento(orcamentoParaEditar.id, {
          cliente,
          contato,
          cidade,
          canal_origem: canalOrigem,
          status,
          produto_principal: produtoPrincipal || itens[0]?.produto_id,
          itens,
          subtotal,
          desconto: descontoNum,
          valor_total: valorTotal,
          data_inicio_prevista: dataInicioPrevista || undefined,
          data_fim_prevista: dataFimPrevista || undefined,
          validade: validade || undefined,
          observacoes,
        })
        toast({
          title: 'Orçamento atualizado com sucesso!',
          description: `${orcamentoParaEditar.numero} foi salvo.`,
        })
      } else {
        const novo = await criarOrcamento({
          cliente,
          contato,
          cidade,
          canal_origem: canalOrigem,
          status,
          produto_principal: produtoPrincipal || itens[0]?.produto_id,
          itens,
          subtotal,
          desconto: descontoNum,
          valor_total: valorTotal,
          data_inicio_prevista: dataInicioPrevista || undefined,
          data_fim_prevista: dataFimPrevista || undefined,
          validade: validade || undefined,
          observacoes,
        })
        toast({
          title: 'Orçamento criado!',
          description: `Novo orçamento ${novo.numero} registrado com sucesso.`,
        })
      }

      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar orçamento:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err?.message || 'Verifique as informações fornecidas.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const formatMoeda = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-6 bg-white border-b border-[#E3E6EA] sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center font-heading font-bold text-sm shadow-sm border border-[#D4AF37]/30 flex-shrink-0">
                GB
              </div>
              <div>
                <DialogTitle className="font-heading text-lg font-bold text-[#2C3E50]">
                  {orcamentoParaEditar
                    ? `Editar Orçamento: ${orcamentoParaEditar.numero}`
                    : 'Novo Orçamento & Trabalho'}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#616F7D] mt-0.5">
                  Número sequencial:{' '}
                  <span className="font-semibold text-[#2C3E50]">
                    {numeroPrevisto || 'Gerando...'}
                  </span>{' '}
                  — Gesso Bettone
                </DialogDescription>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[11px] text-[#616F7D] font-medium">Total previsto</span>
              <span className="text-xl font-bold text-[#2C3E50]">{formatMoeda(valorTotal)}</span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-[#f4f4f4]">
          {/* SEÇÃO 1: DADOS DO CLIENTE & ORIGEM */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DEE4EA] space-y-4 shadow-sm">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              1. Dados do Cliente e Canal
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="cliente" className="text-xs font-semibold text-[#22272A]">
                  Cliente / Obra <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cliente"
                  placeholder="Ex: Residencial Alphaville (Carlos Eduardo)"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contato" className="text-xs font-semibold text-[#22272A]">
                  Contato (Telefone/E-mail)
                </Label>
                <Input
                  id="contato"
                  placeholder="(19) 99876-1234"
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cidade" className="text-xs font-semibold text-[#22272A]">
                  Cidade da Obra
                </Label>
                <Input
                  id="cidade"
                  placeholder="São Pedro"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Canal de Origem <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={canalOrigem}
                  onValueChange={(val: CanalVenda) => setCanalOrigem(val)}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Canal" />
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Etapa do Funil <span className="text-red-500">*</span>
                </Label>
                <Select value={status} onValueChange={(val: StatusOrcamento) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((st) => (
                      <SelectItem key={st} value={st} className="text-xs">
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-[#22272A]">
                  Serviço / Produto Principal
                </Label>
                <Select value={produtoPrincipal} onValueChange={setProdutoPrincipal}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Selecione o serviço de maior destaque" />
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
            </div>
          </div>

          {/* SEÇÃO 2: ITENS DO ORÇAMENTO (SERVIÇOS BETTONE) */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E3E6EA] space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                Itens & Serviços Inclusos ({itens.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarItem}
                className="h-8 text-xs text-[#2C3E50] border-[#2C3E50]/30 hover:bg-[#E8EDF2]"
              >
                {' '}
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Serviço
              </Button>
            </div>

            <div className="space-y-3">
              {itens.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#F6F7F9] rounded-lg border border-[#E3E6EA] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                >
                  {/* Seleção do Serviço no catálogo */}
                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-[11px] text-[#5B6470]">Catálogo Bettone</Label>
                    <Select
                      value={item.produto_id || ''}
                      onValueChange={(val) => handleItemChange(idx, 'produto_id', val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Escolha o serviço..." />
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

                  {/* Descrição detalhada */}
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-[11px] text-[#5B6470]">Descrição / Especificação</Label>
                    <Input
                      value={item.descricao}
                      onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                      placeholder="Ex: Forro estruturado FVS"
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {/* Quantidade */}
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px] text-[#5B6470]">Qtd</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0.1"
                      value={item.quantidade}
                      onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {/* Unidade */}
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px] text-[#5B6470]">Un</Label>
                    <Input
                      value={item.unidade || 'm²'}
                      onChange={(e) => handleItemChange(idx, 'unidade', e.target.value)}
                      placeholder="m²"
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {/* Valor Unitário */}
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px] text-[#5B6470]">Unit. (R$)</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={item.valor_unitario}
                      onChange={(e) => handleItemChange(idx, 'valor_unitario', e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {/* Total do Item */}
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-[11px] text-[#5B6470]">Total</Label>
                    <div className="h-8 px-2 flex items-center bg-[#E8EDF2] text-[#2C3E50] font-semibold text-xs rounded border border-[#2C3E50]/20">
                      R$ {item.valor_total?.toFixed(0)}
                    </div>
                  </div>

                  {/* Remover Item */}
                  <div className="sm:col-span-1 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(idx)}
                      className="h-8 w-8 p-0 text-[#C4453C] hover:bg-[#FBEFEE]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotais e Desconto */}
            <div className="pt-3 border-t border-[#E3E6EA] flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
              <div className="text-xs text-[#5B6470]">
                Total de itens: <span className="font-semibold text-[#22272A]">{itens.length}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="desconto" className="text-xs text-[#5B6470]">
                    Desconto (R$):
                  </Label>
                  <Input
                    id="desconto"
                    type="number"
                    step="any"
                    min="0"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    className="w-24 h-8 text-xs bg-white text-right font-medium"
                  />
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#5B6470] mr-2">Valor Total:</span>
                  <span className="text-base font-bold text-[#2C3E50]">
                    {formatMoeda(valorTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: CRONOGRAMA & DATAS (ALIMENTA O GANTT) */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DEE4EA] space-y-4 shadow-sm">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              3. Cronograma do Trabalho & Validade (Linha do Tempo Gantt)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="dataInicio"
                  className="text-xs font-semibold text-[#2C3E50] flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#2C3E50]" />
                  Data de Início Prevista
                </Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicioPrevista}
                  onChange={(e) => setDataInicioPrevista(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="dataFim"
                  className="text-xs font-semibold text-[#2C3E50] flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#2C3E50]" />
                  Data de Fim Prevista
                </Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFimPrevista}
                  onChange={(e) => setDataFimPrevista(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="validade" className="text-xs font-semibold text-[#22272A]">
                  Validade da Proposta
                </Label>
                <Input
                  id="validade"
                  type="date"
                  value={validade}
                  onChange={(e) => setValidade(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obs" className="text-xs font-semibold text-[#22272A]">
                Observações do Trabalho / Condições de Pagamento
              </Label>
              <Textarea
                id="obs"
                rows={2}
                placeholder="Ex: Pagamento 50% na entrada e 50% na entrega. Inclui todo material e mão de obra..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="text-xs bg-white resize-none"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-white border-t border-[#E3E6EA] flex items-center justify-between sm:justify-end gap-2 sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs border-[#E3E6EA]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              size="sm"
              className="h-9 text-xs bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold px-4 shadow-sm"
            >
              {salvando
                ? 'Salvando...'
                : orcamentoParaEditar
                  ? 'Salvar Alterações'
                  : 'Criar Orçamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
