import React, { useState, useEffect } from 'react'
import type {
  Produto,
  CanalVenda,
  ItemOrcamento,
  ItemPorLocalOrcamento,
  StatusOrcamento,
  Orcamento,
  Cliente,
  ClienteGrupo,
  MetodoPagamento,
  OrcamentoServicoItem,
  OrcamentoConfiguracao,
  UnidadeMedida,
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
  Tag,
} from 'lucide-react'
import {
  gerarProximoNumeroOrcamento,
  criarOrcamento,
  atualizarOrcamento,
} from '@/services/orcamentos'
import {
  listarClientes,
  criarCliente,
  listarGrupos,
  listarMetodosPagamento,
  listarOrcamentoServicos,
  obterConfiguracoesOrcamento,
} from '@/services/orcamentoModulo'
import { formatarCondicoesPrazo } from '@/services/orcamentoCondicoes'
import { imprimirOrcamentoPDF } from '@/services/orcamentoPDF'
import {
  listarUnidadesMedida,
  calcularQuantidadePorDimensoes,
  identificarTipoFormula,
} from '@/services/unidadesMedida'
import { useToast } from '@/hooks/use-toast'

import type { OrcamentoEtapa } from '@/services/orcamentoEtapas'

interface OrcamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produtos: Produto[]
  etapas?: OrcamentoEtapa[]
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
  etapas = [],
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
  const [unidadesList, setUnidadesList] = useState<UnidadeMedida[]>([])
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
  const [status, setStatus] = useState<StatusOrcamento | string>('Orçamentos a realizar')
  const [produtoPrincipal, setProdutoPrincipal] = useState<string>('')
  const [validade, setValidade] = useState('')
  const [dataInicioPrevista, setDataInicioPrevista] = useState('')
  const [dataFimPrevista, setDataFimPrevista] = useState('')
  const [identificacao, setIdentificacao] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [desconto, setDesconto] = useState<string>('0')

  // Itens da tabela e Itens por Local
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [itensPorLocal, setItensPorLocal] = useState<ItemPorLocalOrcamento[]>([])

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
        const [c, g, m, s, u, cfg] = await Promise.all([
          listarClientes(),
          listarGrupos(),
          listarMetodosPagamento(),
          listarOrcamentoServicos(),
          listarUnidadesMedida(),
          obterConfiguracoesOrcamento(),
        ])
        setClientesList(c)
        setGruposList(g)
        setMetodosList(m)
        setServicosPrecoList(s)
        setUnidadesList(u)
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
      setIdentificacao(orcamentoParaEditar.identificacao || '')
      setObservacoes(orcamentoParaEditar.observacoes || '')
      setDesconto((orcamentoParaEditar.desconto || 0).toString())

      const parsedItens = Array.isArray(orcamentoParaEditar.itens)
        ? orcamentoParaEditar.itens
        : typeof orcamentoParaEditar.itens === 'string'
          ? JSON.parse(orcamentoParaEditar.itens)
          : []

      const parsedLocais = Array.isArray(orcamentoParaEditar.itens_por_local)
        ? orcamentoParaEditar.itens_por_local
        : typeof orcamentoParaEditar.itens_por_local === 'string'
          ? JSON.parse(orcamentoParaEditar.itens_por_local)
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
      setItensPorLocal(parsedLocais)
    } else {
      gerarProximoNumeroOrcamento().then((num) => setNumeroPrevisto(num))
      setClienteId('novo')
      setClienteNome('')
      setContato('')
      setCidade('São Pedro')
      setCanalOrigem('WhatsApp')
      setStatus('Orçamentos a realizar')
      setProdutoPrincipal(produtos[0]?.id || '')
      setValidade('')
      setDataInicioPrevista('')
      setDataFimPrevista('')
      setIdentificacao('')
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
      setItensPorLocal([
        {
          local: 'Sala',
          servico: 'Forro de gesso',
          metragem: 20,
          valor: 120,
          total: 2400,
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

  // Cálculos de subtotal (considera itens por local quando presentes)
  const subtotalLocais = itensPorLocal.reduce((acc, it) => acc + (it.total || 0), 0)
  const subtotalItens = itens.reduce((acc, it) => acc + (it.valor_total || 0), 0)
  const subtotal = itensPorLocal.length > 0 ? subtotalLocais : subtotalItens

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

  // Resolve a unidade efetiva do item (por unidade_id ou pela sigla legada)
  const unidadeEfetiva = (
    item: Pick<ItemOrcamento, 'unidade_id' | 'unidade' | 'metodo_calculo'>,
  ): UnidadeMedida | undefined => {
    if (item.unidade_id) return unidadesList.find((u) => u.id === item.unidade_id)
    if (item.unidade) return unidadesList.find((u) => u.sigla === item.unidade)
    return undefined
  }

  const metodoCalculoDe = (
    item: Pick<ItemOrcamento, 'unidade_id' | 'unidade' | 'metodo_calculo'>,
  ) => {
    const u = unidadeEfetiva(item)
    return u?.metodo_calculo ?? item.metodo_calculo ?? ''
  }

  // Resolve unidade padrão a partir de um serviço cadastrado
  const obterUnidadeDoServico = (
    serv: OrcamentoServicoItem | undefined,
  ): UnidadeMedida | undefined => {
    if (!serv) return undefined
    if (serv.unidade_padrao_id) {
      const u = unidadesList.find((x) => x.id === serv.unidade_padrao_id)
      if (u) return u
    }
    if (serv.unidade) {
      const u = unidadesList.find((x) => x.sigla === serv.unidade)
      if (u) return u
    }
    return undefined
  }

  // Gerenciamento dos itens por local
  const handleAddLinhaLocal = () => {
    const servicosDoGrupo = servicosPrecoList.filter((s) => !grupoId || s.grupo === grupoId)
    const primeiro = servicosDoGrupo[0]
    const unidPadraoGeral = unidadesList.find((u) => u.padrao) || unidadesList[0]
    const unidEscolhida = obterUnidadeDoServico(primeiro) || unidPadraoGeral
    setItensPorLocal((prev) => [
      ...prev,
      {
        local: prev.length === 0 ? 'Sala' : prev.length === 1 ? 'Banheiro' : 'Ambiente',
        servico: primeiro?.nome || 'Forro de gesso',
        servico_id: primeiro?.id,
        metragem: 10,
        unidade_id: unidEscolhida?.id,
        unidade: unidEscolhida?.sigla || 'm²',
        metodo_calculo: unidEscolhida?.metodo_calculo || '',
        valor: primeiro?.preco_unitario || 120,
        total: (primeiro?.preco_unitario || 120) * 10,
      },
    ])
  }

  const handleRemoveLinhaLocal = (index: number) => {
    setItensPorLocal((prev) => prev.filter((_, i) => i !== index))
  }

  const handleLinhaLocalChange = (
    index: number,
    campo: keyof ItemPorLocalOrcamento,
    valor: any,
  ) => {
    setItensPorLocal((prev) => {
      const novos = [...prev]
      const linha = { ...novos[index], [campo]: valor }

      if (campo === 'servico_id') {
        if (!valor || valor === 'manual') {
          linha.servico_id = undefined
        } else {
          const serv = servicosPrecoList.find((s) => s.id === valor)
          if (serv) {
            linha.servico = serv.nome
            linha.valor = serv.preco_unitario
            // Auto-preenchimento da unidade padrão ao (re)selecionar o serviço
            const unidServ = obterUnidadeDoServico(serv)
            if (unidServ) {
              linha.unidade_id = unidServ.id
              linha.unidade = unidServ.sigla
              linha.metodo_calculo = unidServ.metodo_calculo || ''
              if (identificarTipoFormula(linha.metodo_calculo) === 'livre') {
                linha.dimensao_a = undefined
                linha.dimensao_b = undefined
              }
              const calc = calcularQuantidadePorDimensoes(
                linha.dimensao_a,
                linha.dimensao_b,
                linha.metodo_calculo,
              )
              if (calc !== null) linha.metragem = calc
            }
          }
        }
      }

      if (campo === 'unidade_id') {
        const u = unidadesList.find((x) => x.id === valor)
        linha.unidade_id = valor || undefined
        linha.unidade = u?.sigla || ''
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
        if (calc !== null) linha.metragem = calc
      }

      if (campo === 'dimensao_a' || campo === 'dimensao_b') {
        const a = campo === 'dimensao_a' ? parseFloat(valor) || 0 : linha.dimensao_a || 0
        const b = campo === 'dimensao_b' ? parseFloat(valor) || 0 : linha.dimensao_b || 0
        linha.dimensao_a = a
        linha.dimensao_b = b
        const calc = calcularQuantidadePorDimensoes(a, b, linha.metodo_calculo)
        if (calc !== null) linha.metragem = calc
      }

      if (campo === 'metragem' || campo === 'valor' || campo === 'servico_id') {
        const m = Math.max(0, parseFloat(String(linha.metragem)) || 0)
        const v = Math.max(0, parseFloat(String(linha.valor)) || 0)
        linha.total = Math.round(m * v * 100) / 100
      }

      novos[index] = linha
      return novos
    })
  }

  // Gerenciamento dos itens
  const handleAddItem = () => {
    // Busca serviços do grupo selecionado
    const servicosDoGrupo = servicosPrecoList.filter((s) => !grupoId || s.grupo === grupoId)
    const primeiro = servicosDoGrupo[0]
    const unidPadraoGeral = unidadesList.find((u) => u.padrao) || unidadesList[0]
    const unidEscolhida = obterUnidadeDoServico(primeiro) || unidPadraoGeral

    setItens([
      ...itens,
      {
        servico_id: primeiro?.id,
        descricao: primeiro?.nome || 'Forros de gesso',
        quantidade: 1,
        unidade: unidEscolhida?.sigla || primeiro?.unidade || 'm²',
        unidade_id: unidEscolhida?.id,
        metodo_calculo: unidEscolhida?.metodo_calculo || '',
        valor_unitario: primeiro?.preco_unitario || 120,
        valor_total: primeiro?.preco_unitario || 120,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, campo: keyof ItemOrcamento, valor: any) => {
    setItens((prev) => {
      const novos = [...prev]
      const itemAtual = { ...novos[index], [campo]: valor }

      if (campo === 'servico_id') {
        if (!valor || valor === 'manual') {
          itemAtual.servico_id = undefined
        } else {
          const serv = servicosPrecoList.find((s) => s.id === valor)
          if (serv) {
            itemAtual.descricao = serv.nome
            itemAtual.valor_unitario = serv.preco_unitario
            // Auto-preenchimento da unidade padrão ao (re)selecionar o serviço
            const unidServ = obterUnidadeDoServico(serv)
            if (unidServ) {
              itemAtual.unidade_id = unidServ.id
              itemAtual.unidade = unidServ.sigla
              itemAtual.metodo_calculo = unidServ.metodo_calculo || ''
              if (identificarTipoFormula(itemAtual.metodo_calculo) === 'livre') {
                itemAtual.dimensao_a = undefined
                itemAtual.dimensao_b = undefined
              }
              const calc = calcularQuantidadePorDimensoes(
                itemAtual.dimensao_a,
                itemAtual.dimensao_b,
                itemAtual.metodo_calculo,
              )
              if (calc !== null) {
                itemAtual.quantidade = calc
              }
            } else {
              itemAtual.unidade = serv.unidade
            }
            itemAtual.valor_total =
              Math.round(itemAtual.quantidade * serv.preco_unitario * 100) / 100
          }
        }
      }

      // Se alterou a unidade de medida
      if (campo === 'unidade_id') {
        const u = unidadesList.find((x) => x.id === valor)
        itemAtual.unidade_id = valor || undefined
        itemAtual.unidade = u?.sigla || itemAtual.unidade
        itemAtual.metodo_calculo = u?.metodo_calculo || ''
        if (identificarTipoFormula(itemAtual.metodo_calculo) === 'livre') {
          itemAtual.dimensao_a = undefined
          itemAtual.dimensao_b = undefined
        }
        const calc = calcularQuantidadePorDimensoes(
          itemAtual.dimensao_a,
          itemAtual.dimensao_b,
          itemAtual.metodo_calculo,
        )
        if (calc !== null) {
          itemAtual.quantidade = calc
          itemAtual.valor_total = Math.round(calc * (itemAtual.valor_unitario || 0) * 100) / 100
        }
      }

      // Se alterou as dimensões A/B (cálculo pela unidade: AxB ou (A+B)x2)
      if (campo === 'dimensao_a' || campo === 'dimensao_b') {
        const a = campo === 'dimensao_a' ? parseFloat(valor) || 0 : itemAtual.dimensao_a || 0
        const b = campo === 'dimensao_b' ? parseFloat(valor) || 0 : itemAtual.dimensao_b || 0
        itemAtual.dimensao_a = a
        itemAtual.dimensao_b = b
        // Mantém largura/comprimento em sinc para compatibilidade do PDF
        itemAtual.largura = a
        itemAtual.comprimento = b
        const calc = calcularQuantidadePorDimensoes(a, b, itemAtual.metodo_calculo)
        if (calc !== null) {
          itemAtual.quantidade = calc
          itemAtual.valor_total = Math.round(calc * (itemAtual.valor_unitario || 0) * 100) / 100
        }
      }

      // Se alterou largura ou comprimento (cálculo dimensional legado)
      if (campo === 'largura' || campo === 'comprimento') {
        const l = campo === 'largura' ? parseFloat(valor) || 0 : itemAtual.largura || 0
        const c = campo === 'comprimento' ? parseFloat(valor) || 0 : itemAtual.comprimento || 0
        itemAtual.largura = l
        itemAtual.comprimento = c
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

    if (itens.length === 0 && itensPorLocal.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum item adicionado',
        description: 'Adicione pelo menos um serviço ou item por local ao orçamento.',
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
        itens_por_local: itensPorLocal,
        subtotal,
        desconto: descontoNum,
        valor_total: valorAPrazo,
        identificacao: identificacao?.trim() || undefined,
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
      // NUNCA incluir identificação interna no objeto enviado ao PDF do cliente
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
        <DialogContent className="max-w-6xl w-[95vw] lg:w-full max-h-[92vh] overflow-y-auto p-0 gap-0">
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

                {/* Identificação Interna (exibida no Kanban/Gantt/Tabela, NUNCA no PDF do cliente) */}
                <div className="sm:col-span-4 space-y-1.5 bg-[#f8fafc] p-2.5 rounded-lg border border-[#DEE4EA]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#2C3E50] flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Identificação Interna (Uso da Empresa)
                    </Label>
                    <span className="text-[10px] text-[#8A94A0]">
                      Visível no Kanban, Gantt e Tabela —{' '}
                      <strong>nunca sai no PDF do cliente</strong>
                    </span>
                  </div>
                  <Input
                    placeholder="Identificação interna — ex.: Senac ASP parede sala 8"
                    value={identificacao}
                    onChange={(e) => setIdentificacao(e.target.value)}
                    className="h-9 text-xs bg-white"
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
                  <Select value={status} onValueChange={(val: string) => setStatus(val)}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {(etapas.length > 0 ? etapas.map((e) => e.nome) : STATUS_OPTIONS).map(
                        (st) => (
                          <SelectItem key={st} value={st} className="text-xs">
                            {st}
                          </SelectItem>
                        ),
                      )}
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

            {/* SEÇÃO 2A: ITENS POR LOCAL / AMBIENTE (NOVA FUNCIONALIDADE) */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DEE4EA] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                    2. Detalhamento por Local / Ambiente ({itensPorLocal.length})
                  </h3>
                  <p className="text-[11px] text-[#616F7D] mt-0.5">
                    Ex: Sala | Forro de gesso | Metragem | Valor | Total da linha
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLinhaLocal}
                  className="h-8 text-xs text-[#2C3E50] border-[#D4AF37] hover:bg-[#D4AF37]/15 font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-[#D4AF37]" />+ Adicionar linha
                </Button>
              </div>

              <div className="space-y-2.5">
                {itensPorLocal.map((linha, idx) => {
                  const servicosDoGrupo = servicosPrecoList.filter(
                    (s) => !grupoId || s.grupo === grupoId,
                  )

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#f8fafc] rounded-xl border border-[#DEE4EA] flex flex-col md:flex-row md:items-end gap-3"
                    >
                      {/* Local / Ambiente */}
                      <div className="w-full md:w-44 shrink-0 space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">Local / Ambiente *</Label>
                        <Input
                          placeholder="Ex: Sala, Banheiro..."
                          value={linha.local}
                          onChange={(e) => handleLinhaLocalChange(idx, 'local', e.target.value)}
                          className="h-9 text-xs bg-white font-medium text-[#2C3E50]"
                        />
                      </div>

                      {/* Serviço / Descrição */}
                      <div className="w-full md:flex-1 md:min-w-[200px] space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">Serviço / Descrição *</Label>
                        <div className="space-y-1">
                          {servicosDoGrupo.length > 0 ? (
                            <Select
                              value={linha.servico_id || 'manual'}
                              onValueChange={(val) => {
                                if (val === 'manual') {
                                  handleLinhaLocalChange(idx, 'servico_id', '')
                                } else {
                                  handleLinhaLocalChange(idx, 'servico_id', val)
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="Selecione o serviço" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="manual"
                                  className="text-xs font-semibold text-[#2C3E50]"
                                >
                                  Texto livre / personalizado
                                </SelectItem>
                                {servicosDoGrupo.map((s) => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">
                                    {s.nome} ({formatMoeda(s.preco_unitario)}/{s.unidade})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : null}
                          {(!linha.servico_id || servicosDoGrupo.length === 0) && (
                            <Input
                              placeholder="Ex: Forro de gesso RU tabicado"
                              value={linha.servico}
                              onChange={(e) =>
                                handleLinhaLocalChange(idx, 'servico', e.target.value)
                              }
                              className="h-9 text-xs bg-white"
                            />
                          )}
                        </div>
                      </div>

                      {/* Unidade de Medida */}
                      <div className="w-full md:w-32 shrink-0 space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">Unidade</Label>
                        <Select
                          value={
                            linha.unidade_id ||
                            unidadesList.find((u) => u.sigla === linha.unidade)?.id ||
                            (unidadesList.find((u) => u.padrao) || unidadesList[0])?.id ||
                            ''
                          }
                          onValueChange={(val) => handleLinhaLocalChange(idx, 'unidade_id', val)}
                        >
                          <SelectTrigger className="h-9 text-xs bg-white">
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

                      {/* Bloco de Medidas e Valores: no mobile vira coluna única/grid legível, no desktop alinhado com espaço generoso sem truncar */}
                      <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-2 md:flex md:items-end gap-3 shrink-0">
                        {/* Dimensões A e B se o método não for livre */}
                        {identificarTipoFormula(metodoCalculoDe(linha)) !== 'livre' ? (
                          <div className="grid grid-cols-2 gap-2 sm:contents">
                            <div className="w-full md:w-24 space-y-1">
                              <Label
                                className="text-[10px] text-[#616F7D] font-semibold"
                                title="Largura / Lado A"
                              >
                                A (m)
                              </Label>
                              <Input
                                type="number"
                                step="any"
                                placeholder="0,00"
                                value={linha.dimensao_a ?? ''}
                                onChange={(e) =>
                                  handleLinhaLocalChange(idx, 'dimensao_a', e.target.value)
                                }
                                className="h-9 text-xs bg-white text-center px-2 min-w-[85px] font-mono font-medium"
                              />
                            </div>
                            <div className="w-full md:w-24 space-y-1">
                              <Label
                                className="text-[10px] text-[#616F7D] font-semibold"
                                title="Comprimento / Lado B"
                              >
                                B (m)
                              </Label>
                              <Input
                                type="number"
                                step="any"
                                placeholder="0,00"
                                value={linha.dimensao_b ?? ''}
                                onChange={(e) =>
                                  handleLinhaLocalChange(idx, 'dimensao_b', e.target.value)
                                }
                                className="h-9 text-xs bg-white text-center px-2 min-w-[85px] font-mono font-medium"
                              />
                            </div>
                          </div>
                        ) : null}

                        {/* Metragem / Quantidade */}
                        <div className="w-full md:w-28 space-y-1">
                          <Label className="text-[11px] text-[#616F7D] font-semibold">
                            Qtd ({linha.unidade || 'm²'})
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0.01"
                            placeholder="0,00"
                            value={linha.metragem}
                            onChange={(e) =>
                              handleLinhaLocalChange(idx, 'metragem', e.target.value)
                            }
                            className="h-9 text-xs bg-white text-center font-mono font-semibold px-2 min-w-[95px]"
                          />
                        </div>

                        {/* Valor Unitário */}
                        <div className="w-full md:w-32 space-y-1">
                          <Label className="text-[11px] text-[#616F7D] font-semibold">
                            Valor Unit. (R$)
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0,00"
                            value={linha.valor}
                            onChange={(e) => handleLinhaLocalChange(idx, 'valor', e.target.value)}
                            className="h-9 text-xs bg-white text-right font-mono px-2.5 min-w-[110px]"
                          />
                        </div>

                        {/* Total da Linha & Ação Excluir */}
                        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 pt-1 md:pt-0 sm:col-span-2">
                          <div className="flex-1 md:flex-none text-left md:text-right px-3 py-1.5 bg-[#E8EDF2] rounded-lg border border-[#2C3E50]/15 min-w-[110px]">
                            <span className="text-[9px] text-[#616F7D] block leading-tight">
                              Total da linha
                            </span>
                            <span className="font-bold text-xs font-mono text-[#2C3E50] block leading-tight">
                              {formatMoeda(linha.total)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLinhaLocal(idx)}
                            className="h-9 w-9 p-0 text-[#C4453C] hover:bg-[#FBEFEE] shrink-0"
                            title="Remover linha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {itensPorLocal.length === 0 && (
                  <div className="p-4 rounded-xl border border-dashed border-[#DEE4EA] text-center text-xs text-[#8A94A0]">
                    Nenhum ambiente adicionado. Clique em &quot;+ Adicionar linha&quot; para
                    discriminar por cômodo (Sala, Banheiro, etc.).
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 2B: ITENS ADICIONAIS / CATÁLOGO COMPLETO */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#DEE4EA] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#2C3E50] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  2. Itens Gerais / Adicionais ({itens.length})
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
                      className="p-3.5 bg-[#f8fafc] rounded-lg border border-[#DEE4EA] flex flex-col md:flex-row md:items-end gap-3"
                    >
                      {/* Seleção do Serviço na tabela */}
                      <div className="w-full md:w-56 shrink-0 space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">
                          Serviço da Tabela (
                          {gruposList.find((g) => g.id === grupoId)?.nome || 'Geral'})
                        </Label>
                        <Select
                          value={item.servico_id || 'manual'}
                          onValueChange={(val) => {
                            if (val === 'manual') {
                              handleItemChange(idx, 'servico_id', '')
                            } else {
                              handleItemChange(idx, 'servico_id', val)
                            }
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs bg-white">
                            <SelectValue placeholder="Escolha o serviço..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value="manual"
                              className="text-xs font-semibold text-[#2C3E50]"
                            >
                              Texto livre / personalizado
                            </SelectItem>
                            {servicosDoGrupo.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.nome} ({formatMoeda(s.preco_unitario)}/{s.unidade})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Descrição que aparece no PDF */}
                      <div className="w-full md:flex-1 md:min-w-[180px] space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">Descrição no PDF</Label>
                        <Input
                          value={item.descricao}
                          onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                          placeholder="Ex: Forros de gesso drywall"
                          className="h-9 text-xs bg-white font-medium text-[#2C3E50]"
                        />
                      </div>

                      {/* Seletor de Unidade de Medida */}
                      <div className="w-full md:w-32 shrink-0 space-y-1">
                        <Label className="text-[11px] text-[#616F7D]">Unidade</Label>
                        <Select
                          value={
                            item.unidade_id ||
                            unidadesList.find((u) => u.sigla === item.unidade)?.id ||
                            (unidadesList.find((u) => u.padrao) || unidadesList[0])?.id ||
                            ''
                          }
                          onValueChange={(val) => handleItemChange(idx, 'unidade_id', val)}
                        >
                          <SelectTrigger className="h-9 text-xs bg-white">
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

                      {/* Bloco de Medidas e Valores: no mobile coluna única/grid legível, no desktop espaçado e sem cortes */}
                      <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-2 md:flex md:items-end gap-3 shrink-0">
                        {/* Dimensões A e B se a unidade tiver cálculo dimensional */}
                        {identificarTipoFormula(metodoCalculoDe(item)) !== 'livre' ? (
                          <div className="grid grid-cols-2 gap-2 sm:contents">
                            <div className="w-full md:w-24 space-y-1">
                              <Label
                                className="text-[10px] text-[#616F7D] font-semibold"
                                title="Largura / Lado A"
                              >
                                A (m)
                              </Label>
                              <Input
                                type="number"
                                step="any"
                                placeholder="0,00"
                                value={item.dimensao_a ?? item.largura ?? ''}
                                onChange={(e) =>
                                  handleItemChange(idx, 'dimensao_a', e.target.value)
                                }
                                className="h-9 text-xs bg-white px-2 text-center min-w-[85px] font-mono font-medium"
                              />
                            </div>

                            <div className="w-full md:w-24 space-y-1">
                              <Label
                                className="text-[10px] text-[#616F7D] font-semibold"
                                title="Altura / Lado B"
                              >
                                B (m)
                              </Label>
                              <Input
                                type="number"
                                step="any"
                                placeholder="0,00"
                                value={item.dimensao_b ?? item.comprimento ?? ''}
                                onChange={(e) =>
                                  handleItemChange(idx, 'dimensao_b', e.target.value)
                                }
                                className="h-9 text-xs bg-white px-2 text-center min-w-[85px] font-mono font-medium"
                              />
                            </div>
                          </div>
                        ) : null}

                        {/* Quantidade (Área / Perímetro / Livre) */}
                        <div className="w-full md:w-28 space-y-1">
                          <Label className="text-[10px] text-[#616F7D] font-semibold">
                            Qtd ({item.unidade || 'm²'})
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0.01"
                            value={item.quantidade}
                            onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                            className="h-9 text-xs bg-white px-2 text-center font-mono font-semibold min-w-[95px]"
                          />
                        </div>

                        {/* Valor Unitário */}
                        <div className="w-full md:w-32 space-y-1">
                          <Label className="text-[10px] text-[#616F7D] font-semibold">
                            Unit. (R$)
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0,00"
                            value={item.valor_unitario}
                            onChange={(e) =>
                              handleItemChange(idx, 'valor_unitario', e.target.value)
                            }
                            className="h-9 text-xs bg-white px-2.5 text-right font-mono min-w-[110px]"
                          />
                        </div>

                        {/* Total & Excluir */}
                        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-2 pt-1 md:pt-0 sm:col-span-2">
                          <div className="flex-1 md:flex-none text-left md:text-right px-3 py-1.5 bg-[#E8EDF2] text-[#2C3E50] font-bold text-xs rounded-lg border border-[#2C3E50]/20 min-w-[110px]">
                            <span className="text-[9px] text-[#616F7D] block leading-tight font-normal">
                              Total
                            </span>
                            <span className="font-mono block leading-tight">
                              {formatMoeda(item.valor_total || 0)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(idx)}
                            className="h-9 w-9 p-0 text-[#C4453C] hover:bg-[#FBEFEE] shrink-0"
                            title="Remover serviço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
