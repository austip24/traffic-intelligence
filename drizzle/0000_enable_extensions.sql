-- PostGIS for geometry types and spatial indexes; pg_trgm for fuzzy place search.
-- IF NOT EXISTS keeps this safe on hosts (e.g. Vercel Postgres/Neon) where an
-- extension was already enabled from the dashboard.
CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
