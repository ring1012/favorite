# EdgeOne Pages Next.js SSR & ISR Template

A focused Next.js 15 rendering demo for EdgeOne Pages.

## Included features

- **SSR** (`/ssr`) — renders on the server for every request.
- **ISR** (`/isr`) — generates a static page and refreshes it on a scheduled interval.
- **Edge KV API** (`/hello-edge`) — an Edge Function that increments a KV counter. Bind a KV namespace with the variable name `fkv` before deployment.
- **Navigation** (`/isr`) — an ISR page with a 60-second cache. Guests read the `admin` navigation; signed-in users edit their own.

## KV data model

All data is stored through the bound `fkv` variable:

- `navigation:data:<username>` stores `{ version, menus, sites }`. Menus are `{ id, name, parentId }` and support two levels; sites are `{ id, menuId, name, description, url, iconUrl }`.
- `navigation:user:<username>` stores the user's SHA-256 password hash as a plain string.
- `navigation:session:<token>` stores the username and expiry. The browser keeps only a random HttpOnly session token for 183 days.

The Edge Function API includes `/api/navigation`, `/api/auth/register`, `/api/auth/login`, and `/api/auth/logout`. When a site URL is created or changed, the API reads its HTML icon link and stores an absolute icon URL.

## Development

```bash
npm install
edgeone pages dev
```

## Build

```bash
edgeone pages build
```
