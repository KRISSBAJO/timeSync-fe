"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Fingerprint,
  Globe2,
  KeyRound,
  Laptop,
  Loader2,
  MonitorX,
  Paintbrush,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { AuthSession, BrowserSession } from "@/lib/api/types";
import { displayUserName } from "@/lib/auth/user";
import type { TenantDetails, TenantFeature, TenantSubscription } from "@/lib/tenants/types";

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

type SettingsTab = "overview" | "tenant" | "security" | "modules" | "runtime";

const settingsTabs: Array<{
  key: SettingsTab;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    key: "overview",
    title: "Overview",
    description: "Health and workspace summary",
    icon: ShieldCheck,
  },
  {
    key: "tenant",
    title: "Tenant",
    description: "Identity, locale, branding",
    icon: BadgeCheck,
  },
  {
    key: "security",
    title: "Security",
    description: "Policies and sessions",
    icon: Fingerprint,
  },
  {
    key: "modules",
    title: "Modules",
    description: "Feature access state",
    icon: Sparkles,
  },
  {
    key: "runtime",
    title: "Runtime",
    description: "Access guardrails",
    icon: SlidersHorizontal,
  },
];

export function WorkspaceSettingsCenter({
  session,
  tenant,
  features,
  subscription,
  sessions,
  canWriteSettings,
  canWriteBranding,
}: {
  session: AuthSession;
  tenant: TenantDetails | null;
  features: TenantFeature[];
  subscription: TenantSubscription | null;
  sessions: BrowserSession[];
  canWriteSettings: boolean;
  canWriteBranding: boolean;
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [browserSessions, setBrowserSessions] = useState(() => sessions);
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => (
    typeof window !== "undefined" && window.location.hash === "#sessions" ? "security" : "overview"
  ));
  const userName = displayUserName(session.user);
  const activeSessions = browserSessions.filter((browserSession) => !browserSession.revokedAt);
  const otherActiveSessions = activeSessions.filter((browserSession) => !browserSession.isCurrent);
  const settings = tenant?.settings;
  const enabledFeatures = features.filter((feature) => feature.status === "ENABLED");
  const policyItems = useMemo(
    () => [
      {
        title: "Password policy",
        value: settings?.passwordPolicy,
        fallback: "Default strong-password policy",
        icon: KeyRound,
      },
      {
        title: "Session policy",
        value: settings?.sessionPolicy,
        fallback: "HTTP-only cookie sessions with refresh rotation",
        icon: Fingerprint,
      },
      {
        title: "Approval policy",
        value: settings?.approvalPolicy,
        fallback: "Workflow approvals enforced by module permissions",
        icon: SlidersHorizontal,
      },
    ],
    [settings?.approvalPolicy, settings?.passwordPolicy, settings?.sessionPolicy],
  );

  async function revokeSession(sessionId: string) {
    setNotice(null);
    setSessionBusy(true);

    try {
      await apiFetch(`/auth/sessions/${sessionId}`, {
        method: "DELETE",
      });
      setNotice({ type: "success", message: "Browser session revoked." });
      setBrowserSessions((current) =>
        current.map((browserSession) =>
          browserSession.id === sessionId
            ? { ...browserSession, revokedAt: new Date().toISOString() }
            : browserSession,
        ),
      );
    } catch (caught) {
      setNotice({
        type: "error",
        message: caught instanceof Error ? caught.message : "Could not revoke session.",
      });
    } finally {
      setSessionBusy(false);
    }
  }

  async function revokeOtherSessions() {
    if (otherActiveSessions.length === 0) {
      return;
    }

    setNotice(null);
    setSessionBusy(true);

    try {
      await apiFetch("/auth/sessions", {
        method: "DELETE",
      });
      const revokedAt = new Date().toISOString();
      setBrowserSessions((current) =>
        current.map((browserSession) =>
          !browserSession.isCurrent && !browserSession.revokedAt
            ? { ...browserSession, revokedAt }
            : browserSession,
        ),
      );
      setNotice({ type: "success", message: "Other browser sessions were revoked." });
    } catch (caught) {
      setNotice({
        type: "error",
        message: caught instanceof Error ? caught.message : "Could not revoke other sessions.",
      });
    } finally {
      setSessionBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-[11px] font-extrabold uppercase tracking-normal text-[#3820d7]">
              Workspace controls
            </p>
            <h2 className="mt-3 text-[clamp(1.55rem,2.3vw,2.1rem)] font-extrabold leading-tight text-[#10143f]">
              Security, localization, brand controls, and tenant runtime state.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6782]">
              Keep the tenant workspace governed without burying security state inside the sidebar.
              Sessions, features, and policy signals now live here where administrators expect them.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[430px]">
            <MetricTile label="Signed in" value={userName} icon={ShieldCheck} tone="blue" />
            <MetricTile label="Active sessions" value={activeSessions.length} icon={Laptop} tone="green" />
            <MetricTile label="Enabled modules" value={enabledFeatures.length} icon={Sparkles} tone="violet" />
            <MetricTile label="Plan" value={subscription?.planName ?? tenant?.subscription?.planName ?? "Enterprise"} icon={BadgeCheck} tone="amber" />
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

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-2 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-[#3820d7] bg-[#f5f2ff] text-[#10143f] shadow-[0_12px_28px_rgba(56,32,215,0.10)]"
                    : "border-transparent text-[#5d6782] hover:border-[#dfe8f6] hover:bg-[#fbfcff]"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${active ? "bg-[#3820d7] text-white" : "bg-[#eef2f8] text-[#68748c]"}`}>
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold">{tab.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#7a8297]">{tab.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "overview" ? (
        <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
          <div className="grid gap-5">
            <TenantIdentityPanel tenant={tenant} subscription={subscription} />
            <FeatureStatePanel features={enabledFeatures.slice(0, 6)} compact />
          </div>
          <div className="grid gap-5">
            <SessionsPanel
              sessions={browserSessions}
              isPending={sessionBusy}
              onRevoke={revokeSession}
              onRevokeOtherSessions={revokeOtherSessions}
            />
          </div>
        </section>
      ) : null}

      {activeTab === "tenant" ? (
        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <TenantIdentityPanel tenant={tenant} subscription={subscription} />
            <LocalizationPanel tenant={tenant} />
          </div>
          <BrandingPanel tenant={tenant} canWriteBranding={canWriteBranding} />
        </section>
      ) : null}

      {activeTab === "security" ? (
        <section id="sessions" className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SecurityPolicyPanel
            policies={policyItems}
            canWriteSettings={canWriteSettings}
          />
          <SessionsPanel
            sessions={browserSessions}
            isPending={sessionBusy}
            onRevoke={revokeSession}
            onRevokeOtherSessions={revokeOtherSessions}
          />
        </section>
      ) : null}

      {activeTab === "modules" ? (
        <FeatureStatePanel features={features} />
      ) : null}

      {activeTab === "runtime" ? (
        <RuntimeGuardrails
          tenant={tenant}
          session={session}
          canWriteSettings={canWriteSettings}
          canWriteBranding={canWriteBranding}
        />
      ) : null}
    </div>
  );
}

function TenantIdentityPanel({
  tenant,
  subscription,
}: {
  tenant: TenantDetails | null;
  subscription: TenantSubscription | null;
}) {
  return (
    <Panel title="Tenant identity" kicker="Workspace" icon={BadgeCheck}>
      {tenant ? (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-extrabold text-[#10143f]">{tenant.name}</h3>
              <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">{tenant.slug}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${tenantStatusClass(tenant.status)}`}>
              {tenant.status}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoTile label="Legal name" value={tenant.legalName ?? tenant.name} />
            <InfoTile label="Subdomain" value={tenant.subdomain} />
            <InfoTile label="Industry" value={tenant.industry ?? "Not set"} />
            <InfoTile label="Size" value={tenant.sizeBand ?? "Not set"} />
            <InfoTile label="Support email" value={tenant.supportEmail ?? "Not set"} />
            <InfoTile label="Plan status" value={subscription?.status ?? tenant.subscription?.status ?? "Not set"} />
          </div>
        </div>
      ) : (
        <EmptyState title="No tenant context" body="Platform operators can use tenant administration to inspect individual workspaces." />
      )}
    </Panel>
  );
}

function LocalizationPanel({ tenant }: { tenant: TenantDetails | null }) {
  const settings = tenant?.settings;

  return (
    <Panel title="Localization" kicker="Globalization" icon={Globe2}>
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoTile label="Timezone" value={settings?.defaultTimezone ?? "UTC"} />
        <InfoTile label="Locale" value={settings?.defaultLocale ?? "en-US"} />
        <InfoTile label="Date format" value={settings?.dateFormat ?? "MM/dd/yyyy"} />
        <InfoTile label="Time format" value={settings?.timeFormat ?? "HH:mm"} />
        <InfoTile label="Employee prefix" value={settings?.employeeNumberPrefix ?? "EMP"} />
        <InfoTile label="Fiscal start" value={String(settings?.fiscalYearStartMonth ?? 1)} />
      </div>
    </Panel>
  );
}

function BrandingPanel({
  tenant,
  canWriteBranding,
}: {
  tenant: TenantDetails | null;
  canWriteBranding: boolean;
}) {
  const branding = tenant?.branding;
  const swatches = [
    ["Primary", branding?.primaryColor ?? "#3820d7"],
    ["Secondary", branding?.secondaryColor ?? "#11143a"],
    ["Accent", branding?.accentColor ?? "#ff9f1c"],
  ];

  return (
    <Panel title="Branding" kicker="Experience layer" icon={Paintbrush}>
      <div className="grid gap-3 sm:grid-cols-3">
        {swatches.map(([label, color]) => (
          <div key={label} className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3">
            <span
              className="block h-12 rounded-lg border border-black/5"
              style={{ backgroundColor: color }}
            />
            <p className="mt-3 text-[10px] font-extrabold uppercase text-[#68748c]">{label}</p>
            <p className="mt-1 truncate text-[12px] font-extrabold text-[#10143f]">{color}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3">
        <p className="text-[10px] font-extrabold uppercase text-[#68748c]">Font family</p>
        <p className="mt-1 text-sm font-extrabold text-[#10143f]">
          {branding?.fontFamily ?? "Plus Jakarta Sans"}
        </p>
      </div>
      <p className="mt-3 text-[12px] font-semibold text-[#7a8297]">
        {canWriteBranding ? "Brand write access is available from tenant administration." : "Branding is currently read-only for this user."}
      </p>
    </Panel>
  );
}

function SecurityPolicyPanel({
  policies,
  canWriteSettings,
}: {
  policies: Array<{
    title: string;
    value?: Record<string, unknown> | null;
    fallback: string;
    icon: LucideIcon;
  }>;
  canWriteSettings: boolean;
}) {
  return (
    <Panel title="Security policy" kicker="Governance" icon={ShieldCheck}>
      <div className="grid gap-3">
        {policies.map((policy) => {
          const Icon = policy.icon;

          return (
            <div key={policy.title} className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-[#10143f]">{policy.title}</p>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a8297]">
                    {policy.value ? summarizePolicy(policy.value) : policy.fallback}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] font-semibold text-[#7a8297]">
        {canWriteSettings ? "Settings write access is enabled for this session." : "Policy changes require tenant settings write permission."}
      </p>
    </Panel>
  );
}

function SessionsPanel({
  sessions,
  isPending,
  onRevoke,
  onRevokeOtherSessions,
}: {
  sessions: BrowserSession[];
  isPending: boolean;
  onRevoke: (sessionId: string) => void;
  onRevokeOtherSessions: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const activeSessions = sessions.filter((browserSession) => !browserSession.revokedAt);
  const visibleSessions = showAll ? activeSessions : activeSessions.slice(0, 3);
  const otherActiveSessions = activeSessions.filter((browserSession) => !browserSession.isCurrent);

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="flex flex-col gap-4 border-b border-[#edf1f7] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Browser sessions</p>
          <h3 className="mt-1 text-lg font-extrabold text-[#10143f]">Session console</h3>
          <p className="mt-1 max-w-xl text-[12px] font-semibold leading-5 text-[#7a8297]">
            Keep this browser active while stale device sessions are soft-revoked and retained for audit.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={otherActiveSessions.length === 0 || isPending}
            onClick={onRevokeOtherSessions}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#ffd5d5] bg-[#fff7f7] px-3 text-[12px] font-extrabold text-[#b42318] transition hover:bg-[#fff0f0] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <MonitorX size={14} aria-hidden="true" />}
            Revoke other devices
          </button>
          <span className="hidden h-10 w-10 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea] sm:grid">
            <Fingerprint size={18} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <InfoTile label="Active sessions" value={String(activeSessions.length)} />
          <InfoTile label="Other devices" value={String(otherActiveSessions.length)} />
          <InfoTile label="Revoked history" value={String(sessions.length - activeSessions.length)} />
        </div>

        {activeSessions.length > 0 ? (
          <div className="grid gap-3">
            {visibleSessions.map((browserSession) => {
            const revoked = Boolean(browserSession.revokedAt);

            return (
              <div key={browserSession.id} className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-[#10143f]">
                        {browserSession.deviceName ?? "Browser session"}
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${revoked ? "bg-[#f0f0f2] text-[#686b7c]" : "bg-[#eaf9f2] text-[#0f8f66]"}`}>
                        {revoked ? "REVOKED" : "ACTIVE"}
                      </span>
                      {browserSession.isCurrent ? (
                        <span className="rounded-full bg-[#ece9ff] px-2.5 py-1 text-[10px] font-extrabold text-[#3820d7]">
                          CURRENT
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-[12px] font-semibold text-[#7a8297]">
                      {browserSession.ipAddress ?? "Unknown IP"} · expires {formatDate(browserSession.expiresAt)}
                    </p>
                    <p className="mt-1 max-w-2xl truncate text-[11px] font-medium text-[#9aa2b3]">
                      {browserSession.userAgent ?? "No user agent recorded"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={revoked || browserSession.isCurrent || isPending}
                    onClick={() => onRevoke(browserSession.id)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#ffd5d5] bg-white px-3 text-[12px] font-extrabold text-[#b42318] transition hover:bg-[#fff7f7] disabled:cursor-not-allowed disabled:border-[#e4e9f2] disabled:bg-[#f6f8fd] disabled:text-[#9aa2b3]"
                  >
                    {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <MonitorX size={14} aria-hidden="true" />}
                    {browserSession.isCurrent ? "Current browser" : "Revoke"}
                  </button>
                </div>
              </div>
            );
            })}

            {activeSessions.length > 3 ? (
              <button
                type="button"
                onClick={() => setShowAll((current) => !current)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[#dfe8f6] bg-white px-4 text-[12px] font-extrabold text-[#3820d7] transition hover:bg-[#f8f6ff]"
              >
                {showAll ? "Show fewer sessions" : `View all ${activeSessions.length} sessions`}
              </button>
            ) : null}

            <p className="text-[11px] font-semibold leading-5 text-[#8a92a6]">
              Revoked sessions are removed from this active list and retained as security history.
            </p>
          </div>
        ) : (
          <EmptyState title="No active sessions" body="No browser sessions are available for this user right now." />
        )}
      </div>
    </section>
  );
}

function FeatureStatePanel({ features, compact = false }: { features: TenantFeature[]; compact?: boolean }) {
  return (
    <Panel title="Feature state" kicker="Module enablement" icon={Sparkles}>
      <div className="grid gap-3 md:grid-cols-2">
        {features.length > 0 ? (
          features.map((feature) => (
            <div key={feature.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[#10143f]">{feature.platformFeature.name}</p>
                <p className="mt-1 truncate text-[11px] font-bold text-[#7a8297]">{feature.platformFeature.code}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${featureStatusClass(feature.status)}`}>
                {feature.status}
              </span>
            </div>
          ))
        ) : (
          <div className="md:col-span-2">
            <EmptyState title="No features returned" body="Feature state appears after tenant feature access is granted." />
          </div>
        )}
      </div>
      {compact && features.length > 0 ? (
        <p className="mt-3 text-[12px] font-semibold text-[#7a8297]">
          Open the Modules tab to review the full tenant feature catalog.
        </p>
      ) : null}
    </Panel>
  );
}

function RuntimeGuardrails({
  tenant,
  session,
  canWriteSettings,
  canWriteBranding,
}: {
  tenant: TenantDetails | null;
  session: AuthSession;
  canWriteSettings: boolean;
  canWriteBranding: boolean;
}) {
  const rows = [
    ["Tenant isolation", tenant ? "Tenant scoped" : "Platform scope", tenant ? "green" : "amber"],
    ["Auth model", "HTTP-only cookies", "green"],
    ["Settings write", canWriteSettings ? "Available" : "Read only", canWriteSettings ? "green" : "amber"],
    ["Brand write", canWriteBranding ? "Available" : "Read only", canWriteBranding ? "green" : "amber"],
    ["User type", session.user.type, "blue"],
  ] as const;

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-[#101735] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
      <p className="text-[11px] font-extrabold uppercase text-white/55">Runtime guardrails</p>
      <h3 className="mt-2 text-xl font-extrabold">Operational access posture</h3>
      <div className="mt-5 grid gap-3">
        {rows.map(([label, value, tone]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.08] p-3">
            <p className="text-sm font-extrabold text-white/78">{label}</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${darkPillClass(tone)}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Panel({
  title,
  kicker,
  icon: Icon,
  children,
}: {
  title: string;
  kicker: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">{kicker}</p>
          <h3 className="mt-1 text-lg font-extrabold text-[#10143f]">{title}</h3>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      {children}
    </section>
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
      <p className="mt-3 truncate text-xl font-extrabold text-[#10143f]">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3">
      <p className="text-[10px] font-extrabold uppercase text-[#68748c]">{label}</p>
      <p className="mt-1 truncate text-[13px] font-extrabold text-[#10143f]">{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-[#dcdde7] bg-[#fbfbfc] px-5 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ece9ff] text-[#3820d7]">
        <CheckCircle2 size={20} aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-extrabold text-[#1d1b2f]">{title}</p>
      <p className="mt-1 max-w-sm text-[12px] leading-5 text-[#8b8c9a]">{body}</p>
    </div>
  );
}

function summarizePolicy(value: Record<string, unknown>) {
  const entries = Object.entries(value);

  if (entries.length === 0) {
    return "Custom policy exists but has no visible keys yet.";
  }

  return entries
    .slice(0, 4)
    .map(([key, item]) => `${key}: ${String(item)}`)
    .join(" · ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function tenantStatusClass(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-[#eaf9f2] text-[#0f8f66]";
    case "TRIAL":
    case "PENDING_VERIFICATION":
      return "bg-[#fff4db] text-[#b56a00]";
    case "SUSPENDED":
      return "bg-[#fff0f0] text-[#b42318]";
    case "ARCHIVED":
      return "bg-[#f0f0f2] text-[#686b7c]";
    default:
      return "bg-[#ece9ff] text-[#3820d7]";
  }
}

function featureStatusClass(status: string) {
  switch (status) {
    case "ENABLED":
      return "bg-[#eaf9f2] text-[#0f8f66]";
    case "TRIAL":
    case "BETA":
      return "bg-[#fff4db] text-[#b56a00]";
    default:
      return "bg-[#f0f0f2] text-[#686b7c]";
  }
}

function darkPillClass(tone: "green" | "amber" | "blue") {
  switch (tone) {
    case "green":
      return "bg-[#36d399]/15 text-[#7cf0bd]";
    case "amber":
      return "bg-[#f59e0b]/15 text-[#ffd38a]";
    default:
      return "bg-[#5a8cff]/15 text-[#9dbbff]";
  }
}
