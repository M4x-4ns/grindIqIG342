/**
 * localStorageService.ts
 * University version — replaces apiService.ts
 * All data is stored in the browser's localStorage.
 */

import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import type { ShotLog } from '@/types/shot'

// ─── Storage keys ────────────────────────────────────────────────────────────
const KEYS = {
  grinders: 'grindiq_grinders',
  beans:    'grindiq_beans',
  shots:    'grindiq_shots',
}

// ─── Default seed data (loaded once when localStorage is empty) ───────────────
const DEFAULT_GRINDERS: GrinderConfig[] = [
  {
    id: 'grinder-a',
    label: 'A',
    roastLevel: 'medium',
    grinderType: 'stepless',
    baselineGrind: 18,
    tempCoefficient: 0.15,
    humidityCoefficient: 0.05,
    isActive: true,
  },
  {
    id: 'grinder-b',
    label: 'B',
    roastLevel: 'light',
    grinderType: 'stepless',
    baselineGrind: 21,
    tempCoefficient: 0.15,
    humidityCoefficient: 0.05,
    isActive: true,
  },
  {
    id: 'grinder-c',
    label: 'C',
    roastLevel: 'dark',
    grinderType: 'stepped',
    baselineGrind: 15,
    tempCoefficient: 0.10,
    humidityCoefficient: 0.04,
    isActive: true,
  },
]

const DEFAULT_BEANS: BeanProfile[] = [
  {
    id: 'bean-1',
    name: 'Ethiopia Yirgacheffe',
    origin: 'Ethiopia',
    agtron: 72,
    roastLevel: 'light',
    baselineGrinds: { 'grinder-a': 20.5, 'grinder-b': 22.0, 'grinder-c': 16 },
    baselineTemp: 25,
    baselineHumidity: 60,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bean-2',
    name: 'Kenya AA Kirinyaga',
    origin: 'Kenya',
    agtron: 58,
    roastLevel: 'medium',
    baselineGrinds: { 'grinder-a': 18.0, 'grinder-b': 19.5, 'grinder-c': 14 },
    baselineTemp: 25,
    baselineHumidity: 60,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function read<T>(key: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaults))
      return defaults
    }
    return JSON.parse(raw) as T[]
  } catch {
    return defaults
  }
}

function write<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

// ─── Grinders ─────────────────────────────────────────────────────────────────
export function fetchGrinders(): GrinderConfig[] {
  return read<GrinderConfig>(KEYS.grinders, DEFAULT_GRINDERS)
}

export function saveGrinders(grinders: GrinderConfig[]): void {
  write(KEYS.grinders, grinders)
}

// ─── Beans ────────────────────────────────────────────────────────────────────
export function fetchBeans(): BeanProfile[] {
  return read<BeanProfile>(KEYS.beans, DEFAULT_BEANS)
}

export function createBean(bean: BeanProfile): BeanProfile {
  const beans = fetchBeans()
  const updated = [bean, ...beans]
  write(KEYS.beans, updated)
  return bean
}

export function updateBean(bean: BeanProfile): BeanProfile {
  const beans = fetchBeans()
  const updated = beans.map((b) => (b.id === bean.id ? bean : b))
  write(KEYS.beans, updated)
  return bean
}

export function deleteBean(id: string): void {
  const beans = fetchBeans()
  write(KEYS.beans, beans.filter((b) => b.id !== id))
}

// ─── Shots ────────────────────────────────────────────────────────────────────
export function fetchShots(): ShotLog[] {
  return read<ShotLog>(KEYS.shots, [])
}

export function createShot(shot: ShotLog): ShotLog {
  const shots = fetchShots()
  const updated = [shot, ...shots]
  write(KEYS.shots, updated)
  return shot
}
