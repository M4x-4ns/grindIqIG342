import type { SensorReading } from '@/types/sensor'

/**
 * PRD §F-03 — Sensor Integration via Vercel API
 * Fetches the latest temperature & humidity from /api/sensor/latest.
 * Poll interval is 10 s.
 */
export const POLL_INTERVAL_MS = 10_000

export async function fetchSensorReading(): Promise<SensorReading> {
  const res = await fetch('/api/sensor/latest')
  if (!res.ok) throw new Error(`Sensor API ${res.status}`)
  return res.json() as Promise<SensorReading>
}
