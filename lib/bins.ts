import scheduleData from '@/data/schedule.json';

export interface BinCollection {
  type: string;
  nextCollection: Date | null;
  raw: string;
}

export interface DateGroup {
  date: Date | null;
  raw: string;
  types: string[];
}

export function getCollections(): { collections: BinCollection[]; fetchedAt: Date } {
  const collections = scheduleData.collections.map((c) => ({
    type: c.type,
    nextCollection: c.nextCollection ? new Date(c.nextCollection) : null,
    raw: c.raw,
  }));
  return { collections, fetchedAt: new Date(scheduleData.fetchedAt) };
}

/** Group collections that fall on the same date together, sorted soonest first. */
export function groupByDate(collections: BinCollection[]): DateGroup[] {
  const groups = new Map<string, DateGroup>();

  for (const c of collections) {
    const key = c.nextCollection ? c.nextCollection.toISOString().slice(0, 10) : 'unknown';
    const existing = groups.get(key);
    if (existing) {
      existing.types.push(c.type);
    } else {
      groups.set(key, { date: c.nextCollection, raw: c.raw, types: [c.type] });
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });
}

/** Today's date in Melbourne, as a local-midnight Date for comparison. */
function melbourneToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, month, day] = parts.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const today = melbourneToday();
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function whenLabel(days: number | null): string {
  if (days === null) return 'Unknown';
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}
