export type WorkflowStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type WorkflowStepType = "APPROVAL" | "REVIEW" | "NOTIFICATION" | "SYSTEM_ACTION";
export type ApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "WITHDRAWN" | "COMPLETED";
export type ApprovalActionType =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "RETURNED"
  | "COMMENTED"
  | "DELEGATED"
  | "CANCELLED";

export type WorkflowStep = {
  id: string;
  workflowId: string;
  stepOrder: number;
  name: string;
  type: WorkflowStepType;
  isRequired: boolean;
  allowDelegation: boolean;
  slaHours?: number | null;
  approverRole?: {
    id: string;
    code: string;
    name: string;
    scope?: string;
  } | null;
  approverUser?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
};

export type Workflow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  module: string;
  status: WorkflowStatus;
  triggerKey?: string | null;
  steps: WorkflowStep[];
  _count?: {
    requests: number;
  };
};

export type ApprovalRequest = {
  id: string;
  tenantId: string;
  workflowId?: string | null;
  module: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string | null;
  status: ApprovalRequestStatus;
  submittedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  workflow?: Pick<Workflow, "id" | "code" | "name" | "module" | "status"> | null;
  submittedBy?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
  steps?: ApprovalStepInstance[];
  actions?: ApprovalAction[];
  workforceActions?: Array<{
    id: string;
    type: string;
    status: string;
    employeeId?: string | null;
  }>;
};

export type ApprovalStepInstance = {
  id: string;
  approvalRequestId: string;
  workflowStepId?: string | null;
  stepOrder: number;
  name: string;
  status: ApprovalRequestStatus;
  dueAt?: string | null;
  completedAt?: string | null;
  assignedUser?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
  assignedRole?: {
    id: string;
    code: string;
    name: string;
  } | null;
  actions?: ApprovalAction[];
  approvalRequest?: ApprovalRequest;
};

export type ApprovalAction = {
  id: string;
  approvalRequestId: string;
  stepInstanceId?: string | null;
  actorUserId?: string | null;
  action: ApprovalActionType;
  comment?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  actorUser?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
};

export type Delegation = {
  id: string;
  module?: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  reason?: string | null;
  fromUser?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
  toUser?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
};

export type PaginatedWorkflows = {
  data: Workflow[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedApprovalRequests = {
  data: ApprovalRequest[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedApprovalTasks = {
  data: ApprovalStepInstance[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedDelegations = {
  data: Delegation[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};
