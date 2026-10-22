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
  }
  canal: CanalVenda
  cidade?: string
  valor: number
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
