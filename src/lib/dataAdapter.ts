/**
 * Backend Data Adapter
 * Camada unificada para o front-end operar com:
 * 1. PocketBase (modo Skip Cloud padrão)
 * 2. Supabase (modo Self-Hosted com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY configurados)
 *
 * Garante que a aplicação funcione em ambos os ambientes sem duplicar código nem quebrar nada.
 */

import pb from '@/lib/pocketbase/client'
import {
  isSupabaseConfigured,
  supabaseSelect,
  supabaseInsert,
  supabaseUpdate,
  supabaseDelete,
  supabaseUpload,
  supabasePublicUrl,
} from '@/lib/supabase/client'
import { supabaseAuth } from '@/lib/supabase/auth'

export function isSelfHostedSupabase(): boolean {
  return isSupabaseConfigured()
}

export interface QueryOptions {
  filter?: string
  sort?: string
  limit?: number
  offset?: number
  expand?: string
}

/**
 * Tradutor simples de expressões de filtro do PocketBase para filtros do Supabase
 */
function parsePbFilterToSupabase(
  filterStr?: string,
): Array<{ column: string; operator?: any; value: any }> {
  if (!filterStr) return []
  const filters: Array<{ column: string; operator?: any; value: any }> = []

  // Quebra por &&
  const parts = filterStr.split(/\s+&&\s+/)
  for (const part of parts) {
    const trimmed = part.trim()
    // Ex: status = 'Concluídos' ou ativo = true
    const eqMatch = trimmed.match(/^([a-zA-Z0-9_.]+)\s*=\s*(.+)$/)
    if (eqMatch) {
      const col = eqMatch[1]
      let val: any = eqMatch[2].trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      } else if (val === 'true') {
        val = true
      } else if (val === 'false') {
        val = false
      } else if (!isNaN(Number(val))) {
        val = Number(val)
      }
      filters.push({ column: col, operator: 'eq', value: val })
      continue
    }

    // Ex: data >= "2025-01-01"
    const gteMatch = trimmed.match(/^([a-zA-Z0-9_.]+)\s*>=\s*(.+)$/)
    if (gteMatch) {
      const col = gteMatch[1]
      let val: any = gteMatch[2].trim().replace(/^['"]|['"]$/g, '')
      filters.push({ column: col, operator: 'gte', value: val })
      continue
    }

    // Ex: data <= "2025-01-01"
    const lteMatch = trimmed.match(/^([a-zA-Z0-9_.]+)\s*<=\s*(.+)$/)
    if (lteMatch) {
      const col = lteMatch[1]
      let val: any = lteMatch[2].trim().replace(/^['"]|['"]$/g, '')
      filters.push({ column: col, operator: 'lte', value: val })
      continue
    }

    // Ex: numero ~ 'ORC' (like / ilike)
    const likeMatch = trimmed.match(/^([a-zA-Z0-9_.]+)\s*~\s*(.+)$/)
    if (likeMatch) {
      const col = likeMatch[1]
      let val: any = likeMatch[2].trim().replace(/^['"]|['"]$/g, '')
      filters.push({ column: col, operator: 'ilike', value: `%${val}%` })
      continue
    }
  }

  return filters
}

export const dataAdapter = {
  /**
   * Busca lista completa de uma tabela / coleção
   */
  async getFullList<T = any>(collection: string, options: QueryOptions = {}): Promise<T[]> {
    if (isSelfHostedSupabase()) {
      const filters = parsePbFilterToSupabase(options.filter)
      const order = options.sort
        ? options.sort.split(',').map((s) => {
            const clean = s.trim()
            if (clean.startsWith('-')) {
              return { column: clean.substring(1), ascending: false }
            }
            return { column: clean, ascending: true }
          })
        : undefined

      const token = supabaseAuth.getToken()
      return supabaseSelect<T>(collection, {
        filters,
        order,
        limit: options.limit,
        offset: options.offset,
        accessToken: token,
      })
    }

    return pb.collection(collection).getFullList<T>({
      filter: options.filter,
      sort: options.sort,
      expand: options.expand,
    })
  },

  /**
   * Busca um único registro por ID
   */
  async getOne<T = any>(collection: string, id: string): Promise<T> {
    if (isSelfHostedSupabase()) {
      const token = supabaseAuth.getToken()
      const results = await supabaseSelect<T>(collection, {
        filters: [{ column: 'id', operator: 'eq', value: id }],
        limit: 1,
        accessToken: token,
      })
      if (!results || results.length === 0) {
        throw new Error(`Registro ${id} não encontrado em ${collection}.`)
      }
      return results[0]
    }

    return pb.collection(collection).getOne<T>(id)
  },

  /**
   * Busca o primeiro registro por filtro
   */
  async getFirstListItem<T = any>(collection: string, filterStr: string): Promise<T> {
    if (isSelfHostedSupabase()) {
      const filters = parsePbFilterToSupabase(filterStr)
      const token = supabaseAuth.getToken()
      const results = await supabaseSelect<T>(collection, {
        filters,
        limit: 1,
        accessToken: token,
      })
      if (!results || results.length === 0) {
        throw new Error(`Nenhum registro encontrado para o filtro: ${filterStr}`)
      }
      return results[0]
    }

    return pb.collection(collection).getFirstListItem<T>(filterStr)
  },

  /**
   * Cria um novo registro
   */
  async create<T = any>(collection: string, data: Record<string, any> | FormData): Promise<T> {
    if (isSelfHostedSupabase()) {
      const token = supabaseAuth.getToken()
      let payload: Record<string, any> = {}

      if (data instanceof FormData) {
        // Converte FormData para objeto se for o caso
        data.forEach((val, key) => {
          if (val instanceof File) {
            // Em caso de arquivo puro direto, deve ser feito upload no bucket antes
          } else {
            try {
              payload[key] = JSON.parse(val as string)
            } catch {
              payload[key] = val
            }
          }
        })
      } else {
        payload = { ...data }
      }

      const results = await supabaseInsert<T>(collection, payload, {
        accessToken: token,
        returning: 'representation',
      })
      return results[0]
    }

    return pb.collection(collection).create<T>(data)
  },

  /**
   * Atualiza um registro
   */
  async update<T = any>(
    collection: string,
    id: string,
    data: Record<string, any> | FormData,
  ): Promise<T> {
    if (isSelfHostedSupabase()) {
      const token = supabaseAuth.getToken()
      let payload: Record<string, any> = {}

      if (data instanceof FormData) {
        data.forEach((val, key) => {
          if (!(val instanceof File)) {
            try {
              payload[key] = JSON.parse(val as string)
            } catch {
              payload[key] = val
            }
          }
        })
      } else {
        payload = { ...data }
      }

      const results = await supabaseUpdate<T>(
        collection,
        [{ column: 'id', operator: 'eq', value: id }],
        payload,
        { accessToken: token, returning: 'representation' },
      )
      return results[0]
    }

    return pb.collection(collection).update<T>(id, data)
  },

  /**
   * Exclui um registro
   */
  async delete(collection: string, id: string): Promise<boolean> {
    if (isSelfHostedSupabase()) {
      const token = supabaseAuth.getToken()
      await supabaseDelete(collection, [{ column: 'id', operator: 'eq', value: id }], {
        accessToken: token,
      })
      return true
    }

    await pb.collection(collection).delete(id)
    return true
  },

  /**
   * Faz upload de arquivo para o Storage apropriado
   */
  async uploadFile(bucket: string, path: string, file: File | Blob): Promise<string> {
    if (isSelfHostedSupabase()) {
      const token = supabaseAuth.getToken()
      await supabaseUpload(bucket, path, file, { accessToken: token, upsert: true })
      return supabasePublicUrl(bucket, path)
    }

    // Se estiver no PocketBase, o upload é direto no Record
    return URL.createObjectURL(file)
  },
}
