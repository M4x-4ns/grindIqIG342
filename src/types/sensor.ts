export type SensorStatus = 'connected' | 'disconnected' | 'loading'

export interface SensorReading {
  temperature: number
  humidity: number
  timestamp: string
}

export interface SensorState {
  status: SensorStatus
  reading: SensorReading | null
  lastUpdated: string | null
  isManualOverride: boolean
}
