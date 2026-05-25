import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { WorkforceCommandCenter } from "@/components/workforce/workforce-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerPermissions } from "@/lib/auth/session";
import type { PaginatedCostCenters, PaginatedOrganizationNodes } from "@/lib/organization/types";
import type { PaginatedGrades, PaginatedLevels, PaginatedPositions } from "@/lib/positions/types";
import type {
  EmployeeDetails,
  PaginatedEmployeeImportBatches,
  EmployeeNumberPreview,
  EmployeeSummary,
  PaginatedEmployees,
  TimelineEvent,
  WorkforceAction,
} from "@/lib/workforce/types";

export const dynamic = "force-dynamic";

type WorkforcePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkforcePage({ searchParams }: WorkforcePageProps) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    status: readParam(params.status),
    employmentType: readParam(params.employmentType),
  };
  const initialPanel = readParam(params.panel) === "create" ? "create" : "";
  const cursor = readParam(params.cursor);
  const pageSize = readPageSize(params.limit);
  const cursorStack = cursor ? readCursorStack(params.cursorStack) : [];
  const pageNumber = cursor ? cursorStack.length + 2 : 1;
  const selectedEmployeeId = readParam(params.employee);
  const access = await requireServerPermissions(["employees.read"], "/workforce");
  const profile = accessProfileForUser(access.session.user);

  if (!profile.canUseTenantCommandCenter && !profile.isManager) {
    return (
      <AccessDeniedPanel
        title="The employee directory is not available for this role."
        body="Employee accounts use self-service views. HR, tenant admins, and managers can open scoped workforce workspaces."
      />
    );
  }

  const employeeQuery = buildEmployeeQuery({ ...filters, cursor, limit: pageSize });
  const canWritePersons = hasAnyPermission(access.session.user, ["persons.write"]);
  const canReadWorkforceActions = hasAnyPermission(access.session.user, ["workforce-actions.read"]);
  const canReadTimeline = hasAnyPermission(access.session.user, ["timeline.read"]);
  const canWriteEmployees = hasAnyPermission(access.session.user, ["employees.write"]);
  const canSuspendEmployees = hasAnyPermission(access.session.user, ["employees.suspend"]);
  const canSeparateEmployees = hasAnyPermission(access.session.user, ["employees.separate"]);
  const canReadAssignments = hasAnyPermission(access.session.user, ["assignments.read"]);
  const canWriteAssignments = hasAnyPermission(access.session.user, ["assignments.write"]);
  const canReadPositions = hasAnyPermission(access.session.user, ["positions.read"]);
  const canReadOrganization = hasAnyPermission(access.session.user, ["organization.read"]);
  const canReadCostCenters = hasAnyPermission(access.session.user, ["cost-centers.read"]);

  const [
    employees,
    summary,
    numberPreview,
    selectedEmployee,
    workforceActions,
    timelineEvents,
    assignmentHistory,
    positionCatalog,
    organizationCatalog,
    costCenterCatalog,
    gradeCatalog,
    levelCatalog,
    managerCatalog,
    supervisorCatalog,
    unitHeadCatalog,
    importBatches,
  ] = access.authorized
    ? await Promise.all([
        tryServerApiJson<PaginatedEmployees>(`/employees?${employeeQuery}`),
        tryServerApiJson<EmployeeSummary>("/employees/summary"),
        tryServerApiJson<EmployeeNumberPreview>("/employees/number-preview"),
        selectedEmployeeId ? tryServerApiJson<EmployeeDetails>(`/employees/${selectedEmployeeId}`) : Promise.resolve(null),
        selectedEmployeeId && canReadWorkforceActions
          ? tryServerApiJson<WorkforceAction[]>(`/employees/${selectedEmployeeId}/workforce-actions`)
          : Promise.resolve(null),
        selectedEmployeeId && canReadTimeline
          ? tryServerApiJson<TimelineEvent[]>(`/employees/${selectedEmployeeId}/timeline`)
          : Promise.resolve(null),
        selectedEmployeeId && canReadAssignments
          ? tryServerApiJson<EmployeeDetails["assignments"]>(`/assignments/employees/${selectedEmployeeId}/history`)
          : Promise.resolve(null),
        selectedEmployeeId && canReadPositions
          ? tryServerApiJson<PaginatedPositions>("/positions?limit=100&status=ACTIVE")
          : Promise.resolve(null),
        selectedEmployeeId && canReadOrganization
          ? tryServerApiJson<PaginatedOrganizationNodes>("/organization/nodes?limit=100&isActive=true")
          : Promise.resolve(null),
        selectedEmployeeId && canReadCostCenters
          ? tryServerApiJson<PaginatedCostCenters>("/organization/cost-centers?limit=100&isActive=true")
          : Promise.resolve(null),
        selectedEmployeeId && canReadPositions
          ? tryServerApiJson<PaginatedGrades>("/positions/grades?limit=100")
          : Promise.resolve(null),
        selectedEmployeeId && canReadPositions
          ? tryServerApiJson<PaginatedLevels>("/positions/levels?limit=100")
          : Promise.resolve(null),
        selectedEmployeeId
          ? tryServerApiJson<PaginatedEmployees>(
              `/employees/leadership-pool?role=MANAGER&limit=100&excludeEmployeeId=${selectedEmployeeId}`,
            )
          : Promise.resolve(null),
        selectedEmployeeId
          ? tryServerApiJson<PaginatedEmployees>(
              `/employees/leadership-pool?role=SUPERVISOR&limit=100&excludeEmployeeId=${selectedEmployeeId}`,
            )
          : Promise.resolve(null),
        selectedEmployeeId
          ? tryServerApiJson<PaginatedEmployees>(
              `/employees/leadership-pool?role=UNIT_HEAD&limit=100&excludeEmployeeId=${selectedEmployeeId}`,
            )
          : Promise.resolve(null),
        canWriteEmployees
          ? tryServerApiJson<PaginatedEmployeeImportBatches>("/employees/import-batches")
          : Promise.resolve(null),
      ])
    : [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];

  return (
    <WorkforceCommandCenter
      employees={employees}
      summary={summary}
      numberPreview={numberPreview}
      selectedEmployee={selectedEmployee}
      workforceActions={workforceActions}
      timelineEvents={timelineEvents}
      assignmentHistory={assignmentHistory ?? null}
      assignmentCatalogs={{
        positions: positionCatalog?.data ?? [],
        organizationNodes: organizationCatalog?.data ?? [],
        costCenters: costCenterCatalog?.data ?? [],
        grades: gradeCatalog?.data ?? [],
        levels: levelCatalog?.data ?? [],
        managers: managerCatalog?.data ?? [],
        supervisors: supervisorCatalog?.data ?? [],
        unitHeads: unitHeadCatalog?.data ?? [],
      }}
      importBatches={importBatches}
      filters={filters}
      pagination={{
        cursor,
        cursorStack,
        pageSize,
        pageNumber,
      }}
      initialPanel={initialPanel}
      permissions={{
        canWritePersons,
        canWriteEmployees,
        canSuspendEmployees,
        canSeparateEmployees,
        canReadWorkforceActions,
        canReadTimeline,
        canReadAssignments,
        canWriteAssignments,
      }}
    />
  );
}

function buildEmployeeQuery(filters: {
  search: string;
  status: string;
  employmentType: string;
  cursor: string;
  limit: number;
}) {
  const params = new URLSearchParams({ limit: filters.limit.toString() });

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.employmentType) params.set("employmentType", filters.employmentType);
  if (filters.cursor) params.set("cursor", filters.cursor);

  return params.toString();
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function readPageSize(value: string | string[] | undefined) {
  const parsed = Number(readParam(value));

  return [10, 25, 50, 100].includes(parsed) ? parsed : 25;
}

function readCursorStack(value: string | string[] | undefined) {
  return readParam(value)
    .split(",")
    .map((cursor) => cursor.trim())
    .filter(Boolean)
    .slice(0, 50);
}
