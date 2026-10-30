import { useMotionBits } from '../../lib/useMotionBits';
import { VIEWS } from './useCalendarParams';
import { tabKeys } from '../../lib/tabKeys';

// Month / Timeline / Occupancy / Day. The labels turn into icons when the calendar column is narrow.
export default function ViewTabs({ view, onChange }) {
  const bits = useMotionBits(); // the sliding highlight; until it loads the chosen tab keeps its plain highlight
  return (
    <div role="tablist" aria-label="Calendar view" onKeyDown={tabKeys} className="seg no-scrollbar max-w-full overflow-x-auto">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          role="tab"
          type="button"
          title={v.label}
          aria-selected={view === v.key}
          tabIndex={view === v.key ? 0 : -1}
          onClick={() => onChange(v.key)}
          className={`seg-item relative shrink-0 ${bits ? '!bg-transparent !shadow-none' : ''}`}
        >
          {bits && view === v.key && <bits.SegPill id="calendar-view" />}
          <span className="relative z-10 inline-flex items-center gap-1.5">
            <v.Icon size={18} weight={view === v.key ? 'fill' : 'bold'} aria-hidden="true" className="shrink-0" />
            <span className="sr-only @[52rem]:not-sr-only">{v.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
