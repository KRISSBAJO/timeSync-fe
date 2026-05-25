"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CirclePlus,
  Fingerprint,
  KeyRound,
  Layers3,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WandSparkles,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type {
  Permission,
  PermissionBootstrapResult,
  PermissionBootstrapStatus,
  PermissionTemplate,
  Role,
  RoleScope,
} from "@/lib/iam/types";

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

type IamTab = "overview" | "roles" | "templates" | "permissions" | "scope";

const ROLE_SCOPES: RoleScope[] = [
  "TENANT",
  "ORGANIZATION_NODE",
  "DEPARTMENT",
  "TEAM",
  "SELF",
  "PLATFORM",
];

const IAM_TABS: Array<{
  id: IamTab;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "overview",
    label: "Overview",
    description: "What IAM controls and what to do next",
    icon: ShieldCheck,
  },
  {
    id: "roles",
    label: "Roles",
    description: "Select roles and sync permissions",
    icon: LockKeyhole,
  },
  {
    id: "templates",
    label: "Templates",
    description: "Apply governed access bundles",
    icon: WandSparkles,
  },
  {
    id: "permissions",
    label: "Permissions",
    description: "Browse module-level permissions",
    icon: Fingerprint,
  },
  {
    id: "scope",
    label: "Scope",
    description: "Review least-privilege coverage",
    icon: Layers3,
  },
];

export function IamSecurityCenter({
  roles,
  permissions,
  permissionTemplates,
  canWriteRoles,
  isPlatform = false,
  permissionBootstrapStatus,
}: {
  roles: Role[];
  permissions: Permission[];
  permissionTemplates: PermissionTemplate[];
  canWriteRoles: boolean;
  isPlatform?: boolean;
  permissionBootstrapStatus?: PermissionBootstrapStatus | null;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [activeTab, setActiveTab] = useState<IamTab>("overview");
  const [bootstrapStatus, setBootstrapStatus] = useState<PermissionBootstrapStatus | null>(
    permissionBootstrapStatus ?? null,
  );
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<Set<string>>(
    () => new Set(roles[0]?.permissions.map((item) => item.permission.code) ?? []),
  );
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(permissionTemplates[0]?.code ?? "");
  const [isPending, startTransition] = useTransition();

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null;
  const permissionModules = useMemo(() => groupPermissions(permissions), [permissions]);
  const roleScopeCounts = useMemo(() => countBy(roles, (role) => role.scope), [roles]);
  const highRiskTemplateCount = useMemo(
    () => permissionTemplates.filter((template) => template.riskLevel === "high").length,
    [permissionTemplates],
  );
  const filteredRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    if (!query) {
      return roles;
    }

    return roles.filter((role) =>
      [role.name, role.code, role.scope, role.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [roleSearch, roles]);
  const filteredPermissionModules = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();

    if (!query) {
      return permissionModules;
    }

    return permissionModules
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter((permission) =>
          [permission.code, permission.name, permission.module, permission.description]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query)),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [permissionModules, permissionSearch]);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setNotice(null);

    try {
      await action();
      setNotice({ type: "success", message: successMessage });
      startTransition(() => router.refresh());
      return true;
    } catch (caught) {
      setNotice({
        type: "error",
        message: caught instanceof Error ? caught.message : "IAM action failed.",
      });
      return false;
    }
  }

  async function onCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWriteRoles) {
      setNotice({ type: "error", message: "You do not have permission to create roles." });
      return;
    }

    const formData = new FormData(event.currentTarget);

    const created = await runAction(
      () =>
        apiFetch("/iam/roles", {
          method: "POST",
          body: JSON.stringify({
            code: stringValue(formData, "code"),
            name: stringValue(formData, "name"),
            description: stringValue(formData, "description"),
            scope: stringValue(formData, "scope"),
          }),
        }),
      "Role created. You can now attach permissions.",
    );

    if (created) {
      event.currentTarget.reset();
      setCreateRoleOpen(false);
      setActiveTab("roles");
    }
  }

  async function onSyncPermissions() {
    if (!canWriteRoles) {
      setNotice({ type: "error", message: "You do not have permission to change role permissions." });
      return;
    }

    if (!selectedRole || selectedRole.isSystem) {
      return;
    }

    if (selectedPermissionCodes.size === 0) {
      setNotice({ type: "error", message: "Select at least one permission for this role." });
      return;
    }

    await runAction(
      () =>
        apiFetch(`/iam/roles/${selectedRole.id}/permissions`, {
          method: "POST",
          body: JSON.stringify({
            permissionCodes: Array.from(selectedPermissionCodes),
          }),
        }),
      `${selectedRole.name} permissions synchronized.`,
    );
  }

  async function onApplyTemplate(templateCode = selectedTemplateCode) {
    if (!canWriteRoles) {
      setNotice({ type: "error", message: "You do not have permission to apply templates." });
      return;
    }

    const template = permissionTemplates.find((item) => item.code === templateCode);

    if (!template || !selectedRole || selectedRole.isSystem) {
      return;
    }

    setSelectedTemplateCode(template.code);
    setSelectedPermissionCodes(new Set(template.permissionCodes));

    await runAction(
      () =>
        apiFetch(`/iam/roles/${selectedRole.id}/permission-template/${template.code}`, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      `${template.name} applied to ${selectedRole.name}.`,
    );
  }

  async function onBootstrapPermissions() {
    if (!isPlatform) {
      setNotice({
        type: "error",
        message: "Only platform operators can synchronize the access catalog.",
      });
      return;
    }

    await runAction(async () => {
      await apiFetch<PermissionBootstrapResult>("/iam/permissions/bootstrap", {
        method: "POST",
      });
      const nextStatus = await apiFetch<PermissionBootstrapStatus>("/iam/permissions/bootstrap");
      setBootstrapStatus(nextStatus);
    }, "Platform access catalog synchronized.");
  }

  function togglePermission(code: string) {
    setSelectedPermissionCodes((current) => {
      const next = new Set(current);

      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }

      return next;
    });
  }

  function selectRole(roleId: string) {
    const nextRole = roles.find((role) => role.id === roleId);
    setSelectedRoleId(roleId);
    setSelectedPermissionCodes(
      new Set(nextRole?.permissions.map((item) => item.permission.code) ?? []),
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#3820d7]">
              Identity administration
            </p>
            <h2 className="mt-2 text-[clamp(1.25rem,1.8vw,1.7rem)] font-extrabold leading-tight text-[#10143f]">
              Access governance for roles, templates, permissions, and scope.
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-5 text-[#5d6782]">
              Select a role, apply a governed template, tune exact permissions, and review scope from one compact workflow.
            </p>
          </div>

          <button
            type="button"
            disabled={!canWriteRoles}
            onClick={() => setCreateRoleOpen(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[#3820d7] px-5 text-[13px] font-extrabold text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <CirclePlus size={15} aria-hidden="true" />
            {canWriteRoles ? "Create tenant role" : "Read-only IAM access"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Roles" value={roles.length} icon={UsersRound} tone="blue" />
          <MetricTile label="Permissions" value={permissions.length} icon={KeyRound} tone="violet" />
          <MetricTile label="Modules" value={permissionModules.length} icon={Layers3} tone="amber" />
          <MetricTile label="Write access" value={canWriteRoles ? "On" : "Read"} icon={ShieldCheck} tone="green" />
        </div>

        {isPlatform ? (
          <PermissionBootstrapPanel
            status={bootstrapStatus}
            busy={isPending}
            onBootstrap={onBootstrapPermissions}
          />
        ) : null}

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

      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="border-b border-[#edf1f7] bg-[#fbfcff] p-3">
          <div role="tablist" aria-label="IAM workspace sections" className="grid gap-2 lg:grid-cols-5">
            {IAM_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[58px] items-center gap-3 rounded-lg border p-2.5 text-left transition ${
                  activeTab === tab.id
                    ? "border-[#3820d7] bg-white shadow-[0_14px_30px_rgba(56,32,215,0.1)]"
                    : "border-transparent bg-transparent hover:border-[#dfe8f6] hover:bg-white"
                }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      activeTab === tab.id ? "bg-[#3820d7] text-white" : "bg-[#eef2f8] text-[#667089]"
                    }`}
                  >
                  <tab.icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-[#10143f]">{tab.label}</span>
                  <span className="mt-0.5 line-clamp-1 block text-[11px] font-semibold leading-4 text-[#7a8297]">
                    {tab.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {activeTab === "overview" ? (
            <IamOverviewTab
              roles={roles}
              permissions={permissions}
              permissionModulesCount={permissionModules.length}
              templates={permissionTemplates}
              highRiskTemplateCount={highRiskTemplateCount}
              selectedRole={selectedRole}
              selectedPermissionCount={selectedPermissionCodes.size}
              canWriteRoles={canWriteRoles}
              onOpenCreateRole={() => setCreateRoleOpen(true)}
              onGoToTab={setActiveTab}
            />
          ) : null}

          {activeTab === "roles" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Role management</p>
                  <h3 className="mt-1 text-xl font-extrabold text-[#10143f]">Select a role, then manage its permissions</h3>
                  <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#68748c]">
                    The directory controls the role in focus. The matrix on the right writes only when the role is mutable and your session has role-write permission.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canWriteRoles}
                  onClick={() => setCreateRoleOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d8dfea] bg-white px-4 text-[12px] font-extrabold text-[#10143f] transition hover:border-[#3820d7] hover:text-[#3820d7] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <CirclePlus size={14} aria-hidden="true" />
                  New role
                </button>
              </div>

              <section className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
                <RoleDirectory
                  roles={filteredRoles}
                  search={roleSearch}
                  onSearch={setRoleSearch}
                  selectedRoleId={selectedRole?.id ?? ""}
                  onSelectRole={selectRole}
                />

                <PermissionSyncPanel
                  role={selectedRole}
                  modules={permissionModules}
                  selectedPermissionCodes={selectedPermissionCodes}
                  canWriteRoles={canWriteRoles}
                  isPending={isPending}
                  onToggle={togglePermission}
                  onSync={onSyncPermissions}
                />
              </section>
            </div>
          ) : null}

          {activeTab === "templates" ? (
            <PermissionTemplatePanel
              templates={permissionTemplates}
              roles={roles}
              selectedRole={selectedRole}
              selectedTemplateCode={selectedTemplateCode}
              canWriteRoles={canWriteRoles}
              isPending={isPending}
              onSelectTemplate={setSelectedTemplateCode}
              onApplyTemplate={onApplyTemplate}
            />
          ) : null}

          {activeTab === "permissions" ? (
            <PermissionCatalog
              modules={filteredPermissionModules}
              search={permissionSearch}
              onSearch={setPermissionSearch}
            />
          ) : null}

          {activeTab === "scope" ? (
            <ScopeIntelligencePanel roleScopeCounts={roleScopeCounts} />
          ) : null}
        </div>
      </section>

      <CreateRoleModal
        open={createRoleOpen}
        canWriteRoles={canWriteRoles}
        isPending={isPending}
        onClose={() => setCreateRoleOpen(false)}
        onSubmit={onCreateRole}
      />
    </div>
  );
}

function PermissionBootstrapPanel({
  status,
  busy,
  onBootstrap,
}: {
  status: PermissionBootstrapStatus | null;
  busy: boolean;
  onBootstrap: () => void;
}) {
  const driftCount = (status?.missingCount ?? 0) + (status?.changedCount ?? 0);

  return (
    <section className="mt-4 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-3">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-extrabold uppercase text-[#68748c]">Platform catalog</p>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                driftCount > 0
                  ? "bg-[#fff4db] text-[#b45309]"
                  : "bg-[#eaf9f2] text-[#0f8f66]"
              }`}
            >
              {status ? (driftCount > 0 ? `${driftCount} drift` : "Current") : "Unavailable"}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-extrabold text-[#10143f]">
            Access synchronization
          </p>
          {status ? (
            <p className="mt-0.5 truncate text-[10px] font-bold uppercase text-[#9aa2b3]">
              {status.catalogVersion} · {status.catalogCount} permissions
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 xl:min-w-[330px]">
          <BootstrapMetric label="Missing" value={status?.missingCount ?? 0} />
          <BootstrapMetric label="Changed" value={status?.changedCount ?? 0} />
          <BootstrapMetric label="Unmanaged" value={status?.unmanagedCount ?? 0} />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={onBootstrap}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8ea] bg-white px-4 text-[12px] font-extrabold text-[#10143f] transition hover:border-[#3820d7] hover:text-[#3820d7] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <WandSparkles size={14} aria-hidden="true" />}
          Synchronize
        </button>
      </div>
    </section>
  );
}

function BootstrapMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#edf1f7] bg-white px-3 py-2">
      <p className="text-[9px] font-extrabold uppercase text-[#7a8297]">{label}</p>
      <p className="mt-0.5 text-base font-extrabold text-[#10143f]">{value}</p>
    </div>
  );
}

function IamOverviewTab({
  roles,
  permissions,
  permissionModulesCount,
  templates,
  highRiskTemplateCount,
  selectedRole,
  selectedPermissionCount,
  canWriteRoles,
  onOpenCreateRole,
  onGoToTab,
}: {
  roles: Role[];
  permissions: Permission[];
  permissionModulesCount: number;
  templates: PermissionTemplate[];
  highRiskTemplateCount: number;
  selectedRole: Role | null;
  selectedPermissionCount: number;
  canWriteRoles: boolean;
  onOpenCreateRole: () => void;
  onGoToTab: (tab: IamTab) => void;
}) {
  const mutableRoleCount = roles.filter((role) => !role.isSystem).length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-5">
        <p className="text-[11px] font-extrabold uppercase text-[#3820d7]">How to use IAM</p>
        <h3 className="mt-2 text-xl font-extrabold text-[#10143f]">A safer flow for enterprise access changes</h3>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
          Start with a role, apply a trusted template when possible, adjust exact permissions only when needed, then inspect role scope so broad access stays intentional.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            {
              title: "1. Create or select a role",
              body: "Tenant roles are the editable access containers. System roles remain protected.",
              action: canWriteRoles ? "Create role" : "View roles",
              onClick: canWriteRoles ? onOpenCreateRole : () => onGoToTab("roles"),
            },
            {
              title: "2. Apply a template",
              body: "Use governed bundles for HR admin, manager, employee, and platform operations patterns.",
              action: "Open templates",
              onClick: () => onGoToTab("templates"),
            },
            {
              title: "3. Fine-tune permissions",
              body: "Review module permissions by exact code before synchronizing changes.",
              action: "Open role matrix",
              onClick: () => onGoToTab("roles"),
            },
            {
              title: "4. Review access scope",
              body: "Keep platform scope rare and keep most day-to-day access tenant or org scoped.",
              action: "Review scope",
              onClick: () => onGoToTab("scope"),
            },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="group rounded-xl border border-[#edf1f7] bg-white p-4 text-left transition hover:border-[#cfd8ea] hover:shadow-[0_14px_32px_rgba(18,31,67,0.06)]"
            >
              <p className="text-sm font-extrabold text-[#10143f]">{item.title}</p>
              <p className="mt-2 min-h-[40px] text-[12px] font-semibold leading-5 text-[#68748c]">{item.body}</p>
              <span className="mt-3 inline-flex items-center gap-2 text-[12px] font-extrabold text-[#3820d7] transition group-hover:translate-x-1">
                {item.action}
                <CheckCircle2 size={13} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile label="Mutable roles" value={mutableRoleCount} icon={LockKeyhole} tone="green" />
          <MetricTile label="Templates" value={templates.length} icon={WandSparkles} tone="violet" />
          <MetricTile label="High-risk bundles" value={highRiskTemplateCount} icon={ShieldCheck} tone="amber" />
          <MetricTile label="Permission modules" value={permissionModulesCount} icon={Layers3} tone="blue" />
        </div>

        <div className="rounded-xl border border-[#dfe8f6] bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#ece9ff] text-[#3820d7]">
              <KeyRound size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Role in focus</p>
              <h3 className="mt-1 truncate text-lg font-extrabold text-[#10143f]">
                {selectedRole?.name ?? "No role selected"}
              </h3>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a8297]">
                {selectedRole
                  ? `${selectedRole.code} carries ${selectedPermissionCount} selected permissions from a catalog of ${permissions.length}.`
                  : "Create or select a role to begin permission governance."}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[#fbfcff] p-3">
              <p className="text-[10px] font-extrabold uppercase text-[#7a8297]">Scope</p>
              <p className="mt-2 truncate text-sm font-extrabold text-[#10143f]">
                {selectedRole?.scope.replaceAll("_", " ") ?? "Unassigned"}
              </p>
            </div>
            <div className="rounded-lg bg-[#fbfcff] p-3">
              <p className="text-[10px] font-extrabold uppercase text-[#7a8297]">Mutability</p>
              <p className="mt-2 truncate text-sm font-extrabold text-[#10143f]">
                {selectedRole?.isSystem ? "System locked" : "Editable"}
              </p>
            </div>
            <div className="rounded-lg bg-[#fbfcff] p-3">
              <p className="text-[10px] font-extrabold uppercase text-[#7a8297]">Status</p>
              <p className="mt-2 truncate text-sm font-extrabold text-[#10143f]">
                {selectedRole?.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onGoToTab("roles")}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#10143f] text-[12px] font-extrabold text-white transition hover:bg-[#20245e]"
          >
            Manage selected role
          </button>
        </div>
      </section>
    </div>
  );
}

function PermissionTemplatePanel({
  templates,
  roles,
  selectedRole,
  selectedTemplateCode,
  canWriteRoles,
  isPending,
  onSelectTemplate,
  onApplyTemplate,
}: {
  templates: PermissionTemplate[];
  roles: Role[];
  selectedRole: Role | null;
  selectedTemplateCode: string;
  canWriteRoles: boolean;
  isPending: boolean;
  onSelectTemplate: (templateCode: string) => void;
  onApplyTemplate: (templateCode?: string) => void;
}) {
  const selectedTemplate = templates.find((template) => template.code === selectedTemplateCode) ?? templates[0] ?? null;
  const canApply = Boolean(canWriteRoles && selectedRole && !selectedRole.isSystem && selectedTemplate);

  return (
    <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="grid gap-5 p-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase text-[#3820d7]">
            <WandSparkles size={15} aria-hidden="true" />
            Permission templates
          </p>
          <h3 className="mt-2 text-xl font-extrabold text-[#10143f]">Apply governed access bundles</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#68748c]">
            Templates turn the permission catalog into reusable role blueprints. They are scoped, risk-labelled, and only writable when the current user can manage roles.
          </p>

          <div className="mt-5 rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-4">
            <p className="text-[10px] font-extrabold uppercase text-[#68748c]">Target role</p>
            <p className="mt-2 truncate text-base font-extrabold text-[#10143f]">
              {selectedRole?.name ?? "Select a role"}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
              {selectedRole?.isSystem
                ? "System roles are readonly from this workspace."
                : roles.length > 0
                  ? "Choose a template below, then apply it to the selected role."
                  : "Create a mutable tenant role before applying a template."}
            </p>
            <button
              type="button"
              disabled={!canApply || isPending}
              onClick={() => onApplyTemplate(selectedTemplate?.code)}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#3820d7] text-[12px] font-extrabold text-white transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
              {canApply ? `Apply ${selectedTemplate?.name}` : "Template apply unavailable"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {templates.length > 0 ? (
            templates.map((template) => (
              <button
                key={template.code}
                type="button"
                onClick={() => onSelectTemplate(template.code)}
                className={`rounded-xl border p-4 text-left transition ${
                  template.code === selectedTemplate?.code
                    ? "border-[#3820d7] bg-[#f7f5ff] shadow-[0_16px_34px_rgba(56,32,215,0.1)]"
                    : "border-[#edf1f7] bg-[#fbfcff] hover:border-[#cfd8ea]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-[#10143f]">{template.name}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase text-[#7a8297]">{template.code}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${riskClass(template.riskLevel)}`}>
                    {template.riskLevel}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-[12px] font-semibold leading-5 text-[#68748c]">
                  {template.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-md bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#566178]">
                    {template.scope}
                  </span>
                  <span className="rounded-md bg-white px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#566178]">
                    {template.permissionCount ?? template.permissionCodes.length} permissions
                  </span>
                </div>
              </button>
            ))
          ) : (
            <EmptyState title="No templates available" body="Permission templates require iam.permissions.read." />
          )}
        </div>
      </div>
    </section>
  );
}

function ScopeIntelligencePanel({
  roleScopeCounts,
}: {
  roleScopeCounts: Partial<Record<RoleScope, number>>;
}) {
  const totalScopedRoles = ROLE_SCOPES.reduce((total, scope) => total + (roleScopeCounts[scope] ?? 0), 0);

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-[#101735] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-white/55">Scope intelligence</p>
          <h3 className="mt-2 text-xl font-extrabold">Least-privilege coverage by role scope</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
            Tenant roles should carry most operating access. Platform scope should stay rare, explicit, and reserved for true platform operations.
          </p>
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.08] p-4">
            <p className="text-[10px] font-extrabold uppercase text-white/45">Governance signal</p>
            <p className="mt-2 text-sm font-bold leading-6 text-white/75">
              {roleScopeCounts.PLATFORM
                ? "Platform-scoped roles exist. Review these regularly and keep assignment temporary when possible."
                : "No platform-scoped tenant roles detected in this workspace."}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
          {ROLE_SCOPES.map((scope) => {
            const count = roleScopeCounts[scope] ?? 0;
            const percent = totalScopedRoles > 0 ? Math.round((count / totalScopedRoles) * 100) : 0;

            return (
              <div key={scope} className="rounded-lg border border-white/10 bg-white/[0.08] p-3">
                <p className="text-[10px] font-extrabold uppercase text-white/45">{scope.replaceAll("_", " ")}</p>
                <p className="mt-2 text-2xl font-extrabold">{count}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-[#66e0b3]" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase text-white/45">{percent}% of roles</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RoleDirectory({
  roles,
  search,
  selectedRoleId,
  onSearch,
  onSelectRole,
}: {
  roles: Role[];
  search: string;
  selectedRoleId: string;
  onSearch: (value: string) => void;
  onSelectRole: (roleId: string) => void;
}) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <PanelHeader
        kicker="Role directory"
        title="Resolved access roles"
        icon={LockKeyhole}
      />
      <SearchBox value={search} onChange={onSearch} placeholder="Search role, scope, code" />
      <div className="max-h-[520px] space-y-2 overflow-y-auto px-4 pb-4">
        {roles.length > 0 ? (
          roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelectRole(role.id)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                role.id === selectedRoleId
                  ? "border-[#3820d7] bg-[#f7f5ff] shadow-[0_14px_32px_rgba(56,32,215,0.1)]"
                  : "border-[#edf1f7] bg-white hover:border-[#cfd8ea] hover:bg-[#fbfcff]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#10143f]">{role.name}</p>
                  <p className="mt-1 truncate text-[11px] font-bold text-[#7a8297]">{role.code}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusClass(role)}`}>
                  {role.isSystem ? "SYSTEM" : role.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#eef5ff] px-2.5 py-1 text-[10px] font-extrabold text-[#2f6eea]">
                  {role.scope.replaceAll("_", " ")}
                </span>
                <span className="rounded-md bg-[#f6f8fd] px-2.5 py-1 text-[10px] font-extrabold text-[#68748c]">
                  {role.permissions.length} permissions
                </span>
              </div>
            </button>
          ))
        ) : (
          <EmptyState title="No roles found" body="Adjust the search or create a tenant role." />
        )}
      </div>
    </section>
  );
}

function CreateRoleModal({
  open,
  canWriteRoles,
  isPending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  canWriteRoles: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] grid min-h-dvh place-items-center bg-[#10143f]/50 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close create role dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-role-title"
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/55 bg-white shadow-[0_30px_90px_rgba(18,31,67,0.22)]"
      >
        <div className="border-b border-[#edf1f7] bg-[#fbfcff] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ece9ff] text-[#3820d7]">
                <CirclePlus size={19} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Role builder</p>
                <h3 id="create-role-title" className="mt-1 text-xl font-extrabold text-[#10143f]">
                  Create tenant role
                </h3>
                <p className="mt-1 max-w-md text-[12px] font-semibold leading-5 text-[#7a8297]">
                  Create the role shell first, then attach permissions from the Roles tab or apply a template.
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

        <fieldset disabled={!canWriteRoles || isPending} className="grid gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="code" label="Role code" placeholder="HR_OPERATIONS_LEAD" required />
            <Field name="name" label="Role name" placeholder="HR Operations Lead" required />
          </div>
          <label className="block">
            <span className="text-[11px] font-bold text-[#4f5262]">Scope</span>
            <select
              name="scope"
              defaultValue="TENANT"
              className="mt-1.5 h-10 w-full rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-3 text-[12px] font-semibold text-[#19162f] outline-none transition focus:border-[#3820d7] focus:bg-white"
            >
              {ROLE_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scope.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <Field name="description" label="Description" placeholder="Scoped access for HR operations." />
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
            disabled={!canWriteRoles || isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#3820d7] px-5 text-[12px] font-extrabold text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CirclePlus size={15} aria-hidden="true" />}
            {canWriteRoles ? "Create role" : "Read-only access"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PermissionSyncPanel({
  role,
  modules,
  selectedPermissionCodes,
  canWriteRoles,
  isPending,
  onToggle,
  onSync,
}: {
  role: Role | null;
  modules: Array<{ module: string; permissions: Permission[] }>;
  selectedPermissionCodes: Set<string>;
  canWriteRoles: boolean;
  isPending: boolean;
  onToggle: (code: string) => void;
  onSync: () => void;
}) {
  const locked = !role || role.isSystem || !canWriteRoles;

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="flex flex-col gap-4 border-b border-[#edf1f7] p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Permission matrix</p>
          <h3 className="mt-1 text-lg font-extrabold text-[#10143f]">
            {role ? role.name : "Select a role"}
          </h3>
          <p className="mt-1 max-w-xl text-[12px] font-semibold leading-5 text-[#7a8297]">
            {role?.isSystem
              ? "System roles are immutable from this console."
              : "Attach module permissions to a mutable tenant role."}
          </p>
        </div>
        <button
          type="button"
          disabled={locked || isPending}
          onClick={onSync}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#3820d7] px-4 text-[12px] font-extrabold text-white transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
          Sync permissions
        </button>
      </div>

      <div className="max-h-[560px] space-y-3 overflow-y-auto p-4">
        {modules.map((group) => (
          <details key={group.module} open={selectedPermissionCodes.size < 30} className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3">
            <summary className="cursor-pointer text-[12px] font-extrabold uppercase text-[#10143f]">
              {group.module} <span className="text-[#7a8297]">({group.permissions.length})</span>
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {group.permissions.map((permission) => (
                <label
                  key={permission.id}
                  className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition ${
                    selectedPermissionCodes.has(permission.code)
                      ? "border-[#c7c0ff] bg-white"
                      : "border-[#edf1f7] bg-white/60"
                  } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={selectedPermissionCodes.has(permission.code)}
                    onChange={() => onToggle(permission.code)}
                    className="mt-0.5 h-4 w-4 accent-[#3820d7]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-extrabold text-[#10143f]">
                      {permission.code}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold leading-4 text-[#7a8297]">
                      {permission.name}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function PermissionCatalog({
  modules,
  search,
  onSearch,
}: {
  modules: Array<{ module: string; permissions: Permission[] }>;
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <PanelHeader kicker="Permission catalog" title="Module permissions" icon={Fingerprint} />
      <SearchBox value={search} onChange={onSearch} placeholder="Search permission code or module" />
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {modules.length > 0 ? (
          modules.map((group) => (
            <div key={group.module} className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold text-[#10143f]">{group.module}</p>
                <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[10px] font-extrabold text-[#2f6eea]">
                  {group.permissions.length}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.permissions.slice(0, 8).map((permission) => (
                  <span
                    key={permission.id}
                    className="rounded-md border border-[#e1e7f2] bg-white px-2.5 py-1 text-[10px] font-extrabold text-[#566178]"
                  >
                    {permission.code}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="md:col-span-2">
            <EmptyState title="No permissions found" body="The permission catalog did not match your search." />
          </div>
        )}
      </div>
    </section>
  );
}

function PanelHeader({
  kicker,
  title,
  icon: Icon,
}: {
  kicker: string;
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#edf1f7] p-5">
      <div>
        <p className="text-[11px] font-extrabold uppercase text-[#68748c]">{kicker}</p>
        <h3 className="mt-1 text-lg font-extrabold text-[#10143f]">{title}</h3>
      </div>
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
        <Icon size={18} aria-hidden="true" />
      </span>
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: "blue" | "violet" | "amber" | "green";
}) {
  const toneClass = {
    blue: "bg-[#eef5ff] text-[#2f6eea]",
    violet: "bg-[#f1ebff] text-[#7c3aed]",
    amber: "bg-[#fff4db] text-[#d97706]",
    green: "bg-[#eaf9f2] text-[#0f9f72]",
  }[tone];

  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-extrabold uppercase text-[#68748c]">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}>
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-[#10143f]">{value}</p>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="p-4">
      <div className="flex h-11 items-center gap-2 rounded-lg border border-[#d8dfea] bg-[#fbfcff] px-3">
        <Search size={15} className="text-[#7a8297]" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#10143f] outline-none placeholder:text-[#9aa2b3]"
        />
        <SlidersHorizontal size={14} className="text-[#9aa2b3]" aria-hidden="true" />
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#4f5262]">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-3 text-[12px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#a9adbd] focus:border-[#3820d7] focus:bg-white"
      />
    </label>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-[#dcdde7] bg-[#fbfbfc] px-5 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ece9ff] text-[#3820d7]">
        <ShieldCheck size={20} aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-extrabold text-[#1d1b2f]">{title}</p>
      <p className="mt-1 max-w-sm text-[12px] leading-5 text-[#8b8c9a]">{body}</p>
    </div>
  );
}

function groupPermissions(permissions: Permission[]) {
  const grouped = permissions.reduce<Record<string, Permission[]>>((accumulator, permission) => {
    const moduleName = permission.module || "platform";
    accumulator[moduleName] = [...(accumulator[moduleName] ?? []), permission];
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([module, values]) => ({
      module,
      permissions: values.sort((left, right) => left.code.localeCompare(right.code)),
    }));
}

function countBy<T extends string>(items: Role[], selector: (item: Role) => T) {
  return items.reduce<Partial<Record<T, number>>>((accumulator, item) => {
    const key = selector(item);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function stringValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function statusClass(role: Role) {
  if (role.isSystem) {
    return "bg-[#eef5ff] text-[#2f6eea]";
  }

  return role.isActive ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#f0f0f2] text-[#686b7c]";
}

function riskClass(riskLevel: PermissionTemplate["riskLevel"]) {
  switch (riskLevel) {
    case "high":
      return "bg-[#fff0f0] text-[#b42318]";
    case "medium":
      return "bg-[#fff4db] text-[#b56a00]";
    default:
      return "bg-[#eaf9f2] text-[#0f8f66]";
  }
}
