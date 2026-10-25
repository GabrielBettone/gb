/**
 * Supabase Auth Minimal Client
 * Autenticação completa via e-mail e senha usando a API REST nativa do Supabase GoTrue (/auth/v1)
 * Não requer pacotes externos pesados, suporta persistência local em localStorage
 * e emite eventos de mudança de estado de autenticação compatíveis com a aplicação.
 */

import { isSupabaseConfigured } from './client'

export interface SupabaseUser {
  id: string
  email: string
  name?: string
  role?: string
  avatar_url?: string
  created_at?: string
}

export interface SupabaseSession {
  access_token: string
  token_type: string
  expires_in: number
  expires_at?: number // timestamp em milissegundos indicando expiração absoluta
  refresh_token: string
  user: SupabaseUser
}

const STORAGE_KEY = 'bettone_supabase_auth_session'
type AuthChangeCallback = (user: SupabaseUser | null) => void

class SupabaseAuthManager {
  private currentSession: SupabaseSession | null = null
  private listeners: Set<AuthChangeCallback> = new Set()
  private refreshPromise: Promise<string | null> | null = null
  private refreshTimer: any = null

  constructor() {
    this.loadFromStorage()
    this.setupAutoRefresh()
    this.setupWindowListeners()
  }

  private getAuthBaseUrl(): string {
    const env = import.meta.env as Record<string, string | undefined>
    const url = (env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '')
    return `${url}/auth/v1`
  }

  private getApiKey(): string {
    const env = import.meta.env as Record<string, string | undefined>
    return (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim()
  }

  private parseJwtExpiry(token: string): number | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const base64Url = parts[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      )
      const parsed = JSON.parse(jsonPayload)
      if (parsed && typeof parsed.exp === 'number') {
        return parsed.exp * 1000
      }
    } catch {
      // Ignora erro ao decodificar JWT
    }
    return null
  }

  private calculateExpiresAt(token: string, expiresIn?: number): number {
    const fromJwt = this.parseJwtExpiry(token)
    if (fromJwt) return fromJwt
    const seconds = expiresIn && expiresIn > 0 ? expiresIn : 3600
    return Date.now() + seconds * 1000
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SupabaseSession
        if (parsed && parsed.access_token) {
          if (!parsed.expires_at) {
            parsed.expires_at = this.calculateExpiresAt(parsed.access_token, parsed.expires_in)
          }
          this.currentSession = parsed
        }
      }
    } catch {
      this.currentSession = null
    }
  }

  private saveSession(session: SupabaseSession | null) {
    this.currentSession = session
    if (session) {
      if (!session.expires_at) {
        session.expires_at = this.calculateExpiresAt(session.access_token, session.expires_in)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    this.setupAutoRefresh()
    this.notify()
  }

  private setupWindowListeners() {
    if (typeof window === 'undefined') return

    // Quando a aba volta a ter foco ou ficar visível após ficar em segundo plano
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isAuthenticated()) {
        this.checkAndRefreshPreventively().catch(() => {})
      }
    })

    window.addEventListener('focus', () => {
      if (this.isAuthenticated()) {
        this.checkAndRefreshPreventively().catch(() => {})
      }
    })

    // Sincroniza abas via evento de storage
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          if (e.newValue) {
            this.currentSession = JSON.parse(e.newValue)
          } else {
            this.currentSession = null
          }
          this.notify()
        } catch {
          // ignore
        }
      }
    })
  }

  private setupAutoRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }

    if (!this.currentSession || !this.currentSession.refresh_token) {
      return
    }

    const expiresAt =
      this.currentSession.expires_at ||
      this.calculateExpiresAt(this.currentSession.access_token, this.currentSession.expires_in)

    // Agendar renovação para 5 minutos antes de expirar (buffer de 300 segundos)
    const BUFFER_MS = 5 * 60 * 1000
    const delay = Math.max(expiresAt - Date.now() - BUFFER_MS, 5000)

    // setTimeout seguro (máx ~24 dias)
    const safeDelay = Math.min(delay, 0x7fffffff)
    this.refreshTimer = setTimeout(() => {
      this.checkAndRefreshPreventively().catch((err) => {
        console.warn('Erro na renovação agendada de sessão:', err)
      })
    }, safeDelay)
  }

  private notify() {
    const user = this.getUser()
    for (const listener of this.listeners) {
      try {
        listener(user)
      } catch (err) {
        console.error('Erro no listener de auth do Supabase:', err)
      }
    }
  }

  public onAuthStateChange(callback: AuthChangeCallback): () => void {
    this.listeners.add(callback)
    callback(this.getUser())
    return () => this.listeners.delete(callback)
  }

  public getSession(): SupabaseSession | null {
    return this.currentSession
  }

  public getUser(): SupabaseUser | null {
    return this.currentSession?.user || null
  }

  public getToken(): string | undefined {
    return this.currentSession?.access_token
  }

  /**
   * Verifica se o token expirou ou está prestes a expirar dentro de um buffer de segurança.
   */
  public isTokenExpiredOrExpiringSoon(bufferSeconds = 300): boolean {
    if (!this.currentSession?.access_token) return true
    const expiresAt =
      this.currentSession.expires_at ||
      this.calculateExpiresAt(this.currentSession.access_token, this.currentSession.expires_in)
    return Date.now() + bufferSeconds * 1000 >= expiresAt
  }

  /**
   * Obtém um token de acesso válido, renovando preventivamente se estiver próximo da expiração.
   */
  public async getValidToken(): Promise<string | null> {
    if (!this.currentSession) return null

    if (this.isTokenExpiredOrExpiringSoon(120)) {
      try {
        const refreshedToken = await this.refreshToken()
        if (refreshedToken) return refreshedToken
      } catch (err) {
        console.warn('Tentativa preventiva de refresh falhou:', err)
      }
    }

    return this.currentSession?.access_token || null
  }

  /**
   * Renova a sessão usando o refresh_token atual.
   * Evita chamadas simultâneas duplicadas retornando a mesma Promise em andamento.
   */
  public async refreshToken(): Promise<string | null> {
    if (!this.currentSession?.refresh_token) {
      return null
    }

    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      try {
        const baseUrl = this.getAuthBaseUrl()
        const apiKey = this.getApiKey()
        const refreshToken = this.currentSession?.refresh_token

        if (!refreshToken) {
          throw new Error('Nenhum refresh token disponível.')
        }

        const res = await fetch(`${baseUrl}/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiKey,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          const errCode = data.code || data.error || ''
          const errDesc = data.error_description || data.msg || data.message || ''
          console.warn('Falha ao renovar token Supabase:', errCode, errDesc)
          // Se o refresh token foi revogado ou é inválido, encerra sessão
          if (
            res.status === 400 ||
            res.status === 401 ||
            errDesc.toLowerCase().includes('revoked') ||
            errDesc.toLowerCase().includes('invalid') ||
            errDesc.toLowerCase().includes('expired') ||
            errCode.includes('token_refresh_failed')
          ) {
            this.handleSessionExpired()
          }
          return null
        }

        const existingUser = this.currentSession?.user
        const newExpiresAt = this.calculateExpiresAt(data.access_token, data.expires_in)

        const newSession: SupabaseSession = {
          access_token: data.access_token,
          token_type: data.token_type || 'bearer',
          expires_in: data.expires_in || 3600,
          expires_at: newExpiresAt,
          refresh_token: data.refresh_token,
          user: data.user
            ? {
                id: data.user.id,
                email: data.user.email,
                name:
                  data.user.user_metadata?.name ||
                  existingUser?.name ||
                  data.user.email?.split('@')[0],
                role: data.user.user_metadata?.role || existingUser?.role || 'admin',
                avatar_url: data.user.user_metadata?.avatar_url || existingUser?.avatar_url,
                created_at: data.user.created_at || existingUser?.created_at,
              }
            : existingUser || {
                id: '',
                email: '',
              },
        }

        this.saveSession(newSession)
        return newSession.access_token
      } catch (err) {
        console.warn('Exceção ao renovar token:', err)
        return null
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  public async checkAndRefreshPreventively(): Promise<void> {
    if (this.isAuthenticated() && this.isTokenExpiredOrExpiringSoon(300)) {
      await this.refreshToken()
    }
  }

  /**
   * Encerra a sessão de forma limpa quando o token foi revogado/expirado
   * e redireciona para login exibindo mensagem amigável.
   */
  public handleSessionExpired(customMessage?: string) {
    if (!this.currentSession) return
    this.saveSession(null)

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          'bettone_session_expired_message',
          customMessage || 'Sua sessão expirou. Faça login novamente.',
        )
      } catch {
        // ignore
      }

      const currentPath = window.location.pathname + window.location.search
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?expired=1&redirect=${encodeURIComponent(currentPath)}`
      }
    }
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentSession?.access_token)
  }

  public async signInWithPassword(email: string, password: string): Promise<SupabaseUser> {
    const baseUrl = this.getAuthBaseUrl()
    const apiKey = this.getApiKey()

    const res = await fetch(`${baseUrl}/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(
        data.error_description || data.msg || data.message || 'Falha ao autenticar no Supabase.',
      )
    }

    const session: SupabaseSession = {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: this.calculateExpiresAt(data.access_token, data.expires_in),
      refresh_token: data.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
        role: data.user.user_metadata?.role || 'admin',
        avatar_url: data.user.user_metadata?.avatar_url,
        created_at: data.user.created_at,
      },
    }

    this.saveSession(session)
    return session.user
  }

  public async signUp(email: string, password: string, name?: string): Promise<void> {
    const baseUrl = this.getAuthBaseUrl()
    const apiKey = this.getApiKey()

    const res = await fetch(`${baseUrl}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        email,
        password,
        data: { name: name || email.split('@')[0], role: 'admin' },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(
        data.error_description || data.msg || data.message || 'Falha ao criar conta no Supabase.',
      )
    }

    // Se o Supabase já logar imediatamente (auto-confirm habilitado)
    if (data.access_token) {
      const session: SupabaseSession = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        expires_at: this.calculateExpiresAt(data.access_token, data.expires_in),
        refresh_token: data.refresh_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || name,
          role: data.user.user_metadata?.role || 'admin',
          avatar_url: data.user.user_metadata?.avatar_url,
          created_at: data.user.created_at,
        },
      }
      this.saveSession(session)
    }
  }

  public async signOut(): Promise<void> {
    const token = this.getToken()
    const baseUrl = this.getAuthBaseUrl()
    const apiKey = this.getApiKey()

    if (token) {
      try {
        await fetch(`${baseUrl}/logout`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${token}`,
          },
        })
      } catch {
        // Ignora erro ao deslogar remotamente
      }
    }
    this.saveSession(null)
  }

  public async resetPasswordForEmail(email: string): Promise<void> {
    const baseUrl = this.getAuthBaseUrl()
    const apiKey = this.getApiKey()

    const res = await fetch(`${baseUrl}/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(
        data.message || data.error_description || 'Falha ao enviar recuperação de senha.',
      )
    }
  }
}

export const supabaseAuth = new SupabaseAuthManager()
