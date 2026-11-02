// The Bookings and Guests pages in outline, shown until the list and the saved views are both in, so the page appears once, complete, and nothing
// shifts as pieces arrive. The same rows as the real page: the title and its button, the search and Filter, the quick filters and the list.
//   title: the page title (real text: it never changes)    tabs: the Guests page's three lists    action: width class of the main button
//   gridClass: the page's own grid (with the filter panel's column when it is docked)    dock: draw the filter panel's place
function Block({ className = '', i = 0, style }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={{ animationDelay: `${i * 90}ms`, ...style }} />;
}

export default function ListPageSkeleton({ title, label, tabs = false, gridClass = '', dock = false }) {
  return (
    <div className={`lg:grid lg:items-start lg:gap-4 ${gridClass}`} aria-busy="true" aria-label={label}>
      <div className="flex min-w-0 flex-col gap-5 lg:h-[calc(100dvh-5.5rem-1px)]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h1 className="t-display">{title}</h1>
          <div className="flex items-center gap-3">
            {tabs && <Block className="h-11 w-72 rounded-lg lg:h-10" />}
            <Block className="h-11 w-40 rounded-lg" i={1} />
          </div>
        </div>
        <div className="shrink-0 pb-3 pt-1">
          <div className="mx-auto w-full max-w-4xl space-y-3">
            <div className="flex gap-2"><Block className="h-11 min-w-0 flex-1 rounded-lg lg:h-10" /><Block className="h-11 w-40 rounded-lg lg:h-10" i={1} /></div>
            <div className="flex flex-wrap justify-center gap-2">
              {[88, 128, 128, 88, 96, 160].map((w, i) => <Block key={i} className="h-11 rounded-lg lg:h-9" i={i} style={{ width: w }} />)}
            </div>
          </div>
        </div>
        <div className="min-h-0 space-y-5 overflow-hidden lg:flex-1">
          {[0, 1].map((g) => (
            <div key={g} className="space-y-2">
              <Block className="h-5 w-28 rounded-md" i={g} />
              <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {[0, 1, 2].map((r) => <Block key={r} className="h-[4.25rem] w-full" i={g * 3 + r} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {dock && <Block className="hidden h-[26rem] rounded-lg lg:block" i={2} />}
    </div>
  );
}
