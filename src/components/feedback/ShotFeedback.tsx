import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { calculateGrind } from '@/utils/grindCalculator'
import type { ShotFeedback as FeedbackType } from '@/types/shot'

const BUTTONS = [
  {
    type:       'under' as FeedbackType,
    icon:       '◀◀',
    label:      'Under',
    sub:        'Too coarse',
    defaultCls: 'bg-[rgba(96,165,250,.08)] border-[rgba(96,165,250,.2)] hover:bg-[rgba(96,165,250,.14)] hover:border-[rgba(96,165,250,.35)]',
    activeCls:  'bg-[var(--blue)] border-[var(--blue)]',
    labelColor: 'text-[var(--blue)]',
  },
  {
    type:       'perfect' as FeedbackType,
    icon:       '✓',
    label:      'Perfect',
    sub:        'Perfect Shot!',
    defaultCls: 'bg-[rgba(34,197,94,.08)] border-[rgba(34,197,94,.2)] hover:bg-[rgba(34,197,94,.14)] hover:border-[rgba(34,197,94,.35)]',
    activeCls:  'bg-[var(--green)] border-[var(--green)]',
    labelColor: 'text-[var(--green)]',
  },
  {
    type:       'over' as FeedbackType,
    icon:       '▶▶',
    label:      'Over',
    sub:        'Too fine',
    defaultCls: 'bg-[rgba(204,36,36,.08)] border-[rgba(204,36,36,.2)] hover:bg-[rgba(204,36,36,.14)] hover:border-[rgba(204,36,36,.35)]',
    activeCls:  'bg-[var(--red)] border-[var(--red)] shadow-[0_0_16px_var(--red-glow)]',
    labelColor: 'text-[var(--red)]',
  },
] as const

const TOAST_MSGS: Record<FeedbackType, string> = {
  under:   '◀◀ Shot logged — Under Extracted',
  perfect: '✓ Shot logged — Perfect Shot! 🎉',
  over:    '▶▶ Shot logged — Over Extracted',
}

export function ShotFeedback() {
  const { selectedGrinder, selectedBean, sensor, saveShot, isSaving } = useAppStore()
  const [selected, setSelected] = useState<FeedbackType | null>(null)
  const [toast,    setToast]    = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleLogShot = useCallback(async () => {
    if (!selected || !selectedGrinder || !selectedBean || isSaving) return

    const temp     = sensor.reading?.temperature ?? 25
    const humidity = sensor.reading?.humidity    ?? 60
    const result   = calculateGrind(selectedBean, selectedGrinder, temp, humidity)

    try {
      await saveShot({
        id:               crypto.randomUUID(),
        beanId:           selectedBean.id,
        grinderId:        selectedGrinder.id,
        recommendedGrind: result.finalGrind,
        actualGrind:      result.finalGrind,
        temp,
        humidity,
        feedback:         selected,
        createdAt:        new Date().toISOString(),
      })

      setToast(TOAST_MSGS[selected])
      timerRef.current = setTimeout(() => {
        setToast(null)
        setSelected(null)
      }, 2200)
    } catch {
      setToast('⚠ Failed to save shot — check connection')
      timerRef.current = setTimeout(() => {
        setToast(null)
      }, 2200)
    }
  }, [selected, selectedGrinder, selectedBean, sensor, saveShot])

  return (
    <>
      {/* Toast */}
      <div
        className={`fixed bottom-[148px] left-1/2 -translate-x-1/2 bg-[var(--card2)] border border-[var(--border2)] rounded-full px-[22px] py-[10px] text-[13px] font-semibold text-[var(--text)] whitespace-nowrap pointer-events-none z-[100] shadow-[0_6px_24px_rgba(0,0,0,.5)] transition-all duration-[250ms]
          ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      >
        {toast}
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-[rgba(12,12,14,.9)] backdrop-blur-[20px] border-t border-[var(--border2)] px-4 pt-3 pb-6 z-30">
        <div className="text-[10px] font-bold uppercase tracking-[1px] text-[var(--muted)] text-center mb-[10px]">
          Shot Result — Log after brew
        </div>

        {/* Step 1: select feedback */}
        <div className="grid grid-cols-[1fr_1.25fr_1fr] gap-[10px] mb-[10px]">
          {BUTTONS.map(btn => {
            const isActive = selected === btn.type
            return (
              <button
                key={btn.type}
                onClick={() => setSelected(prev => prev === btn.type ? null : btn.type)}
                disabled={isSaving}
                className={`flex flex-col items-center justify-center gap-[3px] py-[14px] px-2 rounded-[var(--r)] border-[1.5px] transition-all duration-[150ms] active:scale-[.96] select-none
                  ${isActive ? btn.activeCls : btn.defaultCls}`}
              >
                <span className="text-[20px] leading-none">{btn.icon}</span>
                <span className={`text-[14px] font-extrabold tracking-[-0.2px] ${isActive ? 'text-black' : btn.labelColor}`}>
                  {btn.label}
                </span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-black/60' : 'text-[var(--muted)]'}`}>
                  {btn.sub}
                </span>
              </button>
            )
          })}
        </div>

        {/* Step 2: log shot */}
        <button
          onClick={handleLogShot}
          disabled={!selected || isSaving}
          className={`w-full py-[14px] rounded-[var(--r)] font-extrabold text-[15px] transition-all duration-[150ms] active:scale-[.99]
            ${selected && !isSaving
              ? 'bg-[var(--red)] text-white hover:opacity-90 shadow-[0_4px_20px_var(--red-glow)]'
              : 'bg-[var(--card3)] text-[var(--muted2)] cursor-not-allowed'
            }`}
        >
          {isSaving ? 'Saving…' : 'Log Shot'}
        </button>
      </div>
    </>
  )
}
