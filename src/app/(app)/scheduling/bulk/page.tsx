import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { BulkAssignmentForm } from "@/components/scheduling/scheduling-action-forms";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type { ScheduleEmployee, SchedulePeriod, WorkShift } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type SchedulingBulkPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SchedulingBulkPage({ searchParams }: SchedulingBulkPageProps) {
  const params = await searchParams;
  const session = await requireServerSession("/scheduling/bulk");
  const user = session.user;
  const canTenantSchedule = hasAnyPermission(user, ["scheduling.write"]);
  const canTeamSchedule = hasAnyPermission(user, ["scheduling.team.write"]);

  if (!canTenantSchedule && !canTeamSchedule) {
    return (
      <AccessDeniedPanel
        title="You do not have access to bulk scheduling."
        body="Bulk roster creation is reserved for HR, tenant administrators, managers, and supervisors with scheduling authority."
      />
    );
  }

  const filters = readSchedulingFilters(params);
  const employeeQuery = buildEmployeeCandidateQuery(filters);
  const employeeEndpoint = canTenantSchedule ? "/scheduling/employees" : "/scheduling/manager/employees";
  const [employees, periods, shifts] = await Promise.all([
    tryServerApiJson<ScheduleEmployee[]>(`${employeeEndpoint}?${employeeQuery}`),
    canTenantSchedule ? tryServerApiJson<SchedulePeriod[]>("/scheduling/periods?limit=100") : Promise.resolve(null),
    tryServerApiJson<WorkShift[]>("/scheduling/shifts"),
  ]);

  return (
    <BulkAssignmentForm
      returnTo={safeReturnTo(readParam(params.returnTo))}
      permissions={{ canTenantSchedule, canTeamSchedule }}
      employees={employees ?? []}
      periods={periods ?? []}
      shifts={shifts ?? []}
      employeeEndpoint={employeeEndpoint}
      employeeSearch={filters.employeeSearch}
      defaultEmployeeId={filters.employeeId}
      today={todayKey()}
    />
  );
}

function readSchedulingFilters(params: Record<string, string | string[] | undefined>) {
  return {
    employeeId: readParam(params.employeeId),
    employeeSearch: readParam(params.employeeSearch),
    organizationNodeId: readParam(params.organizationNodeId),
    costCenterId: readParam(params.costCenterId),
    positionId: readParam(params.positionId),
    status: readParam(params.status),
  };
}

function buildEmployeeCandidateQuery(filters: ReturnType<typeof readSchedulingFilters>) {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (["ACTIVE", "PROBATION", "PREBOARDING"].includes(filters.status)) params.set("status", filters.status);
  return params.toString();
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function safeReturnTo(value: string) {
  return value.startsWith("/scheduling") ? value : "/scheduling?tab=open&view=WEEK&employeeId=&employeeSearch=&from=&to=&status=&organizationNodeId=&costCenterId=&positionId=&locationName=";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
