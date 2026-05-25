import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { AttendanceCommandCenter } from "@/components/attendance/attendance-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import type {
  AttendanceAdvancedReport,
  AttendanceClockDevice,
  AttendanceCorrectionRequest,
  AttendanceException,
  AttendanceGeofence,
  AttendanceHoliday,
  AttendanceKioskCredential,
  AttendancePageFilters,
  AttendancePayrollExport,
  AttendancePolicy,
  AttendancePremiumRule,
  AttendancePredictiveAlerts,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceSupervisorBoard,
  AttendanceTimesheet,
  MyAttendanceWorkspace,
  PaginatedAttendance,
} from "@/lib/attendance/types";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type { ScheduleEmployee, SchedulePeriod, SchedulePolicy } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type AttendanceTab = "overview" | "board" | "clock" | "records" | "corrections" | "exceptions" | "timesheets" | "policy";
type ExtendedAttendanceTab = AttendanceTab | "controls" | "insights";

type AttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ATTENDANCE_ACCESS = [
  "attendance.self",
  "attendance.team.write",
  "attendance.write",
  "attendance.controls.write",
  "attendance.reports.read",
  "attendance.exceptions.approve",
  "attendance.timesheets.approve",
] as const;

const RECORD_STATUSES = new Set(["OPEN", "COMPLETED", "FLAGGED", "VOIDED"]);
const EXCEPTION_STATUSES = new Set(["OPEN", "SUBMITTED", "APPROVED", "REJECTED", "WAIVED", "RESOLVED", "CANCELLED"]);
const EXCEPTION_TYPES = new Set([
  "LATE_ARRIVAL",
  "EARLY_DEPARTURE",
  "MISSED_CLOCK_IN",
  "MISSED_CLOCK_OUT",
  "MISSED_BREAK",
  "ABSENCE",
  "UNSCHEDULED_WORK",
  "OVERTIME",
  "UNAPPROVED_LOCATION",
  "OUTSIDE_GEOFENCE",
  "MANUAL_ADJUSTMENT",
]);
const TIMESHEET_STATUSES = new Set(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "LOCKED", "REOPENED"]);
const CORRECTION_STATUSES = new Set(["REQUESTED", "APPROVED", "REJECTED", "CANCELLED", "APPLIED"]);
const CONTROL_STATUSES = new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]);
const DEVICE_TYPES = new Set(["KIOSK", "TRUSTED_DEVICE", "MOBILE_DEVICE", "WEB_TERMINAL"]);

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  const session = await requireServerSession("/attendance");
  const authorized = hasAnyPermission(session.user, ATTENDANCE_ACCESS);

  if (!authorized) {
    return (
      <AccessDeniedPanel
        title="Attendance is not available for this role."
        body="Time clock, exceptions, and timesheets are scoped to employees, managers, HR, and tenant administrators with attendance access."
      />
    );
  }

  const filters = readFilters(params);
  const canManageAttendance = hasAnyPermission(session.user, ["attendance.write"]);
  const canTeamAttendance = hasAnyPermission(session.user, ["attendance.team.write"]);
  const canOperateTeam = canManageAttendance || canTeamAttendance;
  const canManageControls = hasAnyPermission(session.user, ["attendance.controls.write"]);
  const canReadReports = hasAnyPermission(session.user, ["attendance.reports.read"]);
  const canApproveTimesheets = hasAnyPermission(session.user, ["attendance.timesheets.approve"]);
  const recordQuery = buildRecordQuery(filters);
  const boardQuery = buildBoardQuery(filters);
  const exceptionQuery = buildExceptionQuery(filters);
  const correctionQuery = buildCorrectionQuery(filters);
  const timesheetQuery = buildTimesheetQuery(filters);
  const payrollExportQuery = buildPayrollExportQuery(filters);
  const controlsQuery = buildControlsQuery(filters);
  const insightsQuery = buildInsightsQuery(filters);
  const employeeQuery = buildEmployeeQuery(filters);

  const [
    summary,
    myAttendance,
    supervisorBoard,
    records,
    exceptions,
    correctionRequests,
    timesheets,
    payrollExports,
    policies,
    geofences,
    clockDevices,
    kioskCredentials,
    holidays,
    premiumRules,
    advancedReport,
    predictiveAlerts,
    employees,
    periods,
    schedulingPolicies,
  ] =
    await Promise.all([
      tryServerApiJson<AttendanceSummary>("/attendance/summary"),
      tryServerApiJson<MyAttendanceWorkspace>("/attendance/my?limit=30"),
      canOperateTeam ? tryServerApiJson<AttendanceSupervisorBoard>(`/attendance/supervisor-board?${boardQuery}`) : Promise.resolve(null),
      tryServerApiJson<PaginatedAttendance<AttendanceRecord>>(`/attendance/records?${recordQuery}`),
      tryServerApiJson<PaginatedAttendance<AttendanceException>>(`/attendance/exceptions?${exceptionQuery}`),
      tryServerApiJson<PaginatedAttendance<AttendanceCorrectionRequest>>(`/attendance/correction-requests?${correctionQuery}`),
      tryServerApiJson<PaginatedAttendance<AttendanceTimesheet>>(`/attendance/timesheets?${timesheetQuery}`),
      canApproveTimesheets ? tryServerApiJson<PaginatedAttendance<AttendancePayrollExport>>(`/attendance/payroll/exports?${payrollExportQuery}`) : Promise.resolve(null),
      canManageAttendance ? tryServerApiJson<AttendancePolicy[]>("/attendance/policies") : Promise.resolve(null),
      canManageControls ? tryServerApiJson<PaginatedAttendance<AttendanceGeofence>>(`/attendance/geofences?${controlsQuery}`) : Promise.resolve(null),
      canManageControls ? tryServerApiJson<PaginatedAttendance<AttendanceClockDevice>>(`/attendance/devices?${controlsQuery}`) : Promise.resolve(null),
      canManageControls ? tryServerApiJson<PaginatedAttendance<AttendanceKioskCredential>>(`/attendance/kiosk-credentials?${controlsQuery}`) : Promise.resolve(null),
      canManageControls ? tryServerApiJson<PaginatedAttendance<AttendanceHoliday>>(`/attendance/holidays?${controlsQuery}`) : Promise.resolve(null),
      canManageControls ? tryServerApiJson<PaginatedAttendance<AttendancePremiumRule>>(`/attendance/premium-rules?${controlsQuery}`) : Promise.resolve(null),
      canReadReports ? tryServerApiJson<AttendanceAdvancedReport>(`/attendance/reports/advanced?${insightsQuery}`) : Promise.resolve(null),
      canReadReports ? tryServerApiJson<AttendancePredictiveAlerts>(`/attendance/alerts/predictive?${insightsQuery}`) : Promise.resolve(null),
      canOperateTeam ? tryServerApiJson<ScheduleEmployee[]>(`/scheduling/employees?${employeeQuery}`) : Promise.resolve(null),
      canManageAttendance ? tryServerApiJson<{ data: SchedulePeriod[] }>("/scheduling/periods?limit=50") : Promise.resolve(null),
      canManageAttendance ? tryServerApiJson<SchedulePolicy[]>("/scheduling/policies") : Promise.resolve(null),
    ]);

  if (!summary && !myAttendance) {
    return (
      <AccessDeniedPanel
        title="Attendance is not enabled for this workspace."
        body="When attendance is enabled for this tenant, clocking, exception review, and timesheet approval will appear here."
      />
    );
  }

  return (
    <AttendanceCommandCenter
      session={session}
      summary={summary}
      myAttendance={myAttendance}
      supervisorBoard={supervisorBoard}
      records={records}
      exceptions={exceptions}
      correctionRequests={correctionRequests}
      timesheets={timesheets}
      payrollExports={payrollExports}
      policies={policies ?? (summary?.policy ? [summary.policy] : [])}
      geofences={geofences}
      clockDevices={clockDevices}
      kioskCredentials={kioskCredentials}
      holidays={holidays}
      premiumRules={premiumRules}
      advancedReport={advancedReport}
      predictiveAlerts={predictiveAlerts}
      contextOptions={{
        employees: employees ?? [],
        periods: periods?.data ?? [],
        schedulingPolicies: schedulingPolicies ?? [],
      }}
      initialTab={normalizeTab(filters.tab)}
      filters={filters}
    />
  );
}

function readFilters(params: Record<string, string | string[] | undefined>): AttendancePageFilters {
  return {
    tab: readParam(params.tab),
    from: readParam(params.from),
    to: readParam(params.to),
    status: readParam(params.status),
    employeeId: readParam(params.employeeId),
    employeeSearch: readParam(params.employeeSearch),
    organizationNodeId: readParam(params.organizationNodeId),
    costCenterId: readParam(params.costCenterId),
    positionId: readParam(params.positionId),
    locationName: readParam(params.locationName),
    exceptionStatus: readParam(params.exceptionStatus),
    exceptionType: readParam(params.exceptionType),
    timesheetStatus: readParam(params.timesheetStatus),
    correctionStatus: readParam(params.correctionStatus),
    controlStatus: readParam(params.controlStatus),
    deviceType: readParam(params.deviceType),
  };
}

function buildRecordQuery(filters: AttendancePageFilters) {
  const params = new URLSearchParams({ limit: "50" });
  appendCommonFilters(params, filters);
  if (RECORD_STATUSES.has(filters.status)) params.set("status", filters.status);
  return params.toString();
}

function buildBoardQuery(filters: AttendancePageFilters) {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.from) params.set("date", startOfDayIso(filters.from));
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
  return params.toString();
}

function buildExceptionQuery(filters: AttendancePageFilters) {
  const params = new URLSearchParams({ limit: "50" });
  appendCommonFilters(params, filters);
  if (EXCEPTION_STATUSES.has(filters.exceptionStatus)) params.set("exceptionStatus", filters.exceptionStatus);
  if (EXCEPTION_TYPES.has(filters.exceptionType)) params.set("type", filters.exceptionType);
  return params.toString();
}

function buildTimesheetQuery(filters: AttendancePageFilters) {
  const params = new URLSearchParams({ limit: "50" });
  appendCommonFilters(params, filters);
  if (TIMESHEET_STATUSES.has(filters.timesheetStatus)) params.set("timesheetStatus", filters.timesheetStatus);
  return params.toString();
}

function buildCorrectionQuery(filters: AttendancePageFilters) {
  const params = new URLSearchParams({ limit: "50" });
  appendCommonFilters(params, filters);
  if (CORRECTION_STATUSES.has(filters.correctionStatus)) params.set("correctionStatus", filters.correctionStatus);
  return params.toString();
}

function buildPayrollExportQuery(filters: AttendancePageFilters) {
  const params = new URLSearchParams({ limit: "20" });
  appendCommonFilters(params, filters);
  return params.toString();
}

function buildControlsQuery(filters: AttendancePageFilters) {
  const params = new URLSearchParams({ limit: "50" });
  appendCommonFilters(params, filters);
  if (CONTROL_STATUSES.has(filters.controlStatus)) params.set("controlStatus", filters.controlStatus);
  if (DEVICE_TYPES.has(filters.deviceType)) params.set("deviceType", filters.deviceType);
  return params.toString();
}

function buildInsightsQuery(filters: AttendancePageFilters) {
  const params = new URLSearchParams({ limit: "30", lookbackDays: "30" });
  appendCommonFilters(params, filters);
  return params.toString();
}

function buildEmployeeQuery(filters: AttendancePageFilters) {
  const params = new URLSearchParams({ limit: "50" });
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  return params.toString();
}

function appendCommonFilters(params: URLSearchParams, filters: AttendancePageFilters) {
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
}

function normalizeTab(value: string): ExtendedAttendanceTab {
  if (["overview", "board", "clock", "records", "corrections", "exceptions", "timesheets", "policy", "controls", "insights"].includes(value)) {
    return value as ExtendedAttendanceTab;
  }
  return "overview";
}

function startOfDayIso(value: string) {
  return `${value.slice(0, 10)}T00:00:00.000Z`;
}

function endOfDayIso(value: string) {
  return `${value.slice(0, 10)}T23:59:59.999Z`;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
