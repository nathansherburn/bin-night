import { getBinCollection, groupByDate, daysUntil, whenLabel, DEFAULT_ADDRESS } from '@/lib/bins';

export const revalidate = 21600; // 6 hours

type BinStyle = { lid: string; chip: string; text: string };

// Australian kerbside bin lid colours.
const BIN_STYLES: { match: string; style: BinStyle }[] = [
  { match: 'landfill', style: { lid: 'bg-rose-500',    chip: 'bg-rose-50 border-rose-100',       text: 'text-rose-900'    } },
  { match: 'general',  style: { lid: 'bg-rose-500',    chip: 'bg-rose-50 border-rose-100',       text: 'text-rose-900'    } },
  { match: 'recycl',   style: { lid: 'bg-amber-400',   chip: 'bg-amber-50 border-amber-100',     text: 'text-amber-900'   } },
  { match: 'glass',    style: { lid: 'bg-purple-500',  chip: 'bg-purple-50 border-purple-100',   text: 'text-purple-900'  } },
  { match: 'organ',    style: { lid: 'bg-emerald-500', chip: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-900' } },
  { match: 'food',     style: { lid: 'bg-emerald-500', chip: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-900' } },
  { match: 'garden',   style: { lid: 'bg-emerald-500', chip: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-900' } },
];

const DEFAULT_STYLE: BinStyle = { lid: 'bg-slate-400', chip: 'bg-slate-50 border-slate-100', text: 'text-slate-700' };

function getBinStyle(type: string): BinStyle {
  const lower = type.toLowerCase();
  return BIN_STYLES.find((s) => lower.includes(s.match))?.style ?? DEFAULT_STYLE;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(date: Date | null, fallback: string): { weekday: string; rest: string } {
  if (!date) return { weekday: fallback, rest: '' };
  return { weekday: WEEKDAYS[date.getDay()], rest: `${date.getDate()} ${MONTHS[date.getMonth()]}` };
}

function BinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export default async function Home() {
  const address = process.env.BIN_ADDRESS ?? DEFAULT_ADDRESS;

  let collections: Awaited<ReturnType<typeof getBinCollection>> = [];
  let error: string | null = null;

  try {
    collections = await getBinCollection(address);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to fetch bin schedule';
  }

  const groups = groupByDate(collections);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-12 sm:py-16">
      <header className="mb-9">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Monash Council
        </p>
        <h1 className="mt-1.5 text-4xl font-bold tracking-tight text-slate-900">Bin Night</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
            <path d="M12 21s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11Z" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span className="truncate">{address}</span>
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <p className="font-semibold">Couldn&rsquo;t load the schedule</p>
          <p className="mt-1 text-rose-600/80">{error}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          No collection data available.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const days = daysUntil(group.date);
            const isTonight = days !== null && days <= 1;
            const { weekday, rest } = formatDate(group.date, group.raw);

            return (
              <article
                key={group.raw}
                className={
                  isTonight
                    ? 'relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-5 shadow-lg shadow-amber-100/60 ring-1 ring-amber-200/50'
                    : 'rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm'
                }
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold leading-tight text-slate-900">{weekday}</h2>
                    {rest && <p className="text-sm text-slate-400">{rest}</p>}
                  </div>
                  {isTonight ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-softpulse" />
                      Put out tonight
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                      {whenLabel(days)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {group.types.map((type) => {
                    const style = getBinStyle(type);
                    return (
                      <div
                        key={type}
                        className={`flex items-center gap-3 rounded-2xl border ${style.chip} px-3 py-2.5`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.lid} text-white shadow-sm`}>
                          <BinIcon className="h-5 w-5" />
                        </span>
                        <span className={`text-sm font-semibold ${style.text}`}>{type}</span>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <footer className="mt-auto pt-12 text-center text-xs text-slate-400">
        Updated every 6 hours &middot; reminders via ntfy.sh every Monday
      </footer>
    </main>
  );
}
