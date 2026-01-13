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

export function getDashboardRangeStart(referenceDate: Date, range: DashboardRange) {
  const baseDate = startOfDay(referenceDate);
  
  if (range === '7d') {
    const d = new Date(baseDate);
    // Para 7d, si queremos que sea "Semana Actual" (Lunes a Domingo)
    // Buscamos el lunes de la semana de referenceDate
    const day = baseDate.getDay(); // 0: Dom, 1: Lun, ...
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para Lunes
    d.setDate(diff);
    return d;
  }
  
  if (range === '30d') {
    const d = new Date(baseDate);
    // Para 30d, vamos al primer día del mes actual
    d.setDate(1);
    return d;
  }
  
  // 12m: desde el primer día del año actual
  return new Date(baseDate.getFullYear(), 0, 1);
}

export function buildMovementBuckets(
  referenceDate: Date,
  range: DashboardRange,
  locale: string,
): MovementBucket[] {
  const buckets: MovementBucket[] = [];
  const rangeStart = getDashboardRangeStart(referenceDate, range);

  if (range === '12m') {
    // 12 meses del año actual
    const year = rangeStart.getFullYear();
    for (let month = 0; month < 12; month++) {
      const d = new Date(year, month, 1);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      const label = d.toLocaleDateString(locale, { month: 'short' });
      buckets.push({ key, label, entries: 0, exits: 0, adjustments: 0 });
    }
    return buckets;
  }

  if (range === '30d') {
    // Todos los días del mes actual
    const year = rangeStart.getFullYear();
    const month = rangeStart.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const label = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      buckets.push({ key, label, entries: 0, exits: 0, adjustments: 0 });
    }
    return buckets;
  }

  // "Semana Actual" (Lunes a Domingo)
  for (let i = 0; i < 7; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
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
