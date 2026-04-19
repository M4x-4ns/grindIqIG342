import { useEffect, useCallback } from 'react'
import { fetchSensorReading, POLL_INTERVAL_MS } from '@/services/sensorService'
import { useAppStore } from '@/store/useAppStore'

const DEV_BYPASS = import.meta.env.VITE_DEV_SENSOR_BYPASS === 'true'

/**
 * PRD §F-03 — Polls /api/sensor/latest every POLL_INTERVAL_MS (default 10s).
 * Sets status: 'disconnected' if the API is unreachable.
 * In local dev, VITE_DEV_SENSOR_BYPASS=true returns mock data instead.
 */
export function useSensor() {
  const { setSensor } = useAppStore()

  const poll = useCallback(async () => {
    if (DEV_BYPASS) {
      setSensor({
        status: 'connected',
        reading: { temperature: 25.0, humidity: 60.0, timestamp: new Date().toISOString() },
        lastUpdated: new Date().toISOString(),
        isManualOverride: false,
      })
      return
    }

    try {
      const reading = await fetchSensorReading()
      setSensor({
        status: 'connected',
        reading,
        lastUpdated: new Date().toISOString(),
        isManualOverride: false,
      })
    } catch {
      setSensor({ status: 'disconnected' })
    }
  }, [setSensor])

  useEffect(() => {
    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [poll])
}
