#!/usr/bin/env bash
set -euo pipefail

if [[ "$#" -lt 2 ]]; then
  printf 'Usage: %s <app_dir> <branch>\n' "$0" >&2
  exit 64
fi

APP_DIR="$1"
BRANCH="$2"

if [[ ! -d "$APP_DIR/.git" ]]; then
  printf 'ERROR: %s is not a git repository\n' "$APP_DIR" >&2
  exit 66
fi

if ! command -v pm2 >/dev/null 2>&1; then
  printf 'ERROR: pm2 is not installed on server\n' >&2
  exit 69
fi

if ! command -v docker >/dev/null 2>&1; then
  printf 'ERROR: docker is not installed on server\n' >&2
  exit 69
fi

if ! docker compose version >/dev/null 2>&1; then
  printf 'ERROR: docker compose plugin is not installed\n' >&2
  exit 69
fi

AUTH_STACK_DIR="$APP_DIR/deploy/authelia-nginx"

cd "$APP_DIR"

git fetch --prune origin

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" "origin/$BRANCH"
fi

git reset --hard "origin/$BRANCH"

npm ci --omit=dev
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

cd "$AUTH_STACK_DIR"
docker compose up -d --remove-orphans

echo "Deploy finished: branch=$BRANCH dir=$APP_DIR auth_stack=$AUTH_STACK_DIR"
