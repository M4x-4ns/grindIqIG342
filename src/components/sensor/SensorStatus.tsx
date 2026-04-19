import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '@/store/useAppStore'

export function SensorStatus() {
  const { sensor, setSensor } = useAppStore()
  const [open, setOpen]             = useState(false)
  const [manualTemp, setManualTemp]  = useState('')
  const [manualHum,  setManualHum]   = useState('')

  const isLoading     = sensor.status === 'loading'
  const isConnected   = sensor.status === 'connected'
  const temp = sensor.reading?.temperature
  const hum  = sensor.reading?.humidity

  function applyManual() {
    const t = parseFloat(manualTemp)
    const h = parseFloat(manualHum)
    if (!isNaN(t) && !isNaN(h)) {
      setSensor({
        status: 'connected',
        reading: { temperature: t, humidity: h, timestamp: new Date().toISOString() },
        lastUpdated: new Date().toISOString(),
        isManualOverride: true,
      })
      setOpen(false)
      setManualTemp('')
      setManualHum('')
    }
  }

  return (
    <>
      {/* Compact pill for header */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-[9px] bg-[var(--card2)] border border-[var(--border2)] rounded-full px-[14px] py-[8px] pl-[10px] hover:border-white/20 transition-colors"
      >
        {isLoading ? (
          <div className="w-[9px] h-[9px] rounded-full bg-[var(--muted)] animate-pulse" />
        ) : (
          <div
            className={`w-[9px] h-[9px] rounded-full flex-shrink-0 ${isConnected ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`}
            style={isConnected ? { animation: 'sensor-pulse 2.2s infinite' } : {}}
          />
        )}
        <div className="flex flex-col text-left">
          {isLoading ? (
            <span className="text-[13px] font-bold text-[var(--muted)] leading-none animate-pulse">
              Loading…
            </span>
          ) : (
            <span className="text-[13px] font-bold text-white leading-none">
              {isConnected && temp != null && hum != null
                ? `${temp.toFixed(1)}°C · ${Math.round(hum)}%`
                : 'Disconnected'}
            </span>
          )}
          <span className="text-[10px] text-[var(--muted)] mt-[2px]">
            {sensor.isManualOverride ? 'Manual' : 'ESP32 · Live'}
          </span>
        </div>
      </button>

      {/* Bottom-sheet modal — rendered via portal to escape the header's
          backdrop-filter containing block, which would otherwise clip
          position:fixed children to the header's bounding box */}
      {open && createPortal(
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-[6px] z-50 flex items-end justify-center"
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-[var(--card2)] border border-[var(--border2)] rounded-t-[22px] w-full max-w-3xl px-[22px] pt-5 pb-9 max-h-[70vh] overflow-y-auto">
            <div className="w-9 h-1 bg-[var(--border2)] rounded-full mx-auto mb-5" />
            <div className="text-[17px] font-extrabold text-white mb-[18px]">
              🌡 Sensor — ESP32 + DHT22
            </div>

            {isLoading ? (
              /* Loading skeleton */
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border-b border-[var(--border)] py-[13px] flex justify-between">
                    <div className="h-4 w-24 bg-[var(--card3)] rounded animate-pulse" />
                    <div className="h-4 w-16 bg-[var(--card3)] rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              [
                { label: 'Status',      value: isConnected ? '● Connected' : '● Disconnected', color: isConnected ? 'text-[var(--green)]' : 'text-[var(--red)]' },
                { label: 'Temperature', value: temp != null ? `${temp.toFixed(1)}°C` : '—',     color: 'text-white' },
                { label: 'Humidity',    value: hum  != null ? `${hum.toFixed(1)}%`  : '—',      color: 'text-white' },
              ].map(row => (
                <div key={row.label} className="border-b border-[var(--border)] py-[13px] flex justify-between text-[15px] last:border-b-0">
                  <span className="text-[var(--muted)]">{row.label}</span>
                  <span className={`font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))
            )}

            <div className="text-[11px] text-[var(--muted)] mt-[18px] mb-2">Manual override</div>
            <div className="flex gap-[10px]">
              <input
                type="number"
                placeholder="Temp °C"
                value={manualTemp}
                onChange={e => setManualTemp(e.target.value)}
                className="flex-1 bg-[var(--card3)] border border-[var(--border2)] rounded-[10px] px-[14px] py-3 text-white text-[15px] outline-none focus:border-[var(--red)] placeholder:text-[var(--muted2)]"
              />
              <input
                type="number"
                placeholder="Humidity %"
                value={manualHum}
                onChange={e => setManualHum(e.target.value)}
                className="flex-1 bg-[var(--card3)] border border-[var(--border2)] rounded-[10px] px-[14px] py-3 text-white text-[15px] outline-none focus:border-[var(--red)] placeholder:text-[var(--muted2)]"
              />
              <button
                onClick={applyManual}
                className="bg-[var(--red)] text-white font-extrabold text-[14px] rounded-[10px] px-[18px] py-3 hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Set
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-full mt-3 bg-[var(--card3)] border border-[var(--border)] text-[var(--text)] text-[15px] font-semibold rounded-[12px] py-[14px]"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
