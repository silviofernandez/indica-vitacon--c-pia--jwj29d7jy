import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Home, AlertCircle, Loader2, Lock, Mail, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Auth() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab)

  const { user, login, signup } = useAuth()
  const navigate = useNavigate()

  // Se já autenticado, vai para a rota adequada de acordo com o papel ou troca de senha
  useEffect(() => {
    if (user) {
      if (user.must_change_password) {
        navigate('/trocar-senha', { replace: true })
        return
      }
      const destination = user.role === 'indicador' ? '/indicador' : '/admin'
      navigate(destination, { replace: true })
    }
  }, [user, navigate])

  // Campos de Login
  const [loginEmail, setLoginEmail] = useState('gabsilvio@gmail.com')
  const [loginPassword, setLoginPassword] = useState('Skip@Pass')

  // Campos de Cadastro
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')

  // Estados de Validação e Submissão
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})

  // Sincroniza tab com a URL query string
  const handleTabChange = (val: string) => {
    const mode = val === 'signup' ? 'signup' : 'login'
    setActiveTab(mode)
    setSearchParams({ mode })
    setErrorMessage(null)
    setFieldErrors({})
  }

  // Validação do Form de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    const errors: { [key: string]: string } = {}

    if (!loginEmail.trim()) {
      errors.loginEmail = 'Informe seu e-mail'
    } else if (!/\S+@\S+\.\S+/.test(loginEmail)) {
      errors.loginEmail = 'Formato de e-mail inválido'
    }

    if (!loginPassword) {
      errors.loginPassword = 'Informe sua senha'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const res = await login(loginEmail, loginPassword)
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.')
      }
    } catch {
      setErrorMessage('Ocorreu um erro ao tentar entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Validação do Form de Cadastro
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    const errors: { [key: string]: string } = {}

    if (!signupName.trim()) {
      errors.signupName = 'Informe seu nome completo'
    }

    if (!signupEmail.trim()) {
      errors.signupEmail = 'Informe seu e-mail'
    } else if (!/\S+@\S+\.\S+/.test(signupEmail)) {
      errors.signupEmail = 'Formato de e-mail inválido'
    }

    if (!signupPassword) {
      errors.signupPassword = 'Crie uma senha'
    } else if (signupPassword.length < 8) {
      errors.signupPassword = 'A senha deve ter no mínimo 8 caracteres'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const res = await signup(signupName, signupEmail, signupPassword)
      if (!res.success) {
        setErrorMessage(res.error || 'Não foi possível criar sua conta. Tente outro e-mail.')
      }
    } catch {
      setErrorMessage('Erro inesperado ao registrar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-br from-[#0f2a43] via-[#15466d] to-[#1a5d8f] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Cabeçalho da Autenticação */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md text-white border border-white/20 mb-4 hover:bg-white/15 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-[#1a5d8f] flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight">Indica Gabriel</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {activeTab === 'login' ? 'Bem-vindo de volta' : 'Comece a indicar hoje'}
          </h1>
          <p className="text-sm text-gray-300 mt-1.5">
            {activeTab === 'login'
              ? 'Acesse seu painel para gerenciar e cadastrar indicações'
              : 'Crie sua conta gratuita em poucos segundos'}
          </p>
        </div>

        {/* Card Central com Sombra e Efeito Blur */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20 backdrop-blur-md">
          {/* Alerta de Erro Geral */}
          {errorMessage && (
            <Alert className="mb-6 bg-red-50 border-red-200 text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Abas Alternadoras */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2 bg-[#faf7f2] p-1 rounded-xl border border-[#e5e0d8]">
              <TabsTrigger
                value="login"
                className="rounded-lg font-bold data-[state=active]:bg-[#1a5d8f] data-[state=active]:text-white transition-all text-sm py-2"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-lg font-bold data-[state=active]:bg-[#1a5d8f] data-[state=active]:text-white transition-all text-sm py-2"
              >
                Criar Conta
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* FORMULÁRIO: ENTRAR */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-sm font-semibold text-[#1f2933]">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value)
                      if (fieldErrors.loginEmail) {
                        setFieldErrors({ ...fieldErrors, loginEmail: '' })
                      }
                    }}
                    className={`pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                      fieldErrors.loginEmail ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {fieldErrors.loginEmail && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.loginEmail}</p>
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
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value)
                      if (fieldErrors.loginPassword) {
                        setFieldErrors({ ...fieldErrors, loginPassword: '' })
                      }
                    }}
                    className={`pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                      fieldErrors.loginPassword ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {fieldErrors.loginPassword && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.loginPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold h-11 rounded-lg mt-2 shadow-md transition-all"
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

              <div className="text-center pt-3 border-t border-[#e5e0d8] mt-4">
                <p className="text-xs text-gray-600">
                  Não tem uma conta ainda?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('signup')}
                    className="font-bold text-[#1a5d8f] hover:underline"
                  >
                    Criar conta gratuitamente
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* FORMULÁRIO: CRIAR CONTA */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name" className="text-sm font-semibold text-[#1f2933]">
                  Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Gabriel da Silva"
                    value={signupName}
                    onChange={(e) => {
                      setSignupName(e.target.value)
                      if (fieldErrors.signupName) {
                        setFieldErrors({ ...fieldErrors, signupName: '' })
                      }
                    }}
                    className={`pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                      fieldErrors.signupName ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {fieldErrors.signupName && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.signupName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-sm font-semibold text-[#1f2933]">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value)
                      if (fieldErrors.signupEmail) {
                        setFieldErrors({ ...fieldErrors, signupEmail: '' })
                      }
                    }}
                    className={`pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                      fieldErrors.signupEmail ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {fieldErrors.signupEmail && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.signupEmail}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-sm font-semibold text-[#1f2933]">
                  Senha (mínimo 8 caracteres)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value)
                      if (fieldErrors.signupPassword) {
                        setFieldErrors({ ...fieldErrors, signupPassword: '' })
                      }
                    }}
                    className={`pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                      fieldErrors.signupPassword ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {fieldErrors.signupPassword && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.signupPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold h-11 rounded-lg mt-2 shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando Conta...
                  </>
                ) : (
                  'Criar Minha Conta Grátis'
                )}
              </Button>

              <div className="text-center pt-3 border-t border-[#e5e0d8] mt-4">
                <p className="text-xs text-gray-600">
                  Já possui uma conta?{' '}
                  <Link to="/login" className="font-bold text-[#1a5d8f] hover:underline">
                    Entrar agora
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
