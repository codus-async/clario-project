export const ERROR_CODES = {
  UNAUTHORIZED_SESSION: "UNAUTHORIZED_SESSION",
  MFA_ENROLLMENT_REQUIRED: "MFA_ENROLLMENT_REQUIRED",
  CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED:
    "CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED",
  OUT_OF_ASSIGNMENT_SCOPE: "OUT_OF_ASSIGNMENT_SCOPE",
  SUBSCRIPTION_EXPIRED_RESTRICTED: "SUBSCRIPTION_EXPIRED_RESTRICTED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  BR_05_TOPIC_REQUIRED_BEFORE_SUPERVISOR:
    "BR_05_TOPIC_REQUIRED_BEFORE_SUPERVISOR",
  BR_08_DESIGNATED_SUBMITTER_ONLY: "BR_08_DESIGNATED_SUBMITTER_ONLY",
  BR_10_PRECEDING_MILESTONE_NOT_APPROVED:
    "BR_10_PRECEDING_MILESTONE_NOT_APPROVED",
  BR_16_EXAMINER_SUPERVISOR_CONFLICT:
    "BR_16_EXAMINER_SUPERVISOR_CONFLICT",
  BR_21_ASSESSMENT_LOCKED_POST_PUBLICATION:
    "BR_21_ASSESSMENT_LOCKED_POST_PUBLICATION",
} as const;

export type DocumentedErrorCode =
  (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_METADATA: Record<
  DocumentedErrorCode,
  { status: number; title: string }
> = {
  UNAUTHORIZED_SESSION: {
    status: 401,
    title: "Unauthorized Session",
  },
  MFA_ENROLLMENT_REQUIRED: {
    status: 403,
    title: "MFA Enrollment Required",
  },
  CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED: {
    status: 403,
    title: "Confidential Academic Record Access Blocked",
  },
  OUT_OF_ASSIGNMENT_SCOPE: {
    status: 403,
    title: "Access Outside Assignment Scope",
  },
  SUBSCRIPTION_EXPIRED_RESTRICTED: {
    status: 402,
    title: "Subscription Expired",
  },
  BR_05_TOPIC_REQUIRED_BEFORE_SUPERVISOR: {
    status: 409,
    title: "Topic Proposal Required Before Supervisor Assignment",
  },
  BR_08_DESIGNATED_SUBMITTER_ONLY: {
    status: 409,
    title: "Designated Submitter Required",
  },
  BR_10_PRECEDING_MILESTONE_NOT_APPROVED: {
    status: 409,
    title: "Preceding Milestone Not Approved",
  },
  BR_16_EXAMINER_SUPERVISOR_CONFLICT: {
    status: 409,
    title: "Conflict of Interest Violation (BR-16)",
  },
  BR_21_ASSESSMENT_LOCKED_POST_PUBLICATION: {
    status: 409,
    title: "Assessment Locked After Publication",
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    title: "Service Unavailable",
  },
};
