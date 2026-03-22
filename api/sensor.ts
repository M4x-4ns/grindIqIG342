import { sql } from '@vercel/postgres'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Authenticate
  const apiKey = req.headers['x-api-key']
  if (!apiKey || apiKey !== process.env['SENSOR_API_KEY']) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  // Parse body (VercelRequest pre-parses JSON via body-parser middleware)
  const body: unknown = req.body

  // Guard: body must be a plain object (not null, array, or primitive)
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    res.status(400).json({ error: 'Invalid payload' })
    return
  }

  const { temperature, humidity } = body as Record<string, unknown>

  // Validate (DHT22 hardware limits: temp -40..80 C, humidity 0..100 %)
  if (
    typeof temperature !== 'number' || typeof humidity !== 'number' ||
    !isFinite(temperature) || !isFinite(humidity) ||
    temperature < -40 || temperature > 80 ||
    humidity < 0    || humidity > 100
  ) {
    res.status(400).json({ error: 'Invalid payload' })
    return
  }

  // Insert
  try {
    await sql`
      INSERT INTO sensor_readings (temperature, humidity)
      VALUES (${temperature}, ${humidity})
    `
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('DB insert error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}
