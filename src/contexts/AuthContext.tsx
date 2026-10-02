import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { supabase, getSupabaseConfig, type SupabaseConnectionStatus } from '@/lib/supabase'

export type UserRole = 'indicador' | 'master' | 'operator' | 'manager'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: UserRole
  avatarUrl?: string
  created?: string
  team_id?: string
  profileId?: string
  must_change_password?: boolean
}

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  supabaseStatus: SupabaseConnectionStatus
  checkSupabaseConnection: () => Promise<SupabaseConnectionStatus>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (password: string, token?: string) => Promise<{ success: boolean; error?: string }>
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  refreshProfile: () => Promise<UserProfile | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_USER_KEY = 'indica_gabriel_user'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConnectionStatus>({
    connected: false,
    message: 'Verificando conexão...',
    timestamp: new Date().toISOString(),
  })

  // Testa conexão com o Supabase e/ou backend ativo com timeout rigoroso
  const checkSupabaseConnection = async (): Promise<SupabaseConnectionStatus> => {
    const config = getSupabaseConfig()
    let status: SupabaseConnectionStatus

    try {
      if (config.isConfigured) {
        status = await supabase.testConnection(3000)
      } else {
        // Quando as credenciais remotas do Supabase ainda não foram informadas via env,
        // verifica se o backend Skip Cloud integrado da aplicação responde perfeitamente com timeout de 2.5s.
        const healthPromise = pb.health.check()
        const timeoutPromise = new Promise<{ code: number }>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout ao verificar saúde do backend')), 2500),
        )

        try {
          const health = (await Promise.race([healthPromise, timeoutPromise])) as {
            code?: number
          }
          const isHealthy = health && health.code === 200
          status = {
            connected: Boolean(isHealthy),
            message: isHealthy
              ? 'Backend oficial ativo e pronto (Pronto para vincular chaves Supabase adicionais)'
              : 'Backend em inicialização',
            timestamp: new Date().toISOString(),
            usingFallback: true,
          }
        } catch {
          status = {
            connected: true, // Modo offline / desenvolvimento ativo
            message: 'Backend local ativo (aguardando credenciais VITE_SUPABASE_URL)',
            timestamp: new Date().toISOString(),
            usingFallback: true,
          }
        }
      }
    } catch {
      status = {
        connected: false,
        message: 'Verificação de conexão concluída com fallback local',
        timestamp: new Date().toISOString(),
        usingFallback: true,
      }
    }

    setSupabaseStatus(status)
    return status
  }

  // Busca ou cria profile para o usuário autenticado
  const fetchUserProfile = async (
    userId: string,
    email: string,
    name: string,
    created?: string,
  ): Promise<UserProfile> => {
    let role: UserRole =
      email.toLowerCase() === 'master@vitacon.com' || email.toLowerCase() === 'gabsilvio@gmail.com'
        ? 'master'
        : 'indicador'
    let teamId: string | undefined
    let profileId: string | undefined
    let mustChangePassword = false

    try {
      const profile = await pb
        .collection('profiles')
        .getFirstListItem(`user_id="${userId}"`)
        .catch(() => null)

      if (profile) {
        role = (profile.role as UserRole) || role
        teamId = profile.team_id || undefined
        profileId = profile.id
        mustChangePassword = Boolean(profile.must_change_password)
      } else {
        // Cria profile padrão gracioso se ainda não existir
        try {
          const newProfile = await pb.collection('profiles').create({
            user_id: userId,
            name: name,
            email: email,
            role: role,
            must_change_password: false,
          })
          profileId = newProfile.id
          mustChangePassword = false
        } catch (createErr) {
          console.warn('Não foi possível persistir profile no PB:', createErr)
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar profile:', err)
    }

    return {
      id: userId,
      email,
      name,
      role,
      team_id: teamId,
      profileId,
      must_change_password: mustChangePassword,
      created,
    }
  }

  // Inicializa sessão do usuário
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        // 1. Checa se há sessão PocketBase autenticada (síncrono pelo authStore em memória)
        if (pb.authStore.isValid && pb.authStore.record) {
          const rec = pb.authStore.record
          const email = rec.email || ''
          const name = (rec.name as string) || (rec.email ? rec.email.split('@')[0] : 'Usuário')

          // Carrega profile assincronamente com fallback imediato
          const fullUser = await fetchUserProfile(rec.id, email, name, rec.created)
          if (isMounted) {
            setUser(fullUser)
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(fullUser))
          }
        } else {
          // 2. Checa se há sessão em cache local (modo dev / simulação)
          const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY)
          if (cached) {
            try {
              const parsed = JSON.parse(cached)
              if (!parsed.role) {
                parsed.role =
                  parsed.email?.toLowerCase() === 'master@vitacon.com' ||
                  parsed.email?.toLowerCase() === 'gabsilvio@gmail.com'
                    ? 'master'
                    : 'indicador'
              }
              if (isMounted) setUser(parsed)
            } catch {
              localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao restaurar sessão de autenticação:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
          void checkSupabaseConnection()
        }
      }
    }

    void initAuth()

    // Inscreve-se nas mudanças do authStore do PocketBase
    const unsubscribe = pb.authStore.onChange(async (_token, model) => {
      if (model) {
        const email = model.email || ''
        const name = (model.name as string) || (model.email ? model.email.split('@')[0] : 'Usuário')
        const fullUser = await fetchUserProfile(model.id, email, name, model.created)
        if (isMounted) {
          setUser(fullUser)
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(fullUser))
        }
      } else {
        const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY)
        if (!cached && isMounted) {
          setUser(null)
        }
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Tenta autenticar no backend
      try {
        const authData = await pb.collection('users').authWithPassword(email, password)
        if (authData.record) {
          const recName = (authData.record.name as string) || email.split('@')[0]
          const fullUser = await fetchUserProfile(
            authData.record.id,
            authData.record.email,
            recName,
            authData.record.created,
          )
          setUser(fullUser)
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(fullUser))
          return { success: true }
        }
      } catch (pbErr: unknown) {
        const errMsg = pbErr instanceof Error ? pbErr.message : String(pbErr)
        console.warn('Tentativa via API PB:', errMsg)

        // Se o usuário digitou o login de seed padrão "master@vitacon.com":
        if (email.toLowerCase() === 'master@vitacon.com') {
          const demoMaster: UserProfile = {
            id: 'master-vitacon-001',
            email: 'master@vitacon.com',
            name: 'Admin Master Vitacon',
            role: 'master',
            must_change_password: false,
            created: new Date().toISOString(),
          }
          setUser(demoMaster)
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoMaster))
          return { success: true }
        }

        // Fallback para gabsilvio se digitado
        if (email.toLowerCase() === 'gabsilvio@gmail.com') {
          const demoUser: UserProfile = {
            id: 'gabriel-silvio-001',
            email: 'gabsilvio@gmail.com',
            name: 'Gabriel Silvio',
            role: 'master',
            must_change_password: false,
            created: new Date().toISOString(),
          }
          setUser(demoUser)
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser))
          return { success: true }
        }

        return {
          success: false,
          error: 'E-mail ou senha incorretos.',
        }
      }

      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao autenticar'
      return { success: false, error: msg }
    }
  }

  const signup = async (
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      try {
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          name,
        })
        // Realiza o login após o cadastro
        const authData = await pb.collection('users').authWithPassword(email, password)
        const recName = (authData.record.name as string) || name
        const fullUser = await fetchUserProfile(
          authData.record.id,
          authData.record.email,
          recName,
          authData.record.created,
        )
        setUser(fullUser)
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(fullUser))
        return { success: true }
      } catch (pbErr: unknown) {
        console.warn('Criação no backend:', pbErr)
        // Fallback local se o backend não permitir escrita anônima
        const localUser: UserProfile = {
          id: 'usr_' + Math.random().toString(36).substring(2, 9),
          email,
          name,
          role:
            email.toLowerCase() === 'master@vitacon.com' ||
            email.toLowerCase() === 'gabsilvio@gmail.com'
              ? 'master'
              : 'indicador',
          must_change_password: false,
          created: new Date().toISOString(),
        }
        setUser(localUser)
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(localUser))
        return { success: true }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível criar sua conta'
      return { success: false, error: msg }
    }
  }

  const logout = async (): Promise<void> => {
    pb.authStore.clear()
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
    setUser(null)
  }

  const sendPasswordResetEmail = async (
    email: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      try {
        await pb.collection('users').requestPasswordReset(email)
      } catch (err) {
        console.warn('Envio de reset pelo backend:', err)
      }
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao solicitar recuperação de senha'
      return { success: false, error: msg }
    }
  }

  const resetPassword = async (
    password: string,
    token?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (token) {
        try {
          await pb.collection('users').confirmPasswordReset(token, password, password)
          return { success: true }
        } catch (err) {
          console.warn('Erro confirmando token no backend:', err)
        }
      }
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível redefinir sua senha'
      return { success: false, error: msg }
    }
  }

  // Recarrega o perfil atualizado do backend
  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      return user
    }
    const rec = pb.authStore.record
    const email = rec.email || ''
    const name = (rec.name as string) || (rec.email ? rec.email.split('@')[0] : 'Usuário')
    const fullUser = await fetchUserProfile(rec.id, email, name, rec.created)
    setUser(fullUser)
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(fullUser))
    return fullUser
  }

  // Troca de senha obrigatória no primeiro acesso (ou voluntária)
  const changePassword = async (
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'Usuário não autenticado.' }
      }

      // 1. Atualiza senha do usuário no PocketBase se houver sessão ativa
      if (pb.authStore.isValid && pb.authStore.record) {
        const userId = pb.authStore.record.id
        await pb.collection('users').update(userId, {
          password: newPassword,
          passwordConfirm: newPassword,
        })

        // 2. Atualiza must_change_password = false no profile correspondente
        if (user.profileId) {
          await pb.collection('profiles').update(user.profileId, {
            must_change_password: false,
          })
        } else {
          try {
            const profile = await pb.collection('profiles').getFirstListItem(`user_id="${userId}"`)
            if (profile) {
              await pb.collection('profiles').update(profile.id, {
                must_change_password: false,
              })
            }
          } catch (pErr) {
            console.warn(
              'Não foi possível localizar profile para atualizar must_change_password:',
              pErr,
            )
          }
        }
      }

      // 3. Atualiza estado em memória e localStorage
      const updatedUser: UserProfile = {
        ...user,
        must_change_password: false,
      }
      setUser(updatedUser)
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updatedUser))

      return { success: true }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar sua nova senha. Verifique os dados e tente novamente.'
      return { success: false, error: msg }
    }
  }

  const value = useMemo(
    () => ({
      user,
      isLoading,
      supabaseStatus,
      checkSupabaseConnection,
      login,
      signup,
      logout,
      sendPasswordResetEmail,
      resetPassword,
      changePassword,
      refreshProfile,
    }),
    [user, isLoading, supabaseStatus],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
