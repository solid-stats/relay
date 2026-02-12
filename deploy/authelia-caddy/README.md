# Authelia + Caddy setup for SG Stats Relay

## 1) Prepare relay

On server, relay should run only on localhost (`HOST=127.0.0.1`).
In relay `.env`, set:

- `RELAY_ADMIN_EMAILS` to allowed emails from Authelia users.
- `TRUSTED_AUTH_SHARED_SECRET` to a long random value.

## 2) Prepare auth stack

```bash
cd deploy/authelia-caddy
cp .env.example .env
```

Fill `.env` values and ensure:

- `AUTH_PROXY_SHARED_SECRET` equals relay `TRUSTED_AUTH_SHARED_SECRET`.
- Domain values are correct.

## 3) Configure Authelia user

Edit `authelia/users_database.yml` with your admin email and password hash.
Generate password hash:

```bash
docker run --rm authelia/authelia:4.39 authelia crypto hash generate argon2 --password 'StrongPassword123!'
```

## 4) Start stack

```bash
docker compose up -d
```

## 5) Verify

- Open `https://auth.example.com` (Authelia login page).
- Open `https://relay.example.com/admin` and complete login + TOTP.
- Create relay token in admin page.

## Notes

- `/relay` stays public by path, but protected by relay bearer token.
- `/admin*` is protected by Authelia and trusted header secret.
