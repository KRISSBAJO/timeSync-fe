import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { OrganizationCommandCenter } from "@/components/organization/organization-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerPermissions } from "@/lib/auth/session";
import type {
  OrganizationTreeNode,
  PaginatedCostCenters,
  PaginatedOrganizationNodes,
} from "@/lib/organization/types";

export const dynamic = "force-dynamic";

type OrganizationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrganizationPage({ searchParams }: OrganizationPageProps) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    type: readParam(params.type),
  };
  const initialPanel = normalizePanel(readParam(params.panel));
  const access = await requireServerPermissions(["organization.read"], "/organization");
  const profile = accessProfileForUser(access.session.user);

  if (!profile.canUseTenantCommandCenter) {
    return (
      <AccessDeniedPanel
        title="Organization administration is not available for this role."
        body="Only HR operators, tenant admins, and platform admins can manage hierarchy and cost-center data."
      />
    );
  }

  const canReadCostCenters = hasAnyPermission(access.session.user, ["cost-centers.read"]);
  const canWriteOrganization = hasAnyPermission(access.session.user, ["organization.write"]);
  const canWriteCostCenters = hasAnyPermission(access.session.user, ["cost-centers.write"]);
  const nodesQuery = buildNodesQuery(filters);

  const [nodes, tree, costCenters] = access.authorized
    ? await Promise.all([
        tryServerApiJson<PaginatedOrganizationNodes>(`/organization/nodes?${nodesQuery}`),
        tryServerApiJson<OrganizationTreeNode[]>("/organization/tree"),
        canReadCostCenters
          ? tryServerApiJson<PaginatedCostCenters>("/organization/cost-centers?limit=50")
          : Promise.resolve(null),
      ])
    : [null, null, null];

  return (
    <OrganizationCommandCenter
      nodes={nodes}
      tree={tree}
      costCenters={costCenters}
      filters={filters}
      initialPanel={initialPanel}
      permissions={{
        canWriteOrganization,
        canWriteCostCenters,
      }}
    />
  );
}

function buildNodesQuery(filters: { search: string; type: string }) {
  const params = new URLSearchParams({ limit: "50" });

  if (filters.search) params.set("search", filters.search);
  if (filters.type) params.set("type", filters.type);

  return params.toString();
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizePanel(value: string) {
  return value === "node" || value === "cost-center" ? value : "";
}
