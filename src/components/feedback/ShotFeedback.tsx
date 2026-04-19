import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { calculateGrind } from '@/utils/grindCalculator'
import type { ShotFeedback as FeedbackType } from '@/types/shot'
import { detectCalibrationTrigger } from '@/utils/calibrationDetector'
import type { CalibrationSuggestion } from '@/utils/calibrationDetector'
import { CalibrationSuggestionCard } from './CalibrationSuggestionCard'

const BUTTONS = [
  {
    type:       'under' as FeedbackType,
    icon:       '◀◀',
    label:      'Under',
    sub:        'ไหลเร็วเกิน',
    defaultCls: 'bg-[var(--blue)] border-[var(--blue)]',
    activeCls:  'bg-[var(--blue)] border-[var(--blue)] outline outline-[2.5px] outline-white outline-offset-2',
    labelColor: 'text-black',
  },
  {
    type:       'perfect' as FeedbackType,
    icon:       '✓',
    label:      'Perfect',
    sub:        'ลงตัว',
    defaultCls: 'bg-[var(--green)] border-[var(--green)]',
    activeCls:  'bg-[var(--green)] border-[var(--green)] outline outline-[2.5px] outline-white outline-offset-2',
    labelColor: 'text-black',
  },
  {
    type:       'over' as FeedbackType,
    icon:       '▶▶',
    label:      'Over',
    sub:        'ไหลช้าเกิน',
    defaultCls: 'bg-[var(--red)] border-[var(--red)] shadow-[0_0_16px_var(--red-glow)]',
    activeCls:  'bg-[var(--red)] border-[var(--red)] shadow-[0_0_16px_var(--red-glow)] outline outline-[2.5px] outline-white outline-offset-2',
    labelColor: 'text-black',
  },
] as const

const TOAST_MSGS: Record<FeedbackType, string> = {
  under:   '◀◀ Shot logged — Under Extracted',
  perfect: '✓ Shot logged — Perfect Shot! 🎉',
  over:    '▶▶ Shot logged — Over Extracted',
}

export function ShotFeedback({ variant = 'fixed' }: { variant?: 'fixed' | 'inline' }) {
  const { selectedGrinder, selectedBean, sensor, saveShot, updateBean, isSaving } = useAppStore()
  const [selected,       setSelected]       = useState<FeedbackType | null>(null)
  const [toast,          setToast]          = useState<string | null>(null)
  const [extractionTime, setExtractionTime] = useState('')
  const [yieldMl,        setYieldMl]        = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [calibrationSuggestion, setCalibrationSuggestion] = useState<CalibrationSuggestion | null>(null)
  const calibrationSuggestionRef = useRef<CalibrationSuggestion | null>(null)
  useEffect(() => { calibrationSuggestionRef.current = calibrationSuggestion }, [calibrationSuggestion])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleAccept = useCallback(async () => {
    if (!calibrationSuggestion) return
    const currentBean = useAppStore.getState().selectedBean
    if (!currentBean) return
    await updateBean({
      ...currentBean,
      baselineGrinds: {
        ...currentBean.baselineGrinds,
        [calibrationSuggestion.grinderId]: calibrationSuggestion.suggestedBaseline,
      },
    })
    setCalibrationSuggestion(null)
    setToast(null)
    setSelected(null)
  }, [calibrationSuggestion, updateBean])

  const handleDismiss = useCallback(() => setCalibrationSuggestion(null), [])

  const handleLogShot = useCallback(async () => {
    if (!selected || !selectedGrinder || !selectedBean || isSaving) return

    const temp     = sensor.reading?.temperature ?? 25
    const humidity = sensor.reading?.humidity    ?? 60
    const result   = calculateGrind(selectedBean, selectedGrinder, temp, humidity)

    const currentBaseline = selectedBean.baselineGrinds[selectedGrinder.id] ?? selectedGrinder.baselineGrind

    const parsedTime  = extractionTime !== '' && !isNaN(parseFloat(extractionTime))
      ? parseFloat(extractionTime) : undefined
    const parsedYield = yieldMl !== '' && !isNaN(parseFloat(yieldMl))
      ? parseFloat(yieldMl) : undefined

    try {
      await saveShot({
        id:               crypto.randomUUID(),
        beanId:           selectedBean.id,
        grinderId:        selectedGrinder.id,
        recommendedGrind: result.finalGrind,
        actualGrind:      result.finalGrind,
        temp,
        humidity,
        extractionTime:   parsedTime,
        yieldMl:          parsedYield,
        feedback:         selected,
        createdAt:        new Date().toISOString(),
      })

      setExtractionTime('')
      setYieldMl('')

      const updatedShots = useAppStore.getState().shots
      const suggestion = detectCalibrationTrigger(updatedShots, selectedBean.id, selectedGrinder.id, currentBaseline)
      setCalibrationSuggestion(suggestion)

      setToast(TOAST_MSGS[selected])
      timerRef.current = setTimeout(() => {
        if (calibrationSuggestionRef.current !== null) return
        setToast(null)
        setSelected(null)
      }, 2200)
    } catch {
      setToast('⚠ Failed to save shot — check connection')
      timerRef.current = setTimeout(() => {
        setToast(null)
      }, 2200)
    }
  }, [selected, selectedGrinder, selectedBean, sensor, saveShot, isSaving, extractionTime, yieldMl])

  // ── variant-dependent wrapper classes ──────────────────────────────────────
  const toastCls = variant === 'inline'
    ? `absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100] bg-[var(--card2)] border border-[var(--border2)] rounded-full px-[22px] py-[10px] text-[13px] font-semibold text-[var(--text)] whitespace-nowrap pointer-events-none shadow-[0_6px_24px_rgba(0,0,0,.5)] transition-all duration-[250ms]`
    : `fixed bottom-[148px] left-1/2 -translate-x-1/2 z-[100] bg-[var(--card2)] border border-[var(--border2)] rounded-full px-[22px] py-[10px] text-[13px] font-semibold text-[var(--text)] whitespace-nowrap pointer-events-none shadow-[0_6px_24px_rgba(0,0,0,.5)] transition-all duration-[250ms]`

  const barCls = variant === 'inline'
    ? `border-t border-[var(--border2)] bg-[var(--bg)] px-4 pt-3 pb-4`
    : `fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-[rgba(12,12,14,.9)] backdrop-blur-[20px] border-t border-[var(--border2)] px-4 pt-3 pb-6 z-30`

  const toastEl = (
    <div className={`${toastCls} ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {toast}
    </div>
  )

  const barEl = (
    <div className={barCls}>
      {calibrationSuggestion && (
        <CalibrationSuggestionCard
          suggestion={calibrationSuggestion}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
        />
      )}

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
              <span className={`text-[14px] font-extrabold tracking-[-0.2px] ${btn.labelColor}`}>
                {btn.label}
              </span>
              <span className={`text-[10px] font-medium text-black/60`}>
                {btn.sub}
              </span>
            </button>
          )
        })}
      </div>

      {/* Step 1.5: optional extraction data — slides in after feedback is selected */}
      <div
        data-extraction-row
        className={`grid grid-cols-2 gap-[10px] overflow-hidden transition-all duration-[200ms]
          ${selected ? 'max-h-[100px] opacity-100 mb-[10px]' : 'max-h-0 opacity-0 mb-0 pointer-events-none'}`}
      >
        <div className="bg-[var(--card3)] border border-[var(--border2)] rounded-[10px] px-[12px] py-[10px]">
          <div className="text-[9px] font-bold uppercase tracking-[.5px] text-[var(--muted)] mb-[4px]">⏱ Time</div>
          <div className="flex items-baseline gap-[3px]">
            <input
              type="text"
              inputMode="decimal"
              maxLength={5}
              placeholder="25"
              value={extractionTime}
              onChange={e => setExtractionTime(e.target.value)}
              className="w-full bg-transparent text-[20px] font-extrabold text-white outline-none appearance-none"
            />
            <span className="text-[11px] font-semibold text-[var(--muted)] shrink-0">s</span>
          </div>
        </div>
        <div className="bg-[var(--card3)] border border-[var(--border2)] rounded-[10px] px-[12px] py-[10px]">
          <div className="text-[9px] font-bold uppercase tracking-[.5px] text-[var(--muted)] mb-[4px]">🫗 Yield</div>
          <div className="flex items-baseline gap-[3px]">
            <input
              type="text"
              inputMode="decimal"
              maxLength={5}
              placeholder="45"
              value={yieldMl}
              onChange={e => setYieldMl(e.target.value)}
              className="w-full bg-transparent text-[20px] font-extrabold text-white outline-none appearance-none"
            />
            <span className="text-[11px] font-semibold text-[var(--muted)] shrink-0">ml</span>
          </div>
        </div>
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
  )

  if (variant === 'inline') {
    return (
      <div className="relative">
        {toastEl}
        {barEl}
      </div>
    )
  }

  return (
    <>
      {toastEl}
      {barEl}
    </>
  )
}
