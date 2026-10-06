import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Light only, on purpose: the app has no dark mode, and this stops browsers from darkening it on their own. */}
        <meta name="color-scheme" content="light only" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
