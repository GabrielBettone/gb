import type { RecordModel } from 'pocketbase'

export interface User extends RecordModel {
  email: string
  name?: string
  avatar?: string
}

export interface Produto extends RecordModel {
  nome: string
  descricao?: string
  ativo: boolean
}

export type CanalVenda = 'WhatsApp' | 'E-mail' | 'Instagram' | 'Loja física'

export interface ItemVenda {
  produto_id?: string
  nome: string
  quantidade: number
  valor_unitario: number
  total: number
  unidade_id?: string
  unidade?: string
  metodo_calculo?: string
  dimensao_a?: number
  dimensao_b?: number
}

export interface Venda extends RecordModel {
  data: string
  cliente: string
  produto: string
  itens?: ItemVenda[] | string
  expand?: {
    produto?: Produto
    orcamento?: Orcamento
  }
  canal: CanalVenda
  cidade?: string
  valor: number
  orcamento?: string
}

export type StatusOrcamento =
  | 'Orçamentos a realizar'
  | 'Aguardando aprovação'
  | 'Aprovados aguardando início'
  | 'Trabalhos iniciados'
  | 'Concluídos'
  | (string & {})

export interface ItemOrcamento {
  produto_id?: string
  servico_id?: string
  descricao: string
  quantidade: number
  unidade?: string
  unidade_id?: string
  metodo_calculo?: string
  valor_unitario: number
  valor_total: number
  // Para cálculo por largura × comprimento ou dimensões A e B
  largura?: number
  comprimento?: number
  dimensao_a?: number
  dimensao_b?: number
}

export interface ItemPorLocalOrcamento {
  local: string
  servico: string
  servico_id?: string
  metragem: number
  unidade?: string
  unidade_id?: string
  metodo_calculo?: string
  dimensao_a?: number
  dimensao_b?: number
  valor: number
  total: number
}

export interface UnidadeMedida extends RecordModel {
  nome: string
  sigla: string
  metodo_calculo?: string // ex: "AxB", "(A+B)x2", ou em branco
  ordem?: number
  ativo: boolean
  padrao?: boolean
}

export interface ClienteGrupo extends RecordModel {
  nome: string
  descricao?: string
  ativo: boolean
  padrao?: boolean
}

export interface Cliente extends RecordModel {
  nome: string
  grupo: string
  documento?: string
  whatsapp?: string
  email?: string
  cidade?: string
  endereco?: string
  observacoes?: string
  expand?: {
    grupo?: ClienteGrupo
  }
}

export interface OrcamentoServicoItem extends RecordModel {
  nome: string
  grupo: string
  modo_calculo: 'area' | 'dimensoes'
  unidade: string
  unidade_padrao_id?: string
  preco_unitario: number
  descricao_pdf?: string
  ativo: boolean
  site_service?: string
  expand?: {
    grupo?: ClienteGrupo
    unidade_padrao?: UnidadeMedida
  }
}

export interface MetodoPagamento extends RecordModel {
  nome: string
  desconto_a_vista?: number // %
  condicoes?: string[] | string // JSON array de strings
  numero_parcelas?: number
  padrao?: boolean
  ativo: boolean
}

export interface OrcamentoConfiguracao extends RecordModel {
  chave: string
  razao_social?: string
  nome_fantasia?: string
  cnpj?: string
  exibir_cnpj_padrao?: boolean
  nosso_compromisso?: string[] | string
  telefone?: string
  email?: string
  endereco?: string
  cidade?: string
}

export type StatusParcela = 'a_pagar' | 'parcial' | 'paga' | 'cancelada'

export interface ParcelaRecebimento extends RecordModel {
  parcela: string
  parcela_id?: string
  orcamento?: string
  orcamento_id?: string
  valor: number
  data_pagamento: string
  forma_pagamento: string
  observacao?: string
}

export interface PagamentoParcela extends RecordModel {
  orcamento: string
  orcamento_id?: string
  numero_parcela: number
  total_parcelas: number
  descricao?: string
  valor_previsto: number
  data_vencimento: string
  status: StatusParcela
  data_pagamento?: string
  valor_pago?: number
  ajuste?: number
  forma_pagamento?: string
  observacoes_baixa?: string
  recebimentos?: ParcelaRecebimento[]
  expand?: {
    orcamento?: Orcamento
    recebimentos?: ParcelaRecebimento[]
  }
}

export interface Orcamento extends RecordModel {
  numero: string
  cliente: string
  contato?: string
  cidade?: string
  canal_origem: CanalVenda
  status: StatusOrcamento
  produto_principal?: string
  cliente_cadastrado?: string
  grupo?: string
  metodo_pagamento?: string
  valor_a_vista?: number
  valor_a_prazo?: number
  exibir_cnpj?: boolean
  identificacao?: string
  expand?: {
    produto_principal?: Produto
    cliente_cadastrado?: Cliente
    grupo?: ClienteGrupo
    metodo_pagamento?: MetodoPagamento
  }
  itens?: ItemOrcamento[] | string
  itens_por_local?: ItemPorLocalOrcamento[] | string
  subtotal?: number
  desconto?: number
  valor_total: number
  data_inicio_prevista?: string
  data_fim_prevista?: string
  data_conclusao?: string
  validade?: string
  observacoes?: string
}

export type IndicadorTipo = 'faturamento' | 'ticket_medio' | 'quantidade'
export type ComparacaoTipo = 'acima' | 'abaixo' | 'variacao_percentual'

export interface RegraAlerta extends RecordModel {
  nome: string
  indicador: IndicadorTipo
  comparacao: ComparacaoTipo
  limite: number
  habilitada: boolean
}

export interface Alerta extends RecordModel {
  regra: string
  expand?: {
    regra?: RegraAlerta
  }
  tipo: 'positivo' | 'negativo'
  mensagem: string
  valor_atual: number
  lido: boolean
}

export interface Importacao extends RecordModel {
  data: string
  arquivo: string
  total_registros: number
}

export interface FiltrosGlobais {
  periodoPredefinido: '7d' | '30d' | 'mes' | '3m' | 'ano' | 'tudo' | 'custom'
  dataInicio?: string
  dataFim?: string
  produtoId?: string
  canal?: CanalVenda | ''
}
