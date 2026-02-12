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

## Deployment with Authelia + Existing Nginx

See `deploy/authelia-nginx/README.md`.

## CD (GitHub Actions)

Workflow: `.github/workflows/cd.yml`.

Trigger:

- `push` to `main` or `master`
- `workflow_dispatch` (manual run)

### GitHub Secrets

Create repository secrets:

- `CD_SSH_HOST` - server IP or host.
- `CD_SSH_PORT` - SSH port (usually `22`).
- `CD_SSH_USER` - deploy user on server.
- `CD_SSH_PRIVATE_KEY` - private SSH key for this deploy user.
- `CD_APP_DIR` - absolute path to project on server.

Example for `CD_APP_DIR`:

```text
/home/deploy/sg_stats_relay
```

### One-time server setup

```bash
# 1) clone repo
mkdir -p /home/deploy
cd /home/deploy
git clone git@github.com:<org>/<repo>.git sg_stats_relay
cd sg_stats_relay

# 2) prepare relay env
cp .env.sample .env
# fill .env manually

# 3) prepare auth stack env
cp deploy/authelia-nginx/.env.example deploy/authelia-nginx/.env
# fill deploy/authelia-nginx/.env manually

# 4) start relay and authelia
npm ci
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
cd deploy/authelia-nginx && docker compose up -d
```

After that, each push to `main`/`master` runs remote script `deploy/remote-deploy.sh`:

- fetch + checkout target branch
- hard reset to `origin/<branch>`
- `npm ci --omit=dev`
- `pm2 startOrReload ecosystem.config.cjs --update-env`
- `docker compose up -d --remove-orphans` in `deploy/authelia-nginx`

### Notes

- Keep production `.env` files only on server (never commit them).
- Deploy user should have minimal rights: project directory, `pm2`, and `docker compose`.
- If your default branch has another name, update `cd.yml` trigger.
