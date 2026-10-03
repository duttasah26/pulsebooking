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
  const [, bump] = useState(0);
  const refresh = () => bump((n) => n + 1);

  const push = useCallback((entry) => {
    const s = stacks.current;
    s.past = [...s.past.slice(-(LIMIT - 1)), entry];
    s.future = [];
    refresh();
  }, []);

  // Undo and redo wait their turn: pressing Undo three times quickly undoes three things, one after the other (a press is
  // never dropped because the one before it is still talking to the server). The entry is chosen when its turn comes.
  const queue = useRef(Promise.resolve());
  const step = useCallback((from, to, direction, only) => {
    queue.current = queue.current.then(async () => {
      const s = stacks.current;
      const entry = only ?? s[from].at(-1);
      if (!entry || !s[from].includes(entry)) return;
      s[from] = s[from].filter((e) => e !== entry);
      refresh();
      try {
        await entry[direction]();
        s[to] = [...s[to], entry];
      } catch (err) {
        s[from] = [...s[from], entry]; // it did not work, so it stays where it was
        onError?.(err);
      }
      refresh();
    });
    return queue.current;
  }, [onError]);

  const undo = useCallback(() => step('past', 'future', 'undo'), [step]);
  const redo = useCallback(() => step('future', 'past', 'redo'), [step]);
  // An action that failed outright leaves no history behind.
  const drop = useCallback((entry) => {
    stacks.current.past = stacks.current.past.filter((e) => e !== entry);
    refresh();
  }, []);
  const undoEntry = useCallback((entry) => step('past', 'future', 'undo', entry), [step]);

  const { past, future } = stacks.current;
  return { push, drop, undo, redo, undoEntry, canUndo: past.length > 0, canRedo: future.length > 0, undoLabel: past.at(-1)?.label, redoLabel: future.at(-1)?.label };
}
