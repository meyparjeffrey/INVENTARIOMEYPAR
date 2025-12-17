import { describe, expect, it } from 'vitest';
import {
  applyMovementsToBuckets,
  buildMovementBuckets,
  getDashboardRangeStart,
} from '../dashboardBuckets';

describe('dashboardBuckets', () => {
  it('getDashboardRangeStart: 7d starts 6 days ago (start of day)', () => {
    const now = new Date('2025-01-10T15:20:00.000Z');
    const start = getDashboardRangeStart(now, '7d');
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const diffDays = Math.round((todayStart.getTime() - start.getTime()) / 86400000);
    expect(diffDays).toBe(6);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it('buildMovementBuckets: 7d creates 7 day buckets', () => {
    const now = new Date('2025-01-10T15:20:00.000Z');
    const buckets = buildMovementBuckets(now, '7d', 'es-ES');
    expect(buckets).toHaveLength(7);
    const start = getDashboardRangeStart(now, '7d');
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const firstKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
      start.getDate(),
    ).padStart(2, '0')}`;
    const lastKey = `${todayStart.getFullYear()}-${String(
      todayStart.getMonth() + 1,
    ).padStart(2, '0')}-${String(todayStart.getDate()).padStart(2, '0')}`;
    expect(buckets[0].key).toBe(firstKey);
    expect(buckets[6].key).toBe(lastKey);
  });

  it('buildMovementBuckets: 12m creates 12 month buckets', () => {
    const now = new Date('2025-01-10T15:20:00.000Z');
    const buckets = buildMovementBuckets(now, '12m', 'es-ES');
    expect(buckets).toHaveLength(12);
    // keys deben ser YYYY-MM y terminar en el mes actual
    expect(buckets[0].key).toMatch(/^\d{4}-\d{2}$/);
    expect(buckets[11].key).toMatch(/^\d{4}-\d{2}$/);
    const lastKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(buckets[11].key).toBe(lastKey);
  });

  it('applyMovementsToBuckets: aggregates IN/OUT/ADJUSTMENT (abs) correctly', () => {
    const now = new Date('2025-01-10T15:20:00.000Z');
    const buckets = buildMovementBuckets(now, '7d', 'es-ES');

    applyMovementsToBuckets(
      buckets,
      [
        { movement_type: 'IN', quantity: 5, movement_date: '2025-01-10T10:00:00.000Z' },
        { movement_type: 'OUT', quantity: 2, movement_date: '2025-01-10T11:00:00.000Z' },
        {
          movement_type: 'ADJUSTMENT',
          quantity: -3,
          movement_date: '2025-01-10T12:00:00.000Z',
        },
      ],
      '7d',
    );

    const last = buckets[buckets.length - 1];
    expect(last.entries).toBe(5);
    expect(last.exits).toBe(2);
    expect(last.adjustments).toBe(3);
  });
});
