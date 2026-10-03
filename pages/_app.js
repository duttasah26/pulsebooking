import { Geist, Geist_Mono } from 'next/font/google';
import { IconContext } from '@phosphor-icons/react';
import { ToastProvider } from '../components/Toast';
import '../styles/globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export default function App({ Component, pageProps }) {
  return (
    <div className={`${sans.variable} ${mono.variable} font-sans`}>
      {/* Icons here are decorative (the text or an aria-label carries the meaning), so hide them from screen readers. */}
      <IconContext.Provider value={{ 'aria-hidden': 'true' }}>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </IconContext.Provider>
    </div>
  );
}
