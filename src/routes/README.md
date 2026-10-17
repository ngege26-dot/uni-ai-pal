# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## This app is the phone app's backend

The phone app in this project reads and writes its data through the Supabase
client that Lovable Cloud generates inside the phone app's folder. Server-only
work, such as calls that need a secret key, email or push, AI calls, and
writes the server must check first, lives in server routes under
`api/public/`: the published site serves only that prefix without a Lovable
login, which the phone never has. A handler that writes, returns the caller's
own data, or spends money or sends messages verifies the caller's Supabase
session token first; a free public read such as the version route needs none.
The `expo-backend-api` skill has the client and the handler pattern.
`index.tsx` is a status page and renders no app data; build web pages here
only when the user asks for a website.

| File | URL |
| --- | --- |
| `api/public/version.ts` | `/api/public/version` (server route: handlers, no component) |
| `api/public/notes/$id.ts` | `/api/public/notes/:id` (dynamic — bare `$`, no curly braces) |
