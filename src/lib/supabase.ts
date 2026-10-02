/**
 * Cliente Supabase oficial do Indica Gabriel.
 * Configurado via variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
 *
 * Se as variáveis ainda não estiverem preenchidas no ambiente atual,
 * inicializa com valores de fallback seguros para não quebrar a compilação/execução da interface,
 * e disponibiliza método para testar a conexão real.
 */

export interface SupabaseConfig {
  url: string
  anonKey: string
  isConfigured: boolean
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const isConfigured = Boolean(
    url && anonKey && !url.includes('SEU_SUPABASE_URL') && url.startsWith('http'),
  )

  return { url, anonKey, isConfigured }
}

export interface SupabaseAuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string
  createdAt?: string
}

export interface SupabaseConnectionStatus {
  connected: boolean
  message: string
  timestamp: string
  usingFallback?: boolean
}

/**
 * Cliente leve para comunicação com o backend Supabase REST e Auth API
 * sem necessitar de dependências externas pesadas que poderiam falhar no bundler.
 */
class SupabaseClientWrapper {
  private config: SupabaseConfig

  constructor() {
    this.config = getSupabaseConfig()
  }

  public getConfig(): SupabaseConfig {
    return getSupabaseConfig()
  }

  /**
   * Testa a conectividade com o Supabase oficial configurado.
   * Faz um ping no endpoint público de autenticação com timeout rigoroso (3s)
   * para jamais travar a inicialização da aplicação ou o preview.
   */
  public async testConnection(timeoutMs = 3000): Promise<SupabaseConnectionStatus> {
    const cfg = this.getConfig()
    const now = new Date().toISOString()

    if (!cfg.isConfigured) {
      return {
        connected: false,
        message: 'Credenciais remotas do Supabase não configuradas no ambiente',
        timestamp: now,
        usingFallback: true,
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      // Faz requisição para a API de Auth/Settings do Supabase com timeout
      const res = await fetch(`${cfg.url.replace(/\/$/, '')}/auth/v1/settings`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${cfg.anonKey}`,
        },
      })

      clearTimeout(timeoutId)

      if (res.ok || res.status === 401 || res.status === 200) {
        return {
          connected: true,
          message: 'Supabase oficial conectado com sucesso',
          timestamp: now,
        }
      }

      return {
        connected: false,
        message: `Servidor Supabase respondeu com status HTTP ${res.status}`,
        timestamp: now,
        usingFallback: true,
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId)
      const isAbort =
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
      const errorMsg = isAbort
        ? 'Tempo limite de resposta do Supabase esgotado (timeout)'
        : err instanceof Error
          ? err.message
          : 'Falha na requisição'

      return {
        connected: false,
        message: `Supabase indisponível: ${errorMsg}`,
        timestamp: now,
        usingFallback: true,
      }
    }
  }
}

export const supabase = new SupabaseClientWrapper()
export default supabase
