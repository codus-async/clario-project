-- =============================================================================
-- CLARIO MVP — CORE SCHEMA: UTILITY FUNCTIONS, ENUMERATED TYPES, TABLES & CONSTRAINTS
-- Reviewed SQL migration. Statements are taken verbatim from
-- docs/clario_mvp_schema.sql (authoritative physical schema) unless a comment
-- states otherwise. Do not weaken constraints defined there.
-- =============================================================================

-- UUIDv7 Generator Function for Sequential, Non-Fragmenting Primary Keys
CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS UUID AS $$
DECLARE
    v_time BIGINT;
    v_bytes BYTEA;
BEGIN
    v_time := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    v_bytes := gen_random_bytes(16);
    -- Set 48-bit timestamp
    v_bytes := set_byte(v_bytes, 0, ((v_time >> 40) & 255)::INT);
    v_bytes := set_byte(v_bytes, 1, ((v_time >> 32) & 255)::INT);
    v_bytes := set_byte(v_bytes, 2, ((v_time >> 24) & 255)::INT);
    v_bytes := set_byte(v_bytes, 3, ((v_time >> 16) & 255)::INT);
    v_bytes := set_byte(v_bytes, 4, ((v_time >> 8) & 255)::INT);
    v_bytes := set_byte(v_bytes, 5, (v_time & 255)::INT);
    -- Set version 7 (0111) and RFC 4122 variant (10)
    v_bytes := set_byte(v_bytes, 6, (get_byte(v_bytes, 6) & 15) | 112);
    v_bytes := set_byte(v_bytes, 8, (get_byte(v_bytes, 8) & 63) | 128);
    RETURN encode(v_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE PARALLEL SAFE;

-- Helper functions to read session-bound context variables set by PEP middleware
CREATE OR REPLACE FUNCTION current_app_institution_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_institution_id', TRUE), '')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_platform_admin_context() RETURNS BOOLEAN AS $$
    SELECT COALESCE(current_setting('app.is_platform_admin', TRUE), 'false') = 'true';
$$ LANGUAGE SQL STABLE;
-- -----------------------------------------------------------------------------
-- 1. ENUMERATED TYPES (DOMAIN INVARIANTS)
-- -----------------------------------------------------------------------------
CREATE TYPE tenant_status_enum AS ENUM (
    'PENDING_ACTIVATION',
    'ACTIVE',
    'SUSPENDED',
    'PENDING_TERMINATION',
    'TERMINATED'
);

CREATE TYPE plan_billing_interval_enum AS ENUM (
    'ANNUAL',
    'SEMESTER_SESSION',
    'MONTHLY'
);

CREATE TYPE plan_status_enum AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ARCHIVED'
);

CREATE TYPE subscription_status_enum AS ENUM (
    'PENDING_PAYMENT',
    'ACTIVE',
    'GRACE_PERIOD',
    'EXPIRED',
    'CANCELLED'
);

CREATE TYPE payment_tx_status_enum AS ENUM (
    'INITIATED',
    'PENDING_VERIFICATION',
    'SUCCEEDED',
    'FAILED',
    'ABANDONED',
    'DISCREPANCY_REQUIRES_RECONCILIATION'
);

CREATE TYPE webhook_processing_status_enum AS ENUM (
    'RECEIVED',
    'PROCESSED',
    'DUPLICATE_IGNORED',
    'REJECTED_INVALID_SIGNATURE',
    'FAILED'
);

CREATE TYPE academic_entity_status_enum AS ENUM (
    'ACTIVE',
    'ARCHIVED'
);

CREATE TYPE academic_session_status_enum AS ENUM (
    'UPCOMING',
    'ACTIVE',
    'CLOSED'
);

CREATE TYPE user_account_status_enum AS ENUM (
    'INVITED',
    'ACTIVE',
    'DEACTIVATED'
);

CREATE TYPE guardian_consent_status_enum AS ENUM (
    'NOT_REQUIRED_ADULT',
    'NOT_REQUIRED_STATUTORY_EDUCATIONAL_BASIS',
    'PENDING_VERIFICATION',
    'VERIFIED'
);

CREATE TYPE role_code_enum AS ENUM (
    'PLATFORM_ADMIN',
    'INSTITUTIONAL_ADMIN',
    'PROJECT_COORDINATOR',
    'PROJECT_SUPERVISOR',
    'PROJECT_EXAMINER',
    'STUDENT'
);

CREATE TYPE supervisor_eligibility_enum AS ENUM (
    'AVAILABLE',
    'UNAVAILABLE_ON_LEAVE',
    'INACTIVE'
);

CREATE TYPE student_cohort_status_enum AS ENUM (
    'REGISTERED_AWAITING_TOPIC',
    'TOPIC_PROPOSED',
    'ALLOCATED',
    'COMPLETED',
    'FAILED_INCOMPLETE'
);

CREATE TYPE project_arrangement_enum AS ENUM (
    'UNASSIGNED',
    'INDIVIDUAL',
    'GROUP'
);

CREATE TYPE project_type_enum AS ENUM (
    'INDIVIDUAL',
    'GROUP'
);

CREATE TYPE project_lifecycle_status_enum AS ENUM (
    'TOPIC_PROPOSAL',
    'ACTIVE_SUPERVISION',
    'FINAL_SUBMITTED',
    'UNDER_EXAMINATION',
    'RESULTS_APPROVED',
    'RESULTS_PUBLISHED',
    'COMPLETED'
);

CREATE TYPE topic_proposal_status_enum AS ENUM (
    'SUBMITTED_AWAITING_SUPERVISOR',
    'UNDER_SUPERVISOR_REVIEW',
    'APPROVED',
    'REJECTED',
    'ALTERNATIVE_SUGGESTED',
    'SUPERSEDED'
);

CREATE TYPE supervision_assignment_status_enum AS ENUM (
    'ACTIVE',
    'REASSIGNED_HISTORICAL'
);

CREATE TYPE milestone_type_enum AS ENUM (
    'INTERIM',
    'FINAL_SUBMISSION'
);

CREATE TYPE project_milestone_state_enum AS ENUM (
    'LOCKED',
    'IN_PROGRESS_NOT_SUBMITTED',
    'SUBMITTED_AWAITING_REVIEW',
    'REVISIONS_REQUESTED',
    'REJECTED',
    'APPROVED'
);

CREATE TYPE review_decision_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REVISIONS_REQUESTED',
    'REJECTED'
);

CREATE TYPE discussion_entry_type_enum AS ENUM (
    'FORMAL_REVIEW_FEEDBACK',
    'DISCUSSION_COMMENT'
);

CREATE TYPE extension_request_status_enum AS ENUM (
    'PENDING_SUPERVISOR_RECOMMENDATION',
    'RECOMMENDED_PENDING_COORDINATOR',
    'DECLINED_BY_SUPERVISOR',
    'APPROVED',
    'REJECTED_BY_COORDINATOR'
);

CREATE TYPE late_penalty_mode_enum AS ENUM (
    'DISABLED_ADVISORY_ONLY',
    'FLAT_MARKS_PER_DAY',
    'PERCENTAGE_PER_DAY',
    'FIXED_FLAT_DEDUCTION'
);

CREATE TYPE examiner_appointment_status_enum AS ENUM (
    'ACTIVE',
    'REMOVED'
);

CREATE TYPE defence_schedule_status_enum AS ENUM (
    'SCHEDULED',
    'RESCHEDULED',
    'COMPLETED'
);

CREATE TYPE consolidation_method_enum AS ENUM (
    'ARITHMETIC_MEAN',
    'WEIGHTED_PANEL',
    'COORDINATOR_RESOLVED'
);

CREATE TYPE rounding_mode_enum AS ENUM (
    'ROUND_HALF_UP_2DP',
    'ROUND_HALF_UP_INTEGER',
    'NONE_EXACT'
);

CREATE TYPE assessment_submission_status_enum AS ENUM (
    'PENDING',
    'DRAFT',
    'SUBMITTED',
    'PUBLISHED_LOCKED'
);

CREATE TYPE result_approval_status_enum AS ENUM (
    'INCOMPLETE_ASSESSMENTS',
    'CONSOLIDATED_PENDING_APPROVAL',
    'APPROVED_READY_FOR_PUBLICATION',
    'PENDING_COORDINATOR_REAPPROVAL',
    'PUBLISHED'
);

CREATE TYPE academic_outcome_enum AS ENUM (
    'PASS',
    'FAIL'
);

CREATE TYPE document_category_enum AS ENUM (
    'MILESTONE_SUBMISSION',
    'FINAL_PROJECT_SUBMISSION',
    'SHARED_GROUP_WORKING_DOC',
    'SUPERVISOR_FEEDBACK_ATTACHMENT',
    'EXTENSION_EVIDENCE'
);

CREATE TYPE malware_scan_status_enum AS ENUM (
    'PENDING_SCAN',
    'CLEAN',
    'REJECTED_INFECTED'
);

CREATE TYPE notification_channel_enum AS ENUM (
    'IN_APP',
    'EMAIL'
);

CREATE TYPE dispatch_status_enum AS ENUM (
    'PENDING',
    'PROCESSING',
    'DELIVERED',
    'RETRY_SCHEDULED',
    'FAILED_DEAD_LETTER'
);

-- -----------------------------------------------------------------------------
-- 2. MODULE A & L: PLATFORM ADMINISTRATION, TENANTS & SUBSCRIPTION BILLING
-- -----------------------------------------------------------------------------

-- F-01: Institutional Account Management
CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name VARCHAR(150) NOT NULL,
    code_slug CITEXT NOT NULL UNIQUE CHECK (char_length(code_slug) BETWEEN 2 AND 20),
    country VARCHAR(60) NOT NULL DEFAULT 'Nigeria',
    timezone_iana VARCHAR(64) NOT NULL DEFAULT 'Africa/Lagos',
    primary_contact_name VARCHAR(120) NOT NULL,
    primary_contact_email CITEXT NOT NULL,
    primary_contact_phone VARCHAR(30),
    account_status tenant_status_enum NOT NULL DEFAULT 'PENDING_ACTIVATION',
    status_change_reason VARCHAR(500),
    termination_initiated_at TIMESTAMPTZ,
    termination_recovery_days INT NOT NULL DEFAULT 90 CHECK (termination_recovery_days >= 0),
    created_by_actor_id UUID,
    updated_by_actor_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- F-02: Subscription Plan Management (NGN minor units / kobo)
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    plan_code CITEXT NOT NULL UNIQUE CHECK (char_length(plan_code) BETWEEN 2 AND 30),
    plan_name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    currency CHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
    price_kobo BIGINT NOT NULL CHECK (price_kobo >= 0),
    billing_interval plan_billing_interval_enum NOT NULL,
    billing_duration_days INT NOT NULL CHECK (billing_duration_days > 0),
    max_user_capacity INT NOT NULL CHECK (max_user_capacity BETWEEN 1 AND 5000),
    status plan_status_enum NOT NULL DEFAULT 'DRAFT',
    created_by_actor_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- F-04: Platform-Wide Subscription Grace Period & Permission Matrix Policy (OD-06)
CREATE TABLE platform_subscription_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    default_grace_period_days INT NOT NULL DEFAULT 14 CHECK (default_grace_period_days BETWEEN 0 AND 90),
    grace_period_permissions_jsonb JSONB NOT NULL DEFAULT '{"allow_academic_writes": true, "show_warning_banner": true}'::JSONB,
    expired_permissions_jsonb JSONB NOT NULL DEFAULT '{"allow_academic_writes": false, "allow_academic_reads": true, "allow_billing_portal": true}'::JSONB,
    updated_by_actor_id UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO platform_subscription_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- F-03, F-04, F-70: Institutional Subscriptions & Billing Profile
CREATE TABLE institutional_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL UNIQUE REFERENCES institutions(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    contracted_price_kobo BIGINT NOT NULL CHECK (contracted_price_kobo >= 0),
    contracted_max_users INT NOT NULL CHECK (contracted_max_users BETWEEN 1 AND 5000),
    subscription_status subscription_status_enum NOT NULL DEFAULT 'PENDING_PAYMENT',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    override_grace_period_days INT CHECK (override_grace_period_days BETWEEN 0 AND 90),
    override_justification VARCHAR(300),
    grace_period_end TIMESTAMPTZ,
    billing_legal_name VARCHAR(200) NOT NULL,
    billing_email CITEXT NOT NULL,
    billing_address TEXT,
    tax_rc_number VARCHAR(60),
    billing_contact_phone VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- F-67: Institutional Subscription Payment Processing (NGN kobo + Idempotency)
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    subscription_id UUID NOT NULL REFERENCES institutional_subscriptions(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    idempotency_reference VARCHAR(100) NOT NULL UNIQUE,
    currency CHAR(3) NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
    expected_amount_kobo BIGINT NOT NULL CHECK (expected_amount_kobo > 0),
    paid_amount_kobo BIGINT CHECK (paid_amount_kobo >= 0),
    gateway_provider VARCHAR(40) NOT NULL DEFAULT 'PAYSTACK_OR_CONFIGURED_PROVIDER',
    gateway_checkout_session_id VARCHAR(120),
    status payment_tx_status_enum NOT NULL DEFAULT 'INITIATED',
    initiated_by_user_id UUID NOT NULL,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    failure_reason TEXT
);

-- F-68: Payment Event Reception (Idempotent Webhook Log)
CREATE TABLE payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    gateway_event_id VARCHAR(120) NOT NULL UNIQUE,
    idempotency_reference VARCHAR(100) REFERENCES payment_transactions(idempotency_reference) ON DELETE RESTRICT,
    event_type VARCHAR(80) NOT NULL,
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    processing_status webhook_processing_status_enum NOT NULL DEFAULT 'RECEIVED',
    raw_payload_sha256 CHAR(64) NOT NULL,
    raw_payload_jsonb JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT
);

-- -----------------------------------------------------------------------------
-- 3. MODULE B & K: ACADEMIC HIERARCHY, USERS, ROLES, SESSIONS & MFA
-- -----------------------------------------------------------------------------

-- F-09: Faculty Management
CREATE TABLE faculties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    code CITEXT NOT NULL CHECK (char_length(code) BETWEEN 2 AND 20),
    description TEXT,
    status academic_entity_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, code),
    UNIQUE (institution_id, id)
);

-- F-10: Department Management
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    faculty_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    code CITEXT NOT NULL CHECK (char_length(code) BETWEEN 2 AND 20),
    description TEXT,
    status academic_entity_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, code),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, faculty_id) REFERENCES faculties(institution_id, id) ON DELETE RESTRICT
);

-- F-11: Programme Management
CREATE TABLE programmes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    faculty_id UUID NOT NULL,
    department_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    code CITEXT NOT NULL CHECK (char_length(code) BETWEEN 2 AND 25),
    degree_award_title VARCHAR(40),
    project_guidelines_markdown TEXT,
    status academic_entity_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, code),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, faculty_id) REFERENCES faculties(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, department_id) REFERENCES departments(institution_id, id) ON DELETE RESTRICT
);

-- F-12: Academic Session Management
CREATE TABLE academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    session_label VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    status academic_session_status_enum NOT NULL DEFAULT 'UPCOMING',
    closed_at TIMESTAMPTZ,
    closed_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, session_label),
    UNIQUE (institution_id, id)
);

-- F-05, F-13, F-64: Users (Platform Admins & Institutional Users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID REFERENCES institutions(id) ON DELETE RESTRICT, -- NULL strictly for Platform Admins
    is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
    full_name VARCHAR(120) NOT NULL,
    email CITEXT NOT NULL,
    institutional_id_number CITEXT, -- Staff ID or Matriculation Number
    primary_department_id UUID,
    account_status user_account_status_enum NOT NULL DEFAULT 'INVITED',
    is_under_18 BOOLEAN NOT NULL DEFAULT FALSE,
    guardian_name VARCHAR(120),
    guardian_email CITEXT,
    guardian_consent_status guardian_consent_status_enum NOT NULL DEFAULT 'NOT_REQUIRED_ADULT',
    password_hash TEXT,
    mfa_required BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret_encrypted TEXT,
    mfa_recovery_codes_hash JSONB,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    invitation_token_hash CHAR(64),
    invitation_expires_at TIMESTAMPTZ,
    password_reset_token_hash CHAR(64),
    password_reset_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_platform_vs_tenant_user CHECK (
        (is_platform_admin = TRUE AND institution_id IS NULL AND mfa_required = TRUE) OR
        (is_platform_admin = FALSE AND institution_id IS NOT NULL AND institutional_id_number IS NOT NULL)
    ),
    UNIQUE (institution_id, id)
);

-- F-14: Institutional Role Assignments
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    role_code role_code_enum NOT NULL CHECK (role_code <> 'PLATFORM_ADMIN'),
    status academic_entity_status_enum NOT NULL DEFAULT 'ACTIVE',
    assigned_by_user_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    UNIQUE (institution_id, user_id, role_code),
    FOREIGN KEY (institution_id, user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
);

-- F-15: Project Coordinator Appointments (BR-03: Strictly 1 Programme + 1 Session per Appointment)
CREATE TABLE coordinator_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    status academic_entity_status_enum NOT NULL DEFAULT 'ACTIVE',
    appointed_by_user_id UUID NOT NULL,
    appointed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revocation_reason VARCHAR(500),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, programme_id) REFERENCES programmes(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, academic_session_id) REFERENCES academic_sessions(institution_id, id) ON DELETE RESTRICT
);

-- F-16: Supervisor Eligibility Records
CREATE TABLE supervisor_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    primary_department_id UUID NOT NULL,
    academic_title VARCHAR(30) NOT NULL,
    specialization_tags TEXT[] NOT NULL DEFAULT '{}',
    eligibility_status supervisor_eligibility_enum NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, user_id),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, primary_department_id) REFERENCES departments(institution_id, id) ON DELETE RESTRICT
);

-- F-65: Stateful Server Sessions (Supports Immediate Revocation & Role-Based Inactivity Timeouts)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    active_role role_code_enum NOT NULL,
    active_coordinator_appointment_id UUID,
    mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    inactivity_timeout_minutes INT NOT NULL DEFAULT 30,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_reason VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) WITH (fillfactor = 80);

-- -----------------------------------------------------------------------------
-- 4. MODULE C & D: PROJECTS, GROUPS, COHORT REGISTRATION, TOPICS & SUPERVISION
-- -----------------------------------------------------------------------------

-- F-21: Projects (Anchor Entity for Both Individual & Group Projects)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    project_type project_type_enum NOT NULL,
    approved_topic_title VARCHAR(300),
    current_supervisor_user_id UUID,
    required_examiner_panel_size INT NOT NULL DEFAULT 1 CHECK (required_examiner_panel_size >= 1),
    lifecycle_status project_lifecycle_status_enum NOT NULL DEFAULT 'TOPIC_PROPOSAL',
    result_approval_status result_approval_status_enum NOT NULL DEFAULT 'INCOMPLETE_ASSESSMENTS',
    approved_by_coordinator_id UUID,
    approved_at TIMESTAMPTZ,
    published_by_coordinator_id UUID,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, programme_id) REFERENCES programmes(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, academic_session_id) REFERENCES academic_sessions(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, current_supervisor_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
) WITH (fillfactor = 85);

-- F-22: Project Groups
CREATE TABLE project_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    project_id UUID NOT NULL UNIQUE,
    group_code VARCHAR(100) NOT NULL,
    created_by_coordinator_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, programme_id, academic_session_id, group_code),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, programme_id) REFERENCES programmes(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, academic_session_id) REFERENCES academic_sessions(institution_id, id) ON DELETE RESTRICT
);

-- F-19: Student Project Registration (Scoped per Programme + Session for OD-03 Carry-Forward Compatibility)
CREATE TABLE student_project_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    student_user_id UUID NOT NULL,
    matriculation_number CITEXT NOT NULL,
    cohort_status student_cohort_status_enum NOT NULL DEFAULT 'REGISTERED_AWAITING_TOPIC',
    arrangement_type project_arrangement_enum NOT NULL DEFAULT 'UNASSIGNED',
    project_id UUID,
    group_id UUID,
    registered_by_coordinator_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, programme_id, academic_session_id, student_user_id),
    UNIQUE (institution_id, programme_id, academic_session_id, matriculation_number),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, student_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, programme_id) REFERENCES programmes(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, academic_session_id) REFERENCES academic_sessions(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, group_id) REFERENCES project_groups(institution_id, id) ON DELETE RESTRICT
);

-- F-22 & F-23: Project Group Members & Designated Submission Authority (BR-08)
CREATE TABLE project_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    group_id UUID NOT NULL,
    project_id UUID NOT NULL,
    student_registration_id UUID NOT NULL UNIQUE,
    student_user_id UUID NOT NULL,
    is_designated_submitter BOOLEAN NOT NULL DEFAULT FALSE,
    member_status academic_entity_status_enum NOT NULL DEFAULT 'ACTIVE',
    designated_by_coordinator_id UUID NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, student_user_id),
    FOREIGN KEY (institution_id, group_id) REFERENCES project_groups(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, student_registration_id) REFERENCES student_project_registrations(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, student_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
);

-- F-20: Project Topic Proposals & Review Management (BR-04, BR-05)
CREATE TABLE topic_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    project_id UUID NOT NULL,
    parent_proposal_id UUID REFERENCES topic_proposals(id) ON DELETE RESTRICT,
    iteration_number INT NOT NULL DEFAULT 1 CHECK (iteration_number >= 1),
    proposed_title VARCHAR(300) NOT NULL CHECK (char_length(proposed_title) >= 10),
    problem_statement TEXT NOT NULL CHECK (char_length(problem_statement) BETWEEN 50 AND 3000),
    objectives TEXT NOT NULL CHECK (char_length(objectives) BETWEEN 20 AND 2000),
    methodology TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    submitted_by_user_id UUID NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status topic_proposal_status_enum NOT NULL DEFAULT 'SUBMITTED_AWAITING_SUPERVISOR',
    reviewed_by_supervisor_id UUID,
    reviewed_at TIMESTAMPTZ,
    supervisor_feedback TEXT,
    alternative_topic_title VARCHAR(300),
    alternative_topic_description TEXT,
    alternative_topic_rationale TEXT,
    CONSTRAINT chk_rejection_requires_feedback CHECK (
        status <> 'REJECTED' OR (supervisor_feedback IS NOT NULL AND char_length(supervisor_feedback) >= 20)
    ),
    CONSTRAINT chk_alternative_requires_details CHECK (
        status <> 'ALTERNATIVE_SUGGESTED' OR (alternative_topic_title IS NOT NULL AND alternative_topic_rationale IS NOT NULL)
    ),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, submitted_by_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
);

-- F-24 & F-27: Project Supervision Assignment & Reassignment History (Enforces BR-16 Examiner Independence)
CREATE TABLE project_supervision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    project_id UUID NOT NULL,
    supervisor_user_id UUID NOT NULL,
    supervisor_record_id UUID NOT NULL,
    assignment_status supervision_assignment_status_enum NOT NULL DEFAULT 'ACTIVE',
    assigned_by_coordinator_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    ended_by_coordinator_id UUID,
    reassignment_reason VARCHAR(500),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, supervisor_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, supervisor_record_id) REFERENCES supervisor_records(institution_id, id) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- 5. MODULE N: SECURE DOCUMENT STORAGE & IMMUTABLE VERSION PRESERVATION
-- -----------------------------------------------------------------------------

-- F-76 & F-78: Private Encrypted Storage Objects (Max 50MB, Magic-Byte Validated)
CREATE TABLE storage_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL,
    uploaded_by_user_id UUID NOT NULL,
    document_category document_category_enum NOT NULL,
    storage_bucket VARCHAR(100) NOT NULL,
    storage_object_key VARCHAR(512) NOT NULL UNIQUE,
    sanitized_file_name VARCHAR(255) NOT NULL,
    validated_extension VARCHAR(10) NOT NULL CHECK (validated_extension IN ('pdf', 'doc', 'docx', 'ppt', 'pptx')),
    validated_mime_type VARCHAR(120) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800), -- Max 50 MB
    sha256_checksum CHAR(64) NOT NULL,
    malware_scan_status malware_scan_status_enum NOT NULL DEFAULT 'CLEAN' CHECK (malware_scan_status = 'CLEAN'),
    encryption_key_ref VARCHAR(120) NOT NULL,
    upload_idempotency_token VARCHAR(120) NOT NULL UNIQUE,
    is_immutable_formal_version BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, uploaded_by_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- 6. MODULE E, F & G: MILESTONES, SUBMISSIONS, VERSIONS, GROUP DOCS & DEADLINES
-- -----------------------------------------------------------------------------

-- F-29 & F-30: Programme Milestone & Deadline Configuration
CREATE TABLE programme_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    sequence_number INT NOT NULL CHECK (sequence_number >= 1),
    title VARCHAR(150) NOT NULL,
    milestone_type milestone_type_enum NOT NULL DEFAULT 'INTERIM',
    description_and_requirements TEXT NOT NULL,
    permitted_extensions TEXT[] NOT NULL DEFAULT ARRAY['pdf', 'doc', 'docx', 'ppt', 'pptx'],
    programme_deadline_utc TIMESTAMPTZ NOT NULL,
    created_by_coordinator_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, programme_id, academic_session_id, sequence_number),
    UNIQUE (institution_id, programme_id, academic_session_id, title),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, programme_id) REFERENCES programmes(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, academic_session_id) REFERENCES academic_sessions(institution_id, id) ON DELETE RESTRICT
);

-- F-30, F-31, F-41: Per-Project Milestone State & Effective Deadline Tracking
CREATE TABLE project_milestone_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL,
    milestone_id UUID NOT NULL,
    sequence_number INT NOT NULL,
    progress_state project_milestone_state_enum NOT NULL DEFAULT 'LOCKED',
    effective_deadline_utc TIMESTAMPTZ NOT NULL,
    is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
    overdue_detected_at TIMESTAMPTZ,
    latest_version_number INT NOT NULL DEFAULT 0,
    approved_version_id UUID,
    approved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, milestone_id),
    UNIQUE (project_id, sequence_number),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, milestone_id) REFERENCES programme_milestones(institution_id, id) ON DELETE RESTRICT
) WITH (fillfactor = 80);

-- F-32, F-33, F-35, F-43, F-78: Formal Milestone & Final Submission Versions (Append-Only Version Preservation)
CREATE TABLE submission_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL,
    milestone_id UUID NOT NULL,
    project_milestone_state_id UUID NOT NULL,
    version_number INT NOT NULL CHECK (version_number >= 1),
    parent_version_id UUID REFERENCES submission_versions(id) ON DELETE RESTRICT,
    storage_object_id UUID NOT NULL UNIQUE,
    submitted_by_user_id UUID NOT NULL,
    submission_notes TEXT,
    revision_summary_note TEXT,
    server_receipt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_deadline_at_receipt TIMESTAMPTZ NOT NULL,
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    late_duration_minutes INT NOT NULL DEFAULT 0 CHECK (late_duration_minutes >= 0),
    late_duration_days_ceil INT NOT NULL DEFAULT 0 CHECK (late_duration_days_ceil >= 0),
    review_decision review_decision_enum NOT NULL DEFAULT 'PENDING',
    reviewed_by_supervisor_id UUID,
    reviewed_at TIMESTAMPTZ,
    idempotency_upload_token VARCHAR(120) NOT NULL UNIQUE,
    CONSTRAINT chk_resubmission_requires_summary CHECK (
        version_number = 1 OR (revision_summary_note IS NOT NULL AND char_length(revision_summary_note) >= 10)
    ),
    UNIQUE (project_id, milestone_id, version_number),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, milestone_id) REFERENCES programme_milestones(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, project_milestone_state_id) REFERENCES project_milestone_states(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, storage_object_id) REFERENCES storage_objects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, submitted_by_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
);

-- F-34: Submission Feedback & Contextual Discussions (BR-27: Strictly Bound to Submission Version ID)
CREATE TABLE submission_discussions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL,
    submission_version_id UUID NOT NULL,
    author_user_id UUID NOT NULL,
    author_role role_code_enum NOT NULL CHECK (author_role IN ('PROJECT_SUPERVISOR', 'STUDENT')),
    entry_type discussion_entry_type_enum NOT NULL,
    comment_body TEXT NOT NULL CHECK (char_length(comment_body) BETWEEN 1 AND 5000),
    annotated_attachment_object_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, submission_version_id) REFERENCES submission_versions(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, author_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, annotated_attachment_object_id) REFERENCES storage_objects(institution_id, id) ON DELETE RESTRICT
);

-- F-37: Shared Group Working Documents & Revisions
CREATE TABLE shared_group_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    group_id UUID NOT NULL,
    project_id UUID NOT NULL,
    document_title VARCHAR(150) NOT NULL,
    target_milestone_id UUID,
    current_revision_number INT NOT NULL DEFAULT 1 CHECK (current_revision_number >= 1),
    latest_storage_object_id UUID NOT NULL,
    last_uploaded_by_user_id UUID NOT NULL,
    status academic_entity_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, group_id) REFERENCES project_groups(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, latest_storage_object_id) REFERENCES storage_objects(institution_id, id) ON DELETE RESTRICT
);

CREATE TABLE shared_group_document_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    shared_document_id UUID NOT NULL,
    revision_number INT NOT NULL CHECK (revision_number >= 1),
    storage_object_id UUID NOT NULL UNIQUE,
    uploaded_by_user_id UUID NOT NULL,
    revision_notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shared_document_id, revision_number),
    FOREIGN KEY (institution_id, shared_document_id) REFERENCES shared_group_documents(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, storage_object_id) REFERENCES storage_objects(institution_id, id) ON DELETE RESTRICT
);

-- F-42: Two-Tier Deadline Extension Requests (BR-15: Student -> Supervisor Recommends -> Coordinator Approves)
CREATE TABLE deadline_extension_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    project_id UUID NOT NULL,
    milestone_id UUID NOT NULL,
    original_effective_deadline_utc TIMESTAMPTZ NOT NULL,
    requested_new_deadline_utc TIMESTAMPTZ NOT NULL CHECK (requested_new_deadline_utc > original_effective_deadline_utc),
    student_reason TEXT NOT NULL CHECK (char_length(student_reason) BETWEEN 10 AND 2000),
    supporting_evidence_object_id UUID,
    requested_by_user_id UUID NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status extension_request_status_enum NOT NULL DEFAULT 'PENDING_SUPERVISOR_RECOMMENDATION',
    supervisor_user_id UUID,
    supervisor_recommended_deadline_utc TIMESTAMPTZ,
    supervisor_comments TEXT,
    supervisor_decided_at TIMESTAMPTZ,
    coordinator_user_id UUID,
    approved_extended_deadline_utc TIMESTAMPTZ,
    coordinator_comments TEXT,
    coordinator_decided_at TIMESTAMPTZ,
    CONSTRAINT chk_coord_approval_requires_sup_rec CHECK (
        status <> 'APPROVED' OR (supervisor_user_id IS NOT NULL AND supervisor_decided_at IS NOT NULL AND approved_extended_deadline_utc IS NOT NULL)
    ),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, milestone_id) REFERENCES programme_milestones(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, supporting_evidence_object_id) REFERENCES storage_objects(institution_id, id) ON DELETE RESTRICT
);

-- F-44: Programme Late Submission Penalty Policy & Project Penalty Records (BR-14, OD-05)
CREATE TABLE late_penalty_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    penalties_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    grace_buffer_minutes INT NOT NULL DEFAULT 0 CHECK (grace_buffer_minutes >= 0),
    calculation_mode late_penalty_mode_enum NOT NULL DEFAULT 'DISABLED_ADVISORY_ONLY',
    penalty_rate_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0.0000 CHECK (penalty_rate_per_unit >= 0),
    max_penalty_cap NUMERIC(10,4) NOT NULL DEFAULT 0.0000 CHECK (max_penalty_cap >= 0),
    updated_by_coordinator_id UUID NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, programme_id, academic_session_id),
    FOREIGN KEY (institution_id, programme_id) REFERENCES programmes(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, academic_session_id) REFERENCES academic_sessions(institution_id, id) ON DELETE RESTRICT
);

CREATE TABLE project_late_penalties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL,
    submission_version_id UUID NOT NULL UNIQUE,
    late_duration_minutes INT NOT NULL CHECK (late_duration_minutes > 0),
    calculated_penalty_marks NUMERIC(10,4) NOT NULL DEFAULT 0.0000 CHECK (calculated_penalty_marks >= 0),
    is_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    overridden_penalty_marks NUMERIC(10,4) CHECK (overridden_penalty_marks >= 0),
    effective_penalty_marks NUMERIC(10,4) NOT NULL DEFAULT 0.0000 CHECK (effective_penalty_marks >= 0),
    override_reason VARCHAR(1000),
    overridden_by_coordinator_id UUID,
    overridden_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_override_requires_reason CHECK (
        is_overridden = FALSE OR (override_reason IS NOT NULL AND char_length(override_reason) >= 10 AND overridden_penalty_marks IS NOT NULL)
    ),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, submission_version_id) REFERENCES submission_versions(institution_id, id) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- 7. MODULE H, I & J: EXAMINATION, GRADING, CONSOLIDATION & ATOMIC PUBLICATION
-- -----------------------------------------------------------------------------

-- F-51: Programme Assessment Structure Configuration (BR-18 Default 30 Marks Supervisor)
CREATE TABLE assessment_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    total_max_marks NUMERIC(10,4) NOT NULL DEFAULT 100.0000 CHECK (total_max_marks > 0),
    supervisor_max_marks NUMERIC(10,4) NOT NULL DEFAULT 30.0000 CHECK (supervisor_max_marks > 0),
    examiner_document_max_marks NUMERIC(10,4) NOT NULL DEFAULT 40.0000 CHECK (examiner_document_max_marks > 0),
    examiner_defence_max_marks NUMERIC(10,4) NOT NULL DEFAULT 30.0000 CHECK (examiner_defence_max_marks > 0),
    pass_mark_threshold NUMERIC(10,4) NOT NULL DEFAULT 45.0000 CHECK (pass_mark_threshold > 0),
    examiner_consolidation_method consolidation_method_enum NOT NULL DEFAULT 'ARITHMETIC_MEAN',
    final_rounding_mode rounding_mode_enum NOT NULL DEFAULT 'ROUND_HALF_UP_2DP',
    supervisor_criteria_jsonb JSONB NOT NULL,
    examiner_document_criteria_jsonb JSONB NOT NULL,
    examiner_defence_criteria_jsonb JSONB NOT NULL,
    grade_scale_bands_jsonb JSONB NOT NULL,
    supervisor_assessment_due_utc TIMESTAMPTZ,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by_coordinator_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_component_sum_equals_total CHECK (
        (supervisor_max_marks + examiner_document_max_marks + examiner_defence_max_marks) = total_max_marks
    ),
    UNIQUE (institution_id, programme_id, academic_session_id),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, programme_id) REFERENCES programmes(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, academic_session_id) REFERENCES academic_sessions(institution_id, id) ON DELETE RESTRICT
);

-- F-47: Named Examination Panels
CREATE TABLE examination_panels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    panel_name VARCHAR(120) NOT NULL,
    required_examiner_count INT NOT NULL DEFAULT 1 CHECK (required_examiner_count >= 1),
    created_by_coordinator_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, programme_id, academic_session_id, panel_name),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, programme_id) REFERENCES programmes(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, academic_session_id) REFERENCES academic_sessions(institution_id, id) ON DELETE RESTRICT
);

-- F-46 & F-48: Project Examiner Appointments (Trigger Enforces BR-16 Non-Supervision Independence)
CREATE TABLE examiner_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    project_id UUID NOT NULL,
    panel_id UUID,
    examiner_user_id UUID NOT NULL,
    status examiner_appointment_status_enum NOT NULL DEFAULT 'ACTIVE',
    appointed_by_coordinator_id UUID NOT NULL,
    appointed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    removal_reason VARCHAR(500),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, panel_id) REFERENCES examination_panels(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, examiner_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
);

-- F-49: Oral Project Defence Scheduling
CREATE TABLE defence_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    project_id UUID NOT NULL UNIQUE,
    panel_id UUID,
    defence_date DATE NOT NULL,
    start_time_utc TIMESTAMPTZ NOT NULL,
    end_time_utc TIMESTAMPTZ NOT NULL CHECK (end_time_utc > start_time_utc),
    venue_location VARCHAR(250) NOT NULL,
    instructions_notes TEXT,
    status defence_schedule_status_enum NOT NULL DEFAULT 'SCHEDULED',
    scheduled_by_coordinator_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, id),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, panel_id) REFERENCES examination_panels(institution_id, id) ON DELETE RESTRICT
);

-- F-52, F-53, F-54, F-55: Examiner Project Assessments (Shared Across Group per BR-NEW-02)
CREATE TABLE examiner_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL,
    examiner_appointment_id UUID NOT NULL UNIQUE,
    examiner_user_id UUID NOT NULL,
    evaluated_final_submission_version_id UUID,
    document_criterion_scores_jsonb JSONB NOT NULL DEFAULT '[]'::JSONB,
    document_subtotal_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000 CHECK (document_subtotal_score >= 0),
    defence_criterion_scores_jsonb JSONB NOT NULL DEFAULT '[]'::JSONB,
    defence_subtotal_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000 CHECK (defence_subtotal_score >= 0),
    examiner_total_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000 CHECK (examiner_total_score = document_subtotal_score + defence_subtotal_score),
    formal_examination_feedback TEXT,
    status assessment_submission_status_enum NOT NULL DEFAULT 'PENDING',
    revision_number INT NOT NULL DEFAULT 1,
    edit_reason VARCHAR(500),
    submitted_at TIMESTAMPTZ,
    last_edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, examiner_appointment_id) REFERENCES examiner_appointments(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, examiner_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
) WITH (fillfactor = 85);

-- F-39 & F-56: Supervisor Performance Assessments (Evaluated Individually per Student Member per BR-NEW-02)
CREATE TABLE supervisor_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    project_id UUID NOT NULL,
    student_registration_id UUID NOT NULL UNIQUE,
    student_user_id UUID NOT NULL,
    supervisor_user_id UUID NOT NULL,
    criterion_scores_jsonb JSONB NOT NULL DEFAULT '[]'::JSONB,
    supervisor_total_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000 CHECK (supervisor_total_score >= 0),
    qualitative_feedback TEXT,
    status assessment_submission_status_enum NOT NULL DEFAULT 'PENDING',
    revision_number INT NOT NULL DEFAULT 1,
    edit_reason VARCHAR(500),
    submitted_at TIMESTAMPTZ,
    last_edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, student_user_id),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, student_registration_id) REFERENCES student_project_registrations(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, student_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, supervisor_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
) WITH (fillfactor = 85);

-- F-58, F-59, F-60, F-61, F-62: Consolidated Student Final Results & Completion Checklist (Private per Student)
CREATE TABLE consolidated_student_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID NOT NULL,
    academic_session_id UUID NOT NULL,
    project_id UUID NOT NULL,
    student_registration_id UUID NOT NULL UNIQUE,
    student_user_id UUID NOT NULL,
    consolidated_examiner_doc_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    consolidated_examiner_defence_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    consolidated_examiner_total_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    individual_supervisor_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    gross_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    effective_late_penalty NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    net_unrounded_score NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    final_rounded_score NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    letter_grade VARCHAR(10) NOT NULL,
    academic_outcome academic_outcome_enum NOT NULL,
    consolidation_method_used consolidation_method_enum NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    published_by_coordinator_id UUID,
    -- F-62 Completion Tracking Checklist Flags
    cond_topic_approved BOOLEAN NOT NULL DEFAULT FALSE,
    cond_interim_milestones_approved BOOLEAN NOT NULL DEFAULT FALSE,
    cond_final_submission_approved BOOLEAN NOT NULL DEFAULT FALSE,
    cond_assessments_completed BOOLEAN NOT NULL DEFAULT FALSE,
    cond_result_published_and_passed BOOLEAN NOT NULL DEFAULT FALSE,
    consolidated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, student_user_id),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, student_registration_id) REFERENCES student_project_registrations(institution_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (institution_id, student_user_id) REFERENCES users(institution_id, id) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- 8. MODULE M, O & P: NOTIFICATIONS, SCHEDULER, TAMPER-RESISTANT AUDIT & BACKUP
-- -----------------------------------------------------------------------------

-- Transactional Outbox Pattern (Decouples Notifications from Academic Transactions per BR-NEW-04)
CREATE TABLE transactional_outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(80) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload_jsonb JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
) WITH (fillfactor = 80);

-- F-72: In-App Notifications
CREATE TABLE in_app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type_code VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    target_deep_link VARCHAR(300) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- F-71, F-73, F-74, F-75: Asynchronous Notification Dispatch Queue & Retry Ledger
CREATE TABLE notification_dispatch_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    source_event_id UUID NOT NULL,
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel notification_channel_enum NOT NULL,
    idempotency_key VARCHAR(180) NOT NULL UNIQUE,
    template_code VARCHAR(80) NOT NULL,
    subject VARCHAR(250),
    payload_jsonb JSONB NOT NULL,
    status dispatch_status_enum NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    provider_message_id VARCHAR(150),
    last_error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) WITH (fillfactor = 80);

-- F-79 & F-80: Scheduled Deadline Reminder & Missed Deadline Detection Ledger
CREATE TABLE scheduled_deadline_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    milestone_id UUID NOT NULL,
    effective_deadline_utc TIMESTAMPTZ NOT NULL,
    job_type VARCHAR(40) NOT NULL CHECK (job_type IN ('REMINDER_7D', 'REMINDER_3D', 'REMINDER_24H', 'OVERDUE_DETECTION')),
    scheduled_trigger_utc TIMESTAMPTZ NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'TRIGGERED', 'SUPPRESSED_SUBMITTED', 'SUPERSEDED_BY_EXTENSION', 'FAILED')),
    executed_at TIMESTAMPTZ,
    UNIQUE (project_id, milestone_id, effective_deadline_utc, job_type),
    FOREIGN KEY (institution_id, project_id) REFERENCES projects(institution_id, id) ON DELETE CASCADE
);

-- F-82: Tamper-Resistant Administrative & Critical Academic Audit Log (Append-Only Hash Chain)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    sequence_num BIGSERIAL UNIQUE NOT NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE RESTRICT,
    programme_id UUID,
    academic_session_id UUID,
    project_id UUID,
    actor_user_id UUID,
    actor_role VARCHAR(50) NOT NULL,
    actor_ip INET,
    action_code VARCHAR(100) NOT NULL,
    is_confidential_academic_payload BOOLEAN NOT NULL DEFAULT FALSE,
    target_entity_type VARCHAR(80) NOT NULL,
    target_entity_id UUID NOT NULL,
    previous_state_jsonb JSONB,
    resulting_state_jsonb JSONB,
    justification_reason TEXT,
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED')),
    previous_row_hash CHAR(64),
    row_integrity_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- F-83: Hourly Backup & Disaster Recovery Verification Ledger (RPO <= 1h, RTO <= 4h)
CREATE TABLE backup_recovery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    backup_type VARCHAR(40) NOT NULL CHECK (backup_type IN ('HOURLY_INCREMENTAL', 'FULL_SNAPSHOT', 'RESTORATION_DRILL')),
    scope VARCHAR(60) NOT NULL DEFAULT 'ALL_STORES_DB_OBJECTS_AUDIT',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    backup_size_bytes BIGINT,
    encryption_key_id VARCHAR(120) NOT NULL,
    sha256_manifest_checksum CHAR(64),
    retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    measured_rto_minutes INT CHECK (measured_rto_minutes IS NULL OR measured_rto_minutes <= 240),
    status VARCHAR(30) NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
    error_details TEXT
);
