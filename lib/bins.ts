import { parse } from 'node-html-parser';

const BASE_URL = 'https://www.monash.vic.gov.au';
export const DEFAULT_ADDRESS = '2a Donald Street Mount Waverley';

export interface BinCollection {
  type: string;
  nextCollection: Date | null;
  raw: string;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; bin-night-checker)',
  'Referer': `${BASE_URL}/Waste-Sustainability/Bin-Collection/When-we-collect-your-bins`,
  'Accept': 'application/json, text/plain, */*',
};

export async function getBinCollection(address: string = DEFAULT_ADDRESS): Promise<BinCollection[]> {
  // Step 1: resolve address to a geolocation ID
  const searchRes = await fetch(
    `${BASE_URL}/api/v1/myarea/search?keywords=${encodeURIComponent(address)}`,
    { headers: HEADERS, next: { revalidate: 21600 } },
  );
  if (!searchRes.ok) throw new Error(`Search API error: ${searchRes.status}`);
  const searchData = await searchRes.json();

  const items: { Id: string }[] = searchData.Items ?? [];
  if (!items.length) throw new Error(`No address results found for: ${address}`);

  const geoid = items[0].Id;

  // Step 2: fetch waste services for that location
  const wasteRes = await fetch(
    `${BASE_URL}/ocapi/Public/myarea/wasteservices?geolocationid=${geoid}&ocsvclang=en-AU`,
    { headers: HEADERS, next: { revalidate: 21600 } },
  );
  if (!wasteRes.ok) throw new Error(`Waste API error: ${wasteRes.status}`);
  const wasteData = await wasteRes.json();

  const root = parse(wasteData.responseContent as string);
  const collections: BinCollection[] = [];

  for (const article of root.querySelectorAll('article')) {
    const heading = article.querySelector('h3');
    const nextService = article.querySelector('.next-service');
    if (!heading || !nextService) continue;

    const type = heading.text.trim();
    const raw = nextService.text.trim();

    // Parse date like "Mon 23/6/2026" (day/month may be single digit)
    let nextCollection: Date | null = null;
    const match = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      nextCollection = new Date(Number(year), Number(month) - 1, Number(day));
    }

    collections.push({ type, nextCollection, raw });
  }

  return collections.sort((a, b) => {
    if (!a.nextCollection) return 1;
    if (!b.nextCollection) return -1;
    return a.nextCollection.getTime() - b.nextCollection.getTime();
  });
}

export interface DateGroup {
  date: Date | null;
  raw: string;
  types: string[];
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

/** Today's date in Melbourne, as a UTC-midnight Date for comparison with collection dates. */
function melbourneToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // -> "YYYY-MM-DD"
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
