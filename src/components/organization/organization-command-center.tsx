"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CirclePlus,
  Eye,
  Factory,
  Filter,
  GitFork,
  Landmark,
  Loader2,
  Network,
  Pencil,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type {
  CostCenter,
  OrganizationNode,
  OrganizationNodeType,
  OrganizationTreeNode,
  PaginatedCostCenters,
  PaginatedOrganizationNodes,
} from "@/lib/organization/types";

type OrganizationFilters = {
  search: string;
  type: string;
};

type OrganizationPanel = "node" | "cost-center" | "";
type OrganizationTab = "overview" | "nodes" | "cost-centers" | "tree";

type OrganizationModal =
  | { kind: "node"; mode: "create"; node?: never }
  | { kind: "node"; mode: "edit"; node: OrganizationNode }
  | { kind: "cost-center"; mode: "create"; costCenter?: never }
  | { kind: "cost-center"; mode: "edit"; costCenter: CostCenter };

type DetailState =
  | { kind: "node"; node: OrganizationNode }
  | { kind: "cost-center"; costCenter: CostCenter }
  | null;

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

const nodeTypes: Array<{ label: string; value: "" | OrganizationNodeType }> = [
  { label: "All types", value: "" },
  { label: "Company", value: "COMPANY" },
  { label: "Region", value: "REGION" },
  { label: "Country office", value: "COUNTRY_OFFICE" },
  { label: "Branch", value: "BRANCH" },
  { label: "Division", value: "DIVISION" },
  { label: "Department", value: "DEPARTMENT" },
  { label: "Unit", value: "UNIT" },
  { label: "Team", value: "TEAM" },
  { label: "Project group", value: "PROJECT_GROUP" },
];

export function OrganizationCommandCenter({
  nodes,
  tree,
  costCenters,
  filters,
  initialPanel,
  permissions,
}: {
  nodes: PaginatedOrganizationNodes | null;
  tree: OrganizationTreeNode[] | null;
  costCenters: PaginatedCostCenters | null;
  filters: OrganizationFilters;
  initialPanel: OrganizationPanel;
  permissions: {
    canWriteOrganization: boolean;
    canWriteCostCenters: boolean;
  };
}) {
  const router = useRouter();
  const nodeRows = nodes?.data ?? [];
  const costCenterRows = costCenters?.data ?? [];
  const treeRows = tree ?? [];
  const flattenedTree = flattenTree(treeRows);
  const activeNodes = nodeRows.filter((node) => node.isActive).length;
  const rootNodes = treeRows.length || nodeRows.filter((node) => !node.parentId).length;
  const assignmentLinks = nodeRows.reduce((sum, node) => sum + (node._count?.assignments ?? 0), 0);
  const positionLinks = nodeRows.reduce((sum, node) => sum + (node._count?.positions ?? 0), 0);
  const initialTab: OrganizationTab =
    initialPanel === "cost-center" ? "cost-centers" : filters.search || filters.type ? "nodes" : "overview";
  const [activeTab, setActiveTab] = useState<OrganizationTab>(initialTab);
  const [modalOverride, setModalOverride] = useState<OrganizationModal | null | undefined>(undefined);
  const [detail, setDetail] = useState<DetailState>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();
  const requestedModal: OrganizationModal | null =
    initialPanel === "node"
      ? { kind: "node", mode: "create" }
      : initialPanel === "cost-center"
        ? { kind: "cost-center", mode: "create" }
        : null;
  const modal = modalOverride === undefined ? requestedModal : modalOverride;

  function openCreate(kind: OrganizationModal["kind"]) {
    setNotice(null);
    setModalOverride({ kind, mode: "create" } as OrganizationModal);
    setActiveTab(kind === "node" ? "nodes" : "cost-centers");
    router.replace(`/organization?panel=${kind === "node" ? "node" : "cost-center"}`, { scroll: false });
  }

  function openEdit(entity: OrganizationModal) {
    setNotice(null);
    setModalOverride(entity);
    setActiveTab(entity.kind === "node" ? "nodes" : "cost-centers");
  }

  function closeModal() {
    setModalOverride(null);
    router.replace("/organization", { scroll: false });
  }

  async function onSubmitEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!modal) {
      return;
    }

    const canWrite =
      modal.kind === "node" ? permissions.canWriteOrganization : permissions.canWriteCostCenters;

    if (!canWrite) {
      setNotice({ type: "error", message: "You do not have permission to write this organization record." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const path =
      modal.kind === "node"
        ? modal.mode === "edit"
          ? `/organization/nodes/${modal.node.id}`
          : "/organization/nodes"
        : modal.mode === "edit"
          ? `/organization/cost-centers/${modal.costCenter.id}`
          : "/organization/cost-centers";
    const method = modal.mode === "edit" ? "PATCH" : "POST";
    const body =
      modal.kind === "node"
        ? prune({
            code: upperValue(formData, "code"),
            name: stringValue(formData, "name"),
            type: stringValue(formData, "type"),
            parentId: emptyToUndefined(stringValue(formData, "parentId")),
            description: stringValue(formData, "description"),
            isActive: booleanValue(formData, "isActive"),
            metadata: { source: "organization_workspace" },
          })
        : prune({
            code: upperValue(formData, "code"),
            name: stringValue(formData, "name"),
            organizationNodeId: emptyToUndefined(stringValue(formData, "organizationNodeId")),
            description: stringValue(formData, "description"),
            isActive: booleanValue(formData, "isActive"),
            metadata: { source: "organization_workspace" },
          });

    try {
      await apiFetch(path, {
        method,
        body: JSON.stringify(body),
      });
      setNotice({
        type: "success",
        message: `${modal.kind === "node" ? "Organization node" : "Cost center"} ${
          modal.mode === "edit" ? "updated" : "created"
        }.`,
      });
      closeModal();
      startTransition(() => router.refresh());
    } catch (caught) {
      setNotice({
        type: "error",
        message: caught instanceof Error ? caught.message : "Organization action failed.",
      });
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                Organization engine
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
                <Network size={13} aria-hidden="true" />
                Dynamic hierarchy
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.45rem,2.4vw,2.2rem)] font-extrabold leading-tight tracking-normal text-[#10143f]">
              Organization architecture without hardcoded departments.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Model companies, regions, branches, divisions, departments, units, and teams as flexible nodes tied to cost centers, positions, and assignments.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <TopAction
              icon={CirclePlus}
              label="New Node"
              primary
              disabled={!permissions.canWriteOrganization}
              onClick={() => openCreate("node")}
            />
            <TopAction
              icon={Factory}
              label="Cost Center"
              disabled={!permissions.canWriteCostCenters}
              onClick={() => openCreate("cost-center")}
            />
          </div>
        </div>

        {notice ? (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-[12px] font-bold ${
              notice.type === "success" ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#fff5f5] text-[#b42318]"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <OrgMetric label="Org nodes" value={nodeRows.length || flattenedTree.length} icon={Building2} tone="blue" />
          <OrgMetric label="Active nodes" value={activeNodes || flattenedTree.filter((node) => node.isActive).length} icon={ShieldCheck} tone="green" />
          <OrgMetric label="Root structures" value={rootNodes} icon={Landmark} tone="violet" />
          <OrgMetric label="Assignment links" value={assignmentLinks} icon={UsersRound} tone="amber" />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="border-b border-[#edf1f7] bg-[#fbfcff] p-3">
          <div role="tablist" aria-label="Organization workspace sections" className="grid gap-2 lg:grid-cols-4">
            {[
              { id: "overview" as const, label: "Overview", description: "Structure health and governance links", icon: ShieldCheck },
              { id: "nodes" as const, label: "Nodes", description: "Hierarchy registry and editing", icon: Building2 },
              { id: "cost-centers" as const, label: "Cost centers", description: "Finance ownership matrix", icon: Factory },
              { id: "tree" as const, label: "Tree", description: "Nested reporting architecture", icon: Network },
            ].map((tab) => (
              <WorkspaceTab
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === "overview" ? (
            <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-5">
                <p className="text-[11px] font-extrabold uppercase text-[#3820d7]">How this workspace works</p>
                <h3 className="mt-2 text-xl font-extrabold text-[#121a46]">
                  Build the hierarchy, then attach cost and workforce context.
                </h3>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
                  Nodes represent organizational reality. Cost centers represent financial ownership. Positions and assignments then connect employees to that structure over time.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <OverviewStep
                    title="1. Create root and child nodes"
                    body="Company, region, branch, department, unit, and team records stay dynamic."
                    onClick={() => setActiveTab("nodes")}
                  />
                  <OverviewStep
                    title="2. Attach cost centers"
                    body="Finance ownership can map to a node without hardcoding hierarchy."
                    onClick={() => setActiveTab("cost-centers")}
                  />
                  <OverviewStep
                    title="3. Review tree"
                    body="Validate the nested structure before assigning positions and employees."
                    onClick={() => setActiveTab("tree")}
                  />
                </div>
              </div>
              <OrganizationSidePanel
                flattenedTree={flattenedTree}
                costCenters={costCenterRows}
                positionLinks={positionLinks}
              />
            </section>
          ) : null}

          {activeTab === "nodes" ? (
            <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
                <div className="border-b border-[#e5ebf5] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Hierarchy registry</p>
                      <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">Organization nodes</h3>
                    </div>
                    <form action="/organization" className="grid gap-2 sm:grid-cols-[1fr_180px_auto] xl:w-[650px]">
                      <label className="flex h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-3 text-[13px] font-semibold text-[#7b8195]">
                        <Search size={16} aria-hidden="true" />
                        <input
                          name="search"
                          defaultValue={filters.search}
                          placeholder="Search node or code"
                          className="min-w-0 flex-1 bg-transparent text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                        />
                      </label>
                      <select
                        name="type"
                        defaultValue={filters.type}
                        className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none"
                      >
                        {nodeTypes.map((type) => (
                          <option key={type.value || "all"} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white">
                        <Filter size={15} aria-hidden="true" />
                        Apply
                      </button>
                    </form>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!permissions.canWriteOrganization}
                      onClick={() => openCreate("node")}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#3820d7] transition hover:bg-[#f7f9fd] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <CirclePlus size={14} aria-hidden="true" />
                      New node
                    </button>
                    {filters.search || filters.type ? (
                      <Link href="/organization" className="inline-flex h-10 items-center rounded-lg px-3 text-[12px] font-black text-[#68748c]">
                        Clear filters
                      </Link>
                    ) : null}
                  </div>
                </div>

                <NodeTable
                  nodes={nodeRows}
                  canEdit={permissions.canWriteOrganization}
                  onOpen={(node) => setDetail({ kind: "node", node })}
                  onEdit={(node) => openEdit({ kind: "node", mode: "edit", node })}
                  onCreate={() => openCreate("node")}
                />
              </div>

              <OrganizationSidePanel
                flattenedTree={flattenedTree}
                costCenters={costCenterRows}
                positionLinks={positionLinks}
              />
            </section>
          ) : null}

          {activeTab === "cost-centers" ? (
            <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
                <div className="flex flex-col gap-3 border-b border-[#e5ebf5] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Cost center matrix</p>
                    <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">{costCenterRows.length} finance centers</h3>
                  </div>
                  <button
                    type="button"
                    disabled={!permissions.canWriteCostCenters}
                    onClick={() => openCreate("cost-center")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.18)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <CirclePlus size={14} aria-hidden="true" />
                    New cost center
                  </button>
                </div>
                <CostCenterTable
                  costCenters={costCenterRows}
                  canEdit={permissions.canWriteCostCenters}
                  onOpen={(costCenter) => setDetail({ kind: "cost-center", costCenter })}
                  onEdit={(costCenter) => openEdit({ kind: "cost-center", mode: "edit", costCenter })}
                  onCreate={() => openCreate("cost-center")}
                />
              </div>

              <OrganizationSidePanel
                flattenedTree={flattenedTree}
                costCenters={costCenterRows}
                positionLinks={positionLinks}
              />
            </section>
          ) : null}

          {activeTab === "tree" ? (
            <section className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white">
              <p className="text-[11px] font-extrabold uppercase text-white/58">Org tree preview</p>
              <h3 className="mt-2 text-xl font-extrabold">Reporting architecture</h3>
              <div className="mt-5 max-h-[620px] space-y-2 overflow-y-auto pr-1">
                {flattenedTree.length > 0 ? (
                  flattenedTree.map((node) => <TreeRow key={node.id} node={node} />)
                ) : (
                  <p className="text-sm leading-6 text-white/64">No hierarchy nodes returned yet.</p>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <OrganizationEntityModal
        modal={modal}
        nodes={nodeRows}
        canWrite={
          modal?.kind === "node" ? permissions.canWriteOrganization : permissions.canWriteCostCenters
        }
        isPending={isPending}
        onClose={closeModal}
        onSubmit={onSubmitEntity}
      />
      <OrganizationDetailPanel
        detail={detail}
        canEdit={
          detail?.kind === "node" ? permissions.canWriteOrganization : permissions.canWriteCostCenters
        }
        onClose={() => setDetail(null)}
        onEdit={(value) => {
          if (value.kind === "node") {
            openEdit({ kind: "node", mode: "edit", node: value.node });
          } else {
            openEdit({ kind: "cost-center", mode: "edit", costCenter: value.costCenter });
          }
        }}
      />
    </div>
  );
}

function WorkspaceTab({
  tab,
  active,
  onClick,
}: {
  tab: { id: OrganizationTab; label: string; description: string; icon: LucideIcon };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex min-h-[74px] items-start gap-3 rounded-lg border p-3 text-left transition ${
        active
          ? "border-[#3820d7] bg-white shadow-[0_14px_30px_rgba(56,32,215,0.1)]"
          : "border-transparent bg-transparent hover:border-[#dfe8f6] hover:bg-white"
      }`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-[#3820d7] text-white" : "bg-[#eef2f8] text-[#667089]"}`}>
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-[#10143f]">{tab.label}</span>
        <span className="mt-1 line-clamp-2 block text-[11px] font-semibold leading-4 text-[#7a8297]">
          {tab.description}
        </span>
      </span>
    </button>
  );
}

function OverviewStep({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[#e3e9f4] bg-white p-4 text-left transition hover:border-[#cfd8ea]"
    >
      <p className="text-sm font-extrabold text-[#121a46]">{title}</p>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-[#68748c]">{body}</p>
    </button>
  );
}

function OrganizationSidePanel({
  flattenedTree,
  costCenters,
  positionLinks,
}: {
  flattenedTree: Array<OrganizationTreeNode & { depth: number }>;
  costCenters: CostCenter[];
  positionLinks: number;
}) {
  return (
    <aside className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
        <p className="text-[11px] font-extrabold uppercase text-white/58">Org tree preview</p>
        <h3 className="mt-2 text-lg font-extrabold">Reporting architecture</h3>
        <div className="mt-5 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {flattenedTree.length > 0 ? (
            flattenedTree.slice(0, 16).map((node) => <TreeRow key={node.id} node={node} />)
          ) : (
            <p className="text-sm leading-6 text-white/64">No hierarchy nodes returned yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Cost center matrix</p>
        <h3 className="mt-2 text-lg font-extrabold text-[#121a46]">{costCenters.length} centers</h3>
        <div className="mt-4 space-y-2">
          {costCenters.length > 0 ? (
            costCenters.slice(0, 8).map((costCenter) => (
              <CostCenterRow key={costCenter.id} costCenter={costCenter} />
            ))
          ) : (
            <p className="text-sm leading-6 text-[#68748c]">
              Cost centers will appear here once finance ownership is configured.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Governance links</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniFact label="Positions" value={positionLinks} />
          <MiniFact label="Cost centers" value={costCenters.length} />
        </div>
      </section>
    </aside>
  );
}

function NodeTable({
  nodes,
  canEdit,
  onOpen,
  onEdit,
  onCreate,
}: {
  nodes: OrganizationNode[];
  canEdit: boolean;
  onOpen: (node: OrganizationNode) => void;
  onEdit: (node: OrganizationNode) => void;
  onCreate: () => void;
}) {
  if (nodes.length === 0) {
    return (
      <div className="grid min-h-[340px] place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#eef5ff] text-[#2f6eea]">
            <GitFork size={30} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-extrabold text-[#121a46]">No organization nodes found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68748c]">
            Start with a company root, then add regions, branches, departments, and teams under it.
          </p>
          <button
            type="button"
            onClick={onCreate}
            disabled={!canEdit}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white disabled:opacity-55"
          >
            Create node
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-[0.08em] text-[#8a92a6]">
            <th className="border-b border-[#e5ebf5] px-5 py-3">Node</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Type</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Parent</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Linked records</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr key={node.id}>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef5ff] text-[#2f6eea]">
                    <Building2 size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[#151936]">{node.name}</span>
                    <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#7a8297]">{node.code}</span>
                  </span>
                </div>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">{humanize(node.type)}</td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">{node.parent?.name ?? "Root"}</td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <SmallPill label={`${node._count?.children ?? 0} children`} />
                  <SmallPill label={`${node._count?.positions ?? 0} positions`} />
                  <SmallPill label={`${node._count?.assignments ?? 0} assignments`} />
                </div>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(node)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-[12px] font-black text-[#3820d7]"
                  >
                    <Eye size={14} aria-hidden="true" />
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(node)}
                    disabled={!canEdit}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-[12px] font-black text-[#4d566d] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CostCenterTable({
  costCenters,
  canEdit,
  onOpen,
  onEdit,
  onCreate,
}: {
  costCenters: CostCenter[];
  canEdit: boolean;
  onOpen: (costCenter: CostCenter) => void;
  onEdit: (costCenter: CostCenter) => void;
  onCreate: () => void;
}) {
  if (costCenters.length === 0) {
    return (
      <div className="grid min-h-[300px] place-items-center p-8 text-center">
        <div>
          <Factory className="mx-auto text-[#7a8297]" size={34} aria-hidden="true" />
          <h3 className="mt-4 text-xl font-extrabold text-[#121a46]">No cost centers found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68748c]">
            Create finance ownership records and optionally attach them to organization nodes.
          </p>
          <button
            type="button"
            onClick={onCreate}
            disabled={!canEdit}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white disabled:opacity-55"
          >
            Create cost center
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-[0.08em] text-[#8a92a6]">
            <th className="border-b border-[#e5ebf5] px-5 py-3">Cost center</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Owner node</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Status</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {costCenters.map((costCenter) => (
            <tr key={costCenter.id}>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <p className="text-sm font-black text-[#151936]">{costCenter.name}</p>
                <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">{costCenter.code}</p>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">
                {costCenter.organizationNode?.name ?? "No org owner"}
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <StatusPill active={costCenter.isActive} />
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(costCenter)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-[12px] font-black text-[#3820d7]"
                  >
                    <Eye size={14} aria-hidden="true" />
                    Details
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(costCenter)}
                    disabled={!canEdit}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-[12px] font-black text-[#4d566d] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <Pencil size={14} aria-hidden="true" />
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrganizationEntityModal({
  modal,
  nodes,
  canWrite,
  isPending,
  onClose,
  onSubmit,
}: {
  modal: OrganizationModal | null;
  nodes: OrganizationNode[];
  canWrite: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  if (!modal) {
    return null;
  }

  const isNode = modal.kind === "node";
  const title = `${modal.mode === "edit" ? "Edit" : "Create"} ${isNode ? "organization node" : "cost center"}`;
  const code = isNode ? modal.node?.code : modal.costCenter?.code;
  const name = isNode ? modal.node?.name : modal.costCenter?.name;
  const description = isNode ? modal.node?.description : modal.costCenter?.description;
  const active = isNode ? modal.node?.isActive : modal.costCenter?.isActive;

  return (
    <div className="fixed inset-0 z-[90] grid min-h-dvh place-items-center bg-[#10143f]/50 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Close organization dialog" onClick={onClose} className="absolute inset-0 cursor-default" />
      <form
        key={`${modal.kind}-${modal.mode}-${code ?? "new"}`}
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="organization-modal-title"
        className="relative w-full max-w-[640px] overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_30px_90px_rgba(18,31,67,0.24)]"
      >
        <div className="border-b border-[#edf1f7] bg-[#fbfcff] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ece9ff] text-[#3820d7]">
                {isNode ? <Building2 size={19} aria-hidden="true" /> : <Factory size={19} aria-hidden="true" />}
              </span>
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Organization workspace</p>
                <h3 id="organization-modal-title" className="mt-1 text-xl font-extrabold text-[#10143f]">
                  {title}
                </h3>
                <p className="mt-1 max-w-md text-[12px] font-semibold leading-5 text-[#7a8297]">
                  {isNode
                    ? "Nodes keep hierarchy flexible across companies, branches, departments, units, and teams."
                    : "Cost centers connect finance ownership to the organization model."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#dfe8f6] bg-white text-[#68748c] transition hover:border-[#cfd8ea] hover:text-[#10143f]"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <fieldset disabled={!canWrite || isPending} className="grid gap-4 p-5">
          {!canWrite ? (
            <div className="rounded-xl border border-[#ffe2e2] bg-[#fff7f7] p-4 text-[12px] font-bold leading-5 text-[#b42318]">
              You do not have permission to write this record.
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="code" label="Code" placeholder={isNode ? "HR-DEPT" : "HR-001"} defaultValue={code ?? ""} required />
            <Field name="name" label="Name" placeholder={isNode ? "Human Resources" : "HR Operations"} defaultValue={name ?? ""} required />
          </div>
          {isNode ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                name="type"
                label="Node type"
                defaultValue={modal.node?.type ?? "DEPARTMENT"}
                options={nodeTypes.filter((type) => type.value).map((type) => ({ label: type.label, value: type.value }))}
              />
              <SelectField
                name="parentId"
                label="Parent node"
                defaultValue={modal.node?.parentId ?? ""}
                options={[
                  { label: "Root node", value: "" },
                  ...nodes
                    .filter((node) => node.id !== modal.node?.id)
                    .map((node) => ({ label: `${node.name} (${node.code})`, value: node.id })),
                ]}
              />
            </div>
          ) : (
            <SelectField
              name="organizationNodeId"
              label="Organization owner"
              defaultValue={modal.costCenter?.organizationNodeId ?? ""}
              options={[
                { label: "No org owner", value: "" },
                ...nodes.map((node) => ({ label: `${node.name} (${node.code})`, value: node.id })),
              ]}
            />
          )}
          <Field name="description" label="Description" placeholder="Short governance note" defaultValue={description ?? ""} />
          <label className="flex items-center justify-between gap-3 rounded-lg border border-[#d8dfea] bg-[#f8faff] px-3 py-3">
            <span className="text-[12px] font-bold text-[#4f5262]">Active</span>
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={active ?? true}
              className="h-4 w-4 accent-[#3820d7]"
            />
          </label>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 border-t border-[#edf1f7] bg-white p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#d8dfea] bg-white px-4 text-[12px] font-extrabold text-[#10143f] transition hover:border-[#cfd8ea]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canWrite || isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#3820d7] px-5 text-[12px] font-extrabold text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CirclePlus size={15} aria-hidden="true" />}
            {modal.mode === "edit" ? "Save changes" : "Create record"}
          </button>
        </div>
      </form>
    </div>
  );
}

function OrganizationDetailPanel({
  detail,
  canEdit,
  onClose,
  onEdit,
}: {
  detail: DetailState;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (detail: Exclude<DetailState, null>) => void;
}) {
  if (!detail) {
    return null;
  }

  const isNode = detail.kind === "node";
  const title = isNode ? detail.node.name : detail.costCenter.name;
  const code = isNode ? detail.node.code : detail.costCenter.code;
  const active = isNode ? detail.node.isActive : detail.costCenter.isActive;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-[#10143f]/30 backdrop-blur-sm">
      <button type="button" aria-label="Close detail panel" onClick={onClose} className="absolute inset-0 cursor-default" />
      <aside className="relative h-full w-full max-w-[460px] overflow-y-auto border-l border-[#dfe8f6] bg-white p-5 shadow-[0_20px_70px_rgba(18,31,67,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">{isNode ? "Organization node" : "Cost center"}</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#10143f]">{title}</h3>
            <p className="mt-1 text-sm font-bold text-[#7a8297]">{code}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[#dfe8f6]">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <DetailFact label="Status" value={active ? "Active" : "Inactive"} />
          {isNode ? (
            <>
              <DetailFact label="Type" value={humanize(detail.node.type)} />
              <DetailFact label="Parent" value={detail.node.parent?.name ?? "Root"} />
              <DetailFact label="Children" value={detail.node._count?.children ?? 0} />
              <DetailFact label="Positions" value={detail.node._count?.positions ?? 0} />
              <DetailFact label="Assignments" value={detail.node._count?.assignments ?? 0} />
            </>
          ) : (
            <>
              <DetailFact label="Owner node" value={detail.costCenter.organizationNode?.name ?? "No org owner"} />
              <DetailFact label="Description" value={detail.costCenter.description ?? "No description"} />
            </>
          )}
        </div>

        <button
          type="button"
          disabled={!canEdit}
          onClick={() => onEdit(detail)}
          className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          <Pencil size={14} aria-hidden="true" />
          Edit record
        </button>
      </aside>
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <p className="text-[10px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#121a46]">{value}</p>
    </div>
  );
}

function TreeRow({ node }: { node: OrganizationTreeNode & { depth: number } }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/8 px-3 py-2" style={{ marginLeft: node.depth * 12 }}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-white/76">
        <Building2 size={14} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black">{node.name}</span>
        <span className="block truncate text-[11px] font-semibold text-white/50">{humanize(node.type)}</span>
      </span>
    </div>
  );
}

function CostCenterRow({ costCenter }: { costCenter: CostCenter }) {
  return (
    <div className="rounded-lg bg-[#f8fbff] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-black text-[#151936]">{costCenter.name}</p>
        <StatusPill active={costCenter.isActive} />
      </div>
      <p className="mt-1 truncate text-[12px] font-semibold text-[#7a8297]">
        {costCenter.code} · {costCenter.organizationNode?.name ?? "No org owner"}
      </p>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={active ? "rounded-full bg-[#eaf9f2] px-2.5 py-1 text-[10px] font-black uppercase text-[#0f8f66]" : "rounded-full bg-[#f3f4f8] px-2.5 py-1 text-[10px] font-black uppercase text-[#596277]"}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function OrgMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: "blue" | "green" | "violet" | "amber";
}) {
  const toneClass = {
    blue: "bg-[#eef5ff] text-[#2f6eea]",
    green: "bg-[#eaf9f2] text-[#0f9f72]",
    violet: "bg-[#f1ebff] text-[#7c3aed]",
    amber: "bg-[#fff4db] text-[#d97706]",
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

function TopAction({
  icon: Icon,
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        primary
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.18)] disabled:cursor-not-allowed disabled:opacity-55"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d] disabled:cursor-not-allowed disabled:opacity-55"
      }
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </button>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#4f5262]">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1.5 h-10 w-full rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-3 text-[12px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#a9adbd] focus:border-[#3820d7] focus:bg-white"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#4f5262]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 h-10 w-full rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-3 text-[12px] font-semibold text-[#19162f] outline-none transition focus:border-[#3820d7] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SmallPill({ label }: { label: string }) {
  return <span className="rounded-full bg-[#f3f6fb] px-2.5 py-1 text-[11px] font-black text-[#68748c]">{label}</span>;
}

function MiniFact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[#f8fbff] p-3">
      <p className="text-[10px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#121a46]">{value}</p>
    </div>
  );
}

function flattenTree(nodes: OrganizationTreeNode[], depth = 0): Array<OrganizationTreeNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children ?? [], depth + 1),
  ]);
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stringValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function upperValue(formData: FormData, key: string) {
  return stringValue(formData, key)?.toUpperCase();
}

function emptyToUndefined(value?: string) {
  return value || undefined;
}

function booleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function prune<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<T>;
}
