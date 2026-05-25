import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CirclePlus,
  Clock3,
  Filter,
  GitPullRequestArrow,
  ListChecks,
  Route,
  Search,
  UserRoundCheck,
} from "lucide-react";

import { ApprovalActionCenter } from "@/components/workflows/approval-action-center";
import { WorkflowBuilderPanel } from "@/components/workflows/workflow-builder-panel";
import type { EmployeeListItem } from "@/lib/workforce/types";
import type {
  ApprovalRequest,
  ApprovalRequestStatus,
  ApprovalStepInstance,
  PaginatedApprovalRequests,
  PaginatedApprovalTasks,
  PaginatedDelegations,
  PaginatedWorkflows,
  Workflow,
  WorkflowStatus,
} from "@/lib/workflows/types";

type WorkflowFilters = {
  search: string;
  status: string;
  module: string;
};

const workflowStatuses: Array<{ label: string; value: "" | WorkflowStatus }> = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
  { label: "Archived", value: "ARCHIVED" },
];

const requestStatuses: ApprovalRequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED", "WITHDRAWN", "COMPLETED"];

export function WorkflowOperationsCenter({
  workflows,
  requests,
  tasks,
  delegations,
  selectedWorkflow,
  selectedRequest,
  delegateUsers,
  filters,
  canWriteWorkflows,
  canProcessApprovals,
  canReadApprovals,
}: {
  workflows: PaginatedWorkflows | null;
  requests: PaginatedApprovalRequests | null;
  tasks: PaginatedApprovalTasks | null;
  delegations: PaginatedDelegations | null;
  selectedWorkflow: Workflow | null;
  selectedRequest: ApprovalRequest | null;
  delegateUsers: EmployeeListItem[];
  filters: WorkflowFilters;
  canWriteWorkflows: boolean;
  canProcessApprovals: boolean;
  canReadApprovals: boolean;
}) {
  const workflowRows = workflows?.data ?? [];
  const requestRows = requests?.data ?? [];
  const taskRows = tasks?.data ?? [];
  const delegationRows = delegations?.data ?? [];
  const activeWorkflows = workflowRows.filter((workflow) => workflow.status === "ACTIVE").length;
  const pendingRequests = requestRows.filter((request) => request.status === "PENDING").length;
  const avgSteps = workflowRows.length
    ? workflowRows.reduce((sum, workflow) => sum + workflow.steps.length, 0) / workflowRows.length
    : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                Workflow control
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
                <Route size={13} aria-hidden="true" />
                Workflow orchestration
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.45rem,2.4vw,2.2rem)] font-extrabold leading-tight tracking-normal text-[#10143f]">
              Approvals, process routing, SLA pressure, and delegation in one control plane.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Manage enterprise workflow definitions, approval requests, assigned approval tasks, and delegation windows across workforce modules.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <TopAction href="/workflows?panel=workflow" icon={CirclePlus} label="New Workflow" primary />
            <TopAction href="/workflows?assignedToMe=true" icon={UserRoundCheck} label="My Tasks" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FlowMetric label="Workflows" value={workflowRows.length} icon={Route} tone="blue" />
          <FlowMetric label="Active routes" value={activeWorkflows} icon={CheckCircle2} tone="green" />
          <FlowMetric label="Pending approvals" value={pendingRequests} icon={Clock3} tone="amber" />
          <FlowMetric label="Avg steps" value={avgSteps.toFixed(1)} icon={ListChecks} tone="violet" />
        </div>
      </section>

      {selectedWorkflow ? (
        <WorkflowBuilderPanel
          key={`${selectedWorkflow.id}-${selectedWorkflow.steps.length}`}
          workflow={selectedWorkflow}
          canWriteWorkflows={canWriteWorkflows}
        />
      ) : null}

      {selectedRequest ? (
        <ApprovalActionCenter
          key={`${selectedRequest.id}-${selectedRequest.status}-${selectedRequest.actions?.length ?? 0}`}
          request={selectedRequest}
          delegateUsers={delegateUsers}
          canProcessApprovals={canProcessApprovals}
          canReadApprovals={canReadApprovals}
        />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <div className="border-b border-[#e5ebf5] p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Workflow designer registry</p>
                  <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">Process definitions</h3>
                </div>
                <form action="/workflows" className="grid gap-2 sm:grid-cols-[1fr_150px_140px_auto] xl:w-[720px]">
                  <label className="flex h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-3 text-[13px] font-semibold text-[#7b8195]">
                    <Search size={16} aria-hidden="true" />
                    <input
                      name="search"
                      defaultValue={filters.search}
                      placeholder="Search workflows"
                      className="min-w-0 flex-1 bg-transparent text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                    />
                  </label>
                  <select
                    name="status"
                    defaultValue={filters.status}
                    className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none"
                  >
                    {workflowStatuses.map((status) => (
                      <option key={status.value || "all"} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  <input
                    name="module"
                    defaultValue={filters.module}
                    placeholder="Module"
                    className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none placeholder:text-[#9ba2b5]"
                  />
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white">
                    <Filter size={15} aria-hidden="true" />
                    Apply
                  </button>
                </form>
              </div>
            </div>

            <WorkflowTable rows={workflowRows} />
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Approval request stream</p>
                <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">Requests requiring governance</h3>
              </div>
              <Link href="/workflows?requests=all" className="text-[12px] font-black text-[#3820d7]">View all</Link>
            </div>
            <div className="mt-4 grid gap-3">
              {requestRows.length > 0 ? (
                requestRows.slice(0, 6).map((request) => <RequestRow key={request.id} request={request} />)
              ) : (
                <p className="rounded-lg bg-[#f8fbff] p-4 text-sm leading-6 text-[#68748c]">
                  No approval requests returned yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
            <p className="text-[11px] font-extrabold uppercase text-white/58">My approval queue</p>
            <h3 className="mt-2 text-lg font-extrabold">{taskRows.length} current tasks</h3>
            <div className="mt-5 space-y-3">
              {taskRows.length > 0 ? (
                taskRows.slice(0, 6).map((task) => <TaskRow key={task.id} task={task} />)
              ) : (
                <p className="text-sm leading-6 text-white/64">No pending approval tasks assigned to this session.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Request status mix</p>
            <div className="mt-4 space-y-2">
              {requestStatuses.map((status) => (
                <div key={status} className="flex items-center justify-between rounded-lg bg-[#f8fbff] px-3 py-2">
                  <span className="text-[12px] font-black text-[#4d566d]">{humanize(status)}</span>
                  <span className="text-sm font-black text-[#121a46]">{requestRows.filter((request) => request.status === status).length}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Delegation windows</p>
            <h3 className="mt-2 text-lg font-extrabold text-[#121a46]">{delegationRows.length} configured</h3>
            <div className="mt-4 space-y-2">
              {delegationRows.length > 0 ? (
                delegationRows.slice(0, 5).map((delegation) => (
                  <div key={delegation.id} className="rounded-lg bg-[#f8fbff] px-3 py-3">
                    <p className="truncate text-sm font-black text-[#151936]">
                      {displayUser(delegation.fromUser)} → {displayUser(delegation.toUser)}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">{delegation.module ?? "All modules"}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#68748c]">No active delegation records returned.</p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function WorkflowTable({ rows }: { rows: Workflow[] }) {
  if (rows.length === 0) {
    return (
      <div className="grid min-h-[320px] place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#eef5ff] text-[#2f6eea]">
            <Route size={30} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-extrabold text-[#121a46]">No workflows found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68748c]">
            Create workflow definitions before routing workforce actions and approvals.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-[0.08em] text-[#8a92a6]">
            <th className="border-b border-[#e5ebf5] px-5 py-3">Workflow</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Module</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Steps</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Requests</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Status</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((workflow) => (
            <tr key={workflow.id}>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef5ff] text-[#2f6eea]">
                    <GitPullRequestArrow size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[#151936]">{workflow.name}</span>
                    <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#7a8297]">{workflow.code}</span>
                  </span>
                </div>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">{workflow.module}</td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {workflow.steps.slice(0, 3).map((step) => (
                    <span key={step.id} className="rounded-full bg-[#f3f6fb] px-2.5 py-1 text-[11px] font-black text-[#68748c]">
                      {step.stepOrder}. {step.name}
                    </span>
                  ))}
                  {workflow.steps.length > 3 ? (
                    <span className="rounded-full bg-[#f3f6fb] px-2.5 py-1 text-[11px] font-black text-[#68748c]">
                      +{workflow.steps.length - 3}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-black text-[#151936]">{workflow._count?.requests ?? 0}</td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <StatusPill status={workflow.status} />
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-right">
                <Link
                  href={`/workflows?workflow=${workflow.id}`}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-[12px] font-black text-[#3820d7] transition hover:bg-[#f7f9fd]"
                >
                  Open builder
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestRow({ request }: { request: ApprovalRequest }) {
  return (
    <Link href={`/workflows?request=${request.id}`} className="flex items-center justify-between gap-4 rounded-xl bg-[#f8fbff] p-4 transition hover:bg-[#eef5ff]">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#151936]">{request.title}</p>
        <p className="mt-1 truncate text-[12px] font-semibold text-[#7a8297]">
          {request.module} · {request.workflow?.name ?? request.entityType}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase ${requestStatusClass(request.status)}`}>
        {humanize(request.status)}
      </span>
    </Link>
  );
}

function TaskRow({ task }: { task: ApprovalStepInstance }) {
  return (
    <Link href={`/workflows?request=${task.approvalRequestId}`} className="block rounded-lg border border-white/10 bg-white/8 p-4 transition hover:bg-white/12">
      <p className="truncate text-sm font-black">{task.name}</p>
      <p className="mt-1 truncate text-[12px] font-semibold text-white/58">
        {task.approvalRequest?.title ?? "Approval request"} · {task.assignedRole?.name ?? displayUser(task.assignedUser)}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase text-white/44">Step {task.stepOrder}</span>
        <ArrowRight size={15} className="text-white/44" aria-hidden="true" />
      </div>
    </Link>
  );
}

function FlowMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof Route;
  tone: "blue" | "green" | "amber" | "violet";
}) {
  const toneClass = {
    blue: "bg-[#eef5ff] text-[#2f6eea]",
    green: "bg-[#eaf9f2] text-[#0f9f72]",
    amber: "bg-[#fff4db] text-[#d97706]",
    violet: "bg-[#f1ebff] text-[#7c3aed]",
  }[tone];

  return (
    <article className="rounded-xl border border-[#e3e9f4] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase text-[#68748c]">{label}</p>
          <p className="mt-3 text-2xl font-extrabold text-[#121a46]">{value}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-lg ${toneClass}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function TopAction({ href, icon: Icon, label, primary = false }: { href: string; icon: typeof CirclePlus; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.18)]"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d]"
      }
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </Link>
  );
}

function StatusPill({ status }: { status: WorkflowStatus }) {
  const classes: Record<WorkflowStatus, string> = {
    DRAFT: "bg-[#eef5ff] text-[#2f6eea]",
    ACTIVE: "bg-[#eaf9f2] text-[#0f8f66]",
    INACTIVE: "bg-[#f3f4f8] text-[#596277]",
    ARCHIVED: "bg-[#fff5f5] text-[#b42318]",
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${classes[status]}`}>{humanize(status)}</span>;
}

function requestStatusClass(status: ApprovalRequestStatus) {
  const classes: Record<ApprovalRequestStatus, string> = {
    PENDING: "bg-[#fff4db] text-[#b66b00]",
    APPROVED: "bg-[#eaf9f2] text-[#0f8f66]",
    REJECTED: "bg-[#fff5f5] text-[#b42318]",
    CANCELLED: "bg-[#f3f4f8] text-[#596277]",
    WITHDRAWN: "bg-[#f3f4f8] text-[#596277]",
    COMPLETED: "bg-[#eef5ff] text-[#2f6eea]",
  };

  return classes[status];
}

function displayUser(user?: { email: string; username?: string | null } | null) {
  return user?.username ?? user?.email?.split("@")[0] ?? "Unassigned";
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
