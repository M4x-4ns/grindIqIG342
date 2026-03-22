import type { GrinderType } from '@/types/grinder'

/** Grind display: stepless -> one decimal, stepped -> integer */
export function fmtGrind(grind: number, grinderType: GrinderType): string {
  return grinderType === 'stepless' ? grind.toFixed(1) : String(Math.round(grind))
}
