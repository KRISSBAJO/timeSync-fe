"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  CheckCircle2,
  Loader2,
  PauseCircle,
  Plus,
  Route,
  Trash2,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { Workflow, WorkflowStatus, WorkflowStep, WorkflowStepType } from "@/lib/workflows/types";

const stepTypes: WorkflowStepType[] = ["APPROVAL", "REVIEW", "NOTIFICATION", "SYSTEM_ACTION"];

export function WorkflowBuilderPanel({
  workflow,
  canWriteWorkflows,
}: {
  workflow: Workflow;
  canWriteWorkflows: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const [stepOrder, setStepOrder] = useState(nextStepOrder(workflow.steps));
  const [stepName, setStepName] = useState("");
  const [stepType, setStepType] = useState<WorkflowStepType>("APPROVAL");
  const [slaHours, setSlaHours] = useState("");
  const [approverExpression, setApproverExpression] = useState("employee.manager");
  const [isRequired, setIsRequired] = useState(true);
  const [allowDelegation, setAllowDelegation] = useState(true);

  async function runStatusAction(action: "activate" | "inactivate" | "archive") {
    setPending(action);
    setMessage(null);

    try {
      await apiFetch(`/workflows/${workflow.id}/${action}`, {
        method: "POST",
        body: JSON.stringify(compactPayload({ reason })),
      });
      setReason("");
      setMessage({ type: "success", text: `Workflow ${action} request completed.` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function addStep() {
    setPending("step");
    setMessage(null);

    try {
      await apiFetch(`/workflows/${workflow.id}/steps`, {
        method: "POST",
        body: JSON.stringify(
          compactPayload({
            stepOrder,
            name: stepName,
            type: stepType,
            isRequired,
            allowDelegation,
            slaHours: slaHours ? Number(slaHours) : undefined,
            approverExpression: approverExpression ? { expression: approverExpression } : undefined,
          }),
        ),
      });
      setStepName("");
      setSlaHours("");
      setMessage({ type: "success", text: "Workflow step added and designer state refreshed." });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  async function deleteStep(step: WorkflowStep) {
    setPending(`delete-${step.id}`);
    setMessage(null);

    try {
      await apiFetch(`/workflows/${workflow.id}/steps/${step.id}`, { method: "DELETE" });
      setMessage({ type: "success", text: `${step.name} was removed from the workflow.` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  const busy = Boolean(pending);

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
      <div className="grid gap-5 border-b border-[#e5ebf5] p-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
              Workflow builder
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(workflow.status)}`}>
              {humanize(workflow.status)}
            </span>
          </div>
          <h3 className="mt-4 max-w-3xl text-2xl font-extrabold text-[#10143f]">{workflow.name}</h3>
          <p className="mt-2 text-sm font-bold text-[#66708a]">
            {workflow.code} · {workflow.module}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6782]">
            Add approval, review, notification, and system-action steps to the workflow. Changes are
            persisted immediately and remain tenant-scoped.
          </p>
        </div>

        <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Governance controls</p>
          <label className="mt-3 grid gap-1.5">
            <span className="text-[10px] font-black uppercase text-[#69738c]">Status reason</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Approved by workflow governance"
              className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
            />
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <StatusButton
              label="Activate"
              icon={CheckCircle2}
              disabled={!canWriteWorkflows || busy || workflow.status === "ACTIVE"}
              pending={pending === "activate"}
              onClick={() => runStatusAction("activate")}
            />
            <StatusButton
              label="Inactivate"
              icon={PauseCircle}
              disabled={!canWriteWorkflows || busy || workflow.status === "INACTIVE"}
              pending={pending === "inactivate"}
              onClick={() => runStatusAction("inactivate")}
            />
            <StatusButton
              label="Archive"
              icon={Archive}
              disabled={!canWriteWorkflows || busy || workflow.status === "ARCHIVED"}
              pending={pending === "archive"}
              onClick={() => runStatusAction("archive")}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Step designer</p>
              <h4 className="mt-1 text-lg font-extrabold text-[#121a46]">Create routing step</h4>
            </div>
            <Route size={20} className="text-[#6b7590]" aria-hidden="true" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[100px_1fr_170px]">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Order</span>
              <input
                type="number"
                min={1}
                value={stepOrder}
                onChange={(event) => setStepOrder(Number(event.target.value))}
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Step name</span>
              <input
                value={stepName}
                onChange={(event) => setStepName(event.target.value)}
                placeholder="HR manager approval"
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Type</span>
              <select
                value={stepType}
                onChange={(event) => setStepType(event.target.value as WorkflowStepType)}
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
              >
                {stepTypes.map((type) => (
                  <option key={type} value={type}>
                    {humanize(type)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[130px_1fr]">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">SLA hours</span>
              <input
                type="number"
                min={1}
                value={slaHours}
                onChange={(event) => setSlaHours(event.target.value)}
                placeholder="48"
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Approver expression</span>
              <input
                value={approverExpression}
                onChange={(event) => setApproverExpression(event.target.value)}
                placeholder="employee.manager"
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-bold text-[#4d566d]">
              <input type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} />
              Required step
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-bold text-[#4d566d]">
              <input type="checkbox" checked={allowDelegation} onChange={(event) => setAllowDelegation(event.target.checked)} />
              Allow delegation
            </label>
            <button
              type="button"
              disabled={!canWriteWorkflows || busy || !stepName.trim() || workflow.status === "ARCHIVED"}
              onClick={addStep}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === "step" ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Add step
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-white/58">Step timeline</p>
              <h4 className="mt-1 text-lg font-extrabold">{workflow.steps.length} configured steps</h4>
            </div>
            <WorkflowIcon size={20} className="text-white/54" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {workflow.steps.length > 0 ? (
              workflow.steps
                .slice()
                .sort((a, b) => a.stepOrder - b.stepOrder)
                .map((step) => (
                  <div key={step.id} className="rounded-lg border border-white/10 bg-white/8 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {step.stepOrder}. {step.name}
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-white/58">
                          {humanize(step.type)} · {step.slaHours ? `${step.slaHours}h SLA` : "No SLA"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!canWriteWorkflows || busy}
                        onClick={() => deleteStep(step)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-white/70 transition hover:bg-white/16 disabled:opacity-45"
                        aria-label={`Delete ${step.name}`}
                      >
                        {pending === `delete-${step.id}` ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm leading-6 text-white/64">No routing steps yet. Add the first step to make this workflow executable.</p>
            )}
          </div>
          <Link
            href="/workflows"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-white/16 px-4 text-[12px] font-black text-white/78"
          >
            <X size={14} aria-hidden="true" />
            Close builder
          </Link>
        </aside>
      </div>
    </section>
  );
}

function StatusButton({
  label,
  icon: Icon,
  disabled,
  pending,
  onClick,
}: {
  label: string;
  icon: typeof CheckCircle2;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[11px] font-black text-[#4d566d] transition hover:bg-[#f7f9fd] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

function nextStepOrder(steps: WorkflowStep[]) {
  return (steps.reduce((max, step) => Math.max(max, step.stepOrder), 0) || 0) + 1;
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
}

function statusClass(status: WorkflowStatus) {
  const classes: Record<WorkflowStatus, string> = {
    DRAFT: "bg-[#eef5ff] text-[#2f6eea]",
    ACTIVE: "bg-[#eaf9f2] text-[#0f8f66]",
    INACTIVE: "bg-[#f3f4f8] text-[#596277]",
    ARCHIVED: "bg-[#fff5f5] text-[#b42318]",
  };

  return classes[status];
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Workflow action could not be completed.";
}
