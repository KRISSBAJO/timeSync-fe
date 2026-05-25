"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CirclePlus,
  Crown,
  Filter,
  GitBranch,
  Search,
  ShieldAlert,
  Target,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { CostCenter, PaginatedCostCenters, PaginatedOrganizationNodes, OrganizationNode } from "@/lib/organization/types";
import type {
  PaginatedGrades,
  PaginatedLevels,
  PaginatedPositions,
  PaginatedSkills,
  Position,
  PositionStatus,
  PositionSummary,
  PositionTreeNode,
} from "@/lib/positions/types";

type PositionFilters = {
  search: string;
  status: string;
  vacantOnly: string;
  overBudgetOnly: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

const positionStatuses: Array<{ label: string; value: "" | PositionStatus }> = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Frozen", value: "FROZEN" },
  { label: "Closed", value: "CLOSED" },
  { label: "Archived", value: "ARCHIVED" },
];

export function PositionControlCenter({
  positions,
  summary,
  tree,
  grades,
  levels,
  skills,
  organizationNodes,
  costCenters,
  filters,
  initialPanel,
  permissions,
}: {
  positions: PaginatedPositions | null;
  summary: PositionSummary | null;
  tree: PositionTreeNode[] | null;
  grades: PaginatedGrades | null;
  levels: PaginatedLevels | null;
  skills: PaginatedSkills | null;
  organizationNodes: PaginatedOrganizationNodes | null;
  costCenters: PaginatedCostCenters | null;
  filters: PositionFilters;
  initialPanel: "create" | null;
  permissions: {
    canWritePositions: boolean;
  };
}) {
  const router = useRouter();
  const rows = positions?.data ?? [];
  const organizationRows = organizationNodes?.data ?? [];
  const costCenterRows = costCenters?.data ?? [];
  const gradeRows = grades?.data ?? [];
  const levelRows = levels?.data ?? [];
  const treeRows = flattenTree(tree ?? []);
  const byStatus = summary?.byStatus ?? {};
  const utilization = summary?.utilizationRate ?? averageUtilization(rows);
  const riskCount = summary?.positionsAtRisk?.length ?? rows.filter((position) => position.capacity.overBudget > 0).length;
  const [createOpen, setCreateOpen] = useState(initialPanel === "create");
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setCreateOpen(true);
    router.replace(positionHref(filters, { panel: "create" }), { scroll: false });
  }

  function closeCreate() {
    setCreateOpen(false);
    router.replace(positionHref(filters), { scroll: false });
  }

  async function onCreatePosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!permissions.canWritePositions) {
      setNotice({ type: "error", message: "You need positions.write to create positions." });
      return;
    }

    const formData = new FormData(event.currentTarget);

    try {
      await apiFetch("/positions", {
        method: "POST",
        body: JSON.stringify(prune({
          code: stringValue(formData, "code").toUpperCase(),
          title: stringValue(formData, "title"),
          description: stringValue(formData, "description"),
          status: stringValue(formData, "status") || "DRAFT",
          organizationNodeId: stringValue(formData, "organizationNodeId"),
          costCenterId: stringValue(formData, "costCenterId"),
          gradeId: stringValue(formData, "gradeId"),
          levelId: stringValue(formData, "levelId"),
          reportsToPositionId: stringValue(formData, "reportsToPositionId"),
          budgetedHeadcount: numberValue(formData, "budgetedHeadcount") ?? 1,
          isCritical: formData.get("isCritical") === "on",
          isExecutive: formData.get("isExecutive") === "on",
          metadata: { source: "positions_workspace" },
        })),
      });

      setNotice({ type: "success", message: "Position created. Refreshing the position board." });
      event.currentTarget.reset();
      setCreateOpen(false);
      startTransition(() => router.refresh());
    } catch (caught) {
      setNotice({
        type: "error",
        message: caught instanceof Error ? caught.message : "Position creation failed.",
      });
    }
  }

  return (
    <div className="space-y-5">
      {notice ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-bold ${
            notice.type === "success"
              ? "border border-[#c8f3df] bg-[#eaf9f2] text-[#0f8f66]"
              : "border border-[#ffd5d5] bg-[#fff5f5] text-[#b42318]"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                Position planning
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
                <Target size={13} aria-hidden="true" />
                Position control
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.45rem,2.4vw,2.2rem)] font-extrabold leading-tight tracking-normal text-[#10143f]">
              Approved workforce slots, vacancies, and capacity intelligence.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Govern position hierarchy, grades, levels, skills, vacancy exposure, and over-budget risk before workforce movement happens.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <button
              type="button"
              onClick={openCreate}
              disabled={!permissions.canWritePositions}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.18)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <CirclePlus size={15} aria-hidden="true" />
              {permissions.canWritePositions ? "New Position" : "Read only"}
            </button>
            <TopAction href="/positions?vacantOnly=true" icon={BriefcaseBusiness} label="Vacancies" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <PositionMetric label="Positions" value={summary?.totalPositions ?? rows.length} icon={GitBranch} tone="blue" />
          <PositionMetric label="Vacant headcount" value={summary?.totalVacant ?? sum(rows, "vacant")} icon={BriefcaseBusiness} tone="amber" />
          <PositionMetric label="Utilization" value={`${Math.round(utilization)}%`} icon={BadgeCheck} tone="green" />
          <PositionMetric label="Risk flags" value={riskCount} icon={ShieldAlert} tone="red" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
          <div className="border-b border-[#e5ebf5] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Position board</p>
                <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">Capacity controlled roles</h3>
              </div>
              <form action="/positions" className="grid gap-2 sm:grid-cols-[1fr_160px_auto] xl:w-[650px]">
                <label className="flex h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-3 text-[13px] font-semibold text-[#7b8195]">
                  <Search size={16} aria-hidden="true" />
                  <input
                    name="search"
                    defaultValue={filters.search}
                    placeholder="Search title, code, org"
                    className="min-w-0 flex-1 bg-transparent text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  />
                </label>
                <select
                  name="status"
                  defaultValue={filters.status}
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none"
                >
                  {positionStatuses.map((status) => (
                    <option key={status.value || "all"} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white">
                  <Filter size={15} aria-hidden="true" />
                  Apply
                </button>
              </form>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {positionStatuses.map((status) => {
                const active = filters.status === status.value;
                const count = status.value ? byStatus[status.value] ?? rows.filter((position) => position.status === status.value).length : summary?.totalPositions ?? rows.length;

                return (
                  <Link
                    key={status.value || "all"}
                    href={statusHref(filters, status.value)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-black transition ${
                      active
                        ? "border-[#3820d7] bg-[#3820d7] text-white"
                        : "border-[#dfe6f1] bg-white text-[#596277] hover:bg-[#f7f9fd]"
                    }`}
                  >
                    {status.label}
                    <span className={active ? "ml-2 text-white/70" : "ml-2 text-[#9aa3b6]"}>{count}</span>
                  </Link>
                );
              })}
              <Link href="/positions?vacantOnly=true" className="shrink-0 rounded-full border border-[#ffdba2] bg-[#fff8ed] px-3 py-2 text-[11px] font-black text-[#b66b00]">
                Vacant only
              </Link>
              <Link href="/positions?overBudgetOnly=true" className="shrink-0 rounded-full border border-[#ffd0d0] bg-[#fff5f5] px-3 py-2 text-[11px] font-black text-[#b42318]">
                Over budget
              </Link>
            </div>
          </div>

          <PositionTable rows={rows} />
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
            <p className="text-[11px] font-extrabold uppercase text-white/58">Hierarchy preview</p>
            <h3 className="mt-2 text-lg font-extrabold">Position reporting tree</h3>
            <div className="mt-5 max-h-[400px] space-y-2 overflow-y-auto pr-1">
              {treeRows.length > 0 ? (
                treeRows.slice(0, 14).map((position) => <TreeRow key={position.id} position={position} />)
              ) : (
                <p className="text-sm leading-6 text-white/64">No position hierarchy returned yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Position risks</p>
            <div className="mt-4 space-y-2">
              {(summary?.positionsAtRisk ?? []).length > 0 ? (
                summary?.positionsAtRisk.slice(0, 6).map((risk) => (
                  <div key={risk.positionId} className="rounded-lg bg-[#fff8ed] px-3 py-3">
                    <p className="truncate text-sm font-black text-[#151936]">{risk.title}</p>
                    <p className="mt-1 text-[12px] font-black text-[#b66b00]">{humanize(risk.reason)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#68748c]">No over-budget or critical vacancy risks reported.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Framework</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniFact label="Grades" value={grades?.data.length ?? 0} />
              <MiniFact label="Levels" value={levels?.data.length ?? 0} />
              <MiniFact label="Skills" value={skills?.data.length ?? 0} />
              <MiniFact label="Executive" value={summary?.executivePositions ?? 0} />
            </div>
          </section>
        </aside>
      </section>

      <CreatePositionModal
        open={createOpen}
        canWrite={permissions.canWritePositions}
        isPending={isPending}
        positions={rows}
        organizationNodes={organizationRows}
        costCenters={costCenterRows}
        grades={gradeRows}
        levels={levelRows}
        onClose={closeCreate}
        onSubmit={onCreatePosition}
      />
    </div>
  );
}

function PositionTable({ rows }: { rows: Position[] }) {
  if (rows.length === 0) {
    return (
      <div className="grid min-h-[340px] place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#eef5ff] text-[#2f6eea]">
            <GitBranch size={30} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-extrabold text-[#121a46]">No positions found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68748c]">
            Create approved workforce slots before assigning employees.
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
            <th className="border-b border-[#e5ebf5] px-5 py-3">Position</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Status</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Capacity</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Org ownership</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3">Level</th>
            <th className="border-b border-[#e5ebf5] px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((position) => (
            <tr key={position.id}>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef5ff] text-[#2f6eea]">
                    {position.isExecutive ? <Crown size={18} aria-hidden="true" /> : <BriefcaseBusiness size={18} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[#151936]">{position.title}</span>
                    <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#7a8297]">{position.code}</span>
                  </span>
                </div>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <StatusPill status={position.status} />
                {position.isCritical ? <p className="mt-2 text-[11px] font-black text-[#b66b00]">Critical role</p> : null}
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4">
                <p className="text-sm font-black text-[#151936]">
                  {position.capacity.occupied}/{position.capacity.budgetedHeadcount}
                </p>
                <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
                  {position.capacity.vacant} vacant · {Math.round(position.capacity.utilizationRate)}%
                </p>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">
                {position.organizationNode?.name ?? "Unassigned"}
                <p className="mt-1 text-[12px] font-semibold text-[#8a92a6]">{position.costCenter?.name ?? "No cost center"}</p>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">
                {position.grade?.code ?? "No grade"}
                <p className="mt-1 text-[12px] font-semibold text-[#8a92a6]">{position.level?.code ?? "No level"}</p>
              </td>
              <td className="border-b border-[#edf1f7] px-5 py-4 text-right">
                <Link
                  href={`/positions?position=${position.id}`}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-[12px] font-black text-[#3820d7] transition hover:bg-[#f7f9fd]"
                >
                  Open
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

function CreatePositionModal({
  open,
  canWrite,
  isPending,
  positions,
  organizationNodes,
  costCenters,
  grades,
  levels,
  onClose,
  onSubmit,
}: {
  open: boolean;
  canWrite: boolean;
  isPending: boolean;
  positions: Position[];
  organizationNodes: OrganizationNode[];
  costCenters: CostCenter[];
  grades: PaginatedGrades["data"];
  levels: PaginatedLevels["data"];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#101735]/55 px-4 py-6 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#dfe8f6] bg-white shadow-[0_26px_80px_rgba(18,31,67,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#edf1f7] bg-[#fbfcff] p-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase text-[#3820d7]">Create position control slot</p>
            <h3 className="mt-2 text-2xl font-extrabold text-[#10143f]">New workforce position</h3>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-[#68748c]">
              Create an approved slot first, then assign employees through effective-dated assignments.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dfe8f6] bg-white text-[#68748c] transition hover:text-[#10143f]"
            aria-label="Close create position"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <fieldset disabled={!canWrite || isPending} className="max-h-[68vh] overflow-y-auto p-5">
          {!canWrite ? (
            <div className="mb-5 rounded-xl border border-[#ffd5d5] bg-[#fff5f5] px-4 py-3 text-sm font-bold text-[#b42318]">
              You have read access to positions, but not positions.write.
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Field name="code" label="Position code" placeholder="POS-HR-001" required />
            <Field name="title" label="Position title" placeholder="HR Operations Manager" required />
            <SelectField name="status" label="Status" defaultValue="DRAFT" options={positionStatuses.filter((status) => status.value).map((status) => ({ label: status.label, value: status.value }))} />
            <Field name="budgetedHeadcount" label="Budgeted headcount" type="number" placeholder="1" />
            <SelectField
              name="organizationNodeId"
              label="Organization ownership"
              defaultValue=""
              options={[
                { label: "Unassigned", value: "" },
                ...organizationNodes.map((node) => ({ label: `${node.name} (${humanize(node.type)})`, value: node.id })),
              ]}
            />
            <SelectField
              name="costCenterId"
              label="Cost center"
              defaultValue=""
              options={[
                { label: "No cost center", value: "" },
                ...costCenters.map((costCenter) => ({ label: `${costCenter.name} (${costCenter.code})`, value: costCenter.id })),
              ]}
            />
            <SelectField
              name="gradeId"
              label="Grade"
              defaultValue=""
              options={[
                { label: "No grade", value: "" },
                ...grades.map((grade) => ({ label: `${grade.name} (${grade.code})`, value: grade.id })),
              ]}
            />
            <SelectField
              name="levelId"
              label="Level"
              defaultValue=""
              options={[
                { label: "No level", value: "" },
                ...levels.map((level) => ({ label: `${level.name} (${level.code})`, value: level.id })),
              ]}
            />
            <SelectField
              name="reportsToPositionId"
              label="Reports to position"
              defaultValue=""
              options={[
                { label: "No reporting position", value: "" },
                ...positions.map((position) => ({ label: `${position.title} (${position.code})`, value: position.id })),
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxField name="isCritical" label="Critical role" />
              <CheckboxField name="isExecutive" label="Executive role" />
            </div>
            <label className="block lg:col-span-2">
              <span className="text-[11px] font-bold text-[#4f5262]">Description</span>
              <textarea
                name="description"
                rows={4}
                placeholder="Describe the position purpose, control requirements, and workforce planning notes."
                className="mt-1.5 w-full rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-3 py-3 text-[12px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#a9adbd] focus:border-[#3820d7] focus:bg-white"
              />
            </label>
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 border-t border-[#edf1f7] bg-white p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[#dfe8f6] px-4 text-[12px] font-black text-[#4d566d] transition hover:bg-[#f8fbff]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canWrite || isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-5 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.18)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <CirclePlus size={15} aria-hidden="true" />
            {isPending ? "Creating..." : "Create position"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TreeRow({ position }: { position: PositionTreeNode & { depth: number } }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 px-3 py-2" style={{ marginLeft: position.depth * 12 }}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-black">{position.title}</p>
        <span className="text-[11px] font-black text-white/58">{position.capacity.occupied}/{position.capacity.budgetedHeadcount}</span>
      </div>
      <p className="mt-1 truncate text-[11px] font-semibold text-white/50">{position.code} · {humanize(position.status)}</p>
    </div>
  );
}

function PositionMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof GitBranch;
  tone: "blue" | "green" | "amber" | "red";
}) {
  const toneClass = {
    blue: "bg-[#eef5ff] text-[#2f6eea]",
    green: "bg-[#eaf9f2] text-[#0f9f72]",
    amber: "bg-[#fff4db] text-[#d97706]",
    red: "bg-[#fff5f5] text-[#b42318]",
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

function StatusPill({ status }: { status: PositionStatus }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(status)}`}>{humanize(status)}</span>;
}

function MiniFact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[#f8fbff] p-3">
      <p className="text-[10px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#121a46]">{value}</p>
    </div>
  );
}

function flattenTree(nodes: PositionTreeNode[], depth = 0): Array<PositionTreeNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children ?? [], depth + 1),
  ]);
}

function averageUtilization(positions: Position[]) {
  if (positions.length === 0) {
    return 0;
  }

  return positions.reduce((total, position) => total + position.capacity.utilizationRate, 0) / positions.length;
}

function sum(positions: Position[], key: "vacant" | "occupied" | "overBudget") {
  return positions.reduce((total, position) => total + position.capacity[key], 0);
}

function statusHref(filters: PositionFilters, status: string) {
  return positionHref({ ...filters, status });
}

function positionHref(filters: PositionFilters, extra?: Record<string, string>) {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.vacantOnly) params.set("vacantOnly", "true");
  if (filters.overBudgetOnly) params.set("overBudgetOnly", "true");

  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/positions?${query}` : "/positions";
}

function statusClass(status: PositionStatus) {
  const classes: Record<PositionStatus, string> = {
    DRAFT: "bg-[#eef5ff] text-[#2f6eea]",
    ACTIVE: "bg-[#eaf9f2] text-[#0f8f66]",
    FROZEN: "bg-[#fff4db] text-[#b66b00]",
    CLOSED: "bg-[#f3f4f8] text-[#596277]",
    ARCHIVED: "bg-[#fff5f5] text-[#b42318]",
  };

  return classes[status] ?? "bg-[#f3f4f8] text-[#596277]";
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#4f5262]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        min={type === "number" ? 1 : undefined}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-3 text-[12px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#a9adbd] focus:border-[#3820d7] focus:bg-white"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  defaultValue: string;
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
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex h-10 items-center justify-between gap-3 rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-3">
      <span className="text-[12px] font-bold text-[#4f5262]">{label}</span>
      <input name={name} type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
    </label>
  );
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function prune<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== "" && value !== undefined),
  );
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
