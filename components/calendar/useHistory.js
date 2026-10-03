import { useCallback, useRef, useState } from 'react';

const LIMIT = 50;

/*
  Undo and redo for what you do on the calendar (placing holds, deleting holds and bookings).
  An entry is { label, undo: async () => void, redo: async () => void }. push() records one (and forgets any redo
  history); undo() and redo() run the latest one. undoEntry(entry) is for the Undo button on a message: it undoes that
  particular entry if it is still undoable. Actions run one at a time, and a failure is reported through onError.
*/
export function useHistory({ onError }) {
  const stacks = useRef({ past: [], future: [] });
  const running = useRef(false);
  const [, bump] = useState(0);
  const refresh = () => bump((n) => n + 1);

  const push = useCallback((entry) => {
    const s = stacks.current;
    s.past = [...s.past.slice(-(LIMIT - 1)), entry];
    s.future = [];
    refresh();
  }, []);

  const run = useCallback(async (from, to, entry, direction) => {
    if (running.current) return;
    running.current = true;
    const s = stacks.current;
    s[from] = s[from].filter((e) => e !== entry);
    refresh();
    try {
      await entry[direction]();
      s[to] = [...s[to], entry];
    } catch (err) {
      s[from] = [...s[from], entry]; // it did not work, so it stays where it was
      onError?.(err);
    }
    running.current = false;
    refresh();
  }, [onError]);

  const undo = useCallback(() => {
    const entry = stacks.current.past.at(-1);
    return entry && run('past', 'future', entry, 'undo');
  }, [run]);
  const redo = useCallback(() => {
    const entry = stacks.current.future.at(-1);
    return entry && run('future', 'past', entry, 'redo');
  }, [run]);
  // An action that failed outright leaves no history behind.
  const drop = useCallback((entry) => {
    stacks.current.past = stacks.current.past.filter((e) => e !== entry);
    refresh();
  }, []);
  const undoEntry = useCallback((entry) => stacks.current.past.includes(entry) && run('past', 'future', entry, 'undo'), [run]);

  const { past, future } = stacks.current;
  return { push, drop, undo, redo, undoEntry, canUndo: past.length > 0, canRedo: future.length > 0, undoLabel: past.at(-1)?.label, redoLabel: future.at(-1)?.label };
}
