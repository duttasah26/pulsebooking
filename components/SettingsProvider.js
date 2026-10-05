import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/useApi';
import { DEFAULT_SETTINGS, mergeSettings, patchSettings } from '../lib/settings';
import { useStoredState } from '../lib/useStoredState';

// The app settings for every page. They start as the defaults (so nothing waits on the network), the saved ones arrive
// a moment later (`ready` turns true then), and save() changes the screen first and tells the server after (and undoes it
// if the server says no).
// Text size is different: it is a choice for THIS device (a phone for someone with weak eyes, a desk screen for someone
// else), so it is kept on the device and scales every size in the app.
export const TEXT_SIZES = { normal: '', large: '112.5%', xl: '125%' };
const Ctx = createContext({ settings: DEFAULT_SETTINGS, save: async () => {}, ready: true, textSize: 'normal', setTextSize: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [textSize, setTextSize] = useStoredState('pulse.textSize', 'normal', { parse: (raw) => (raw in TEXT_SIZES ? raw : undefined) });
  const current = useRef(settings);
  current.current = settings;

  useEffect(() => {
    let live = true;
    api('/api/settings')
      .then((d) => live && setSettings(mergeSettings(d)))
      .catch(() => {})
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = TEXT_SIZES[textSize] ?? '';
  }, [textSize]);

  const save = useCallback(async (change) => {
    const before = current.current;
    setSettings(patchSettings(before, change));
    try {
      setSettings(mergeSettings(await api('/api/settings', { method: 'PATCH', body: change })));
    } catch (err) {
      setSettings(before);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({ settings, save, ready, textSize, setTextSize }), [settings, save, ready, textSize, setTextSize]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
