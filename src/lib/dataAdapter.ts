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
  supabaseGetPublicUrl,
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
    let trimmed = part.trim()
    // Caso haja agrupamento com parênteses
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      trimmed = trimmed.substring(1, trimmed.length - 1).trim()
    }

    // Se houver || interno (ex: col = a || col = b), pega o primeiro ou trata
    if (trimmed.includes('||')) {
      const orParts = trimmed.split(/\s*\|\|\s*/)
      trimmed = orParts[0].trim()
    }

    // Ex: status != 'cancelada'
    const neqMatch = trimmed.match(/^([a-zA-Z0-9_.]+)\s*!=\s*(.+)$/)
    if (neqMatch) {
      const col = neqMatch[1]
      let val: any = neqMatch[2].trim()
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
      filters.push({ column: col, operator: 'neq', value: val })
      continue
    }

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

async function enrichSupabaseExpands(
  records: any[],
  expandStr?: string,
  token?: string | null,
): Promise<void> {
  if (!expandStr || !Array.isArray(records) || records.length === 0) return
  const expandKeys = expandStr
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  for (const expandKey of expandKeys) {
    if (expandKey === 'orcamento') {
      const orcIds = Array.from(
        new Set(records.map((r) => r.orcamento).filter(Boolean)),
      ) as string[]
      if (orcIds.length > 0) {
        try {
          const orcs = await supabaseSelect<any>('orcamentos', {
            filters: [{ column: 'id', operator: 'in', value: orcIds }],
            accessToken: token || undefined,
          })
          const orcMap = new Map(orcs.map((o) => [o.id, o]))
          records.forEach((r) => {
            if (r.orcamento && orcMap.has(r.orcamento)) {
              r.expand = { ...(r.expand || {}), orcamento: orcMap.get(r.orcamento) }
            }
          })
        } catch (err) {
          console.warn('Erro ao expandir orcamento via Supabase:', err)
        }
      }
    } else if (expandKey === 'produto') {
      const prodIds = Array.from(new Set(records.map((r) => r.produto).filter(Boolean))) as string[]
      if (prodIds.length > 0) {
        try {
          const prods = await supabaseSelect<any>('produtos', {
            filters: [{ column: 'id', operator: 'in', value: prodIds }],
            accessToken: token || undefined,
          })
          const prodMap = new Map(prods.map((p) => [p.id, p]))
          records.forEach((r) => {
            if (r.produto && prodMap.has(r.produto)) {
              r.expand = { ...(r.expand || {}), produto: prodMap.get(r.produto) }
            }
          })
        } catch (err) {
          console.warn('Erro ao expandir produto via Supabase:', err)
        }
      }
    } else if (expandKey === 'grupo') {
      const grupoIds = Array.from(new Set(records.map((r) => r.grupo).filter(Boolean))) as string[]
      if (grupoIds.length > 0) {
        try {
          const grupos = await supabaseSelect<any>('clientes_grupos', {
            filters: [{ column: 'id', operator: 'in', value: grupoIds }],
            accessToken: token || undefined,
          })
          const grupoMap = new Map(grupos.map((g) => [g.id, g]))
          records.forEach((r) => {
            if (r.grupo && grupoMap.has(r.grupo)) {
              r.expand = { ...(r.expand || {}), grupo: grupoMap.get(r.grupo) }
            }
          })
        } catch (err) {
          console.warn('Erro ao expandir grupo via Supabase:', err)
        }
      }
    } else if (expandKey === 'produto_principal') {
      const prodIds = Array.from(
        new Set(records.map((r) => r.produto_principal).filter(Boolean)),
      ) as string[]
      if (prodIds.length > 0) {
        try {
          const prods = await supabaseSelect<any>('produtos', {
            filters: [{ column: 'id', operator: 'in', value: prodIds }],
            accessToken: token || undefined,
          })
          const prodMap = new Map(prods.map((p) => [p.id, p]))
          records.forEach((r) => {
            if (r.produto_principal && prodMap.has(r.produto_principal)) {
              r.expand = {
                ...(r.expand || {}),
                produto_principal: prodMap.get(r.produto_principal),
              }
            }
          })
        } catch (err) {
          console.warn('Erro ao expandir produto_principal via Supabase:', err)
        }
      }
    } else if (expandKey === 'metodo_pagamento') {
      const metIds = Array.from(
        new Set(records.map((r) => r.metodo_pagamento).filter(Boolean)),
      ) as string[]
      if (metIds.length > 0) {
        try {
          const mets = await supabaseSelect<any>('metodos_pagamento', {
            filters: [{ column: 'id', operator: 'in', value: metIds }],
            accessToken: token || undefined,
          })
          const metMap = new Map(mets.map((m) => [m.id, m]))
          records.forEach((r) => {
            if (r.metodo_pagamento && metMap.has(r.metodo_pagamento)) {
              r.expand = {
                ...(r.expand || {}),
                metodo_pagamento: metMap.get(r.metodo_pagamento),
              }
            }
          })
        } catch (err) {
          console.warn('Erro ao expandir metodo_pagamento via Supabase:', err)
        }
      }
    } else if (expandKey === 'cliente_cadastrado') {
      const cliIds = Array.from(
        new Set(records.map((r) => r.cliente_cadastrado).filter(Boolean)),
      ) as string[]
      if (cliIds.length > 0) {
        try {
          const clis = await supabaseSelect<any>('clientes', {
            filters: [{ column: 'id', operator: 'in', value: cliIds }],
            accessToken: token || undefined,
          })
          const cliMap = new Map(clis.map((c) => [c.id, c]))
          records.forEach((r) => {
            if (r.cliente_cadastrado && cliMap.has(r.cliente_cadastrado)) {
              r.expand = {
                ...(r.expand || {}),
                cliente_cadastrado: cliMap.get(r.cliente_cadastrado),
              }
            }
          })
        } catch (err) {
          console.warn('Erro ao expandir cliente_cadastrado via Supabase:', err)
        }
      }
    }
  }
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
            let clean = s.trim()
            let ascending = true
            if (clean.startsWith('-')) {
              ascending = false
              clean = clean.substring(1)
            } else if (clean.startsWith('+')) {
              clean = clean.substring(1)
            }
            // Mapeia colunas comuns PocketBase -> Supabase PostgreSQL
            if (clean === 'created') clean = 'created_at'
            if (clean === 'updated') clean = 'updated_at'
            return { column: clean, ascending }
          })
        : undefined

      const token = (await supabaseAuth.getValidToken()) || supabaseAuth.getToken()
      const records = await supabaseSelect<any>(collection, {
        filters,
        order,
        limit: options.limit,
        offset: options.offset,
        accessToken: token || undefined,
      })

      // Expansão leve para compatibilidade com PB (ex: expand: 'orcamento,produto,grupo')
      if (options.expand && Array.isArray(records) && records.length > 0) {
        await enrichSupabaseExpands(records, options.expand, token)
      }

      return records as T[]
    }

    return pb.collection(collection).getFullList<T>({
      filter: options.filter,
      sort: options.sort,
      expand: options.expand,
    })
  },

  /**
   * Busca lista paginada de uma tabela / coleção
   */
  async getList<T = any>(
    collection: string,
    page: number = 1,
    perPage: number = 30,
    options: QueryOptions = {},
  ): Promise<{
    page: number
    perPage: number
    totalItems: number
    totalPages: number
    items: T[]
  }> {
    if (isSelfHostedSupabase()) {
      const filters = parsePbFilterToSupabase(options.filter)
      const order = options.sort
        ? options.sort.split(',').map((s) => {
            let clean = s.trim()
            let ascending = true
            if (clean.startsWith('-')) {
              ascending = false
              clean = clean.substring(1)
            } else if (clean.startsWith('+')) {
              clean = clean.substring(1)
            }
            if (clean === 'created') clean = 'created_at'
            if (clean === 'updated') clean = 'updated_at'
            return { column: clean, ascending }
          })
        : undefined

      const token = (await supabaseAuth.getValidToken()) || supabaseAuth.getToken()
      const offset = (Math.max(1, page) - 1) * perPage

      const results = await supabaseSelect<T>(collection, {
        filters,
        order,
        limit: perPage,
        offset,
        accessToken: token || undefined,
      })

      const items = Array.isArray(results) ? results : []
      if (options.expand && items.length > 0) {
        await enrichSupabaseExpands(items, options.expand, token)
      }
      return {
        page,
        perPage,
        totalItems: items.length,
        totalPages: 1,
        items,
      }
    }

    const pbRes = await pb.collection(collection).getList<T>(page, perPage, {
      filter: options.filter,
      sort: options.sort,
      expand: options.expand,
    })
    return {
      page: pbRes.page,
      perPage: pbRes.perPage,
      totalItems: pbRes.totalItems,
      totalPages: pbRes.totalPages,
      items: pbRes.items,
    }
  },

  /**
   * Busca um único registro por ID
   */
  async getOne<T = any>(collection: string, id: string): Promise<T> {
    if (isSelfHostedSupabase()) {
      const token = (await supabaseAuth.getValidToken()) || supabaseAuth.getToken()
      const results = await supabaseSelect<T>(collection, {
        filters: [{ column: 'id', operator: 'eq', value: id }],
        limit: 1,
        accessToken: token || undefined,
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
      const token = (await supabaseAuth.getValidToken()) || supabaseAuth.getToken()
      const results = await supabaseSelect<T>(collection, {
        filters,
        limit: 1,
        accessToken: token || undefined,
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
      const token = (await supabaseAuth.getValidToken()) || supabaseAuth.getToken()
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
        accessToken: token || undefined,
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
      const token = (await supabaseAuth.getValidToken()) || supabaseAuth.getToken()
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
        { accessToken: token || undefined, returning: 'representation' },
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
      const token = (await supabaseAuth.getValidToken()) || supabaseAuth.getToken()
      await supabaseDelete(collection, [{ column: 'id', operator: 'eq', value: id }], {
        accessToken: token || undefined,
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
      const token = (await supabaseAuth.getValidToken()) || supabaseAuth.getToken()
      await supabaseUpload(bucket, path, file, { accessToken: token || undefined, upsert: true })
      return supabaseGetPublicUrl(bucket, path)
    }

    // Se estiver no PocketBase, o upload é direto no Record
    return URL.createObjectURL(file)
  },

  /**
   * Salva FormData com suporte a upload de arquivos tanto no PocketBase quanto no Supabase
   */
  async upload<T = Record<string, unknown>>(
    collection: string,
    formData: FormData,
    id?: string,
  ): Promise<T> {
    if (isSelfHostedSupabase()) {
      const payload: Record<string, unknown> = {}
      const bucketName = collection.includes('simulador') ? 'simulador' : 'public-media'
      const timestamp = Date.now()
      const token = (await supabaseAuth.getValidToken()) || supabaseAuth.getToken()

      for (const [key, val] of formData.entries()) {
        const isFileOrBlob =
          typeof val === 'object' && val !== null && 'size' in val && 'type' in val
        if (isFileOrBlob) {
          const fileObj = val as unknown as File | Blob
          const fileName = 'name' in fileObj ? (fileObj as File).name : `file_${timestamp}.jpg`
          const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
          const storagePath = `${collection}/${id || 'new'}_${timestamp}_${cleanName}`

          await supabaseUpload(bucketName, storagePath, fileObj, {
            accessToken: token || undefined,
            contentType: fileObj.type || 'application/octet-stream',
            upsert: true,
          })
          const publicUrl = supabaseGetPublicUrl(bucketName, storagePath)

          if (key in payload) {
            const current = payload[key]
            if (Array.isArray(current)) {
              current.push(publicUrl)
            } else {
              payload[key] = [current, publicUrl]
            }
          } else {
            payload[key] = publicUrl
          }
        } else {
          try {
            if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
              payload[key] = JSON.parse(val)
            } else {
              payload[key] = val
            }
          } catch {
            payload[key] = val
          }
        }
      }

      if (id) {
        return (await dataAdapter.update<T>(collection, id, payload)) as T
      }
      return (await dataAdapter.create<T>(collection, payload)) as T
    }

    if (id) {
      return (await pb.collection(collection).update(id, formData)) as T
    }
    return (await pb.collection(collection).create(formData)) as T
  },
}
