-- =============================================================================
-- CLARIO MVP — POSTGRESQL EXTENSIONS
-- Reviewed SQL migration. Statements are taken verbatim from
-- docs/clario_mvp_schema.sql (authoritative physical schema) unless a comment
-- states otherwise. Do not weaken constraints defined there.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
