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

export interface Venda extends RecordModel {
  data: string
  cliente: string
  produto: string
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

export interface ItemOrcamento {
  produto_id?: string
  descricao: string
  quantidade: number
  unidade?: string
  valor_unitario: number
  valor_total: number
}

export interface Orcamento extends RecordModel {
  numero: string
  cliente: string
  contato?: string
  cidade?: string
  canal_origem: CanalVenda
  status: StatusOrcamento
  produto_principal?: string
  expand?: {
    produto_principal?: Produto
  }
  itens?: ItemOrcamento[] | string
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
