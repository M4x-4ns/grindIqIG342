import { useState, useRef, useEffect } from 'react'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig, RoastLevel } from '@/types/grinder'

// Accent colours for grinder rows — ordered by grinder list index
const GRINDER_COLORS = ['#fbbf24', '#d4845a', '#a0663c']

const ROAST_LEVELS: { value: RoastLevel; label: string }[] = [
  { value: 'light',     label: '☀ Light'  },
  { value: 'medium',    label: '⛅ Med'   },
  { value: 'dark',      label: '🌑 Dark'  },
  { value: 'very-dark', label: '🌑 V.Dark' },
]

type FormValues = {
  name: string
  origin: string
  agtron: string
  roastLevel: RoastLevel
  baselineGrinds: Record<string, string>
  baselineTemp: string
  baselineHumidity: string
  isActive: boolean
}

type FormErrors = Partial<Record<string, string>>

interface BeanFormProps {
  initialBean?: BeanProfile
  grinders: GrinderConfig[]
  onSave: (bean: BeanProfile) => void
  onHide?: () => void
  onDelete?: () => void
  isSaving?: boolean
}

function initValues(bean: BeanProfile | undefined, grinders: GrinderConfig[]): FormValues {
  if (bean) {
    return {
      name: bean.name,
      origin: bean.origin,
      agtron: String(bean.agtron),
      roastLevel: bean.roastLevel,
      baselineGrinds: Object.fromEntries(
        grinders.map((g) => [g.id, String(bean.baselineGrinds[g.id] ?? '')])
      ),
      baselineTemp: String(bean.baselineTemp),
      baselineHumidity: String(bean.baselineHumidity),
      isActive: bean.isActive,
    }
  }
  return {
    name: '',
    origin: '',
    agtron: '',
    roastLevel: 'medium',
    baselineGrinds: Object.fromEntries(grinders.map((g) => [g.id, ''])),
    baselineTemp: '',
    baselineHumidity: '',
    isActive: true,
  }
}

function validate(values: FormValues, grinders: GrinderConfig[]): FormErrors {
  const errors: FormErrors = {}
  if (!values.name.trim()) errors.name = 'Required'
  if (!values.origin.trim()) errors.origin = 'Required'
  const agt = Number(values.agtron)
  if (!values.agtron || isNaN(agt) || !Number.isInteger(agt) || agt < 0 || agt > 100)
    errors.agtron = 'Must be an integer 0–100'
  grinders.forEach((g) => {
    const raw = values.baselineGrinds[g.id]
    if (!raw) return // empty → saves as 0, no error
    const val = Number(raw)
    if (isNaN(val) || val < 0) {
      errors[`grind_${g.id}`] = 'Must be ≥ 0'
    } else if (Math.round(val * 10) / 10 !== val) {
      errors[`grind_${g.id}`] = 'Max 1 decimal place'
    }
  })
  const temp = Number(values.baselineTemp)
  if (!values.baselineTemp || isNaN(temp) || temp < -40 || temp > 80)
    errors.baselineTemp = 'Must be −40 to 80'
  const hum = Number(values.baselineHumidity)
  if (!values.baselineHumidity || isNaN(hum) || hum < 0 || hum > 100)
    errors.baselineHumidity = 'Must be 0–100'
  return errors
}

function allRequiredFilled(values: FormValues): boolean {
  if (!values.name.trim() || !values.origin.trim() || !values.agtron) return false
  if (!values.baselineTemp || !values.baselineHumidity) return false
  return true
}

export function BeanForm({ initialBean, grinders, onSave, onHide, onDelete, isSaving }: BeanFormProps) {
  const isEditMode = !!initialBean
  const [values, setValues] = useState<FormValues>(() => initValues(initialBean, grinders))
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmRef = useRef<HTMLDivElement>(null)

  // Dismiss confirm-delete when clicking anywhere outside the confirmation row
  useEffect(() => {
    if (!confirmDelete) return
    function handleClickOutside(e: MouseEvent) {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) {
        setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [confirmDelete])

  const isSaveEnabled =
    allRequiredFilled(values) &&
    Object.keys(validate(values, grinders)).length === 0

  function handleBlur(field: string) {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validate(values, grinders))
  }

  function handleSubmit() {
    const errs = validate(values, grinders)
    setErrors(errs)
    setTouched(Object.keys(errs).reduce<Record<string, boolean>>((a, k) => ({ ...a, [k]: true }), {}))
    if (Object.keys(errs).length > 0) return
    const bean: BeanProfile = {
      ...(initialBean ?? {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }),
      name: values.name.trim(),
      origin: values.origin.trim(),
      agtron: parseInt(values.agtron, 10),
      roastLevel: values.roastLevel,
      baselineGrinds: Object.fromEntries(
        grinders.map((g) => {
          const raw = values.baselineGrinds[g.id]
          return [g.id, raw ? parseFloat(raw) : 0]
        })
      ),
      baselineTemp: parseFloat(values.baselineTemp),
      baselineHumidity: parseFloat(values.baselineHumidity),
      isActive: values.isActive,
    }
    onSave(bean)
  }

  const inputCls = 'w-full bg-[var(--card3)] border border-[var(--border)] rounded-[7px] px-[9px] py-[7px] text-[12px] text-[var(--text)] outline-none focus:border-[var(--red)]'
  const labelCls = 'block text-[9px] text-[var(--text2)] uppercase tracking-[.5px] mb-[3px]'
  const sectionCls = 'text-[9px] font-bold uppercase tracking-[.8px] text-[var(--text3)] mt-[12px] mb-[7px] flex items-center gap-[6px]'

  return (
    <div className="flex flex-col">
      {/* Name */}
      <div className="mb-[9px]">
        <label htmlFor="bf-name" className={labelCls}>Name</label>
        <input
          id="bf-name"
          aria-label="Name"
          className={inputCls}
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          onBlur={() => handleBlur('name')}
          placeholder="e.g. Ethiopia Yirgacheffe"
        />
        {touched.name && errors.name && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.name}</p>}
      </div>

      {/* Origin + Agtron row */}
      <div className="flex gap-[7px] mb-[9px]">
        <div style={{ flex: '1.4' }}>
          <label htmlFor="bf-origin" className={labelCls}>Origin</label>
          <input
            id="bf-origin"
            aria-label="Origin"
            className={inputCls}
            value={values.origin}
            onChange={(e) => setValues((v) => ({ ...v, origin: e.target.value }))}
            onBlur={() => handleBlur('origin')}
            placeholder="e.g. Ethiopia"
          />
          {touched.origin && errors.origin && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.origin}</p>}
        </div>
        <div style={{ flex: '1' }}>
          <label htmlFor="bf-agtron" className={labelCls}>Agtron</label>
          <input
            id="bf-agtron"
            aria-label="Agtron"
            type="number"
            className={inputCls}
            value={values.agtron}
            onChange={(e) => setValues((v) => ({ ...v, agtron: e.target.value }))}
            onBlur={() => handleBlur('agtron')}
            placeholder="0–100"
          />
          {touched.agtron && errors.agtron && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.agtron}</p>}
        </div>
      </div>

      {/* Roast Level */}
      <div className="mb-[9px]">
        <div className={labelCls}>Roast Level</div>
        <div className="flex gap-[5px] mt-[3px]">
          {ROAST_LEVELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValues((v) => ({ ...v, roastLevel: value }))}
              className={`flex-1 rounded-[6px] py-[5px] px-[4px] text-[9px] text-center border transition-colors
                ${values.roastLevel === value
                  ? 'bg-[var(--red-soft)] border-[var(--red)] text-[var(--text)]'
                  : 'bg-[var(--card3)] border-[var(--border)] text-[var(--text2)]'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Baseline Grind section */}
      <div className={sectionCls}>
        Baseline Grind
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      {grinders.map((g, i) => (
        <div key={g.id} className="flex items-center bg-[var(--card3)] border border-[var(--border)] rounded-[8px] px-[9px] py-[7px] mb-[6px] gap-[8px]">
          <div
            className="w-[8px] h-[8px] rounded-full flex-shrink-0"
            style={{ background: GRINDER_COLORS[i] ?? '#9a9aa8' }}
          />
          <span className="text-[11px] text-[var(--text2)] flex-1">{g.label}</span>
          <input
            aria-label={g.label}
            type="number"
            step="0.5"
            className="bg-transparent text-[14px] font-bold text-[var(--text)] text-right w-[50px] outline-none"
            value={values.baselineGrinds[g.id] ?? ''}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                baselineGrinds: { ...v.baselineGrinds, [g.id]: e.target.value },
              }))
            }
            onBlur={() => handleBlur(`grind_${g.id}`)}
            placeholder="0"
          />
          <span className="text-[10px] text-[var(--text3)]">steps</span>
          {touched[`grind_${g.id}`] && errors[`grind_${g.id}`] && (
            <p className="text-[10px] text-[var(--red)]">{errors[`grind_${g.id}`]}</p>
          )}
        </div>
      ))}

      {/* Baseline Conditions */}
      <div className={sectionCls} style={{ marginTop: '4px' }}>
        Baseline Conditions
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
      <div className="flex gap-[7px] mb-[9px]">
        <div className="flex-1">
          <label htmlFor="bf-temp" className={labelCls}>Temp (°C)</label>
          <input
            id="bf-temp"
            aria-label="Temp"
            type="number"
            className={inputCls}
            value={values.baselineTemp}
            onChange={(e) => setValues((v) => ({ ...v, baselineTemp: e.target.value }))}
            onBlur={() => handleBlur('baselineTemp')}
            placeholder="25"
          />
          {touched.baselineTemp && errors.baselineTemp && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.baselineTemp}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="bf-humidity" className={labelCls}>Humidity (%)</label>
          <input
            id="bf-humidity"
            aria-label="Humidity"
            type="number"
            className={inputCls}
            value={values.baselineHumidity}
            onChange={(e) => setValues((v) => ({ ...v, baselineHumidity: e.target.value }))}
            onBlur={() => handleBlur('baselineHumidity')}
            placeholder="60"
          />
          {touched.baselineHumidity && errors.baselineHumidity && <p className="text-[10px] text-[var(--red)] mt-[2px]">{errors.baselineHumidity}</p>}
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between bg-[var(--card3)] border border-[var(--border)] rounded-[8px] px-[10px] py-[8px] mb-[9px]">
        <span className="text-[12px] text-[var(--text)]">Active</span>
        <button
          type="button"
          onClick={() => setValues((v) => ({ ...v, isActive: !v.isActive }))}
          className={`w-[32px] h-[18px] rounded-[9px] relative transition-colors ${values.isActive ? 'bg-[#4ade80]' : 'bg-[var(--text3)]'}`}
        >
          <span
            className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ${values.isActive ? 'right-[2px]' : 'left-[2px]'}`}
          />
        </button>
      </div>

      {/* Primary action */}
      <button
        type="button"
        disabled={!isSaveEnabled || !!isSaving}
        onClick={handleSubmit}
        className="w-full bg-[var(--red)] rounded-[9px] py-[10px] text-[13px] font-bold text-white mt-[4px] disabled:opacity-40"
      >
        {isEditMode ? 'Save Changes' : 'Add Bean'}
      </button>

      {/* Edit-only: Hide */}
      {isEditMode && onHide && (
        <button
          type="button"
          onClick={onHide}
          disabled={!!isSaving}
          className="w-full text-center mt-[8px] text-[11px] text-[var(--text3)]"
        >
          Hide Bean Profile
        </button>
      )}

      {/* Edit-only: Delete (with confirm flow) */}
      {isEditMode && onDelete && !confirmDelete && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={!!isSaving}
          className="w-full text-center mt-[4px] text-[11px] text-[var(--red)] opacity-60"
        >
          Delete Permanently
        </button>
      )}
      {isEditMode && onDelete && confirmDelete && (
        <div ref={confirmRef} className="mt-[8px] bg-[rgba(204,36,36,0.1)] border border-[rgba(204,36,36,0.3)] rounded-[8px] px-[10px] py-[8px]">
          <p className="text-[11px] text-[var(--text2)] mb-[7px]">Are you sure? This cannot be undone.</p>
          <div className="flex gap-[7px]">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 text-[11px] text-[var(--text3)] bg-[var(--card3)] border border-[var(--border)] rounded-[7px] py-[6px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={!!isSaving}
              className="flex-1 text-[11px] text-white bg-[var(--red)] rounded-[7px] py-[6px] font-bold"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
