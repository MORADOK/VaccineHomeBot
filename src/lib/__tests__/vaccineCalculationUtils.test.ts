import { describe, expect, it } from 'vitest';
import {
  calculateCumulativeDays,
  calculateNextDoseDate,
  type VaccineSchedule,
  type CompletedDose,
} from '../vaccineCalculationUtils';

const makeSchedule = (vaccine_type: string, total_doses: number, dose_intervals: number[]): VaccineSchedule => ({
  id: vaccine_type,
  vaccine_name: vaccine_type,
  vaccine_type,
  total_doses,
  dose_intervals,
  active: true,
});

const completed = (date: string, vaccine_type: string): CompletedDose => ({
  appointment_date: date,
  vaccine_type,
  status: 'completed',
});

describe('vaccineCalculationUtils absolute-offset standard', () => {
  it('uses rabies offsets [3,7,14,28] from the first dose without summing', () => {
    const schedule = makeSchedule('rabies', 5, [3, 7, 14, 28]);
    const firstDose = '2026-01-01';

    const expected = ['2026-01-04', '2026-01-08', '2026-01-15', '2026-01-29'];
    for (let currentDoseNumber = 1; currentDoseNumber <= 4; currentDoseNumber++) {
      const completedDoses = Array.from({ length: currentDoseNumber }, (_, i) =>
        completed(i === 0 ? firstDose : expected[i - 1], 'rabies')
      );
      const result = calculateNextDoseDate({ vaccineSchedule: schedule, completedDoses, currentDoseNumber });
      expect('type' in result).toBe(false);
      if (!('type' in result)) {
        expect(result.nextDoseDate).toBe(expected[currentDoseNumber - 1]);
      }
    }
  });

  it('uses [28,140] as absolute offsets for a 3-dose schedule', () => {
    const schedule = makeSchedule('hep_b', 3, [28, 140]);
    const firstDose = '2026-01-01';
    const result = calculateNextDoseDate({
      vaccineSchedule: schedule,
      completedDoses: [completed(firstDose, 'hep_b'), completed('2026-01-29', 'hep_b')],
      currentDoseNumber: 2,
    });

    expect('type' in result).toBe(false);
    if (!('type' in result)) {
      expect(result.nextDoseDate).toBe('2026-05-21');
      expect(result.cumulativeDays).toBe(140);
      expect(result.intervalUsed).toBe(140);
    }
  });

  it('keeps legacy calculateCumulativeDays API but returns the absolute offset', () => {
    expect(calculateCumulativeDays([3, 7, 14, 28], 1)).toBe(3);
    expect(calculateCumulativeDays([3, 7, 14, 28], 2)).toBe(7);
    expect(calculateCumulativeDays([3, 7, 14, 28], 4)).toBe(28);
  });
});
