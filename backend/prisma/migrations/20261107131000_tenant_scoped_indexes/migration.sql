-- =============================================================================
-- CLARIO MVP — SECONDARY & TENANT-SCOPED INDEXES
-- Every tenant-scoped access path leads with institution_id so RLS-protected
-- scans stay index-backed per institution (SEC-09, SCA-01).
-- Reviewed SQL migration. Statements are taken verbatim from
-- docs/clario_mvp_schema.sql (authoritative physical schema) unless a comment
-- states otherwise. Do not weaken constraints defined there.
-- =============================================================================

CREATE UNIQUE INDEX idx_institutions_name_ci ON institutions (LOWER(name));
CREATE INDEX idx_institutions_status ON institutions (account_status);
CREATE INDEX idx_inst_subscriptions_status_end ON institutional_subscriptions (subscription_status, current_period_end, grace_period_end);
CREATE INDEX idx_inst_subscriptions_plan_fk ON institutional_subscriptions (plan_id);
CREATE INDEX idx_payment_tx_institution ON payment_transactions (institution_id, initiated_at DESC);
CREATE INDEX idx_payment_tx_inst_status ON payment_transactions (institution_id, status, initiated_at DESC);
CREATE INDEX idx_payment_tx_sub_fk ON payment_transactions (subscription_id);
CREATE INDEX idx_webhook_events_tx_ref_fk ON payment_webhook_events (idempotency_reference);
CREATE INDEX idx_webhook_events_status ON payment_webhook_events (processing_status, received_at)
    WHERE processing_status IN ('RECEIVED', 'FAILED');
CREATE UNIQUE INDEX idx_faculties_inst_name_ci ON faculties (institution_id, LOWER(name));
CREATE UNIQUE INDEX idx_departments_inst_name_ci ON departments (institution_id, LOWER(name));
CREATE INDEX idx_departments_inst_faculty ON departments (institution_id, faculty_id, status);
CREATE UNIQUE INDEX idx_programmes_inst_name_ci ON programmes (institution_id, LOWER(name));
CREATE INDEX idx_programmes_inst_dept ON programmes (institution_id, department_id, status);
CREATE INDEX idx_programmes_inst_faculty ON programmes (institution_id, faculty_id, status);
CREATE INDEX idx_academic_sessions_inst_status ON academic_sessions (institution_id, status, start_date DESC);
CREATE UNIQUE INDEX idx_users_platform_admin_email ON users (email) WHERE is_platform_admin = TRUE;
CREATE UNIQUE INDEX idx_users_tenant_email ON users (institution_id, email) WHERE institution_id IS NOT NULL;
CREATE UNIQUE INDEX idx_users_tenant_inst_id ON users (institution_id, institutional_id_number) WHERE institution_id IS NOT NULL;
CREATE INDEX idx_users_invitation_token ON users (invitation_token_hash) WHERE invitation_token_hash IS NOT NULL;
CREATE INDEX idx_users_reset_token ON users (password_reset_token_hash) WHERE password_reset_token_hash IS NOT NULL;
CREATE INDEX idx_users_inst_dept_status ON users (institution_id, primary_department_id, account_status) WHERE institution_id IS NOT NULL;
CREATE INDEX idx_user_roles_inst_role_active ON user_role_assignments (institution_id, role_code) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX idx_coord_active_unique ON coordinator_appointments (institution_id, user_id, programme_id, academic_session_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_coord_appt_prog_session ON coordinator_appointments (institution_id, programme_id, academic_session_id, status);
CREATE INDEX idx_supervisor_records_dept_elig ON supervisor_records (institution_id, primary_department_id, eligibility_status);
CREATE INDEX idx_supervisor_tags_gin ON supervisor_records USING GIN (specialization_tags);
CREATE INDEX idx_user_sessions_lookup ON user_sessions (user_id, is_revoked, expires_at);
CREATE INDEX idx_user_sessions_tenant ON user_sessions (institution_id, is_revoked);
CREATE INDEX idx_projects_scope ON projects (institution_id, programme_id, academic_session_id, lifecycle_status);
CREATE INDEX idx_projects_supervisor ON projects (institution_id, current_supervisor_user_id);
CREATE INDEX idx_projects_approval_scope ON projects (institution_id, programme_id, academic_session_id, result_approval_status);
CREATE INDEX idx_student_reg_project ON student_project_registrations (institution_id, project_id);
CREATE INDEX idx_student_reg_student_lookup ON student_project_registrations (institution_id, student_user_id);
CREATE INDEX idx_student_reg_group_fk ON student_project_registrations (institution_id, group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_student_reg_cohort_status ON student_project_registrations (institution_id, programme_id, academic_session_id, cohort_status);
CREATE INDEX idx_group_members_submitter ON project_group_members (institution_id, project_id, student_user_id, is_designated_submitter) WHERE member_status = 'ACTIVE';
CREATE INDEX idx_group_members_student_lookup ON project_group_members (institution_id, student_user_id, member_status);
CREATE INDEX idx_topic_proposals_project ON topic_proposals (institution_id, project_id, iteration_number DESC);
CREATE INDEX idx_topic_proposals_scope_status ON topic_proposals (institution_id, programme_id, academic_session_id, status);
CREATE INDEX idx_topic_proposals_sup_review ON topic_proposals (institution_id, reviewed_by_supervisor_id, status);
CREATE INDEX idx_topic_proposals_parent_fk ON topic_proposals (parent_proposal_id) WHERE parent_proposal_id IS NOT NULL;
CREATE INDEX idx_topic_keywords_gin ON topic_proposals USING GIN (keywords);
CREATE UNIQUE INDEX idx_one_active_supervisor_per_project ON project_supervision_history (institution_id, project_id) WHERE assignment_status = 'ACTIVE';
CREATE INDEX idx_supervision_history_lookup ON project_supervision_history (institution_id, project_id, supervisor_user_id);
CREATE INDEX idx_supervision_history_sup_user ON project_supervision_history (institution_id, supervisor_user_id, assignment_status);
CREATE INDEX idx_supervision_history_rec_fk ON project_supervision_history (institution_id, supervisor_record_id);
CREATE INDEX idx_storage_objects_project ON storage_objects (institution_id, project_id, document_category, created_at DESC);
CREATE INDEX idx_storage_objects_uploader ON storage_objects (institution_id, uploaded_by_user_id);
CREATE UNIQUE INDEX idx_one_final_milestone_per_prog ON programme_milestones (institution_id, programme_id, academic_session_id) WHERE milestone_type = 'FINAL_SUBMISSION';
CREATE INDEX idx_proj_milestone_overdue_scan ON project_milestone_states (effective_deadline_utc, progress_state, is_overdue);
CREATE INDEX idx_proj_milestone_inst_proj_seq ON project_milestone_states (institution_id, project_id, sequence_number);
CREATE INDEX idx_proj_milestone_milestone_fk ON project_milestone_states (institution_id, milestone_id);
CREATE INDEX idx_submission_versions_inst_proj ON submission_versions (institution_id, project_id, milestone_id, version_number DESC);
CREATE INDEX idx_submission_versions_state_fk ON submission_versions (institution_id, project_milestone_state_id);
CREATE INDEX idx_submission_versions_pending_rev ON submission_versions (institution_id, project_id, review_decision)
    WHERE review_decision = 'PENDING';
CREATE INDEX idx_submission_discussions_version ON submission_discussions (institution_id, submission_version_id, created_at ASC);
CREATE INDEX idx_submission_discussions_proj ON submission_discussions (institution_id, project_id);
CREATE INDEX idx_submission_discussions_attach_fk ON submission_discussions (institution_id, annotated_attachment_object_id)
    WHERE annotated_attachment_object_id IS NOT NULL;
CREATE INDEX idx_shared_group_docs_group ON shared_group_documents (institution_id, group_id, status);
CREATE INDEX idx_shared_group_docs_project ON shared_group_documents (institution_id, project_id, status);
CREATE INDEX idx_shared_group_doc_revs_lookup ON shared_group_document_revisions (institution_id, shared_document_id, revision_number DESC);
CREATE INDEX idx_ext_requests_project ON deadline_extension_requests (institution_id, project_id, milestone_id);
CREATE INDEX idx_ext_requests_sup_pending ON deadline_extension_requests (institution_id, supervisor_user_id, status)
    WHERE status = 'PENDING_SUPERVISOR_RECOMMENDATION';
CREATE INDEX idx_ext_requests_coord_pending ON deadline_extension_requests (institution_id, programme_id, academic_session_id, status)
    WHERE status = 'RECOMMENDED_PENDING_COORDINATOR';
CREATE INDEX idx_proj_late_penalties_project ON project_late_penalties (institution_id, project_id);
CREATE UNIQUE INDEX idx_active_examiner_per_project ON examiner_appointments (institution_id, project_id, examiner_user_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_examiner_appt_user_lookup ON examiner_appointments (institution_id, examiner_user_id, status);
CREATE INDEX idx_examiner_appt_panel_fk ON examiner_appointments (institution_id, panel_id) WHERE panel_id IS NOT NULL;
CREATE INDEX idx_defence_schedules_scope_date ON defence_schedules (institution_id, programme_id, academic_session_id, defence_date, start_time_utc);
CREATE INDEX idx_defence_schedules_panel_fk ON defence_schedules (institution_id, panel_id) WHERE panel_id IS NOT NULL;
CREATE INDEX idx_examiner_assessments_project ON examiner_assessments (institution_id, project_id, status);
CREATE INDEX idx_examiner_assessments_examiner ON examiner_assessments (institution_id, examiner_user_id, status);
CREATE INDEX idx_supervisor_assessments_project ON supervisor_assessments (institution_id, project_id, status);
CREATE INDEX idx_supervisor_assessments_supervisor ON supervisor_assessments (institution_id, supervisor_user_id, status);
CREATE INDEX idx_consolidated_results_cohort ON consolidated_student_results (institution_id, programme_id, academic_session_id, is_published);
CREATE INDEX idx_consolidated_results_project ON consolidated_student_results (institution_id, project_id);
CREATE INDEX idx_consolidated_results_student ON consolidated_student_results (institution_id, student_user_id, is_published);
CREATE INDEX idx_outbox_unprocessed ON transactional_outbox_events (created_at ASC) WHERE processed = FALSE;
CREATE INDEX idx_in_app_notif_recipient ON in_app_notifications (recipient_user_id, is_read, created_at DESC);
CREATE INDEX idx_dispatch_jobs_retry ON notification_dispatch_jobs (status, next_retry_at) WHERE status IN ('PENDING', 'RETRY_SCHEDULED');
CREATE INDEX idx_notif_dispatch_recipient ON notification_dispatch_jobs (recipient_user_id, created_at DESC);
CREATE INDEX idx_scheduled_deadline_due ON scheduled_deadline_jobs (scheduled_trigger_utc, status) WHERE status = 'SCHEDULED';
CREATE INDEX idx_scheduled_deadline_proj_lookup ON scheduled_deadline_jobs (institution_id, project_id, milestone_id, status);
CREATE INDEX idx_audit_logs_tenant_time ON audit_logs (institution_id, created_at DESC);
CREATE INDEX idx_audit_logs_programme_scope ON audit_logs (institution_id, programme_id, academic_session_id, created_at DESC);
CREATE INDEX idx_audit_logs_hash_chain_tip ON audit_logs (COALESCE(institution_id, '00000000-0000-0000-0000-000000000000'::UUID), sequence_num DESC);
CREATE INDEX idx_audit_logs_project_time ON audit_logs (institution_id, project_id, created_at DESC) WHERE project_id IS NOT NULL;
CREATE INDEX idx_audit_logs_entity_lookup ON audit_logs (institution_id, target_entity_type, target_entity_id, created_at DESC);
CREATE INDEX idx_backup_logs_status_time ON backup_recovery_logs (status, started_at DESC);
