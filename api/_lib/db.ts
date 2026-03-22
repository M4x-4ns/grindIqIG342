import type { GrinderConfig } from '../../src/types/grinder'
import type { BeanProfile } from '../../src/types/bean'
import type { ShotLog } from '../../src/types/shot'

type Row = Record<string, unknown>

export function mapGrinderRow(row: Row): GrinderConfig {
  return {
    id:                  row['id'] as string,
    label:               row['label'] as string,
    roastLevel:          row['roast_level'] as GrinderConfig['roastLevel'],
    grinderType:         row['grinder_type'] as GrinderConfig['grinderType'],
    baselineGrind:       Number(row['baseline_grind']),
    tempCoefficient:     Number(row['temp_coefficient']),
    humidityCoefficient: Number(row['humidity_coefficient']),
    isActive:            row['is_active'] as boolean,
  }
}

export function mapBeanRow(row: Row): BeanProfile {
  return {
    id:                    row['id'] as string,
    name:                  row['name'] as string,
    origin:                row['origin'] as string,
    agtron:                Number(row['agtron']),
    roastLevel:            row['roast_level'] as BeanProfile['roastLevel'],
    baselineGrinds:        row['baseline_grinds'] as Record<string, number>,
    baselineTemp:          Number(row['baseline_temp']),
    baselineHumidity:      Number(row['baseline_humidity']),
    targetExtractionTime:  row['target_extraction_time'] != null
                             ? Number(row['target_extraction_time'])
                             : undefined,
    isActive:              row['is_active'] as boolean,
    createdAt:             row['created_at'] as string,
  }
}

export function mapShotRow(row: Row): ShotLog {
  return {
    id:               row['id'] as string,
    beanId:           row['bean_id'] as string,
    grinderId:        row['grinder_id'] as string,
    recommendedGrind: Number(row['recommended_grind']),
    actualGrind:      Number(row['actual_grind']),
    temp:             Number(row['temp']),
    humidity:         Number(row['humidity']),
    extractionTime:   row['extraction_time'] != null
                        ? Number(row['extraction_time'])
                        : undefined,
    feedback:         row['feedback'] as ShotLog['feedback'],
    baristaId:        undefined,
    createdAt:        row['created_at'] as string,
  }
}
