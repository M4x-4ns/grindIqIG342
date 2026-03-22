import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn() }))
vi.mock('@vercel/postgres', () => ({ sql: mockSql }))

import handler from './[id]'

function makeReq(method: string, id: string, body?: unknown): VercelRequest {
  return { method, body, query: { id } } as unknown as VercelRequest
}

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res as unknown as VercelResponse & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

const mockBeanRow = {
  id: 'bean-1',
  name: 'Ethiopia Yirgacheffe',
  origin: 'Ethiopia',
  agtron: 78,
  roast_level: 'light',
  baseline_grinds: { 'grinder-a': 18 },
  baseline_temp: '25.00',
  baseline_humidity: '60.00',
  target_extraction_time: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('PUT /api/beans/:id', () => {
  it('updates and returns the bean with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockBeanRow] })
    const res = makeRes()
    const body = {
      id: 'bean-1',
      name: 'Ethiopia Yirgacheffe',
      origin: 'Ethiopia',
      agtron: 78,
      roastLevel: 'light',
      baselineGrinds: { 'grinder-a': 18 },
      baselineTemp: 25,
      baselineHumidity: 60,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    }

    await handler(makeReq('PUT', 'bean-1', body), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'bean-1', name: 'Ethiopia Yirgacheffe', agtron: 78 }))
  })

  it('returns 404 when bean does not exist', async () => {
    mockSql.mockResolvedValue({ rows: [] })
    const res = makeRes()

    await handler(makeReq('PUT', 'missing-id', {
      name: 'x', origin: 'x', agtron: 50, roastLevel: 'light',
      baselineGrinds: {}, baselineTemp: 25, baselineHumidity: 60, isActive: true,
    }), res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = makeRes()
    await handler(makeReq('PUT', 'bean-1', { name: 'Only name' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when body is not an object', async () => {
    const res = makeRes()
    await handler(makeReq('PUT', 'bean-1', 'bad'), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('DELETE /api/beans/:id', () => {
  it('deletes the bean and returns { id } with 200', async () => {
    mockSql.mockResolvedValue({ rows: [{ id: 'bean-1' }] })
    const res = makeRes()

    await handler(makeReq('DELETE', 'bean-1'), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ id: 'bean-1' })
  })

  it('returns 404 when bean does not exist', async () => {
    mockSql.mockResolvedValue({ rows: [] })
    const res = makeRes()

    await handler(makeReq('DELETE', 'missing-id'), res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('unsupported method', () => {
  it('returns 405', async () => {
    const res = makeRes()
    await handler(makeReq('POST', 'bean-1'), res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
