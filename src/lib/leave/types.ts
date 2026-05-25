import type { AuthUser } from "@/lib/api/types";
import type { ScheduleEmployee } from "@/lib/scheduling/types";

export type LeavePolicyStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type LeaveTypeUnit = "DAYS" | "HOURS";
export type LeaveCalendarDayType = "HOLIDAY" | "NON_WORKING_DAY" | "SPECIAL_WORKDAY";
export type LeaveBlackoutSeverity = "WARN" | "BLOCK";
export type LeaveRequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "WITHDRAWN"
  | "TAKEN"
  | "REVERSED";
export type LeaveLedgerEntryType =
  | "OPENING_BALANCE"
  | "ACCRUAL"
  | "CARRYOVER"
  | "EXPIRY"
  | "CREDIT_ADJUSTMENT"
  | "DEBIT_ADJUSTMENT"
  | "REQUESTED"
  | "APPROVED_USAGE"
  | "CANCELLED_RESTORE"
  | "REVERSAL";

export type PaginatedLeave<T> = {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
  };
};

export type LeaveType = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: string;
  unit: LeaveTypeUnit;
  status: LeavePolicyStatus;
  paid: boolean;
  requiresDocumentation: boolean;
  color?: string | null;
};

export type LeavePolicy = {
  id: string;
  leaveTypeId: string;
  code: string;
  name: string;
  description?: string | null;
  status: LeavePolicyStatus;
  eligibilityDays: number;
  annualAllowanceMinutes: number;
  accrualMethod: string;
  accrualRateMinutes?: number | null;
  maxBalanceMinutes?: number | null;
  carryoverLimitMinutes?: number | null;
  allowNegativeBalance: boolean;
  negativeBalanceLimitMinutes: number;
  minimumRequestMinutes: number;
  maximumRequestMinutes?: number | null;
  requiresApproval: boolean;
  workflowCode?: string | null;
  workflowTriggerKey: string;
  leaveType?: LeaveType | null;
};

export type LeaveApprovalRule = {
  id: string;
  code: string;
  name: string;
  status: LeavePolicyStatus;
  priority: number;
  leaveTypeId?: string | null;
  policyId?: string | null;
  workflowId?: string | null;
  workflowCode?: string | null;
  triggerKey: string;
  minMinutes?: number | null;
  maxMinutes?: number | null;
  leaveType?: LeaveType | null;
  policy?: LeavePolicy | null;
  workflow?: {
    id: string;
    code: string;
    name: string;
    status: string;
    module: string;
    triggerKey?: string | null;
  } | null;
};

export type LeaveCalendar = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  timezone?: string | null;
  status: LeavePolicyStatus;
  isDefault: boolean;
  workWeekdays: number[];
  defaultWorkdayMinutes: number;
  countryCode?: string | null;
  regionCode?: string | null;
  days?: LeaveCalendarDay[];
  blackoutWindows?: LeaveBlackoutWindow[];
};

export type LeaveCalendarDay = {
  id: string;
  tenantId: string;
  calendarId: string;
  date: string;
  name: string;
  type: LeaveCalendarDayType;
  paid: boolean;
  workdayMinutes?: number | null;
  calendar?: LeaveCalendar | null;
};

export type LeaveBlackoutWindow = {
  id: string;
  calendarId?: string | null;
  leaveTypeId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  severity: LeaveBlackoutSeverity;
  status: LeavePolicyStatus;
  calendar?: LeaveCalendar | null;
  leaveType?: LeaveType | null;
};

export type LeaveBalance = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  policyId?: string | null;
  balanceMinutes: number;
  accruedMinutes: number;
  usedMinutes: number;
  pendingMinutes: number;
  carryoverMinutes: number;
  asOfDate: string;
  employee?: ScheduleEmployee | null;
  leaveType?: LeaveType | null;
  policy?: LeavePolicy | null;
};

export type LeaveLedgerEntry = {
  id: string;
  requestId?: string | null;
  type: LeaveLedgerEntryType;
  minutes: number;
  effectiveAt: string;
  reason?: string | null;
};

export type LeaveApprovalRequest = {
  id: string;
  status: string;
  workflow?: {
    id: string;
    code: string;
    name: string;
    module: string;
    status: string;
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

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  policyId?: string | null;
  calendarId?: string | null;
  approvalRequestId?: string | null;
  status: LeaveRequestStatus;
  startAt: string;
  endAt: string;
  requestedMinutes: number;
  businessMinutes: number;
  paidMinutes: number;
  unpaidMinutes: number;
  reason: string;
  notes?: string | null;
  supportingDocumentUrl?: string | null;
  submittedAt?: string | null;
  decidedAt?: string | null;
  employee?: ScheduleEmployee | null;
  leaveType?: LeaveType | null;
  policy?: LeavePolicy | null;
  calendar?: LeaveCalendar | null;
  calendarSnapshot?: Record<string, unknown> | null;
  coverageSnapshot?: Record<string, unknown> | null;
  approvalRequest?: LeaveApprovalRequest | null;
  ledgerEntries?: LeaveLedgerEntry[];
};

export type LeaveSummary = {
  generatedAt: string;
  metrics: {
    pendingRequests: number;
    approvedUpcoming: number;
    activeTypes: number;
    balanceRows: number;
  };
  balances: LeaveBalance[];
  permissions: {
    selfLeave: boolean;
    teamLeave: boolean;
    manageLeave: boolean;
    approveLeave: boolean;
    managePolicies: boolean;
    readReports: boolean;
  };
};

export type MyLeaveWorkspace = {
  employee: ScheduleEmployee;
  balances: LeaveBalance[];
  requests: LeaveRequest[];
};

export type LeaveCalendarView = {
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  calendars: LeaveCalendar[];
  days: LeaveCalendarDay[];
  blackoutWindows: LeaveBlackoutWindow[];
  requests: LeaveRequest[];
};

export type LeaveReports = {
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  metrics: {
    requestCount: number;
    approvedMinutes: number;
    pendingRequests: number;
    pendingOverdue: number;
    balanceLiabilityMinutes: number;
    coverageRisks: number;
  };
  usageByType: Array<{
    leaveTypeId: string;
    leaveTypeName: string;
    approvedMinutes: number;
    pendingMinutes: number;
    requestCount: number;
  }>;
  balances: LeaveBalance[];
  upcoming: LeaveRequest[];
  coverageRiskRequests: LeaveRequest[];
};

export type LeavePageFilters = {
  tab?: string;
  from?: string;
  to?: string;
  employeeId?: string;
  employeeSearch?: string;
  leaveTypeId?: string;
  status?: string;
  calendarId?: string;
};
