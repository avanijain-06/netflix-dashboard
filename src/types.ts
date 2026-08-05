export interface NetflixRow {
  show_id?: string
  type?: string
  title?: string
  director?: string
  cast?: string
  country?: string
  date_added?: string
  release_year?: string
  rating?: string
  duration?: string
  listed_in?: string
  description?: string
  [key: string]: string | undefined
}

export interface TypeDist { name: string; count: number }
export interface YearDist { year: string; Movies: number; 'TV Shows': number; total: number }
export interface CountryStat { country: string; count: number }
export interface RatingStat { rating: string; count: number }
export interface GenreStat { genre: string; count: number }
export interface MonthStat { month: string; count: number }
export interface YearBucket { year: string; count: number }
export interface DirectorStat { director: string; count: number }
export interface CorrCell { row: string; col: string; value: number }
export interface NullStat { column: string; nulls: number; pct: string; pctNum: number }

export interface AnalysisData {
  fileName: string
  shape: [number, number]
  columns: string[]
  typeDistribution: TypeDist[]
  contentByYear: YearDist[]
  topCountries: CountryStat[]
  ratingsDistribution: RatingStat[]
  topGenres: GenreStat[]
  monthlyAdditions: MonthStat[]
  releaseYearDist: YearBucket[]
  topDirectors: DirectorStat[]
  correlationMatrix: CorrCell[]
  numericColumns: string[]
  nullCounts: NullStat[]
  totalNulls: number
  totalRows: number
  duplicatesRemoved: number
  dateRange: [string, string] | null
}
