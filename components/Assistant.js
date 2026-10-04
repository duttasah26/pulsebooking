import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowCounterClockwise, ChatCircleDots, PaperPlaneTilt, X } from '@phosphor-icons/react';
import { api, useApi } from '../lib/useApi';
import { useSettings } from './SettingsProvider';
import { roomShade } from '../lib/colors';
import { useMediaQuery } from '../lib/useMediaQuery';

// The calendar page has its own launcher (the Ask button in the tool pane); it sends this event.
export const OPEN_ASSISTANT = 'pulse:assistant';

const SUGGESTIONS = [
  'Which rooms are free this weekend?',
  'Is next month available?',
  'Total nights booked this month?',
  'Total guests this month?',
  'Who is arriving today?',
  'Best quiet days next month?',
];

// An answer with the room numbers drawn as chips in their floor colour (the same colours as the calendar) and **bold** kept
// bold. Only numbers that really are rooms become chips, so "120 nights" stays plain text.
function Answer({ text, rooms }) {
  const { settings } = useSettings();
  const numbers = new Set((rooms ?? []).map((r) => String(r.number)));
  return text.split(/(\*\*[^*]+\*\*|\b\d{3}\b)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (/^\d{3}$/.test(part) && numbers.has(part)) {
      const shade = roomShade({ number: part }, settings);
      return (
        <span key={i} className="mx-0.5 inline-block rounded-md px-1.5 py-px font-mono text-[0.95em] font-semibold" style={{ backgroundColor: shade.fill, boxShadow: `inset 0 0 0 1px ${shade.edge}` }}>
          {part}
        </span>
      );
    }
    return part;
  });
}

/*
  The chat assistant: a round button at the bottom right that opens a small chat panel (like the chat on a hotel website).
  It answers questions about rooms and bookings from the database (see pages/api/assistant.js); for now it only reads,
  it cannot book anything. The conversation is kept while you move between pages, and the Reset button clears it.
*/
export default function Assistant() {
  const { pathname } = useRouter();
  const wide = useMediaQuery('(min-width: 1024px)');
  // On the calendar (wide screens) the launcher is in the tool pane, so nothing floats over the booking panel's buttons.
  const railLaunch = pathname === '/' && wide;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', text, error? }
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const input = useRef(null);
  const rooms = useApi(open ? '/api/rooms?all=1' : null); // to know which numbers are rooms

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy, open]);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener(OPEN_ASSISTANT, toggle);
    return () => window.removeEventListener(OPEN_ASSISTANT, toggle);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (text) => {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...messages.filter((m) => !m.error), { role: 'user', text: clean }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    try {
      const { reply } = await api('/api/assistant', { method: 'POST', body: { messages: next.map(({ role, text }) => ({ role, text })) } });
      setMessages([...next, { role: 'assistant', text: reply }]);
    } catch (err) {
      setMessages([...next, { role: 'assistant', text: err.message, error: true }]);
    }
    setBusy(false);
  };

  // The panel opens next to the tool pane on the calendar, and at the bottom right elsewhere. The round button sits below
  // the pop-up sheets (z-35), so a sheet's own buttons are never covered by it.
  const place = railLaunch ? 'fixed left-24 z-[45] bottom-4' : 'fixed right-4 z-[45] bottom-20 md:bottom-4';
  if (!open) {
    if (railLaunch || !wide) return null; // phones and tablets: the Ask button in the top bar opens it, so nothing floats over the page
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the assistant"
        title="Ask about rooms and bookings"
        className={`${place.replace('z-[45]', 'z-[35]')} grid size-12 place-items-center rounded-full bg-accent text-accent-ink shadow-lg transition-transform hover:scale-105 active:scale-95`}
      >
        <ChatCircleDots size={26} weight="fill" aria-hidden="true" />
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-label="Assistant"
      className={`${place} flex h-[min(34rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-lg`}
    >
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <ChatCircleDots size={20} weight="fill" aria-hidden="true" className="shrink-0 text-accent-text" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-tight">Assistant</h2>
          <p className="truncate text-sm text-muted lg:text-xs">Read-only answers from your bookings</p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="btn btn-icon min-h-11 min-w-11 border-transparent lg:min-h-8 lg:min-w-8" onClick={() => setMessages([])} aria-label="Start a new chat" title="Start a new chat">
            <ArrowCounterClockwise size={16} aria-hidden="true" />
          </button>
        )}
        <button type="button" className="btn btn-icon min-h-11 min-w-11 border-transparent lg:min-h-8 lg:min-w-8" onClick={() => setOpen(false)} aria-label="Close the assistant">
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted">Ask a question, or tap one:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="btn min-h-11 whitespace-normal px-3 py-1 text-left text-sm lg:min-h-8 lg:px-2.5 lg:text-xs" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <p
            key={i}
            className={`max-w-[88%] whitespace-pre-wrap rounded-lg [overflow-wrap:anywhere] px-3 py-2 text-sm leading-snug ${
              m.role === 'user' ? 'ml-auto bg-accent text-accent-ink' : m.error ? 'border border-danger text-danger' : 'bg-surface-2'
            }`}
          >
            {m.role === 'assistant' && !m.error ? <Answer text={m.text} rooms={rooms.data} /> : m.text}
          </p>
        ))}
        {busy && <p className="w-fit rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted motion-safe:animate-pulse">Checking the bookings…</p>}
        <div ref={end} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-line p-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input
          ref={input}
          name="question"
          className="field"
          placeholder="Ask about rooms, nights, guests…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
          maxLength={500}
        />
        <button type="submit" className="btn btn-primary btn-icon shrink-0" disabled={busy || !draft.trim()} aria-label="Send">
          <PaperPlaneTilt size={18} weight="fill" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
