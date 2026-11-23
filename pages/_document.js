import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        {/* Added to the home screen, the app opens without the browser's bars (standalone): the phone keeps its status bar with the
            time and battery, coloured like the header (white, or the dark header's #171513; lib/theme.js switches it). */}
        <meta name="theme-color" content="#ffffff" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Pulse Rooms" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* The page's own ground, in the document itself, so it is there before the stylesheet: otherwise the browser paints its default (black, on a device set to dark) until the CSS arrives. Same two colours as --canvas in globals.css. */}
        <style dangerouslySetInnerHTML={{ __html: 'html{background:#f3f2ee;color-scheme:light}html[data-theme="dark"]{background:#0b0a09;color-scheme:dark}' }} />
        {/* The device's theme choice (Settings: System, Light or Dark), applied before the first paint so a dark page never flashes white. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem('pulse.theme');var d=c==='dark'||(c!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';if(d)document.querySelector('meta[name="theme-color"]').setAttribute('content','#171513')}catch(e){}`,
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
