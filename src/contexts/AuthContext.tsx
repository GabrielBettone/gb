import React, { createContext, useContext, useEffect, useState, useTransition } from 'react'
import pb from '@/lib/pocketbase/client'
import type { User } from '@/types'
import type { RecordAuthResponse } from 'pocketbase'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<RecordAuthResponse<User>>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  requestPasswordReset: (email: string) => Promise<void>
  confirmPasswordReset: (token: string, password: string, passwordConfirm: string) => Promise<void>
  confirmVerification: (token: string) => Promise<void>
  confirmEmailChange: (token: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      return pb.authStore.record as unknown as User
    }
    return null
  })
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    // Se o ambiente estiver configurado para Supabase Self-Hosted
    const env = import.meta.env as Record<string, string | undefined>
    const isSupabase =
      /^https:\/\//i.test(env.VITE_SUPABASE_URL || '') &&
      Boolean(env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY)

    if (isSupabase) {
      import('@/lib/supabase/auth').then(({ supabaseAuth }) => {
        const unsub = supabaseAuth.onAuthStateChange((sbUser) => {
          startTransition(() => {
            if (sbUser) {
              setUser({
                id: sbUser.id,
                email: sbUser.email,
                name: sbUser.name,
                avatar: sbUser.avatar_url,
                created: sbUser.created_at || '',
                updated: '',
                collectionId: 'users',
                collectionName: 'users',
              } as unknown as User)
            } else {
              setUser(null)
            }
            setLoading(false)
          })
        })
        return () => unsub()
      })
      return
    }

    const unsub = pb.authStore.onChange((_token, model) => {
      startTransition(() => {
        setUser(model ? (model as unknown as User) : null)
      })
    })

    // Checagem de token PocketBase
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pb.authStore.record as unknown as User)
    } else {
      setUser(null)
    }
    setLoading(false)

    return () => {
      unsub()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const env = import.meta.env as Record<string, string | undefined>
    const isSupabase =
      /^https:\/\//i.test(env.VITE_SUPABASE_URL || '') &&
      Boolean(env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY)

    if (isSupabase) {
      const { supabaseAuth } = await import('@/lib/supabase/auth')
      const sbUser = await supabaseAuth.signInWithPassword(email, pass)
      const adaptedUser = {
        id: sbUser.id,
        email: sbUser.email,
        name: sbUser.name,
        avatar: sbUser.avatar_url,
        created: sbUser.created_at || '',
        updated: '',
        collectionId: 'users',
        collectionName: 'users',
      } as unknown as User
      setUser(adaptedUser)
      return {
        record: adaptedUser,
        token: supabaseAuth.getToken(),
      } as unknown as RecordAuthResponse<User>
    }

    const authData = await pb.collection('users').authWithPassword(email, pass)
    setUser(authData.record as unknown as User)
    return authData as unknown as RecordAuthResponse<User>
  }

  const register = async (name: string, email: string, pass: string) => {
    const env = import.meta.env as Record<string, string | undefined>
    const isSupabase =
      /^https:\/\//i.test(env.VITE_SUPABASE_URL || '') &&
      Boolean(env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY)

    if (isSupabase) {
      const { supabaseAuth } = await import('@/lib/supabase/auth')
      await supabaseAuth.signUp(email, pass, name)
      return
    }

    await pb.collection('users').create({
      name,
      email,
      password: pass,
      passwordConfirm: pass,
      emailVisibility: false,
    })
    try {
      await pb.collection('users').requestVerification(email)
    } catch (e) {
      console.warn('Falha ao disparar e-mail de verificação:', e)
    }
  }

  const logout = () => {
    const env = import.meta.env as Record<string, string | undefined>
    const isSupabase =
      /^https:\/\//i.test(env.VITE_SUPABASE_URL || '') &&
      Boolean(env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY)

    if (isSupabase) {
      import('@/lib/supabase/auth').then(({ supabaseAuth }) => {
        supabaseAuth.signOut()
      })
    } else {
      pb.authStore.clear()
    }
    setUser(null)
  }

  const requestPasswordReset = async (email: string) => {
    const env = import.meta.env as Record<string, string | undefined>
    const isSupabase =
      /^https:\/\//i.test(env.VITE_SUPABASE_URL || '') &&
      Boolean(env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY)

    if (isSupabase) {
      const { supabaseAuth } = await import('@/lib/supabase/auth')
      await supabaseAuth.resetPasswordForEmail(email)
      return
    }

    await pb.collection('users').requestPasswordReset(email)
  }

  const confirmPasswordReset = async (token: string, pass: string, passConfirm: string) => {
    await pb.collection('users').confirmPasswordReset(token, pass, passConfirm)
  }

  const confirmVerification = async (token: string) => {
    await pb.collection('users').confirmVerification(token)
  }

  const confirmEmailChange = async (token: string, pass: string) => {
    await pb.collection('users').confirmEmailChange(token, pass)
    logout()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        requestPasswordReset,
        confirmPasswordReset,
        confirmVerification,
        confirmEmailChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
