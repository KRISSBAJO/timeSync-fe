import type { AuthUser } from "@/lib/api/types";
import type { ScheduleEmployee } from "@/lib/scheduling/types";

export type RecruitmentControlStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type RecruitmentRequisitionStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "OPEN" | "ON_HOLD" | "CLOSED" | "CANCELLED" | "REJECTED";
export type RecruitmentEmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY" | "INTERN" | "PER_DIEM";
export type RecruitmentWorkMode = "ONSITE" | "HYBRID" | "REMOTE";
export type RecruitmentCandidateStatus = "ACTIVE" | "DO_NOT_CONTACT" | "HIRED" | "ARCHIVED";
export type RecruitmentApplicationStatus = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED" | "WITHDRAWN";
export type RecruitmentStageType = "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED" | "WITHDRAWN" | "CUSTOM";
export type RecruitmentInterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type RecruitmentFeedbackRecommendation = "STRONG_YES" | "YES" | "MIXED" | "NO" | "STRONG_NO";
export type RecruitmentOfferStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "EXTENDED" | "ACCEPTED" | "DECLINED" | "REJECTED" | "WITHDRAWN";

export type PaginatedRecruitment<T> = {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
  };
};

export type RecruitmentApprovalRequest = {
  id: string;
  status: string;
  workflow?: {
    id: string;
    code: string;
    name: string;
    module: string;
    status: string;
    triggerKey?: string | null;
  } | null;
  steps?: Array<{
    id: string;
    stepOrder: number;
    name: string;
    status: string;
    assignedUser?: Pick<AuthUser, "id" | "email" | "username"> | null;
    assignedRole?: {
      id: string;
      code: string;
      name: string;
    } | null;
  }>;
};

export type RecruitmentPosition = {
  id: string;
  code: string;
  title: string;
};

export type RecruitmentPipelineStage = {
  id: string;
  requisitionId: string;
  name: string;
  type: RecruitmentStageType;
  sequence: number;
  isTerminal: boolean;
};

export type RecruitmentRequisition = {
  id: string;
  code: string;
  title: string;
  departmentName?: string | null;
  locationName?: string | null;
  headcount: number;
  status: RecruitmentRequisitionStatus;
  employmentType: RecruitmentEmploymentType;
  workMode: RecruitmentWorkMode;
  priority: number;
  targetStartDate?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  salaryMinCents?: number | null;
  salaryMaxCents?: number | null;
  currencyCode: string;
  description?: string | null;
  requirements?: string | null;
  position?: RecruitmentPosition | null;
  hiringManager?: ScheduleEmployee | null;
  recruiter?: ScheduleEmployee | null;
  approvalRequest?: RecruitmentApprovalRequest | null;
  stages?: RecruitmentPipelineStage[];
  applications?: RecruitmentApplication[];
  _count?: { applications: number };
};

export type RecruitmentCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  status: RecruitmentCandidateStatus;
  currentEmployer?: string | null;
  currentTitle?: string | null;
  locationName?: string | null;
  resumeUrl?: string | null;
  tags: string[];
  applications?: RecruitmentApplication[];
};

export type RecruitmentApplication = {
  id: string;
  candidateId: string;
  requisitionId: string;
  currentStageId?: string | null;
  status: RecruitmentApplicationStatus;
  source?: string | null;
  appliedAt: string;
  lastActivityAt: string;
  rejectedAt?: string | null;
  hiredAt?: string | null;
  decisionReason?: string | null;
  score?: number | null;
  candidate?: RecruitmentCandidate | null;
  requisition?: RecruitmentRequisition | null;
  currentStage?: RecruitmentPipelineStage | null;
  interviews?: RecruitmentInterview[];
  offers?: RecruitmentOffer[];
};

export type RecruitmentInterview = {
  id: string;
  applicationId: string;
  stageId?: string | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timezone: string;
  locationName?: string | null;
  meetingUrl?: string | null;
  status: RecruitmentInterviewStatus;
  interviewerIds: string[];
  notes?: string | null;
  application?: RecruitmentApplication | null;
  stage?: RecruitmentPipelineStage | null;
  feedback?: RecruitmentInterviewFeedback[];
};

export type RecruitmentInterviewFeedback = {
  id: string;
  interviewId: string;
  applicationId: string;
  reviewerUserId?: string | null;
  reviewer?: Pick<AuthUser, "id" | "email" | "username"> | null;
  rating?: number | null;
  recommendation: RecruitmentFeedbackRecommendation;
  strengths?: string | null;
  concerns?: string | null;
  notes?: string | null;
  submittedAt: string;
};

export type RecruitmentOffer = {
  id: string;
  applicationId: string;
  approvalRequestId?: string | null;
  status: RecruitmentOfferStatus;
  basePayCents?: number | null;
  currencyCode: string;
  startDate?: string | null;
  expiresAt?: string | null;
  decisionNote?: string | null;
  submittedAt?: string | null;
  decidedAt?: string | null;
  extendedAt?: string | null;
  acceptedAt?: string | null;
  application?: RecruitmentApplication | null;
  approvalRequest?: RecruitmentApprovalRequest | null;
};

export type RecruitmentApprovalRule = {
  id: string;
  code: string;
  name: string;
  status: RecruitmentControlStatus;
  priority: number;
  workflowId?: string | null;
  workflowCode?: string | null;
  triggerKey: string;
  employmentType?: RecruitmentEmploymentType | null;
  minHeadcount?: number | null;
  maxHeadcount?: number | null;
};

export type RecruitmentSummary = {
  generatedAt: string;
  metrics: {
    openRequisitions: number;
    pendingRequisitionApprovals: number;
    activeCandidates: number;
    activeApplications: number;
    interviewsToday: number;
    pendingOffers: number;
  };
  requisitions: RecruitmentRequisition[];
  permissions: {
    readRecruitment: boolean;
    manageRecruitment: boolean;
    approveRecruitment: boolean;
    submitInterviewFeedback: boolean;
    manageOffers: boolean;
    readReports: boolean;
  };
};

export type RecruitmentReports = {
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  metrics: {
    requisitionsOpened: number;
    applications: number;
    interviews: number;
    offers: number;
    hires: number;
    rejectedApplications: number;
  };
  sourceBreakdown: Array<{ source: string; count: number }>;
  requisitions: RecruitmentRequisition[];
  applications: RecruitmentApplication[];
  interviews: RecruitmentInterview[];
  offers: RecruitmentOffer[];
};

export type RecruitmentPageFilters = {
  tab?: string;
  search?: string;
  status?: string;
  requisitionId?: string;
  candidateId?: string;
  applicationId?: string;
  from?: string;
  to?: string;
};

export type RecruitmentHistoryActor = Pick<AuthUser, "id" | "email" | "username"> | null;

export type RecruitmentTimelineEvent = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
  actor?: RecruitmentHistoryActor;
  createdAt: string;
};

export type RecruitmentAuditEvent = {
  id: string;
  action: string;
  module: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  actor?: RecruitmentHistoryActor;
  createdAt: string;
};

export type RecruitmentDetailResponse<T> = {
  record: T;
  timeline: RecruitmentTimelineEvent[];
  audit: RecruitmentAuditEvent[];
};
