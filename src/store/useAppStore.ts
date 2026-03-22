/**
 * useAppStore.ts — University version
 * Replaces all API calls with localStorage (via localStorageService).
 */

import { create } from 'zustand'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import type { ShotLog } from '@/types/shot'
import type { SensorState } from '@/types/sensor'
import {
  fetchGrinders,
  fetchBeans,
  fetchShots,
  createBean as lsCreateBean,
  updateBean as lsUpdateBean,
  deleteBean as lsDeleteBean,
  createShot as lsCreateShot,
} from '@/services/localStorageService'

interface AppState {
  selectedGrinder: GrinderConfig | null
  selectedBean:    BeanProfile | null
  grinders: GrinderConfig[]
  beans:    BeanProfile[]
  shots:    ShotLog[]
  sensor: SensorState
  isLoading: boolean
  isSaving:  boolean
  error:     string | null
  setSelectedGrinder: (grinder: GrinderConfig | null) => void
  setSelectedBean:    (bean: BeanProfile | null) => void
  setGrinders: (grinders: GrinderConfig[]) => void
  setBeans:    (beans: BeanProfile[]) => void
  setShots:    (shots: ShotLog[]) => void
  setSensor:   (sensor: Partial<SensorState>) => void
  hydrateFromApi: () => Promise<void>
  createBean:     (bean: BeanProfile) => Promise<void>
  updateBean:     (bean: BeanProfile) => Promise<void>
  deleteBean:     (id: string) => Promise<void>
  saveShot:       (shot: ShotLog) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedGrinder: null,
  selectedBean:    null,
  grinders: [],
  beans:    [],
  shots:    [],
  sensor: {
    status:           'connected',
    reading:          { temperature: 25.0, humidity: 60.0, timestamp: new Date().toISOString() },
    lastUpdated:      new Date().toISOString(),
    isManualOverride: true,
  },
  isLoading: false,
  isSaving:  false,
  error:     null,

  setSelectedGrinder: (grinder) => set({ selectedGrinder: grinder }),
  setSelectedBean:    (bean)    => set({ selectedBean: bean }),
  setGrinders:        (grinders) => set({ grinders }),
  setBeans:           (beans)    => set({ beans }),
  setShots:           (shots)    => set({ shots }),
  setSensor: (partial) =>
    set((state) => ({ sensor: { ...state.sensor, ...partial } })),

  hydrateFromApi: async () => {
    if (get().isLoading) return
    set({ isLoading: true, error: null })
    try {
      const grinders = fetchGrinders()
      const beans    = fetchBeans()
      const shots    = fetchShots()
      const firstGrinder = grinders.find((g) => g.isActive) ?? grinders[0] ?? null
      const firstBean    = beans.find((b) => b.isActive) ?? beans[0] ?? null
      set({ grinders, beans, shots, selectedGrinder: firstGrinder, selectedBean: firstBean, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createBean: async (bean) => {
    set({ isSaving: true, error: null })
    try {
      const created = lsCreateBean(bean)
      set((state) => ({ beans: [created, ...state.beans], isSaving: false }))
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
      throw err
    }
  },

  updateBean: async (bean) => {
    set({ isSaving: true, error: null })
    try {
      const updated = lsUpdateBean(bean)
      set((state) => ({
        beans: state.beans.map((b) => (b.id === updated.id ? updated : b)),
        selectedBean: state.selectedBean?.id === updated.id ? updated : state.selectedBean,
        isSaving: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
      throw err
    }
  },

  deleteBean: async (id) => {
    set({ isSaving: true, error: null })
    try {
      lsDeleteBean(id)
      set((state) => ({
        beans: state.beans.filter((b) => b.id !== id),
        selectedBean: state.selectedBean?.id === id ? null : state.selectedBean,
        isSaving: false,
      }))
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
      throw err
    }
  },

  saveShot: async (shot) => {
    set({ isSaving: true, error: null })
    try {
      const saved = lsCreateShot(shot)
      set((state) => ({ shots: [saved, ...state.shots], isSaving: false }))
    } catch (err) {
      set({ error: (err as Error).message, isSaving: false })
      throw err
    }
  },
}))
