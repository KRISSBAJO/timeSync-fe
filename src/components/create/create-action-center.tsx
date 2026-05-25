"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  CirclePlus,
  ClipboardList,
  FileText,
  GitBranch,
  ListChecks,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { AuthSession } from "@/lib/api/types";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { tenantAllowsFeatures } from "@/config/navigation";

type CreateAction = {
  id:
    | "person"
    | "organization"
    | "position"
    | "workflow"
    | "document-type"
    | "form"
    | "notification-template"
    | "tenant"
    | "role";
  title: string;
  description: string;
  href: string;
  lane: "Workforce" | "Governance" | "Platform";
  icon: LucideIcon;
  permissions: string[];
  features?: string[];
};

type CreateTabId = "overview" | "workforce" | "governance" | "platform";

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

const createActions: CreateAction[] = [
  {
    id: "person",
    title: "Person identity",
    description: "Create the human identity record that future employee relationships attach to.",
    href: "/workforce?panel=create",
    lane: "Workforce",
    icon: UsersRound,
    permissions: ["persons.write"],
    features: ["WORKFORCE_CORE"],
  },
  {
    id: "organization",
    title: "Organization node",
    description: "Add companies, regions, departments, units, teams, and cost center ownership.",
    href: "/organization?panel=node",
    lane: "Workforce",
    icon: Building2,
    permissions: ["organization.write"],
    features: ["ORGANIZATION"],
  },
  {
    id: "position",
    title: "Position control slot",
    description: "Open an approved workforce slot with grade, level, cost center, and reporting line.",
    href: "/positions?panel=create",
    lane: "Workforce",
    icon: GitBranch,
    permissions: ["positions.write"],
    features: ["POSITIONS"],
  },
  {
    id: "workflow",
    title: "Workflow shell",
    description: "Create a workflow definition that can later receive approval steps and routing logic.",
    href: "/workflows?panel=create",
    lane: "Governance",
    icon: ListChecks,
    permissions: ["workflows.write"],
    features: ["WORKFLOWS"],
  },
  {
    id: "document-type",
    title: "Document type",
    description: "Create compliance-ready document types with expiry and verification requirements.",
    href: "/documents?panel=create",
    lane: "Governance",
    icon: FileText,
    permissions: ["documents.write"],
    features: ["DOCUMENTS"],
  },
  {
    id: "form",
    title: "Workforce form",
    description: "Create a custom form for surveys, acknowledgements, onboarding, or HR data collection.",
    href: "/forms",
    lane: "Governance",
    icon: ClipboardList,
    permissions: ["forms.write"],
    features: ["FORMS"],
  },
  {
    id: "notification-template",
    title: "Notification template",
    description: "Create reusable templates for in-app, email, SMS, or push delivery workflows.",
    href: "/notifications?panel=create",
    lane: "Governance",
    icon: Bell,
    permissions: ["notifications.write"],
    features: ["NOTIFICATIONS"],
  },
  {
    id: "tenant",
    title: "Tenant provisioning",
    description: "Provision tenant, admin account, default roles, feature flags, branding, and subscription.",
    href: "/tenants#provision",
    lane: "Platform",
    icon: UserRoundCog,
    permissions: ["platform.tenants.manage"],
  },
  {
    id: "role",
    title: "Role and permission set",
    description: "Create a mutable tenant role and attach least-privilege permission bundles.",
    href: "/iam?panel=role",
    lane: "Platform",
    icon: LockKeyhole,
    permissions: ["iam.roles.write"],
  },
];

const createTabs: Array<{
  id: CreateTabId;
  label: string;
  description: string;
  lane?: CreateAction["lane"];
  icon: LucideIcon;
}> = [
  {
    id: "overview",
    label: "Overview",
    description: "Pick the right creation path",
    icon: Sparkles,
  },
  {
    id: "workforce",
    label: "Workforce",
    description: "People, org, positions",
    lane: "Workforce",
    icon: UsersRound,
  },
  {
    id: "governance",
    label: "Governance",
    description: "Workflow, docs, notices",
    lane: "Governance",
    icon: ShieldCheck,
  },
  {
    id: "platform",
    label: "Platform",
    description: "Tenant and IAM setup",
    lane: "Platform",
    icon: UserRoundCog,
  },
];

export function CreateActionCenter({ session }: { session: AuthSession }) {
  const router = useRouter();
  const availableActions = useMemo(
    () => createActions.filter((action) => actionAvailable(session, action)),
    [session],
  );
  const lanes = ["Workforce", "Governance", "Platform"] as const;
  const [activeTab, setActiveTab] = useState<CreateTabId>("overview");
  const [selectedActionId, setSelectedActionId] = useState<CreateAction["id"]>(
    availableActions[0]?.id ?? "person",
  );
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();
  const selectedAction =
    createActions.find((action) => action.id === selectedActionId) ?? createActions[0];
  const canSubmitSelected = actionAvailable(session, selectedAction);
  const activeLane = tabToLane(activeTab);

  async function onQuickCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const formData = new FormData(event.currentTarget);

    try {
      const { path, body } = buildQuickCreateRequest(selectedAction.id, formData);

      await apiFetch(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      setNotice({
        type: "success",
        message: `${selectedAction.title} created. The workspace is refreshing.`,
      });
      event.currentTarget.reset();
      setQuickCreateOpen(false);
      startTransition(() => router.refresh());
    } catch (caught) {
      setNotice({
        type: "error",
        message: caught instanceof Error ? caught.message : "Quick create failed.",
      });
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="relative grid gap-5 p-5 xl:grid-cols-[1fr_360px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(56,32,215,0.1),transparent_32%),radial-gradient(circle_at_86%_12%,rgba(47,110,234,0.12),transparent_34%)]" />
          <div className="relative">
            <p className="text-[11px] font-extrabold uppercase text-[#3820d7]">

            </p>
            <h2 className="mt-3 max-w-4xl text-[clamp(1.55rem,2.4vw,2.15rem)] font-extrabold leading-tight text-[#10143f]">
              Start governed workforce operations from one enterprise launchpad.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6782]">
              This center starts safe workforce records. Bigger HR processes begin with a governed object, then move through workflow, audit, and lifecycle history.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroStat label="Available" value={availableActions.length} />
              <HeroStat label="Executable" value={createActions.length} />
              <HeroStat label="Lanes" value={lanes.length} />
            </div>
          </div>

          <div className="relative rounded-xl border border-[#dfe8f6] bg-[#101735] p-5 text-white! shadow-[0_18px_45px_rgba(16,23,53,0.3)]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/50">Creation policy</p>
            <div className="mt-4 space-y-3">
              {[
                "Respect tenant boundaries",
                "Prefer workflow-backed changes",
                "Write timeline and audit events",
                "Keep person and employee separate",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.08] p-3">
                  <CheckCircle2 size={16} className="text-[#7cf0bd]" aria-hidden="true" />
                  <p className="text-sm font-extrabold">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
          <div className="border-b border-[#edf1f7] bg-[#fbfcff] p-3">
            <div role="tablist" aria-label="Create center sections" className="grid gap-2 md:grid-cols-4">
              {createTabs.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                const readyCount = tab.lane
                  ? createActions.filter(
                      (action) =>
                        action.lane === tab.lane && actionAvailable(session, action),
                    ).length
                  : availableActions.length;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex min-h-[82px] items-center gap-3 rounded-lg border px-3 text-left transition ${
                      selected
                        ? "border-[#3820d7] bg-white shadow-[0_12px_30px_rgba(56,32,215,0.1)]"
                        : "border-transparent bg-transparent hover:border-[#dfe8f6] hover:bg-white"
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                        selected ? "bg-[#3820d7] text-white!" : "bg-[#eef2f8] text-[#68748c]"
                      }`}
                    >
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-extrabold text-[#10143f]">
                        {tab.label}
                        <span className="rounded-full bg-[#eef5ff] px-2 py-0.5 text-[10px] font-extrabold text-[#2f6eea]">
                          {readyCount}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[11px] font-semibold text-[#7a8297]">
                        {tab.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            {activeLane ? (
              <ActionLane
                lane={activeLane}
                actions={createActions.filter((action) => action.lane === activeLane)}
                selectedActionId={selectedActionId}
                session={session}
                onSelect={(id) => {
                  setSelectedActionId(id);
                  setQuickCreateOpen(true);
                }}
              />
            ) : (
              <CreateOverview
                lanes={lanes}
                actions={createActions}
                availableActions={availableActions}
                session={session}
                onOpenLane={(lane) => setActiveTab(laneToTab(lane))}
                onSelect={(id, lane) => {
                  setSelectedActionId(id);
                  setActiveTab(laneToTab(lane));
                  setQuickCreateOpen(true);
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-5">
          <QuickCreateLauncher
            action={selectedAction}
            allowed={canSubmitSelected}
            onOpen={() => setQuickCreateOpen(true)}
          />
          <AccessPosture session={session} />
        </div>
      </section>

      <QuickCreateModal
        open={quickCreateOpen}
        action={selectedAction}
        allowed={canSubmitSelected}
        isPending={isPending}
        onClose={() => setQuickCreateOpen(false)}
        onSubmit={onQuickCreate}
      />
    </div>
  );
}

function CreateOverview({
  lanes,
  actions,
  availableActions,
  session,
  onOpenLane,
  onSelect,
}: {
  lanes: ReadonlyArray<CreateAction["lane"]>;
  actions: CreateAction[];
  availableActions: CreateAction[];
  session: AuthSession;
  onOpenLane: (lane: CreateAction["lane"]) => void;
  onSelect: (id: CreateAction["id"], lane: CreateAction["lane"]) => void;
}) {
  const recommended = availableActions.slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {lanes.map((lane) => {
          const laneActions = actions.filter((action) => action.lane === lane);
          const ready = laneActions.filter((action) => actionAvailable(session, action)).length;

          return (
            <button
              key={lane}
              type="button"
              onClick={() => onOpenLane(lane)}
              className="group rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#cbd8ee] hover:bg-white hover:shadow-[0_16px_36px_rgba(18,31,67,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase text-[#68748c]">{lane} lane</p>
                  <h3 className="mt-2 text-lg font-extrabold text-[#10143f]">{lane} creation</h3>
                </div>
                <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[10px] font-extrabold text-[#2f6eea]">
                  {ready}/{laneActions.length}
                </span>
              </div>
              <p className="mt-3 text-[12px] font-semibold leading-5 text-[#68748c]">
                {laneDescription(lane)}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-extrabold text-[#3820d7]">
                Open lane
                <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Recommended starts</p>
            <h3 className="mt-2 text-xl font-extrabold text-[#10143f]">What you can create right now</h3>
          </div>
          <p className="text-[12px] font-semibold text-[#7a8297]">
            Permissions hide anything you should not launch.
          </p>
        </div>

        {recommended.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {recommended.map((action) => (
              <CreateCard
                key={action.id}
                action={action}
                allowed
                selected={false}
                onSelect={() => onSelect(action.id, action.lane)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-8 text-center">
            <p className="text-sm font-extrabold text-[#10143f]">No creation permissions assigned</p>
            <p className="mt-2 text-[12px] font-semibold text-[#7a8297]">
              Ask an administrator to attach a role with write access before launching new records.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function tabToLane(tab: CreateTabId): CreateAction["lane"] | null {
  switch (tab) {
    case "workforce":
      return "Workforce";
    case "governance":
      return "Governance";
    case "platform":
      return "Platform";
    case "overview":
    default:
      return null;
  }
}

function laneToTab(lane: CreateAction["lane"]): CreateTabId {
  switch (lane) {
    case "Workforce":
      return "workforce";
    case "Governance":
      return "governance";
    case "Platform":
    default:
      return "platform";
  }
}

function laneDescription(lane: CreateAction["lane"]) {
  switch (lane) {
    case "Workforce":
      return "Launch person identities, organization structure, and position control before deeper employee movement.";
    case "Governance":
      return "Create the controls that turn work into auditable approvals, documents, and notifications.";
    case "Platform":
    default:
      return "Provision tenant-level access, ownership, and IAM patterns for secure enterprise operations.";
  }
}

function ActionLane({
  lane,
  actions,
  selectedActionId,
  session,
  onSelect,
}: {
  lane: CreateAction["lane"];
  actions: CreateAction[];
  selectedActionId: CreateAction["id"];
  session: AuthSession;
  onSelect: (id: CreateAction["id"]) => void;
}) {
  const available = actions.filter((action) => actionAvailable(session, action)).length;

  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">{lane} lane</p>
          <h3 className="mt-2 text-xl font-extrabold text-[#10143f]">{lane} creation workflows</h3>
        </div>
        <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[10px] font-extrabold text-[#2f6eea]">
          {available}/{actions.length} ready
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {actions.map((action) => (
          <CreateCard
            key={action.id}
            action={action}
            allowed={actionAvailable(session, action)}
            selected={action.id === selectedActionId}
            onSelect={() => onSelect(action.id)}
          />
        ))}
      </div>
    </section>
  );
}

function CreateCard({
  action,
  allowed,
  selected,
  onSelect,
}: {
  action: CreateAction;
  allowed: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = action.icon;

  return (
    <article className={`rounded-xl border p-4 transition ${selected ? "border-[#3820d7] bg-[#f7f5ff]" : "border-[#edf1f7] bg-[#fbfcff]"}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#3820d7] shadow-[0_10px_24px_rgba(18,31,67,0.06)]">
          <Icon size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-sm font-extrabold text-[#10143f]">{action.title}</h4>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${allowed ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#f0f0f2] text-[#686b7c]"}`}>
              {allowed ? "READY" : "LOCKED"}
            </span>
          </div>
          <p className="mt-2 text-[12px] font-semibold leading-5 text-[#68748c]">{action.description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md border border-[#e1e7f2] bg-white px-2.5 py-1 text-[10px] font-extrabold text-[#566178]">
          Starter form
        </span>
        <span className="rounded-md border border-[#e1e7f2] bg-white px-2.5 py-1 text-[10px] font-extrabold text-[#566178]">
          {action.lane} governed
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onSelect}
          disabled={!allowed}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#dfe8f6] bg-white text-[12px] font-extrabold text-[#3820d7] transition hover:bg-[#f6f8fd] disabled:cursor-not-allowed disabled:text-[#8a92a6] disabled:opacity-60"
        >
          <CirclePlus size={14} aria-hidden="true" />
          Quick create
        </button>
        <Link
          href={allowed ? action.href : "/settings"}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-md text-[12px] font-extrabold transition ${
            allowed
              ? "bg-[#3820d7] text-white! shadow-[0_14px_30px_rgba(56,32,215,0.18)] hover:bg-[#2d18bf]"
              : "border border-[#dfe8f6] bg-white text-[#68748c] hover:bg-[#f6f8fd]"
          }`}
        >
          {allowed ? "Open module" : "Review access"}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function QuickCreateLauncher({
  action,
  allowed,
  onOpen,
}: {
  action: CreateAction;
  allowed: boolean;
  onOpen: () => void;
}) {
  const Icon = action.icon;

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#3820d7]">
          <Icon size={19} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Selected quick action</p>
          <h3 className="mt-1 text-xl font-extrabold text-[#10143f]">{action.title}</h3>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a8297]">
            Launch the starter form in a focused modal, then continue richer setup inside the module.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpen}
        disabled={!allowed}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#3820d7] text-[13px] font-extrabold text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
      >
        <CirclePlus size={15} aria-hidden="true" />
        {allowed ? "Open quick create" : "Permission required"}
      </button>
    </section>
  );
}

function QuickCreateModal({
  open,
  action,
  allowed,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  action: CreateAction;
  allowed: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#101735]/55 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-2 -top-2 z-10 grid h-9 w-9 place-items-center rounded-full border border-[#dfe8f6] bg-white text-[#68748c] shadow-[0_12px_30px_rgba(18,31,67,0.14)] transition hover:text-[#10143f]"
          aria-label="Close quick create"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <QuickCreatePanel action={action} allowed={allowed} isPending={isPending} onSubmit={onSubmit} />
      </div>
    </div>
  );
}

function QuickCreatePanel({
  action,
  allowed,
  isPending,
  onSubmit,
}: {
  action: CreateAction;
  allowed: boolean;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const Icon = action.icon;

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#3820d7]">
          <Icon size={19} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Executable quick create</p>
          <h3 className="mt-1 text-xl font-extrabold text-[#10143f]">{action.title}</h3>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a8297]">
            Starter fields only. Finish richer details inside the module workspace.
          </p>
        </div>
      </div>

      <fieldset disabled={!allowed || isPending} className="mt-5 grid gap-3">
        <QuickCreateFields actionId={action.id} />
      </fieldset>

      <button
        type="submit"
        disabled={!allowed || isPending}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#3820d7] text-[13px] font-extrabold text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
        {allowed ? "Create record" : "Permission required"}
      </button>
    </form>
  );
}

function QuickCreateFields({ actionId }: { actionId: CreateAction["id"] }) {
  switch (actionId) {
    case "person":
      return (
        <>
          <Field name="firstName" label="First name" placeholder="Ada" required />
          <Field name="lastName" label="Last name" placeholder="Byron" required />
          <Field name="preferredName" label="Preferred name" placeholder="Ada" />
          <Field name="bio" label="Bio" placeholder="HR operations leader" />
        </>
      );
    case "organization":
      return (
        <>
          <Field name="code" label="Node code" placeholder="HR-DEPT" required />
          <Field name="name" label="Node name" placeholder="Human Resources" required />
          <SelectField
            name="type"
            label="Node type"
            options={["COMPANY", "REGION", "COUNTRY_OFFICE", "BRANCH", "DIVISION", "DEPARTMENT", "UNIT", "TEAM", "PROJECT_GROUP"]}
            defaultValue="DEPARTMENT"
          />
          <Field name="description" label="Description" placeholder="Owns people operations" />
        </>
      );
    case "position":
      return (
        <>
          <Field name="code" label="Position code" placeholder="POS-HR-001" required />
          <Field name="title" label="Title" placeholder="HR Operations Manager" required />
          <Field name="budgetedHeadcount" label="Budgeted headcount" type="number" placeholder="1" />
          <SelectField name="status" label="Status" options={["DRAFT", "ACTIVE", "FROZEN"]} defaultValue="DRAFT" />
        </>
      );
    case "workflow":
      return (
        <>
          <Field name="code" label="Workflow code" placeholder="EMPLOYEE_TRANSFER" required />
          <Field name="name" label="Workflow name" placeholder="Employee Transfer Approval" required />
          <Field name="module" label="Module" placeholder="employees" required />
          <Field name="triggerKey" label="Trigger key" placeholder="employee.transfer.requested" />
        </>
      );
    case "document-type":
      return (
        <>
          <Field name="code" label="Document code" placeholder="WORK_PERMIT" required />
          <Field name="name" label="Document name" placeholder="Work Permit" required />
          <CheckboxField name="requiresExpiry" label="Requires expiry" />
          <CheckboxField name="requiresVerification" label="Requires verification" />
        </>
      );
    case "form":
      return (
        <>
          <Field name="title" label="Form title" placeholder="Onboarding feedback pulse" required />
          <Field name="code" label="Form code" placeholder="ONBOARDING_FEEDBACK" />
          <Field name="description" label="Description" placeholder="Collect structured employee feedback" />
          <CheckboxField name="anonymous" label="Anonymous responses" />
        </>
      );
    case "notification-template":
      return (
        <>
          <Field name="code" label="Template code" placeholder="WORKFLOW_APPROVAL_REQUESTED" required />
          <Field name="name" label="Template name" placeholder="Workflow Approval Requested" required />
          <SelectField name="channel" label="Channel" options={["IN_APP", "EMAIL", "SMS", "PUSH"]} defaultValue="IN_APP" />
          <Field name="body" label="Body" placeholder="{{actorName}} submitted {{title}}." required />
        </>
      );
    case "tenant":
      return (
        <>
          <Field name="name" label="Tenant name" placeholder="Amazon Health Group" required />
          <Field name="slug" label="Slug" placeholder="amazon-health" required />
          <Field name="subdomain" label="Subdomain" placeholder="amazon-health" required />
          <Field name="adminEmail" label="Admin email" type="email" placeholder="admin@amazon-health.test" required />
        </>
      );
    case "role":
    default:
      return (
        <>
          <Field name="code" label="Role code" placeholder="HR_OPERATIONS_LEAD" required />
          <Field name="name" label="Role name" placeholder="HR Operations Lead" required />
          <SelectField name="scope" label="Scope" options={["TENANT", "ORGANIZATION_NODE", "DEPARTMENT", "TEAM", "SELF"]} defaultValue="TENANT" />
          <Field name="description" label="Description" placeholder="Scoped access for HR operations" />
        </>
      );
  }
}

function AccessPosture({ session }: { session: AuthSession }) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Access posture</p>
          <h3 className="mt-2 text-xl font-extrabold text-[#10143f]">What you can launch</h3>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
          <ShieldCheck size={18} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {createActions.map((action) => {
          const allowed = actionAvailable(session, action);

          return (
            <div key={action.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
              <p className="truncate text-[12px] font-extrabold text-[#10143f]">{action.title}</p>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${allowed ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#f0f0f2] text-[#686b7c]"}`}>
                {allowed ? "READY" : "LOCKED"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function actionAvailable(session: AuthSession, action: CreateAction) {
  return (
    hasAnyPermission(session.user, action.permissions) &&
    tenantAllowsFeatures(session.tenant, action.features)
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-white/86 p-4 shadow-[0_12px_30px_rgba(18,31,67,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-extrabold uppercase text-[#68748c]">{label}</p>
        <Sparkles size={16} className="text-[#3820d7]" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-extrabold text-[#10143f]">{value}</p>
    </div>
  );
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
  options: string[];
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
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-3 py-2">
      <span className="text-[12px] font-bold text-[#4f5262]">{label}</span>
      <input name={name} type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
    </label>
  );
}

function buildQuickCreateRequest(actionId: CreateAction["id"], formData: FormData) {
  switch (actionId) {
    case "person":
      return {
        path: "/persons",
        body: prune({
          firstName: stringValue(formData, "firstName"),
          lastName: stringValue(formData, "lastName"),
          preferredName: stringValue(formData, "preferredName"),
          bio: stringValue(formData, "bio"),
          metadata: { source: "create_center" },
        }),
      };
    case "organization":
      return {
        path: "/organization/nodes",
        body: prune({
          code: upperCode(formData, "code"),
          name: stringValue(formData, "name"),
          type: stringValue(formData, "type"),
          description: stringValue(formData, "description"),
          isActive: true,
          metadata: { source: "create_center" },
        }),
      };
    case "position":
      return {
        path: "/positions",
        body: prune({
          code: upperCode(formData, "code"),
          title: stringValue(formData, "title"),
          status: stringValue(formData, "status"),
          budgetedHeadcount: numberValue(formData, "budgetedHeadcount") ?? 1,
          metadata: { source: "create_center" },
        }),
      };
    case "workflow":
      return {
        path: "/workflows",
        body: prune({
          code: upperCode(formData, "code"),
          name: stringValue(formData, "name"),
          module: stringValue(formData, "module"),
          status: "DRAFT",
          triggerKey: stringValue(formData, "triggerKey"),
          metadata: { source: "create_center" },
        }),
      };
    case "document-type":
      return {
        path: "/documents/types",
        body: prune({
          code: upperCode(formData, "code"),
          name: stringValue(formData, "name"),
          requiresExpiry: booleanValue(formData, "requiresExpiry"),
          requiresVerification: booleanValue(formData, "requiresVerification"),
          metadata: { source: "create_center" },
        }),
      };
    case "form":
      return {
        path: "/forms",
        body: prune({
          title: stringValue(formData, "title"),
          code: upperCode(formData, "code"),
          description: stringValue(formData, "description"),
          anonymous: booleanValue(formData, "anonymous"),
          status: "DRAFT",
          questions: [
            {
              order: 1,
              type: "SHORT_TEXT",
              title: "Response",
              required: true,
            },
          ],
        }),
      };
    case "notification-template":
      return {
        path: "/notifications/templates",
        body: prune({
          code: upperCode(formData, "code"),
          name: stringValue(formData, "name"),
          channel: stringValue(formData, "channel"),
          subject: stringValue(formData, "name"),
          body: stringValue(formData, "body"),
          variables: { actorName: "Actor", title: "Title" },
          isActive: true,
        }),
      };
    case "tenant":
      return {
        path: "/platform/tenants",
        body: prune({
          name: stringValue(formData, "name"),
          slug: slugValue(formData, "slug"),
          subdomain: slugValue(formData, "subdomain"),
          adminEmail: stringValue(formData, "adminEmail"),
          status: "TRIAL",
        }),
      };
    case "role":
    default:
      return {
        path: "/iam/roles",
        body: prune({
          code: upperCode(formData, "code"),
          name: stringValue(formData, "name"),
          scope: stringValue(formData, "scope"),
          description: stringValue(formData, "description"),
        }),
      };
  }
}

function stringValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function upperCode(formData: FormData, key: string) {
  return stringValue(formData, key)?.toUpperCase().replaceAll(" ", "_");
}

function slugValue(formData: FormData, key: string) {
  return stringValue(formData, key)?.toLowerCase().replaceAll(" ", "-");
}

function numberValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value ? Number(value) : undefined;
}

function booleanValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function prune<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== ""),
  );
}
