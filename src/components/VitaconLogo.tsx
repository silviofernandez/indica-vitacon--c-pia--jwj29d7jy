import React from 'react'
import { Building2 } from 'lucide-react'

export interface VitaconLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'light' | 'dark'
  showTagline?: boolean
}

export const VitaconLogo: React.FC<VitaconLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'light',
  showTagline = true,
}) => {
  const isLight = variant === 'light'

  const sizeClasses = {
    sm: { icon: 'w-6 h-6', title: 'text-base', tag: 'text-[10px]' },
    md: { icon: 'w-8 h-8', title: 'text-xl', tag: 'text-xs' },
    lg: { icon: 'w-10 h-10', title: 'text-2xl', tag: 'text-xs' },
    xl: { icon: 'w-12 h-12', title: 'text-3xl', tag: 'text-sm' },
  }[size]

  return (
    <div className={`flex items-center gap-2.5 font-sans select-none ${className}`}>
      {/* Ícone estilizado Vitacon (Smart Living / Geometric) */}
      <div
        className={`flex items-center justify-center rounded-xl transition-transform ${
          isLight
            ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm'
            : 'bg-white text-emerald-700 shadow-md'
        } ${sizeClasses.icon}`}
      >
        <Building2 className="w-5/6 h-5/6 p-0.5" strokeWidth={2.2} />
      </div>

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black tracking-tight ${sizeClasses.title} ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            VITACON
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
            Indica
          </span>
        </div>
        {showTagline && (
          <span
            className={`font-medium tracking-wide mt-0.5 uppercase ${sizeClasses.tag} ${
              isLight ? 'text-slate-500' : 'text-slate-300'
            }`}
          >
            Programa de Indicação
          </span>
        )}
      </div>
    </div>
  )
}

export default VitaconLogo
