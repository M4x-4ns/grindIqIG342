import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { mapBeanRow } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = req.query['id']
  if (typeof id !== 'string' || !id) {
    res.status(400).json({ error: 'Invalid or missing id' })
    return
  }

  if (req.method === 'PUT') {
    const body = req.body
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid request body' })
      return
    }

    const { name, origin, agtron, roastLevel, baselineGrinds, baselineTemp, baselineHumidity, isActive } = body as Record<string, unknown>

    if (
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
    const baselineGrindsJson = JSON.stringify(baselineGrinds)

    try {
      const { rows } = await sql`
        UPDATE beans SET
          name               = ${name},
          origin             = ${origin},
          agtron             = ${agtron},
          roast_level        = ${roastLevel},
          baseline_grinds    = ${baselineGrindsJson},
          baseline_temp      = ${baselineTemp},
          baseline_humidity  = ${baselineHumidity},
          is_active          = ${activeValue}
        WHERE id = ${id}
        RETURNING *
      `
      if (rows.length === 0) {
        res.status(404).json({ error: 'Bean not found' })
        return
      }
      res.status(200).json(mapBeanRow(rows[0] as Record<string, unknown>))
    } catch (err) {
      console.error('PUT /api/beans/[id] error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  if (req.method === 'DELETE') {
    try {
      const { rows } = await sql`
        DELETE FROM beans WHERE id = ${id} RETURNING id
      `
      if (rows.length === 0) {
        res.status(404).json({ error: 'Bean not found' })
        return
      }
      res.status(200).json({ id: rows[0]['id'] })
    } catch (err) {
      console.error('DELETE /api/beans/[id] error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
