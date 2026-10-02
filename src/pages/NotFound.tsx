import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#faf7f2] px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#1a5d8f]/10 text-[#1a5d8f] flex items-center justify-center mx-auto">
          <Home className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-5xl font-extrabold text-[#1a5d8f]">404</span>
          <h1 className="text-2xl font-bold text-[#0f2a43]">Página Não Encontrada</h1>
          <p className="text-sm text-[#6b7280]">
            O endereço que você tentou acessar não existe ou foi movido na plataforma do Indica
            Gabriel.
          </p>
        </div>
        <div>
          <Button
            asChild
            className="bg-[#1a5d8f] hover:bg-[#144a72] text-white font-semibold rounded-lg px-6 h-11"
          >
            <Link to="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar para o Início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
