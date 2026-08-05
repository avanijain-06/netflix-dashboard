import type {
  NetflixRow, AnalysisData, CorrCell, NullStat,
  TypeDist, YearDist, CountryStat, RatingStat,
  GenreStat, MonthStat, YearBucket, DirectorStat,
} from '../types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of arr) {
    const k = key(item)
    out[k] = (out[k] || 0) + 1
  }
  return out
}

function topN(obj: Record<string, number>, n: number): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA, dB = b[i] - meanB
    num += dA * dB; da += dA * dA; db += dB * dB
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db)
}

export function analyze(rows: NetflixRow[], fileName: string): AnalysisData {
  const totalRows = rows.length
  const columns = Object.keys(rows[0] ?? {})

  // ── Null counts (pre-cleaning) ────────────────────────────────────────────
  const nullCounts: NullStat[] = columns
    .map(col => {
      const nulls = rows.filter(r => !r[col] || r[col]!.trim() === '').length
      return {
        column: col,
        nulls,
        pctNum: parseFloat(((nulls / totalRows) * 100).toFixed(1)),
        pct: ((nulls / totalRows) * 100).toFixed(1) + '%',
      }
    })
    .filter(x => x.nulls > 0)
    .sort((a, b) => b.nulls - a.nulls)

  const totalNulls = nullCounts.reduce((s, x) => s + x.nulls, 0)

  // ── Data cleaning (mirrors the notebook) ─────────────────────────────────
  let cleaned = rows.map(r => ({
    ...r,
    director: r.director?.trim() || 'Unknown',
    cast:     r.cast?.trim()     || 'Not Available',
    country:  r.country?.trim()  || 'Unknown',
  }))

  cleaned = cleaned.filter(r => r.date_added?.trim() && r.rating?.trim())

  // Deduplicate by show_id if present, else by title+type
  const seen = new Set<string>()
  const beforeDedupe = cleaned.length
  cleaned = cleaned.filter(r => {
    const key = r.show_id?.trim() || `${r.title}|${r.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const duplicatesRemoved = beforeDedupe - cleaned.length

  const shape: [number, number] = [cleaned.length, columns.length]

  // ── Parse dates ───────────────────────────────────────────────────────────
  type Enriched = NetflixRow & { yearAdded: number; monthAdded: number }
  const withDates: Enriched[] = cleaned
    .map(r => {
      const d = new Date(r.date_added!)
      return { ...r, yearAdded: d.getFullYear(), monthAdded: d.getMonth() + 1 }
    })
    .filter(r => !isNaN(r.yearAdded)) as Enriched[]

  // Date range
  const years = withDates.map(r => r.yearAdded).sort((a, b) => a - b)
  const dateRange: [string, string] | null = years.length
    ? [String(years[0]), String(years[years.length - 1])]
    : null

  // ── Type distribution ────────────────────────────────────────────────────
  const typeDistribution: TypeDist[] = Object.entries(countBy(cleaned, r => r.type || 'Unknown'))
    .map(([name, count]) => ({ name, count }))

  // ── Content by year ───────────────────────────────────────────────────────
  const yearMap: Record<string, { Movies: number; 'TV Shows': number }> = {}
  for (const r of withDates) {
    const yr = String(r.yearAdded)
    if (!yearMap[yr]) yearMap[yr] = { Movies: 0, 'TV Shows': 0 }
    if (r.type === 'Movie') yearMap[yr].Movies++
    else yearMap[yr]['TV Shows']++
  }
  const contentByYear: YearDist[] = Object.entries(yearMap)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([year, v]) => ({ year, ...v, total: v.Movies + v['TV Shows'] }))

  // ── Top countries ─────────────────────────────────────────────────────────
  const countryCounts = countBy(cleaned, r => (r.country || '').split(',')[0].trim() || 'Unknown')
  const topCountries: CountryStat[] = topN(countryCounts, 10).map(([country, count]) => ({ country, count }))

  // ── Ratings ───────────────────────────────────────────────────────────────
  const ratingsDistribution: RatingStat[] = topN(countBy(cleaned, r => r.rating || 'NR'), 15)
    .map(([rating, count]) => ({ rating, count }))

  // ── Genres (multi-value field) ────────────────────────────────────────────
  const genreCounts: Record<string, number> = {}
  for (const r of cleaned) {
    for (const g of (r.listed_in || '').split(',')) {
      const genre = g.trim()
      if (genre) genreCounts[genre] = (genreCounts[genre] || 0) + 1
    }
  }
  const topGenres: GenreStat[] = topN(genreCounts, 10).map(([genre, count]) => ({ genre, count }))

  // ── Monthly additions ─────────────────────────────────────────────────────
  const monthCounts: Record<number, number> = {}
  for (const r of withDates) monthCounts[r.monthAdded] = (monthCounts[r.monthAdded] || 0) + 1
  const monthlyAdditions: MonthStat[] = MONTHS.map((month, i) => ({ month, count: monthCounts[i + 1] || 0 }))

  // ── Release year histogram (5-year buckets) ───────────────────────────────
  const relMap: Record<string, number> = {}
  for (const r of cleaned) {
    const yr = parseInt(r.release_year || '0')
    if (yr > 1900) {
      const bucket = String(Math.floor(yr / 5) * 5)
      relMap[bucket] = (relMap[bucket] || 0) + 1
    }
  }
  const releaseYearDist: YearBucket[] = Object.entries(relMap)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([year, count]) => ({ year, count }))

  // ── Top directors ─────────────────────────────────────────────────────────
  const dirCounts = countBy(cleaned, r => r.director || 'Unknown')
  delete dirCounts['Unknown']
  const topDirectors: DirectorStat[] = topN(dirCounts, 10).map(([director, count]) => ({ director, count }))

  // ── Correlation matrix ────────────────────────────────────────────────────
  const numericColumns: string[] = []
  const colSamples: Record<string, number[]> = {}

  for (const col of columns) {
    const vals = cleaned.map(r => parseFloat((r as Record<string, string | undefined>)[col] || '')).filter(v => !isNaN(v))
    if (vals.length > cleaned.length * 0.5) {
      numericColumns.push(col)
      colSamples[col] = vals
    }
  }

  // Always include derived numeric columns
  const derived = [
    { name: 'year_added',    vals: withDates.map(r => r.yearAdded) },
    { name: 'release_year',  vals: cleaned.map(r => parseInt(r.release_year || '')).filter(v => !isNaN(v)) },
  ]
  for (const { name, vals } of derived) {
    if (!numericColumns.includes(name) && vals.length > 0) {
      numericColumns.push(name)
      colSamples[name] = vals
    }
  }

  const correlationMatrix: CorrCell[] = []
  for (const r of numericColumns) {
    for (const c of numericColumns) {
      correlationMatrix.push({
        row: r, col: c,
        value: parseFloat(pearson(colSamples[r], colSamples[c]).toFixed(2)),
      })
    }
  }

  return {
    fileName, shape, columns, typeDistribution, contentByYear,
    topCountries, ratingsDistribution, topGenres, monthlyAdditions,
    releaseYearDist, topDirectors, correlationMatrix, numericColumns,
    nullCounts, totalNulls, totalRows, duplicatesRemoved, dateRange,
  }
}

export function downloadCleanedCSV(rows: NetflixRow[], fileName: string): void {
  const cleaned = rows
    .map(r => ({
      ...r,
      director: r.director?.trim() || 'Unknown',
      cast:     r.cast?.trim()     || 'Not Available',
      country:  r.country?.trim()  || 'Unknown',
    }))
    .filter(r => r.date_added?.trim() && r.rating?.trim())

  const cols = Object.keys(cleaned[0] ?? {})
  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`
  const lines = [cols.join(','), ...cleaned.map(r => cols.map(c => escape((r as Record<string, string | undefined>)[c] || '')).join(','))]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = fileName.replace('.csv', '_cleaned.csv')
  a.click()
  URL.revokeObjectURL(a.href)
}
