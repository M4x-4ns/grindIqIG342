import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { rows } = await sql<{
      temperature: number
      humidity: number
      created_at: string
    }>`
      SELECT temperature, humidity, created_at
      FROM sensor_readings
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (rows.length === 0) {
      res.status(404).json({ error: 'No data' })
      return
    }

    const row = rows[0]
    res.status(200).json({
      temperature: row.temperature,
      humidity:    row.humidity,
      timestamp:   row.created_at,
    })
  } catch (err) {
    console.error('DB query error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
