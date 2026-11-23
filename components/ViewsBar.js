import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check, PencilSimple, Plus, X } from '@phosphor-icons/react';
import { useMediaQuery } from '../lib/useMediaQuery';
import { sameParams } from '../lib/viewState';
import { Mark, toneStyle } from './FilterParts';

/*
  Saved views and quick filters on ONE line above a list: "Views", then Standard, the one-tap quick filters, and your saved
  views. The chips wrap onto more lines; on a phone they fold into one View dropdown. At its right end, Save names the current filters as a
  view and Edit shows a delete button on each saved view. Views are kept in the database, so they are the same on every device.
    views:   [{ id, name, params }]       current: the params that differ from the screen's defaults
    onApply(view) / onReset() / onSave(name) -> promise of true when saved / onDelete(view)
    quick:   one-tap filters beside Standard: [{ key, label, on, onToggle, tone? }] (Arriving today, Leaving today ...)
*/
export default function ViewsBar({ views, current, onApply, onReset, onSave, onDelete, loading, quick = [] }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const changed = Object.keys(current).length > 0;
  const active = views.find((v) => sameParams(v.params, current));
  const chip = (on) => `btn shrink-0 ${on ? 'chip-on' : ''}`;
  const small = 'btn shrink-0';
  // A phone (upright, or sideways with little height): the chips fold into one Views dropdown that names what is showing.
  const compact = useMediaQuery('(max-width: 767px), (orientation: landscape) and (max-height: 500px)');
  const [menu, setMenu] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const away = (e) => !box.current?.contains(e.target) && setMenu(false);
    const esc = (e) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);
  const onQuick = quick.filter((f) => f.on).map((f) => f.label);
  const showing = !changed ? 'Standard' : active ? active.name : onQuick.length ? onQuick.join(', ') : 'Filtered';
  const row = 'flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-base font-medium hover:bg-tint';

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (await onSave(name.trim())) {
      setNaming(false);
      setName('');
    }
  };

  return (
    <section aria-label="Saved views and quick filters" className="space-y-2">
      <div className="flex items-center gap-2">
        {compact ? (
          <div ref={box} className="relative min-w-0 flex-1">
            <button type="button" className={`btn w-full justify-between gap-2 px-3 ${menu ? 'btn-on' : ''}`} aria-expanded={menu} aria-haspopup="true" onClick={() => setMenu((m) => !m)}>
              <span className="min-w-0 truncate"><span className="text-muted">View: </span>{showing}</span>
              <CaretDown size={16} aria-hidden="true" />
            </button>
            {menu && (
              <div role="group" aria-label="Views" className="animate-pop absolute inset-x-0 top-full z-30 mt-1 max-h-[min(24rem,60dvh)] space-y-0.5 overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface p-1.5 shadow-lg">
                <button type="button" aria-pressed={!changed} className={row} onClick={() => { onReset(); setMenu(false); }}>
                  <Check size={16} weight="bold" aria-hidden="true" className={changed ? 'invisible' : ''} /> Standard
                </button>
                {quick.map((f) => (
                  <button key={f.key} type="button" aria-pressed={f.on} className={row} onClick={f.onToggle}>
                    <Check size={16} weight="bold" aria-hidden="true" className={f.on ? '' : 'invisible'} /> {f.label}
                  </button>
                ))}
                {views.length > 0 && <div aria-hidden="true" className="mx-3 my-1 h-px bg-line" />}
                {views.map((v) => (
                  <div key={v.id} className="flex items-center gap-1">
                    <button type="button" aria-pressed={active?.id === v.id} className={`${row} min-w-0 flex-1`} onClick={() => { onApply(v); setMenu(false); }}>
                      <Check size={16} weight="bold" aria-hidden="true" className={active?.id === v.id ? '' : 'invisible'} /> <span className="min-w-0 truncate">{v.name}</span>
                    </button>
                    {editing && (
                      <button type="button" onClick={() => onDelete(v)} aria-label={`Delete the view ${v.name}`} className="btn btn-icon btn-danger shrink-0">
                        <X size={16} weight="bold" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        /* The chips wrap onto more lines, so none (No phone or email) is ever cut off at the edge or hidden off to the side. */
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-0.5 sm:justify-center">
          <button type="button" aria-pressed={!changed} onClick={onReset} className={`${chip(!changed)}`}>
            {!changed && <Check size={14} weight="bold" aria-hidden="true" />}
            Standard
          </button>
          {quick.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={f.on}
              onClick={f.onToggle}
              className={`btn shrink-0 ${f.on ? (f.tone ? 'font-semibold' : 'btn-on') : ''}`}
              style={toneStyle(f.on, f.tone)}
            >
              <Mark on={f.on} tone={f.tone} />
              {f.label}
            </button>
          ))}
          {(views.length > 0 || loading) && <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />}
          {loading && <span className="skeleton h-11 w-24 shrink-0 rounded-lg lg:h-9" aria-hidden="true" />}
          {views.map((v) => (
            <span key={v.id} className="inline-flex shrink-0 items-stretch">
              <button
                type="button"
                aria-pressed={active?.id === v.id}
                onClick={() => onApply(v)}
                className={`${chip(active?.id === v.id)} ${editing ? 'rounded-r-none border-r-0' : ''}`}
              >
                {active?.id === v.id && <Check size={14} weight="bold" aria-hidden="true" />}
                {v.name}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => onDelete(v)}
                  aria-label={`Delete the view ${v.name}`}
                  title={`Delete the view ${v.name}`}
                  className="btn btn-icon btn-danger shrink-0 rounded-l-none"
                >
                  <X size={16} weight="bold" aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {changed && !active && !naming && (
            <button type="button" className={`${small} btn-quiet text-accent-text`} onClick={() => setNaming(true)} aria-label="Save this view" title="Save these filters as a view">
              <Plus className="ico-turn" size={16} aria-hidden="true" /> <span className="hidden sm:inline">Save View</span>
            </button>
          )}
          {views.length > 0 && (
            <button type="button" aria-pressed={editing} onClick={() => setEditing((e) => !e)} className={`${small} btn-quiet text-muted`} aria-label={editing ? 'Done editing views' : 'Edit views'} title={editing ? 'Done' : 'Edit or delete views'}>
              <PencilSimple size={16} aria-hidden="true" /> <span className="hidden sm:inline">{editing ? 'Done' : 'Edit'}</span>
            </button>
          )}
        </div>
      </div>

      {naming && (
        <form onSubmit={submit} className="animate-fade flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-3">
          <label htmlFor="view-name" className="text-[0.9375rem] font-semibold">Name this view</label>
          <input
            id="view-name"
            name="view-name"
            className="field min-w-0 flex-1 basis-48"
            placeholder="For example Arriving this week"
            value={name}
            maxLength={40}
            autoFocus
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
          <button type="button" className="btn btn-quiet px-3" onClick={() => { setNaming(false); setName(''); }}>Cancel</button>
          <button type="submit" className="btn btn-primary px-4" disabled={!name.trim()}>Save View</button>
        </form>
      )}
    </section>
  );
}
