#!/usr/bin/env bash
set -euo pipefail

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS clima AUTHORIZATION CURRENT_USER;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL

pg_restore \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  --schema=public \
  --schema=clima \
  /backups/agrogest.dump
