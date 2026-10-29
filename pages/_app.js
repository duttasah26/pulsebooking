import { Atkinson_Hyperlegible_Next, Atkinson_Hyperlegible_Mono } from 'next/font/google';
import { useRouter } from 'next/router';
import { IconContext } from '@phosphor-icons/react';
import { MotionConfig } from 'framer-motion';
import { ToastProvider } from '../components/Toast';
import { SettingsProvider } from '../components/SettingsProvider';
import Assistant from '../components/Assistant';
import '../styles/globals.css';

// Atkinson Hyperlegible: drawn for low vision readers, so 0 and O, 1, l and I never look alike. Words in Next, numbers in Mono.
const text = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-text', display: 'swap', adjustFontFallback: false });
const figures = Atkinson_Hyperlegible_Mono({ subsets: ['latin'], variable: '--font-figures', display: 'swap', adjustFontFallback: false });

export default function App({ Component, pageProps }) {
  const { pathname } = useRouter();
  return (
    <div className={`${text.variable} ${figures.variable} font-sans`}>
      {/* Icons here are decorative (the text or an aria-label carries the meaning), so hide them from screen readers. Bold
          by default: the stroke matches Atkinson's sturdy letters and stays visible to low vision eyes. */}
      <IconContext.Provider value={{ 'aria-hidden': 'true', weight: 'bold', size: 20 }}>
        {/* Framer Motion: with the device set to reduced motion, movement is dropped and only fades remain. */}
        <MotionConfig reducedMotion="user">
        <ToastProvider>
          <SettingsProvider>
            <Component {...pageProps} />
            {pathname !== '/login' && <Assistant />}
          </SettingsProvider>
        </ToastProvider>
        </MotionConfig>
      </IconContext.Provider>
    </div>
  );
}
