import { parse } from 'node-html-parser';

const BASE_URL = 'https://www.monash.vic.gov.au';
export const DEFAULT_ADDRESS = '2a Donald Street Mount Waverley';

export interface BinCollection {
  type: string;
  nextCollection: Date | null;
  raw: string;
}

export async function getBinCollection(address: string = DEFAULT_ADDRESS): Promise<BinCollection[]> {
  // Step 1: resolve address to a geolocation ID
  const searchRes = await fetch(
    `${BASE_URL}/api/v1/myarea/search?keywords=${encodeURIComponent(address)}`,
    { next: { revalidate: 21600 } },
  );
  if (!searchRes.ok) throw new Error(`Search API error: ${searchRes.status}`);
  const searchData = await searchRes.json();

  const items: { Id: string }[] = searchData.Items ?? [];
  if (!items.length) throw new Error(`No address results found for: ${address}`);

  const geoid = items[0].Id;

  // Step 2: fetch waste services for that location
  const wasteRes = await fetch(
    `${BASE_URL}/ocapi/Public/myarea/wasteservices?geolocationid=${geoid}&ocsvclang=en-AU`,
    { next: { revalidate: 21600 } },
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

    // Parse date like "Mon 23/06/2025"
    let nextCollection: Date | null = null;
    const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      nextCollection = new Date(`${match[3]}-${match[2]}-${match[1]}`);
    }

    collections.push({ type, nextCollection, raw });
  }

  return collections.sort((a, b) => {
    if (!a.nextCollection) return 1;
    if (!b.nextCollection) return -1;
    return a.nextCollection.getTime() - b.nextCollection.getTime();
  });
}

export function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
