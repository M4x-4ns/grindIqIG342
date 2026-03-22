import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { mapShotRow } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM shot_logs ORDER BY created_at DESC LIMIT 200`
      res.status(200).json(rows.map(mapShotRow))
    } catch (err) {
      console.error('GET /api/shots error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  if (req.method === 'POST') {
    const body = req.body
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }

    const {
      id,
      beanId,
      grinderId,
      recommendedGrind,
      actualGrind,
      temp,
      humidity,
      extractionTime,
      feedback,
      createdAt,
    } = body as Record<string, unknown>

    if (
      typeof id !== 'string' || !id ||
      typeof beanId !== 'string' || !beanId ||
      typeof grinderId !== 'string' || !grinderId ||
      typeof feedback !== 'string' || !feedback ||
      typeof recommendedGrind !== 'number' ||
      typeof actualGrind !== 'number' ||
      typeof temp !== 'number' ||
      typeof humidity !== 'number'
    ) {
      res.status(400).json({ error: 'Missing or invalid required fields' })
      return
    }

    const extractionTimeValue = typeof extractionTime === 'number' ? extractionTime : null
    const createdAtValue = typeof createdAt === 'string' ? createdAt : new Date().toISOString()

    try {
      const { rows } = await sql`
        INSERT INTO shot_logs
          (id, bean_id, grinder_id, recommended_grind, actual_grind, temp, humidity, extraction_time, feedback, created_at)
        VALUES
          (${id}, ${beanId}, ${grinderId}, ${recommendedGrind}, ${actualGrind}, ${temp}, ${humidity}, ${extractionTimeValue}, ${feedback}, ${createdAtValue})
        RETURNING *
      `
      if (!rows[0]) {
        res.status(500).json({ error: 'Insert returned no rows' })
        return
      }
      res.status(201).json(mapShotRow(rows[0] as Record<string, unknown>))
    } catch (err) {
      console.error('POST /api/shots error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
