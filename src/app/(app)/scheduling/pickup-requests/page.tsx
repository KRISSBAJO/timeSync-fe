import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import {
  PickupRequestsCenter,
  type PickupRequestFilters,
} from "@/components/scheduling/pickup-requests-center";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type {
  PaginatedCostCenters,
  PaginatedOrganizationNodes,
} from "@/lib/organization/types";
import type { PaginatedPositions } from "@/lib/positions/types";
import type { OpenShiftClaim, PaginatedSchedule, ScheduleEmployee } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type PickupRequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PickupRequestsPage({ searchParams }: PickupRequestsPageProps) {
  const params = await searchParams;
  const session = await requireServerSession("/scheduling/pickup-requests");
  const canTenantSchedule = hasAnyPermission(session.user, ["scheduling.write"]);
  const canTeamSchedule = hasAnyPermission(session.user, ["scheduling.team.write"]);
  const canDecide = canTenantSchedule || canTeamSchedule;

  if (!canDecide) {
    return (
      <AccessDeniedPanel
        title="Pickup approvals are reserved for supervisors and HR."
        body="Employees can request open shifts from My Schedule. Supervisors and HR can review pickup requests from this approval workspace."
      />
    );
  }

  const filters: PickupRequestFilters = {
    search: readParam(params.search),
    status: readParam(params.status),
    from: readParam(params.from),
    to: readParam(params.to),
    cursor: readParam(params.cursor),
    employeeId: readParam(params.employeeId),
    employeeSearch: readParam(params.employeeSearch),
    organizationNodeId: readParam(params.organizationNodeId),
    costCenterId: readParam(params.costCenterId),
    positionId: readParam(params.positionId),
    locationName: readParam(params.locationName),
  };
  const [claims, employeeOptions, organizationOptions, costCenterOptions, positionOptions] = await Promise.all([
    tryServerApiJson<PaginatedSchedule<OpenShiftClaim>>(
      `/scheduling/open-shift-claims?${buildQuery(filters)}`,
    ),
    canTenantSchedule
      ? tryServerApiJson<ScheduleEmployee[]>("/scheduling/employees")
      : tryServerApiJson<ScheduleEmployee[]>("/scheduling/manager/employees"),
    tryServerApiJson<PaginatedOrganizationNodes>("/organization/nodes?limit=100"),
    tryServerApiJson<PaginatedCostCenters>("/organization/cost-centers?limit=100"),
    tryServerApiJson<PaginatedPositions>("/positions?limit=100"),
  ]);

  return (
    <PickupRequestsCenter
      claims={claims}
      filters={filters}
      canDecide={canDecide}
      employees={employeeOptions ?? []}
      organizationNodes={organizationOptions?.data ?? []}
      costCenters={costCenterOptions?.data ?? []}
      positions={positionOptions?.data ?? []}
    />
  );
}

function buildQuery(filters: PickupRequestFilters) {
  const params = new URLSearchParams({ limit: "25" });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.employeeSearch) params.set("employeeSearch", filters.employeeSearch);
  if (filters.organizationNodeId) params.set("organizationNodeId", filters.organizationNodeId);
  if (filters.costCenterId) params.set("costCenterId", filters.costCenterId);
  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.locationName) params.set("locationName", filters.locationName);
  if (filters.cursor) params.set("cursor", filters.cursor);
  return params.toString();
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
