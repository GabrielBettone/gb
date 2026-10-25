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
  refresh_token: string
  user: SupabaseUser
}

const STORAGE_KEY = 'bettone_supabase_auth_session'
type AuthChangeCallback = (user: SupabaseUser | null) => void

class SupabaseAuthManager {
  private currentSession: SupabaseSession | null = null
  private listeners: Set<AuthChangeCallback> = new Set()

  constructor() {
    this.loadFromStorage()
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

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        this.currentSession = JSON.parse(saved)
      }
    } catch {
      this.currentSession = null
    }
  }

  private saveSession(session: SupabaseSession | null) {
    this.currentSession = session
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    this.notify()
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
