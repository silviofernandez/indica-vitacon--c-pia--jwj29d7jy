/* Main App Component - Handles routing (using react-router-dom), AuthProvider and toast providers */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Páginas públicas e auth
import Index from './pages/Index'
import Auth from './pages/Auth'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import TrocarSenha from './pages/TrocarSenha'
import Dashboard from './pages/Dashboard'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'

// Páginas do Indicador
import IndicadorDashboard from './pages/indicador/IndicadorDashboard'
import NovaIndicacao from './pages/indicador/NovaIndicacao'
import IndicadorRelatorio from './pages/indicador/IndicadorRelatorio'

// Páginas do Painel Administrativo
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminIndicacoes from './pages/admin/AdminIndicacoes'
import AdminIndicacaoDetalhe from './pages/admin/AdminIndicacaoDetalhe'
import AdminIndicadores from './pages/admin/AdminIndicadores'
import AdminFinanceiro from './pages/admin/AdminFinanceiro'
import AdminVitacon from './pages/admin/AdminVitacon'
import AdminEquipas from './pages/admin/AdminEquipas'
import AdminConfiguracoes from './pages/admin/AdminConfiguracoes'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            {/* Rota Pública Principal */}
            <Route path="/" element={<Index />} />

            {/* Rota Pública de Cadastro do Indicador */}
            <Route path="/cadastro" element={<Cadastro />} />

            {/* Rotas de Autenticação e Recuperação de Senha */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Rota Protegida de Troca Obrigatória de Senha */}
            <Route
              path="/trocar-senha"
              element={
                <ProtectedRoute>
                  <TrocarSenha />
                </ProtectedRoute>
              }
            />

            {/* Rota Protegida Legada Dashboard (mantida com fallback) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Rotas do Indicador */}
            <Route
              path="/indicador"
              element={
                <ProtectedRoute allowedRoles={['indicador', 'master']}>
                  <IndicadorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/indicador/nova-indicacao"
              element={
                <ProtectedRoute allowedRoles={['indicador', 'master']}>
                  <NovaIndicacao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/indicador/relatorio"
              element={
                <ProtectedRoute allowedRoles={['indicador', 'master']}>
                  <IndicadorRelatorio />
                </ProtectedRoute>
              }
            />

            {/* Rotas do Painel Administrativo (master, operator, manager) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['master', 'operator', 'manager']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/indicacoes"
              element={
                <ProtectedRoute allowedRoles={['master', 'operator', 'manager']}>
                  <AdminIndicacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/indicacao/:id"
              element={
                <ProtectedRoute allowedRoles={['master', 'operator', 'manager']}>
                  <AdminIndicacaoDetalhe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/indicadores"
              element={
                <ProtectedRoute allowedRoles={['master', 'operator']}>
                  <AdminIndicadores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/vitacon"
              element={
                <ProtectedRoute allowedRoles={['master', 'operator', 'manager']}>
                  <AdminVitacon />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/financeiro"
              element={
                <ProtectedRoute allowedRoles={['master', 'operator']}>
                  <AdminFinanceiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipas"
              element={
                <ProtectedRoute allowedRoles={['master']}>
                  <AdminEquipas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configuracoes"
              element={
                <ProtectedRoute allowedRoles={['master']}>
                  <AdminConfiguracoes />
                </ProtectedRoute>
              }
            />

            {/* Rota 404 personalizada */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
