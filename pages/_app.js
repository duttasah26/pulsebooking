import { Geist, Geist_Mono } from 'next/font/google';
import { ToastProvider } from '../components/Toast';
import '../styles/globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export default function App({ Component, pageProps }) {
  return (
    <div className={`${sans.variable} ${mono.variable} font-sans`}>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </div>
  );
}
