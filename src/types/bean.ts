import type { RoastLevel } from './grinder'

export interface BeanProfile {
  id: string
  name: string
  origin: string
  agtron: number
  roastLevel: RoastLevel
  baselineGrinds: Record<string, number>  // key = GrinderConfig.id
  baselineTemp: number      // °C, recommended 25
  baselineHumidity: number  // %
  targetExtractionTime?: number  // seconds; retained but not exposed in form
  isActive: boolean
  createdAt: string
}
