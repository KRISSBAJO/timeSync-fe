import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Route,
  ShieldCheck,
} from "lucide-react";

import type { TenantOnboarding, TenantOnboardingStep } from "@/lib/tenants/types";

const STEP_LINKS: Record<string, string> = {
  TENANT_PROFILE: "/tenants#tenant-profile",
  FEATURES_ENABLED: "/tenants#feature-enablement",
  ROLES_READY: "/iam",
  USERS_READY: "/iam",
  ORGANIZATION_READY: "/organization",
  WORKFORCE_READY: "/workforce",
  WORKFLOWS_READY: "/workflows",
  COMPLIANCE_READY: "/documents",
  DASHBOARD_READY: "/dashboard",
};

export function TenantOnboardingPanel({
  onboarding,
  variant = "full",
  title = "Tenant onboarding readiness",
}: {
  onboarding: TenantOnboarding | null;
  variant?: "compact" | "full";
  title?: string;
}) {
  const completion = clamp(onboarding?.completionPercent ?? 0);
  const steps = onboarding?.steps ?? [];
  const visibleSteps = variant === "compact" ? steps.slice(0, 5) : steps;
  const nextActions = onboarding?.nextBestActions ?? [];

  return (
    <section
      className={`overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_48px_rgba(18,31,67,0.06)] ${
        variant === "compact" ? "p-4" : "p-5"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase text-[#3820d7]">
            <ClipboardCheck size={14} aria-hidden="true" />
            Onboarding control
          </p>
          <h3 className="mt-2 text-xl font-extrabold leading-tight text-[#10143f]">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#5d6782]">
            {onboarding
              ? `${onboarding.tenant.name} is ${completion}% complete across tenant profile, modules, IAM, workforce, workflow, compliance, and dashboards.`
              : "No onboarding checklist is available for this permission context yet."}
          </p>
        </div>

        <div className="w-full rounded-xl border border-[#e3e9f4] bg-[#f8fbff] p-4 lg:w-[260px]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase text-[#68748c]">Completion</p>
              <p className="mt-1 text-3xl font-extrabold text-[#10143f]">{completion}%</p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#eaf9f2] text-[#0f9f72]">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dfe8f6]">
            <div className="h-full rounded-full bg-[#12b886]" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-2 text-[11px] font-bold text-[#68748c]">
            {onboarding ? `${onboarding.completed}/${onboarding.total} steps complete` : "Waiting for tenant readiness"}
          </p>
        </div>
      </div>

      {nextActions.length > 0 ? (
        <div className="mt-5 rounded-xl border border-[#eee8c8] bg-[#fffaf0] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#d97706]">
              <Route size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase text-[#8a5a00]">Next best actions</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {nextActions.map((action) => (
                  <a
                    key={action.code}
                    href={STEP_LINKS[action.code] ?? "/tenants"}
                    className="group rounded-lg border border-[#f1dfaa] bg-white px-3 py-2 text-left transition hover:border-[#d97706]"
                  >
                    <span className="block truncate text-[12px] font-extrabold text-[#10143f]">
                      {action.title}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-3 text-[10px] font-bold uppercase text-[#8a5a00]">
                      {action.owner}
                      <ArrowRight size={13} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`mt-5 grid gap-3 ${variant === "compact" ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {visibleSteps.length > 0 ? (
          visibleSteps.map((step) => <OnboardingStepCard key={step.code} step={step} />)
        ) : (
          <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-5 text-sm font-semibold text-[#68748c]">
            Tenant readiness steps will appear as onboarding signals become available.
          </div>
        )}
      </div>
    </section>
  );
}

function OnboardingStepCard({ step }: { step: TenantOnboardingStep }) {
  return (
    <a
      href={STEP_LINKS[step.code] ?? "/tenants"}
      className={`group rounded-xl border p-4 transition ${
        step.complete
          ? "border-[#c9f1df] bg-[#f4fcf8] hover:border-[#12b886]"
          : "border-[#dfe8f6] bg-[#fbfcff] hover:border-[#8aa7e8]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            step.complete ? "bg-[#dff8ec] text-[#0f9f72]" : "bg-[#eef5ff] text-[#2f6eea]"
          }`}
        >
          {step.complete ? <CheckCircle2 size={18} aria-hidden="true" /> : <CircleDashed size={18} aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 text-[13px] font-extrabold leading-5 text-[#10143f]">{step.title}</p>
          <p className="mt-1 text-[10px] font-extrabold uppercase text-[#68748c]">{step.owner}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(step.evidence)
          .slice(0, 3)
          .map(([key, value]) => (
            <span
              key={key}
              className="rounded-md border border-[#e4eaf4] bg-white px-2 py-1 text-[9px] font-extrabold uppercase text-[#6c7489]"
            >
              {key}: {String(value)}
            </span>
          ))}
      </div>
    </a>
  );
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
