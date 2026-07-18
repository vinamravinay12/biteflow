# BiteFlow — Efficiency & Performance

## 1. Bundle (real `npm run build` output)

```
dist/assets/index-*.css                6.26 kB │ gzip:   2.14 kB
dist/assets/store-*.js                 2.18 kB │ gzip:   0.74 kB
dist/assets/StallLogin-*.js            3.77 kB │ gzip:   1.47 kB
dist/assets/SuperAdminPortal-*.js     31.96 kB │ gzip:   7.17 kB
dist/assets/StallDashboard-*.js       41.84 kB │ gzip:   9.55 kB
dist/assets/index-*.js               833.41 kB │ gzip: 218.18 kB
```

## 2. Route-level code splitting

The admin and merchant portals are lazy-loaded via `React.lazy` + `Suspense` ([`src/App.tsx`](src/App.tsx)), so a customer — the default landing route and the overwhelming majority of traffic — never downloads them.

**Effect:** ~78 kB (uncompressed) of admin/merchant code moved out of the initial bundle into on-demand chunks. Each portal now arrives only when its route is visited, behind an accessible loading fallback.

## 3. Network

- **AI calls:** zero during normal browsing. At most **one** request per chat message, and only when the user actually talks to the Concierge.
- **Graceful degradation:** if the AI proxy or model is unavailable, the app falls back to a local keyword-matching assistant (`getMatchingItems`) with **no network call at all** — the ordering flow never blocks on the model.
- The Cloud Function applies a 15-second upstream timeout and returns a fallback rather than hanging the UI.
- API responses are sent `Cache-Control: no-store` (operational data is per-request).

## 4. Rendering & data

- Menu, order, and wallet reads go through a single `loadData()` per view rather than per-component fetches.
- The merchant dashboard polls on a fixed 5-second interval (bounded, cleaned up on unmount) instead of holding an open realtime subscription per component.
- Cart math (`computeCartTotal`, `groupCartByKiosk`) is pure and O(n) over cart lines.

## 5. Assets

- No chart, animation, or 3D libraries. The stadium map is hand-authored **inline SVG**, not a raster image or library.
- Icons come from `lucide-react` (tree-shaken per-icon imports).
- Menu imagery is served from remote CDN URLs rather than bundled.

## 6. Motion cost

Animations use compositor-friendly properties and are disabled entirely under `prefers-reduced-motion`, avoiding layout thrash on low-end devices.

## 7. Known gaps (stated honestly)

The 833 kB main chunk is dominated by the **Firebase SDK** (Firestore + Auth) plus the large `CustomerPortal` component. Realistic next steps, not yet done:

1. Lazy-load the Firestore/Auth modules so first paint doesn't wait on the SDK.
2. Split `CustomerPortal` (~2,700 lines) into feature components and lazy-load the cart drawer, seat map, and order-history panels.
3. Publish measured Lighthouse scores — **no Lighthouse numbers are claimed here because none have been recorded yet.**
