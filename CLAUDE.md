# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

ChittyVerify is a **static SPA** (Vite + React) deployed to **Cloudflare Pages**. There is no local backend. All evidence operations go to upstream ChittyOS services over HTTPS.

```
Browser SPA  ──>  evidence.chitty.cc   (12-step AI evidence pipeline, chittyevidence-db)
              │
              ├─>  auth.chitty.cc      (ChittyAuth — register, validate Bearer tokens)
              ├─>  id.chitty.cc        (ChittyID — identity)
              └─>  beacon.chitty.cc    (ChittyBeacon — telemetry/discovery)
```

The Express + Drizzle + Passport backend was retired in PR #37 (2026-04-23) when the SPA was migrated to CF Pages. Anything that talks to a database or runs server-side code lives in **chittyevidence-db**, not here.

## Stack

- **Frontend**: React 18, TypeScript, Vite 7, Wouter (routing), TanStack React Query, Zod
- **UI**: Tailwind CSS, Radix UI primitives, Framer Motion, Lucide icons, `tailwindcss-animate`
- **Auth**: ChittyAuth Bearer token, stored in `localStorage` as `chitty_auth_token`
- **Build/deploy**: `vite build` → `dist/public/` → `wrangler pages deploy --project-name chittyverify`
- **Hosting**: Cloudflare Pages at `verify.chitty.cc` (and `chittyverify.pages.dev`)

## Commands

```bash
npm install
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # Production build → dist/public/
npm run preview   # Serve built bundle locally
npm run check     # tsc (type-check, no emit)
npm run deploy    # vite build + wrangler pages deploy
```

`vite.config.ts` sets `root` = `client/` and `build.outDir` = `dist/public`. The `@/` alias resolves to `client/src/`.

## File Layout

```
client/
  index.html             # Vite entry HTML
  src/
    App.tsx              # Router + providers (QueryClient, Auth, Tooltip, Toaster)
    main.tsx             # ReactDOM.render
    pages/               # dashboard, evidence-details, upload, login, not-found
    components/
      ui/                # Radix-based shadcn primitives + Navigation, Footer
      trust/             # Trust score widgets
      upload/            # Upload UI
      verification/      # Verification UI
    hooks/
      use-auth.tsx       # AuthProvider + useAuth() — Bearer token lifecycle
      use-toast.ts
      use-mobile.tsx
    lib/
      api.ts             # API_BASE / AUTH_BASE / CHITTYID_BASE / BEACON_BASE + apiUrl()
      adapters.ts        # evidence.chitty.cc response → SPA component shapes
      queryClient.ts     # TanStack QueryClient
      utils.ts           # cn(), misc helpers
src/setupTests.ts        # Vitest setup
vite.config.ts
wrangler.jsonc           # pages_build_output_dir = dist/public
tailwind.config.ts
tsconfig.json
```

Active routes (`App.tsx`): `/`, `/dashboard`, `/evidence/:id`, `/upload`, `/login`. `share.tsx` and `verification.tsx` exist as page files but are not currently routed.

## Upstream API Contract

The SPA is a thin client over `evidence.chitty.cc`. Document/evidence shapes come from chittyevidence-db's REST surface and are mapped to component-friendly shapes by `client/src/lib/adapters.ts` (`toEvidenceCard`, `toEvidenceDetail`).

Key environment variables (Vite, all `VITE_*` prefixed):

| Var | Default | Purpose |
|-----|---------|---------|
| `VITE_API_BASE` | `https://evidence.chitty.cc` | Evidence pipeline + document API |
| `VITE_AUTH_BASE` | `https://auth.chitty.cc` | ChittyAuth |
| `VITE_CHITTYID_BASE` | `https://id.chitty.cc` | ChittyID |
| `VITE_BEACON_BASE` | `https://beacon.chitty.cc` | ChittyBeacon telemetry |

When adding new evidence-related calls, build URLs with `apiUrl()` from `lib/api.ts` and add response→view adapters in `lib/adapters.ts` rather than reshaping data inline in components.

## Auth Flow (ChittyAuth)

Currently registration-only. There is no separate login endpoint — `pages/login.tsx` is a registration form despite its name and route.

1. User submits name + email on `/login`
2. SPA computes a browser-fingerprint SHA-256 (UA + language + screen + tz) as `biometricData`
3. POST `auth.chitty.cc/v1/register` → returns `{ token, chittyId }`
4. Token persists in `localStorage` under `chitty_auth_token`; user data under `chitty_auth_user`
5. On every mount, `AuthProvider` calls `auth.chitty.cc/v1/tokens/validate` with `Authorization: Bearer <token>`. Invalid → logout. Network error → keep token, allow retry.

`useAuth()` exposes `{ user, token, isLoading, isAuthenticated, register, logout }`. Re-authentication for an existing user (proper "login") is not yet implemented.

## Development Guidelines

- **Don't reintroduce a backend.** This repo is a static SPA. Server-side work belongs in chittyevidence-db, chittyauth, etc.
- **Adapters live in `lib/adapters.ts`.** Map upstream response shapes there, not inside components.
- **Use Zod at boundaries.** Validate API response shapes before passing them to components (or rely on the adapter to narrow types).
- **Type-check before deploy.** `npm run check` must pass; CF Pages builds with `vite build` and a type error there is a deploy regression.
- **No vendored sibling repos.** Earlier copies of `chittyassets/`, `chittybeacon/`, `chittychain/`, `chittychronicle/`, `chittyevidence/`, `chittyforge/`, `chittyid/`, `chittytrust/`, and `attached_assets/` were removed (none were imported by the active SPA). If you need code from another ChittyOS service, hit its deployed API rather than vendoring its source.

## Deploy

```bash
npm run deploy
# == vite build && wrangler pages deploy dist/public --project-name chittyverify
```

Cloudflare Pages binds `verify.chitty.cc` as a custom domain to the `chittyverify` Pages project. The old `chittyverify` Worker (Replit proxy) was deleted in 2026-04-23.

## Recent History

- **2026-04-23**: Express → CF Pages migration (PR #37, -19K/+4K lines). Retired Express, Drizzle, Passport, in-memory storage, HMAC verify service. Old Worker deleted; DNS cut to CF Pages.
- **2026-04-23**: Dead component cleanup (PR #42, -4,330 lines / 16 files). Type check went from 30 errors → 0.
- **Branch `feat/chittyauth-login`**: Replaces `OneClickAuthentication` with ChittyAuth Bearer flow + `pages/login.tsx` + `hooks/use-auth.tsx`.
