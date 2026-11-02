import { Outfit } from 'next/font/google';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { IconContext } from '@phosphor-icons/react';
import { MotionConfig } from 'framer-motion';
import { ToastProvider } from '../components/Toast';
import { SettingsProvider } from '../components/SettingsProvider';
import Assistant from '../components/Assistant';
import TopProgress from '../components/TopProgress';
import { watchSystemTheme } from '../lib/theme';
import '../styles/globals.css';

// One typeface for everything, words and numbers: Outfit, round and open.
const text = Outfit({ subsets: ['latin'], variable: '--font-text', display: 'swap' });

export default function App({ Component, pageProps }) {
  const { pathname } = useRouter();
  useEffect(() => watchSystemTheme(), []);
  return (
    <div className={`${text.variable} font-sans`}>
      {/* Icons here are decorative (the text or an aria-label carries the meaning), so hide them from screen readers. Bold
          by default: the stroke matches the sturdy letters and stays visible to low vision eyes. */}
      <IconContext.Provider value={{ 'aria-hidden': 'true', weight: 'bold', size: 20 }}>
        {/* Framer Motion: with the device set to reduced motion, movement is dropped and only fades remain. */}
        <MotionConfig reducedMotion="user">
        <ToastProvider>
          <SettingsProvider>
            <TopProgress />
            <Component {...pageProps} />
            {pathname !== '/login' && <Assistant />}
          </SettingsProvider>
        </ToastProvider>
        </MotionConfig>
      </IconContext.Provider>
    </div>
  );
}
