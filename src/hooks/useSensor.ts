/**
 * useSensor.ts — University version
 * No ESP32 polling. Uses manual temp/humidity from the store.
 * Sensor values are set to defaults (25°C / 60%) on mount.
 */
import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function useSensor() {
  const { setSensor, sensor } = useAppStore()

  useEffect(() => {
    // Only set defaults if no reading exists yet
    if (!sensor.reading) {
      setSensor({
        status: 'connected',
        reading: { temperature: 25.0, humidity: 60.0, timestamp: new Date().toISOString() },
        lastUpdated: new Date().toISOString(),
        isManualOverride: true,
      })
    }
    // No interval polling — values stay until user changes them manually
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
