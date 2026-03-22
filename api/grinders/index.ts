import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { mapGrinderRow } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM grinders ORDER BY created_at`
      res.status(200).json(rows.map(mapGrinderRow))
    } catch (err) {
      console.error('GET /api/grinders error:', err)
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

    const { id, label, roastLevel, grinderType, baselineGrind, tempCoefficient, humidityCoefficient, isActive } = body as Record<string, unknown>

    if (
      typeof id !== 'string' || !id ||
      typeof label !== 'string' || !label ||
      typeof roastLevel !== 'string' || !roastLevel ||
      typeof grinderType !== 'string' || !grinderType ||
      typeof baselineGrind !== 'number' ||
      typeof tempCoefficient !== 'number' ||
      typeof humidityCoefficient !== 'number'
    ) {
      res.status(400).json({ error: 'Missing or invalid required fields' })
      return
    }

    try {
      const { rows } = await sql`
        INSERT INTO grinders
          (id, label, roast_level, grinder_type, baseline_grind, temp_coefficient, humidity_coefficient, is_active)
        VALUES
          (${id}, ${label}, ${roastLevel}, ${grinderType},
           ${baselineGrind}, ${tempCoefficient}, ${humidityCoefficient},
           ${typeof isActive === 'boolean' ? isActive : true})
        ON CONFLICT (id) DO UPDATE SET
          label                = EXCLUDED.label,
          roast_level          = EXCLUDED.roast_level,
          grinder_type         = EXCLUDED.grinder_type,
          baseline_grind       = EXCLUDED.baseline_grind,
          temp_coefficient     = EXCLUDED.temp_coefficient,
          humidity_coefficient = EXCLUDED.humidity_coefficient,
          is_active            = EXCLUDED.is_active
        RETURNING *
      `
      if (!rows[0]) {
        res.status(500).json({ error: 'Upsert returned no rows' })
        return
      }
      res.status(200).json(mapGrinderRow(rows[0] as Record<string, unknown>))
    } catch (err) {
      console.error('POST /api/grinders error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
