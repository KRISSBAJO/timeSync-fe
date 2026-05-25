import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { PositionControlCenter } from "@/components/positions/position-control-center";
import { tryServerApiJson } from "@/lib/api/server";
import { requireServerPermissions } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import type { PaginatedCostCenters, PaginatedOrganizationNodes } from "@/lib/organization/types";
import type {
  PaginatedGrades,
  PaginatedLevels,
  PaginatedPositions,
  PaginatedSkills,
  PositionSummary,
  PositionTreeNode,
} from "@/lib/positions/types";

export const dynamic = "force-dynamic";

type PositionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PositionsPage({ searchParams }: PositionsPageProps) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    status: readParam(params.status),
    vacantOnly: readParam(params.vacantOnly),
    overBudgetOnly: readParam(params.overBudgetOnly),
  };
  const initialPanel = readParam(params.panel) === "create" ? "create" : null;
  const access = await requireServerPermissions(["positions.read"], "/positions");
  const profile = accessProfileForUser(access.session.user);

  if (!profile.canUseTenantCommandCenter) {
    return (
      <AccessDeniedPanel
        title="Position control is not available for this role."
        body="Position, grade, level, and capacity administration belongs to HR, tenant admins, and platform admins."
      />
    );
  }

  const positionsQuery = buildPositionsQuery(filters);
  const canWritePositions = hasAnyPermission(access.session.user, ["positions.write"]);

  const [positions, summary, tree, grades, levels, skills, organizationNodes, costCenters] = access.authorized
    ? await Promise.all([
        tryServerApiJson<PaginatedPositions>(`/positions?${positionsQuery}`),
        tryServerApiJson<PositionSummary>("/positions/summary"),
        tryServerApiJson<PositionTreeNode[]>("/positions/tree"),
        tryServerApiJson<PaginatedGrades>("/positions/grades?limit=50"),
        tryServerApiJson<PaginatedLevels>("/positions/levels?limit=50"),
        tryServerApiJson<PaginatedSkills>("/positions/skills?limit=50"),
        tryServerApiJson<PaginatedOrganizationNodes>("/organization/nodes?limit=100"),
        tryServerApiJson<PaginatedCostCenters>("/organization/cost-centers?limit=100"),
      ])
    : [null, null, null, null, null, null, null, null];

  return (
    <PositionControlCenter
      positions={positions}
      summary={summary}
      tree={tree}
      grades={grades}
      levels={levels}
      skills={skills}
      organizationNodes={organizationNodes}
      costCenters={costCenters}
      filters={filters}
      initialPanel={initialPanel}
      permissions={{ canWritePositions }}
    />
  );
}

function buildPositionsQuery(filters: {
  search: string;
  status: string;
  vacantOnly: string;
  overBudgetOnly: string;
}) {
  const params = new URLSearchParams({ limit: "50" });

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.vacantOnly) params.set("vacantOnly", "true");
  if (filters.overBudgetOnly) params.set("overBudgetOnly", "true");

  return params.toString();
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
