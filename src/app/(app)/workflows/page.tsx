import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { WorkflowOperationsCenter } from "@/components/workflows/workflow-operations-center";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerPermissions } from "@/lib/auth/session";
import type { PaginatedEmployees } from "@/lib/workforce/types";
import type {
  ApprovalRequest,
  PaginatedApprovalRequests,
  PaginatedApprovalTasks,
  PaginatedDelegations,
  PaginatedWorkflows,
  Workflow,
} from "@/lib/workflows/types";

export const dynamic = "force-dynamic";

type WorkflowsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkflowsPage({ searchParams }: WorkflowsPageProps) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    status: readParam(params.status),
    module: readParam(params.module),
  };
  const selectedWorkflowId = readParam(params.workflow);
  const selectedRequestId = readParam(params.request);
  const access = await requireServerPermissions(["workflows.read"], "/workflows");
  const profile = accessProfileForUser(access.session.user);

  if (!profile.canUseTenantCommandCenter && !profile.isManager) {
    return (
      <AccessDeniedPanel
        title="Workflow operations are not available for this role."
        body="Employees receive workflow notifications and outcomes. Managers, HR, and tenant admins can open approval workspaces."
      />
    );
  }

  const workflowQuery = buildWorkflowQuery(filters);
  const approvalModuleQuery = filters.module ? `&module=${encodeURIComponent(filters.module)}` : "";
  const canReadApprovals = hasAnyPermission(access.session.user, ["approvals.read"]);
  const canProcessApprovals = hasAnyPermission(access.session.user, ["approvals.process"]);
  const canWriteWorkflows = hasAnyPermission(access.session.user, ["workflows.write"]);

  const [workflows, requests, tasks, delegations, selectedWorkflow, selectedRequest, delegateUsers] = access.authorized
    ? await Promise.all([
        tryServerApiJson<PaginatedWorkflows>(`/workflows?${workflowQuery}`),
        canReadApprovals
          ? tryServerApiJson<PaginatedApprovalRequests>(`/approvals/requests?limit=25${approvalModuleQuery}`)
          : Promise.resolve(null),
        canReadApprovals
          ? tryServerApiJson<PaginatedApprovalTasks>(`/approvals/tasks?limit=25${approvalModuleQuery}`)
          : Promise.resolve(null),
        canReadApprovals
          ? tryServerApiJson<PaginatedDelegations>("/approvals/delegations?activeNow=true&limit=25")
          : Promise.resolve(null),
        selectedWorkflowId ? tryServerApiJson<Workflow>(`/workflows/${selectedWorkflowId}`) : Promise.resolve(null),
        selectedRequestId && canReadApprovals
          ? tryServerApiJson<ApprovalRequest>(`/approvals/requests/${selectedRequestId}`)
          : Promise.resolve(null),
        selectedRequestId && canProcessApprovals
          ? tryServerApiJson<PaginatedEmployees>("/employees?limit=100&status=ACTIVE")
          : Promise.resolve(null),
      ])
    : [null, null, null, null, null, null, null];

  return (
    <WorkflowOperationsCenter
      workflows={workflows}
      requests={requests}
      tasks={tasks}
      delegations={delegations}
      selectedWorkflow={selectedWorkflow}
      selectedRequest={selectedRequest}
      delegateUsers={delegateUsers?.data ?? []}
      filters={filters}
      canWriteWorkflows={canWriteWorkflows}
      canProcessApprovals={canProcessApprovals}
      canReadApprovals={canReadApprovals}
    />
  );
}

function buildWorkflowQuery(filters: { search: string; status: string; module: string }) {
  const params = new URLSearchParams({ limit: "50" });

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.module) params.set("module", filters.module);

  return params.toString();
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
