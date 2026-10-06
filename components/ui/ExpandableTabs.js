import Link from 'next/link';

/*
  Expandable tabs: a row of icon buttons in one outlined group. The tab you are on opens up to show its name; the others stay
  icons (their names are still read by screen readers and shown as a tooltip). Moving to another tab slides the name across.

  Adapted from the expandable-tabs component for this project: plain JavaScript (the project has no TypeScript), Phosphor
  icons (the project's only icon set), the project's colours and its one corner radius (no shadcn tokens), links instead of
  click state (each tab is a page), and the opening done with CSS (no framer-motion or usehooks-ts needed).

    tabs:        [{ title, icon, href }]  or  { type: 'separator' }
    activeIndex: which tab is open (the current page); -1 for none
    label:       what the group is called for screen readers
*/
export function ExpandableTabs({ tabs, activeIndex = -1, label, className = '' }) {
  return (
    <nav aria-label={label} className={`items-center gap-1 rounded-lg border border-chrome-line bg-surface p-1 ${className}`}>
      {tabs.map((tab, index) => {
        if (tab.type === 'separator') {
          return <span key={`separator-${index}`} aria-hidden="true" className="mx-1 h-6 w-px bg-line" />;
        }
        const Icon = tab.icon;
        const selected = index === activeIndex;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={tab.title}
            aria-label={tab.title}
            aria-current={selected ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg border transition-[gap,padding,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
              selected
                ? 'gap-2 border-accent bg-accent-soft px-3.5 text-accent-text short:gap-0 short:px-2.5'
                : 'gap-0 border-transparent px-2.5 text-ink hover:bg-chrome'
            }`}
          >
            <Icon size={24} weight={selected ? 'fill' : 'regular'} aria-hidden="true" className="shrink-0" />
            {/* The name opens from nothing to its full width: a grid column going from 0fr to 1fr, so no width is measured. */}
            <span
              aria-hidden="true"
              className={`grid transition-[grid-template-columns,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none short:hidden ${
                selected ? 'grid-cols-[1fr] opacity-100' : 'grid-cols-[0fr] opacity-0'
              }`}
            >
              <span className="overflow-hidden whitespace-nowrap text-base font-semibold">{tab.title}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default ExpandableTabs;
