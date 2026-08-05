import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export default function ChartCard({ title, subtitle, children, className = '' }: Props) {
  return (
    <div className={`border border-[#22262e] bg-[#111317] p-5 ${className}`}>
      <div className="mb-4">
        <div className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest">{title}</div>
        {subtitle && <div className="text-[11px] text-[#3a3f48] mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}
