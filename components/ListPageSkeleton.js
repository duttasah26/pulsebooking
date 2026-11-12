// The Bookings and Guests pages in outline, shown until the list and the saved views are both in, so the page appears once, complete, and nothing
// shifts as pieces arrive. It has the same frame as the real page, to the pixel: the title and its button, the search and Filter, the quick
// filters (their real widths), and the list as one bordered card of rows with the same height as a real row.
//   title: the page title (real text: it never changes)    tabs: the Guests page's three lists    action: width of the main button
//   chips: widths of the quick filters    groups: for a list in groups, the rows in each ([2, 1, 3] = three groups)    rows: for a flat list, how many
//   avatar: a row starts with a round initials badge (guests) instead of a small status circle (bookings)
//   gridClass: the page's own grid (with the filter panel's column when it is docked)    dock / dockHeight: draw the filter panel's place
function Block({ className = '', i = 0, style }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={{ animationDelay: `${i * 90}ms`, ...style }} />;
}

// One row of the list: the same 77px as a booking or guest row, with the shapes of what is in it.
export function RowSkeleton({ i = 0, avatar = false }) {
  return (
    <li aria-hidden="true" className="flex h-[77px] items-center gap-3 px-4">
      {avatar ? <Block className="size-10 shrink-0 rounded-full" i={i} /> : <Block className="size-5 shrink-0 rounded-full" i={i} />}
      <div className="min-w-0 flex-1 space-y-2">
        <Block className="h-4 w-40 max-w-full rounded-md" i={i} />
        <div className="flex items-center gap-3">
          {!avatar && <Block className="h-6 w-11 rounded-md" i={i} />}
          <Block className={`h-4 max-w-full rounded-md ${avatar ? 'w-28' : 'w-72'}`} i={i + 1} />
        </div>
      </div>
      {avatar && (
        <div className="hidden space-y-2 sm:block">
          <Block className="ml-auto h-4 w-12 rounded-md" i={i} />
          <Block className="h-4 w-32 rounded-md" i={i + 1} />
        </div>
      )}
      <Block className="size-4 shrink-0 rounded-sm" i={i} />
    </li>
  );
}

// The list's card of rows, for the page's own loading state (the page is there and the list is on its way).
export function ListRowsSkeleton({ rows = 6, avatar = false, label }) {
  return (
    <ul aria-busy="true" aria-label={label} className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {Array.from({ length: rows }, (_, i) => <RowSkeleton key={i} i={i} avatar={avatar} />)}
    </ul>
  );
}

export default function ListPageSkeleton({ title, label, tabs = false, action = 160, chips = [119, 150, 148, 88, 104, 155], groups, rows = 6, avatar = false, gridClass = '', dock = false, dockHeight = 691 }) {
  return (
    <div className={`lg:grid lg:items-start lg:gap-4 ${gridClass}`} aria-busy="true" aria-label={label}>
      <div className="flex min-w-0 flex-col gap-5 lg:h-[calc(100dvh-5.5rem-1px)]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="t-display">{title}</h1>
          <div className="flex items-center gap-3">
            {tabs && <Block className="hidden h-10 w-[278px] rounded-lg sm:block" />}
            <Block className="h-11 rounded-lg lg:h-10" i={1} style={{ width: action }} />
          </div>
        </div>
        <div className="shrink-0 pb-3 pt-1">
          <div className="mx-auto w-full max-w-4xl space-y-3">
            <div className="flex gap-2"><Block className="h-11 min-w-0 flex-1 rounded-lg" /><Block className="h-11 w-40 rounded-lg" i={1} /></div>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 py-0.5">
                {chips.map((w, i) => <Block key={i} className="h-11 rounded-lg lg:h-10" i={i} style={{ width: w }} />)}
              </div>
              <div aria-hidden="true" className="shrink-0" />
            </div>
          </div>
        </div>
        <div className="min-h-0 overflow-hidden lg:flex-1 lg:overflow-y-auto">
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {groups
              ? groups.map((n, g) => (
                <li key={g} aria-hidden="true" className="divide-y divide-line">
                  <div className="flex h-[37px] items-center justify-between bg-surface-2 px-4 md:px-5"><Block className="h-4 w-20 rounded-md" i={g} /><Block className="h-4 w-4 rounded-md" i={g} /></div>
                  <ul className="divide-y divide-line">{Array.from({ length: n }, (_, r) => <RowSkeleton key={r} i={g + r} avatar={avatar} />)}</ul>
                </li>
              ))
              : Array.from({ length: rows }, (_, r) => <RowSkeleton key={r} i={r} avatar={avatar} />)}
          </ul>
        </div>
      </div>
      {dock && <Block className="hidden rounded-lg lg:block" i={2} style={{ height: `min(${dockHeight}px, calc(100dvh - 100px))`, marginTop: 3 }} />}
    </div>
  );
}
