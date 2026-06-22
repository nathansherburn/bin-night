import { getBinCollection, groupByDate, daysUntil, whenLabel, DEFAULT_ADDRESS } from '@/lib/bins';

export const revalidate = 21600; // 6 hours

const BIN_STYLES: { match: string; bg: string; border: string; badge: string; dot: string }[] = [
  { match: 'landfill', bg: 'bg-red-950/60',    border: 'border-red-800',    badge: 'bg-red-800 text-red-100',       dot: 'bg-red-500'    },
  { match: 'general',  bg: 'bg-red-950/60',    border: 'border-red-800',    badge: 'bg-red-800 text-red-100',       dot: 'bg-red-500'    },
  { match: 'recycl',   bg: 'bg-yellow-950/60', border: 'border-yellow-700', badge: 'bg-yellow-700 text-yellow-100', dot: 'bg-yellow-400' },
  { match: 'glass',    bg: 'bg-purple-950/60', border: 'border-purple-800', badge: 'bg-purple-800 text-purple-100', dot: 'bg-purple-500' },
  { match: 'organ',    bg: 'bg-green-950/60',  border: 'border-green-800',  badge: 'bg-green-800 text-green-100',   dot: 'bg-green-500'  },
  { match: 'food',     bg: 'bg-green-950/60',  border: 'border-green-800',  badge: 'bg-green-800 text-green-100',   dot: 'bg-green-500'  },
  { match: 'garden',   bg: 'bg-green-950/60',  border: 'border-green-800',  badge: 'bg-green-800 text-green-100',   dot: 'bg-green-500'  },
];

function getBinStyle(type: string) {
  const lower = type.toLowerCase();
  return (
    BIN_STYLES.find((s) => lower.includes(s.match)) ?? {
      bg: 'bg-slate-900/60',
      border: 'border-slate-700',
      badge: 'bg-slate-700 text-slate-100',
      dot: 'bg-slate-400',
    }
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
  const tonight = groups.find((g) => {
    const d = daysUntil(g.date);
    return d !== null && d <= 1;
  });

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
          Monash Council
        </p>
        <h1 className="text-3xl font-bold text-slate-100">Bin Night</h1>
        <p className="mt-1 text-sm text-slate-500 truncate">{address}</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300 text-sm">
          {error}
        </div>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Put out tonight
            </h2>
            {tonight ? (
              <div className="flex flex-col gap-3">
                {tonight.types.map((type) => {
                  const style = getBinStyle(type);
                  return (
                    <div
                      key={type}
                      className={`flex items-center gap-4 rounded-xl border ${style.border} ${style.bg} px-5 py-4`}
                    >
                      <span className={`h-3 w-3 rounded-full shrink-0 ${style.dot}`} />
                      <span className="font-semibold text-slate-100 flex-1">{type}</span>
                      <span className="text-xs font-bold uppercase tracking-wide text-orange-400">
                        {whenLabel(daysUntil(tonight.date))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4 text-slate-400 text-sm">
                No bins due in the next 24 hours.
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Full schedule
            </h2>
            <div className="flex flex-col gap-5">
              {groups.map((group) => {
                const days = daysUntil(group.date);
                return (
                  <div key={group.raw}>
                    <div className="flex items-baseline justify-between mb-2 px-1">
                      <span className="text-sm font-semibold text-slate-200">{group.raw}</span>
                      <span className="text-xs text-slate-500">{whenLabel(days)}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {group.types.map((type) => {
                        const style = getBinStyle(type);
                        return (
                          <div
                            key={type}
                            className={`flex items-center gap-4 rounded-lg border ${style.border} ${style.bg} px-4 py-3`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${style.dot}`} />
                            <span className="flex-1 text-sm font-medium text-slate-200">{type}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <footer className="mt-12 text-xs text-slate-700 text-center">
        Updated every 6 hours &middot; notifications via ntfy.sh every Monday
      </footer>
    </main>
  );
}
