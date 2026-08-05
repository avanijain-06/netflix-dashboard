interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

export default function StatCard({ label, value, sub, accent }: Props) {
  return (
    <div className="border border-[#22262e] bg-[#111317] p-4 flex flex-col gap-1">
      <div className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest">{label}</div>
      <div className={`text-2xl font-mono font-semibold ${accent ? 'text-[#e50914]' : 'text-[#e8eaed]'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-[11px] text-[#6b7280] truncate">{sub}</div>}
    </div>
  )
}
