import axios from 'axios'
import type { BeanProfile } from '@/types/bean'
import type { GrinderConfig } from '@/types/grinder'
import type { ShotLog } from '@/types/shot'

// baseURL is intentionally empty — all paths are relative (e.g. /api/beans).
// On Vercel, relative paths route to the serverless functions in api/.
// In local development, the Vite dev server proxy (vite.config.ts) forwards
// /api/* to the staging backend via API_PROXY_TARGET.
const api = axios.create({
  baseURL: '',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// --- Grinders ---

export async function fetchGrinders(): Promise<GrinderConfig[]> {
  const { data } = await api.get<GrinderConfig[]>('/api/grinders')
  return data
}

export async function updateGrinder(grinder: GrinderConfig): Promise<GrinderConfig> {
  const { data } = await api.post<GrinderConfig>('/api/grinders', grinder)
  return data
}

// --- Beans ---

export async function fetchBeans(): Promise<BeanProfile[]> {
  const { data } = await api.get<BeanProfile[]>('/api/beans')
  return data
}

export async function createBean(bean: BeanProfile): Promise<BeanProfile> {
  const { data } = await api.post<BeanProfile>('/api/beans', bean)
  return data
}

export async function updateBean(bean: BeanProfile): Promise<BeanProfile> {
  const { data } = await api.put<BeanProfile>(`/api/beans/${bean.id}`, bean)
  return data
}

export async function deleteBean(id: string): Promise<void> {
  await api.delete(`/api/beans/${id}`)
}

// --- Shots ---

export async function fetchShots(): Promise<ShotLog[]> {
  const { data } = await api.get<ShotLog[]>('/api/shots')
  return data
}

export async function createShot(shot: ShotLog): Promise<ShotLog> {
  const { data } = await api.post<ShotLog>('/api/shots', shot)
  return data
}
