import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { LeaveCommandCenter } from "@/components/leave/leave-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type {
  LeaveApprovalRule,
  LeaveBalance,
  LeaveCalendar,
  LeaveCalendarView,
  LeavePageFilters,
  LeavePolicy,
  LeaveReports,
  LeaveRequest,
  LeaveSummary,
  LeaveType,
  MyLeaveWorkspace,
  PaginatedLeave,
} from "@/lib/leave/types";
import type { ScheduleEmployee } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type LeavePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const LEAVE_ACCESS = [
  "leave.self",
  "leave.team.read",
  "leave.team.write",
  "leave.approve",
  "leave.policy.write",
  "leave.reports.read",
] as const;

const LEAVE_STATUSES = new Set([
  "DRAFT",
  "SUBMITTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "WITHDRAWN",
  "TAKEN",
  "REVERSED",
]);

export default async function LeavePage({ searchParams }: LeavePageProps) {
  const params = await searchParams;
  const session = await requireServerSession("/leave");
  const authorized = hasAnyPermission(session.user, LEAVE_ACCESS);

  if (!authorized) {
    return (
      <AccessDeniedPanel
        title="Leave is not available for this role."
        body="Leave balances, requests, and approval workflows are available to employees, managers, HR, and tenant administrators with leave access."
      />
    );
  }

  const filters = readFilters(params);
  const canOperateTeam = hasAnyPermission(session.user, ["leave.team.read", "leave.team.write", "leave.approve", "leave.policy.write"]);
  const canManagePolicy = hasAnyPermission(session.user, ["leave.policy.write"]);
  const query = buildLeaveQuery(filters);
  const employeeQuery = buildEmployeeQuery(filters);

  const [
    summary,
    myLeave,
    requests,
    balances,
    types,
    policies,
    approvalRules,
    calendars,
    calendarView,
    reports,
    employees,
  ] = await Promise.all([
    tryServerApiJson<LeaveSummary>("/leave/summary"),
    tryServerApiJson<MyLeaveWorkspace>(`/leave/my?${query}`),
    tryServerApiJson<PaginatedLeave<LeaveRequest>>(`/leave/requests?${query}`),
    tryServerApiJson<PaginatedLeave<LeaveBalance>>(`/leave/balances?${query}`),
    tryServerApiJson<LeaveType[]>("/leave/types"),
    tryServerApiJson<LeavePolicy[]>("/leave/policies"),
    canManagePolicy ? tryServerApiJson<LeaveApprovalRule[]>("/leave/approval-rules") : Promise.resolve(null),
    tryServerApiJson<LeaveCalendar[]>("/leave/calendars"),
    tryServerApiJson<LeaveCalendarView>(`/leave/calendar?${query}`),
    hasAnyPermission(session.user, ["leave.reports.read"]) ? tryServerApiJson<LeaveReports>(`/leave/reports?${query}`) : Promise.resolve(null),
    canOperateTeam ? tryServerApiJson<ScheduleEmployee[]>(`/scheduling/employees?${employeeQuery}`) : Promise.resolve(null),
  ]);

  if (!summary && !myLeave) {
    return (
      <AccessDeniedPanel
        title="Leave is not enabled for this workspace."
        body="When Leave Management is enabled for this tenant, balances, requests, and approvals will appear here."
      />
    );
  }

  return (
    <LeaveCommandCenter
      session={session}
      summary={summary}
      myLeave={myLeave}
      requests={requests}
      balances={balances}
      types={types ?? []}
      policies={policies ?? []}
      approvalRules={approvalRules ?? []}
      calendars={calendars ?? []}
      calendarView={calendarView}
      reports={reports}
      employees={employees ?? []}
      filters={filters}
      initialTab={normalizeTab(filters.tab)}
    />
  );
}

function readFilters(params: Record<string, string | string[] | undefined>): LeavePageFilters {
  return {
    tab: readParam(params.tab),
    from: readParam(params.from),
    to: readParam(params.to),
    employeeId: readParam(params.employeeId),
    employeeSearch: readParam(params.employeeSearch),
    leaveTypeId: readParam(params.leaveTypeId),
    status: readParam(params.status),
    calendarId: readParam(params.calendarId),
  };
}

function buildLeaveQuery(filters: LeavePageFilters) {
  const params = new URLSearchParams({ limit: "50" });
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.leaveTypeId) params.set("leaveTypeId", filters.leaveTypeId);
  if (filters.status && LEAVE_STATUSES.has(filters.status)) params.set("status", filters.status);
  if (filters.calendarId) params.set("calendarId", filters.calendarId);
  return params.toString();
}

function buildEmployeeQuery(filters: LeavePageFilters) {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.employeeSearch) params.set("search", filters.employeeSearch);
  return params.toString();
}

function normalizeTab(tab?: string): "overview" | "request" | "balances" | "approvals" | "calendar" | "reports" | "policies" {
  if (tab === "request" || tab === "balances" || tab === "approvals" || tab === "calendar" || tab === "reports" || tab === "policies") return tab;
  return "overview";
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function startOfDayIso(value: string) {
  return new Date(`${value}T00:00:00.000`).toISOString();
}

function endOfDayIso(value: string) {
  return new Date(`${value}T23:59:59.999`).toISOString();
}
