export type SchedulePolicy = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  timezone: string | null;
  weekStartsOn: "SUNDAY" | "MONDAY" | "SATURDAY";
  standardHoursPerDay: number | null;
  standardHoursPerWeek: number | null;
  overtimeMode: "DISABLED" | "DAILY" | "WEEKLY" | "DAILY_AND_WEEKLY" | "CUSTOM";
  overtimeApprovalMode: "NONE" | "MANAGER" | "HR" | "WORKFLOW";
  overtimeMultiplier: number;
  allowSelfScheduling: boolean;
  allowOpenShiftPickup: boolean;
  allowManagerAssignment: boolean;
  allowHrAssignment: boolean;
};

export type WorkShift = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  startTime: string;
  endTime: string;
  durationMinutes: number;
  breakMinutes: number;
  paidBreak: boolean;
  crossesMidnight: boolean;
  timezone: string | null;
  color: string | null;
  isOvertimeEligible: boolean;
  requiresApproval: boolean;
  minHeadcount: number;
  maxHeadcount: number | null;
};

export type SchedulePeriod = {
  id: string;
  code: string;
  name: string;
  startsOn: string;
  endsOn: string;
  timezone: string | null;
  status: "DRAFT" | "PUBLISHED" | "LOCKED" | "ARCHIVED";
  publishedAt: string | null;
  lockedAt?: string | null;
};

export type ScheduleEmployee = {
  id: string;
  employeeNumber: string;
  person?: {
    firstName: string;
    lastName: string;
    preferredName: string | null;
  };
  assignments?: Array<{
    organizationNodeId?: string | null;
    costCenterId?: string | null;
    positionId?: string | null;
    managerEmployeeId?: string | null;
    organizationNode?: { id: string; name: string; code: string; type?: string } | null;
    costCenter?: { id: string; name: string; code: string } | null;
    position?: { id: string; title: string; code: string } | null;
    managerEmployee?: ScheduleEmployee | null;
  }>;
};

export type ScheduleAssignment = {
  id: string;
  scheduleId?: string | null;
  employeeId: string;
  shiftId?: string | null;
  policyId?: string | null;
  organizationNodeId?: string | null;
  costCenterId?: string | null;
  positionId?: string | null;
  managerEmployeeId?: string | null;
  employee?: ScheduleEmployee;
  shift?: WorkShift | null;
  policy?: SchedulePolicy | null;
  schedule?: SchedulePeriod | null;
  status: "DRAFT" | "ASSIGNED" | "CONFIRMED" | "DECLINED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  source: "HR_MANAGER" | "MANAGER" | "SELF_SERVICE" | "OPEN_SHIFT" | "OVERTIME";
  workDate: string;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  timezone: string | null;
  locationName: string | null;
  isOpenShift: boolean;
  isOvertime: boolean;
  overtimeMinutes: number;
  notes?: string | null;
  organizationNode?: { id: string; name: string; code: string } | null;
  costCenter?: { id: string; name: string; code: string } | null;
  position?: { id: string; title: string; code: string } | null;
};

export type ScheduleCoverageRule = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  policyId?: string | null;
  shiftId?: string | null;
  organizationNodeId?: string | null;
  costCenterId?: string | null;
  positionId?: string | null;
  policy?: SchedulePolicy | null;
  shift?: WorkShift | null;
  organizationNode?: { id: string; name: string; code: string; type?: string } | null;
  costCenter?: { id: string; name: string; code: string } | null;
  position?: { id: string; title: string; code: string } | null;
  weekdays: number[];
  startsAtTime?: string | null;
  endsAtTime?: string | null;
  timezone?: string | null;
  locationName?: string | null;
  requiredHeadcount: number;
  minimumHeadcount: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export type OpenShift = {
  id: string;
  scheduleId?: string | null;
  shiftId?: string | null;
  policyId?: string | null;
  organizationNodeId?: string | null;
  costCenterId?: string | null;
  positionId?: string | null;
  shift?: WorkShift | null;
  policy?: SchedulePolicy | null;
  status: "OPEN" | "CLAIMED" | "CANCELLED" | "EXPIRED";
  workDate: string;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  timezone: string | null;
  locationName: string | null;
  requiredHeadcount: number;
  claimedHeadcount: number;
  pickupRequiresApproval: boolean;
  expiresAt: string | null;
  notes?: string | null;
  organizationNode?: { id: string; name: string; code: string } | null;
  costCenter?: { id: string; name: string; code: string } | null;
  position?: { id: string; title: string; code: string } | null;
  claims?: OpenShiftClaim[];
};

export type OpenShiftClaim = {
  id: string;
  openShiftId: string;
  employeeId: string;
  employee?: ScheduleEmployee;
  openShift?: OpenShift;
  assignment?: ScheduleAssignment | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  requestedAt: string;
  decidedAt: string | null;
  note: string | null;
};

export type OvertimeRequest = {
  id: string;
  employee?: ScheduleEmployee;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  approvalMode: "NONE" | "MANAGER" | "HR" | "WORKFLOW";
  requestDate: string;
  startsAt: string;
  endsAt: string;
  minutes: number;
  multiplier: number | null;
  reason: string | null;
  decisionNote: string | null;
};

export type ScheduleSwapRequest = {
  id: string;
  tenantId: string;
  assignmentId: string;
  requesterEmployeeId: string;
  targetEmployeeId?: string | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  reason?: string | null;
  decisionNote?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
  completedAt?: string | null;
  assignment?: ScheduleAssignment | null;
  requesterEmployee?: ScheduleEmployee | null;
  targetEmployee?: ScheduleEmployee | null;
  decidedBy?: { id: string; email: string; username?: string | null } | null;
  metadata?: Record<string, unknown> | null;
};

export type EmployeeAvailability = {
  id: string;
  employee?: ScheduleEmployee;
  date: string;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  status: "AVAILABLE" | "PREFERRED" | "UNAVAILABLE";
  reason: string | null;
};

export type PaginatedSchedule<T> = {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
  };
};

export type SchedulingSummary = {
  activePolicy: SchedulePolicy;
  metrics: {
    shifts: number;
    periods: number;
    assignmentsToday: number;
    openShifts: number;
    pendingClaims: number;
    pendingOvertime: number;
    unavailableToday: number;
  };
  upcomingAssignments: ScheduleAssignment[];
  capabilities: {
    tenantScheduling: boolean;
    teamScheduling: boolean;
    selfScheduling: boolean;
    overtimeEnabled: boolean;
    openShiftPickup: boolean;
  };
};

export type PlannerDaySummary = {
  date: string;
  assignmentCount: number;
  openShiftCount: number;
  openShiftSlots: number;
  claimedOpenShiftSlots: number;
  coverageRuleCount: number;
  coverageRequiredHeadcount: number;
  coverageMinimumHeadcount: number;
  coverageGap: number;
  availabilityCount: number;
  availableCount: number;
  preferredCount: number;
  unavailableCount: number;
};

export type SchedulePlannerSummary = {
  from: string;
  to: string;
  days: PlannerDaySummary[];
  totals: Omit<PlannerDaySummary, "date"> & {
    pendingClaimCount: number;
    approvedClaimCount: number;
    rejectedClaimCount: number;
  };
};

export type MyScheduleWorkspace = {
  employee: ScheduleEmployee;
  assignments: PaginatedSchedule<ScheduleAssignment>;
  openShifts: PaginatedSchedule<OpenShift>;
  openShiftClaims: PaginatedSchedule<OpenShiftClaim>;
  overtime: PaginatedSchedule<OvertimeRequest>;
  availability: PaginatedSchedule<EmployeeAvailability>;
};
