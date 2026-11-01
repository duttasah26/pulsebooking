import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        {/* The device's theme choice (Settings: System, Light or Dark), applied before the first paint so a dark page never flashes white. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem('pulse.theme');var d=c==='dark'||(c!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}`,
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
