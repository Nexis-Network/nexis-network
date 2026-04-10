-- Fix for Supabase Auth (GoTrue) migration error: "operator does not exist: uuid = text"
-- This alters the auth.identities.id column from UUID to TEXT, which is the expected type for newer GoTrue versions.

ALTER TABLE auth.identities ALTER COLUMN id TYPE text USING id::text;
