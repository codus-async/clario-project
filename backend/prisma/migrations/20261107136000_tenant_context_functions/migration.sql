-- =============================================================================
-- CLARIO MVP — TENANT SESSION CONTEXT FUNCTIONS
-- Reviewed SQL migration. Companion to docs/clario_mvp_schema.sql section 0,
-- which defines current_app_institution_id() and is_platform_admin_context().
-- These readers expose the remaining session-bound context variables bound by the
-- application transaction helper (see backend/src/infrastructure/database/tenant-transaction.ts):
--   app.active_role                     (X-Clario-Active-Role, FR-047, F-65)
--   app.active_coordinator_appointment_id (X-Clario-Coordinator-Appointment-Id, BR-03)
-- =============================================================================

CREATE OR REPLACE FUNCTION current_app_active_role() RETURNS TEXT AS $$
    SELECT NULLIF(current_setting('app.active_role', TRUE), '');
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_app_coordinator_appointment_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.active_coordinator_appointment_id', TRUE), '')::UUID;
$$ LANGUAGE SQL STABLE;
