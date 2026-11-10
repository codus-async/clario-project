-- =============================================================================
-- CLARIO MVP — DATABASE ROLES & LEAST-PRIVILEGE GRANTS
-- Reviewed SQL migration. Statements are taken verbatim from
-- docs/clario_mvp_schema.sql (authoritative physical schema) unless a comment
-- states otherwise. Do not weaken constraints defined there.
-- =============================================================================

-- Role definitions (clario_mvp_schema.sql section 0).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clario_app_role') THEN
        CREATE ROLE clario_app_role NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clario_audit_reader_role') THEN
        CREATE ROLE clario_audit_reader_role NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clario_worker_role') THEN
        CREATE ROLE clario_worker_role NOINHERIT BYPASSRLS;
    END IF;
END
$$;

-- Least-Privilege Grants for Application Role (Revokes UPDATE/DELETE on Audit & Immutable Version Tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clario_app_role;
REVOKE UPDATE, DELETE ON audit_logs FROM clario_app_role;
REVOKE DELETE ON submission_versions, storage_objects FROM clario_app_role;

-- ADDITION to clario_mvp_schema.sql: ON ALL TABLES does not cover sequences, and the
-- application role must own no table to insert audit_logs.sequence_num (BIGSERIAL).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clario_app_role;

-- ADDITION: PostgreSQL 15+ grants the public schema no privileges to PUBLIC, so a
-- non-superuser role cannot resolve tables or functions there. The application role
-- needs USAGE (never CREATE) to execute the tenant-scoped statements issued after
-- SET LOCAL ROLE clario_app_role.
GRANT USAGE ON SCHEMA public TO clario_app_role;

-- ADDITION: keep Prisma migration bookkeeping out of the application role.
DO $$
BEGIN
    IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
        REVOKE ALL ON TABLE public._prisma_migrations FROM clario_app_role;
    END IF;
END
$$;

-- ADDITION: grant the same least-privilege DML on objects created later by the
-- migration role, so schema additions cannot ship without application access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO clario_app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO clario_app_role;

-- ADDITION: the application login role must be a member of the policy role so a
-- tenant transaction can SET LOCAL ROLE clario_app_role and become subject to RLS.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clario_app') THEN
        CREATE ROLE clario_app LOGIN;
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM pg_auth_members m
        JOIN pg_roles r ON r.oid = m.roleid
        WHERE r.rolname = 'clario_app_role'
          AND m.member = (SELECT oid FROM pg_roles WHERE rolname = 'clario_app')
    ) THEN
        GRANT clario_app_role TO clario_app;
    END IF;
END
$$;
