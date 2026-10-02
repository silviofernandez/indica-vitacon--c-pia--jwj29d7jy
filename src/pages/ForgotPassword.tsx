import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Home, Loader2, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { sendPasswordResetEmail } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.')
      return
    }

    setLoading(true)
    try {
      const res = await sendPasswordResetEmail(email)
      if (res.success) {
        setSubmitted(true)
      } else {
        setErrorMessage(res.error || 'Não foi possível solicitar a recuperação.')
      }
    } catch {
      setErrorMessage('Erro ao tentar enviar e-mail. Tente novamente.')
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
            Recuperação de Senha
          </h1>
          <p className="text-sm text-gray-300 mt-1.5">
            Recupere o acesso à sua conta de indicações
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
          {submitted ? (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#0f2a43]">Verifique seu e-mail!</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Enviamos instruções detalhadas e um link seguro para{' '}
                <strong className="text-gray-800">{email}</strong> para que você possa redefinir sua
                senha.
              </p>
              <div className="pt-4 flex flex-col gap-2">
                <Button
                  asChild
                  className="w-full bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold h-11 rounded-lg"
                >
                  <Link to="/login">Voltar ao Login</Link>
                </Button>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-xs text-gray-500 hover:underline pt-2"
                >
                  Tentar com outro endereço de e-mail
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Digite o e-mail associado à sua conta do <strong>Indica Gabriel</strong> e
                enviaremos um link para criar uma nova senha.
              </p>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="forgot-email" className="text-sm font-semibold text-[#1f2933]">
                  Seu E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    Enviando link...
                  </>
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </Button>

              <div className="text-center pt-3 border-t border-[#e5e0d8] mt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs font-semibold text-[#1a5d8f] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Lembrou sua senha? Voltar para o Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
