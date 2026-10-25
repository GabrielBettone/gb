import PocketBase from 'pocketbase'

/**
 * Resolve a URL base do PocketBase de forma ambiente-agnóstica:
 * 1. Variável de ambiente VITE_POCKETBASE_URL (definida na Skip ou via Vite build .env)
 * 2. Em ambiente de navegador quando não definida, usa a mesma origem window.location.origin
 *    (padrão no self-hosted onde front-end e backend são servidos no mesmo domínio/porta ou proxy reverso)
 * 3. Fallback seguro para string vazia
 */
export function getPocketBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_POCKETBASE_URL as string | undefined)?.trim()
  if (envUrl) {
    return envUrl.replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return ''
}

const pb = new PocketBase(getPocketBaseUrl())
pb.autoCancellation(false)

export default pb
