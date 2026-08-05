import { useState, useCallback, useMemo } from 'react'
import Papa from 'papaparse'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'

import type { NetflixRow, AnalysisData } from './types'
import { analyze, downloadCleanedCSV } from './utils/analyze'
import StatCard from './components/StatCard'
import ChartCard from './components/ChartCard'
import CustomTooltip from './components/Tooltip'
import CorrelationHeatmap from './components/CorrelationHeatmap'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = ['#e50914','#f5a623','#4fc3f7','#a78bfa','#34d399','#fb923c','#f472b6','#60a5fa','#facc15','#4ade80']

const shorten = (s: string, n = 16) => s.length > n ? s.slice(0, n - 1) + '…' : s

// ── Upload Panel ──────────────────────────────────────────────────────────────
function UploadPanel({ onFile, error }: { onFile: (f: File) => void; error: string }) {
  const [dragging, setDragging] = useState(false)

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[78vh] mx-6 my-6 border-2 border-dashed transition-colors duration-150
        ${dragging ? 'border-[#e50914] bg-[#130205]' : 'border-[#22262e] hover:border-[#3a3f48]'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="text-center px-8 max-w-lg space-y-5">
        <div className="font-mono text-[56px] leading-none text-[#22262e] select-none">↑</div>
        <div>
          <p className="font-mono text-base text-[#e8eaed] tracking-tight">Drop a CSV dataset to begin analysis</p>
          <p className="font-mono text-[11px] text-[#6b7280] mt-2 leading-relaxed">
            Expects columns: <span className="text-[#4fc3f7]">type, country, date_added, rating, listed_in, director, release_year</span>
            <br />Compatible with the Netflix Titles dataset and similar streaming catalogs.
          </p>
        </div>
        {error && (
          <div className="border border-[#e50914]/40 bg-[#e50914]/5 px-4 py-2 font-mono text-[11px] text-[#e50914]">
            {error}
          </div>
        )}
        <label className="inline-block cursor-pointer font-mono text-[11px] border border-[#4fc3f7] text-[#4fc3f7] px-5 py-2 hover:bg-[#4fc3f7] hover:text-[#0a0c0f] transition-colors">
          BROWSE FILE
          <input type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        </label>
      </div>
    </div>
  )
}

// ── Dataset Info Table ────────────────────────────────────────────────────────
function DatasetInfo({ data }: { data: AnalysisData }) {
  return (
    <div className="border border-[#22262e] bg-[#111317] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#22262e]">
        <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest">Columns ({data.columns.length})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-[#22262e]">
        {data.columns.map(col => {
          const nullStat = data.nullCounts.find(n => n.column === col)
          return (
            <div key={col} className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-[#e8eaed] truncate">{col}</span>
              {nullStat ? (
                <span className="font-mono text-[10px] text-[#e50914] shrink-0">{nullStat.pct} null</span>
              ) : (
                <span className="font-mono text-[10px] text-[#34d399] shrink-0">complete</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Insights Banner ───────────────────────────────────────────────────────────
function InsightsBanner({ data }: { data: AnalysisData }) {
  const topType   = data.typeDistribution.sort((a, b) => b.count - a.count)[0]
  const topCountry = data.topCountries[0]
  const topRating  = data.ratingsDistribution[0]
  const topGenre   = data.topGenres[0]
  const peakYear   = data.contentByYear.sort((a, b) => b.total - a.total)[0]

  const insights = [
    topType    && `${topType.name}s dominate at ${((topType.count / data.shape[0]) * 100).toFixed(0)}% of all content`,
    topCountry && `${topCountry.country} leads production with ${topCountry.count.toLocaleString()} titles`,
    topRating  && `${topRating.rating} is the most common rating (${topRating.count.toLocaleString()} titles)`,
    topGenre   && `"${topGenre.genre}" is the top genre with ${topGenre.count.toLocaleString()} entries`,
    peakYear   && `Peak content year: ${peakYear.year} (${peakYear.total.toLocaleString()} titles added)`,
  ].filter(Boolean) as string[]

  return (
    <div className="border border-[#22262e] bg-[#111317]">
      <div className="px-5 py-3 border-b border-[#22262e] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
        <span className="text-[10px] font-mono text-[#6b7280] uppercase tracking-widest">Key Insights</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[#22262e]">
        {insights.map((text, i) => (
          <div key={i} className="px-5 py-3 text-[11px] font-mono text-[#9ca3af] leading-relaxed">
            <span className="text-[#e50914] mr-2 font-semibold">#{i + 1}</span>{text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [data,     setData]     = useState<AnalysisData | null>(null)
  const [rawRows,  setRawRows]  = useState<NetflixRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const processFile = useCallback((file: File) => {
    setLoading(true)
    setError('')
    Papa.parse<NetflixRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        try {
          setRawRows(result.data)
          setData(analyze(result.data, file.name))
        } catch {
          setError('Analysis failed. Ensure the file is a valid CSV with the expected columns.')
        }
        setLoading(false)
      },
      error: () => { setError('Could not parse CSV file.'); setLoading(false) },
    })
  }, [])

  const corrColumns = useMemo(
    () => data ? [...new Set(data.correlationMatrix.map(x => x.row))] : [],
    [data]
  )

  return (
    <div className="min-h-screen bg-[#0a0c0f] text-[#e8eaed] font-sans">

      {/* ── Top Navigation ── */}
      <header className="sticky top-0 z-20 bg-[#0a0c0f]/95 backdrop-blur border-b border-[#22262e]">
        <div className="flex items-center justify-between px-6 h-12">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#e50914]" />
            <span className="font-mono text-sm font-semibold tracking-tight">DATASET ANALYZER</span>
            <span className="hidden sm:inline font-mono text-[10px] text-[#3a3f48]">/ Exploratory Data Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <>
                <span className="hidden sm:inline font-mono text-[10px] text-[#6b7280] bg-[#111317] border border-[#22262e] px-2 py-1">
                  {data.fileName}
                </span>
                <button
                  onClick={() => downloadCleanedCSV(rawRows, data.fileName)}
                  className="font-mono text-[10px] border border-[#34d399] text-[#34d399] px-3 py-1 hover:bg-[#34d399] hover:text-[#0a0c0f] transition-colors"
                >
                  EXPORT CLEANED
                </button>
                <button
                  onClick={() => { setData(null); setRawRows([]); setError('') }}
                  className="font-mono text-[10px] border border-[#3a3f48] text-[#6b7280] px-3 py-1 hover:border-[#6b7280] transition-colors"
                >
                  RESET
                </button>
              </>
            )}
            <label className="cursor-pointer font-mono text-[10px] border border-[#e50914] text-[#e50914] px-3 py-1 hover:bg-[#e50914] hover:text-white transition-colors">
              UPLOAD CSV
              <input type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
            </label>
          </div>
        </div>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="w-1.5 h-5 bg-[#e50914] animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <div className="font-mono text-[11px] text-[#6b7280] tracking-widest">ANALYZING DATASET…</div>
        </div>
      )}

      {/* ── Upload Panel ── */}
      {!data && !loading && <UploadPanel onFile={processFile} error={error} />}

      {/* ── Dashboard ── */}
      {data && !loading && (
        <main className="px-6 py-6 space-y-4">

          {/* Section: Overview */}
          <div>
            <SectionLabel index="01" title="Dataset Overview" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#22262e] mt-2">
              <StatCard label="Total Records"       value={data.shape[0]}          sub={`after cleaning (${data.totalRows.toLocaleString()} raw)`} />
              <StatCard label="Columns"             value={data.shape[1]}          sub={data.columns.slice(0, 4).join(', ')} />
              <StatCard label="Missing Values"      value={data.totalNulls}        sub={`across ${data.nullCounts.length} columns`} accent={data.totalNulls > 0} />
              <StatCard label="Duplicates Removed"  value={data.duplicatesRemoved} sub={data.dateRange ? `${data.dateRange[0]}–${data.dateRange[1]} date range` : undefined} />
            </div>
          </div>

          {/* Insights */}
          <InsightsBanner data={data} />

          {/* Section: Data Quality */}
          <div>
            <SectionLabel index="02" title="Data Quality — Missing Values" />
            <div className="border border-[#22262e] bg-[#111317] p-5 mt-2">
              {data.nullCounts.length === 0 ? (
                <p className="font-mono text-[11px] text-[#34d399]">No missing values detected.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.nullCounts.map(nc => (
                    <div key={nc.column} className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-[#9ca3af] w-36 shrink-0 truncate">{nc.column}</span>
                      <div className="flex-1 h-1.5 bg-[#22262e] rounded-full overflow-hidden">
                        <div className="h-full bg-[#e50914] rounded-full" style={{ width: `${Math.min(nc.pctNum, 100)}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-[#6b7280] w-16 text-right shrink-0">
                        {nc.nulls.toLocaleString()} ({nc.pct})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: Column Schema */}
          <div>
            <SectionLabel index="03" title="Column Schema" />
            <div className="mt-2">
              <DatasetInfo data={data} />
            </div>
          </div>

          {/* Section: Content Distribution */}
          <SectionLabel index="04" title="Content Distribution" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#22262e]">

            <ChartCard title="Movies vs TV Shows" subtitle="Count by content type">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data.typeDistribution} barCategoryGap="35%" margin={{ top: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a1e25" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="count" name="Count" radius={[3, 3, 0, 0]}>
                    {data.typeDistribution.map((_, i) => <Cell key={i} fill={C[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ratings Distribution" subtitle="Top 15 content ratings">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data.ratingsDistribution} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a1e25" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="rating" width={36} tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="count" name="Count" radius={[0, 3, 3, 0]}>
                    {data.ratingsDistribution.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Monthly Content Addition" subtitle="Content added per calendar month">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data.monthlyAdditions} barCategoryGap="20%" margin={{ top: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a1e25" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="count" name="Count" fill={C[2]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>

          {/* Section: Geographic & Genre */}
          <SectionLabel index="05" title="Geography & Genre" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#22262e]">

            <ChartCard title="Top 10 Countries by Production" subtitle="Primary country of origin">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topCountries} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a1e25" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="country" width={88} tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={s => shorten(s, 14)} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="count" name="Titles" radius={[0, 3, 3, 0]}>
                    {data.topCountries.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 Genres" subtitle="Genres from listed_in (multi-value field)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topGenres} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a1e25" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="genre" width={132} tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={s => shorten(s, 20)} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="count" name="Count" radius={[0, 3, 3, 0]}>
                    {data.topGenres.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>

          {/* Section: Temporal Trends */}
          <SectionLabel index="06" title="Temporal Trends" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-[#22262e]">

            <ChartCard title="Content Added Over Years" subtitle="Total, Movies, and TV Shows trend lines">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.contentByYear} margin={{ top: 4, right: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a1e25" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#6b7280', paddingTop: 8 }} />
                  <Line type="monotone" dataKey="total"     name="Total"    stroke={C[0]} strokeWidth={2}   dot={false} />
                  <Line type="monotone" dataKey="Movies"    name="Movies"   stroke={C[1]} strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                  <Line type="monotone" dataKey="TV Shows"  name="TV Shows" stroke={C[2]} strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Movies vs TV Shows by Year" subtitle="Stacked comparison per year">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.contentByYear} barCategoryGap="15%" barGap={2} margin={{ top: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a1e25" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: '#6b7280', paddingTop: 8 }} />
                  <Bar dataKey="Movies"   name="Movies"   fill={C[0]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="TV Shows" name="TV Shows" fill={C[2]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Release Year Distribution" subtitle="Titles grouped by 5-year release buckets">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.releaseYearDist} barCategoryGap="10%" margin={{ top: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a1e25" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="count" name="Titles" fill={C[1]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 Directors" subtitle="By number of titles (excludes Unknown)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topDirectors} barCategoryGap="25%" margin={{ top: 4 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1a1e25" vertical={false} />
                  <XAxis dataKey="director" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={s => shorten(s, 11)} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                  <Bar dataKey="count" name="Titles" radius={[3, 3, 0, 0]}>
                    {data.topDirectors.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>

          {/* Section: Correlation Heatmap */}
          {corrColumns.length >= 2 && (
            <>
              <SectionLabel index="07" title="Correlation Heatmap" />
              <ChartCard
                title="Pearson Correlation — Numeric Columns"
                subtitle="Values range from −1 (negative) to +1 (positive). Diagonal is always 1.00."
              >
                <CorrelationHeatmap matrix={data.correlationMatrix} columns={corrColumns} />
              </ChartCard>
            </>
          )}

          {/* Footer */}
          <footer className="border-t border-[#22262e] pt-4 pb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#3a3f48]">
              DATASET ANALYZER — EDA TOOL
            </span>
            <span className="font-mono text-[10px] text-[#3a3f48]">
              {data.shape[0].toLocaleString()} records · {data.shape[1]} columns · {data.duplicatesRemoved} duplicates removed
            </span>
          </footer>

        </main>
      )}
    </div>
  )
}

// ── Shared section label ──────────────────────────────────────────────────────
function SectionLabel({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="font-mono text-[10px] text-[#e50914] tracking-widest">{index}</span>
      <span className="font-mono text-[11px] text-[#6b7280] uppercase tracking-widest">{title}</span>
      <div className="flex-1 h-px bg-[#22262e]" />
    </div>
  )
}
