import React, { useState, useEffect } from 'react'
import type {
  Produto,
  CanalVenda,
  ItemOrcamento,
  StatusOrcamento,
  Orcamento,
  Cliente,
  ClienteGrupo,
  MetodoPagamento,
  OrcamentoServicoItem,
  OrcamentoConfiguracao,
} from '@/types'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  Calendar,
  Calculator,
  UserPlus,
  FileDown,
  Building2,
  CreditCard,
  Layers,
} from 'lucide-react'
import {
  gerarProximoNumeroOrcamento,
  criarOrcamento,
  atualizarOrcamento,
} from '@/services/orcamentos'
import {
  listarClientes,
  listarGrupos,
  listarMetodosPagamento,
  listarOrcamentoServicos,
  obterConfiguracoesOrcamento,
  criarCliente,
} from '@/services/orcamentoModulo'
import { imprimirOrcamentoPDF } from '@/services/orcamentoPDF'
import { formatarCondicoesPrazo } from '@/services/orcamentoCondicoes'
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

  // Listas auxiliares do módulo
  const [clientesList, setClientesList] = useState<Cliente[]>([])
  const [gruposList, setGruposList] = useState<ClienteGrupo[]>([])
  const [metodosList, setMetodosList] = useState<MetodoPagamento[]>([])
  const [servicosPrecoList, setServicosPrecoList] = useState<OrcamentoServicoItem[]>([])
  const [configGeral, setConfigGeral] = useState<OrcamentoConfiguracao | null>(null)

  // Campos do formulário
  const [clienteId, setClienteId] = useState<string>('novo')
  const [clienteNome, setClienteNome] = useState('')
  const [grupoId, setGrupoId] = useState<string>('')
  const [metodoPagamentoId, setMetodoPagamentoId] = useState<string>('')
  const [exibirCnpj, setExibirCnpj] = useState<boolean>(true)
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

  // Modal rápido de novo cliente inline
  const [modalNovoClienteOpen, setModalNovoClienteOpen] = useState(false)
  const [novoCliNome, setNovoCliNome] = useState('')
  const [novoCliGrupo, setNovoCliGrupo] = useState('')
  const [novoCliWhats, setNovoCliWhats] = useState('')
  const [novoCliCidade, setNovoCliCidade] = useState('São Pedro')

  // Carregar dados das coleções quando o modal abre
  useEffect(() => {
    if (!open) return

    async function carregarAuxiliares() {
      try {
        const [c, g, m, s, cfg] = await Promise.all([
          listarClientes(),
          listarGrupos(),
          listarMetodosPagamento(),
          listarOrcamentoServicos(),
          obterConfiguracoesOrcamento(),
        ])
        setClientesList(c)
        setGruposList(g)
        setMetodosList(m)
        setServicosPrecoList(s)
        setConfigGeral(cfg)
      } catch (err) {
        console.error('Erro ao carregar dados auxiliares do orçamento:', err)
      }
    }

    carregarAuxiliares()
  }, [open])

  // Popula ou limpa dados quando o modal abre ou muda o item a editar
  useEffect(() => {
    if (!open) return

    const hoje = new Date()
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
    const em14Dias = new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000)
    const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)

    if (orcamentoParaEditar) {
      setNumeroPrevisto(orcamentoParaEditar.numero)
      setClienteId(orcamentoParaEditar.cliente_cadastrado || 'novo')
      setClienteNome(orcamentoParaEditar.cliente || '')
      setGrupoId(orcamentoParaEditar.grupo || '')
      setMetodoPagamentoId(orcamentoParaEditar.metodo_pagamento || '')
      setExibirCnpj(orcamentoParaEditar.exibir_cnpj ?? true)
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
                descricao: 'Forros de gesso drywall',
                quantidade: 10,
                unidade: 'm²',
                valor_unitario: 120,
                valor_total: 1200,
              },
            ],
      )
    } else {
      gerarProximoNumeroOrcamento().then((num) => setNumeroPrevisto(num))
      setClienteId('novo')
      setClienteNome('')
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
      setExibirCnpj(true)

      // Padrões de grupo e método
      const grupoPadrao = gruposList.find((g) => g.padrao) || gruposList[0]
      if (grupoPadrao) setGrupoId(grupoPadrao.id)

      const metodoPadrao = metodosList.find((m) => m.padrao) || metodosList[0]
      if (metodoPadrao) setMetodoPagamentoId(metodoPadrao.id)

      setItens([
        {
          descricao: 'Forros de gesso',
          quantidade: 1,
          unidade: 'm²',
          valor_unitario: 120,
          valor_total: 120,
        },
      ])
    }
  }, [open, orcamentoParaEditar, produtos, gruposList, metodosList])

  // Quando o usuário seleciona um cliente cadastrado no Select:
  const handleSelecionarCliente = (id: string) => {
    setClienteId(id)
    if (id === 'novo') {
      return
    }
    const c = clientesList.find((cli) => cli.id === id)
    if (c) {
      setClienteNome(c.nome)
      if (c.whatsapp) setContato(c.whatsapp)
      if (c.cidade) setCidade(c.cidade)
      if (c.grupo) {
        setGrupoId(c.grupo)
        // Atualiza preços dos itens para a tabela do grupo do cliente
        ajustarPrecosParaGrupo(c.grupo)
      }
    }
  }

  // Quando o usuário altera o grupo manualmente
  const handleSelecionarGrupo = (novoGrupoId: string) => {
    setGrupoId(novoGrupoId)
    ajustarPrecosParaGrupo(novoGrupoId)
  }

  // Atualiza preços dos itens com base na tabela do grupo
  const ajustarPrecosParaGrupo = (targetGrupoId: string) => {
    if (!targetGrupoId) return
    setItens((prev) =>
      prev.map((it) => {
        // Encontra o serviço correspondente por nome no novo grupo
        const match = servicosPrecoList.find(
          (s) =>
            s.grupo === targetGrupoId &&
            s.nome.trim().toLowerCase() === it.descricao.trim().toLowerCase(),
        )
        if (match) {
          const novoUnit = match.preco_unitario
          return {
            ...it,
            servico_id: match.id,
            unidade: match.unidade,
            valor_unitario: novoUnit,
            valor_total: Math.round(it.quantidade * novoUnit * 100) / 100,
          }
        }
        return it
      }),
    )
  }

  // Cálculos de subtotal, desconto e total a prazo
  const subtotal = itens.reduce((acc, it) => acc + (it.valor_total || 0), 0)
  const descontoNum = Math.max(0, parseFloat(desconto.replace(',', '.')) || 0)
  const valorAPrazo = Math.max(0, subtotal - descontoNum)

  // Método de pagamento selecionado e cálculo à vista
  const metodoAtual = metodosList.find((m) => m.id === metodoPagamentoId)
  const percentualDescAVista = metodoAtual?.desconto_a_vista || 0
  const valorAVista =
    percentualDescAVista > 0
      ? Math.round(valorAPrazo * (1 - percentualDescAVista / 100) * 100) / 100
      : valorAPrazo

  const condicoesPrazo = formatarCondicoesPrazo(metodoAtual, valorAPrazo)

  // Gerenciamento dos itens
  const handleAddItem = () => {
    // Busca serviços do grupo selecionado
    const servicosDoGrupo = servicosPrecoList.filter((s) => !grupoId || s.grupo === grupoId)
    const primeiro = servicosDoGrupo[0]

    setItens([
      ...itens,
      {
        servico_id: primeiro?.id,
        descricao: primeiro?.nome || 'Forros de gesso',
        quantidade: 1,
        unidade: primeiro?.unidade || 'm²',
        valor_unitario: primeiro?.preco_unitario || 120,
        valor_total: primeiro?.preco_unitario || 120,
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

      if (campo === 'servico_id') {
        const serv = servicosPrecoList.find((s) => s.id === valor)
        if (serv) {
          itemAtual.descricao = serv.nome
          itemAtual.unidade = serv.unidade
          itemAtual.valor_unitario = serv.preco_unitario
          itemAtual.valor_total = Math.round(itemAtual.quantidade * serv.preco_unitario * 100) / 100
        }
      }

      // Se alterou largura ou comprimento (cálculo dimensional)
      if (campo === 'largura' || campo === 'comprimento') {
        const l = campo === 'largura' ? parseFloat(valor) || 0 : itemAtual.largura || 0
        const c = campo === 'comprimento' ? parseFloat(valor) || 0 : itemAtual.comprimento || 0
        if (l > 0 && c > 0) {
          const areaCalculada = Math.round(l * c * 100) / 100
          itemAtual.quantidade = areaCalculada
          itemAtual.valor_total = Math.round(areaCalculada * itemAtual.valor_unitario * 100) / 100
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

  // Criação rápida de cliente inline
  const handleSalvarNovoCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoCliNome.trim() || !novoCliGrupo) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe o nome e selecione o grupo de clientes.',
      })
      return
    }

    try {
      const novo = await criarCliente({
        nome: novoCliNome.trim(),
        grupo: novoCliGrupo,
        whatsapp: novoCliWhats.trim(),
        cidade: novoCliCidade.trim(),
      })
      toast({ title: 'Cliente cadastrado com sucesso!' })
      setClientesList((prev) => [...prev, novo])
      setClienteId(novo.id)
      setClienteNome(novo.nome)
      setContato(novo.whatsapp || '')
      setCidade(novo.cidade || 'São Pedro')
      setGrupoId(novo.grupo)
      ajustarPrecosParaGrupo(novo.grupo)
      setModalNovoClienteOpen(false)
      setNovoCliNome('')
      setNovoCliWhats('')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar cliente',
        description: err?.message,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clienteNome.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome do cliente obrigatório',
        description: 'Por favor, informe ou selecione o cliente.',
      })
      return
    }

    if (itens.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum item adicionado',
        description: 'Adicione pelo menos um serviço ao orçamento.',
      })
      return
    }

    if (dataInicioPrevista && dataFimPrevista && dataInicioPrevista > dataFimPrevista) {
      toast({
        variant: 'destructive',
        title: 'Datas inválidas',
        description: 'A data de fim não pode ser anterior à data de início.',
      })
      return
    }

    setSalvando(true)
    try {
      const payload: any = {
        cliente: clienteNome.trim(),
        cliente_cadastrado: clienteId !== 'novo' ? clienteId : undefined,
        grupo: grupoId || undefined,
        metodo_pagamento: metodoPagamentoId || undefined,
        valor_a_vista: valorAVista,
        valor_a_prazo: valorAPrazo,
        exibir_cnpj: exibirCnpj,
        contato,
        cidade,
        canal_origem: canalOrigem,
        status,
        produto_principal: produtoPrincipal || produtos[0]?.id,
        itens,
        subtotal,
        desconto: descontoNum,
        valor_total: valorAPrazo,
        data_inicio_prevista: dataInicioPrevista || undefined,
        data_fim_prevista: dataFimPrevista || undefined,
        validade: validade || undefined,
        observacoes,
      }

      if (orcamentoParaEditar) {
        await atualizarOrcamento(orcamentoParaEditar.id, payload)
        toast({
          title: 'Orçamento atualizado!',
          description: `${orcamentoParaEditar.numero} foi salvo com sucesso.`,
        })
      } else {
        const novo = await criarOrcamento(payload)
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
        title: 'Erro ao salvar orçamento',
        description: err?.message,
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

  // Dispara impressão do PDF diretamente do modal
  const handleExportarPDF = async () => {
    const fakeOrcamento: Orcamento = {
      id: orcamentoParaEditar?.id || 'temp',
      collectionId: '',
      collectionName: 'orcamentos',
      created: orcamentoParaEditar?.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      numero: numeroPrevisto || 'ORC-000',
      cliente: clienteNome || 'Cliente Não Informado',
      contato,
      cidade,
      canal_origem: canalOrigem,
      status,
      itens,
      subtotal,
      desconto: descontoNum,
      valor_total: valorAPrazo,
      valor_a_vista: valorAVista,
      valor_a_prazo: valorAPrazo,
      exibir_cnpj: exibirCnpj,
      data_inicio_prevista: dataInicioPrevista,
      data_fim_prevista: dataFimPrevista,
      validade,
      observacoes,
      expand: {
        cliente_cadastrado: clientesList.find((c) => c.id === clienteId),
        grupo: gruposList.find((g) => g.id === grupoId),
        metodo_pagamento: metodosList.find((m) => m.id === metodoPagamentoId),
      },
    }
    await imprimirOrcamentoPDF(fakeOrcamento, configGeral)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-5 bg-white border-b border-[#DEE4EA] sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2C3E50] text-[#D4AF37] flex items-center justify-center font-heading font-bold text-sm shadow-sm border border-[#D4AF37]/30 flex-shrink-0">
                  GB
                </div>
                <div>
                  <DialogTitle className="font-heading text-lg font-bold text-[#2C3E50]">
                    {orcamentoParaEditar
                      ? `Editar Orçamento: ${orcamentoParaEditar.numero}`
                      : 'Novo Orçamento Gesso Bettone'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#616F7D] mt-0.5">
                    Número:{' '}
                    <span className="font-semibold text-[#2C3E50]">
                      {numeroPrevisto || 'Gerando...'}
                    </span>{' '}
                    — Tabela por Grupo & Método de Pagamento
                  </DialogDescription>
                </div>
              </div>

              {/* Botão de PDF Rápido */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportarPDF}
                className="h-9 text-xs border-[#2C3E50]/30 text-[#2C3E50] hover:bg-[#E8EDF2]"
              >
                <FileDown className="w-4 h-4 mr-1.5 text-[#D4AF37]" />
                Visualizar / Exportar PDF
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-[#f4f4f4]">
            {/* SEÇÃO 1: CLIENTE, GRUPO & MÉTODO */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DEE4EA] space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DEE4EA] pb-2">
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  1. Cliente, Local & Tabela de Preços do Grupo
                </h3>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalNovoClienteOpen(true)}
                  className="h-7 text-xs text-[#2C3E50] hover:bg-[#E8EDF2] px-2 font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />+ Novo Cliente Rápido
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Seleção de Cliente Cadastrado */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Cliente Cadastrado <span className="text-red-500">*</span>
                  </Label>
                  <Select value={clienteId} onValueChange={handleSelecionarCliente}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo" className="text-xs font-semibold text-[#D4AF37]">
                        + Digitar cliente avulso / novo
                      </SelectItem>
                      {clientesList.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.nome} {c.expand?.grupo ? `(${c.expand.grupo.nome})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nome do Cliente */}
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Nome na Proposta / Obra <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ex: Carlos Eduardo (Alphaville)"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    className="h-9 text-xs bg-white"
                    required
                  />
                </div>

                {/* Grupo de Clientes (Preços por Local) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50] flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#D4AF37]" />
                    Grupo (Tabela de Preços)
                  </Label>
                  <Select value={grupoId} onValueChange={handleSelecionarGrupo}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {gruposList.map((g) => (
                        <SelectItem key={g.id} value={g.id} className="text-xs">
                          {g.nome} {g.padrao ? '(Padrão)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-[#8A94A0] block">
                    Define os valores unitários do catálogo.
                  </span>
                </div>

                {/* Método de Pagamento */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50] flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-[#D4AF37]" />
                    Método de Pagamento
                  </Label>
                  <Select value={metodoPagamentoId} onValueChange={setMetodoPagamentoId}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent>
                      {metodosList.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.nome} {m.desconto_a_vista ? `(${m.desconto_a_vista}% desc.)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-[#8A94A0] block">
                    {percentualDescAVista > 0
                      ? `Desconto de ${percentualDescAVista}% à vista`
                      : 'Sem desconto'}
                  </span>
                </div>

                {/* Contato & Cidade */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Contato / WhatsApp</Label>
                  <Input
                    placeholder="(19) 99876-1234"
                    value={contato}
                    onChange={(e) => setContato(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Cidade / Local</Label>
                  <Input
                    placeholder="São Pedro"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                {/* Canal & Etapa */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50]">Canal de Origem</Label>
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
                  <Label className="text-xs font-semibold text-[#2C3E50]">Etapa do Funil</Label>
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

                {/* Interruptor Exibir CNPJ no PDF deste orçamento */}
                <div className="sm:col-span-2 flex items-center justify-between p-2.5 bg-[#f4f4f4] rounded-lg border border-[#DEE4EA]">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-[#2C3E50] block">
                      Exibir CNPJ no PDF deste orçamento
                    </span>
                    <span className="text-[10px] text-[#616F7D] block">
                      Imprime CNPJ da Bettone no cabeçalho da proposta
                    </span>
                  </div>
                  <Switch checked={exibirCnpj} onCheckedChange={setExibirCnpj} />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: ITENS DO ORÇAMENTO (CÁLCULO POR ÁREA OU LARGURA × COMPRIMENTO) */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DEE4EA] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  2. Itens & Serviços ({itens.length})
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 text-xs text-[#2C3E50] border-[#2C3E50]/30 hover:bg-[#E8EDF2]"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Serviço
                </Button>
              </div>

              <div className="space-y-3">
                {itens.map((item, idx) => {
                  const servicosDoGrupo = servicosPrecoList.filter(
                    (s) => !grupoId || s.grupo === grupoId,
                  )

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-[#f8fafc] rounded-lg border border-[#DEE4EA] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                    >
                      {/* Seleção do Serviço na tabela */}
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">
                          Serviço da Tabela (
                          {gruposList.find((g) => g.id === grupoId)?.nome || 'Geral'})
                        </Label>
                        <Select
                          value={item.servico_id || ''}
                          onValueChange={(val) => handleItemChange(idx, 'servico_id', val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Escolha o serviço..." />
                          </SelectTrigger>
                          <SelectContent>
                            {servicosDoGrupo.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.nome} ({formatMoeda(s.preco_unitario)}/{s.unidade})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Descrição que aparece no PDF */}
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">Descrição no PDF</Label>
                        <Input
                          value={item.descricao}
                          onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                          placeholder="Ex: Forros de gesso drywall"
                          className="h-8 text-xs bg-white"
                        />
                      </div>

                      {/* Largura × Comprimento opcionais */}
                      <div className="sm:col-span-1 space-y-1">
                        <Label className="text-[10px] text-[#616F7D]">Larg. (m)</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Ex: 4"
                          value={item.largura || ''}
                          onChange={(e) => handleItemChange(idx, 'largura', e.target.value)}
                          className="h-8 text-xs bg-white px-1.5 text-center"
                        />
                      </div>

                      <div className="sm:col-span-1 space-y-1">
                        <Label className="text-[10px] text-[#616F7D]">Compr. (m)</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Ex: 5"
                          value={item.comprimento || ''}
                          onChange={(e) => handleItemChange(idx, 'comprimento', e.target.value)}
                          className="h-8 text-xs bg-white px-1.5 text-center"
                        />
                      </div>

                      {/* Quantidade (Área Total) */}
                      <div className="sm:col-span-1 space-y-1">
                        <Label className="text-[10px] text-[#616F7D]">
                          Qtd ({item.unidade || 'm²'})
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0.1"
                          value={item.quantidade}
                          onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                          className="h-8 text-xs bg-white px-1 text-center font-semibold"
                        />
                      </div>

                      {/* Valor Unitário */}
                      <div className="sm:col-span-1 space-y-1">
                        <Label className="text-[10px] text-[#616F7D]">Unit. (R$)</Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={item.valor_unitario}
                          onChange={(e) => handleItemChange(idx, 'valor_unitario', e.target.value)}
                          className="h-8 text-xs bg-white px-1 text-right"
                        />
                      </div>

                      {/* Total & Excluir */}
                      <div className="sm:col-span-1 flex items-center justify-between gap-1">
                        <div className="h-8 px-1 flex-1 flex items-center justify-center bg-[#E8EDF2] text-[#2C3E50] font-bold text-[11px] rounded border border-[#2C3E50]/20">
                          {formatMoeda(item.valor_total || 0).replace('R$', '')}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(idx)}
                          className="h-8 w-6 p-0 text-[#C4453C] hover:bg-[#FBEFEE]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Subtotal e Desconto */}
              <div className="pt-3 border-t border-[#DEE4EA] flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
                <div className="text-xs text-[#616F7D]">
                  Subtotal dos serviços:{' '}
                  <strong className="text-[#2C3E50]">{formatMoeda(subtotal)}</strong>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="desconto" className="text-xs text-[#616F7D]">
                      Desconto Adicional (R$):
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
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: VALORES LADO A LADO (À VISTA COM DESCONTO vs. A PRAZO) */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DEE4EA] space-y-3 shadow-xs">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                3. Valores do Orçamento: À Vista vs. A Prazo
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/50 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
                    VALOR À VISTA
                    {percentualDescAVista > 0 ? ` (COM ${percentualDescAVista}% DE DESCONTO)` : ''}
                  </span>
                  <div className="text-2xl font-bold text-emerald-800">
                    {formatMoeda(valorAVista)}
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    {valorAPrazo > valorAVista
                      ? `Economia de ${formatMoeda(valorAPrazo - valorAVista)} para pagamento no PIX / Transferência imediata.`
                      : 'Pagamento no PIX / Transferência imediata.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#DEE4EA] bg-[#f8fafc] space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C3E50] block">
                    VALOR A PRAZO
                  </span>
                  <div className="text-2xl font-bold text-[#2C3E50]">
                    {formatMoeda(valorAPrazo)}
                  </div>
                  <div className="text-[11px] text-[#616F7D] space-y-0.5">
                    {condicoesPrazo.map((cond, i) => (
                      <p key={i}>{cond}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: CRONOGRAMA & OBSERVAÇÕES */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DEE4EA] space-y-4 shadow-xs">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                4. Cronograma & Observações (Alimenta o Gantt e o PDF)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#2C3E50]" />
                    Início Previsto
                  </Label>
                  <Input
                    type="date"
                    value={dataInicioPrevista}
                    onChange={(e) => setDataInicioPrevista(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#2C3E50]" />
                    Conclusão Prevista
                  </Label>
                  <Input
                    type="date"
                    value={dataFimPrevista}
                    onChange={(e) => setDataFimPrevista(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2C3E50]">
                    Validade da Proposta
                  </Label>
                  <Input
                    type="date"
                    value={validade}
                    onChange={(e) => setValidade(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#2C3E50]">
                  Observações Técnicas / Condições Especiais
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Fornecimento integral de perfis FVS, placas acartonadas, parafusos e tratamento de juntas. Mão de obra qualificada Bettone."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="text-xs bg-white resize-none"
                />
              </div>
            </div>

            <DialogFooter className="p-4 bg-white border-t border-[#DEE4EA] flex items-center justify-between sm:justify-end gap-2 sticky bottom-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs border-[#DEE4EA]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                size="sm"
                className="h-9 text-xs bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold px-5 shadow-sm"
              >
                {salvando
                  ? 'Salvando...'
                  : orcamentoParaEditar
                    ? 'Salvar Alterações'
                    : 'Salvar Orçamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL RÁPIDO: NOVO CLIENTE INLINE */}
      <Dialog open={modalNovoClienteOpen} onOpenChange={setModalNovoClienteOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="p-4 border-b border-[#DEE4EA] bg-white">
            <DialogTitle className="font-heading text-sm text-[#2C3E50]">
              Cadastrar Cliente Rápido
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarNovoCliente} className="p-4 space-y-3 bg-[#f4f4f4]">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#2C3E50]">Nome / Razão Social *</Label>
              <Input
                value={novoCliNome}
                onChange={(e) => setNovoCliNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo ou Senac"
                className="h-8 text-xs bg-white"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#2C3E50]">Grupo de Preços *</Label>
              <Select value={novoCliGrupo} onValueChange={setNovoCliGrupo}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {gruposList.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-xs">
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">WhatsApp</Label>
                <Input
                  value={novoCliWhats}
                  onChange={(e) => setNovoCliWhats(e.target.value)}
                  placeholder="(19) 99876-1234"
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#2C3E50]">Cidade</Label>
                <Input
                  value={novoCliCidade}
                  onChange={(e) => setNovoCliCidade(e.target.value)}
                  placeholder="São Pedro"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovoClienteOpen(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#D4AF37] hover:bg-[#B89425] text-[#2C3E50] font-bold text-xs h-8"
              >
                Salvar e Selecionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
