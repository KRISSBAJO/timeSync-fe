import { SchedulingCommandCenter } from "@/components/scheduling/scheduling-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type {
  PaginatedCostCenters,
  PaginatedOrganizationNodes,
} from "@/lib/organization/types";
import type { PaginatedPositions } from "@/lib/positions/types";
import type {
  EmployeeAvailability,
  MyScheduleWorkspace,
  OpenShift,
  OpenShiftClaim,
  OvertimeRequest,
  PaginatedSchedule,
  ScheduleCoverageRule,
  SchedulePlannerSummary,
  ScheduleAssignment,
  ScheduleEmployee,
  SchedulePeriod,
  SchedulePolicy,
  ScheduleSwapRequest,
  SchedulingSummary,
  WorkShift,
} from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type ScheduleTab = "overview" | "board" | "coverage" | "open" | "swaps" | "overtime" | "availability" | "policy" | "shifts";

type SchedulingFilters = {
  tab: string;
  view: string;
  from: string;
  to: string;
  status: string;
  employeeId: string;
  employeeSearch: string;
  organizationNodeId: string;
  costCenterId: string;
  positionId: string;
  locationName: string;
};

type SchedulingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SCHEDULING_ACCESS = [
  "scheduling.self",
  "scheduling.write",
  "scheduling.team.write",
  "scheduling.overtime.approve",
] as const;

const ASSIGNMENT_STATUS_VALUES = new Set(["DRAFT", "ASSIGNED", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED", "NO_SHOW"]);
const AVAILABILITY_STATUS_VALUES = new Set(["AVAILABLE", "PREFERRED", "UNAVAILABLE"]);
const COVERAGE_RULE_STATUS_VALUES = new Set(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]);
const SWAP_REQUEST_STATUS_VALUES = new Set(["REQUESTED", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"]);

export default async function SchedulingPage({ searchParams }: SchedulingPageProps) {
  const params = await searchParams;
  const session = await requireServerSession("/scheduling");
  const user = session.user;
  const authorized = hasAnyPermission(user, SCHEDULING_ACCESS);
  const canTenantSchedule = hasAnyPermission(user, ["scheduling.write"]);
  const canTeamSchedule = hasAnyPermission(user, ["scheduling.team.write"]);
  const canApproveOvertime = hasAnyPermission(user, ["scheduling.overtime.approve"]);
  const filters = {
    tab: readParam(params.tab),
    view: readParam(params.view),
    from: readParam(params.from),
    to: readParam(params.to),
    status: readParam(params.status),
    employeeId: readParam(params.employeeId),
    employeeSearch: readParam(params.employeeSearch),
    organizationNodeId: readParam(params.organizationNodeId),
    costCenterId: readParam(params.costCenterId),
    positionId: readParam(params.positionId),
    locationName: readParam(params.locationName),
  };
  const assignmentQuery = buildAssignmentQuery(filters);
  const availabilityQuery = buildAvailabilityQuery(filters);
  const openShiftQuery = buildOpenShiftQuery(filters);
  const openShiftClaimQuery = buildOpenShiftClaimQuery(filters);
  const plannerQuery = buildPlannerQuery(filters);
  const coverageRuleQuery = buildCoverageRuleQuery(filters);
  const swapRequestQuery = buildSwapRequestQuery(filters);
  const employeeCandidateQuery = buildEmployeeCandidateQuery(filters);

  const [
    summary,
    plannerSummary,
    mySchedule,
    shifts,
    policies,
    periods,
    assignments,
    teamAssignments,
    openShifts,
    openShiftClaims,
    overtime,
    availability,
    coverageRules,
    swapRequests,
    employeeOptions,
    organizationOptions,
    costCenterOptions,
    positionOptions,
  ] = authorized
    ? await Promise.all([
        tryServerApiJson<SchedulingSummary>("/scheduling/summary"),
        tryServerApiJson<SchedulePlannerSummary>(`/scheduling/planner?${plannerQuery}`),
        tryServerApiJson<MyScheduleWorkspace>("/scheduling/my?limit=30"),
        tryServerApiJson<WorkShift[]>("/scheduling/shifts"),
        canTenantSchedule ? tryServerApiJson<SchedulePolicy[]>("/scheduling/policies") : Promise.resolve(null),
        canTenantSchedule ? tryServerApiJson<SchedulePeriod[]>("/scheduling/periods?limit=30") : Promise.resolve(null),
        canTenantSchedule
          ? tryServerApiJson<PaginatedSchedule<ScheduleAssignment>>(`/scheduling/assignments?${assignmentQuery}`)
          : Promise.resolve(null),
        canTeamSchedule
          ? tryServerApiJson<PaginatedSchedule<ScheduleAssignment>>(`/scheduling/manager/assignments?${assignmentQuery}`)
          : Promise.resolve(null),
        tryServerApiJson<PaginatedSchedule<OpenShift>>(`/scheduling/open-shifts?${openShiftQuery}`),
        tryServerApiJson<PaginatedSchedule<OpenShiftClaim>>(`/scheduling/open-shift-claims?${openShiftClaimQuery}`),
        tryServerApiJson<PaginatedSchedule<OvertimeRequest>>("/scheduling/overtime?limit=30"),
        canTenantSchedule || canTeamSchedule
          ? tryServerApiJson<PaginatedSchedule<EmployeeAvailability>>(`/scheduling/availability?${availabilityQuery}`)
          : Promise.resolve(null),
        canTenantSchedule
          ? tryServerApiJson<PaginatedSchedule<ScheduleCoverageRule>>(`/scheduling/coverage-rules?${coverageRuleQuery}`)
          : Promise.resolve(null),
        tryServerApiJson<PaginatedSchedule<ScheduleSwapRequest>>(`/scheduling/swap-requests?${swapRequestQuery}`),
        canTenantSchedule
          ? tryServerApiJson<ScheduleEmployee[]>(`/scheduling/employees?${employeeCandidateQuery}`)
          : canTeamSchedule
            ? tryServerApiJson<ScheduleEmployee[]>(`/scheduling/manager/employees?${employeeCandidateQuery}`)
            : Promise.resolve(null),
        canTenantSchedule || canTeamSchedule
          ? tryServerApiJson<PaginatedOrganizationNodes>("/organization/nodes?limit=100")
          : Promise.resolve(null),
        canTenantSchedule || canTeamSchedule
          ? tryServerApiJson<PaginatedCostCenters>("/organization/cost-centers?limit=100")
          : Promise.resolve(null),
        canTenantSchedule || canTeamSchedule
          ? tryServerApiJson<PaginatedPositions>("/positions?limit=100")
          : Promise.resolve(null),
      ])
    : [null, null, null, [], null, null, null, null, null, null, null, null, null, null, null, null, null, null];

  return (
    <SchedulingCommandCenter
      user={user}
      summary={summary}
      plannerSummary={plannerSummary}
      mySchedule={mySchedule}
      shifts={shifts ?? []}
      policies={policies ?? []}
      periods={periods ?? []}
      assignments={assignments?.data ?? []}
      teamAssignments={teamAssignments?.data ?? []}
      openShifts={openShifts?.data ?? []}
      openShiftClaims={(canTenantSchedule || canTeamSchedule ? openShiftClaims?.data : mySchedule?.openShiftClaims.data) ?? []}
      overtime={overtime?.data ?? []}
      availability={(canTenantSchedule || canTeamSchedule ? availability?.data : mySchedule?.availability.data) ?? []}
      coverageRules={coverageRules?.data ?? []}
      swapRequests={swapRequests?.data ?? []}
      employeeOptions={employeeOptions ?? []}
      organizationNodes={organizationOptions?.data ?? []}
      costCenters={costCenterOptions?.data ?? []}
      positions={positionOptions?.data ?? []}
      initialTab={normalizeTab(filters.tab)}
      planningFilters={filters}
      permissions={{ canTenantSchedule, canTeamSchedule, canApproveOvertime }}
    />
  );
}

function buildAssignmentQuery(filters: SchedulingFilters) {
  const params = new URLSearchParams({ limit: "100" });
  appendCommonPlanningFilters(params, filters);
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
  if (ASSIGNMENT_STATUS_VALUES.has(filters.status)) params.set("status", filters.status);
  return params.toString();
}

function buildAvailabilityQuery(filters: SchedulingFilters) {
  const params = new URLSearchParams({ limit: "100" });
  appendCommonPlanningFilters(params, filters);
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
  if (AVAILABILITY_STATUS_VALUES.has(filters.status)) params.set("status", filters.status);
  return params.toString();
}

function buildOpenShiftQuery(filters: SchedulingFilters) {
  const params = new URLSearchParams({ limit: "30" });
  appendDimensionFilters(params, filters);
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
  if (["OPEN", "CLAIMED", "CANCELLED", "EXPIRED"].includes(filters.status)) params.set("status", filters.status);
  return params.toString();
}

function buildOpenShiftClaimQuery(filters: SchedulingFilters) {
  const params = new URLSearchParams({ limit: "6", status: "REQUESTED" });
  appendCommonPlanningFilters(params, filters);
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
  return params.toString();
}

function buildPlannerQuery(filters: SchedulingFilters) {
  const params = new URLSearchParams();
  appendCommonPlanningFilters(params, filters);
  params.set("view", normalizePlannerView(filters.view));
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
  if (ASSIGNMENT_STATUS_VALUES.has(filters.status)) params.set("assignmentStatus", filters.status);
  if (AVAILABILITY_STATUS_VALUES.has(filters.status)) params.set("availabilityStatus", filters.status);
  return params.toString();
}

function buildCoverageRuleQuery(filters: SchedulingFilters) {
  const params = new URLSearchParams({ limit: "50" });
  appendDimensionFilters(params, filters);
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
  if (COVERAGE_RULE_STATUS_VALUES.has(filters.status)) params.set("status", filters.status);
  return params.toString();
}

function buildSwapRequestQuery(filters: SchedulingFilters) {
  const params = new URLSearchParams({ limit: "50" });
  appendCommonPlanningFilters(params, filters);
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
  if (SWAP_REQUEST_STATUS_VALUES.has(filters.status)) params.set("status", filters.status);
  return params.toString();
}

function buildEmployeeCandidateQuery(filters: SchedulingFilters) {
  const params = new URLSearchParams({ limit: "40" });
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (["ACTIVE", "PROBATION", "PREBOARDING"].includes(filters.status)) params.set("status", filters.status);
  return params.toString();
}

function normalizePlannerView(value: string) {
  return ["DAY", "WEEK", "MONTH"].includes(value.toUpperCase()) ? value.toUpperCase() : "WEEK";
}

function appendCommonPlanningFilters(params: URLSearchParams, filters: SchedulingFilters) {
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  appendDimensionFilters(params, filters);
}

function appendDimensionFilters(params: URLSearchParams, filters: SchedulingFilters) {
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
}

function normalizeTab(value: string): ScheduleTab {
  return ["overview", "board", "coverage", "open", "swaps", "overtime", "availability", "policy", "shifts"].includes(value)
    ? (value as ScheduleTab)
    : "overview";
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function startOfDayIso(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function endOfDayIso(value: string) {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}
