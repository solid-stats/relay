# SG Stats Relay

Relay service for `sg.zone` with per-user tokens and admin panel protected by Authelia.

## Features

- No SSH access for developers.
- Personal JWT token per user.
- Token creation from any device via `/admin` page.
- Admin access protected by Authelia 2FA.
- Relay endpoint is fixed to `sg.zone` only.
- Ready for `pm2` (`ecosystem.config.cjs` included).

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.sample .env
```

3. Set required values in `.env`:

- `RELAY_TOKEN_SECRET`
- `RELAY_ADMIN_EMAILS`
- `TRUSTED_AUTH_SHARED_SECRET`

4. Start relay locally:

```bash
npm run start
```

## PM2 (production)

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

## Endpoints

- `GET /health` - health check.
- `GET /admin` - admin page (Authelia + trusted proxy headers required).
- `POST /admin/tokens` - issue personal token (Authelia + trusted proxy headers required).
- `GET /relay?path=/replays?p=1` - relay request (Bearer token required).

## Parser env example

```env
REPLAYS_RELAY_URL=https://relay.your-domain/relay
REPLAYS_RELAY_TOKEN=<user-token>
```

## Deployment with Authelia + Caddy

See `deploy/authelia-caddy/README.md`.
