import { z } from "zod";

import {
  AssessmentSubmissionStatus,
  ProjectLifecycleStatus,
  ProjectMilestoneState,
  ResultApprovalStatus,
  RoleCode,
  SubscriptionStatus,
  TenantStatus,
  TopicProposalStatus,
} from "../enums/contracts.js";

export const roleCodeSchema = z.enum(RoleCode);

export const tenantStatusSchema = z.enum(TenantStatus);

export const subscriptionStatusSchema = z.enum(SubscriptionStatus);

export const projectLifecycleStatusSchema = z.enum(ProjectLifecycleStatus);

export const topicProposalStatusSchema = z.enum(TopicProposalStatus);

export const projectMilestoneStateSchema = z.enum(ProjectMilestoneState);

export const assessmentSubmissionStatusSchema = z.enum(
  AssessmentSubmissionStatus
);

export const resultApprovalStatusSchema = z.enum(ResultApprovalStatus);
