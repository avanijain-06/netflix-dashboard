import type { CorrCell } from '../types'

interface Props {
  matrix: CorrCell[]
  columns: string[]
}

function HeatCell({ value }: { value: number }) {
  const abs = Math.abs(value)
  const alpha = abs * 0.85 + 0.08
  const bg = value >= 0
    ? `rgba(229, 9, 20, ${alpha})`
    : `rgba(79, 195, 247, ${alpha})`
  const textColor = abs > 0.45 ? '#fff' : '#9ca3af'
  return (
    <div
      className="flex items-center justify-center text-[10px] font-mono border border-[#0a0c0f] transition-transform hover:scale-105 cursor-default select-none"
      style={{ background: bg, color: textColor, width: 52, height: 34 }}
      title={`${value >= 0 ? '+' : ''}${value.toFixed(2)}`}
    >
      {value.toFixed(2)}
    </div>
  )
}

export default function CorrelationHeatmap({ matrix, columns }: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Column headers */}
        <div className="flex mb-1">
          <div style={{ width: 128 }} className="shrink-0" />
          {columns.map(col => (
            <div
              key={col}
              style={{ width: 52 }}
              className="shrink-0 font-mono text-[9px] text-[#6b7280] text-center truncate px-0.5"
              title={col}
            >
              {col.length > 9 ? col.slice(0, 8) + '…' : col}
            </div>
          ))}
        </div>

        {/* Rows */}
        {columns.map(row => (
          <div key={row} className="flex items-center mb-px">
            <div
              style={{ width: 128 }}
              className="shrink-0 font-mono text-[9px] text-[#9ca3af] pr-3 text-right truncate"
              title={row}
            >
              {row}
            </div>
            {columns.map(col => {
              const cell = matrix.find(x => x.row === row && x.col === col)
              return <HeatCell key={col} value={cell?.value ?? 0} />
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 pl-32">
          <div className="flex items-center gap-2">
            <div
              className="h-2 rounded-sm"
              style={{ width: 64, background: 'linear-gradient(to right, rgba(79,195,247,0.93), rgba(79,195,247,0.08))' }}
            />
            <span className="font-mono text-[9px] text-[#6b7280]">−1.0 negative</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-2 rounded-sm"
              style={{ width: 64, background: 'linear-gradient(to right, rgba(229,9,20,0.08), rgba(229,9,20,0.93))' }}
            />
            <span className="font-mono text-[9px] text-[#6b7280]">+1.0 positive</span>
          </div>
        </div>
      </div>
    </div>
  )
}
