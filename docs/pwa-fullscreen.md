# Making a Next.js site a fullscreen home screen app (PWA)

How Pulse Rooms was made to open without browser bars on phones, and the phone layout fixes that went with it.
Written to be reused in another Next.js (Pages Router) project. Commits on `dev`, November 2026: `2ecc716`, `6798f8c`,
`55a9b71`, `4917bd8`.

## The one thing to understand first

A website in a normal browser tab can never hide the browser's address bar from code. The browser hides its bars on its
own only while the **page itself** scrolls (that is why the bars vanished on Bookings and Guests, which scroll, but not on
the Calendar, whose page is locked and only the grid scrolls inside it).

The only real fix is to make the site **installable** and open it from the home screen icon:

| Platform | What you get once installed |
|---|---|
| Android (Chrome) | `display: "fullscreen"` hides the address bar, the status bar and the navigation bar. |
| iPhone (Safari) | No Safari bars. The status bar stays when the phone is upright (iOS never hides it); held sideways iOS hides it. |

No service worker was needed: Chrome installed the app with the manifest alone.

## 1. The manifest

`public/manifest.webmanifest`:

```json
{
  "name": "Pulse Rooms",
  "short_name": "Pulse Rooms",
  "description": "Room bookings for The Pulse Newtown",
  "start_url": "/",
  "scope": "/",
  "display": "fullscreen",
  "orientation": "any",
  "background_color": "#f3f2ee",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- `display: "fullscreen"`: Android hides everything. iOS treats it as `standalone`.
- `scope: "/"`: every page stays inside the app. A page outside the scope makes Android show a URL bar again.
- `orientation: "any"`: do not lock it; staff turn the phone sideways.
- Chrome needs a **192px and a 512px** icon to install. The maskable one keeps the logo inside the middle 80%, because
  Android crops icons into a circle or squircle.

## 2. The icons

Made once from the existing `public/icon.png` (256px) with `sharp`, which Next.js already installs:

```js
// node make-icons.cjs, from the project root
const sharp = require('sharp');
(async () => {
  const mark = await sharp('public/icon.png').trim().toBuffer(); // the logo without its transparent margin
  const make = async (size, share, out) => {
    const art = await sharp(mark).resize({ height: Math.round(size * share) }).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
      .composite([{ input: art, gravity: 'center' }]).png().toFile(out);
  };
  await make(192, 0.74, 'public/icon-192.png');
  await make(512, 0.74, 'public/icon-512.png');
  await make(512, 0.56, 'public/icon-maskable-512.png'); // inside the safe circle
})();
```

Use a solid background: a transparent icon turns black on iOS. Start from a logo of 512px or larger (or an SVG) if you
have one; scaling 256px up to 512px looks a little soft. Keep the `apple-touch-icon.png` (180px) for iOS.

## 3. The head tags

In `pages/_document.js`, so every page has them (including the login page):

```jsx
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Pulse Rooms" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

And the viewport, on every page:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

`viewport-fit=cover` lets the page reach the screen edges; without it the `env(safe-area-inset-*)` values below are
always 0.

The status bar style: `default` puts the iPhone page below a plain status bar (simplest). `black-translucent` lets the page
run under the status bar, but then the header needs `padding-top: env(safe-area-inset-top)` or the clock covers the logo.

## 4. Let the manifest past the login check (easy to miss)

If the site has sign-in middleware, the phone fetches the manifest and icons **without** the sign-in cookie. A redirect to
`/login` makes the manifest invalid and Chrome silently falls back to a plain shortcut (which opens in a browser tab with a
URL bar). Exclude them in `middleware.js`:

```js
export const config = {
  matcher: ['/((?!_next/|favicon.ico|icon.png|icon-192.png|icon-512.png|icon-maskable-512.png|manifest.webmanifest|apple-touch-icon.png).*)'],
};
```

## 5. Keep clear of the notch and the home bar

Once the app is fullscreen it reaches the screen edges, and on an iPhone held sideways the notch (or Dynamic Island) sits on
one side and the home bar along the bottom.

**Side gutter** (`styles/globals.css`, Tailwind v4), used on the header and the main content in place of `px-4 md:px-6`:

```css
@utility px-safe {
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
  @media (width >= 48rem) {
    padding-left: max(1.5rem, env(safe-area-inset-left));
    padding-right: max(1.5rem, env(safe-area-inset-right));
  }
}
```

**Bottom sheets and fixed bars**: `pb-[max(1rem,env(safe-area-inset-bottom))]` on the footer of a sheet and on a bottom
tab bar. A centred sheet on a phone held sideways also gets `pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]`
on its overlay.

**Heights worked out in JavaScript**: a view that sizes itself from `window.innerHeight` (the calendar grid here) has to
subtract the home bar too. `env()` cannot be read directly from JS, so measure it with a hidden probe:

```js
function homeBar() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const h = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  return h;
}
```

Use `dvh` (not `vh`) for full height elements: `100vh` is taller than the visible screen on phones.

## 6. Installing it (tell the users)

- **Android**: open the live HTTPS site in **Chrome**, menu, **Install app**. If it asks "Install" or "Create shortcut",
  choose **Install**. A shortcut opens in a browser tab, with a URL and title bar that comes back when you scroll up.
- **iPhone**: open it in **Safari**, Share, **Add to Home Screen**, and keep **Open as Web App** switched on.
- Open it from the icon, not from the browser.

## Troubleshooting

| What you see | Why | Fix |
|---|---|---|
| A URL and title bar that comes back when scrolling up, after "installing" | It was added as a shortcut, not installed | Remove the icon and install again (step 6). |
| Chrome only offers "Add to Home screen", never "Install app" | The manifest was rejected | Desktop Chrome, DevTools, Application, Manifest: read the errors. Usual causes: missing 192 or 512 icon, the manifest redirected to the login page (step 4), plain `http` (installing needs HTTPS; `localhost` is the only exception). |
| Bars only hide when the page scrolls | It is running in a browser tab | Install it. |
| The icon was added before the manifest was deployed | The old icon is a plain bookmark | Remove it and add it again. |
| A change does not show in the installed app | The app keeps the page it loaded until it is closed (there is no service worker cache) | Swipe the app away from the recent apps and open it again. |
| Content under the notch when held sideways | No side safe-area padding | Step 5. |
| Testing on the dev server over Wi-Fi does not install | Not HTTPS | Test the install on the deployed site. |

## Related phone fixes made at the same time

- **The keyboard popping up when a panel opens**: focus the text box only with a mouse
  (`matchMedia('(pointer: fine)').matches`); on a touch screen focus the panel itself (`tabIndex={-1}`) so the keyboard
  opens only when the box is tapped.
- **A sticky search under a sticky header**: `sticky top-14` (the header's height), and the shorter header of a phone held
  sideways needs its own offset (`short:top-12`, where `short` is `@media (orientation: landscape) and (max-height: 500px)`).
  Pin only the search on a phone; pinning a whole block of filters hides half the screen.
- **Long names going one letter per line**: do not use `overflow-wrap: anywhere` in a flex row. It lets the browser
  shrink the text to one letter wide whenever something beside it (a tag, a column) needs room. Use
  `overflow-wrap: break-word` (breaks only a word too long for a whole line), let the row wrap (`flex-wrap`) so a tag drops
  under the name, and on phones move secondary columns (counts, dates) under the name instead of beside it.
