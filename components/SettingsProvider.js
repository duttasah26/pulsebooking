import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/useApi';
import { DEFAULT_SETTINGS, mergeSettings, patchSettings } from '../lib/settings';

// The app settings for every page. They start as the defaults (so nothing waits on the network), the saved ones arrive
// a moment later, and save() changes the screen first and tells the server after (and undoes it if the server says no).
const Ctx = createContext({ settings: DEFAULT_SETTINGS, save: async () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const current = useRef(settings);
  current.current = settings;

  useEffect(() => {
    let live = true;
    api('/api/settings').then((d) => live && setSettings(mergeSettings(d))).catch(() => {});
    return () => {
      live = false;
    };
  }, []);

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

  const value = useMemo(() => ({ settings, save }), [settings, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
