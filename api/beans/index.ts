import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { mapBeanRow } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM beans ORDER BY created_at DESC`
      res.status(200).json(rows.map(mapBeanRow))
    } catch (err) {
      console.error('GET /api/beans error:', err)
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

    const { id, name, origin, agtron, roastLevel, baselineGrinds, baselineTemp, baselineHumidity, isActive, createdAt } = body as Record<string, unknown>

    if (
      typeof id !== 'string' || !id ||
      typeof name !== 'string' || !name ||
      typeof origin !== 'string' || !origin ||
      typeof agtron !== 'number' ||
      typeof roastLevel !== 'string' || !roastLevel ||
      typeof baselineGrinds !== 'object' || baselineGrinds === null || Array.isArray(baselineGrinds) ||
      typeof baselineTemp !== 'number' ||
      typeof baselineHumidity !== 'number'
    ) {
      res.status(400).json({ error: 'Missing or invalid required fields' })
      return
    }

    const activeValue = typeof isActive === 'boolean' ? isActive : true
    const createdAtValue = typeof createdAt === 'string' ? createdAt : new Date().toISOString()
    const baselineGrindsJson = JSON.stringify(baselineGrinds)

    try {
      const { rows } = await sql`
        INSERT INTO beans
          (id, name, origin, agtron, roast_level, baseline_grinds, baseline_temp, baseline_humidity, is_active, created_at)
        VALUES
          (${id}, ${name}, ${origin}, ${agtron}, ${roastLevel}, ${baselineGrindsJson}, ${baselineTemp}, ${baselineHumidity}, ${activeValue}, ${createdAtValue})
        RETURNING *
      `
      if (!rows[0]) {
        res.status(500).json({ error: 'Insert returned no rows' })
        return
      }
      res.status(201).json(mapBeanRow(rows[0] as Record<string, unknown>))
    } catch (err) {
      console.error('POST /api/beans error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
