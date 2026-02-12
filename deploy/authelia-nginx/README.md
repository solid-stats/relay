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

`authelia/configuration.yml` uses template expressions (`{{ mustEnv ... }}`), enabled via
`X_AUTHELIA_CONFIG_FILTERS=template` in `docker-compose.yml`.

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
3. Keep upstream port in Nginx equal to `HOST_PORT_AUTHELIA` value from `.env`.
4. Enable site and reload Nginx.

Example:

```bash
sudo ln -s /etc/nginx/sites-available/sg-stats-relay.conf /etc/nginx/sites-enabled/sg-stats-relay.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6) Verify

- Open `https://auth.example.com` (Authelia login page).
- Open `https://relay.example.com/admin` and complete login + TOTP.
- `curl -I https://relay.example.com/admin` should return `302` when not authenticated.
- Create relay token in admin page.

## Notes

- `/relay` stays public by path, but protected by relay bearer token.
- `/admin*` is protected by Authelia and trusted header secret.
- Authelia host listen address is `127.0.0.1:${HOST_PORT_AUTHELIA}` (default `2317`).
