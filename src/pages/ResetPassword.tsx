import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Home, Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (password.length < 8) {
      setErrorMessage('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('As duas senhas digitadas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const res = await resetPassword(password, token)
      if (res.success) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 2500)
      } else {
        setErrorMessage(res.error || 'Não foi possível redefinir a senha.')
      }
    } catch {
      setErrorMessage('Ocorreu um erro ao atualizar a senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-br from-[#0f2a43] via-[#15466d] to-[#1a5d8f] px-4 py-12">
      <div className="w-full max-w-md">
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
            Criar Nova Senha
          </h1>
          <p className="text-sm text-gray-300 mt-1.5">Defina uma senha segura para o seu login</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
          {success ? (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#0f2a43]">Senha redefinida com sucesso!</h3>
              <p className="text-sm text-gray-600">
                Sua senha foi atualizada. Você será redirecionado para a página de login em
                instantes...
              </p>
              <Button asChild className="w-full bg-[#1a5d8f] text-white font-bold h-11 rounded-lg">
                <Link to="/login">Ir para o Login Agora</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-sm font-semibold text-[#1f2933]">
                  Nova Senha (mínimo 8 caracteres)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirm-new-password"
                  className="text-sm font-semibold text-[#1f2933]"
                >
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold h-11 rounded-lg mt-2 shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
