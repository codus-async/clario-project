import { RoleCode, SubscriptionStatus } from "@clario/shared-contracts";
import { describe, expect, it } from "vitest";

import { AppError } from "../../../errors/app-error.js";
import { ERROR_METADATA } from "../../../errors/error-codes.js";
import type { DocumentedErrorCode } from "../../../errors/error-codes.js";
import {
  inactivityTimeoutMinutesFor,
} from "../../../modules/auth/auth.config.js";
import type { AuthSessionContext } from "../../../modules/auth/auth.types.js";
import {
  PepDenialError,
  buildTenantContext,
  collectTargetInstitutionIds,
  evaluateActiveRole,
  evaluateConfidentiality,
  evaluateMfa,
  evaluateSessionWindow,
  evaluateSubscription,
  isConfidentialAcademicPath,
  isCoordinatorPath,
  isEnforcedPath,
  isExemptPath,
  resolvePepOptions,
} from "../../../modules/access-control/pep.policy.js";
import { testAuthConfig } from "../auth/auth.fakes.js";

const INSTITUTION_A = "11111111-1111-4111-8111-111111111111";
const INSTITUTION_B = "22222222-2222-4222-8222-222222222222";
const APPOINTMENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_APPOINTMENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const OPTIONS = resolvePepOptions();

function sessionContext(
  overrides: Partial<AuthSessionContext> = {},
): AuthSessionContext {
  const activeRole = overrides.activeRole ?? RoleCode.PROJECT_SUPERVISOR;
  return {
    sessionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    userId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    fullName: "Dr. Tunde Adewale",
    email: "tunde.adewale@unilag.edu.ng",
    institutionalIdNumber: "UNILAG/STAFF/0042",
    institutionId: INSTITUTION_A,
    institutionName: "University of Lagos",
    institutionCode: "UNILAG",
    institutionTimezone: "Africa/Lagos",
    subscriptionStatus: null,
    gracePeriodEndsAtUtc: null,
    assignedRoles: [RoleCode.PROJECT_SUPERVISOR],
    activeRole,
    mfaRequired: false,
    mfaEnrolled: false,
    mfaVerified: false,
    coordinatorAppointments: [],
    activeCoordinatorScope: null,
    inactivityTimeoutMinutes: inactivityTimeoutMinutesFor(
      testAuthConfig,
      activeRole,
    ),
    expiresAtUtc: new Date(Date.now() + 60 * 60_000).toISOString(),
    ...overrides,
  };
}

function expectDenial(fn: () => unknown, code: DocumentedErrorCode): AppError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    const appError = error as AppError;
    expect(appError.code).toBe(code);
    expect(appError.status).toBe(ERROR_METADATA[code].status);
    return appError;
  }
  throw new Error(`expected denial with code ${code}`);
}

function coordinatorScope(
  appointmentId = APPOINTMENT_ID,
): NonNullable<AuthSessionContext["activeCoordinatorScope"]> {
  return {
    appointmentId,
    programmeId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    programmeName: "B.Sc. Computer Science",
    programmeCode: "CSC",
    departmentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    academicSessionId: "99999999-9999-4999-8999-999999999999",
    academicSessionLabel: "2026/2027",
  };
}

function coordinatorSession(
  overrides: Partial<AuthSessionContext> = {},
): AuthSessionContext {
  const scope = coordinatorScope(
    (overrides.activeCoordinatorScope?.appointmentId as string | undefined) ??
      APPOINTMENT_ID,
  );
  return sessionContext({
    assignedRoles: [RoleCode.PROJECT_COORDINATOR],
    activeRole: RoleCode.PROJECT_COORDINATOR,
    mfaRequired: true,
    mfaVerified: true,
    coordinatorAppointments: [scope],
    activeCoordinatorScope: scope,
    inactivityTimeoutMinutes: inactivityTimeoutMinutesFor(
      testAuthConfig,
      RoleCode.PROJECT_COORDINATOR,
    ),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Gate 1 — session / inactivity window
// ---------------------------------------------------------------------------

describe("evaluateSessionWindow (gate 1)", () => {
  it("accepts a session whose window equals the configured policy", () => {
    const context = sessionContext();
    expect(() =>
      evaluateSessionWindow(context, testAuthConfig),
    ).not.toThrow();
  });

  it("accepts a session stricter than the configured policy", () => {
    const context = sessionContext();
    expect(() =>
      evaluateSessionWindow(
        { ...context, inactivityTimeoutMinutes: 1 },
        testAuthConfig,
      ),
    ).not.toThrow();
  });

  it("denies a session whose window exceeds the configured policy", () => {
    const context = sessionContext();
    const policy = inactivityTimeoutMinutesFor(
      testAuthConfig,
      RoleCode.PROJECT_SUPERVISOR,
    );
    const error = expectDenial(
      () =>
        evaluateSessionWindow(
          { ...context, inactivityTimeoutMinutes: policy + 1 },
          testAuthConfig,
        ),
      "UNAUTHORIZED_SESSION",
    );
    expect(error).toBeInstanceOf(PepDenialError);
    expect((error as PepDenialError).gate).toBe("session");
  });

  it("denies a non-positive window", () => {
    const context = sessionContext();
    expectDenial(
      () =>
        evaluateSessionWindow(
          { ...context, inactivityTimeoutMinutes: 0 },
          testAuthConfig,
        ),
      "UNAUTHORIZED_SESSION",
    );
    expectDenial(
      () =>
        evaluateSessionWindow(
          { ...context, inactivityTimeoutMinutes: -5 },
          testAuthConfig,
        ),
      "UNAUTHORIZED_SESSION",
    );
  });

  it("evaluates the window against the active role's own policy", () => {
    const context = coordinatorSession({
      activeCoordinatorScope: null,
      coordinatorAppointments: [],
      mfaVerified: true,
    });
    const coordinatorPolicy = inactivityTimeoutMinutesFor(
      testAuthConfig,
      RoleCode.PROJECT_COORDINATOR,
    );
    const supervisorPolicy = inactivityTimeoutMinutesFor(
      testAuthConfig,
      RoleCode.PROJECT_SUPERVISOR,
    );
    // A window legal for the supervisor role must not be assumed legal for
    // the coordinator role unless it also fits the coordinator policy.
    const window = Math.max(coordinatorPolicy, supervisorPolicy) + 1;
    expectDenial(
      () =>
        evaluateSessionWindow(
          { ...context, inactivityTimeoutMinutes: window },
          testAuthConfig,
        ),
      "UNAUTHORIZED_SESSION",
    );
  });
});

// ---------------------------------------------------------------------------
// Gate 2 — active role context
// ---------------------------------------------------------------------------

describe("evaluateActiveRole (gate 2)", () => {
  it("accepts a single-role session without the header", () => {
    expect(() => evaluateActiveRole(sessionContext(), undefined)).not.toThrow();
  });

  it("accepts a header that matches the single assigned role", () => {
    expect(() =>
      evaluateActiveRole(sessionContext(), RoleCode.PROJECT_SUPERVISOR),
    ).not.toThrow();
  });

  it("denies a single-role session whose header names a different role", () => {
    const error = expectDenial(
      () => evaluateActiveRole(sessionContext(), RoleCode.STUDENT),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
    expect((error as PepDenialError).gate).toBe("role");
  });

  it("denies a header that is not a known role code", () => {
    expectDenial(
      () => evaluateActiveRole(sessionContext(), "SUPERUSER"),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
  });

  it("requires the header when the account holds multiple roles", () => {
    const multiRole = sessionContext({
      assignedRoles: [RoleCode.PROJECT_SUPERVISOR, RoleCode.STUDENT],
    });
    const error = expectDenial(
      () => evaluateActiveRole(multiRole, undefined),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
    expect(error.message).toContain("X-Clario-Active-Role");
    expect(error.message).toContain("session/context");
  });

  it("accepts a multi-role session whose header matches the active role", () => {
    const multiRole = sessionContext({
      assignedRoles: [RoleCode.PROJECT_SUPERVISOR, RoleCode.STUDENT],
      activeRole: RoleCode.STUDENT,
    });
    expect(() =>
      evaluateActiveRole(multiRole, RoleCode.STUDENT),
    ).not.toThrow();
  });

  it("never lets the header switch roles the session did not persist", () => {
    // The account holds both roles, but the session is active as supervisor:
    // the header must not silently override it (F-65 switching only).
    const multiRole = sessionContext({
      assignedRoles: [RoleCode.PROJECT_SUPERVISOR, RoleCode.STUDENT],
      activeRole: RoleCode.PROJECT_SUPERVISOR,
    });
    const error = expectDenial(
      () => evaluateActiveRole(multiRole, RoleCode.STUDENT),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
    expect(error.message).toContain("session/context");
  });

  it("denies a header naming a role the account does not hold", () => {
    expectDenial(
      () => evaluateActiveRole(sessionContext(), RoleCode.PLATFORM_ADMIN),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
  });
});

// ---------------------------------------------------------------------------
// Gate 3 — MFA
// ---------------------------------------------------------------------------

describe("evaluateMfa (gate 3)", () => {
  it("allows a non-mandatory role without MFA verification", () => {
    expect(() => evaluateMfa(sessionContext())).not.toThrow();
  });

  it("allows a verified coordinator session", () => {
    expect(() => evaluateMfa(coordinatorSession())).not.toThrow();
  });

  it("blocks an unverified coordinator (mandatory MFA role)", () => {
    const error = expectDenial(
      () =>
        evaluateMfa(
          coordinatorSession({ mfaEnrolled: false, mfaVerified: false }),
        ),
      "MFA_ENROLLMENT_REQUIRED",
    );
    expect((error as PepDenialError).gate).toBe("mfa");
    expect(error.status).toBe(403);
  });

  it("blocks an unverified institutional admin", () => {
    expectDenial(
      () =>
        evaluateMfa(
          sessionContext({
            assignedRoles: [RoleCode.INSTITUTIONAL_ADMIN],
            activeRole: RoleCode.INSTITUTIONAL_ADMIN,
            mfaRequired: true,
            mfaVerified: false,
          }),
        ),
      "MFA_ENROLLMENT_REQUIRED",
    );
  });

  it("blocks any session flagged mfa_required even for a non-mandatory role", () => {
    expectDenial(
      () =>
        evaluateMfa(
          sessionContext({ mfaRequired: true, mfaVerified: false }),
        ),
      "MFA_ENROLLMENT_REQUIRED",
    );
  });

  it("allows a mfa_required session once verified", () => {
    expect(() =>
      evaluateMfa(sessionContext({ mfaRequired: true, mfaVerified: true })),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Gate 4 — tenant boundary, coordinator scope, confidentiality
// ---------------------------------------------------------------------------

describe("collectTargetInstitutionIds", () => {
  it("collects ids from the path, params, query, and body", () => {
    const targets = collectTargetInstitutionIds({
      path: `/api/v1/institutions/${INSTITUTION_B}/projects`,
      params: { institution_id: INSTITUTION_A },
      query: { institution_id: INSTITUTION_B },
      body: { institutionId: INSTITUTION_B },
    });
    expect(targets).toHaveLength(2);
    expect(targets).toContain(INSTITUTION_A);
    expect(targets).toContain(INSTITUTION_B);
  });

  it("ignores non-uuid values and paths without an institution segment", () => {
    const targets = collectTargetInstitutionIds({
      path: "/api/v1/projects/123",
      params: {},
      query: { institution_id: "UNILAG" },
      body: null,
    });
    expect(targets).toEqual([]);
  });
});

describe("buildTenantContext (gate 4)", () => {
  const scopeInput = {
    path: "/api/v1/projects",
    params: {},
    query: {},
    body: undefined,
    coordinatorAppointmentHeader: undefined,
    options: OPTIONS,
  };

  it("builds a tenant context for an in-tenant request", () => {
    const context = buildTenantContext({
      ...scopeInput,
      context: sessionContext(),
    });
    expect(context).toEqual({
      institutionId: INSTITUTION_A,
      isPlatformAdmin: false,
      activeRole: RoleCode.PROJECT_SUPERVISOR,
      coordinatorAppointmentId: null,
    });
  });

  it("denies an explicitly addressed foreign institution in the path", () => {
    const error = expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          path: `/api/v1/institutions/${INSTITUTION_B}/projects`,
          context: sessionContext(),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
    expect((error as PepDenialError).gate).toBe("tenant_scope");
    expect(error.status).toBe(403);
  });

  it("allows an explicitly addressed own institution in the path", () => {
    expect(() =>
      buildTenantContext({
        ...scopeInput,
        path: `/api/v1/institutions/${INSTITUTION_A}/projects`,
        context: sessionContext(),
      }),
    ).not.toThrow();
  });

  it("denies a foreign institution in the query string", () => {
    expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          query: { institution_id: INSTITUTION_B },
          context: sessionContext(),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
  });

  it("denies a foreign institution in the request body", () => {
    expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          body: { institution_id: INSTITUTION_B },
          context: sessionContext(),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
  });

  it("lets a platform admin address any institution (F-01–F-05)", () => {
    const platformAdmin = sessionContext({
      assignedRoles: [RoleCode.PLATFORM_ADMIN],
      activeRole: RoleCode.PLATFORM_ADMIN,
      institutionId: null,
      institutionName: null,
      institutionCode: null,
    });
    const context = buildTenantContext({
      ...scopeInput,
      path: `/api/v1/institutions/${INSTITUTION_B}/subscription`,
      context: platformAdmin,
    });
    expect(context.isPlatformAdmin).toBe(true);
    expect(context.institutionId).toBeNull();
  });

  it("denies a tenant-less session that is not a platform admin", () => {
    expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          context: sessionContext({ institutionId: null }),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
  });

  it("requires the appointment header on coordinator routes (BR-03)", () => {
    const error = expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          path: "/api/v1/coordinator/appointments",
          context: coordinatorSession(),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
    expect(error.message).toContain("X-Clario-Coordinator-Appointment-Id");
  });

  it("requires the appointment header whenever the active role is coordinator", () => {
    expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          path: "/api/v1/notifications",
          context: coordinatorSession(),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
  });

  it("accepts a coordinator request whose header matches the active scope", () => {
    const context = buildTenantContext({
      ...scopeInput,
      path: "/api/v1/coordinator/appointments",
      coordinatorAppointmentHeader: APPOINTMENT_ID,
      context: coordinatorSession(),
    });
    expect(context.coordinatorAppointmentId).toBe(APPOINTMENT_ID);
    expect(context.activeRole).toBe(RoleCode.PROJECT_COORDINATOR);
  });

  it("denies a coordinator appointment the session is not bound to", () => {
    const error = expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          path: "/api/v1/coordinator/appointments",
          coordinatorAppointmentHeader: OTHER_APPOINTMENT_ID,
          context: coordinatorSession(),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
    expect(error.message).toContain("BR-03");
  });

  it("denies a malformed appointment header", () => {
    expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          path: "/api/v1/coordinator/appointments",
          coordinatorAppointmentHeader: "not-a-uuid",
          context: coordinatorSession(),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
  });

  it("denies a supervisor session reaching a coordinator route", () => {
    expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          path: "/api/v1/coordinator/appointments",
          context: sessionContext(),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
  });

  it("denies a coordinator session with no active appointment scope", () => {
    expectDenial(
      () =>
        buildTenantContext({
          ...scopeInput,
          path: "/api/v1/coordinator/appointments",
          coordinatorAppointmentHeader: APPOINTMENT_ID,
          context: coordinatorSession({
            activeCoordinatorScope: null,
            coordinatorAppointments: [],
          }),
        }),
      "OUT_OF_ASSIGNMENT_SCOPE",
    );
  });
});

describe("evaluateConfidentiality (gate 4b)", () => {
  const confidentialPaths = [
    "/api/v1/projects/123/topic-proposals",
    "/api/v1/projects/123/submissions",
    "/api/v1/projects/123/documents/456",
    "/api/v1/projects/123/discussions",
    "/api/v1/projects/123/assessments",
    "/api/v1/results/2026",
    "/api/v1/projects/123/feedback",
    "/api/v1/projects/123/milestones",
  ];

  it("blocks Institutional Admins from every confidential route (BR-25)", () => {
    const admin = sessionContext({
      assignedRoles: [RoleCode.INSTITUTIONAL_ADMIN],
      activeRole: RoleCode.INSTITUTIONAL_ADMIN,
      mfaRequired: true,
      mfaVerified: true,
    });
    for (const path of confidentialPaths) {
      const error = expectDenial(
        () => evaluateConfidentiality(admin, path, OPTIONS),
        "CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED",
      );
      expect((error as PepDenialError).gate).toBe("tenant_scope");
      expect(error.status).toBe(403);
    }
  });

  it("blocks Platform Admins from confidential academic records (SEC-15)", () => {
    const platformAdmin = sessionContext({
      assignedRoles: [RoleCode.PLATFORM_ADMIN],
      activeRole: RoleCode.PLATFORM_ADMIN,
      institutionId: null,
      mfaRequired: true,
      mfaVerified: true,
    });
    expectDenial(
      () =>
        evaluateConfidentiality(
          platformAdmin,
          "/api/v1/projects/123/submissions",
          OPTIONS,
        ),
      "CONFIDENTIAL_ACADEMIC_RECORD_BLOCKED",
    );
  });

  it("allows Institutional Admins on non-confidential metadata and admin routes", () => {
    const admin = sessionContext({
      assignedRoles: [RoleCode.INSTITUTIONAL_ADMIN],
      activeRole: RoleCode.INSTITUTIONAL_ADMIN,
      mfaRequired: true,
      mfaVerified: true,
    });
    for (const path of [
      "/api/v1/projects/123", // project metadata (FR-230 "metadata only")
      "/api/v1/institutions",
      "/api/v1/billing/invoices",
      "/api/v1/users",
      "/api/v1/platform/institutions", // platform surfaces are not academic
    ]) {
      expect(() =>
        evaluateConfidentiality(admin, path, OPTIONS),
      ).not.toThrow();
    }
  });

  it("never blocks the four academic roles", () => {
    for (const role of [
      RoleCode.PROJECT_SUPERVISOR,
      RoleCode.PROJECT_EXAMINER,
      RoleCode.STUDENT,
      RoleCode.PROJECT_COORDINATOR,
    ]) {
      const context = sessionContext({
        assignedRoles: [role],
        activeRole: role,
      });
      expect(() =>
        evaluateConfidentiality(
          context,
          "/api/v1/projects/123/submissions",
          OPTIONS,
        ),
      ).not.toThrow();
    }
  });

  it("classifies paths by segment content, ignoring platform surfaces", () => {
    expect(
      isConfidentialAcademicPath("/api/v1/projects/1/submissions", OPTIONS),
    ).toBe(true);
    expect(isConfidentialAcademicPath("/api/v1/projects/1", OPTIONS)).toBe(
      false,
    );
    expect(
      isConfidentialAcademicPath("/api/v1/platform/submissions", OPTIONS),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Gate 5 — subscription permission policy
// ---------------------------------------------------------------------------

describe("evaluateSubscription (gate 5)", () => {
  const writeRequest = {
    method: "POST",
    path: "/api/v1/projects",
    options: OPTIONS,
  };
  const readRequest = { method: "GET", path: "/api/v1/projects", options: OPTIONS };

  it("enforces nothing while F-70 has not populated a status", () => {
    expect(() =>
      evaluateSubscription(sessionContext(), writeRequest),
    ).not.toThrow();
  });

  it("allows every operation while ACTIVE", () => {
    expect(() =>
      evaluateSubscription(
        sessionContext({ subscriptionStatus: SubscriptionStatus.ACTIVE }),
        writeRequest,
      ),
    ).not.toThrow();
  });

  it("allows writes during GRACE_PERIOD (OD-06 default)", () => {
    expect(() =>
      evaluateSubscription(
        sessionContext({ subscriptionStatus: SubscriptionStatus.GRACE_PERIOD }),
        writeRequest,
      ),
    ).not.toThrow();
  });

  it("allows reads when EXPIRED (FR-244 data preservation)", () => {
    expect(() =>
      evaluateSubscription(
        sessionContext({ subscriptionStatus: SubscriptionStatus.EXPIRED }),
        readRequest,
      ),
    ).not.toThrow();
    expect(() =>
      evaluateSubscription(
        sessionContext({ subscriptionStatus: SubscriptionStatus.EXPIRED }),
        { method: "HEAD", path: "/api/v1/projects", options: OPTIONS },
      ),
    ).not.toThrow();
  });

  it("blocks writes when EXPIRED with 402 SUBSCRIPTION_EXPIRED_RESTRICTED", () => {
    const error = expectDenial(
      () =>
        evaluateSubscription(
          sessionContext({ subscriptionStatus: SubscriptionStatus.EXPIRED }),
          writeRequest,
        ),
      "SUBSCRIPTION_EXPIRED_RESTRICTED",
    );
    expect((error as PepDenialError).gate).toBe("subscription");
    expect(error.status).toBe(402);
    expect(error.message).toContain("renew");
  });

  it("blocks writes for PENDING_PAYMENT and CANCELLED (fail-closed, OD-06)", () => {
    for (const status of [
      SubscriptionStatus.PENDING_PAYMENT,
      SubscriptionStatus.CANCELLED,
    ]) {
      expectDenial(
        () =>
          evaluateSubscription(
            sessionContext({ subscriptionStatus: status }),
            writeRequest,
          ),
        "SUBSCRIPTION_EXPIRED_RESTRICTED",
      );
    }
  });

  it("keeps an Institutional Admin's billing and renewal routes reachable when EXPIRED", () => {
    const admin = sessionContext({
      assignedRoles: [RoleCode.INSTITUTIONAL_ADMIN],
      activeRole: RoleCode.INSTITUTIONAL_ADMIN,
      mfaRequired: true,
      mfaVerified: true,
      subscriptionStatus: SubscriptionStatus.EXPIRED,
    });
    for (const path of [
      "/api/v1/billing/checkout",
      "/api/v1/subscriptions/renew",
      "/api/v1/payments/initiate",
      "/api/v1/invoices/123",
      "/api/v1/exports/archive",
    ]) {
      expect(() =>
        evaluateSubscription(admin, { method: "POST", path, options: OPTIONS }),
      ).not.toThrow();
    }
  });

  it("does not extend the billing carve-out to other roles", () => {
    expectDenial(
      () =>
        evaluateSubscription(
          sessionContext({ subscriptionStatus: SubscriptionStatus.EXPIRED }),
          { method: "POST", path: "/api/v1/billing/checkout", options: OPTIONS },
        ),
      "SUBSCRIPTION_EXPIRED_RESTRICTED",
    );
  });

  it("keeps non-billing writes blocked for an Institutional Admin", () => {
    const admin = sessionContext({
      assignedRoles: [RoleCode.INSTITUTIONAL_ADMIN],
      activeRole: RoleCode.INSTITUTIONAL_ADMIN,
      mfaRequired: true,
      mfaVerified: true,
      subscriptionStatus: SubscriptionStatus.EXPIRED,
    });
    expectDenial(
      () => evaluateSubscription(admin, writeRequest),
      "SUBSCRIPTION_EXPIRED_RESTRICTED",
    );
  });

  it("never gates Platform Admin sessions", () => {
    const platformAdmin = sessionContext({
      assignedRoles: [RoleCode.PLATFORM_ADMIN],
      activeRole: RoleCode.PLATFORM_ADMIN,
      institutionId: null,
      subscriptionStatus: SubscriptionStatus.EXPIRED,
    });
    expect(() =>
      evaluateSubscription(platformAdmin, writeRequest),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Path classification
// ---------------------------------------------------------------------------

describe("path classification", () => {
  it("exempts the auth flows without swallowing lookalike prefixes", () => {
    expect(isExemptPath("/api/v1/auth", OPTIONS)).toBe(true);
    expect(isExemptPath("/api/v1/auth/login", OPTIONS)).toBe(true);
    expect(isExemptPath("/api/v1/auth/mfa/verify", OPTIONS)).toBe(true);
    expect(isExemptPath("/api/v1/authorizations", OPTIONS)).toBe(false);
    expect(isExemptPath("/api/v1/projects", OPTIONS)).toBe(false);
  });

  it("enforces only the API prefix, with segment boundaries", () => {
    expect(isEnforcedPath("/api/v1/projects", OPTIONS)).toBe(true);
    expect(isEnforcedPath("/api/v1", OPTIONS)).toBe(true);
    expect(isEnforcedPath("/health", OPTIONS)).toBe(false);
    expect(isEnforcedPath("/api/v1x/projects", OPTIONS)).toBe(false);
  });

  it("recognises coordinator routes by prefix", () => {
    expect(isCoordinatorPath("/api/v1/coordinator", OPTIONS)).toBe(true);
    expect(isCoordinatorPath("/api/v1/coordinator/deadlines", OPTIONS)).toBe(
      true,
    );
    expect(isCoordinatorPath("/api/v1/coordinators", OPTIONS)).toBe(false);
  });
});
