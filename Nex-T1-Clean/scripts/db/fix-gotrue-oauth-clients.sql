-- =============================================================================
-- GoTrue OAuth clients migration repair
-- Fixes SQLSTATE 42703: column "client_id" does not exist
-- Target: auth.oauth_clients table in the Supabase (GoTrue) database
-- Safe to re-run (idempotent)
-- =============================================================================

-- Ensure auth schema exists (defensive)
CREATE SCHEMA IF NOT EXISTS auth;

-- Ensure enum exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'auth'
      AND t.typname = 'oauth_registration_type'
  ) THEN
    CREATE TYPE auth.oauth_registration_type AS ENUM ('dynamic', 'manual');
  END IF;
END $$;

-- NOTE: Do not drop auth.oauth_clients even when empty.
-- The table can be referenced by foreign keys; dropping would cascade or fail.

-- Create table if missing (matches GoTrue migration shape)
CREATE TABLE IF NOT EXISTS auth.oauth_clients (
  id uuid NOT NULL,
  client_id text NOT NULL,
  client_secret_hash text NOT NULL,
  registration_type auth.oauth_registration_type NOT NULL,
  redirect_uris text NOT NULL,
  grant_types text NOT NULL,
  client_name text NULL,
  client_uri text NULL,
  logo_uri text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CONSTRAINT oauth_clients_pkey PRIMARY KEY (id)
);

-- Add any missing columns (for partially-created tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'id'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN client_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'client_secret_hash'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN client_secret_hash text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'registration_type'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN registration_type auth.oauth_registration_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'redirect_uris'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN redirect_uris text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'grant_types'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN grant_types text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'client_name'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN client_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'client_uri'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN client_uri text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'logo_uri'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN logo_uri text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN created_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN updated_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'oauth_clients' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE auth.oauth_clients ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Ensure defaults for timestamps
ALTER TABLE auth.oauth_clients
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Apply NOT NULL constraints only when safe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.oauth_clients WHERE id IS NULL) THEN
    ALTER TABLE auth.oauth_clients ALTER COLUMN id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.oauth_clients WHERE client_id IS NULL) THEN
    ALTER TABLE auth.oauth_clients ALTER COLUMN client_id SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.oauth_clients WHERE client_secret_hash IS NULL) THEN
    ALTER TABLE auth.oauth_clients ALTER COLUMN client_secret_hash SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.oauth_clients WHERE registration_type IS NULL) THEN
    ALTER TABLE auth.oauth_clients ALTER COLUMN registration_type SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.oauth_clients WHERE redirect_uris IS NULL) THEN
    ALTER TABLE auth.oauth_clients ALTER COLUMN redirect_uris SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.oauth_clients WHERE grant_types IS NULL) THEN
    ALTER TABLE auth.oauth_clients ALTER COLUMN grant_types SET NOT NULL;
  END IF;
END $$;

-- Primary key constraint (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'oauth_clients_pkey'
      AND conrelid = 'auth.oauth_clients'::regclass
  ) THEN
    ALTER TABLE auth.oauth_clients ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Unique constraint on client_id (only if no duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'oauth_clients_client_id_key'
      AND conrelid = 'auth.oauth_clients'::regclass
  ) THEN
    IF EXISTS (
      SELECT 1 FROM auth.oauth_clients GROUP BY client_id HAVING COUNT(*) > 1
    ) THEN
      RAISE EXCEPTION 'Duplicate client_id values detected; cannot add unique constraint.';
    END IF;
    ALTER TABLE auth.oauth_clients ADD CONSTRAINT oauth_clients_client_id_key UNIQUE (client_id);
  END IF;
END $$;

-- Indexes expected by GoTrue migration
CREATE INDEX IF NOT EXISTS oauth_clients_client_id_idx ON auth.oauth_clients (client_id);
CREATE INDEX IF NOT EXISTS oauth_clients_deleted_at_idx ON auth.oauth_clients (deleted_at);
