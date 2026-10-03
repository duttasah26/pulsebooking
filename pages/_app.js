import { Geist, Geist_Mono } from 'next/font/google';
import { useRouter } from 'next/router';
import { IconContext } from '@phosphor-icons/react';
import { ToastProvider } from '../components/Toast';
import { SettingsProvider } from '../components/SettingsProvider';
import Assistant from '../components/Assistant';
import '../styles/globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export default function App({ Component, pageProps }) {
  const { pathname } = useRouter();
  return (
    <div className={`${sans.variable} ${mono.variable} font-sans`}>
      {/* Icons here are decorative (the text or an aria-label carries the meaning), so hide them from screen readers. */}
      <IconContext.Provider value={{ 'aria-hidden': 'true' }}>
        <ToastProvider>
          <SettingsProvider>
            <Component {...pageProps} />
            {pathname !== '/login' && <Assistant />}
          </SettingsProvider>
        </ToastProvider>
      </IconContext.Provider>
    </div>
  );
}
