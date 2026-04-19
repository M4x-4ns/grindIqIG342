export type ShotFeedback = 'under' | 'perfect' | 'over'

export interface ShotLog {
  id: string
  beanId: string
  grinderId: string
  recommendedGrind: number
  actualGrind: number
  temp: number
  humidity: number
  extractionTime?: number
  yieldMl?: number
  feedback: ShotFeedback
  baristaId?: string
  createdAt: string
}
