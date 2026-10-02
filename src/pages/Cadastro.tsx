import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  FileText,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import GabrielLogo from '@/components/GabrielLogo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  submitIndicatorRegistration,
  isValidCPF,
  formatCPF,
  formatPhone,
} from '@/services/indicators'

export default function Cadastro() {
  // Dados do formulário
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [address, setAddress] = useState('')

  // Estados de interface
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value)
    setCpf(formatted)
    if (fieldErrors.cpf) {
      setFieldErrors((prev) => ({ ...prev, cpf: '' }))
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
    if (fieldErrors.phone) {
      setFieldErrors((prev) => ({ ...prev, phone: '' }))
    }
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    const cleanName = fullName.trim()
    const cleanEmail = email.trim()
    const cleanPhone = phone.trim()
    const cleanCpf = cpf.trim()
    const cleanRg = rg.trim()
    const cleanAddress = address.trim()

    if (!cleanName) {
      errors.fullName = 'Por favor, informe seu nome completo.'
    } else if (cleanName.split(' ').filter(Boolean).length < 2) {
      errors.fullName = 'Informe nome e sobrenome.'
    }

    if (!cleanEmail) {
      errors.email = 'Informe o seu endereço de e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Digite um e-mail válido (ex: seu.nome@email.com).'
    }

    if (!cleanPhone) {
      errors.phone = 'Informe seu telefone de contato com DDD.'
    } else if (cleanPhone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Telefone incompleto. Digite DDD + número.'
    }

    if (!cleanCpf) {
      errors.cpf = 'Informe seu CPF.'
    } else if (!isValidCPF(cleanCpf)) {
      errors.cpf = 'CPF inválido. Verifique os números digitados.'
    }

    if (!cleanRg) {
      errors.rg = 'Informe o número do seu documento RG.'
    }

    if (!cleanAddress) {
      errors.address = 'Informe seu endereço completo (rua, número, bairro e cidade).'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!validate()) {
      return
    }

    setLoading(true)
    try {
      const res = await submitIndicatorRegistration({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cpf: cpf.trim(),
        rg: rg.trim(),
        address: address.trim(),
      })

      if (res.success) {
        setSuccess(true)
        setSuccessMessage(
          res.message ||
            'Cadastro realizado com sucesso! Nossa equipe analisará as informações enviadas. Em breve, você receberá a aprovação com seus dados de acesso.',
        )
      } else {
        setErrorMessage(res.error || 'Não foi possível enviar seu cadastro.')
      }
    } catch {
      setErrorMessage('Ocorreu uma instabilidade momentânea. Por favor, tente enviar novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetForm = () => {
    setFullName('')
    setEmail('')
    setPhone('')
    setCpf('')
    setRg('')
    setAddress('')
    setFieldErrors({})
    setErrorMessage(null)
    setSuccess(false)
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-[#0f2a43] via-[#15466d] to-[#1a5d8f] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Cabeçalho com Logo Gabriel */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all"
            >
              <GabrielLogo variant="symbol" size={26} inverted />
              <span className="font-bold text-white text-sm">Imobiliária Gabriel</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Cadastro de Indicador Parceiro
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-200 max-w-xl mx-auto">
            Indique clientes compradores ou locatários para a Imobiliária Gabriel e receba
            bonificações exclusivas por cada negócio concluído.
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-white/20">
          {success ? (
            /* Tela de Confirmação Sucesso */
            <div className="text-center py-6 sm:py-8 space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="text-2xl font-bold text-[#0f2a43]">Cadastro Enviado com Sucesso!</h2>
                <p className="text-sm text-gray-600 leading-relaxed">{successMessage}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e5e0d8] max-w-md mx-auto text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0f2a43]">
                  <ShieldCheck className="w-4 h-4 text-[#1a5d8f]" />
                  <span>Próximos Passos:</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                  <li>Nossa equipe Master irá validar os seus documentos e dados cadastrais.</li>
                  <li>Assim que aprovado, sua senha de primeiro acesso será gerada.</li>
                  <li>Você poderá acessar o portal e cadastrar suas primeiras indicações.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Button
                  onClick={handleResetForm}
                  variant="outline"
                  className="w-full sm:w-auto border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#faf7f2] font-semibold h-11 px-6 rounded-xl"
                >
                  Fazer Novo Cadastro
                </Button>
                <Link to="/" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-[#1a5d8f] hover:bg-[#144a72] text-white font-semibold h-11 px-6 rounded-xl shadow-md">
                    Voltar para o Início
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Formulário de Cadastro */
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <Alert className="bg-red-50 border-red-200 text-red-800 rounded-xl flex items-start justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-900">
                        Não foi possível concluir o envio
                      </h4>
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

              {/* Topo do Formulário com a Bola G Oficial */}
              <div className="flex items-center justify-between pb-4 border-b border-[#e5e0d8] mb-2">
                <div className="flex items-center gap-2.5">
                  <GabrielLogo variant="symbol" size={36} />
                  <div className="flex flex-col leading-tight">
                    <span className="font-bold text-sm text-[#0f2a43]">Indica Gabriel</span>
                    <span className="text-[10px] text-gray-500">Imobiliária Gabriel</span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#14522a] bg-[#14522a]/10 px-2.5 py-1 rounded-full">
                  Ficha de Adesão
                </span>
              </div>

              {/* Seção 1: Dados Pessoais */}
              <div>
                <h3 className="text-base font-bold text-[#0f2a43] flex items-center gap-2 pb-3 border-b border-[#e5e0d8]">
                  <User className="w-4 h-4 text-[#1a5d8f]" />
                  <span>Identificação Pessoal</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Nome Completo */}
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="reg-fullname" className="text-sm font-semibold text-[#1f2933]">
                      Nome Completo <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="reg-fullname"
                        type="text"
                        placeholder="Ex: João da Silva Santos"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value)
                          if (fieldErrors.fullName) {
                            setFieldErrors((prev) => ({ ...prev, fullName: '' }))
                          }
                        }}
                        className={`pl-10 h-11 rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                          fieldErrors.fullName ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.fullName}</p>
                    )}
                  </div>

                  {/* CPF */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-cpf" className="text-sm font-semibold text-[#1f2933]">
                      CPF <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="reg-cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        maxLength={14}
                        value={cpf}
                        onChange={handleCpfChange}
                        className={`pl-10 h-11 rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                          fieldErrors.cpf ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    {fieldErrors.cpf && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.cpf}</p>
                    )}
                  </div>

                  {/* RG */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-rg" className="text-sm font-semibold text-[#1f2933]">
                      RG (Documento de Identidade) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="reg-rg"
                        type="text"
                        placeholder="Ex: 12.345.678-9"
                        value={rg}
                        onChange={(e) => {
                          setRg(e.target.value)
                          if (fieldErrors.rg) {
                            setFieldErrors((prev) => ({ ...prev, rg: '' }))
                          }
                        }}
                        className={`pl-10 h-11 rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                          fieldErrors.rg ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    {fieldErrors.rg && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.rg}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Seção 2: Contato e Endereço */}
              <div className="pt-2">
                <h3 className="text-base font-bold text-[#0f2a43] flex items-center gap-2 pb-3 border-b border-[#e5e0d8]">
                  <Mail className="w-4 h-4 text-[#1a5d8f]" />
                  <span>Contato e Localização</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* E-mail */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-sm font-semibold text-[#1f2933]">
                      E-mail Principal <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="seu.email@exemplo.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (fieldErrors.email) {
                            setFieldErrors((prev) => ({ ...prev, email: '' }))
                          }
                        }}
                        className={`pl-10 h-11 rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                          fieldErrors.email ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Será utilizado para login após a aprovação
                    </span>
                    {fieldErrors.email && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Telefone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-phone" className="text-sm font-semibold text-[#1f2933]">
                      Telefone / WhatsApp <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="reg-phone"
                        type="text"
                        placeholder="(11) 98765-4321"
                        maxLength={15}
                        value={phone}
                        onChange={handlePhoneChange}
                        className={`pl-10 h-11 rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                          fieldErrors.phone ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500">
                      Para contato rápido sobre suas comissões
                    </span>
                    {fieldErrors.phone && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.phone}</p>
                    )}
                  </div>

                  {/* Endereço Completo */}
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="reg-address" className="text-sm font-semibold text-[#1f2933]">
                      Endereço Residencial Completo <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="reg-address"
                        type="text"
                        placeholder="Rua, número, complemento, bairro, cidade - UF"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value)
                          if (fieldErrors.address) {
                            setFieldErrors((prev) => ({ ...prev, address: '' }))
                          }
                        }}
                        className={`pl-10 h-11 rounded-xl border-[#e5e0d8] focus-visible:ring-[#1a5d8f] ${
                          fieldErrors.address ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    {fieldErrors.address && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Termo e Aviso de Privacidade */}
              <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e5e0d8] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#1a5d8f] shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Seus dados serão protegidos e utilizados exclusivamente pela equipe comercial da
                  Imobiliária Gabriel para emissão de contratos de parceria, controle de comissões e
                  liberação do seu acesso à plataforma.
                </p>
              </div>

              {/* Botão de Envio */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a5d8f] hover:bg-[#144a72] text-white font-bold h-12 rounded-xl shadow-lg transition-all text-base flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Enviando Cadastro...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Cadastro para Aprovação</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>

              <div className="text-center pt-2 border-t border-[#e5e0d8]">
                <p className="text-xs text-gray-600">
                  Já possui uma conta ativa?{' '}
                  <Link to="/login" className="font-bold text-[#1a5d8f] hover:underline">
                    Fazer Login
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Rodapé com Destaques */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-white/90">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <Building2 className="w-5 h-5 text-[#d9995b] shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">Transparência Total</p>
              <p className="text-gray-300">Acompanhe visitas e negociações em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">Recompensas Claras</p>
              <p className="text-gray-300">Valores fixos e percentuais definidos em tabela</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <ShieldCheck className="w-5 h-5 text-sky-300 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">Suporte Direto</p>
              <p className="text-gray-300">Equipe comercial dedicada para fechar seu cliente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
