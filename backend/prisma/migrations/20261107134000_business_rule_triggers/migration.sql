-- =============================================================================
-- CLARIO MVP — BUSINESS RULE & VERSION PRESERVATION TRIGGERS (BR-04, BR-05, BR-11, BR-16, BR-21)
-- Reviewed SQL migration. Statements are taken verbatim from
-- docs/clario_mvp_schema.sql (authoritative physical schema) unless a comment
-- states otherwise. Do not weaken constraints defined there.
-- =============================================================================

-- Trigger 3: Prevent Deletion or File Overwrite of Preserved Submission Versions (BR-11, F-35, F-78)
CREATE OR REPLACE FUNCTION trg_preserve_submission_versions() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'VERSION_PRESERVATION_VIOLATION (BR-11 / DAT-02): Historical submission versions cannot be deleted.';
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.storage_object_id <> OLD.storage_object_id OR NEW.version_number <> OLD.version_number OR NEW.server_receipt_at <> OLD.server_receipt_at THEN
            RAISE EXCEPTION 'VERSION_PRESERVATION_VIOLATION (BR-11 / F-78): Immutable submission version metadata cannot be overwritten.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER preserve_submission_versions_trg
BEFORE UPDATE OR DELETE ON submission_versions
FOR EACH ROW EXECUTE FUNCTION trg_preserve_submission_versions();

-- Trigger 4: Enforce BR-04 & BR-05 (Block Supervisor Assignment Until Topic Proposal Exists)
CREATE OR REPLACE FUNCTION trg_enforce_topic_before_supervisor() RETURNS TRIGGER AS $$
DECLARE
    v_topic_count INT;
BEGIN
    IF NEW.current_supervisor_user_id IS NOT NULL AND (OLD.current_supervisor_user_id IS NULL OR NEW.current_supervisor_user_id <> OLD.current_supervisor_user_id) THEN
        SELECT COUNT(*) INTO v_topic_count
        FROM topic_proposals
        WHERE project_id = NEW.id AND institution_id = NEW.institution_id;

        IF v_topic_count = 0 THEN
            RAISE EXCEPTION 'BUSINESS_RULE_VIOLATION (BR-04 / BR-05): Cannot assign a Project Supervisor before a Topic Proposal has been submitted.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_topic_before_supervisor_trg
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION trg_enforce_topic_before_supervisor();

-- Trigger 5: Enforce BR-16 / F-48 (Supervisors Cannot Examine Projects They Currently or Formerly Supervised)
CREATE OR REPLACE FUNCTION trg_enforce_examiner_independence() RETURNS TRIGGER AS $$
DECLARE
    v_supervised_count INT;
BEGIN
    SELECT COUNT(*) INTO v_supervised_count
    FROM project_supervision_history
    WHERE institution_id = NEW.institution_id
      AND project_id = NEW.project_id
      AND supervisor_user_id = NEW.examiner_user_id;

    IF v_supervised_count > 0 THEN
        RAISE EXCEPTION 'CONFLICT_OF_INTEREST_VIOLATION (BR-16 / F-48): User % is a current or former Supervisor of Project % and cannot be appointed as its Examiner.', NEW.examiner_user_id, NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_examiner_independence_trg
BEFORE INSERT OR UPDATE ON examiner_appointments
FOR EACH ROW EXECUTE FUNCTION trg_enforce_examiner_independence();

-- Trigger 6: Enforce BR-21 & BR-NEW-03 / PROP-03 (Post-Approval Assessment Edit Safeguard & Post-Publication Lock)
-- Optimized: Avoids exclusive row locking on parent project during routine DRAFT autosaves
CREATE OR REPLACE FUNCTION trg_handle_post_approval_assessment_edit() RETURNS TRIGGER AS $$
DECLARE
    v_proj_status result_approval_status_enum;
BEGIN
    IF OLD.status IN ('PENDING', 'DRAFT') AND NEW.status IN ('PENDING', 'DRAFT') THEN
        SELECT result_approval_status INTO v_proj_status
        FROM projects
        WHERE id = NEW.project_id AND institution_id = NEW.institution_id;

        IF v_proj_status = 'PUBLISHED' THEN
            RAISE EXCEPTION 'PUBLICATION_LOCK_VIOLATION (BR-21): Assessments cannot be modified after publication.';
        END IF;
        RETURN NEW;
    END IF;

    SELECT result_approval_status INTO v_proj_status
    FROM projects
    WHERE id = NEW.project_id AND institution_id = NEW.institution_id
    FOR NO KEY UPDATE;

    IF v_proj_status = 'PUBLISHED' AND (OLD.status = 'PUBLISHED_LOCKED' OR NEW.status <> 'PUBLISHED_LOCKED') THEN
        RAISE EXCEPTION 'PUBLICATION_LOCK_VIOLATION (BR-21): Assessments cannot be modified after the project result has been published.';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'SUBMITTED' AND v_proj_status = 'APPROVED_READY_FOR_PUBLICATION' THEN
        IF NEW.edit_reason IS NULL OR char_length(NEW.edit_reason) < 10 THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: Editing a submitted assessment requires a mandatory edit_reason (min 10 chars).';
        END IF;

        UPDATE projects
        SET result_approval_status = 'PENDING_COORDINATOR_REAPPROVAL',
            updated_at = NOW()
        WHERE id = NEW.project_id AND institution_id = NEW.institution_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER examiner_assessment_post_approval_safeguard
BEFORE UPDATE ON examiner_assessments
FOR EACH ROW EXECUTE FUNCTION trg_handle_post_approval_assessment_edit();

CREATE TRIGGER supervisor_assessment_post_approval_safeguard
BEFORE UPDATE ON supervisor_assessments
FOR EACH ROW EXECUTE FUNCTION trg_handle_post_approval_assessment_edit();
