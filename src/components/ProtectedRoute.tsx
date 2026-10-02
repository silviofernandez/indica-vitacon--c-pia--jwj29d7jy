import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

import type { UserRole } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8">
        <Loader2 className="w-8 h-8 text-[#1a5d8f] animate-spin" />
        <p className="mt-3 text-sm text-[#6b7280]">Carregando sessão...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Se o usuário precisa obrigatoriamente trocar de senha no primeiro acesso
  if (user.must_change_password && location.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />
  }

  // Se o usuário JÁ trocou de senha e tenta acessar /trocar-senha, redireciona para a home do seu papel
  if (!user.must_change_password && location.pathname === '/trocar-senha') {
    const target = user.role === 'indicador' ? '/indicador' : '/admin'
    return <Navigate to={target} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redireciona de forma inteligente caso o papel não tenha permissão nesta rota
    const target = user.role === 'indicador' ? '/indicador' : '/admin'
    return <Navigate to={target} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
