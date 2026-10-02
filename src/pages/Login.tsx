import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { AlertCircle, Loader2, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import VitaconLogo from '@/components/VitaconLogo'
import { Shield, Sparkles } from 'lucide-react'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Se já autenticado, redireciona de acordo com o papel ou fluxo de troca de senha
  useEffect(() => {
    if (user) {
      if (user.must_change_password) {
        navigate('/trocar-senha', { replace: true })
        return
      }
      // Redireciona para o destino pretendido ou dashboard por papel
      const stateFrom = (location.state as { from?: { pathname?: string } })?.from?.pathname
      if (stateFrom && stateFrom !== '/login' && stateFrom !== '/auth') {
        navigate(stateFrom, { replace: true })
        return
      }
      const destination = user.role === 'indicador' ? '/indicador' : '/admin'
      navigate(destination, { replace: true })
    }
  }, [user, navigate, location.state])

  // Campos do formulário
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Estados de submissão e validação
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    const errors: { [key: string]: string } = {}

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      errors.email = 'Informe seu e-mail'
    } else if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      errors.email = 'Digite um e-mail válido'
    }

    if (!password) {
      errors.password = 'Informe sua senha'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const res = await login(cleanEmail, password)
      if (!res.success) {
        setErrorMessage(res.error || 'E-mail ou senha incorretos.')
      }
      // Caso de sucesso: o useEffect cuidará do redirecionamento com base no perfil carregado
    } catch {
      setErrorMessage('E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Cabeçalho com Vitacon Logo */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 mb-4 hover:bg-white/15 transition-colors"
            title="Voltar para a página inicial"
          >
            <VitaconLogo variant="dark" size="sm" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Programa de Indicação
          </h1>
          <p className="text-sm text-slate-300 mt-1.5">
            Exclusivo para clientes com unidade adquirida na Vitacon
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <VitaconLogo size="sm" />
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Acesso Restrito
            </span>
          </div>
          {/* Alerta de erro amigável sem jargão técnico */}{' '}
          {errorMessage && (
            <Alert className="mb-6 bg-red-50 border-red-200 text-red-800 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Falha ao entrar</h4>
                  <AlertDescription className="text-xs sm:text-sm text-red-700 mt-0.5 leading-relaxed">
                    {errorMessage}
                  </AlertDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  setErrorMessage(null)
                  void handleSubmit(e)
                }}
                className="border-red-300 text-red-800 hover:bg-red-100 text-xs shrink-0 rounded-lg h-8"
              >
                Tentar novamente
              </Button>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email" className="text-sm font-semibold text-[#1f2933]">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (fieldErrors.email) {
                      setFieldErrors({ ...fieldErrors, email: '' })
                    }
                  }}
                  className={`pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                    fieldErrors.email ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-sm font-semibold text-[#1f2933]">
                  Senha
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#1a5d8f] hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) {
                      setFieldErrors({ ...fieldErrors, password: '' })
                    }
                  }}
                  className={`pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                    fieldErrors.password ? 'border-red-500' : ''
                  }`}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-lg mt-2 shadow-md transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar na Plataforma'
              )}
            </Button>

            <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Acesso por autorização administrativa:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Novos clientes indicadores são cadastrados e autorizados diretamente pela equipe
                  administrativa da Vitacon após comprovação da unidade adquirida.
                </p>
              </div>

              {/* Dica discreta de acesso Master */}
              <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100 text-[11px] text-emerald-900 flex items-center justify-between">
                <span>Acesso Master:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('master@vitacon.com')
                    setPassword('Skip@Vitacon2026')
                  }}
                  className="font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Preencher Master Demonstração
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
