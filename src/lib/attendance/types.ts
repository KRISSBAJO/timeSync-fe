import type {
  ScheduleAssignment,
  ScheduleEmployee,
  SchedulePeriod,
  SchedulePolicy,
} from "@/lib/scheduling/types";

export type AttendancePolicyStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type AttendancePunchType = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";
export type AttendanceSource = "WEB" | "MOBILE" | "KIOSK" | "MANUAL" | "IMPORT" | "SYSTEM";
export type AttendanceRecordStatus = "OPEN" | "COMPLETED" | "FLAGGED" | "VOIDED";
export type AttendanceExceptionType =
  | "LATE_ARRIVAL"
  | "EARLY_DEPARTURE"
  | "MISSED_CLOCK_IN"
  | "MISSED_CLOCK_OUT"
  | "MISSED_BREAK"
  | "ABSENCE"
  | "UNSCHEDULED_WORK"
  | "OVERTIME"
  | "UNAPPROVED_LOCATION"
  | "OUTSIDE_GEOFENCE"
  | "MANUAL_ADJUSTMENT";
export type AttendanceExceptionStatus =
  | "OPEN"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "WAIVED"
  | "RESOLVED"
  | "CANCELLED";
export type AttendanceTimesheetStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "LOCKED"
  | "REOPENED";
export type AttendanceTimesheetEntryStatus = "DRAFT" | "READY" | "EXCEPTION" | "APPROVED" | "REJECTED" | "LOCKED";
export type AttendanceCorrectionRequestStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "APPLIED";
export type AttendancePayrollExportStatus = "GENERATED" | "LOCKED" | "SUPERSEDED";
export type AttendanceControlStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type AttendanceClockDeviceType = "KIOSK" | "TRUSTED_DEVICE" | "MOBILE_DEVICE" | "WEB_TERMINAL";
export type AttendanceKioskCredentialStatus = "ACTIVE" | "INACTIVE" | "REVOKED";
export type AttendancePremiumRuleType = "HOLIDAY" | "WEEKEND" | "NIGHT" | "SHIFT_DIFFERENTIAL" | "CUSTOM";
export type AttendanceOfflinePunchStatus = "PENDING" | "APPLIED" | "REJECTED" | "DUPLICATE";
export type AttendanceSupervisorBoardStatus =
  | "SCHEDULED"
  | "CLOCKED_IN"
  | "ON_BREAK"
  | "COMPLETED"
  | "ABSENT"
  | "LATE"
  | "EXCEPTION"
  | "NEEDS_REVIEW"
  | "ON_LEAVE"
  | "UNSCHEDULED";

export type AttendancePolicyViolation = {
  code: string;
  severity: "BLOCK" | "WARN";
  message: string;
  field?: string;
};

export type AttendancePolicyEvaluation = {
  operation: string;
  policyId: string;
  accepted: boolean;
  violations: AttendancePolicyViolation[];
  warnings: AttendancePolicyViolation[];
};

export type PaginatedAttendance<T> = {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
  };
};

export type AttendancePolicy = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: AttendancePolicyStatus;
  timezone: string | null;
  allowWebClockIn: boolean;
  allowMobileClockIn: boolean;
  allowKioskClockIn: boolean;
  requireScheduleForClockIn: boolean;
  requireLocationCapture: boolean;
  requireKnownDevice: boolean;
  requireGeofenceForClockIn: boolean;
  blockOutsideGeofence: boolean;
  geofenceGraceMeters: number;
  requirePhotoAttestation: boolean;
  requireAttestationNote: boolean;
  allowOfflinePunchSync: boolean;
  offlinePunchGraceMinutes: number;
  allowManualAdjustments: boolean;
  autoCreateTimesheetEntries: boolean;
  graceMinutesLate: number;
  graceMinutesEarlyLeave: number;
  roundingMinutes: number;
  maxShiftMinutes: number;
  dailyOvertimeMinutes: number | null;
  weeklyOvertimeMinutes: number | null;
  breakRequiredAfterMinutes: number | null;
  breakDurationMinutes: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AttendancePunch = {
  id: string;
  employeeId: string;
  attendanceRecordId: string;
  scheduleAssignmentId?: string | null;
  type: AttendancePunchType;
  occurredAt: string;
  timezone?: string | null;
  source: AttendanceSource;
  deviceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AttendanceBreak = {
  id: string;
  employeeId: string;
  attendanceRecordId: string;
  startedAt: string;
  endedAt?: string | null;
  minutes: number;
  source: AttendanceSource;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  scheduleAssignmentId?: string | null;
  policyId?: string | null;
  workDate: string;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  actualClockInAt?: string | null;
  actualClockOutAt?: string | null;
  firstPunchAt?: string | null;
  lastPunchAt?: string | null;
  breakMinutes: number;
  scheduledMinutes: number;
  actualMinutes: number;
  payableMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  status: AttendanceRecordStatus;
  source: AttendanceSource;
  timezone?: string | null;
  locationName?: string | null;
  deviceId?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  employee?: ScheduleEmployee | null;
  scheduleAssignment?: ScheduleAssignment | null;
  policy?: AttendancePolicy | null;
  punches?: AttendancePunch[];
  breaks?: AttendanceBreak[];
  exceptions?: AttendanceException[];
};

export type AttendanceException = {
  id: string;
  employeeId: string;
  attendanceRecordId?: string | null;
  scheduleAssignmentId?: string | null;
  type: AttendanceExceptionType;
  status: AttendanceExceptionStatus;
  occurredAt: string;
  minutes?: number | null;
  title: string;
  description?: string | null;
  decisionNote?: string | null;
  decidedAt?: string | null;
  employee?: ScheduleEmployee | null;
  attendanceRecord?: AttendanceRecord | null;
  scheduleAssignment?: ScheduleAssignment | null;
};

export type AttendanceTimesheetEntry = {
  id: string;
  employeeId: string;
  timesheetId: string;
  attendanceRecordId?: string | null;
  scheduleAssignmentId?: string | null;
  workDate: string;
  scheduledMinutes: number;
  actualMinutes: number;
  breakMinutes: number;
  payableMinutes: number;
  overtimeMinutes: number;
  exceptionCount: number;
  status: AttendanceTimesheetEntryStatus;
  attendanceRecord?: AttendanceRecord | null;
  scheduleAssignment?: ScheduleAssignment | null;
};

export type AttendanceTimesheet = {
  id: string;
  employeeId: string;
  policyId?: string | null;
  periodStart: string;
  periodEnd: string;
  status: AttendanceTimesheetStatus;
  regularMinutes: number;
  overtimeMinutes: number;
  breakMinutes: number;
  exceptionCount: number;
  submittedAt?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
  employee?: ScheduleEmployee | null;
  policy?: AttendancePolicy | null;
  entries?: AttendanceTimesheetEntry[];
};

export type AttendanceCorrectionRequest = {
  id: string;
  tenantId: string;
  employeeId: string;
  attendanceRecordId?: string | null;
  scheduleAssignmentId?: string | null;
  policyId?: string | null;
  requestedById?: string | null;
  decidedById?: string | null;
  appliedById?: string | null;
  appliedRecordId?: string | null;
  status: AttendanceCorrectionRequestStatus;
  workDate: string;
  requestedClockInAt?: string | null;
  requestedClockOutAt?: string | null;
  requestedBreakMinutes?: number | null;
  requestedLocationName?: string | null;
  requestedNotes?: string | null;
  reason: string;
  supportingDocumentUrl?: string | null;
  decisionNote?: string | null;
  previousSnapshot?: Record<string, unknown> | null;
  requestedSnapshot?: Record<string, unknown> | null;
  policySnapshot?: Record<string, unknown> | null;
  policyViolations?: AttendancePolicyEvaluation | null;
  requestedAt: string;
  decidedAt?: string | null;
  appliedAt?: string | null;
  employee?: ScheduleEmployee | null;
  attendanceRecord?: AttendanceRecord | null;
  appliedRecord?: AttendanceRecord | null;
  scheduleAssignment?: ScheduleAssignment | null;
  policy?: AttendancePolicy | null;
};

export type AttendanceSupervisorBoardRow = {
  employeeId: string;
  employee?: ScheduleEmployee | null;
  workDate: string;
  status: AttendanceSupervisorBoardStatus;
  statusLabel: string;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  actualClockInAt?: string | null;
  actualClockOutAt?: string | null;
  scheduledMinutes: number;
  actualMinutes: number;
  breakMinutes: number;
  payableMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  assignmentCount: number;
  recordCount: number;
  exceptionCount: number;
  pendingCorrectionCount: number;
  leaveCount: number;
  assignments: ScheduleAssignment[];
  records: AttendanceRecord[];
  record?: AttendanceRecord | null;
  exceptions: AttendanceException[];
  correctionRequests: AttendanceCorrectionRequest[];
  leaveRequests: Array<{
    id: string;
    status: string;
    startAt: string;
    endAt: string;
    reason: string;
    leaveType?: {
      id: string;
      name: string;
      code: string;
    } | null;
  }>;
};

export type AttendanceSupervisorBoard = {
  date: string;
  generatedAt: string;
  metrics: {
    scheduled: number;
    present: number;
    clockedIn: number;
    onBreak: number;
    completed: number;
    absent: number;
    late: number;
    exceptions: number;
    pendingCorrections: number;
    onLeave: number;
    unscheduled: number;
  };
  rows: AttendanceSupervisorBoardRow[];
};

export type AttendancePayrollExport = {
  id: string;
  employeeId?: string | null;
  status: AttendancePayrollExportStatus;
  periodStart: string;
  periodEnd: string;
  format: string;
  fileName: string;
  rowCount: number;
  regularMinutes: number;
  overtimeMinutes: number;
  breakMinutes: number;
  grossPayableMinutes: number;
  lockedTimesheetIds: string[];
  exportedById?: string | null;
  lockedById?: string | null;
  exportedAt: string;
  lockedAt?: string | null;
  createdAt: string;
  employee?: ScheduleEmployee | null;
  metadata?: Record<string, unknown> | null;
};

export type AttendancePayrollExportResult = {
  export: AttendancePayrollExport;
  fileName: string;
  contentType: string;
  rowCount: number;
	totals: {
	  employeeCount: number;
	  timesheetCount: number;
	  rowCount: number;
	  regularMinutes: number;
	  overtimeMinutes: number;
	  breakMinutes: number;
	  grossPayableMinutes: number;
	  premiumMinutes: number;
	  premiumUnits: number;
	  exceptionCount: number;
	};
  csv: string;
};

export type AttendanceGeofence = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  status: AttendanceControlStatus;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  locationName?: string | null;
  organizationNodeId?: string | null;
  costCenterId?: string | null;
  positionId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  devices?: AttendanceClockDevice[];
};

export type AttendanceClockDevice = {
  id: string;
  tenantId: string;
  geofenceId?: string | null;
  employeeId?: string | null;
  type: AttendanceClockDeviceType;
  status: AttendanceControlStatus;
  deviceId: string;
  name: string;
  description?: string | null;
  locationName?: string | null;
  lastSeenAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  geofence?: AttendanceGeofence | null;
  employee?: ScheduleEmployee | null;
};

export type AttendanceKioskCredential = {
  id: string;
  tenantId: string;
  employeeId: string;
  badgeNumber: string;
  status: AttendanceKioskCredentialStatus;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  employee?: ScheduleEmployee | null;
};

export type AttendanceHoliday = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  date: string;
  status: AttendanceControlStatus;
  paid: boolean;
  multiplier: number;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendancePremiumRule = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: AttendancePremiumRuleType;
  status: AttendanceControlStatus;
  multiplier: number;
  startsAtMinute?: number | null;
  endsAtMinute?: number | null;
  weekdays: number[];
  organizationNodeId?: string | null;
  costCenterId?: string | null;
  positionId?: string | null;
  locationName?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceOfflineSyncResult = {
  syncedAt: string;
  summary: {
    received: number;
    applied: number;
    duplicate: number;
    rejected: number;
  };
  results: Array<{
    id: string;
    clientMutationId: string;
    status: AttendanceOfflinePunchStatus;
    appliedPunchId?: string | null;
    rejectionReason?: string | null;
  }>;
};

export type AttendanceReconciliationResult = {
  dryRun: boolean;
  range: {
    from: string;
    to: string;
  };
  summary: {
    evaluated: number;
    matched: number;
    alreadyMatched: number;
    lowConfidence: number;
    unmatched: number;
    applied: number;
  };
  results: Array<{
    recordId: string;
    employeeId: string;
    workDate: string;
    action: string;
    currentScheduleAssignmentId?: string | null;
    matchedScheduleAssignmentId?: string | null;
    matchedShiftName?: string | null;
    confidence: number;
    reason: string;
    startDeltaMinutes?: number | null;
    endDeltaMinutes?: number | null;
  }>;
};

export type AttendanceReportBreakdown = {
  key: string;
  count: number;
};

export type AttendanceAdvancedReport = {
  range: {
    from: string;
    to: string;
  };
  generatedAt: string;
  totals: {
    recordCount: number;
    scheduledMinutes: number;
    actualMinutes: number;
    payableMinutes: number;
    overtimeMinutes: number;
    breakMinutes: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
  };
  metrics: {
    scheduledAssignments: number;
    completedRecords: number;
    openRecords: number;
    openExceptions: number;
    pendingCorrections: number;
    payrollBlockers: number;
    totalPunches: number;
    missingDevicePunches: number;
    knownDevicePunches: number;
    kioskPunches: number;
    mobilePunches: number;
    outsideGeofenceExceptions: number;
    unapprovedLocationExceptions: number;
  };
  breakdowns: {
    recordStatus: AttendanceReportBreakdown[];
    source: AttendanceReportBreakdown[];
    exceptionType: AttendanceReportBreakdown[];
    exceptionStatus: AttendanceReportBreakdown[];
    correctionStatus: AttendanceReportBreakdown[];
    timesheetStatus: AttendanceReportBreakdown[];
  };
  payrollReadiness: {
    timesheetCount: number;
    readyTimesheets: number;
    pendingCorrections: number;
    openExceptions: number;
    blockerCount: number;
  };
  controlReadiness: {
    geofenceCount: number;
    activeGeofences: number;
    deviceCount: number;
    activeDevices: number;
    kioskDevices: number;
    lastDeviceSeenAt?: string | null;
  };
  trends: {
    byDay: Array<{
      date: string;
      scheduledAssignments: number;
      records: number;
      exceptions: number;
      scheduledMinutes: number;
      actualMinutes: number;
      payableMinutes: number;
      overtimeMinutes: number;
      lateMinutes: number;
    }>;
  };
  topEmployees: AttendanceRiskEmployee[];
};

export type AttendanceRiskEmployee = {
  employeeId: string;
  employee?: ScheduleEmployee | null;
  employeeName: string;
  score: number;
  signals: Record<string, number>;
};

export type AttendancePredictiveAlert = {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number;
  employeeId: string;
  employee?: ScheduleEmployee | null;
  title: string;
  body: string;
  recommendedAction: string;
  signals: Record<string, number>;
};

export type AttendancePredictiveAlerts = {
  range: {
    from: string;
    to: string;
  };
  generatedAt: string;
  summary: {
    alertCount: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  alerts: AttendancePredictiveAlert[];
};

export type AttendanceSummary = {
  policy: AttendancePolicy;
  metrics: {
    scheduledToday: number;
    clockedInNow: number;
    completedToday: number;
    openExceptions: number;
    pendingCorrections: number;
    pendingTimesheets: number;
    lateToday: number;
    missedClockIns: number;
  };
  recentRecords: AttendanceRecord[];
  generatedAt: string;
  permissions: {
    tenantAttendance: boolean;
    teamAttendance: boolean;
    selfAttendance: boolean;
    approveExceptions: boolean;
    approveTimesheets: boolean;
    approveCorrections: boolean;
    manageControls?: boolean;
    readReports?: boolean;
  };
};

export type MyAttendanceWorkspace = {
  employee: ScheduleEmployee;
  activeRecord: AttendanceRecord | null;
  todayAssignments: ScheduleAssignment[];
  records: PaginatedAttendance<AttendanceRecord>;
  exceptions: AttendanceException[];
  correctionRequests: AttendanceCorrectionRequest[];
  timesheets: AttendanceTimesheet[];
};

export type AttendancePageFilters = {
  tab: string;
  from: string;
  to: string;
  status: string;
  employeeId: string;
  employeeSearch: string;
  organizationNodeId: string;
  costCenterId: string;
  positionId: string;
  locationName: string;
  exceptionStatus: string;
  exceptionType: string;
  timesheetStatus: string;
  correctionStatus: string;
  controlStatus: string;
  deviceType: string;
};

export type AttendanceContextOptions = {
  employees: ScheduleEmployee[];
  periods: SchedulePeriod[];
  schedulingPolicies: SchedulePolicy[];
};
