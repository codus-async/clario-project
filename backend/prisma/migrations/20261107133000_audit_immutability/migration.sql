-- =============================================================================
-- CLARIO MVP — TAMPER-RESISTANT AUDIT LOG IMMUTABILITY (F-82, FR-282)
-- Reviewed SQL migration. Statements are taken verbatim from
-- docs/clario_mvp_schema.sql (authoritative physical schema) unless a comment
-- states otherwise. Do not weaken constraints defined there.
-- =============================================================================

-- 9. BUSINESS RULE & IMMUTABILITY TRIGGERS
-- -----------------------------------------------------------------------------

-- Trigger 1: Prevent Modification or Deletion of Append-Only Audit Logs (F-82, FR-282)
CREATE OR REPLACE FUNCTION trg_enforce_audit_immutability() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        RAISE EXCEPTION 'TAMPER_PROTECTION_VIOLATION: Audit log records in F-82 are strictly immutable and cannot be updated or deleted.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_audit_log_immutability
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION trg_enforce_audit_immutability();

-- Trigger 2: Compute Concurrency-Safe Per-Tenant Cryptographic SHA-256 Hash Chain on Audit Log Insert (F-82)
CREATE OR REPLACE FUNCTION trg_compute_audit_hash_chain() RETURNS TRIGGER AS $$
DECLARE
    v_prev_hash CHAR(64);
    v_tenant_scope UUID := COALESCE(NEW.institution_id, '00000000-0000-0000-0000-000000000000'::UUID);
BEGIN
    -- Acquire transaction-scoped advisory lock per tenant to prevent hash chain forks under concurrency
    PERFORM pg_advisory_xact_lock(hashtextextended(v_tenant_scope::TEXT, 2026));

    SELECT row_integrity_hash INTO v_prev_hash
    FROM audit_logs
    WHERE COALESCE(institution_id, '00000000-0000-0000-0000-000000000000'::UUID) = v_tenant_scope
    ORDER BY sequence_num DESC
    LIMIT 1;

    NEW.previous_row_hash := COALESCE(v_prev_hash, repeat('0', 64));
    NEW.row_integrity_hash := encode(
        digest(
            NEW.previous_row_hash || '|' ||
            v_tenant_scope::TEXT || '|' ||
            COALESCE(NEW.actor_user_id::TEXT, 'SYSTEM') || '|' ||
            NEW.action_code || '|' ||
            COALESCE(NEW.previous_state_jsonb::TEXT, '') || '|' ||
            COALESCE(NEW.resulting_state_jsonb::TEXT, '') || '|' ||
            NEW.created_at::TEXT,
            'sha256'
        ),
        'hex'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_audit_hash_before_insert
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION trg_compute_audit_hash_chain();
