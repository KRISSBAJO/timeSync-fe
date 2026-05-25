"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CirclePlus,
  FileSpreadsheet,
  Filter,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { BulkWorkforceTools } from "@/components/workforce/bulk-workforce-tools";
import { EmployeeDetailPanel } from "@/components/workforce/employee-detail-panel";
import { apiFetch } from "@/lib/api/client";
import type { AssignmentCatalogs } from "@/components/workforce/employee-assignment-editor";
import type {
  EmployeeDetails,
  EmployeeListItem,
  EmployeeNumberPreview,
  EmployeeStatus,
  EmployeeSummary,
  EmploymentType,
  PaginatedEmployeeImportBatches,
  PaginatedEmployees,
  TimelineEvent,
  WorkforceAction,
  WorkforceAssignment,
  WorkforcePerson,
} from "@/lib/workforce/types";

type WorkforceFilters = {
  search: string;
  status: string;
  employmentType: string;
};

type WorkforcePagination = {
  cursor: string;
  cursorStack: string[];
  pageSize: number;
  pageNumber: number;
};

type WorkforcePanel = "create" | "";
type WorkforceTab = "overview" | "directory" | "imports" | "profile";

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

const employeeStatuses: Array<{ label: string; value: "" | EmployeeStatus }> = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Preboarding", value: "PREBOARDING" },
  { label: "Probation", value: "PROBATION" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Separated", value: "SEPARATED" },
  { label: "Alumni", value: "ALUMNI" },
];

const employmentTypes: Array<{ label: string; value: "" | EmploymentType }> = [
  { label: "All worker types", value: "" },
  { label: "Full time", value: "FULL_TIME" },
  { label: "Part time", value: "PART_TIME" },
  { label: "Contract", value: "CONTRACT" },
  { label: "Consultant", value: "CONSULTANT" },
  { label: "Intern", value: "INTERN" },
  { label: "Temporary", value: "TEMPORARY" },
  { label: "Outsourced", value: "OUTSOURCED" },
];

export function WorkforceCommandCenter({
  employees,
  summary,
  numberPreview,
  selectedEmployee,
  workforceActions,
  timelineEvents,
  assignmentHistory,
  assignmentCatalogs,
  importBatches,
  filters,
  pagination,
  initialPanel,
  permissions,
}: {
  employees: PaginatedEmployees | null;
  summary: EmployeeSummary | null;
  numberPreview: EmployeeNumberPreview | null;
  selectedEmployee: EmployeeDetails | null;
  workforceActions: WorkforceAction[] | null;
  timelineEvents: TimelineEvent[] | null;
  assignmentHistory: WorkforceAssignment[] | null;
  assignmentCatalogs: AssignmentCatalogs;
  importBatches: PaginatedEmployeeImportBatches | null;
  filters: WorkforceFilters;
  pagination: WorkforcePagination;
  initialPanel: WorkforcePanel;
  permissions: {
    canWritePersons: boolean;
    canWriteEmployees: boolean;
    canSuspendEmployees: boolean;
    canSeparateEmployees: boolean;
    canReadWorkforceActions: boolean;
    canReadTimeline: boolean;
    canReadAssignments: boolean;
    canWriteAssignments: boolean;
  };
}) {
  const router = useRouter();
  const initialTab: WorkforceTab = selectedEmployee
    ? "profile"
    : pagination.cursor || [filters.search, filters.status, filters.employmentType].filter(Boolean).length > 0
      ? "directory"
      : "overview";
  const [notice, setNotice] = useState<Notice>(null);
  const [activeTab, setActiveTab] = useState<WorkforceTab>(initialTab);
  const [createPanelOverride, setCreatePanelOverride] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rows = employees?.data ?? [];
  const byStatus = summary?.byStatus ?? {};
  const activeFilterCount = [filters.search, filters.status, filters.employmentType].filter(Boolean).length;
  const activeWorkforce = summary?.activeWorkforce ?? countStatuses(rows, ["ACTIVE", "PROBATION", "SUSPENDED"]);
  const total = summary?.total ?? rows.length;
  const unassigned = rows.filter((employee) => !primaryAssignment(employee)).length;
  const canCreateEmployee = permissions.canWriteEmployees && permissions.canWritePersons;
  const createPanelOpen = createPanelOverride ?? initialPanel === "create";

  function openCreatePanel() {
    setNotice(null);
    setCreatePanelOverride(true);
    router.replace("/workforce?panel=create", { scroll: false });
  }

  function closeCreatePanel() {
    setCreatePanelOverride(false);
    router.replace("/workforce", { scroll: false });
  }

  async function onCreateEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!canCreateEmployee) {
      setNotice({
        type: "error",
        message: "Creating an employee requires both persons.write and employees.write.",
      });
      return;
    }

    const formData = new FormData(event.currentTarget);

    try {
      setIsCreating(true);
      const person = await apiFetch<{ id: string }>("/persons", {
        method: "POST",
        body: JSON.stringify(
          prune({
            firstName: stringValue(formData, "firstName"),
            lastName: stringValue(formData, "lastName"),
            preferredName: stringValue(formData, "preferredName"),
            metadata: { source: "workforce_create_panel" },
          }),
        ),
      });
      const employee = await apiFetch<{ id: string }>("/employees", {
        method: "POST",
        body: JSON.stringify(
          prune({
            personId: person.id,
            employeeNumber:
              stringValue(formData, "useManualEmployeeNumber") === "on"
                ? stringValue(formData, "employeeNumber")
                : undefined,
            status: stringValue(formData, "status") ?? "PREBOARDING",
            employmentType: stringValue(formData, "employmentType") ?? "FULL_TIME",
            hireDate: dateValue(formData, "hireDate"),
            source: "workforce-create-panel",
            metadata: { source: "workforce_create_panel" },
          }),
        ),
      });

      setNotice({ type: "success", message: "Employee created and opened." });
      setCreatePanelOverride(false);
      setActiveTab("profile");
      startTransition(() => {
        router.push(`/workforce?employee=${employee.id}`);
        router.refresh();
      });
    } catch (caught) {
      setNotice({
        type: "error",
        message: caught instanceof Error ? caught.message : "Employee creation failed.",
      });
    } finally {
      setIsCreating(false);
    }
  }

  if (selectedEmployee) {
    const selectedAssignment = primaryAssignment(selectedEmployee);

    return (
      <div id="employee-record" className="scroll-mt-28 space-y-5">
        <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eef5ff] text-sm font-black text-[#2f6eea]">
                {initials(selectedEmployee.person)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                    Employee record
                  </span>
                  <StatusPill status={selectedEmployee.status} />
                </div>
                <h2 className="mt-2 truncate text-2xl font-black text-[#10143f]">
                  {personName(selectedEmployee.person)}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-[#5d6782]">
                  {selectedEmployee.employeeNumber} · {humanize(selectedEmployee.employmentType)} · {assignmentTitle(selectedAssignment)} ·{" "}
                  {assignmentSubline(selectedAssignment)}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:max-w-3xl">
                  <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#7b849b]">Manager</p>
                    <p className="mt-1 truncate text-sm font-black text-[#10143f]">{managerName(selectedAssignment)}</p>
                  </div>
                  <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#7b849b]">Current assignment</p>
                    <p className="mt-1 truncate text-sm font-black text-[#10143f]">{assignmentTitle(selectedAssignment)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/workforce"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d] transition hover:bg-[#f7f9fd]"
              >
                <ChevronLeft size={15} aria-hidden="true" />
                Directory
              </Link>
              {permissions.canWriteEmployees ? (
                <button
                  type="button"
                  onClick={openCreatePanel}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.16)]"
                >
                  <CirclePlus size={15} aria-hidden="true" />
                  Add Employee
                </button>
              ) : null}
            </div>
          </div>

          {notice ? (
            <div
              className={`mt-4 rounded-lg px-4 py-3 text-[12px] font-bold ${
                notice.type === "success"
                  ? "bg-[#eaf9f2] text-[#0f8f66]"
                  : "bg-[#fff5f5] text-[#b42318]"
              }`}
            >
              {notice.message}
            </div>
          ) : null}
        </section>

        <EmployeeDetailPanel
          employee={selectedEmployee}
          workforceActions={workforceActions}
          timelineEvents={timelineEvents}
          assignmentHistory={assignmentHistory}
          assignmentCatalogs={assignmentCatalogs}
          permissions={permissions}
        />

        <CreateEmployeePanel
          open={createPanelOpen}
          canCreateEmployee={canCreateEmployee}
          isPending={isCreating || isPending}
          numberPreview={numberPreview}
          onClose={closeCreatePanel}
          onSubmit={onCreateEmployee}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                Workforce command center
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
                <ShieldCheck size={13} aria-hidden="true" />
                Governed workspace
              </span>
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.45rem,2.4vw,2.2rem)] font-extrabold leading-tight tracking-normal text-[#10143f]">
              Employee lifecycle, placement, and workforce movement in one operating view.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Search employees, monitor status distribution, inspect current assignments, and prepare lifecycle actions from one governed workforce workspace.
            </p>
          </div>

          <div className="grid gap-3 xl:min-w-[180px]">
            {permissions.canWriteEmployees ? (
              <ActionButton
                href="/workforce?panel=create"
                icon={CirclePlus}
                label="Add Employee"
                tone="primary"
                onClick={openCreatePanel}
              />
            ) : null}
          </div>
        </div>

        {notice ? (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-[12px] font-bold ${
              notice.type === "success"
                ? "bg-[#eaf9f2] text-[#0f8f66]"
                : "bg-[#fff5f5] text-[#b42318]"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total employees" value={total} icon={UsersRound} tone="blue" />
          <MetricCard label="Active workforce" value={activeWorkforce} icon={CheckCircle2} tone="green" />
          <MetricCard label="Recent hires" value={summary?.recentHires ?? 0} icon={CalendarClock} tone="violet" />
          <MetricCard label="Unassigned records" value={unassigned} icon={BriefcaseBusiness} tone="amber" />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="border-b border-[#edf1f7] bg-[#fbfcff] p-3">
          <div role="tablist" aria-label="Workforce workspace sections" className="grid gap-2 lg:grid-cols-4">
            {[
              { id: "overview" as const, label: "Overview", description: "Lifecycle health and number control", icon: ShieldCheck },
              { id: "directory" as const, label: "Directory", description: activeFilterCount ? `${activeFilterCount} active filters` : "Search and status filters", icon: UsersRound },
              { id: "imports" as const, label: "Imports", description: "CSV template, preview, commit", icon: FileSpreadsheet },
              { id: "profile" as const, label: "Employee profile", description: "Open an employee first", icon: UserRound },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[74px] items-start gap-3 rounded-lg border p-3 text-left transition ${
                  activeTab === tab.id
                    ? "border-[#3820d7] bg-white shadow-[0_14px_30px_rgba(56,32,215,0.1)]"
                    : "border-transparent bg-transparent hover:border-[#dfe8f6] hover:bg-white"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    activeTab === tab.id ? "bg-[#3820d7] text-white" : "bg-[#eef2f8] text-[#667089]"
                  }`}
                >
                  <tab.icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-[#10143f]">{tab.label}</span>
                  <span className="mt-1 line-clamp-2 block text-[11px] font-semibold leading-4 text-[#7a8297]">
                    {tab.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === "overview" ? (
            <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
              <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-5">
                <p className="text-[11px] font-extrabold uppercase text-[#3820d7]">Workforce operating model</p>
                <h3 className="mt-2 text-xl font-extrabold text-[#121a46]">Start with a person, create employment, then assign work context.</h3>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
                  The workforce page is now separated into directory work, import operations, and employee profile actions so each workflow has a clear place.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("directory")}
                    className="rounded-xl border border-[#e3e9f4] bg-white p-4 text-left transition hover:border-[#cfd8ea]"
                  >
                    <p className="text-sm font-extrabold text-[#121a46]">Find employees</p>
                    <p className="mt-2 text-[12px] font-semibold leading-5 text-[#68748c]">Search, filter by status, and open profile workspaces.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("imports")}
                    className="rounded-xl border border-[#e3e9f4] bg-white p-4 text-left transition hover:border-[#cfd8ea]"
                  >
                    <p className="text-sm font-extrabold text-[#121a46]">Bulk import safely</p>
                    <p className="mt-2 text-[12px] font-semibold leading-5 text-[#68748c]">Download a template, validate rows, then commit governed batches.</p>
                  </button>
                  <button
                    type="button"
                    onClick={openCreatePanel}
                    disabled={!permissions.canWriteEmployees}
                    className="rounded-xl border border-[#e3e9f4] bg-white p-4 text-left transition hover:border-[#cfd8ea] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <p className="text-sm font-extrabold text-[#121a46]">Create one employee</p>
                    <p className="mt-2 text-[12px] font-semibold leading-5 text-[#68748c]">Use the tenant-controlled employee number sequence.</p>
                  </button>
                </div>
              </div>

              <WorkforceInsights
                byStatus={byStatus}
                total={total}
                numberPreview={numberPreview}
                summary={summary}
              />
            </section>
          ) : null}

          {activeTab === "directory" ? (
            <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
              <div className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
                <div className="border-b border-[#e5ebf5] p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Employee directory</p>
                      <h3 className="mt-1 text-xl font-extrabold text-[#121a46]">Live workforce records</h3>
                    </div>
                    <form action="/workforce" className="grid gap-2 sm:grid-cols-[1fr_170px_128px_auto] xl:w-[820px]">
                      <label className="flex h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-3 text-[13px] font-semibold text-[#7b8195]">
                        <Search size={16} aria-hidden="true" />
                        <input
                          name="search"
                          defaultValue={filters.search}
                          placeholder="Search name, email, employee ID"
                          className="min-w-0 flex-1 bg-transparent text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                        />
                      </label>
                      <select
                        name="employmentType"
                        defaultValue={filters.employmentType}
                        className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none"
                      >
                        {employmentTypes.map((type) => (
                          <option key={type.value || "all"} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <select
                        name="limit"
                        defaultValue={pagination.pageSize.toString()}
                        aria-label="Directory page size"
                        className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#4d566d] outline-none"
                      >
                        {[10, 25, 50, 100].map((limit) => (
                          <option key={limit} value={limit}>
                            {limit} / page
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.18)]"
                      >
                        <Filter size={15} aria-hidden="true" />
                        Apply
                      </button>
                      {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
                    </form>
                  </div>

                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {employeeStatuses.map((status) => {
                      const active = filters.status === status.value;
                      const count =
                        status.value === "" ? total : byStatus[status.value] ?? rows.filter((row) => row.status === status.value).length;

                      return (
                        <Link
                          key={status.value || "all"}
                          href={statusHref(filters, status.value, pagination.pageSize)}
                          onClick={() => setActiveTab("directory")}
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
                  </div>
                </div>

                {activeFilterCount > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#e5ebf5] bg-[#fbfcff] px-5 py-3">
                    <span className="text-[11px] font-black uppercase text-[#8a92a6]">{activeFilterCount} active filters</span>
                    <Link
                      href={directoryHref({ search: "", status: "", employmentType: "" }, { limit: pagination.pageSize })}
                      className="text-[12px] font-black text-[#3820d7]"
                    >
                      Clear all
                    </Link>
                  </div>
                ) : null}

                <EmployeeDirectory
                  rows={rows}
                  canWriteEmployees={permissions.canWriteEmployees}
                  onOpenCreate={openCreatePanel}
                />

                <DirectoryPagination
                  filters={filters}
                  pagination={pagination}
                  rowsOnPage={rows.length}
                  total={employees?.page.total}
                  nextCursor={employees?.page.nextCursor ?? null}
                />
              </div>

              <WorkforceInsights
                byStatus={byStatus}
                total={total}
                numberPreview={numberPreview}
                summary={summary}
              />
            </section>
          ) : null}

          {activeTab === "imports" ? (
            <BulkWorkforceTools
              filters={filters}
              canImport={permissions.canWriteEmployees}
              importBatches={importBatches?.data ?? []}
            />
          ) : null}

          {activeTab === "profile" ? (
            selectedEmployee ? (
              <EmployeeDetailPanel
                employee={selectedEmployee}
                workforceActions={workforceActions}
                timelineEvents={timelineEvents}
                assignmentHistory={assignmentHistory}
                assignmentCatalogs={assignmentCatalogs}
                permissions={permissions}
              />
            ) : (
              <div className="grid min-h-[280px] place-items-center rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-8 text-center">
                <div>
                  <UserRound className="mx-auto text-[#7a8297]" size={34} aria-hidden="true" />
                  <p className="mt-3 text-sm font-extrabold text-[#10143f]">No employee profile selected</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
                    Open a row from the directory to manage lifecycle, assignments, timeline, and actions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("directory")}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#3820d7] px-4 text-[12px] font-extrabold text-white"
                  >
                    Open directory
                  </button>
                </div>
              </div>
            )
          ) : null}
        </div>
      </section>

      <CreateEmployeePanel
        open={createPanelOpen}
        canCreateEmployee={canCreateEmployee}
        isPending={isCreating || isPending}
        numberPreview={numberPreview}
        onClose={closeCreatePanel}
        onSubmit={onCreateEmployee}
      />
    </div>
  );
}

function WorkforceInsights({
  byStatus,
  total,
  numberPreview,
  summary,
}: {
  byStatus: Partial<Record<EmployeeStatus, number>>;
  total: number;
  numberPreview: EmployeeNumberPreview | null;
  summary: EmployeeSummary | null;
}) {
  return (
    <aside className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
        <p className="text-[11px] font-extrabold uppercase text-white/58">Lifecycle queue</p>
        <h3 className="mt-2 text-lg font-extrabold">Status distribution</h3>
        <div className="mt-5 space-y-3">
          {employeeStatuses.slice(1, 6).map((status) => (
            <StatusMeter
              key={status.value}
              label={status.label}
              value={byStatus[status.value as EmployeeStatus] ?? 0}
              total={Math.max(total, 1)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Employee number control</p>
        <h3 className="mt-2 text-lg font-extrabold text-[#121a46]">
          {numberPreview?.employeeNumber ?? "Waiting for sequence"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#5d6782]">
          Next tenant-controlled employee number. TimeSync reserves the final number when the employee is created.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniFact label="Prefix" value={numberPreview?.prefix ?? "EMP"} />
          <MiniFact label="Next seq" value={numberPreview?.nextSequence ?? "N/A"} />
        </div>
      </section>

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Worker mix</p>
        <div className="mt-4 space-y-2">
          {Object.entries(summary?.byEmploymentType ?? {}).length > 0 ? (
            Object.entries(summary?.byEmploymentType ?? {}).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between rounded-lg bg-[#f8fbff] px-3 py-2">
                <span className="text-[12px] font-black text-[#4d566d]">{humanize(type)}</span>
                <span className="text-sm font-black text-[#121a46]">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-[#69738c]">No worker classification data returned yet.</p>
          )}
        </div>
      </section>
    </aside>
  );
}

function CreateEmployeePanel({
  open,
  canCreateEmployee,
  isPending,
  numberPreview,
  onClose,
  onSubmit,
}: {
  open: boolean;
  canCreateEmployee: boolean;
  isPending: boolean;
  numberPreview: EmployeeNumberPreview | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  const [manualNumber, setManualNumber] = useState(false);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] grid min-h-dvh place-items-center bg-[#10143f]/50 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Close create employee panel" onClick={onClose} className="absolute inset-0 cursor-default" />
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-employee-title"
        className="relative max-h-[92dvh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-white/60 bg-white shadow-[0_30px_90px_rgba(18,31,67,0.24)]"
      >
        <div className="sticky top-0 z-10 border-b border-[#edf1f7] bg-white/95 p-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#ece9ff] text-[#3820d7]">
                <UserRound size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Create workforce record</p>
                <h3 id="create-employee-title" className="mt-1 text-2xl font-extrabold text-white!">
                  Add employee
                </h3>
                <p className="mt-1 max-w-xl text-[12px] font-semibold leading-5 text-[#7a8297]">
                  This creates the Person identity first, then creates the Employee relationship using the tenant employee-number sequence.
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

        <fieldset disabled={!canCreateEmployee || isPending} className="grid gap-5 p-5">
          {!canCreateEmployee ? (
            <div className="rounded-xl border border-[#ffe2e2] bg-[#fff7f7] p-4 text-[12px] font-bold leading-5 text-[#b42318]">
              You need both <span className="font-extrabold">persons.write</span> and{" "}
              <span className="font-extrabold">employees.write</span> to create an employee from this panel.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <WorkforceField name="firstName" label="First name" placeholder="Ada" required />
            <WorkforceField name="lastName" label="Last name" placeholder="Byron" required />
            <WorkforceField name="preferredName" label="Preferred name" placeholder="Ada" />
            <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
              <p className="text-[10px] font-extrabold uppercase text-[#68748c]">Employee number</p>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-[#d8dfea] bg-white px-3 py-2">
                <span>
                  <span className="block text-sm font-extrabold text-[#10143f]">
                    {numberPreview?.employeeNumber ?? "Auto sequence"}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-[#7a8297]">
                    Reserved when the employee is created
                  </span>
                </span>
                <span className="rounded-full bg-[#eaf9f2] px-2.5 py-1 text-[10px] font-extrabold text-[#0f8f66]">
                  AUTO
                </span>
              </div>
              <label className="mt-3 flex items-center justify-between gap-3 text-[12px] font-bold text-[#4f5262]">
                Use manual override
                <input
                  name="useManualEmployeeNumber"
                  type="checkbox"
                  checked={manualNumber}
                  onChange={(event) => setManualNumber(event.target.checked)}
                  className="h-4 w-4 accent-[#3820d7]"
                />
              </label>
              {manualNumber ? (
                <div className="mt-3">
                  <WorkforceField
                    name="employeeNumber"
                    label="Manual employee number"
                    defaultValue={numberPreview?.employeeNumber ?? ""}
                    placeholder="ACME-0005"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <WorkforceSelect
              name="employmentType"
              label="Worker type"
              defaultValue="FULL_TIME"
              options={employmentTypes.filter((type) => type.value).map((type) => ({ label: type.label, value: type.value }))}
            />
            <WorkforceSelect
              name="status"
              label="Lifecycle status"
              defaultValue="PREBOARDING"
              options={employeeStatuses.filter((status) => status.value).map((status) => ({ label: status.label, value: status.value }))}
            />
            <WorkforceField name="hireDate" label="Hire date" type="date" />
          </div>

          <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
            <p className="text-[10px] font-extrabold uppercase text-[#68748c]">Number sequence</p>
            <p className="mt-2 text-lg font-extrabold text-[#10143f]">
              {numberPreview?.employeeNumber ?? "Preview unavailable"}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
              The preview is not submitted as a manual value unless override is enabled, so concurrent creates stay safe.
            </p>
          </div>
        </fieldset>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[#edf1f7] bg-white/95 p-5 backdrop-blur sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#d8dfea] bg-white px-4 text-[12px] font-extrabold text-[#10143f] transition hover:border-[#cfd8ea]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canCreateEmployee || isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#3820d7] px-5 text-[12px] font-extrabold text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CirclePlus size={15} aria-hidden="true" />}
            Create employee
          </button>
        </div>
      </form>
    </div>
  );
}

function WorkforceField({
  label,
  name,
  placeholder,
  defaultValue,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#4f5262]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1.5 h-11 w-full rounded-lg border border-[#d8dfea] bg-[#f8faff] px-3 text-[13px] font-semibold text-[#151936] outline-none transition placeholder:text-[#a5acba] focus:border-[#3820d7] focus:bg-white"
      />
    </label>
  );
}

function WorkforceSelect({
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
        className="mt-1.5 h-11 w-full rounded-lg border border-[#d8dfea] bg-[#f8faff] px-3 text-[12px] font-extrabold text-[#151936] outline-none transition focus:border-[#3820d7] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DirectoryPagination({
  filters,
  pagination,
  rowsOnPage,
  total,
  nextCursor,
}: {
  filters: WorkforceFilters;
  pagination: WorkforcePagination;
  rowsOnPage: number;
  total?: number;
  nextCursor: string | null;
}) {
  const hasPrevious = Boolean(pagination.cursor);
  const start = rowsOnPage === 0 ? 0 : (pagination.pageNumber - 1) * pagination.pageSize + 1;
  const end = rowsOnPage === 0 ? 0 : start + rowsOnPage - 1;
  const totalPages = typeof total === "number" ? Math.max(1, Math.ceil(total / pagination.pageSize)) : null;

  return (
    <div className="flex flex-col gap-3 border-t border-[#e5ebf5] bg-[#fbfcff] p-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-[11px] font-black uppercase text-[#8a92a6]">
          Page {pagination.pageNumber}
          {totalPages ? ` of ${totalPages}` : ""}
        </p>
        <p className="mt-1 text-sm font-bold text-[#4d566d]">
          {rowsOnPage > 0 ? (
            <>
              Showing {start}-{end}
              {typeof total === "number" ? ` of ${total}` : ""} records
            </>
          ) : (
            "No records on this page"
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasPrevious ? (
          <Link
            href={previousCursorHref(filters, pagination)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d] transition hover:bg-[#f7f9fd]"
          >
            <ChevronLeft size={15} aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-[#e3e8f1] bg-white px-4 text-[12px] font-black text-[#a3aabc]">
            <ChevronLeft size={15} aria-hidden="true" />
            Previous
          </span>
        )}

        {nextCursor ? (
          <Link
            href={nextCursorHref(filters, pagination, nextCursor)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_26px_rgba(56,32,215,0.16)] transition hover:bg-[#2d18bf]"
          >
            Next
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-lg border border-[#e3e8f1] bg-white px-4 text-[12px] font-black text-[#a3aabc]">
            Next
            <ChevronRight size={15} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}

function EmployeeDirectory({
  rows,
  canWriteEmployees,
  onOpenCreate,
}: {
  rows: EmployeeListItem[];
  canWriteEmployees: boolean;
  onOpenCreate: () => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="grid min-h-[360px] place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#eef5ff] text-[#2f6eea]">
            <UserRound size={30} aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-xl font-extrabold text-[#121a46]">No employee records found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68748c]">
            Adjust your filters or create the first employment relationship for this tenant.
          </p>
          {canWriteEmployees ? (
            <button
              type="button"
              onClick={onOpenCreate}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#3820d7] px-5 text-sm font-black text-white!"
            >
              <CirclePlus size={16} aria-hidden="true" />
              Add Employee
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-[10px] font-black uppercase tracking-[0.08em] text-[#8a92a6]">
              <th className="border-b border-[#e5ebf5] px-5 py-3">Employee</th>
              <th className="border-b border-[#e5ebf5] px-5 py-3">Status</th>
              <th className="border-b border-[#e5ebf5] px-5 py-3">Current assignment</th>
              <th className="border-b border-[#e5ebf5] px-5 py-3">Manager</th>
              <th className="border-b border-[#e5ebf5] px-5 py-3">Hire date</th>
              <th className="border-b border-[#e5ebf5] px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((employee) => {
              const assignment = primaryAssignment(employee);

              return (
                <tr key={employee.id} className="group">
                  <td className="border-b border-[#edf1f7] px-5 py-4">
                    <EmployeeIdentity employee={employee} />
                  </td>
                  <td className="border-b border-[#edf1f7] px-5 py-4">
                    <StatusPill status={employee.status} />
                    <p className="mt-2 text-[11px] font-bold text-[#8a92a6]">{humanize(employee.employmentType)}</p>
                  </td>
                  <td className="max-w-[280px] border-b border-[#edf1f7] px-5 py-4">
                    <p className="truncate text-sm font-black text-[#151936]">{assignmentTitle(assignment)}</p>
                    <p className="mt-1 truncate text-[12px] font-semibold text-[#7a8297]">{assignmentSubline(assignment)}</p>
                  </td>
                  <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">
                    {managerName(assignment)}
                  </td>
                  <td className="border-b border-[#edf1f7] px-5 py-4 text-sm font-bold text-[#4d566d]">
                    {formatDate(employee.hireDate)}
                  </td>
                  <td className="border-b border-[#edf1f7] px-5 py-4 text-right">
                    <Link
                      href={`/workforce?employee=${employee.id}`}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-[12px] font-black text-[#3820d7] transition hover:bg-[#f7f9fd]"
                    >
                      Open
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 lg:hidden">
        {rows.map((employee) => {
          const assignment = primaryAssignment(employee);

          return (
            <article key={employee.id} className="rounded-xl border border-[#e4eaf4] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <EmployeeIdentity employee={employee} />
                <StatusPill status={employee.status} />
              </div>
              <div className="mt-4 rounded-lg bg-[#f8fbff] p-3">
                <p className="text-sm font-black text-[#151936]">{assignmentTitle(assignment)}</p>
                <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">{assignmentSubline(assignment)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] font-bold text-[#68748c]">
                <span>{humanize(employee.employmentType)}</span>
                <span>{formatDate(employee.hireDate)}</span>
              </div>
              <Link
                href={`/workforce?employee=${employee.id}`}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-[12px] font-black text-[#3820d7]"
              >
                Open workspace
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function EmployeeIdentity({ employee }: { employee: EmployeeListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef5ff] text-sm font-black text-[#2f6eea]">
        {initials(employee.person)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-[#151936]">{personName(employee.person)}</span>
        <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#7a8297]">
          {employee.employeeNumber}
          {employee.user?.email ? ` · ${employee.user.email}` : ""}
        </span>
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof UsersRound;
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

function ActionButton({
  href,
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  href: string;
  icon: typeof CirclePlus;
  label: string;
  tone: "primary" | "secondary";
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        if (onClick) {
          event.preventDefault();
          onClick();
        }
      }}
      className={
        tone === "primary"
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white! shadow-[0_12px_26px_rgba(56,32,215,0.18)]"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d]"
      }
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </Link>
  );
}

function StatusPill({ status }: { status: EmployeeStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(status)}`}>
      {humanize(status)}
    </span>
  );
}

function StatusMeter({ label, value, total }: { label: string; value: number; total: number }) {
  const width = `${Math.min(100, Math.round((value / total) * 100))}%`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-black text-white/78">{label}</p>
        <p className="text-sm font-black">{value}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/12">
        <div className="h-full rounded-full bg-[#36d399]" style={{ width }} />
      </div>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-[#f8fbff] p-3">
      <p className="text-[10px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#121a46]">{value}</p>
    </div>
  );
}

function primaryAssignment(employee: EmployeeListItem) {
  return employee.assignments?.find((assignment) => assignment.isPrimary) ?? employee.assignments?.[0] ?? null;
}

function assignmentTitle(assignment: WorkforceAssignment | null) {
  return assignment?.position?.title ?? assignment?.organizationNode?.name ?? "No active assignment";
}

function assignmentSubline(assignment: WorkforceAssignment | null) {
  if (!assignment) {
    return "Needs position, organization, or cost center assignment";
  }

  return [assignment.organizationNode?.name, assignment.costCenter?.name, assignment.position?.code]
    .filter(Boolean)
    .join(" · ") || "Assignment context pending";
}

function managerName(assignment: WorkforceAssignment | null) {
  const person = assignment?.managerEmployee?.person;
  return person ? personName(person) : "Unassigned";
}

function personName(person: Pick<WorkforcePerson, "firstName" | "middleName" | "lastName" | "preferredName">) {
  return person.preferredName || [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

function initials(person: WorkforcePerson) {
  return `${person.firstName?.[0] ?? ""}${person.lastName?.[0] ?? ""}`.toUpperCase() || "TS";
}

function countStatuses(rows: EmployeeListItem[], statuses: EmployeeStatus[]) {
  return rows.filter((row) => statuses.includes(row.status)).length;
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function stringValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function dateValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function prune<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<T>;
}

function statusClass(status: EmployeeStatus) {
  const classes: Record<EmployeeStatus, string> = {
    PREBOARDING: "bg-[#eef5ff] text-[#2f6eea]",
    ACTIVE: "bg-[#eaf9f2] text-[#0f8f66]",
    PROBATION: "bg-[#fff4db] text-[#b66b00]",
    SUSPENDED: "bg-[#fff1e7] text-[#b95000]",
    SEPARATED: "bg-[#f3f4f8] text-[#596277]",
    RETIRED: "bg-[#f3f4f8] text-[#596277]",
    ALUMNI: "bg-[#f1ebff] text-[#6d35c4]",
    ARCHIVED: "bg-[#fff5f5] text-[#b42318]",
  };

  return classes[status] ?? "bg-[#f3f4f8] text-[#596277]";
}

function statusHref(filters: WorkforceFilters, status: string, limit: number) {
  return directoryHref({ ...filters, status }, { limit });
}

function previousCursorHref(filters: WorkforceFilters, pagination: WorkforcePagination) {
  const previousCursor = pagination.cursorStack.at(-1) ?? "";
  const previousStack = pagination.cursorStack.slice(0, -1);

  return directoryHref(filters, {
    cursor: previousCursor,
    cursorStack: previousStack,
    limit: pagination.pageSize,
  });
}

function nextCursorHref(filters: WorkforceFilters, pagination: WorkforcePagination, nextCursor: string) {
  return directoryHref(filters, {
    cursor: nextCursor,
    cursorStack: pagination.cursor ? [...pagination.cursorStack, pagination.cursor] : pagination.cursorStack,
    limit: pagination.pageSize,
  });
}

function directoryHref(
  filters: WorkforceFilters,
  options: {
    cursor?: string;
    cursorStack?: string[];
    limit?: number;
  } = {},
) {
  const params = new URLSearchParams();

  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.employmentType) params.set("employmentType", filters.employmentType);
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.cursorStack?.length) params.set("cursorStack", options.cursorStack.join(","));

  const query = params.toString();
  return query ? `/workforce?${query}` : "/workforce";
}
