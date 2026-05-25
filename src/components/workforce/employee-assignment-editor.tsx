"use client";

import { useRouter } from "next/navigation";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
  UserRoundCog,
  XCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { CostCenter, OrganizationNode } from "@/lib/organization/types";
import type { Position, PositionGrade, PositionLevel } from "@/lib/positions/types";
import type { AssignmentType, EmployeeDetails, EmployeeListItem, WorkforceAssignment } from "@/lib/workforce/types";

const assignmentTypes: AssignmentType[] = ["PRIMARY", "ACTING", "TEMPORARY", "MATRIX", "PROJECT", "SECONDMENT"];

export type AssignmentCatalogs = {
  positions: Position[];
  organizationNodes: OrganizationNode[];
  costCenters: CostCenter[];
  grades: PositionGrade[];
  levels: PositionLevel[];
  managers: EmployeeListItem[];
  supervisors: EmployeeListItem[];
  unitHeads: EmployeeListItem[];
};

type AssignmentFormState = {
  assignmentId: string;
  type: AssignmentType;
  positionId: string;
  organizationNodeId: string;
  costCenterId: string;
  managerEmployeeId: string;
  supervisorEmployeeId: string;
  unitHeadEmployeeId: string;
  gradeId: string;
  levelId: string;
  effectiveFrom: string;
  effectiveTo: string;
  isPrimary: boolean;
  closeExistingPrimary: boolean;
  allowOverBudget: boolean;
  reason: string;
};

export function EmployeeAssignmentEditor({
  employee,
  assignments,
  catalogs,
  canWriteAssignments,
}: {
  employee: EmployeeDetails;
  assignments: WorkforceAssignment[];
  catalogs: AssignmentCatalogs;
  canWriteAssignments: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<AssignmentFormState>(() => emptyForm());
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const currentAssignment = useMemo(() => assignments.find((assignment) => isCurrentAssignment(assignment)), [assignments]);
  const selectedAssignment = assignments.find((assignment) => assignment.id === form.assignmentId) ?? null;
  const busy = Boolean(pending);

  async function createAssignment() {
    setPending("create");
    setMessage(null);

    try {
      await apiFetch("/assignments", {
        method: "POST",
        body: JSON.stringify(toAssignmentPayload(form, employee.id, true)),
      });
      setMessage({ type: "success", text: "Assignment created and workforce history updated." });
      setForm(emptyForm());
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function updateAssignment() {
    if (!form.assignmentId) return;
    setPending("update");
    setMessage(null);

    try {
      await apiFetch(`/assignments/${form.assignmentId}`, {
        method: "PATCH",
        body: JSON.stringify(toAssignmentPayload(form, employee.id, false)),
      });
      setMessage({ type: "success", text: "Assignment updated without losing historical context." });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function endAssignment() {
    if (!form.assignmentId) return;
    setPending("end");
    setMessage(null);

    try {
      await apiFetch(`/assignments/${form.assignmentId}/end`, {
        method: "POST",
        body: JSON.stringify(
          compactPayload({
            effectiveTo: dateToIso(form.effectiveTo || todayInputDate()),
            reason: form.reason || "Assignment ended from TimeSync workspace.",
          }),
        ),
      });
      setMessage({ type: "success", text: "Assignment ended and timeline effects were written." });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function deleteAssignment() {
    if (!form.assignmentId) return;
    setPending("delete");
    setMessage(null);

    try {
      await apiFetch(`/assignments/${form.assignmentId}`, { method: "DELETE" });
      setMessage({ type: "success", text: "Future assignment deleted." });
      setForm(emptyForm());
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  function loadAssignment(assignmentId: string) {
    const assignment = assignments.find((item) => item.id === assignmentId);
    setMessage(null);
    setForm(assignment ? formFromAssignment(assignment) : emptyForm());
  }

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
              Assignment control
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-[#fbfcff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
              <UserRoundCog size={13} aria-hidden="true" />
              Assignment editor
            </span>
          </div>
          <h4 className="mt-3 text-lg font-extrabold text-[#121a46]">Effective-dated workforce placement</h4>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d6782]">
            Create, revise, end, or remove future assignments while preserving position, manager, department, grade, and cost-center history.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[420px]">
          <MiniFact icon={BriefcaseBusiness} label="Current position" value={assignmentTitle(currentAssignment)} />
          <MiniFact icon={Building2} label="Org node" value={currentAssignment?.organizationNode?.name ?? "Unassigned"} />
          <MiniFact icon={CalendarClock} label="Effective" value={formatDate(currentAssignment?.effectiveFrom)} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Edit existing assignment</span>
              <select
                value={form.assignmentId}
                onChange={(event) => loadAssignment(event.target.value)}
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
              >
                <option value="">Create new assignment</option>
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    {assignmentLabel(assignment)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm());
                setMessage(null);
              }}
              className="self-end inline-flex h-11 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d]"
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SelectField label="Type" value={form.type} onChange={(value) => updateForm(setForm, { type: value as AssignmentType })}>
              {assignmentTypes.map((type) => (
                <option key={type} value={type}>
                  {humanize(type)}
                </option>
              ))}
            </SelectField>
            <DateField label="Effective from" value={form.effectiveFrom} onChange={(value) => updateForm(setForm, { effectiveFrom: value })} />
            <DateField label="Effective to" value={form.effectiveTo} onChange={(value) => updateForm(setForm, { effectiveTo: value })} />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <SelectField label="Position" value={form.positionId} onChange={(value) => updateForm(setForm, { positionId: value })}>
              <option value="">No position</option>
              {catalogs.positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.code} - {position.title}
                </option>
              ))}
            </SelectField>
            <SelectField label="Organization node" value={form.organizationNodeId} onChange={(value) => updateForm(setForm, { organizationNodeId: value })}>
              <option value="">No org node</option>
              {catalogs.organizationNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.code} - {node.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Cost center" value={form.costCenterId} onChange={(value) => updateForm(setForm, { costCenterId: value })}>
              <option value="">No cost center</option>
              {catalogs.costCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.code} - {center.name}
                </option>
              ))}
            </SelectField>
            <LeadershipSelect
              label="Manager"
              emptyLabel="No manager"
              value={form.managerEmployeeId}
              onChange={(value) => updateForm(setForm, { managerEmployeeId: value })}
              options={catalogs.managers}
              excludeEmployeeId={employee.id}
              emptyHint="Designate employees as managers before assigning them here."
            />
            <LeadershipSelect
              label="Supervisor"
              emptyLabel="No supervisor"
              value={form.supervisorEmployeeId}
              onChange={(value) => updateForm(setForm, { supervisorEmployeeId: value })}
              options={catalogs.supervisors}
              excludeEmployeeId={employee.id}
              emptyHint="Optional. Only employees designated as supervisors appear here."
            />
            <LeadershipSelect
              label="Unit head"
              emptyLabel="No unit head"
              value={form.unitHeadEmployeeId}
              onChange={(value) => updateForm(setForm, { unitHeadEmployeeId: value })}
              options={catalogs.unitHeads}
              excludeEmployeeId={employee.id}
              emptyHint="Optional. Unit heads are governed through leadership eligibility."
            />
            <SelectField label="Grade" value={form.gradeId} onChange={(value) => updateForm(setForm, { gradeId: value })}>
              <option value="">No grade</option>
              {catalogs.grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.code} - {grade.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Level" value={form.levelId} onChange={(value) => updateForm(setForm, { levelId: value })}>
              <option value="">No level</option>
              {catalogs.levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.code} - {level.name}
                </option>
              ))}
            </SelectField>
          </div>

          <label className="mt-3 grid gap-1.5">
            <span className="text-[10px] font-black uppercase text-[#69738c]">Reason</span>
            <input
              value={form.reason}
              onChange={(event) => updateForm(setForm, { reason: event.target.value })}
              placeholder="Approved transfer into HR Operations"
              className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Checkbox label="Primary assignment" checked={form.isPrimary} onChange={(checked) => updateForm(setForm, { isPrimary: checked })} />
            <Checkbox label="Close existing primary" checked={form.closeExistingPrimary} onChange={(checked) => updateForm(setForm, { closeExistingPrimary: checked })} />
            <Checkbox label="Allow over budget" checked={form.allowOverBudget} onChange={(checked) => updateForm(setForm, { allowOverBudget: checked })} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canWriteAssignments || busy || !form.effectiveFrom}
              onClick={createAssignment}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === "create" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Create
            </button>
            <button
              type="button"
              disabled={!canWriteAssignments || busy || !selectedAssignment}
              onClick={updateAssignment}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === "update" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Update
            </button>
            <button
              type="button"
              disabled={!canWriteAssignments || busy || !selectedAssignment}
              onClick={endAssignment}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#ffd6a8] bg-[#fff8ed] px-4 text-[12px] font-black text-[#b66b00] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === "end" ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              End
            </button>
            <button
              type="button"
              disabled={!canWriteAssignments || busy || !selectedAssignment}
              onClick={deleteAssignment}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#ffd0d0] bg-[#fff5f5] px-4 text-[12px] font-black text-[#b42318] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === "delete" ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Delete future
            </button>
          </div>

          {message ? (
            <div
              className={`mt-4 rounded-lg px-3 py-2 text-sm font-bold ${
                message.type === "success" ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#fff5f5] text-[#b42318]"
              }`}
            >
              {message.text}
            </div>
          ) : null}
        </div>

        <aside className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white">
          <p className="text-[11px] font-extrabold uppercase text-white/58">Assignment ledger</p>
          <h4 className="mt-1 text-lg font-extrabold">{assignments.length} records</h4>
          <div className="mt-5 space-y-3">
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() => loadAssignment(assignment.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    form.assignmentId === assignment.id ? "border-[#8ca8ff] bg-white/14" : "border-white/10 bg-white/8 hover:bg-white/12"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{assignmentTitle(assignment)}</p>
                      <p className="mt-1 text-[12px] font-semibold text-white/58">
                        {humanize(assignment.type ?? "PRIMARY")} · {formatDate(assignment.effectiveFrom)} to {formatDate(assignment.effectiveTo)}
                      </p>
                    </div>
                    {assignment.isPrimary ? (
                      <span className="rounded-full bg-[#36d399]/18 px-2 py-1 text-[9px] font-black uppercase text-[#8ff2cf]">
                        Primary
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm leading-6 text-white/64">No assignment history returned for this employee.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function MiniFact({ icon: Icon, label, value }: { icon: typeof BriefcaseBusiness; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase text-[#8a92a6]">{label}</p>
          <p className="mt-0.5 truncate text-[12px] font-black text-[#121a46]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-black uppercase text-[#69738c]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-0 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function LeadershipSelect({
  label,
  emptyLabel,
  value,
  onChange,
  options,
  excludeEmployeeId,
  emptyHint,
}: {
  label: string;
  emptyLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: EmployeeListItem[];
  excludeEmployeeId: string;
  emptyHint: string;
}) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const candidates = options
    .filter((candidate) => candidate.id !== excludeEmployeeId)
    .filter((candidate) => {
      if (!normalizedSearch) return true;
      const text = [
        personName(candidate.person),
        candidate.employeeNumber,
        candidate.user?.email,
        ...(candidate.leadershipDesignations?.map((designation) => humanize(designation.role)) ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(normalizedSearch);
    });

  return (
    <div className="grid gap-1.5">
      <span className="text-[10px] font-black uppercase text-[#69738c]">{label}</span>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={`Search ${label.toLowerCase()} pool`}
        className="h-9 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-0 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
      >
        <option value="">{emptyLabel}</option>
        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {personName(candidate.person)} - {candidate.employeeNumber}
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <p className="text-[11px] font-bold leading-4 text-[#8a92a6]">{emptyHint}</p>
      ) : null}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-black uppercase text-[#69738c]">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
      />
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-bold text-[#4d566d]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function emptyForm(): AssignmentFormState {
  return {
    assignmentId: "",
    type: "PRIMARY",
    positionId: "",
    organizationNodeId: "",
    costCenterId: "",
    managerEmployeeId: "",
    supervisorEmployeeId: "",
    unitHeadEmployeeId: "",
    gradeId: "",
    levelId: "",
    effectiveFrom: todayInputDate(),
    effectiveTo: "",
    isPrimary: true,
    closeExistingPrimary: true,
    allowOverBudget: false,
    reason: "",
  };
}

function formFromAssignment(assignment: WorkforceAssignment): AssignmentFormState {
  return {
    assignmentId: assignment.id,
    type: assignment.type ?? "PRIMARY",
    positionId: assignment.positionId ?? assignment.position?.id ?? "",
    organizationNodeId: assignment.organizationNodeId ?? assignment.organizationNode?.id ?? "",
    costCenterId: assignment.costCenterId ?? assignment.costCenter?.id ?? "",
    managerEmployeeId: assignment.managerEmployeeId ?? assignment.managerEmployee?.id ?? "",
    supervisorEmployeeId: assignment.supervisorEmployeeId ?? assignment.supervisorEmployee?.id ?? "",
    unitHeadEmployeeId: assignment.unitHeadEmployeeId ?? assignment.unitHeadEmployee?.id ?? "",
    gradeId: assignment.gradeId ?? assignment.grade?.id ?? "",
    levelId: assignment.levelId ?? assignment.level?.id ?? "",
    effectiveFrom: dateForInput(assignment.effectiveFrom) || todayInputDate(),
    effectiveTo: dateForInput(assignment.effectiveTo),
    isPrimary: Boolean(assignment.isPrimary),
    closeExistingPrimary: true,
    allowOverBudget: false,
    reason: assignment.reason ?? "",
  };
}

function toAssignmentPayload(form: AssignmentFormState, employeeId: string, includeCreateFlags: boolean) {
  return compactPayload({
    employeeId,
    type: form.type,
    positionId: form.positionId || undefined,
    organizationNodeId: form.organizationNodeId || undefined,
    costCenterId: form.costCenterId || undefined,
    managerEmployeeId: form.managerEmployeeId || undefined,
    supervisorEmployeeId: form.supervisorEmployeeId || undefined,
    unitHeadEmployeeId: form.unitHeadEmployeeId || undefined,
    gradeId: form.gradeId || undefined,
    levelId: form.levelId || undefined,
    effectiveFrom: dateToIso(form.effectiveFrom),
    effectiveTo: form.effectiveTo ? dateToIso(form.effectiveTo) : undefined,
    isPrimary: form.isPrimary,
    closeExistingPrimary: includeCreateFlags ? form.closeExistingPrimary : undefined,
    allowOverBudget: form.allowOverBudget,
    reason: form.reason || undefined,
  });
}

function updateForm(setForm: Dispatch<SetStateAction<AssignmentFormState>>, patch: Partial<AssignmentFormState>) {
  setForm((current) => ({ ...current, ...patch }));
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function dateForInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function dateToIso(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function isCurrentAssignment(assignment: WorkforceAssignment) {
  const now = Date.now();
  const from = assignment.effectiveFrom ? new Date(assignment.effectiveFrom).getTime() : 0;
  const to = assignment.effectiveTo ? new Date(assignment.effectiveTo).getTime() : Number.POSITIVE_INFINITY;
  return from <= now && now <= to && assignment.isPrimary;
}

function assignmentTitle(assignment?: WorkforceAssignment | null) {
  return assignment?.position?.title ?? assignment?.organizationNode?.name ?? "No active assignment";
}

function assignmentLabel(assignment: WorkforceAssignment) {
  return `${assignmentTitle(assignment)} · ${humanize(assignment.type ?? "PRIMARY")} · ${formatDate(assignment.effectiveFrom)}`;
}

function personName(person: EmployeeListItem["person"]) {
  return person.preferredName || [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Open";
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Assignment action could not be completed.";
}
