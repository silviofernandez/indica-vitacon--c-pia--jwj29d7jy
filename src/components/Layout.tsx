import React, { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  Menu,
  X,
  LogOut,
  User,
  CheckCircle2,
  PlusCircle,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Users2,
  Settings,
  Sparkles,
  ChevronRight,
  Filter,
  Wallet,
  FileText,
} from 'lucide-react'
import VitaconLogo from '@/components/VitaconLogo'
import InstallPwaPrompt from '@/components/InstallPwaPrompt'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function Layout() {
  const { user, logout, supabaseStatus } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Detecta se estamos numa rota interna do sistema
  const isInternalApp =
    location.pathname.startsWith('/indicador') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname === '/trocar-senha'

  // Detecta scroll para aplicar blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fecha o menu mobile ao trocar de rota
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U'

  // Itens de navegação condicional por profiles.role
  const isIndicador = user?.role === 'indicador'
  const isStaff = user?.role === 'master' || user?.role === 'operator' || user?.role === 'manager'
  const isMaster = user?.role === 'master'

  // Links do menu interno do Indicador
  const indicadorNavItems = [
    {
      title: 'Início',
      to: '/indicador',
      icon: Home,
      exact: true,
    },
    {
      title: 'Nova Indicação',
      to: '/indicador/nova-indicacao',
      icon: PlusCircle,
      exact: false,
    },
    {
      title: 'Meu Relatório',
      to: '/indicador/relatorio',
      icon: FileText,
      exact: false,
    },
  ]

  // Links do menu interno do Admin (master, operator, manager)
  const adminNavItems = [
    {
      title: 'Painel do Dia',
      to: '/admin',
      icon: LayoutDashboard,
      exact: true,
      visible: isStaff,
    },
    {
      title: 'Indicações',
      to: '/admin/indicacoes',
      icon: Filter,
      exact: false,
      visible: isStaff,
    },
    {
      title: 'Indicadores',
      to: '/admin/indicadores',
      icon: Users,
      exact: false,
      visible: isMaster || user?.role === 'operator',
    },
    {
      title: 'Vitacon',
      to: '/admin/vitacon',
      icon: Sparkles,
      exact: false,
      visible: isStaff,
    },
    {
      title: 'Financeiro',
      to: '/admin/financeiro',
      icon: Wallet,
      exact: false,
      visible: isMaster || user?.role === 'operator',
    },
    {
      title: 'Equipas',
      to: '/admin/equipas',
      icon: Users2,
      exact: false,
      visible: isMaster,
    },
    {
      title: 'Configurações',
      to: '/admin/configuracoes',
      icon: Settings,
      exact: false,
      visible: isMaster,
    },
  ].filter((item) => item.visible)

  // Se o usuário autenticado for master, também pode alternar para a visão de indicador
  const roleDisplayNames: Record<string, string> = {
    indicador: 'Indicador Parceiro',
    master: 'Master Admin',
    operator: 'Operador Comercial',
    manager: 'Gerente Comercial',
  }

  const currentRoleLabel = user?.role ? roleDisplayNames[user.role] || user.role : ''

  return (
    <div className="flex flex-col min-h-screen bg-[#faf7f2] text-[#1f2933] font-sans antialiased selection:bg-[#1a5d8f] selection:text-white">
      {/* HEADER FIXO SUPERIOR */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
          isScrolled || isInternalApp
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#e5e0d8]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Marca Vitacon: canto superior esquerdo no mobile e desktop */}
            <Link
              to={user ? (isStaff ? '/admin' : '/indicador') : '/'}
              className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-emerald-600 rounded-2xl p-1.5 transition-transform hover:scale-[1.03]"
              title="Programa de Indicação Vitacon"
            >
              <VitaconLogo size="md" />
            </Link>

            {/* Navegação Desktop Central */}
            <nav className="hidden md:flex items-center gap-6">
              {!user ? (
                <>
                  <Link
                    to="/"
                    className={`text-sm font-semibold transition-colors ${
                      location.pathname === '/'
                        ? 'text-[#1a5d8f]'
                        : 'text-[#1f2933] hover:text-[#1a5d8f]'
                    }`}
                  >
                    Início
                  </Link>
                  <a
                    href="/#como-funciona"
                    className="text-sm font-semibold text-[#6b7280] hover:text-[#1a5d8f] transition-colors"
                  >
                    Como Funciona
                  </a>
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-[#1f2933] hover:text-emerald-700 transition-colors"
                  >
                    Área do Indicador
                  </Link>
                </>
              ) : (
                /* Itens contextuais no Header desktop quando logado */
                <div className="flex items-center gap-1 bg-[#faf7f2] p-1 rounded-xl border border-[#e5e0d8]">
                  {isIndicador && (
                    <>
                      <Link
                        to="/indicador"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          location.pathname === '/indicador'
                            ? 'bg-[#1a5d8f] text-white shadow-sm'
                            : 'text-gray-700 hover:text-[#1a5d8f]'
                        }`}
                      >
                        Início
                      </Link>
                      <Link
                        to="/indicador/nova-indicacao"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          location.pathname === '/indicador/nova-indicacao'
                            ? 'bg-[#1a5d8f] text-white shadow-sm'
                            : 'text-gray-700 hover:text-[#1a5d8f]'
                        }`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Nova Indicação
                      </Link>
                      <Link
                        to="/indicador/relatorio"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          location.pathname === '/indicador/relatorio'
                            ? 'bg-[#1a5d8f] text-white shadow-sm'
                            : 'text-gray-700 hover:text-[#1a5d8f]'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Relatório
                      </Link>
                    </>
                  )}

                  {isStaff && (
                    <>
                      <Link
                        to="/admin"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          location.pathname === '/admin'
                            ? 'bg-[#1a5d8f] text-white shadow-sm'
                            : 'text-gray-700 hover:text-[#1a5d8f]'
                        }`}
                      >
                        Painel do Dia
                      </Link>
                      <Link
                        to="/admin/indicacoes"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          location.pathname.startsWith('/admin/indicaco')
                            ? 'bg-[#1a5d8f] text-white shadow-sm'
                            : 'text-gray-700 hover:text-[#1a5d8f]'
                        }`}
                      >
                        Indicações
                      </Link>
                      {(isMaster || user?.role === 'operator') && (
                        <Link
                          to="/admin/indicadores"
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            location.pathname === '/admin/indicadores'
                              ? 'bg-[#1a5d8f] text-white shadow-sm'
                              : 'text-gray-700 hover:text-[#1a5d8f]'
                          }`}
                        >
                          Indicadores
                        </Link>
                      )}
                      <Link
                        to="/admin/vitacon"
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          location.pathname === '/admin/vitacon'
                            ? 'bg-[#1a5d8f] text-white shadow-sm'
                            : 'text-gray-700 hover:text-[#1a5d8f]'
                        }`}
                      >
                        Vitacon
                      </Link>
                      {(isMaster || user?.role === 'operator') && (
                        <Link
                          to="/admin/financeiro"
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            location.pathname === '/admin/financeiro'
                              ? 'bg-[#1a5d8f] text-white shadow-sm'
                              : 'text-gray-700 hover:text-[#1a5d8f]'
                          }`}
                        >
                          Financeiro
                        </Link>
                      )}
                      {isMaster && (
                        <>
                          <Link
                            to="/admin/equipas"
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              location.pathname === '/admin/equipas'
                                ? 'bg-[#1a5d8f] text-white shadow-sm'
                                : 'text-gray-700 hover:text-[#1a5d8f]'
                            }`}
                          >
                            Equipas
                          </Link>
                          <Link
                            to="/admin/configuracoes"
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              location.pathname === '/admin/configuracoes'
                                ? 'bg-[#1a5d8f] text-white shadow-sm'
                                : 'text-gray-700 hover:text-[#1a5d8f]'
                            }`}
                          >
                            Configurações
                          </Link>
                          <Link
                            to="/indicador"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#1a5d8f] border-l border-[#e5e0d8] ml-1"
                            title="Alternar para visão de indicador"
                          >
                            Visão Indicador
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </nav>

            {/* Ações de Usuário Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="border-[#1a5d8f]/30 bg-[#1a5d8f]/5 text-[#1a5d8f] text-xs font-semibold py-1"
                  >
                    {currentRoleLabel}
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a5d8f]">
                        <Avatar className="h-9 w-9 border-2 border-[#1a5d8f]">
                          <AvatarFallback className="bg-[#1a5d8f] text-white font-semibold text-sm">
                            {userInitial}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold text-[#1f2933] max-w-[130px] truncate">
                          {user.name}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-64 bg-white border-[#e5e0d8] shadow-lg rounded-xl p-1"
                    >
                      <DropdownMenuLabel className="font-normal p-3">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-semibold text-[#0f2a43]">{user.name}</p>
                          <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
                          <div className="pt-1">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1a5d8f]/10 text-[#1a5d8f]">
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-[#e5e0d8]" />

                      {isIndicador && (
                        <>
                          <DropdownMenuItem
                            onClick={() => navigate('/indicador')}
                            className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                          >
                            <Home className="mr-2 h-4 w-4 text-[#1a5d8f]" />
                            Minhas Indicações
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate('/indicador/nova-indicacao')}
                            className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                          >
                            <PlusCircle className="mr-2 h-4 w-4 text-[#1a5d8f]" />
                            Nova Indicação
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate('/indicador/relatorio')}
                            className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                          >
                            <FileText className="mr-2 h-4 w-4 text-[#1a5d8f]" />
                            Meu Relatório
                          </DropdownMenuItem>
                        </>
                      )}

                      {isStaff && (
                        <>
                          <DropdownMenuItem
                            onClick={() => navigate('/admin')}
                            className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                          >
                            <LayoutDashboard className="mr-2 h-4 w-4 text-[#1a5d8f]" />
                            Painel do Dia
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate('/admin/indicacoes')}
                            className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                          >
                            <Filter className="mr-2 h-4 w-4 text-[#1a5d8f]" />
                            Todas as Indicações
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate('/admin/indicadores')}
                            className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                          >
                            <User className="mr-2 h-4 w-4 text-[#1a5d8f]" />
                            Gestão de Indicadores
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate('/admin/vitacon')}
                            className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                          >
                            <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                            Painel Vitacon SP
                          </DropdownMenuItem>
                          {(isMaster || user?.role === 'operator') && (
                            <DropdownMenuItem
                              onClick={() => navigate('/admin/financeiro')}
                              className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                            >
                              <Wallet className="mr-2 h-4 w-4 text-emerald-600" />
                              Gestão Financeira
                            </DropdownMenuItem>
                          )}
                          {isMaster && (
                            <>
                              <DropdownMenuItem
                                onClick={() => navigate('/admin/equipas')}
                                className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                              >
                                <Users2 className="mr-2 h-4 w-4 text-[#1a5d8f]" />
                                Gestão de Equipas
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate('/admin/configuracoes')}
                                className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                              >
                                <Settings className="mr-2 h-4 w-4 text-[#1a5d8f]" />
                                Configurações de Bônus
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      )}

                      <DropdownMenuItem
                        onClick={() => navigate('/dashboard')}
                        className="cursor-pointer py-2 text-sm font-medium focus:bg-[#faf7f2] focus:text-[#1a5d8f]"
                      >
                        <User className="mr-2 h-4 w-4 text-gray-500" />
                        Status da Conexão / Perfil
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-[#e5e0d8]" />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer py-2 text-sm font-medium text-red-600 focus:bg-red-50 focus:text-red-700"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair da Conta
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/login')}
                    className="border-[#1a5d8f] text-[#1a5d8f] hover:bg-[#1a5d8f] hover:text-white font-semibold rounded-lg px-4 h-10 transition-all duration-150"
                  >
                    Entrar
                  </Button>
                  <Button
                    onClick={() => navigate('/login')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg px-5 h-10 shadow-sm hover:shadow transition-all duration-150 hover:scale-[1.02]"
                  >
                    Acessar Painel
                  </Button>
                </div>
              )}
            </div>

            {/* Botão Hambúrguer Mobile */}
            <div className="flex items-center md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-lg text-[#0f2a43] hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-[#1a5d8f]"
                aria-label="Abrir menu de navegação"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* DRAWER MOBILE-FIRST RESPONSIVO */}
        <div
          className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Backdrop Escuro */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Painel Deslizante Mobile */}
          <div
            className={`fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${
              mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="overflow-y-auto">
              {/* Header do Drawer com Logo Vitacon */}
              <div className="flex items-center justify-between pb-5 border-b border-[#e5e0d8]">
                <div className="flex items-center gap-2.5">
                  <VitaconLogo size="sm" />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status do Backend & Papel do Usuário */}
              {user && (
                <div className="mt-4 p-3 bg-[#faf7f2] border border-[#e5e0d8] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Perfil Conectado:</span>
                    <span className="text-xs font-bold text-[#1a5d8f] uppercase">{user.role}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-600">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        supabaseStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    <span className="truncate">
                      {supabaseStatus.connected ? 'Backend Conectado' : 'Modo Seguro'}
                    </span>
                  </div>
                </div>
              )}

              {/* NAVEGAÇÃO CONDICIONAL MOBILE */}
              <nav className="mt-6 flex flex-col gap-1.5">
                {/* 1. SE LOGADO COMO INDICADOR */}
                {user && isIndicador && (
                  <>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 pb-1">
                      Menu do Indicador
                    </div>
                    {indicadorNavItems.map((item) => {
                      const Icon = item.icon
                      const isActive = item.exact
                        ? location.pathname === item.to
                        : location.pathname.startsWith(item.to)
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between p-3 rounded-xl font-semibold text-sm transition-colors ${
                            isActive
                              ? 'bg-[#1a5d8f] text-white shadow-sm'
                              : 'text-[#1f2933] hover:bg-[#faf7f2]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon
                              className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#1a5d8f]'}`}
                            />
                            <span>{item.title}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </Link>
                      )
                    })}
                  </>
                )}

                {/* 2. SE LOGADO COMO MASTER / OPERATOR / MANAGER */}
                {user && isStaff && (
                  <>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 pb-1">
                      Administração
                    </div>
                    {adminNavItems.map((item) => {
                      const Icon = item.icon
                      const isActive = item.exact
                        ? location.pathname === item.to
                        : location.pathname.startsWith(item.to)
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between p-3 rounded-xl font-semibold text-sm transition-colors ${
                            isActive
                              ? 'bg-[#1a5d8f] text-white shadow-sm'
                              : 'text-[#1f2933] hover:bg-[#faf7f2]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon
                              className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#1a5d8f]'}`}
                            />
                            <span>{item.title}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </Link>
                      )
                    })}

                    {/* Atalho para visão de indicador no mobile para master */}
                    {isMaster && (
                      <Link
                        to="/indicador"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl font-medium text-xs text-gray-500 hover:bg-[#faf7f2] mt-2 border-t border-[#e5e0d8]"
                      >
                        <div className="flex items-center gap-2">
                          <Home className="w-3.5 h-3.5" />
                          <span>Alternar: Visão Indicador</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </>
                )}

                {/* 3. SE NÃO ESTIVER LOGADO */}
                {!user && (
                  <>
                    <Link
                      to="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-xl font-semibold text-sm transition-colors ${
                        location.pathname === '/'
                          ? 'bg-[#1a5d8f] text-white'
                          : 'text-[#1f2933] hover:bg-[#faf7f2]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Home className="w-4 h-4" />
                        <span>Início</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </Link>

                    <a
                      href="/#como-funciona"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl font-semibold text-sm text-[#6b7280] hover:bg-[#faf7f2]"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-[#d9995b]" />
                        <span>Como Funciona</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </a>

                    <Link
                      to="/cadastro"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-xl font-semibold text-sm transition-colors ${
                        location.pathname === '/cadastro'
                          ? 'bg-[#1a5d8f] text-white'
                          : 'text-[#1f2933] hover:bg-[#faf7f2]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-[#1a5d8f]" />
                        <span>Seja um Indicador</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Rodapé do Drawer Mobile */}
            <div className="pt-5 border-t border-[#e5e0d8] flex flex-col gap-3">
              {user ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-2 bg-[#faf7f2] rounded-xl border border-[#e5e0d8]">
                    <Avatar className="h-10 w-10 border-2 border-[#1a5d8f]">
                      <AvatarFallback className="bg-[#1a5d8f] text-white font-bold">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <p className="font-semibold text-sm text-[#0f2a43] truncate">{user.name}</p>
                      <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 font-semibold h-11"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair da Conta
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate('/login')
                    }}
                    className="w-full border-[#1a5d8f] text-[#1a5d8f] font-semibold h-11"
                  >
                    Entrar
                  </Button>
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      navigate('/login')
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 shadow-sm"
                  >
                    Acessar Minha Conta
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ÁREA CENTRAL DE CONTEÚDO (Com Sidebar no Desktop para Rotas Internas) */}
      <div className="flex-1 pt-20 flex">
        {user && isInternalApp && !user.must_change_password ? (
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex gap-8">
            {/* SIDEBAR DESKTOP */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-28 bg-white rounded-2xl border border-[#e5e0d8] shadow-sm p-4 space-y-6">
                {/* Cabeçalho do Perfil na Sidebar */}
                <div className="flex items-center gap-3 pb-4 border-b border-[#e5e0d8]">
                  <Avatar className="h-11 w-11 border-2 border-[#1a5d8f]">
                    <AvatarFallback className="bg-[#1a5d8f] text-white font-bold text-base">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate">
                    <p className="font-bold text-sm text-[#0f2a43] truncate">{user.name}</p>
                    <span className="inline-block text-[11px] font-semibold text-[#1a5d8f] bg-[#1a5d8f]/10 px-2 py-0.5 rounded-md mt-0.5">
                      {currentRoleLabel}
                    </span>
                  </div>
                </div>

                {/* Itens do Indicador */}
                {isIndicador && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-3 pb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Menu do Indicador
                      </span>
                    </div>
                    {indicadorNavItems.map((item) => {
                      const Icon = item.icon
                      const isActive = item.exact
                        ? location.pathname === item.to
                        : location.pathname.startsWith(item.to)
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                            isActive
                              ? 'bg-[#1a5d8f] text-white shadow-sm'
                              : 'text-gray-700 hover:bg-[#faf7f2] hover:text-[#1a5d8f]'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#1a5d8f]'}`}
                          />
                          {item.title}
                        </Link>
                      )
                    })}
                  </div>
                )}

                {/* Itens do Admin (master, operator, manager) */}
                {isStaff && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-3 block mb-2">
                      Menu Administrativo
                    </span>
                    {adminNavItems.map((item) => {
                      const Icon = item.icon
                      const isActive = item.exact
                        ? location.pathname === item.to
                        : location.pathname.startsWith(item.to)
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                            isActive
                              ? 'bg-[#1a5d8f] text-white shadow-sm'
                              : 'text-gray-700 hover:bg-[#faf7f2] hover:text-[#1a5d8f]'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#1a5d8f]'}`}
                          />
                          {item.title}
                        </Link>
                      )
                    })}

                    {isMaster && (
                      <div className="pt-3 border-t border-[#e5e0d8] mt-3">
                        <Link
                          to="/indicador"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-[#faf7f2] hover:text-[#1a5d8f]"
                        >
                          <Home className="w-3.5 h-3.5" />
                          Acessar Visão Indicador
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Banner Vitacon */}
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <VitaconLogo size="sm" showTagline={false} />
                  </div>
                  <p className="text-[11px] text-emerald-900 leading-relaxed">
                    Exclusivo para clientes que adquiriram unidades Vitacon. Acompanhe suas
                    indicações e comissões.
                  </p>
                </div>
              </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL INTERNO */}
            <main className="flex-1 min-w-0">
              <Outlet />
            </main>
          </div>
        ) : (
          /* CONTEÚDO PÚBLICO OU FORA DO PAINEL */
          <main className="flex-1 flex flex-col">
            <Outlet />
          </main>
        )}
      </div>

      {/* RODAPÉ OFICIAL PROGRAMA DE INDICAÇÃO VITACON */}
      <footer className="bg-slate-950 text-white pt-14 pb-10 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-white/10">
            {/* Coluna 1: Marca Vitacon */}
            <div className="flex flex-col space-y-4">
              <VitaconLogo variant="dark" size="lg" />
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                Programa exclusivo de indicação para clientes com unidades adquiridas na Vitacon.
                Indique compradores e receba remuneração por cada fechamento concluído.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Vitacon Participações • Smart Living SP</span>
              </div>
            </div>

            {/* Coluna 2: Acesso Rápido */}
            <div className="flex flex-col space-y-3">
              <h3 className="text-base font-semibold text-white tracking-wide">Acesso</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/" className="hover:text-emerald-400 transition-colors">
                    Início
                  </Link>
                </li>
                {user ? (
                  <>
                    {isIndicador && (
                      <li>
                        <Link to="/indicador" className="hover:text-emerald-400 transition-colors">
                          Portal do Indicador
                        </Link>
                      </li>
                    )}
                    {isStaff && (
                      <li>
                        <Link to="/admin" className="hover:text-emerald-400 transition-colors">
                          Painel Master Admin
                        </Link>
                      </li>
                    )}
                  </>
                ) : (
                  <li>
                    <Link to="/login" className="hover:text-emerald-400 transition-colors">
                      Entrar no Sistema
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            {/* Coluna 3: Regras e Transparência */}
            <div className="flex flex-col space-y-3">
              <h3 className="text-base font-semibold text-white tracking-wide">
                Regras do Programa
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                • Válido exclusivamente para clientes com unidade comprada e autorização ativa pela
                administração.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                • O indicador acompanha em tempo real cada etapa: reunião, proposta, unidade
                escolhida e fechamento.
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>
              © {new Date().getFullYear()} Programa de Indicação Vitacon. Todos os direitos
              reservados.
            </p>
            <p>Plataforma Web Responsiva</p>
          </div>
        </div>
      </footer>

      {/* PROMPT DISCRETO DE INSTALAÇÃO PWA */}
      <InstallPwaPrompt />
    </div>
  )
}
