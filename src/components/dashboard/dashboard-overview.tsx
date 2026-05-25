import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  FileWarning,
  GitBranch,
  Layers3,
  ListChecks,
  ShieldCheck,
  TrendingUp,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TenantOnboardingPanel } from "@/components/tenants/tenant-onboarding-panel";
import type { AuthSession } from "@/lib/api/types";
import { displayUserName } from "@/lib/auth/user";
import type { PermissionTemplate } from "@/lib/iam/types";
import type { SchedulingSummary } from "@/lib/scheduling/types";
import type { TenantOnboarding } from "@/lib/tenants/types";

type DashboardOverviewData = Record<string, unknown> | null;
type DashboardWidget = Record<string, unknown>;
type AnalyticsSnapshot = Record<string, unknown>;
type DashboardIntelligence = {
  workforce: DashboardOverviewData;
  positions: DashboardOverviewData;
  operations: DashboardOverviewData;
  risks: DashboardOverviewData;
  widgets: DashboardWidget[];
  snapshots: AnalyticsSnapshot[];
  scheduling?: SchedulingSummary | null;
};
type DashboardGovernance = {
  onboarding: TenantOnboarding | null;
  permissionTemplates: PermissionTemplate[];
};

export function DashboardOverview({
  data,
  generatedAt,
  session,
  intelligence,
  governance,
}: {
  data: DashboardOverviewData;
  generatedAt?: string;
  session: AuthSession;
  intelligence: DashboardIntelligence;
  governance: DashboardGovernance;
}) {
  const userName = displayUserName(session.user);
  const tenantName = session.tenant?.name ?? "Platform workspace";
  const primaryRole = session.user.roles[0] ?? session.user.type;
  const activeWorkforce = readNumber(data, "workforce.active") ?? 0;
  const openApprovals = readNumber(data, "approvals.pending") ?? 0;
  const healthScore = readNumber(data, "risks.healthScore") ?? 100;
  const onboardingCompletion = governance.onboarding?.completionPercent ?? healthScore;
  const cards = [
    {
      label: "Active workforce",
      value: readNumber(data, "workforce.active"),
      fallback: "0",
      icon: UsersRound,
      tone: "text-[#2f6eea]",
      bg: "bg-[#eef5ff]",
    },
    {
      label: "Open approvals",
      value: readNumber(data, "approvals.pending"),
      fallback: "0",
      icon: Clock3,
      tone: "text-[#d97706]",
      bg: "bg-[#fff4db]",
    },
    {
      label: "Position vacancies",
      value: readNumber(data, "positions.vacancyHeadcount"),
      fallback: "0",
      icon: GitBranch,
      tone: "text-[#7c3aed]",
      bg: "bg-[#f1ebff]",
    },
    {
      label: "Health score",
      value: readNumber(data, "risks.healthScore"),
      fallback: "100",
      suffix: "%",
      icon: ShieldCheck,
      tone: "text-[#12b886]",
      bg: "bg-[#eaf9f2]",
    },
  ];
  const risks = readArray(data, "risks.indicators");
  const operationalQueues: Array<[string, number, LucideIcon]> = [
    ["Documents expiring", readNumber(data, "documents.expiringSoon") ?? 0, FileWarning],
    ["Unread notices", readNumber(data, "notifications.unreadForUser") ?? 0, AlertTriangle],
    ["Failed outbox", readNumber(data, "operations.outbox.failed") ?? 0, ArrowRight],
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="relative grid gap-5 p-5 xl:grid-cols-[1fr_340px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(56,32,215,0.1),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(47,110,234,0.12),transparent_34%)]" />

          <div className="relative min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                Enterprise command center
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-white px-3 py-1 text-[10px] font-extrabold uppercase text-[#68748c]">
                <Building2 size={13} aria-hidden="true" />
                {tenantName}
              </span>
            </div>

            <h2 className="mt-4 max-w-4xl text-[clamp(1.55rem,2.8vw,2.35rem)] font-extrabold leading-tight tracking-normal text-[#10143f]">
              Welcome back, {userName}. Your workforce is live.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#5d6782]">
              Monitor tenant health, workforce capacity, approvals, and operational exceptions from one secure command view.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Active workforce" value={activeWorkforce} tone="blue" />
              <HeroMetric label="Open approvals" value={openApprovals} tone="amber" />
              <HeroMetric label="Health score" value={`${healthScore}%`} tone="green" />
            </div>
          </div>

          <div className="relative rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_16px_42px_rgba(17,20,58,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/48">
                  Readiness cockpit
                </p>
                <h3 className="mt-2 text-2xl font-extrabold">{onboardingCompletion}%</h3>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white">
                <ListChecks size={20} aria-hidden="true" />
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-[#36d399]"
                style={{ width: `${Math.max(0, Math.min(100, onboardingCompletion))}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-white/60">
              {governance.onboarding
                ? `${governance.onboarding.completed}/${governance.onboarding.total} onboarding stages complete`
                : "Tenant health score from dashboard risk model"}
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                <div className="flex items-center gap-2 text-white/62">
                  <CalendarClock size={16} aria-hidden="true" />
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em]">Generated</p>
                </div>
                <p className="mt-2 text-sm font-extrabold">
                  {generatedAt ? new Date(generatedAt).toLocaleString() : "Waiting for signal"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/48">
                  Operator
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-extrabold text-[#11143a]">
                    {userName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{userName}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-white/54">{primaryRole}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-extrabold uppercase text-[#68748c]">{card.label}</p>
                  <p className="mt-3 text-2xl font-extrabold text-[#121a46]">
                    {card.value ?? card.fallback}
                    {card.suffix ?? ""}
                  </p>
                </div>
                <span className={`grid h-11 w-11 place-items-center rounded-md ${card.bg} ${card.tone}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <GovernanceReadinessGrid governance={governance} />

      <section className="grid gap-5 2xl:grid-cols-[1fr_0.92fr]">
        <DashboardIntelligencePanel intelligence={intelligence} />
        <AnalyticsSnapshotPanel
          snapshots={intelligence.snapshots}
          widgets={intelligence.widgets}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Operational queues</p>
              <h3 className="mt-2 text-lg font-extrabold text-[#121a46]">Today&apos;s control points</h3>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef5ff] text-[#2f6eea]">
              <CheckCircle2 size={18} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {operationalQueues.map(([label, value, Icon]) => (
              <div key={label} className="rounded-md bg-[#f8fbff] p-4">
                <p className="text-sm font-extrabold text-[#121a46]">{label}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-2xl font-extrabold text-[#2f6eea]">{value}</p>
                  <Icon size={18} className="text-[#68748c]" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#dfe8f6] bg-[#101735] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
          <p className="text-[11px] font-extrabold uppercase text-white/60">Risk intelligence</p>
          <h3 className="mt-2 text-lg font-extrabold">Live exception radar</h3>

          <div className="mt-5 space-y-3">
            {risks.length > 0 ? (
              risks.slice(0, 4).map((risk, index) => (
                <div key={index} className="rounded-md border border-white/10 bg-white/8 p-4">
                  <p className="text-sm font-extrabold">{readString(risk, "code") ?? "Risk indicator"}</p>
                  <p className="mt-1 text-sm leading-6 text-white/68">
                    {readString(risk, "description") ?? "Review this risk indicator for details."}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-white/10 bg-white/8 p-4">
                <p className="text-sm font-extrabold">No active risk indicators</p>
                <p className="mt-1 text-sm leading-6 text-white/68">
                  The current overview did not report workforce, document, workflow, or outbox exceptions.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function GovernanceReadinessGrid({ governance }: { governance: DashboardGovernance }) {
  const templates = governance.permissionTemplates;
  const highRiskTemplates = templates.filter((template) => template.riskLevel === "high").length;
  const tenantTemplates = templates.filter((template) => template.scope === "tenant").length;

  if (!governance.onboarding && templates.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <TenantOnboardingPanel
        onboarding={governance.onboarding}
        variant="compact"
        title="Workspace launch readiness"
      />

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_48px_rgba(18,31,67,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase text-[#3820d7]">
              <WandSparkles size={14} aria-hidden="true" />
              Permission templates
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-[#10143f]">Role coverage shortcuts</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-[#5d6782]">
              Reusable least-privilege bundles are available for tenant admins, HR operations, managers, compliance, and auditors.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DarkOnLightMetric label="Templates" value={templates.length} />
          <DarkOnLightMetric label="Tenant scoped" value={tenantTemplates} />
          <DarkOnLightMetric label="High risk" value={highRiskTemplates} />
        </div>

        <div className="mt-5 space-y-2">
          {templates.slice(0, 4).map((template) => (
            <a
              key={template.code}
              href="/iam"
              className="group flex items-center justify-between gap-3 rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3 transition hover:border-[#c8d5ef]"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold text-[#10143f]">{template.name}</p>
                <p className="mt-0.5 truncate text-[11px] font-bold uppercase text-[#68748c]">
                  {template.scope} / {template.riskLevel} risk
                </p>
              </div>
              <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[10px] font-extrabold text-[#2f6eea]">
                {template.permissionCount ?? template.permissionCodes.length}
              </span>
            </a>
          ))}
        </div>
      </section>
    </section>
  );
}

function DarkOnLightMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[#e5ebf5] bg-[#f8fbff] p-3">
      <p className="text-[10px] font-extrabold uppercase text-[#68748c]">{label}</p>
      <p className="mt-2 text-xl font-extrabold text-[#10143f]">{value}</p>
    </div>
  );
}

function DashboardIntelligencePanel({
  intelligence,
}: {
  intelligence: DashboardIntelligence;
}) {
  const trendData = readArray(intelligence.workforce, "headcountTrend.data");
  const positionVacancies = readArray(intelligence.positions, "positions.vacancies");
  const riskIndicators = readArray(intelligence.risks, "risks.indicators");
  const intelligenceCards = [
    {
      title: "Workforce signal",
      kicker: "People intelligence",
      icon: TrendingUp,
      metrics: [
        ["Total", readNumber(intelligence.workforce, "workforce.total") ?? 0],
        ["Hires", readNumber(intelligence.workforce, "workforce.hiresInPeriod") ?? 0],
        ["Attrition", `${readNumber(intelligence.workforce, "workforce.attritionRate") ?? 0}%`],
      ],
    },
    {
      title: "Position control",
      kicker: "Capacity intelligence",
      icon: GitBranch,
      metrics: [
        ["Budget", readNumber(intelligence.positions, "positions.budgetedHeadcount") ?? 0],
        ["Occupied", readNumber(intelligence.positions, "positions.occupiedHeadcount") ?? 0],
        ["Vacancy", readNumber(intelligence.positions, "positions.vacancyHeadcount") ?? 0],
      ],
    },
    {
      title: "Operations pulse",
      kicker: "Runtime intelligence",
      icon: DatabaseZap,
      metrics: [
        ["Audit", readNumber(intelligence.operations, "operations.auditEvents") ?? 0],
        ["Timeline", readNumber(intelligence.operations, "operations.timelineEvents") ?? 0],
        ["Sessions", readNumber(intelligence.operations, "operations.security.activeSessions") ?? 0],
      ],
    },
    {
      title: "Scheduling coverage",
      kicker: "Time and attendance readiness",
      icon: CalendarClock,
      metrics: [
        ["Today", intelligence.scheduling?.metrics.assignmentsToday ?? 0],
        ["Open shifts", intelligence.scheduling?.metrics.openShifts ?? 0],
        ["Overtime", intelligence.scheduling?.metrics.pendingOvertime ?? 0],
      ],
    },
    {
      title: "Risk posture",
      kicker: "Exception intelligence",
      icon: ShieldCheck,
      metrics: [
        ["Health", `${readNumber(intelligence.risks, "risks.healthScore") ?? 100}%`],
        ["Risk score", readNumber(intelligence.risks, "risks.riskScore") ?? 0],
        ["Signals", riskIndicators.length],
      ],
    },
  ];

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Executive intelligence</p>
          <h3 className="mt-2 text-xl font-extrabold text-[#121a46]">
            Workforce signals in one view
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d6782]">
            Workforce, position control, operations, risk, widgets, and analytics stay connected for tenant leadership.
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
          <BarChart3 size={20} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {intelligenceCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.title} className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[#3820d7] shadow-[0_10px_24px_rgba(18,31,67,0.06)]">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase text-[#68748c]">{card.kicker}</p>
                  <h4 className="mt-1 text-sm font-extrabold text-[#121a46]">{card.title}</h4>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {card.metrics.map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-white p-2">
                        <p className="text-[9px] font-extrabold uppercase text-[#8a92a6]">{label}</p>
                        <p className="mt-1 truncate text-sm font-extrabold text-[#10143f]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.88fr]">
        <div className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-[#68748c]">Headcount trend</p>
              <h4 className="mt-1 text-sm font-extrabold text-[#121a46]">Last buckets</h4>
            </div>
            <TrendingUp size={18} className="text-[#2f6eea]" aria-hidden="true" />
          </div>
          <div className="mt-4 flex h-36 items-end gap-2">
            {trendData.length > 0 ? (
              trendData.slice(-8).map((bucket, index) => {
                const headcount = readNumber(bucket, "headcount") ?? 0;
                const max = Math.max(...trendData.map((item) => readNumber(item, "headcount") ?? 0), 1);

                return (
                  <div key={`${readString(bucket, "label") ?? index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex h-28 w-full items-end rounded-md bg-white p-1">
                      <div
                        className="w-full rounded bg-[#3820d7]"
                        style={{ height: `${Math.max(8, (headcount / max) * 100)}%` }}
                      />
                    </div>
                    <span className="max-w-full truncate text-[9px] font-bold text-[#7a8297]">
                      {readString(bucket, "label") ?? "N/A"}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="self-center text-sm font-semibold text-[#7a8297]">No trend buckets returned yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-[#68748c]">Vacancy watch</p>
              <h4 className="mt-1 text-sm font-extrabold text-[#121a46]">Open capacity</h4>
            </div>
            <Layers3 size={18} className="text-[#7c3aed]" aria-hidden="true" />
          </div>
          <div className="mt-4 space-y-2">
            {positionVacancies.length > 0 ? (
              positionVacancies.slice(0, 5).map((position, index) => (
                <div key={readString(position, "id") ?? index} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-extrabold text-[#121a46]">
                      {readString(position, "title") ?? "Open position"}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-bold text-[#7a8297]">
                      {readString(position, "code") ?? "No code"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#fff4db] px-2.5 py-1 text-[10px] font-extrabold text-[#b56a00]">
                    {readNumber(position, "vacancyHeadcount") ?? 0} open
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-white p-4">
                <p className="text-sm font-extrabold text-[#121a46]">No active vacancies reported</p>
                <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">Position control looks balanced for now.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsSnapshotPanel({
  snapshots,
  widgets,
}: {
  snapshots: AnalyticsSnapshot[];
  widgets: DashboardWidget[];
}) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-[#101735] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-white/55">Analytics layer</p>
          <h3 className="mt-2 text-xl font-extrabold">Snapshots and widgets</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/62">
            Analytics readiness is visible even before custom chart builders land.
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-white">
          <DatabaseZap size={20} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DarkMetric label="Widgets" value={widgets.length} />
        <DarkMetric label="Snapshots" value={snapshots.length} />
      </div>

      <div className="mt-5 space-y-3">
        {snapshots.length > 0 ? (
          snapshots.slice(0, 5).map((snapshot, index) => (
            <div key={readString(snapshot, "id") ?? index} className="rounded-lg border border-white/10 bg-white/[0.08] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-extrabold">{readString(snapshot, "key") ?? "Snapshot"}</p>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold text-white/68">
                  {readString(snapshot, "period") ?? "Period"}
                </span>
              </div>
              <p className="mt-1 text-[12px] font-semibold text-white/55">
                {readString(snapshot, "createdAt")
                  ? new Date(readString(snapshot, "createdAt") ?? "").toLocaleString()
                  : "Not persisted yet"}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.08] p-4">
            <p className="text-sm font-extrabold">No analytics snapshots yet</p>
            <p className="mt-1 text-sm leading-6 text-white/62">
              Refresh analytics when you are ready to preserve a point-in-time executive snapshot.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-extrabold uppercase text-white/45">Widget registry</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {widgets.length > 0 ? (
            widgets.slice(0, 8).map((widget, index) => (
              <span key={readString(widget, "id") ?? index} className="rounded-md border border-white/10 bg-white/[0.08] px-2.5 py-1.5 text-[10px] font-extrabold text-white/76">
                {readString(widget, "code") ?? readString(widget, "name") ?? "Widget"}
              </span>
            ))
          ) : (
            <span className="rounded-md border border-white/10 bg-white/[0.08] px-2.5 py-1.5 text-[10px] font-extrabold text-white/58">
              No widgets configured
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function DarkMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.08] p-4">
      <p className="text-[10px] font-extrabold uppercase text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "blue" | "amber" | "green";
}) {
  const toneClass = {
    blue: "bg-[#eef5ff] text-[#2f6eea]",
    amber: "bg-[#fff4db] text-[#d97706]",
    green: "bg-[#eaf9f2] text-[#0f9f72]",
  }[tone];

  return (
    <div className="rounded-2xl border border-[#e3e9f4] bg-white/84 p-4 shadow-[0_14px_34px_rgba(18,31,67,0.06)]">
      <p className="text-[10px] font-extrabold uppercase text-[#68748c]">{label}</p>
      <p className={`mt-2 inline-flex rounded-xl px-3 py-1 text-xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}

function readNumber(source: unknown, path: string) {
  const value = readPath(source, path);
  return typeof value === "number" ? value : null;
}

function readString(source: unknown, path: string) {
  const value = readPath(source, path);
  return typeof value === "string" ? value : null;
}

function readArray(source: unknown, path: string) {
  const value = readPath(source, path);
  return Array.isArray(value) ? value : [];
}

function readPath(source: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return null;
  }, source);
}
