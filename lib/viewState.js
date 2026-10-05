import { useCallback } from 'react';
import { api, useApi } from './useApi';
import { useToast } from '../components/Toast';

// Small helpers for the filter, sort and view state kept in the URL of the Bookings and Guests screens.

// Several choices are kept in one URL value, separated by commas: "1,2" for floors, "confirmed,checked_in" for statuses.
export const csvList = (value) => (value ? String(value).split(',').filter(Boolean) : []);
export const toggleCsv = (value, item) => {
  const list = csvList(value);
  return (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]).join(',');
};

// The params that differ from the screen's defaults (what a saved view stores), as plain text.
export function changedParams(values, defaults) {
  const out = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    const v = values[key];
    if (typeof v === 'string' && v !== '' && v !== fallback) out[key] = v;
  }
  return out;
}

// Two sets of params are the same view when every non-empty value matches.
export function sameParams(a, b) {
  const ka = Object.keys(a).filter((k) => a[k]);
  const kb = Object.keys(b).filter((k) => b[k]);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}

// Saved views for one screen ('bookings' or 'guests'). They are kept in the database and shared by every device.
export function useSavedViews(page) {
  const toast = useToast();
  const list = useApi(`/api/views?page=${page}`);
  const views = list.data ?? [];

  const save = useCallback(async (name, params) => {
    try {
      await api('/api/views', { method: 'POST', body: { page, name, params } });
      list.reload();
      toast({ message: `Saved the view “${name}”`, duration: 3000 });
      return true;
    } catch (err) {
      toast({ message: `Could not save the view: ${err.message}`, important: true });
      return false;
    }
  }, [page, list, toast]);

  const remove = useCallback(async (view) => {
    try {
      await api(`/api/views?id=${view.id}`, { method: 'DELETE' });
      list.reload();
      toast({
        message: `Deleted the view “${view.name}”`,
        actionLabel: 'Undo',
        onAction: async () => {
          await api('/api/views', { method: 'POST', body: { page, name: view.name, params: view.params } });
          list.reload();
        },
      });
    } catch (err) {
      toast({ message: `Could not delete the view: ${err.message}` });
    }
  }, [page, list, toast]);

  return { views, loading: list.loading && !list.data, error: list.error, save, remove };
}
