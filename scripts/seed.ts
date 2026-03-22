import { sql } from '@vercel/postgres'

const GRINDERS = [
  {
    id: 'grinder-a',
    label: 'Junior',
    roast_level: 'light',
    grinder_type: 'stepped',
    baseline_grind: 18,
    temp_coefficient: 0.15,
    humidity_coefficient: 0.05,
  },
  {
    id: 'grinder-b',
    label: 'Zentis',
    roast_level: 'medium',
    grinder_type: 'stepless',
    baseline_grind: 22,
    temp_coefficient: 0.15,
    humidity_coefficient: 0.05,
  },
  {
    id: 'grinder-c',
    label: 'Timemore',
    roast_level: 'dark',
    grinder_type: 'stepped',
    baseline_grind: 24,
    temp_coefficient: 0.15,
    humidity_coefficient: 0.05,
  },
]

export async function seed(): Promise<void> {
  console.log('Running seed…')

  const { rows } = await sql`SELECT COUNT(*)::int AS count FROM grinders`
  if ((rows[0] as { count: number }).count > 0) {
    console.log('✓ grinders already seeded — skipping')
    return
  }

  for (const g of GRINDERS) {
    await sql`
      INSERT INTO grinders
        (id, label, roast_level, grinder_type, baseline_grind, temp_coefficient, humidity_coefficient)
      VALUES
        (${g.id}, ${g.label}, ${g.roast_level}, ${g.grinder_type},
         ${g.baseline_grind}, ${g.temp_coefficient}, ${g.humidity_coefficient})
      ON CONFLICT (id) DO NOTHING
    `
  }

  console.log(`✓ seeded ${GRINDERS.length} grinders`)
}
