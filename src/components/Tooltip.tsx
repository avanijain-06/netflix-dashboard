interface TooltipPayload {
  name: string
  value: number
  color: string
}

interface Props {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

export default function CustomTooltip({ active, payload, label }: Props) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#181b21] border border-[#22262e] px-3 py-2 text-xs font-mono shadow-lg">
      {label && <div className="text-[#6b7280] mb-1 border-b border-[#22262e] pb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[#6b7280]">{p.name}:</span>
          <span className="text-[#e8eaed] font-semibold">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
