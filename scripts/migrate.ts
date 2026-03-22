import { sql } from '@vercel/postgres'
import { seed } from './seed'

async function migrate(): Promise<void> {
  console.log('Running migration…')

  await sql`
    CREATE TABLE IF NOT EXISTS sensor_readings (
      id          serial      PRIMARY KEY,
      temperature float       NOT NULL,
      humidity    float       NOT NULL,
      created_at  timestamptz DEFAULT now()
    )
  `
  console.log('✓ sensor_readings table ready')

  await sql`
    CREATE TABLE IF NOT EXISTS grinders (
      id                   TEXT PRIMARY KEY,
      label                TEXT NOT NULL,
      roast_level          TEXT NOT NULL,
      grinder_type         TEXT NOT NULL,
      baseline_grind       NUMERIC(5,2) NOT NULL,
      temp_coefficient     NUMERIC(5,4) NOT NULL,
      humidity_coefficient NUMERIC(5,4) NOT NULL,
      is_active            BOOLEAN NOT NULL DEFAULT true,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  console.log('✓ grinders table ready')

  await sql`
    CREATE TABLE IF NOT EXISTS beans (
      id                     TEXT PRIMARY KEY,
      name                   TEXT NOT NULL,
      origin                 TEXT NOT NULL,
      agtron                 INTEGER NOT NULL,
      roast_level            TEXT NOT NULL,
      baseline_grinds        JSONB NOT NULL DEFAULT '{}',
      baseline_temp          NUMERIC(5,2) NOT NULL,
      baseline_humidity      NUMERIC(5,2) NOT NULL,
      target_extraction_time INTEGER,
      is_active              BOOLEAN NOT NULL DEFAULT true,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  console.log('✓ beans table ready')

  await sql`
    CREATE TABLE IF NOT EXISTS shot_logs (
      id                TEXT PRIMARY KEY,
      bean_id           TEXT NOT NULL REFERENCES beans(id) ON DELETE CASCADE,
      grinder_id        TEXT NOT NULL REFERENCES grinders(id),
      recommended_grind NUMERIC(5,2) NOT NULL,
      actual_grind      NUMERIC(5,2) NOT NULL,
      temp              NUMERIC(5,2) NOT NULL,
      humidity          NUMERIC(5,2) NOT NULL,
      extraction_time   INTEGER,
      feedback          TEXT NOT NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `
  console.log('✓ shot_logs table ready')

  await seed()

  process.exit(0)
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
