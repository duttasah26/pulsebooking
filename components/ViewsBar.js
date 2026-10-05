import { useState } from 'react';
import { BookmarkSimple, Check, PencilSimple, Plus, X } from '@phosphor-icons/react';
import { sameParams } from '../lib/viewState';
import { Mark, toneStyle } from './FilterParts';

/*
  Saved views and quick filters on ONE line above a list: "Views", then Standard, the one-tap quick filters, and your saved
  views. The line scrolls sideways when it is longer than the screen. At its right end, Save names the current filters as a
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
  const chip = (on) => `btn min-h-10 shrink-0 gap-1 px-3 text-sm lg:min-h-8 ${on ? 'border-accent bg-accent-soft font-semibold text-accent-text' : ''}`;
  const small = 'btn min-h-10 shrink-0 gap-1 px-2.5 text-sm lg:min-h-8';

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
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold"><BookmarkSimple size={16} aria-hidden="true" className="text-muted" /> Views</span>
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
          <button type="button" aria-pressed={!changed} onClick={onReset} className={chip(!changed)}>
            {!changed && <Check size={14} weight="bold" aria-hidden="true" />}
            Standard
          </button>
          {quick.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={f.on}
              onClick={f.onToggle}
              className={`btn min-h-10 shrink-0 gap-1 px-3 text-sm lg:min-h-8 ${f.on ? 'font-semibold' : ''}`}
              style={toneStyle(f.on, f.tone)}
            >
              <Mark on={f.on} tone={f.tone} />
              {f.label}
            </button>
          ))}
          {(views.length > 0 || loading) && <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-line" />}
          {loading && <span className="skeleton h-10 w-24 shrink-0 rounded-lg lg:h-8" aria-hidden="true" />}
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
                  className="btn min-h-10 min-w-10 rounded-l-none px-0 text-danger lg:min-h-8 lg:min-w-8"
                >
                  <X size={16} weight="bold" aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {changed && !active && !naming && (
            <button type="button" className={`${small} border-dashed`} onClick={() => setNaming(true)} aria-label="Save this view" title="Save these filters as a view">
              <Plus size={16} weight="bold" aria-hidden="true" /> <span className="hidden sm:inline">Save view</span>
            </button>
          )}
          {views.length > 0 && (
            <button type="button" aria-pressed={editing} onClick={() => setEditing((e) => !e)} className={`${small} border-transparent text-muted`} aria-label={editing ? 'Done editing views' : 'Edit views'} title={editing ? 'Done' : 'Edit or delete views'}>
              <PencilSimple size={16} aria-hidden="true" /> <span className="hidden sm:inline">{editing ? 'Done' : 'Edit'}</span>
            </button>
          )}
        </div>
      </div>

      {naming && (
        <form onSubmit={submit} className="animate-fade flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-accent-soft p-2">
          <label htmlFor="view-name" className="text-sm font-medium">Name this view</label>
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
          <button type="submit" className="btn btn-primary px-4" disabled={!name.trim()}>Save view</button>
          <button type="button" className="btn px-3" onClick={() => { setNaming(false); setName(''); }}>Cancel</button>
        </form>
      )}
    </section>
  );
}
