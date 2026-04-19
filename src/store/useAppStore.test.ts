import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import type { ShotLog } from '@/types/shot'

// vi.mock is hoisted — localStorageService module is mocked before imports resolve
vi.mock('@/services/localStorageService', () => ({
  fetchGrinders:       vi.fn(),
  fetchBeans:          vi.fn(),
  fetchShots:          vi.fn(),
  fetchSensorOverride: vi.fn(),
  saveSensorOverride:  vi.fn(),
  createBean:          vi.fn(),
  updateBean:          vi.fn(),
  deleteBean:          vi.fn(),
  createShot:          vi.fn(),
}))

import { useAppStore } from './useAppStore'
import * as ls from '@/services/localStorageService'

const makeGrinder = (id = 'grinder-a'): GrinderConfig => ({
  id,
  label: 'Junior',
  roastLevel: 'light',
  grinderType: 'stepped',
  baselineGrind: 18,
  tempCoefficient: 0.15,
  humidityCoefficient: 0.05,
  isActive: true,
})

const makeBean = (id = 'b1'): BeanProfile => ({
  id,
  name: `Bean ${id}`,
  origin: 'Ethiopia',
  agtron: 70,
  roastLevel: 'light',
  baselineGrinds: { 'grinder-a': 18 },
  baselineTemp: 25,
  baselineHumidity: 60,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
})

const makeShot = (id = 's1'): ShotLog => ({
  id,
  beanId: 'b1',
  grinderId: 'grinder-a',
  recommendedGrind: 18,
  actualGrind: 18,
  temp: 25,
  humidity: 60,
  feedback: 'perfect',
  createdAt: '2026-01-01T00:00:00Z',
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(ls.fetchSensorOverride).mockReturnValue(null)
  useAppStore.setState({
    grinders: [],
    beans: [],
    shots: [],
    selectedBean: null,
    selectedGrinder: null,
    isLoading: false,
    isSaving: false,
    error: null,
  })
})

describe('hydrateFromApi', () => {
  it('fetches all resources and populates the store', async () => {
    const grinder = makeGrinder()
    const bean = makeBean()
    const shot = makeShot()
    vi.mocked(ls.fetchGrinders).mockReturnValue([grinder])
    vi.mocked(ls.fetchBeans).mockReturnValue([bean])
    vi.mocked(ls.fetchShots).mockReturnValue([shot])

    await useAppStore.getState().hydrateFromApi()

    const state = useAppStore.getState()
    expect(state.grinders).toEqual([grinder])
    expect(state.beans).toEqual([bean])
    expect(state.shots).toEqual([shot])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('auto-selects first grinder and first active bean when nothing is pre-selected', async () => {
    const grinder = makeGrinder()
    const inactiveBean = { ...makeBean('b0'), isActive: false }
    const activeBean   = makeBean('b1')
    vi.mocked(ls.fetchGrinders).mockReturnValue([grinder])
    vi.mocked(ls.fetchBeans).mockReturnValue([inactiveBean, activeBean])
    vi.mocked(ls.fetchShots).mockReturnValue([])

    await useAppStore.getState().hydrateFromApi()

    const state = useAppStore.getState()
    expect(state.selectedGrinder).toEqual(grinder)
    expect(state.selectedBean).toEqual(activeBean)
  })

  it('falls back to beans[0] when no active bean exists', async () => {
    const grinder = makeGrinder()
    const bean = { ...makeBean(), isActive: false }
    vi.mocked(ls.fetchGrinders).mockReturnValue([grinder])
    vi.mocked(ls.fetchBeans).mockReturnValue([bean])
    vi.mocked(ls.fetchShots).mockReturnValue([])

    await useAppStore.getState().hydrateFromApi()

    expect(useAppStore.getState().selectedBean).toEqual(bean)
  })

  it('does not override existing selections when re-hydrating', async () => {
    const grinder1 = makeGrinder('grinder-a')
    const grinder2 = makeGrinder('grinder-b')
    const bean1 = makeBean('b1')
    const bean2 = makeBean('b2')
    useAppStore.setState({ selectedGrinder: grinder1, selectedBean: bean1 })
    vi.mocked(ls.fetchGrinders).mockReturnValue([grinder1, grinder2])
    vi.mocked(ls.fetchBeans).mockReturnValue([bean1, bean2])
    vi.mocked(ls.fetchShots).mockReturnValue([])

    await useAppStore.getState().hydrateFromApi()

    const state = useAppStore.getState()
    expect(state.selectedGrinder).toEqual(grinder1)
    expect(state.selectedBean).toEqual(bean1)
  })

  it('sets error and clears isLoading on fetch failure', async () => {
    vi.mocked(ls.fetchGrinders).mockImplementation(() => { throw new Error('Storage error') })
    vi.mocked(ls.fetchBeans).mockReturnValue([])
    vi.mocked(ls.fetchShots).mockReturnValue([])

    await useAppStore.getState().hydrateFromApi()

    const state = useAppStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeTruthy()
  })

  it('is a no-op if isLoading is already true (double-invoke guard)', async () => {
    useAppStore.setState({ isLoading: true })

    await useAppStore.getState().hydrateFromApi()

    expect(ls.fetchGrinders).not.toHaveBeenCalled()
  })

  it('restores saved sensor override from localStorage', async () => {
    vi.mocked(ls.fetchGrinders).mockReturnValue([])
    vi.mocked(ls.fetchBeans).mockReturnValue([])
    vi.mocked(ls.fetchShots).mockReturnValue([])
    vi.mocked(ls.fetchSensorOverride).mockReturnValue({ temperature: 30, humidity: 70 })

    await useAppStore.getState().hydrateFromApi()

    const { sensor } = useAppStore.getState()
    expect(sensor.isManualOverride).toBe(true)
    expect(sensor.reading?.temperature).toBe(30)
    expect(sensor.reading?.humidity).toBe(70)
  })
})

describe('createBean', () => {
  it('calls ls.createBean, prepends the bean, and clears isSaving', async () => {
    const bean = makeBean()
    vi.mocked(ls.createBean).mockReturnValue(bean)

    await useAppStore.getState().createBean(bean)

    expect(ls.createBean).toHaveBeenCalledWith(bean)
    expect(useAppStore.getState().beans).toEqual([bean])
    expect(useAppStore.getState().isSaving).toBe(false)
  })

  it('sets error and rethrows on failure', async () => {
    vi.mocked(ls.createBean).mockImplementation(() => { throw new Error('fail') })

    await expect(useAppStore.getState().createBean(makeBean())).rejects.toThrow('fail')

    expect(useAppStore.getState().error).toBeTruthy()
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})

describe('updateBean', () => {
  it('calls ls.updateBean, replaces the bean in store, and syncs selectedBean', async () => {
    const bean = makeBean()
    useAppStore.setState({ beans: [bean], selectedBean: bean })
    const updated = { ...bean, name: 'Updated' }
    vi.mocked(ls.updateBean).mockReturnValue(updated)

    await useAppStore.getState().updateBean(updated)

    expect(useAppStore.getState().beans[0].name).toBe('Updated')
    expect(useAppStore.getState().selectedBean?.name).toBe('Updated')
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})

describe('deleteBean', () => {
  it('calls ls.deleteBean, removes bean from store, and clears selectedBean', async () => {
    const bean = makeBean()
    useAppStore.setState({ beans: [bean], selectedBean: bean })
    vi.mocked(ls.deleteBean).mockReturnValue(undefined)

    await useAppStore.getState().deleteBean(bean.id)

    expect(useAppStore.getState().beans).toEqual([])
    expect(useAppStore.getState().selectedBean).toBeNull()
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})

describe('saveShot', () => {
  it('calls ls.createShot and prepends the shot to the store', async () => {
    const shot = makeShot()
    vi.mocked(ls.createShot).mockReturnValue(shot)

    await useAppStore.getState().saveShot(shot)

    expect(ls.createShot).toHaveBeenCalledWith(shot)
    expect(useAppStore.getState().shots).toEqual([shot])
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})

describe('mutation failure paths', () => {
  it('updateBean sets error and rethrows on failure', async () => {
    vi.mocked(ls.updateBean).mockImplementation(() => { throw new Error('storage error') })

    await expect(useAppStore.getState().updateBean(makeBean())).rejects.toThrow('storage error')

    expect(useAppStore.getState().error).toBeTruthy()
    expect(useAppStore.getState().isSaving).toBe(false)
  })

  it('deleteBean sets error and rethrows on failure', async () => {
    vi.mocked(ls.deleteBean).mockImplementation(() => { throw new Error('storage error') })

    await expect(useAppStore.getState().deleteBean('b1')).rejects.toThrow('storage error')

    expect(useAppStore.getState().error).toBeTruthy()
    expect(useAppStore.getState().isSaving).toBe(false)
  })

  it('saveShot sets error and rethrows on failure', async () => {
    vi.mocked(ls.createShot).mockImplementation(() => { throw new Error('storage error') })

    await expect(useAppStore.getState().saveShot(makeShot())).rejects.toThrow('storage error')

    expect(useAppStore.getState().error).toBeTruthy()
    expect(useAppStore.getState().isSaving).toBe(false)
  })
})
