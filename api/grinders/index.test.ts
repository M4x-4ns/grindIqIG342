import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// vi.hoisted ensures mockSql is initialized before vi.mock hoisting runs
const { mockSql } = vi.hoisted(() => ({ mockSql: vi.fn() }))
vi.mock('@vercel/postgres', () => ({ sql: mockSql }))

import handler from './index'

// Helper: build a minimal mock VercelRequest
function makeReq(method: string, body?: unknown): VercelRequest {
  return { method, body } as unknown as VercelRequest
}

// Helper: build a chainable mock VercelResponse
// Handlers call res.status(n).json({...}) — status() must return res itself
function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  return res as unknown as VercelResponse & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

const mockGrinderRow = {
  id: 'grinder-a',
  label: 'Junior',
  roast_level: 'light',
  grinder_type: 'stepped',
  baseline_grind: '18.00',
  temp_coefficient: '0.1500',
  humidity_coefficient: '0.0500',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/grinders', () => {
  it('returns mapped grinder list with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockGrinderRow] })
    const req = makeReq('GET')
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'grinder-a', label: 'Junior', baselineGrind: 18 }),
      ])
    )
  })

  it('returns 500 on DB error', async () => {
    mockSql.mockRejectedValue(new Error('DB down'))
    const req = makeReq('GET')
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('POST /api/grinders', () => {
  it('upserts and returns grinder with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockGrinderRow] })
    const req = makeReq('POST', {
      id: 'grinder-a',
      label: 'Junior',
      roastLevel: 'light',
      grinderType: 'stepped',
      baselineGrind: 18,
      tempCoefficient: 0.15,
      humidityCoefficient: 0.05,
      isActive: true,
    })
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'grinder-a', label: 'Junior', baselineGrind: 18 })
    )
  })

  it('returns 400 when required fields are missing', async () => {
    const req = makeReq('POST', { id: 'grinder-a' }) // missing label etc.
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when body is not an object', async () => {
    const req = makeReq('POST', 'not-an-object')
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when required numeric fields have wrong type', async () => {
    const req = makeReq('POST', { id: 'grinder-a', label: 'Junior', roastLevel: 'light', grinderType: 'stepped', baselineGrind: 'not-a-number', tempCoefficient: 0.15, humidityCoefficient: 0.05 })
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('unsupported method', () => {
  it('returns 405', async () => {
    const req = makeReq('DELETE')
    const res = makeRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})
