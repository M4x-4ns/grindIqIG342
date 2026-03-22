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

const mockShotRow = {
  id: 'shot-1',
  bean_id: 'bean-1',
  grinder_id: 'grinder-a',
  recommended_grind: '18.00',
  actual_grind: '18.00',
  temp: '25.00',
  humidity: '60.00',
  extraction_time: 28,
  feedback: 'perfect',
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/shots', () => {
  it('returns mapped shot list newest-first with 200', async () => {
    mockSql.mockResolvedValue({ rows: [mockShotRow] })
    const res = makeRes()

    await handler(makeReq('GET'), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'shot-1', beanId: 'bean-1', feedback: 'perfect' }),
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

describe('POST /api/shots', () => {
  it('creates a shot and returns 201', async () => {
    mockSql.mockResolvedValue({ rows: [mockShotRow] })
    const res = makeRes()
    const body = {
      id: 'shot-1',
      beanId: 'bean-1',
      grinderId: 'grinder-a',
      recommendedGrind: 18,
      actualGrind: 18,
      temp: 25,
      humidity: 60,
      extractionTime: 28,
      feedback: 'perfect',
      createdAt: '2026-01-01T00:00:00Z',
    }

    await handler(makeReq('POST', body), res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'shot-1', beanId: 'bean-1', feedback: 'perfect' })
    )
  })

  it('returns 400 when body is not an object', async () => {
    const res = makeRes()
    await handler(makeReq('POST', 'bad'), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when required string fields are missing', async () => {
    const res = makeRes()
    await handler(makeReq('POST', { beanId: 'bean-1' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('returns 400 when numeric fields have wrong type', async () => {
    const res = makeRes()
    await handler(makeReq('POST', {
      id: 'shot-1', beanId: 'bean-1', grinderId: 'grinder-a',
      recommendedGrind: 'not-a-number', actualGrind: 18, temp: 25, humidity: 60, feedback: 'perfect',
    }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('unsupported method', () => {
  it('returns 405 for PUT', async () => {
    const res = makeRes()
    await handler(makeReq('PUT'), res)
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
