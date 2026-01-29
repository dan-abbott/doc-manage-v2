import { Shield, ShieldAlert, ShieldCheck, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScanStatusBadgeProps {
  status: 'pending' | 'scanning' | 'safe' | 'blocked' | 'error'
  className?: string
  showText?: boolean
}

export function ScanStatusBadge({ status, className, showText = true }: ScanStatusBadgeProps) {
  const configs = {
    pending: {
      icon: Clock,
      text: 'Scanning...',
      color: 'text-yellow-600 bg-yellow-50',
      iconClass: 'animate-pulse',
    },
    scanning: {
      icon: Shield,
      text: 'Scanning...',
      color: 'text-blue-600 bg-blue-50',
      iconClass: 'animate-pulse',
    },
    safe: {
      icon: ShieldCheck,
      text: 'Safe',
      color: 'text-green-600 bg-green-50',
      iconClass: '',
    },
    blocked: {
      icon: ShieldAlert,
      text: 'Blocked',
      color: 'text-red-600 bg-red-50',
      iconClass: '',
    },
    error: {
      icon: AlertCircle,
      text: 'Scan Error',
      color: 'text-orange-600 bg-orange-50',
      iconClass: '',
    },
  }

  const config = configs[status]
  const Icon = config.icon

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
      config.color,
      className
    )}>
      <Icon className={cn('h-3 w-3', config.iconClass)} />
      {showText && <span>{config.text}</span>}
    </div>
  )
}
