import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, AlertCircle, Loader2, Lock, CheckCircle2, KeyRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

export default function TrocarSenha() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({})
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    const errors: { [key: string]: string } = {}

    if (!newPassword) {
      errors.newPassword = 'Crie uma nova senha'
    } else if (newPassword.length < 6) {
      errors.newPassword = 'A senha deve ter no mínimo 6 caracteres'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirme sua nova senha'
    } else if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'As duas senhas digitadas não coincidem'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const res = await changePassword(newPassword)
      if (res.success) {
        setSuccess(true)
        toast({
          title: 'Senha salva com sucesso!',
          description: 'Sua conta está segura e você já pode acessar a plataforma.',
        })

        // Redireciona após breve confirmação visual
        setTimeout(() => {
          const destination = user?.role === 'indicador' ? '/indicador' : '/admin'
          navigate(destination, { replace: true })
        }, 1200)
      } else {
        setErrorMessage(
          res.error ||
            'Não foi possível salvar a nova senha. Verifique os dados e tente novamente.',
        )
      }
    } catch {
      setErrorMessage('Ocorreu um erro ao salvar a nova senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-br from-[#0f2a43] via-[#15466d] to-[#1a5d8f] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md text-white border border-white/20 mb-4 shadow-sm">
            <KeyRound className="w-4 h-4 text-[#d9995b]" />
            <span className="font-bold tracking-tight text-sm">Primeiro Acesso — Segurança</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Defina sua nova senha
          </h1>
          <p className="text-sm text-gray-300 mt-2 max-w-sm mx-auto leading-relaxed">
            Para sua segurança, é obrigatório definir uma senha pessoal antes de acessar a
            plataforma Indica Gabriel.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
          {success ? (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#0f2a43]">Senha salva com sucesso!</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Sua senha foi redefinida com segurança. Redirecionando para o seu painel...
              </p>
              <div className="pt-2 flex justify-center">
                <Loader2 className="w-6 h-6 text-[#1a5d8f] animate-spin" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <Alert className="bg-red-50 border-red-200 text-red-800 rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-900">Atenção ao alterar senha</h4>
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

              {user?.email && (
                <div className="p-3 bg-[#faf7f2] border border-[#e5e0d8] rounded-xl flex items-center justify-between text-xs text-gray-600">
                  <span>Conta conectada:</span>
                  <strong className="text-[#0f2a43] truncate max-w-[200px]">{user.email}</strong>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="nova-senha" className="text-sm font-semibold text-[#1f2933]">
                  Nova Senha (mínimo de 6 caracteres)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="nova-senha"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (fieldErrors.newPassword) {
                        setFieldErrors({ ...fieldErrors, newPassword: '' })
                      }
                    }}
                    className={`pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                      fieldErrors.newPassword ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {fieldErrors.newPassword && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.newPassword}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmar-nova-senha"
                  className="text-sm font-semibold text-[#1f2933]"
                >
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmar-nova-senha"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (fieldErrors.confirmPassword) {
                        setFieldErrors({ ...fieldErrors, confirmPassword: '' })
                      }
                    }}
                    className={`pl-10 h-11 rounded-lg border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                      fieldErrors.confirmPassword ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-red-600 font-medium">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Escolha uma senha que apenas você conheça para proteger suas indicações e
                  comissões.
                </span>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold h-11 rounded-lg mt-2 shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando nova senha...
                  </>
                ) : (
                  'Salvar senha'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
