import type { DashboardRange } from '../hooks/useDashboard';

export interface MovementBucket {
  key: string;
  label: string;
  entries: number;
  exits: number;
  adjustments: number;
}

export interface MovementRowLike {
  movement_type: string;
  quantity: number;
  movement_date: string;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function getDashboardRangeStart(now: Date, range: DashboardRange) {
  const today = startOfDay(now);
  if (range === '7d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (range === '30d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return d;
  }
  // 12m: desde el primer día del mes de hace 11 meses
  return new Date(now.getFullYear(), now.getMonth() - 11, 1);
}

export function buildMovementBuckets(
  now: Date,
  range: DashboardRange,
  locale: string,
): MovementBucket[] {
  const buckets: MovementBucket[] = [];

  if (range === '12m') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      const label = d.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
      buckets.push({ key, label, entries: 0, exits: 0, adjustments: 0 });
    }
    return buckets;
  }

  const days = range === '30d' ? 30 : 7;
  const todayStart = startOfDay(now);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const label = d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric' });
    buckets.push({ key, label, entries: 0, exits: 0, adjustments: 0 });
  }
  return buckets;
}

export function applyMovementsToBuckets(
  buckets: MovementBucket[],
  movements: MovementRowLike[],
  range: DashboardRange,
) {
  const map = new Map<string, MovementBucket>(buckets.map((b) => [b.key, b]));

  movements.forEach((m) => {
    const d = new Date(m.movement_date);
    const key =
      range === '12m'
        ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
        : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

    const bucket = map.get(key);
    if (!bucket) return;

    const qty = typeof m.quantity === 'number' ? m.quantity : Number(m.quantity) || 0;

    if (m.movement_type === 'IN') bucket.entries += qty;
    else if (m.movement_type === 'OUT') bucket.exits += qty;
    else if (m.movement_type === 'ADJUSTMENT') bucket.adjustments += Math.abs(qty);
  });

  return buckets;
}
