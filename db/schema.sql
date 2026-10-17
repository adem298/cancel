-- Stopbill backend schema (PostgreSQL, tested against Neon).
-- Safe to re-run: every statement is idempotent.

-- Every Stripe event we have applied. The primary key makes webhook handling idempotent.
create table if not exists stripe_events (
  id           text primary key,
  type         text        not null,
  received_at  timestamptz not null default now()
);

-- One row per paid extension purchase. Only a hash of the license key is stored.
create table if not exists purchases (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text        not null unique,
  customer_email    text,
  amount_total      integer,
  currency          text,
  paid_at           timestamptz not null default now(),
  license_key_hash  text        unique,
  claimed_at        timestamptz,
  revoked_at        timestamptz
);

-- Devices that have activated a license. The limit is enforced in application code.
create table if not exists devices (
  purchase_id   uuid        not null references purchases (id) on delete cascade,
  device_id     text        not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  primary key (purchase_id, device_id)
);
