# Orbit Navigation - EdgeOne Pages Next.js Template

A modern, high-performance website navigation system built with **Next.js 15** and **Tencent EdgeOne Pages**.

## Key Architectural Features

- **Dynamic Home Page (`/`)**: Non-cached (Dynamic Rendering). Evaluates user sessions on every request.
- **User Navigation Page (`/nav/[user]`)**: Pure ISR (Incremental Static Regeneration) static page with a 60-second revalidation period (`revalidate = 60`).
- **Unprotected GET for ISR Preloading**: To support static ISR page generation at build/request time without reading user cookies, `GET /api/navigation?username=<username>` is publicly accessible to fetch a user's navigation structure.
- **Protected Mutations**: Any modifications (`POST /api/navigation`) strictly require a valid user JWT session cookie (`navigation_session`).
- **ISR Cache Purging**: Upon navigation edits, the backend invokes `revalidatePath('/nav/<user>')` to clear the static ISR cache immediately.

## Environment Variables

The application requires the following environment variables:

| Variable | Description | Example |
| --- | --- | --- |
| `JWT_SECRET` | Secret key used for JWT signing and verification (**Must be at least 32 characters**). | `your_super_secret_jwt_key_at_least_32_chars` |
| `NAV_HOST` | Host URL used by server-side ISR data fetching (based on your environment or domain). | `http://localhost:8088` |

## KV Data Model (`fkv`)

All application data is stored in the bound Edge KV namespace variable `fkv`:

- `navigation:data:<username>`: Stores `{ version, menus, sites }`. Menus support a 2-level hierarchy; sites store `{ id, menuId, name, description, url, iconUrl }`.
- `navigation:favorites:<username>`: Stores an array of favorited site URLs for the user.
- `navigation:user:<username>`: Stores the user's SHA-256 password hash string.

## Development & Deployment

### Local Development

```bash
npm install
edgeone pages dev
```

### Production Build

```bash
edgeone pages build
```
