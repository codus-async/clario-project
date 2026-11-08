/**
 * =============================================================================
 * CLARIO MVP — SHARED TYPESCRIPT CONTRACTS, DTOs & DOMAIN CONSTANTS
 * Package: @clario/shared-contracts
 * Target Release: Clario MVP (P0 Scope Only - 75 Features, FR-001 to FR-290)
 * Jurisdiction & Currency: Nigeria (NGN - integer minor units / kobo)
 * Default Timezone Authority: Africa/Lagos (WAT)
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// 1. BRANDED SCALAR TYPES & PRECISION PRIMITIVES
// -----------------------------------------------------------------------------

/** Immutable UUID string */
export type UUID = string;

/** ISO-8601 UTC timestamp string (e.g., "2026-12-01T22:59:00.000Z") */
export type ISODateTimeUTC = string;

/** ISO-8601 Calendar Date string (YYYY-MM-DD) */
export type ISODateString = string;

/** Valid IANA Timezone Identifier (Defaults to "Africa/Lagos" per BR-NEW-01) */
export type IANATimezone = string;

/**
 * Exact monetary representation in Nigerian Naira (NGN) minor units (kobo).
 * 1 NGN = 100 Kobo. Stored as integer to prevent floating-point drift (FR-007, FR-232).
 */
export type KoboAmount = number;

/**
 * Exact fixed-point decimal string representation matching PostgreSQL NUMERIC(10,4).
 * Used for intermediate grading calculations without premature rounding (NFR-DOM, OD-08).
 * Example: "57.7500"
 */
export type DecimalScore4DP = string;

/**
 * Final display-rounded score string matching PostgreSQL NUMERIC(10,2).
 * Example: "85.00"
 */
export type DisplayScore2DP = string;

/** SHA-256 hex digest string (64 chars) */
export type SHA256Hash = string;

// -----------------------------------------------------------------------------
// 2. GLOBAL SYSTEM CONSTANTS & VALIDATION BOUNDS
// -----------------------------------------------------------------------------

export const CLARIO_SYSTEM_CONSTANTS = {
  DEFAULT_TIMEZONE: 'Africa/Lagos' as IANATimezone,
  LAUNCH_CURRENCY: 'NGN' as const,
  MAX_USERS_PER_INSTITUTION_MVP: 5000,
  MIN_PASSWORD_LENGTH: 12,
  MAX_UPLOAD_FILE_SIZE_BYTES: 52_428_800, // 50 MB (FR-103, FR-263)
  DEFAULT_SUPERVISOR_MAX_MARKS: '30.0000' as DecimalScore4DP, // BR-18
  DEFAULT_TOTAL_MAX_MARKS: '100.0000' as DecimalScore4DP,
  DEFAULT_GRACE_PERIOD_DAYS: 14,
  MIN_GROUP_MEMBERS: 2, // FR-074
  BACKUP_RPO_MINUTES: 60, // 1 Hour (FR-288)
  BACKUP_RTO_MINUTES: 240, // 4 Hours (FR-288)
  ROUTINE_BACKUP_RETENTION_DAYS: 30, // FR-287
} as const;

export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx'] as const;
export type AllowedFileExtension = (typeof ALLOWED_FILE_EXTENSIONS)[number];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// -----------------------------------------------------------------------------
// 3. DOMAIN ENUMERATIONS (1:1 PARITY WITH POSTGRESQL 16 DDL)
// -----------------------------------------------------------------------------

export enum RoleCode {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  INSTITUTIONAL_ADMIN = 'INSTITUTIONAL_ADMIN',
  PROJECT_COORDINATOR = 'PROJECT_COORDINATOR',
  PROJECT_SUPERVISOR = 'PROJECT_SUPERVISOR',
  PROJECT_EXAMINER = 'PROJECT_EXAMINER',
  STUDENT = 'STUDENT',
}

/** Roles that strictly require Mandatory MFA enrollment & verification (SEC-06, FR-048, FR-222) */
export const MANDATORY_MFA_ROLES: ReadonlyArray<RoleCode> = [
  RoleCode.PLATFORM_ADMIN,
  RoleCode.INSTITUTIONAL_ADMIN,
  RoleCode.PROJECT_COORDINATOR,
];

/** Roles strictly blocked from accessing confidential academic content (BR-25, F-08, F-18) */
export const CONFIDENTIALITY_BLOCKED_ADMIN_ROLES: ReadonlyArray<RoleCode> = [
  RoleCode.PLATFORM_ADMIN,
  RoleCode.INSTITUTIONAL_ADMIN,
];

export enum TenantStatus {
  PENDING_ACTIVATION = 'PENDING_ACTIVATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_TERMINATION = 'PENDING_TERMINATION',
  TERMINATED = 'TERMINATED',
}

export enum PlanBillingInterval {
  ANNUAL = 'ANNUAL',
  SEMESTER_SESSION = 'SEMESTER_SESSION',
  MONTHLY = 'MONTHLY',
}

export enum PlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum SubscriptionStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  GRACE_PERIOD = 'GRACE_PERIOD',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentTransactionStatus {
  INITIATED = 'INITIATED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
  DISCREPANCY_REQUIRES_RECONCILIATION = 'DISCREPANCY_REQUIRES_RECONCILIATION',
}

export enum WebhookProcessingStatus {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  DUPLICATE_IGNORED = 'DUPLICATE_IGNORED',
  REJECTED_INVALID_SIGNATURE = 'REJECTED_INVALID_SIGNATURE',
  FAILED = 'FAILED',
}

export enum AcademicEntityStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum AcademicSessionStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum UserAccountStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
}

export enum GuardianConsentStatus {
  NOT_REQUIRED_ADULT = 'NOT_REQUIRED_ADULT',
  NOT_REQUIRED_STATUTORY_EDUCATIONAL_BASIS = 'NOT_REQUIRED_STATUTORY_EDUCATIONAL_BASIS',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
}

export enum SupervisorEligibilityStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE_ON_LEAVE = 'UNAVAILABLE_ON_LEAVE',
  INACTIVE = 'INACTIVE',
}

export enum StudentCohortStatus {
  REGISTERED_AWAITING_TOPIC = 'REGISTERED_AWAITING_TOPIC',
  TOPIC_PROPOSED = 'TOPIC_PROPOSED',
  ALLOCATED = 'ALLOCATED',
  COMPLETED = 'COMPLETED',
  FAILED_INCOMPLETE = 'FAILED_INCOMPLETE',
}

export enum ProjectArrangement {
  UNASSIGNED = 'UNASSIGNED',
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
}

export enum ProjectType {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP',
}

export enum ProjectLifecycleStatus {
  TOPIC_PROPOSAL = 'TOPIC_PROPOSAL',
  ACTIVE_SUPERVISION = 'ACTIVE_SUPERVISION',
  FINAL_SUBMITTED = 'FINAL_SUBMITTED',
  UNDER_EXAMINATION = 'UNDER_EXAMINATION',
  RESULTS_APPROVED = 'RESULTS_APPROVED',
  RESULTS_PUBLISHED = 'RESULTS_PUBLISHED',
  COMPLETED = 'COMPLETED',
}

export enum TopicProposalStatus {
  SUBMITTED_AWAITING_SUPERVISOR = 'SUBMITTED_AWAITING_SUPERVISOR',
  UNDER_SUPERVISOR_REVIEW = 'UNDER_SUPERVISOR_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ALTERNATIVE_SUGGESTED = 'ALTERNATIVE_SUGGESTED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum SupervisionAssignmentStatus {
  ACTIVE = 'ACTIVE',
  REASSIGNED_HISTORICAL = 'REASSIGNED_HISTORICAL',
}

export enum MilestoneType {
  INTERIM = 'INTERIM',
  FINAL_SUBMISSION = 'FINAL_SUBMISSION',
}

export enum ProjectMilestoneState {
  LOCKED = 'LOCKED',
  IN_PROGRESS_NOT_SUBMITTED = 'IN_PROGRESS_NOT_SUBMITTED',
  SUBMITTED_AWAITING_REVIEW = 'SUBMITTED_AWAITING_REVIEW',
  REVISIONS_REQUESTED = 'REVISIONS_REQUESTED',
  REJECTED = 'REJECTED',
  APPROVED = 'APPROVED',
}

export enum ReviewDecision {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REVISIONS_REQUESTED = 'REVISIONS_REQUESTED',
  REJECTED = 'REJECTED',
}

export enum DiscussionEntryType {
  FORMAL_REVIEW_FEEDBACK = 'FORMAL_REVIEW_FEEDBACK',
  DISCUSSION_COMMENT = 'DISCUSSION_COMMENT',
}

export enum ExtensionRequestStatus {
  PENDING_SUPERVISOR_RECOMMENDATION = 'PENDING_SUPERVISOR_RECOMMENDATION',
  RECOMMENDED_PENDING_COORDINATOR = 'RECOMMENDED_PENDING_COORDINATOR',
  DECLINED_BY_SUPERVISOR = 'DECLINED_BY_SUPERVISOR',
  APPROVED = 'APPROVED',
  REJECTED_BY_COORDINATOR = 'REJECTED_BY_COORDINATOR',
}

export enum LatePenaltyCalculationMode {
  DISABLED_ADVISORY_ONLY = 'DISABLED_ADVISORY_ONLY',
  FLAT_MARKS_PER_DAY = 'FLAT_MARKS_PER_DAY',
  PERCENTAGE_PER_DAY = 'PERCENTAGE_PER_DAY',
  FIXED_FLAT_DEDUCTION = 'FIXED_FLAT_DEDUCTION',
}

export enum ExaminerAppointmentStatus {
  ACTIVE = 'ACTIVE',
  REMOVED = 'REMOVED',
}

export enum DefenceScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  RESCHEDULED = 'RESCHEDULED',
  COMPLETED = 'COMPLETED',
}

export enum ConsolidationMethod {
  ARITHMETIC_MEAN = 'ARITHMETIC_MEAN',
  WEIGHTED_PANEL = 'WEIGHTED_PANEL',
  COORDINATOR_RESOLVED = 'COORDINATOR_RESOLVED',
}

export enum RoundingMode {
  ROUND_HALF_UP_2DP = 'ROUND_HALF_UP_2DP',
  ROUND_HALF_UP_INTEGER = 'ROUND_HALF_UP_INTEGER',
  NONE_EXACT = 'NONE_EXACT',
}

export enum AssessmentSubmissionStatus {
  PENDING = 'PENDING',
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PUBLISHED_LOCKED = 'PUBLISHED_LOCKED',
}

export enum ResultApprovalStatus {
  INCOMPLETE_ASSESSMENTS = 'INCOMPLETE_ASSESSMENTS',
  CONSOLIDATED_PENDING_APPROVAL = 'CONSOLIDATED_PENDING_APPROVAL',
  APPROVED_READY_FOR_PUBLICATION = 'APPROVED_READY_FOR_PUBLICATION',
  PENDING_COORDINATOR_REAPPROVAL = 'PENDING_COORDINATOR_REAPPROVAL',
  PUBLISHED = 'PUBLISHED',
}

export enum AcademicOutcome {
  PASS = 'PASS',
  FAIL = 'FAIL',
}

export enum DocumentCategory {
  MILESTONE_SUBMISSION = 'MILESTONE_SUBMISSION',
  FINAL_PROJECT_SUBMISSION = 'FINAL_PROJECT_SUBMISSION',
  SHARED_GROUP_WORKING_DOC = 'SHARED_GROUP_WORKING_DOC',
  SUPERVISOR_FEEDBACK_ATTACHMENT = 'SUPERVISOR_FEEDBACK_ATTACHMENT',
  EXTENSION_EVIDENCE = 'EXTENSION_EVIDENCE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
}

// -----------------------------------------------------------------------------
// 4. STANDARDIZED API ENVELOPES, HEADERS & BUSINESS RULE ERROR CODES
// -----------------------------------------------------------------------------

export const CLARIO_HTTP_HEADERS = {
  ACTIVE_ROLE: 'X-Clario-Active-Role',
  COORDINATOR_APPOINTMENT_ID: 'X-Clario-Coordinator-Appointment-Id',
  IDEMPOTENCY_KEY: 'X-Idempotency-Key',
  REQUEST_ID: 'X-Request-Id',
  WEBHOOK_SIGNATURE: 'X-Payment-Webhook-Signature',
} as const;

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta: {
    requestId: UUID;
    serverTimestampUtc: ISODateTimeUTC;
    institutionTimezone?: IANATimezone;
  };
}

export interface PaginatedList<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export enum ClarioErrorCode {
  // AuthN, Session & Access Control (F-08, F-18, F-64–F-66, F-70)
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  MFA_ENROLLMENT_REQUIRED = 'MFA_ENROLLMENT_REQUIRED',
  MFA_CHALLENGE_REQUIRED = 'MFA_CHALLENGE_REQUIRED',
  ACCOUNT_TEMPORARILY_LOCKED = 'ACCOUNT_TEMPORARILY_LOCKED',
  COMPROMISED_OR_WEAK_PASSWORD = 'COMPROMISED_OR_WEAK_PASSWORD',
  SESSION_EXPIRED_OR_REVOKED = 'SESSION_EXPIRED_OR_REVOKED',
  TENANT_ISOLATION_VIOLATION_BR01 = 'TENANT_ISOLATION_VIOLATION_BR01',
  SCOPE_AUTHORIZATION_DENIED_BR02 = 'SCOPE_AUTHORIZATION_DENIED_BR02',
  COORDINATOR_SCOPE_MISMATCH_BR03 = 'COORDINATOR_SCOPE_MISMATCH_BR03',
  CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED_BR25 = 'CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED_BR25',
  SUBSCRIPTION_EXPIRED_RESTRICTED_F70 = 'SUBSCRIPTION_EXPIRED_RESTRICTED_F70',
  TENANT_SUSPENDED_F01 = 'TENANT_SUSPENDED_F01',

  // Academic Workflow & Business Rule Violations (BR-04 to BR-27, BR-NEW-01 to 04)
  ROLE_INCOMPATIBILITY_STUDENT_STAFF_FR046 = 'ROLE_INCOMPATIBILITY_STUDENT_STAFF_FR046',
  PLAN_CAPACITY_EXCEEDED_FR039 = 'PLAN_CAPACITY_EXCEEDED_FR039',
  TOPIC_REQUIRED_BEFORE_SUPERVISOR_BR05 = 'TOPIC_REQUIRED_BEFORE_SUPERVISOR_BR05',
  DESIGNATED_SUBMITTER_REQUIRED_BR08 = 'DESIGNATED_SUBMITTER_REQUIRED_BR08',
  SEQUENTIAL_MILESTONE_LOCKED_BR10 = 'SEQUENTIAL_MILESTONE_LOCKED_BR10',
  SUPERVISOR_RECOMMENDATION_REQUIRED_BR15 = 'SUPERVISOR_RECOMMENDATION_REQUIRED_BR15',
  EXAMINER_SUPERVISOR_CONFLICT_BR16 = 'EXAMINER_SUPERVISOR_CONFLICT_BR16',
  BLIND_GRADING_ISOLATION_BR17 = 'BLIND_GRADING_ISOLATION_BR17',
  ASSESSMENT_LOCKED_AFTER_PUBLICATION_BR21 = 'ASSESSMENT_LOCKED_AFTER_PUBLICATION_BR21',
  APPROVAL_REQUIRED_BEFORE_PUBLICATION_BR22 = 'APPROVAL_REQUIRED_BEFORE_PUBLICATION_BR22',
  INCOMPLETE_PANEL_OR_GROUP_ASSESSMENTS = 'INCOMPLETE_PANEL_OR_GROUP_ASSESSMENTS',
  CLOSED_ACADEMIC_SESSION_READONLY_FR037 = 'CLOSED_ACADEMIC_SESSION_READONLY_FR037',

  // File Security & Integrity Errors (F-76–F-78)
  FILE_SIZE_EXCEEDS_50MB = 'FILE_SIZE_EXCEEDS_50MB',
  UNSUPPORTED_FILE_EXTENSION = 'UNSUPPORTED_FILE_EXTENSION',
  BINARY_MAGIC_BYTE_MISMATCH = 'BINARY_MAGIC_BYTE_MISMATCH',
  MALICIOUS_FILE_DETECTED = 'MALICIOUS_FILE_DETECTED',
  VERSION_IMMUTABILITY_VIOLATION_BR11 = 'VERSION_IMMUTABILITY_VIOLATION_BR11',

  // Validation & Resource Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_CONFLICT = 'DUPLICATE_CONFLICT',
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: ClarioErrorCode;
    message: string;
    ruleReference?: string; // e.g., "BR-16", "BR-25", "SEC-06"
    fieldErrors?: Record<string, string[]>;
    requestId: UUID;
    timestampUtc: ISODateTimeUTC;
  };
}

// -----------------------------------------------------------------------------
// 5. MODULE K: AUTHENTICATION, SESSION & ACCESS CONTEXT CONTRACTS (F-64–F-66)
// -----------------------------------------------------------------------------

export interface CoordinatorScopeContext {
  appointmentId: UUID;
  programmeId: UUID;
  programmeName: string;
  programmeCode: string;
  departmentId: UUID;
  academicSessionId: UUID;
  academicSessionLabel: string;
}

export interface AuthenticatedSessionContext {
  sessionId: UUID;
  userId: UUID;
  fullName: string;
  email: string;
  institutionalIdNumber: string | null;
  institutionId: UUID | null; // null strictly for Platform Admin
  institutionName: string | null;
  institutionCode: string | null;
  institutionTimezone: IANATimezone;
  subscriptionStatus: SubscriptionStatus | null;
  gracePeriodEndsAtUtc: ISODateTimeUTC | null;
  assignedRoles: RoleCode[];
  activeRole: RoleCode;
  mfaRequired: boolean;
  mfaVerified: boolean;
  coordinatorAppointments: CoordinatorScopeContext[];
  activeCoordinatorScope: CoordinatorScopeContext | null; // Enforces BR-03
  inactivityTimeoutMinutes: number;
  expiresAtUtc: ISODateTimeUTC;
}

export interface LoginRequestDto {
  identifier: string; // Email or Matric/Staff Number
  password: string;
  institutionCode?: string; // Optional tenant disambiguator
}

export interface MfaVerifyRequestDto {
  totpCode: string; // 6-digit code or recovery code
}

export interface SwitchActiveContextRequestDto {
  targetRole: RoleCode;
  coordinatorAppointmentId?: UUID; // Mandatory if targetRole === PROJECT_COORDINATOR (BR-03)
}

// -----------------------------------------------------------------------------
// 6. MODULE A & L: PLATFORM ADMIN, TENANTS, PLANS & SUBSCRIPTION BILLING
//    (F-01–F-05, F-08, F-67–F-70)
// -----------------------------------------------------------------------------

export interface InstitutionTenantDto {
  id: UUID;
  name: string;
  codeSlug: string;
  country: string;
  timezoneIana: IANATimezone;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string | null;
  accountStatus: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
  activeUserCount: number;
  maxUserCapacity: number;
  createdAtUtc: ISODateTimeUTC;
}

export interface CreateInstitutionRequestDto {
  name: string;
  codeSlug: string;
  timezoneIana?: IANATimezone; // Defaults to 'Africa/Lagos'
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  initialPlanId: UUID;
  activateImmediately: boolean;
}

export interface UpdateInstitutionStatusRequestDto {
  targetStatus: TenantStatus;
  reason?: string; // Mandatory for SUSPENDED and PENDING_TERMINATION (FR-003)
}

export interface InitiateTenantArchiveExportRequestDto {
  institutionalRequestReference: string; // Mandatory for F-08 / SEC-16 audit
  justification: string;
}

export interface SubscriptionPlanDto {
  id: UUID;
  planCode: string;
  planName: string;
  description: string | null;
  currency: 'NGN';
  priceKobo: KoboAmount;
  billingInterval: PlanBillingInterval;
  billingDurationDays: number;
  maxUserCapacity: number;
  status: PlanStatus;
  subscribedInstitutionsCount: number;
}

export interface CreateSubscriptionPlanRequestDto {
  planCode: string;
  planName: string;
  description?: string;
  priceKobo: KoboAmount;
  billingInterval: PlanBillingInterval;
  billingDurationDays: number;
  maxUserCapacity: number;
}

export interface GracePeriodPermissionMatrix {
  allowAcademicWrites: boolean;
  allowAcademicReads: boolean;
  allowBillingPortal: boolean;
  showWarningBanner: boolean;
}

export interface InstitutionalSubscriptionDetailDto {
  id: UUID;
  institutionId: UUID;
  plan: SubscriptionPlanDto;
  contractedPriceKobo: KoboAmount;
  contractedMaxUsers: number;
  currentActiveUsers: number;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodStartUtc: ISODateTimeUTC | null;
  currentPeriodEndUtc: ISODateTimeUTC | null;
  gracePeriodEndUtc: ISODateTimeUTC | null;
  effectiveGracePeriodDays: number;
  billingLegalName: string;
  billingEmail: string;
  billingAddress: string | null;
  taxRcNumber: string | null;
  billingContactPhone: string | null;
}

export interface InitiateSubscriptionPaymentRequestDto {
  selectedPlanId: UUID;
  idempotencyReference: string; // Client/Server idempotency key (DAT-07, DAT-09)
}

export interface InitiateSubscriptionPaymentResponseDto {
  transactionId: UUID;
  idempotencyReference: string;
  currency: 'NGN';
  expectedAmountKobo: KoboAmount;
  gatewayCheckoutUrl: string;
  status: PaymentTransactionStatus;
}

// -----------------------------------------------------------------------------
// 7. MODULE B: INSTITUTIONAL HIERARCHY, USERS, ROLES, COORDINATORS & SUPERVISORS
//    (F-09–F-16, F-18)
// -----------------------------------------------------------------------------

export interface FacultyDto {
  id: UUID;
  institutionId: UUID;
  name: string;
  code: string;
  description: string | null;
  status: AcademicEntityStatus;
  activeDepartmentsCount: number;
}

export interface DepartmentDto {
  id: UUID;
  institutionId: UUID;
  facultyId: UUID;
  facultyName: string;
  name: string;
  code: string;
  description: string | null;
  status: AcademicEntityStatus;
  activeProgrammesCount: number;
}

export interface ProgrammeDto {
  id: UUID;
  institutionId: UUID;
  facultyId: UUID;
  departmentId: UUID;
  departmentName: string;
  name: string;
  code: string;
  degreeAwardTitle: string | null;
  projectGuidelinesMarkdown: string | null;
  status: AcademicEntityStatus;
}

export interface AcademicSessionDto {
  id: UUID;
  institutionId: UUID;
  sessionLabel: string; // e.g., "2026/2027"
  startDate: ISODateString;
  endDate: ISODateString;
  status: AcademicSessionStatus;
  institutionTimezone: IANATimezone;
}

export interface InstitutionalUserDto {
  id: UUID;
  institutionId: UUID;
  fullName: string;
  email: string;
  institutionalIdNumber: string;
  primaryDepartmentId: UUID | null;
  accountStatus: UserAccountStatus;
  assignedRoles: RoleCode[];
  mfaRequired: boolean;
  mfaEnrolled: boolean;
  isUnder18: boolean;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianConsentStatus: GuardianConsentStatus;
  lastLoginAtUtc: ISODateTimeUTC | null;
}

export interface CreateInstitutionalUserRequestDto {
  fullName: string;
  email: string;
  institutionalIdNumber: string;
  primaryDepartmentId?: UUID;
  initialRoles: RoleCode[]; // Validated against FR-046 (Student cannot mix with Staff/Admin)
  isUnder18: boolean;
  guardianName?: string;
  guardianEmail?: string;
  guardianConsentStatus?: GuardianConsentStatus;
}

export interface BulkUserCsvValidationRowResult {
  rowNumber: number;
  email: string;
  institutionalIdNumber: string;
  isValid: boolean;
  errors: string[];
}

export interface AppointCoordinatorRequestDto {
  userId: UUID;
  programmeId: UUID;
  academicSessionId: UUID; // Enforces BR-03: 1 Programme + 1 Session per appointment
}

export interface SupervisorRecordDto {
  id: UUID;
  institutionId: UUID;
  userId: UUID;
  fullName: string;
  email: string;
  staffIdNumber: string;
  academicTitle: string; // e.g., "Prof.", "Dr."
  primaryDepartmentId: UUID;
  primaryDepartmentName: string;
  specializationTags: string[];
  eligibilityStatus: SupervisorEligibilityStatus;
  activeAssignedProjectsCount: number;
}

// -----------------------------------------------------------------------------
// 8. MODULE C & D: COHORT REGISTRATION, TOPICS, ALLOCATION, GROUPS & SUPERVISION
//    (F-19–F-24, F-27)
// -----------------------------------------------------------------------------

export interface StudentCohortRegistrationDto {
  id: UUID;
  institutionId: UUID;
  programmeId: UUID;
  academicSessionId: UUID;
  studentUserId: UUID;
  fullName: string;
  email: string;
  matriculationNumber: string;
  cohortStatus: StudentCohortStatus;
  arrangementType: ProjectArrangement;
  projectId: UUID | null;
  groupId: UUID | null;
  groupCode: string | null;
  isDesignatedSubmitter: boolean;
  assignedSupervisorName: string | null;
}

export interface SubmitTopicProposalRequestDto {
  projectId: UUID;
  parentProposalId?: UUID; // Provided when submitting a revised topic after rejection (ST-07)
  proposedTitle: string;
  problemStatement: string;
  objectives: string;
  methodology: string;
  keywords?: string[];
}

export interface SupervisorTopicDecisionRequestDto {
  decision: 'APPROVE' | 'REJECT' | 'SUGGEST_ALTERNATIVE';
  supervisorFeedback?: string; // Mandatory when decision === 'REJECT' (FR-066)
  alternativeTopicTitle?: string; // Mandatory when decision === 'SUGGEST_ALTERNATIVE'
  alternativeTopicDescription?: string;
  alternativeTopicRationale?: string;
}

export interface TopicProposalDto {
  id: UUID;
  projectId: UUID;
  iterationNumber: number;
  parentProposalId: UUID | null;
  proposedTitle: string;
  problemStatement: string;
  objectives: string;
  methodology: string;
  keywords: string[];
  submittedByUserId: UUID;
  submittedByFullName: string;
  submittedAtUtc: ISODateTimeUTC;
  status: TopicProposalStatus;
  reviewedBySupervisorId: UUID | null;
  reviewedAtUtc: ISODateTimeUTC | null;
  supervisorFeedback: string | null;
  alternativeTopicTitle: string | null;
  alternativeTopicDescription: string | null;
  alternativeTopicRationale: string | null;
}

export interface CreateProjectGroupRequestDto {
  groupCode: string;
  memberStudentRegistrationIds: UUID[]; // Minimum 2 members (FR-074)
  designatedSubmitterRegistrationIds: UUID[]; // Minimum 1 member (FR-078, BR-08)
}

export interface UpdateGroupSubmitterAuthorityRequestDto {
  designatedSubmitterRegistrationIds: UUID[]; // Must contain >= 1 active group member
}

export interface AssignSupervisorRequestDto {
  projectIds: UUID[]; // Supports single or bulk assignment (FR-082); blocks if no Topic Proposal (BR-05)
  supervisorRecordId: UUID;
}

export interface ReassignSupervisorRequestDto {
  projectId: UUID;
  newSupervisorRecordId: UUID;
  reassignmentReason: string; // Mandatory 10–500 chars (FR-084)
}

// -----------------------------------------------------------------------------
// 9. MODULE E, F, G & N: WORKSPACE, MILESTONES, SUBMISSIONS, VERSIONS & DEADLINES
//    (F-28–F-44, F-76–F-78)
// -----------------------------------------------------------------------------

export interface ProgrammeMilestoneConfigDto {
  id: UUID;
  programmeId: UUID;
  academicSessionId: UUID;
  sequenceNumber: number;
  title: string;
  milestoneType: MilestoneType;
  descriptionAndRequirements: string;
  permittedExtensions: AllowedFileExtension[];
  programmeDeadlineUtc: ISODateTimeUTC;
  hasSubmissions: boolean;
}

export interface InitializeUploadSessionRequestDto {
  projectId: UUID;
  documentCategory: DocumentCategory;
  milestoneId?: UUID;
  fileName: string;
  fileSizeBytes: number; // Must be <= 52,428,800 (50 MB)
  claimedMimeType: AllowedMimeType;
  idempotencyUploadToken: string; // Client token for interrupted upload retry (DAT-05, FR-104)
}

export interface InitializeUploadSessionResponseDto {
  uploadSessionId: UUID;
  idempotencyUploadToken: string;
  presignedUploadUrl: string;
  expiresAtUtc: ISODateTimeUTC;
}

export interface ConfirmFormalSubmissionRequestDto {
  projectId: UUID;
  milestoneId: UUID;
  idempotencyUploadToken: string; // Verified on server (DAT-03)
  sharedGroupDocumentId?: UUID; // Optional when promoting from F-37 Shared Group Documents (FR-126)
  submissionNotes?: string;
  revisionSummaryNote?: string; // Mandatory when versionNumber > 1 (FR-116)
}

export interface SubmissionVersionDto {
  id: UUID;
  projectId: UUID;
  milestoneId: UUID;
  versionNumber: number;
  parentVersionId: UUID | null;
  storageObjectId: UUID;
  fileName: string;
  fileSizeBytes: number;
  sha256Checksum: SHA256Hash;
  submittedByUserId: UUID;
  submittedByFullName: string;
  submissionNotes: string | null;
  revisionSummaryNote: string | null;
  serverReceiptAtUtc: ISODateTimeUTC;
  effectiveDeadlineAtReceiptUtc: ISODateTimeUTC;
  isLate: boolean;
  lateDurationMinutes: number;
  lateDurationDaysCeil: number;
  reviewDecision: ReviewDecision;
  reviewedBySupervisorId: UUID | null;
  reviewedAtUtc: ISODateTimeUTC | null;
}

export interface SupervisorSubmissionReviewRequestDto {
  submissionVersionId: UUID;
  decision: 'APPROVED' | 'REVISIONS_REQUESTED' | 'REJECTED';
  feedbackComment: string; // Mandatory for REVISIONS_REQUESTED and REJECTED (FR-109)
  annotatedAttachmentUploadToken?: string;
}

export interface SubmissionDiscussionCommentDto {
  id: UUID;
  submissionVersionId: UUID; // Strictly bound to submission version (BR-27)
  versionNumber: number;
  authorUserId: UUID;
  authorFullName: string;
  authorRole: RoleCode.PROJECT_SUPERVISOR | RoleCode.STUDENT;
  entryType: DiscussionEntryType;
  commentBody: string;
  annotatedAttachmentObjectId: UUID | null;
  createdAtUtc: ISODateTimeUTC;
}

export interface CreateExtensionRequestDto {
  projectId: UUID;
  milestoneId: UUID;
  requestedNewDeadlineUtc: ISODateTimeUTC;
  studentReason: string;
  supportingEvidenceUploadToken?: string;
}

export interface SupervisorExtensionRecommendationDto {
  recommendation: 'RECOMMEND' | 'DECLINE';
  recommendedDeadlineUtc?: ISODateTimeUTC;
  supervisorComments: string;
}

export interface CoordinatorExtensionDecisionDto {
  decision: 'APPROVE' | 'REJECT'; // Blocked from APPROVE if not recommended by Supervisor (BR-15)
  approvedExtendedDeadlineUtc?: ISODateTimeUTC;
  coordinatorComments: string;
}

export interface OverrideLatePenaltyRequestDto {
  projectLatePenaltyId: UUID;
  overriddenPenaltyMarks: DecimalScore4DP; // Set to "0.0000" to waive completely
  overrideReason: string; // Mandatory justification 10–1,000 chars (FR-150)
}

// -----------------------------------------------------------------------------
// 10. MODULE H, I & J: EXAMINATION, GRADING, CONSOLIDATION & ATOMIC PUBLICATION
//     (F-39, F-46–F-62)
// -----------------------------------------------------------------------------

export interface GradingCriterionDefinition {
  criterionId: string;
  title: string;
  description: string;
  maxMarks: DecimalScore4DP;
  sequenceOrder: number;
}

export interface GradeScaleBandDefinition {
  letterGrade: string; // e.g., "A", "B", "C", "D", "E", "F"
  minScore: DisplayScore2DP;
  maxScore: DisplayScore2DP;
  outcome: AcademicOutcome;
}

export interface AssessmentStructureDto {
  id: UUID;
  programmeId: UUID;
  academicSessionId: UUID;
  totalMaxMarks: DecimalScore4DP; // Default "100.0000"
  supervisorMaxMarks: DecimalScore4DP; // Default "30.0000" (BR-18)
  examinerDocumentMaxMarks: DecimalScore4DP;
  examinerDefenceMaxMarks: DecimalScore4DP;
  passMarkThreshold: DecimalScore4DP;
  examinerConsolidationMethod: ConsolidationMethod;
  finalRoundingMode: RoundingMode;
  supervisorCriteria: GradingCriterionDefinition[];
  examinerDocumentCriteria: GradingCriterionDefinition[];
  examinerDefenceCriteria: GradingCriterionDefinition[];
  gradeScaleBands: GradeScaleBandDefinition[];
  supervisorAssessmentDueUtc: ISODateTimeUTC | null;
  isLocked: boolean;
}

export interface CriterionScoreEntryDto {
  criterionId: string;
  awardedScore: DecimalScore4DP;
  maxMarks: DecimalScore4DP;
  criterionComment?: string;
}

export interface AppointExaminersRequestDto {
  projectId: UUID;
  examinerUserIds: UUID[]; // Checked against project_supervision_history (BR-16 / F-48)
  panelId?: UUID;
}

export interface ScheduleDefenceRequestDto {
  projectIds: UUID[];
  panelId?: UUID;
  defenceDate: ISODateString;
  startTimeUtc: ISODateTimeUTC;
  endTimeUtc: ISODateTimeUTC;
  venueLocation: string;
  instructionsNotes?: string;
}

/**
 * F-52, F-53, F-54, F-55: Examiner Project Assessment Submission/Update DTO.
 * Shared across the group for Group Projects (BR-NEW-02).
 * Blind to Supervisor and Co-Examiner scores (BR-17).
 */
export interface SubmitExaminerAssessmentRequestDto {
  examinerAppointmentId: UUID;
  projectId: UUID;
  documentCriterionScores: CriterionScoreEntryDto[];
  defenceCriterionScores: CriterionScoreEntryDto[];
  formalExaminationFeedback: string;
  saveAsDraftOnly: boolean;
  editReason?: string; // Mandatory if editing an already SUBMITTED assessment (FR-189, BR-NEW-03)
}

/**
 * F-39 & F-56: Supervisor Performance Assessment Submission/Update DTO.
 * Evaluated individually per student member even on Group Projects (BR-NEW-02).
 */
export interface SubmitSupervisorAssessmentRequestDto {
  projectId: UUID;
  studentRegistrationId: UUID;
  criterionScores: CriterionScoreEntryDto[];
  qualitativeFeedback: string;
  saveAsDraftOnly: boolean;
  editReason?: string; // Mandatory if editing an already SUBMITTED assessment (FR-197, BR-NEW-03)
}

/**
 * F-58 & F-59: Consolidated Result Sheet Row (Coordinator View & Student Private Breakdown F-61)
 */
export interface ConsolidatedStudentResultDto {
  id: UUID;
  projectId: UUID;
  projectTitle: string;
  projectType: ProjectType;
  studentRegistrationId: UUID;
  studentUserId: UUID;
  studentFullName: string;
  matriculationNumber: string;
  // Shared Examiner Component (Document + Defence)
  consolidatedExaminerDocScore: DecimalScore4DP;
  consolidatedExaminerDefenceScore: DecimalScore4DP;
  consolidatedExaminerTotalScore: DecimalScore4DP;
  examinerFormalFeedbackList: string[];
  // Individual Student Supervisor Component (F-39, F-56)
  individualSupervisorScore: DecimalScore4DP;
  supervisorQualitativeFeedback: string;
  // Consolidation & Penalty Math (F-44, F-58)
  grossScore: DecimalScore4DP;
  effectiveLatePenalty: DecimalScore4DP;
  latePenaltyOverridden: boolean;
  netUnroundedScore: DecimalScore4DP;
  finalRoundedScore: DisplayScore2DP;
  letterGrade: string;
  academicOutcome: AcademicOutcome;
  // Governance & Completion Checklist (F-59, F-60, F-62)
  projectResultApprovalStatus: ResultApprovalStatus;
  isPublished: boolean;
  publishedAtUtc: ISODateTimeUTC | null;
  completionChecklist: {
    topicApproved: boolean;
    interimMilestonesApproved: boolean;
    finalSubmissionApproved: boolean;
    assessmentsCompleted: boolean;
    resultPublishedAndPassed: boolean;
    overallCompletionStatus: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED_INCOMPLETE';
  };
}

export interface PublishProjectResultsRequestDto {
  /**
   * Supports atomic publication of a single project or a batch of approved projects
   * without blocking on other pending projects in the programme (BR-23, FR-208–FR-210).
   */
  projectIds: UUID[];
}
