# COMBO Fresh

Aircraft cargo weight & balance calculator (B757-PCF) — offline-capable PWA.

Successor of the Cargo Trim app, with the Allowed Traffic Load loadsheet chain:
Operating Weight, Zero Fuel / Landing Allowed Weight, binding-limit ATL,
Underload before LMC, Net Weight input and Tare Weight Outcome.

## Run

Serve the folder over HTTP(S) and open `index.html` — for example:

```
npx serve .
```

On iPhone: open the page in Safari → Share → **Add to Home Screen**.
After the first visit the service worker caches every asset, so the app
works fully offline.

> Note: service workers require HTTPS (or localhost). Opening the file
> directly via `file://` runs the app but skips offline caching.

## Test

```
npm install
npm test
```

Runs a jsdom smoke test that drives the app headlessly and checks the
loadsheet numbers end to end.
