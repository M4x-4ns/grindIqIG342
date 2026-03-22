import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn() }))
vi.mock('@vercel/postgres', () => ({ sql: mockSql }))

import handler from './index'

function makeReq(method: string, body?: unknown): VercelRequest {
  return { method, body } as unknown as VercelRequest
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

describe('GET /api/beans', () => {
  it('returns mapped bean list with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockBeanRow] })
    const res = makeRes()

    await handler(makeReq('GET'), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'bean-1', name: 'Ethiopia Yirgacheffe', agtron: 78 }),
      ])
    )
  })

  it('returns 500 on DB error', async () => {
    mockSql.mockRejectedValue(new Error('DB down'))
    const res = makeRes()

    await handler(makeReq('GET'), res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('POST /api/beans', () => {
  it('creates a bean and returns 201', async () => {
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

    await handler(makeReq('POST', body), res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bean-1', name: 'Ethiopia Yirgacheffe', agtron: 78 })
    )
  })

  it('returns 400 when body is not an object', async () => {
    const res = makeRes()
    await handler(makeReq('POST', 'not-an-object'), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when required string fields are missing', async () => {
    const res = makeRes()
    await handler(makeReq('POST', { name: 'Incomplete' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when numeric fields have wrong type', async () => {
    const res = makeRes()
    await handler(makeReq('POST', {
      id: 'bean-1', name: 'X', origin: 'X', agtron: 'not-a-number',
      roastLevel: 'light', baselineGrinds: {}, baselineTemp: 25, baselineHumidity: 60,
    }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('unsupported method', () => {
  it('returns 405', async () => {
    const res = makeRes()
    await handler(makeReq('PATCH'), res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
