import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ text = 'Se incarca...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-text-muted">
      <Loader2 size={24} className="animate-spin text-primary" />
      <span className="text-sm">{text}</span>
    </div>
  )
}
