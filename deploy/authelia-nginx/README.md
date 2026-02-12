# Authelia + Existing Nginx setup for SG Stats Relay

This setup runs only Authelia in Docker and uses your existing host Nginx as reverse proxy.

## 1) Prepare relay

In project root `.env`:

- Keep `HOST=127.0.0.1` and `PORT=8787`.
- Set `RELAY_ADMIN_EMAILS` with emails allowed to open `/admin`.
- Set `TRUSTED_AUTH_SHARED_SECRET` to a long random string.

## 2) Prepare Authelia stack

```bash
cd deploy/authelia-nginx
cp .env.example .env
```

Fill `.env` and ensure:

- `AUTH_PROXY_SHARED_SECRET` equals root `.env` value `TRUSTED_AUTH_SHARED_SECRET`.
- `RELAY_DOMAIN`, `AUTH_DOMAIN`, `BASE_DOMAIN` are correct.

## 3) Configure Authelia users

Edit `authelia/users_database.yml` with your admin email and password hash.

Generate password hash:

```bash
docker run --rm authelia/authelia:4.39 authelia crypto hash generate argon2 --password 'StrongPassword123!'
```

## 4) Start Authelia

```bash
docker compose up -d
```

## 5) Configure host Nginx

1. Copy `nginx/sg-stats-relay.conf.example` to `/etc/nginx/sites-available/sg-stats-relay.conf`.
2. Replace domains, TLS certificate paths, and `X-Auth-Proxy-Secret` value.
3. Enable site and reload Nginx.

Example:

```bash
sudo ln -s /etc/nginx/sites-available/sg-stats-relay.conf /etc/nginx/sites-enabled/sg-stats-relay.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6) Verify

- Open `https://auth.example.com` (Authelia login page).
- Open `https://relay.example.com/admin` and complete login + TOTP.
- Create relay token in admin page.

## Notes

- `/relay` stays public by path, but protected by relay bearer token.
- `/admin*` is protected by Authelia and trusted header secret.
- Authelia listens on `127.0.0.1:${AUTHELIA_PORT}` (default `2317`).
