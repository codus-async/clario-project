-- =============================================================================
-- CLARIO MVP — CONFIDENTIALITY AUDIT VIEW & MANDATORY ROW-LEVEL SECURITY (BR-01, SEC-09)
-- Reviewed SQL migration. Statements are taken verbatim from
-- docs/clario_mvp_schema.sql (authoritative physical schema) unless a comment
-- states otherwise. Do not weaken constraints defined there.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 10. CONFIDENTIALITY-SCOPED AUDIT VIEWS (F-08, F-18, FR-283)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_institutional_admin_audit_logs AS
SELECT
    id,
    sequence_num,
    institution_id,
    actor_user_id,
    actor_role,
    action_code,
    target_entity_type,
    target_entity_id,
    CASE WHEN is_confidential_academic_payload THEN '{"redacted": "CONFIDENTIAL_ACADEMIC_RECORD_BR_25"}'::JSONB ELSE previous_state_jsonb END AS previous_state_jsonb,
    CASE WHEN is_confidential_academic_payload THEN '{"redacted": "CONFIDENTIAL_ACADEMIC_RECORD_BR_25"}'::JSONB ELSE resulting_state_jsonb END AS resulting_state_jsonb,
    justification_reason,
    outcome,
    row_integrity_hash,
    created_at
FROM audit_logs
WHERE institution_id = current_app_institution_id();

-- -----------------------------------------------------------------------------
-- 11. MANDATORY MULTI-TENANT ROW-LEVEL SECURITY (RLS) POLICIES (BR-01, SEC-09)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    t_name TEXT;
    tenant_tables TEXT[] := ARRAY[
        'institutional_subscriptions', 'payment_transactions', 'faculties', 'departments',
        'programmes', 'academic_sessions', 'user_role_assignments', 'coordinator_appointments',
        'supervisor_records', 'projects', 'project_groups', 'student_project_registrations',
        'project_group_members', 'topic_proposals', 'project_supervision_history',
        'storage_objects', 'programme_milestones', 'project_milestone_states',
        'submission_versions', 'submission_discussions', 'shared_group_documents',
        'shared_group_document_revisions', 'deadline_extension_requests', 'late_penalty_rules',
        'project_late_penalties', 'assessment_structures', 'examination_panels',
        'examiner_appointments', 'defence_schedules', 'examiner_assessments',
        'supervisor_assessments', 'consolidated_student_results', 'scheduled_deadline_jobs'
    ];
BEGIN
    FOREACH t_name IN ARRAY tenant_tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t_name);
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I FOR ALL TO clario_app_role '
            'USING (institution_id = (SELECT current_app_institution_id())) '
            'WITH CHECK (institution_id = (SELECT current_app_institution_id()));',
            t_name
        );
    END LOOP;
END
$$;
