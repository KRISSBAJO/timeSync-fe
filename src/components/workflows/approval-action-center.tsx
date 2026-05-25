"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  UserRoundPlus,
  XCircle,
} from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { EmployeeListItem } from "@/lib/workforce/types";
import type { ApprovalAction, ApprovalRequest, ApprovalRequestStatus, ApprovalStepInstance } from "@/lib/workflows/types";

type ApprovalEndpoint = "approve" | "reject" | "return" | "comment" | "delegate" | "cancel" | "withdraw";

export function ApprovalActionCenter({
  request,
  delegateUsers,
  canProcessApprovals,
  canReadApprovals,
}: {
  request: ApprovalRequest;
  delegateUsers: EmployeeListItem[];
  canProcessApprovals: boolean;
  canReadApprovals: boolean;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [delegateUserId, setDelegateUserId] = useState("");
  const [pending, setPending] = useState<ApprovalEndpoint | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const currentStep = useMemo(() => request.steps?.find((step) => step.status === "PENDING") ?? request.steps?.[0] ?? null, [request.steps]);
  const busy = Boolean(pending);
  const terminal = request.status !== "PENDING";

  async function runAction(action: ApprovalEndpoint) {
    setPending(action);
    setMessage(null);

    try {
      const body =
        action === "delegate"
          ? compactPayload({ toUserId: delegateUserId, comment })
          : compactPayload({ comment });

      await apiFetch(`/approvals/requests/${request.id}/${action}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setComment("");
      setMessage({ type: "success", text: `Approval ${humanize(action)} completed.` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
      <div className="grid gap-5 border-b border-[#e5ebf5] p-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
              Approval task
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass(request.status)}`}>
              {humanize(request.status)}
            </span>
          </div>
          <h3 className="mt-4 max-w-3xl text-2xl font-extrabold text-[#10143f]">{request.title}</h3>
          <p className="mt-2 text-sm font-bold text-[#66708a]">
            {request.module} · {request.workflow?.name ?? request.entityType} · submitted by {displayUser(request.submittedBy)}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6782]">
            Process the current approval step, capture reviewer comments, delegate ownership, and preserve the full action
            trail in the approval record.
          </p>
        </div>

        <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Current step</p>
          <h4 className="mt-2 text-lg font-extrabold text-[#121a46]">{currentStep?.name ?? "No pending step"}</h4>
          <p className="mt-1 text-sm font-bold text-[#66708a]">
            {currentStep ? `Step ${currentStep.stepOrder} · ${displayAssignee(currentStep)}` : "Request has no actionable step."}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniFact label="Entity" value={request.entityType} />
            <MiniFact label="Steps" value={request.steps?.length ?? 0} />
            <MiniFact label="Actions" value={request.actions?.length ?? 0} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Approval command</p>
                <h4 className="mt-1 text-lg font-extrabold text-[#121a46]">Decision and reviewer note</h4>
              </div>
              <BadgeCheck size={20} className="text-[#6b7590]" aria-hidden="true" />
            </div>
            <label className="mt-4 grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Comment</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Looks good to proceed."
                rows={4}
                className="resize-none rounded-lg border border-[#d3d9e8] bg-white px-3 py-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
              />
            </label>

            <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
              <ActionButton
                label="Approve"
                icon={CheckCircle2}
                disabled={!canProcessApprovals || busy || terminal}
                pending={pending === "approve"}
                onClick={() => runAction("approve")}
              />
              <ActionButton
                label="Reject"
                icon={XCircle}
                disabled={!canProcessApprovals || busy || terminal}
                pending={pending === "reject"}
                onClick={() => runAction("reject")}
              />
              <ActionButton
                label="Return"
                icon={RotateCcw}
                disabled={!canProcessApprovals || busy || terminal}
                pending={pending === "return"}
                onClick={() => runAction("return")}
              />
              <ActionButton
                label="Comment"
                icon={MessageSquareText}
                disabled={!canReadApprovals || busy}
                pending={pending === "comment"}
                onClick={() => runAction("comment")}
              />
              <ActionButton
                label="Cancel"
                icon={Ban}
                disabled={!canProcessApprovals || busy || terminal}
                pending={pending === "cancel"}
                onClick={() => runAction("cancel")}
              />
              <ActionButton
                label="Withdraw"
                icon={Send}
                disabled={!canProcessApprovals || busy || terminal}
                pending={pending === "withdraw"}
                onClick={() => runAction("withdraw")}
              />
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
          </section>

          <section className="rounded-xl border border-[#e3e9f4] bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Delegation</p>
                <h4 className="mt-1 text-lg font-extrabold text-[#121a46]">Move current step to another user</h4>
              </div>
              <UserRoundPlus size={20} className="text-[#6b7590]" aria-hidden="true" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Delegate to</span>
                <select
                  value={delegateUserId}
                  onChange={(event) => setDelegateUserId(event.target.value)}
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
                >
                  <option value="">Select active employee user</option>
                  {delegateUsers
                    .filter((employee) => employee.user?.id)
                    .map((employee) => (
                      <option key={employee.id} value={employee.user?.id}>
                        {personName(employee)} · {employee.user?.email}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!canProcessApprovals || busy || terminal || !delegateUserId}
                onClick={() => runAction("delegate")}
                className="self-end inline-flex h-11 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending === "delegate" ? <Loader2 size={15} className="animate-spin" /> : <UserRoundPlus size={15} />}
                Delegate
              </button>
            </div>
          </section>
        </div>

        <aside className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white">
          <p className="text-[11px] font-extrabold uppercase text-white/58">Approval trail</p>
          <h4 className="mt-1 text-lg font-extrabold">{request.actions?.length ?? 0} actions</h4>
          <div className="mt-5 space-y-3">
            {request.actions && request.actions.length > 0 ? (
              request.actions.map((action) => <ActionTrailRow key={action.id} action={action} />)
            ) : (
              <p className="text-sm leading-6 text-white/64">No action history has been recorded yet.</p>
            )}
          </div>
          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="text-[11px] font-extrabold uppercase text-white/58">Step chain</p>
            <div className="mt-3 space-y-2">
              {request.steps?.map((step) => (
                <div key={step.id} className="rounded-lg border border-white/10 bg-white/8 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black">
                      {step.stepOrder}. {step.name}
                    </p>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-black uppercase text-white/70">
                      {humanize(step.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-semibold text-white/58">{displayAssignee(step)}</p>
                </div>
              ))}
            </div>
          </div>
          <Link
            href="/workflows"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-white/16 px-4 text-[12px] font-black text-white/78"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Close request
          </Link>
        </aside>
      </div>
    </section>
  );
}

function ActionButton({
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

function MiniFact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-[9px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#121a46]">{value}</p>
    </div>
  );
}

function ActionTrailRow({ action }: { action: ApprovalAction }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{humanize(action.action)}</p>
          <p className="mt-1 text-[12px] font-semibold text-white/58">
            {displayUser(action.actorUser)} · {formatDateTime(action.createdAt)}
          </p>
        </div>
      </div>
      {action.comment ? <p className="mt-2 text-[12px] leading-5 text-white/72">{action.comment}</p> : null}
    </div>
  );
}

function displayAssignee(step: ApprovalStepInstance) {
  return step.assignedRole?.name ?? displayUser(step.assignedUser);
}

function displayUser(user?: { email: string; username?: string | null } | null) {
  return user?.username ?? user?.email?.split("@")[0] ?? "Unassigned";
}

function personName(employee: EmployeeListItem) {
  return employee.person.preferredName || [employee.person.firstName, employee.person.middleName, employee.person.lastName].filter(Boolean).join(" ");
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
}

function statusClass(status: ApprovalRequestStatus) {
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

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not set";
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Approval action could not be completed.";
}
