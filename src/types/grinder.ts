export type GrinderType = 'stepped' | 'stepless'
export type RoastLevel = 'light' | 'medium' | 'dark' | 'very-dark'

export interface GrinderConfig {
  id: string
  label: string        // 'A' | 'B' | 'C'
  roastLevel: RoastLevel
  grinderType: GrinderType
  baselineGrind: number
  tempCoefficient: number      // default 0.15 / °C
  humidityCoefficient: number  // default 0.05 / %
  isActive: boolean
}
