"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  CheckCircle2,
  CirclePlus,
  Eye,
  Globe2,
  Loader2,
  Paintbrush,
  Power,
  Search,
  ServerCog,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { TenantOnboardingPanel } from "@/components/tenants/tenant-onboarding-panel";
import { apiFetch } from "@/lib/api/client";
import type {
  TenantAdminPayload,
  TenantDetails,
  TenantFeature,
  TenantOnboarding,
  TenantSubscription,
} from "@/lib/tenants/types";

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

type TenantAdminTab = "overview" | "workspace" | "features" | "directory" | "inspect" | "provision";

const BASE_TENANT_TABS: Array<{
  key: TenantAdminTab;
  title: string;
  description: string;
  icon: LucideIcon;
  platformOnly?: boolean;
}> = [
  {
    key: "overview",
    title: "Overview",
    description: "Readiness and tenant posture",
    icon: ShieldCheck,
  },
  {
    key: "workspace",
    title: "Workspace",
    description: "Profile, locale, branding",
    icon: Building2,
  },
  {
    key: "features",
    title: "Features",
    description: "Module enablement",
    icon: Boxes,
  },
  {
    key: "directory",
    title: "Directory",
    description: "Platform tenant registry",
    icon: UsersRound,
    platformOnly: true,
  },
  {
    key: "inspect",
    title: "Inspect",
    description: "Tenant operating profile",
    icon: Eye,
    platformOnly: true,
  },
  {
    key: "provision",
    title: "Provision",
    description: "Create a new tenant",
    icon: CirclePlus,
    platformOnly: true,
  },
];

export function TenantAdminDashboard({
  payload,
}: {
  payload: TenantAdminPayload;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [tenantSearch, setTenantSearch] = useState("");
  const [features, setFeatures] = useState(payload.currentFeatures);
  const [reviewOnboarding, setReviewOnboarding] = useState<TenantOnboarding | null>(
    payload.currentOnboarding,
  );
  const [inspectedTenant, setInspectedTenant] = useState<TenantDetails | null>(null);
  const [inspectedTenantFeatures, setInspectedTenantFeatures] = useState<TenantFeature[]>([]);
  const [inspectedTenantOnboarding, setInspectedTenantOnboarding] = useState<TenantOnboarding | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(false);
  const [isInspectingTenant, setIsInspectingTenant] = useState(false);
  const {
    canWriteSettings,
    canWriteBranding,
    canWriteFeatures,
    canManagePlatformTenants,
  } = payload.capabilities;
  const visibleTabs = useMemo(
    () => BASE_TENANT_TABS.filter((tab) => !tab.platformOnly || canManagePlatformTenants),
    [canManagePlatformTenants],
  );
  const [activeTab, setActiveTab] = useState<TenantAdminTab>("overview");
  const tenantStatusCounts = useMemo(() => countByStatus(payload.platformTenants), [payload.platformTenants]);
  const enabledFeatureCount = features.filter((feature) => feature.status === "ENABLED").length;
  const rolloutFeatureCount = features.filter((feature) => feature.status === "TRIAL" || feature.status === "BETA").length;
  const activeTenantCount = tenantStatusCounts.ACTIVE ?? 0;
  const filteredTenants = useMemo(() => {
    const query = tenantSearch.trim().toLowerCase();

    if (!query) {
      return payload.platformTenants;
    }

    return payload.platformTenants.filter((tenant) =>
      [tenant.name, tenant.slug, tenant.subdomain, tenant.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [payload.platformTenants, tenantSearch]);

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
        message: caught instanceof Error ? caught.message : "Action failed.",
      });
      return false;
    }
  }

  async function onSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWriteSettings) {
      setNotice({ type: "error", message: "You do not have permission to update tenant settings." });
      return;
    }

    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch("/tenants/current/settings", {
          method: "PATCH",
          body: JSON.stringify({
            defaultTimezone: stringValue(formData, "defaultTimezone"),
            defaultLocale: stringValue(formData, "defaultLocale"),
            dateFormat: stringValue(formData, "dateFormat"),
            timeFormat: stringValue(formData, "timeFormat"),
            employeeNumberPrefix: stringValue(formData, "employeeNumberPrefix"),
            fiscalYearStartMonth: numberValue(formData, "fiscalYearStartMonth"),
          }),
        }),
      "Tenant settings updated.",
    );
  }

  async function onBrandingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWriteBranding) {
      setNotice({ type: "error", message: "You do not have permission to update tenant branding." });
      return;
    }

    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch("/tenants/current/branding", {
          method: "PATCH",
          body: JSON.stringify({
            primaryColor: stringValue(formData, "primaryColor"),
            secondaryColor: stringValue(formData, "secondaryColor"),
            accentColor: stringValue(formData, "accentColor"),
            fontFamily: stringValue(formData, "fontFamily"),
          }),
        }),
      "Tenant branding updated.",
    );
  }

  async function onCreateTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManagePlatformTenants) {
      setNotice({ type: "error", message: "Platform tenant management permission is required." });
      return;
    }

    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        apiFetch("/platform/tenants", {
          method: "POST",
          body: JSON.stringify({
            name: stringValue(formData, "name"),
            legalName: stringValue(formData, "legalName"),
            slug: stringValue(formData, "slug"),
            subdomain: stringValue(formData, "subdomain"),
            industry: stringValue(formData, "industry"),
            sizeBand: stringValue(formData, "sizeBand"),
            supportEmail: stringValue(formData, "supportEmail"),
            adminEmail: stringValue(formData, "adminEmail"),
            planCode: stringValue(formData, "planCode"),
            planName: stringValue(formData, "planName"),
            subscriptionStatus: stringValue(formData, "subscriptionStatus"),
            userLimit: numberValue(formData, "userLimit"),
            employeeLimit: numberValue(formData, "employeeLimit"),
            storageLimitMb: numberValue(formData, "storageLimitMb"),
            status: "TRIAL",
          }),
        }),
      "Tenant provisioned and first administrator invitation queued.",
    );
  }

  async function toggleFeature(feature: TenantFeature) {
    if (!canWriteFeatures) {
      setNotice({ type: "error", message: "You do not have permission to change tenant features." });
      return;
    }

    const nextEnabled = feature.status !== "ENABLED";
    const path = `/tenants/current/features/${feature.platformFeature.code}/${nextEnabled ? "enable" : "disable"}`;

    setFeatures((current) =>
      current.map((item) =>
        item.id === feature.id
          ? {
              ...item,
              status: nextEnabled ? "ENABLED" : "DISABLED",
            }
          : item,
      ),
    );

    await runAction(
      () =>
        apiFetch(path, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      `${feature.platformFeature.name} ${nextEnabled ? "enabled" : "disabled"}.`,
    );
  }

  async function setTenantStatus(tenant: TenantDetails, status: "activate" | "suspend" | "archive") {
    if (!canManagePlatformTenants) {
      setNotice({ type: "error", message: "Platform tenant management permission is required." });
      return;
    }

    await runAction(
      () =>
        apiFetch(`/platform/tenants/${tenant.id}/${status}`, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      `${tenant.name} status updated.`,
    );
  }

  async function reviewTenantOnboarding(tenant: TenantDetails) {
    if (!canManagePlatformTenants) {
      setNotice({ type: "error", message: "Platform tenant management permission is required." });
      return;
    }

    setNotice(null);
    setIsLoadingOnboarding(true);

    try {
      const onboarding = await apiFetch<TenantOnboarding>(`/platform/tenants/${tenant.id}/onboarding`);
      setReviewOnboarding(onboarding);
      setActiveTab("overview");
    } catch (caught) {
      setNotice({
        type: "error",
        message: caught instanceof Error ? caught.message : "Could not load tenant onboarding.",
      });
    } finally {
      setIsLoadingOnboarding(false);
    }
  }

  async function inspectTenant(tenant: TenantDetails) {
    if (!canManagePlatformTenants) {
      setNotice({ type: "error", message: "Platform tenant management permission is required." });
      return;
    }

    setNotice(null);
    setIsInspectingTenant(true);

    try {
      const [details, onboarding, tenantFeatures] = await Promise.all([
        apiFetch<TenantDetails>(`/platform/tenants/${tenant.id}`),
        apiFetch<TenantOnboarding>(`/platform/tenants/${tenant.id}/onboarding`),
        apiFetch<TenantFeature[]>(`/platform/tenants/${tenant.id}/features`).catch(() => tenant.features ?? []),
      ]);

      setInspectedTenant(details);
      setInspectedTenantOnboarding(onboarding);
      setInspectedTenantFeatures(tenantFeatures);
      setReviewOnboarding(onboarding);
      setActiveTab("inspect");
    } catch (caught) {
      setNotice({
        type: "error",
        message: caught instanceof Error ? caught.message : "Could not inspect tenant.",
      });
    } finally {
      setIsInspectingTenant(false);
    }
  }

  async function onInspectedSubscriptionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!inspectedTenant) {
      setNotice({ type: "error", message: "Select a tenant before updating subscription." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const success = await runAction(
      () =>
        apiFetch(`/platform/tenants/${inspectedTenant.id}/subscription`, {
          method: "PATCH",
          body: JSON.stringify({
            planCode: stringValue(formData, "planCode"),
            planName: stringValue(formData, "planName"),
            status: stringValue(formData, "status"),
            userLimit: numberValue(formData, "userLimit"),
            employeeLimit: numberValue(formData, "employeeLimit"),
            storageLimitMb: numberValue(formData, "storageLimitMb"),
            startsAt: dateValue(formData, "startsAt"),
            endsAt: dateValue(formData, "endsAt"),
          }),
        }),
      "Tenant subscription updated.",
    );

    if (success) {
      await inspectTenant(inspectedTenant);
    }
  }

  async function toggleInspectedFeature(feature: TenantFeature) {
    if (!inspectedTenant) {
      return;
    }

    const nextEnabled = feature.status !== "ENABLED";
    const path = `/platform/tenants/${inspectedTenant.id}/features/${feature.platformFeature.code}/${nextEnabled ? "enable" : "disable"}`;

    setInspectedTenantFeatures((current) =>
      current.map((item) =>
        item.id === feature.id
          ? {
              ...item,
              status: nextEnabled ? "ENABLED" : "DISABLED",
            }
          : item,
      ),
    );

    await runAction(
      () =>
        apiFetch(path, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      `${feature.platformFeature.name} ${nextEnabled ? "enabled" : "disabled"} for ${inspectedTenant.name}.`,
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[clamp(1.25rem,1.8vw,1.7rem)] font-black text-[#10143f]">
                Tenant administration
              </h2>
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-black uppercase text-[#3820d7]">
                {canManagePlatformTenants ? "Platform workspace" : "Tenant workspace"}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[13px] font-semibold leading-5 text-[#667089]">
              Manage workspace profile, feature access, onboarding readiness, and platform provisioning from focused tabs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManagePlatformTenants ? (
              <button
                type="button"
                onClick={() => setActiveTab("provision")}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3820d7] px-4 text-[12px] font-bold text-white shadow-[0_10px_22px_rgba(56,32,215,0.18)]"
              >
                <CirclePlus size={15} aria-hidden="true" />
                New Tenant
              </button>
            ) : null}
          </div>
        </div>

        {notice ? (
          <div
            className={`mt-4 rounded-md px-4 py-3 text-[12px] font-bold ${
              notice.type === "success"
                ? "bg-[#eaf9f2] text-[#0f8f66]"
                : "bg-[#fff5f5] text-[#b42318]"
            }`}
          >
            {notice.message}
          </div>
        ) : null}
      </section>

      <TenantPulseStrip
        currentTenant={payload.currentTenant}
        tenantCount={payload.platformTenants.length || (payload.currentTenant ? 1 : 0)}
        activeTenantCount={activeTenantCount || (payload.currentTenant?.status === "ACTIVE" ? 1 : 0)}
        enabledFeatureCount={enabledFeatureCount}
        rolloutFeatureCount={rolloutFeatureCount}
      />

      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="border-b border-[#edf1f7] bg-[#fbfcff] p-3">
          <div role="tablist" aria-label="Tenant administration sections" className="grid gap-2 md:grid-cols-3 2xl:grid-cols-6">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex min-h-[58px] items-center gap-3 rounded-lg border p-2.5 text-left transition ${
                    active
                      ? "border-[#3820d7] bg-white shadow-[0_14px_30px_rgba(56,32,215,0.1)]"
                      : "border-transparent bg-transparent hover:border-[#dfe8f6] hover:bg-white"
                  }`}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? "bg-[#3820d7] text-white" : "bg-[#eef2f8] text-[#667089]"}`}>
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-[#10143f]">{tab.title}</span>
                    <span className="mt-0.5 line-clamp-1 block text-[11px] font-semibold leading-4 text-[#7a8297]">
                      {tab.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          {activeTab === "overview" ? (
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <TenantOnboardingPanel
                onboarding={reviewOnboarding}
                title={
                  reviewOnboarding
                    ? `${reviewOnboarding.tenant.name} onboarding readiness`
                    : "Tenant onboarding readiness"
                }
              />
              <FeatureMatrix
                features={features.slice(0, 6)}
                onToggle={toggleFeature}
                isPending={isPending}
                canWriteFeatures={canWriteFeatures}
              />
            </div>
          ) : null}

          {activeTab === "workspace" ? (
            <TenantProfileCard
              tenant={payload.currentTenant}
              subscription={payload.currentSubscription}
              onSettingsSubmit={onSettingsSubmit}
              onBrandingSubmit={onBrandingSubmit}
              isPending={isPending}
              canWriteSettings={canWriteSettings}
              canWriteBranding={canWriteBranding}
            />
          ) : null}

          {activeTab === "features" ? (
            <FeatureMatrix
              features={features}
              onToggle={toggleFeature}
              isPending={isPending}
              canWriteFeatures={canWriteFeatures}
            />
          ) : null}

          {activeTab === "directory" && canManagePlatformTenants ? (
            <PlatformTenantsTable
              tenants={filteredTenants}
              search={tenantSearch}
              onSearch={setTenantSearch}
              onStatus={setTenantStatus}
              onReviewOnboarding={reviewTenantOnboarding}
              onInspect={inspectTenant}
              isPending={isPending}
              isLoadingOnboarding={isLoadingOnboarding}
              isInspectingTenant={isInspectingTenant}
              canManagePlatformTenants={canManagePlatformTenants}
            />
          ) : null}

          {activeTab === "inspect" && canManagePlatformTenants ? (
            <TenantInspectionPanel
              tenant={inspectedTenant}
              features={inspectedTenantFeatures}
              onboarding={inspectedTenantOnboarding}
              isPending={isPending || isInspectingTenant}
              onSubscriptionSubmit={onInspectedSubscriptionSubmit}
              onFeatureToggle={toggleInspectedFeature}
              onOpenDirectory={() => setActiveTab("directory")}
              onOpenProvision={() => setActiveTab("provision")}
            />
          ) : null}

          {activeTab === "provision" && canManagePlatformTenants ? (
            <ProvisionTenantForm
              onSubmit={onCreateTenant}
              isPending={isPending}
              canManagePlatformTenants={canManagePlatformTenants}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function TenantPulseStrip({
  currentTenant,
  tenantCount,
  activeTenantCount,
  enabledFeatureCount,
  rolloutFeatureCount,
}: {
  currentTenant: TenantDetails | null;
  tenantCount: number;
  activeTenantCount: number;
  enabledFeatureCount: number;
  rolloutFeatureCount: number;
}) {
  const cards = [
    {
      label: "Current workspace",
      value: currentTenant?.status ?? "Platform",
      detail: currentTenant?.slug ?? "Cross-tenant console",
      icon: Building2,
      tone: "blue",
    },
    {
      label: "Enabled modules",
      value: enabledFeatureCount,
      detail: `${rolloutFeatureCount} trial or beta`,
      icon: Boxes,
      tone: "green",
    },
    {
      label: "Platform tenants",
      value: tenantCount,
      detail: `${activeTenantCount} active`,
      icon: UsersRound,
      tone: "violet",
    },
    {
      label: "Provisioning model",
      value: "Seeded",
      detail: "roles, settings, features",
      icon: ServerCog,
      tone: "amber",
    },
  ] as const;

  return (
    <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => (
        <TenantPulseCard
          key={card.label}
          label={card.label}
          value={card.value}
          detail={card.detail}
          icon={card.icon}
          tone={card.tone}
        />
      ))}
    </section>
  );
}

function TenantPulseCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "violet" | "amber";
}) {
  const toneClass = {
    blue: "bg-[#eef5ff] text-[#2f6eea]",
    green: "bg-[#eaf9f2] text-[#0f8f66]",
    violet: "bg-[#f1ebff] text-[#7c3aed]",
    amber: "bg-[#fff4db] text-[#b56a00]",
  }[tone];

  return (
    <article className="rounded-lg border border-[#dfe8f6] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-[#68748c]">{label}</p>
          <p className="mt-2 truncate text-xl font-black text-[#10143f]">{value}</p>
          <p className="mt-1 truncate text-[12px] font-semibold text-[#8b8c9a]">{detail}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${toneClass}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

function TenantProfileCard({
  tenant,
  subscription,
  onSettingsSubmit,
  onBrandingSubmit,
  isPending,
  canWriteSettings,
  canWriteBranding,
}: {
  tenant: TenantDetails | null;
  subscription: TenantSubscription | null;
  onSettingsSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBrandingSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  canWriteSettings: boolean;
  canWriteBranding: boolean;
}) {
  const settings = tenant?.settings;
  const branding = tenant?.branding;

  return (
    <section id="tenant-profile" className="rounded-lg bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase text-[#9ca0b2]">Current tenant</p>
          <h3 className="mt-2 text-xl font-black text-[#1d1b2f]">
            {tenant?.name ?? "No tenant context"}
          </h3>
          <p className="mt-1 text-[12px] font-medium text-[#8b8c9a]">
            {tenant ? `${tenant.slug}.timesync.local` : "Platform admins can provision and manage tenants below."}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black ${statusClass(tenant?.status)}`}>
          {tenant?.status ?? "PLATFORM"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricTile label="Plan" value={subscription?.planName ?? tenant?.subscription?.planName ?? "Enterprise"} />
        <MetricTile label="Users" value={String(subscription?.userLimit ?? tenant?.subscription?.userLimit ?? "Unlimited")} />
        <MetricTile label="Employees" value={String(subscription?.employeeLimit ?? tenant?.subscription?.employeeLimit ?? "Unlimited")} />
      </div>

      {tenant ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <form onSubmit={onSettingsSubmit} className="rounded-lg border border-[#eeeef4] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Globe2 size={16} className="text-[#3820d7]" aria-hidden="true" />
              <h4 className="text-sm font-black text-[#1d1b2f]">Localization</h4>
            </div>
            <fieldset disabled={!canWriteSettings || isPending} className="grid gap-3 sm:grid-cols-2">
              <Field name="defaultTimezone" label="Timezone" defaultValue={settings?.defaultTimezone ?? "UTC"} />
              <Field name="defaultLocale" label="Locale" defaultValue={settings?.defaultLocale ?? "en-US"} />
              <Field name="dateFormat" label="Date format" defaultValue={settings?.dateFormat ?? "MM/dd/yyyy"} />
              <Field name="timeFormat" label="Time format" defaultValue={settings?.timeFormat ?? "HH:mm"} />
              <Field name="employeeNumberPrefix" label="Employee prefix" defaultValue={settings?.employeeNumberPrefix ?? ""} />
              <Field
                name="fiscalYearStartMonth"
                label="Fiscal start"
                type="number"
                defaultValue={String(settings?.fiscalYearStartMonth ?? 1)}
              />
            </fieldset>
            <SubmitButton isPending={isPending} disabled={!canWriteSettings}>
              {canWriteSettings ? "Save settings" : "Read-only settings"}
            </SubmitButton>
          </form>

          <form onSubmit={onBrandingSubmit} className="rounded-lg border border-[#eeeef4] p-4">
            <div className="mb-4 flex items-center gap-2">
              <Paintbrush size={16} className="text-[#3820d7]" aria-hidden="true" />
              <h4 className="text-sm font-black text-[#1d1b2f]">Branding</h4>
            </div>
            <fieldset disabled={!canWriteBranding || isPending} className="grid gap-3 sm:grid-cols-2">
              <ColorField name="primaryColor" label="Primary" defaultValue={branding?.primaryColor ?? "#3820d7"} />
              <ColorField name="secondaryColor" label="Secondary" defaultValue={branding?.secondaryColor ?? "#19162f"} />
              <ColorField name="accentColor" label="Accent" defaultValue={branding?.accentColor ?? "#ff9900"} />
              <Field name="fontFamily" label="Font" defaultValue={branding?.fontFamily ?? "Plus Jakarta Sans"} />
            </fieldset>
            <SubmitButton isPending={isPending} disabled={!canWriteBranding}>
              {canWriteBranding ? "Save branding" : "Read-only branding"}
            </SubmitButton>
          </form>
        </div>
      ) : (
        <EmptyState title="No current tenant" body="This account is operating at platform level, so current-tenant settings are not available." />
      )}
    </section>
  );
}

function FeatureMatrix({
  features,
  onToggle,
  isPending,
  canWriteFeatures,
}: {
  features: TenantFeature[];
  onToggle: (feature: TenantFeature) => void;
  isPending: boolean;
  canWriteFeatures: boolean;
}) {
  return (
    <section id="feature-enablement" className="rounded-lg bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase text-[#9ca0b2]">Feature enablement</p>
          <h3 className="mt-2 text-xl font-black text-[#1d1b2f]">Tenant module switches</h3>
          <p className="mt-1 text-[12px] font-medium text-[#8b8c9a]">
            Dynamic modules should be enabled per tenant, never hardcoded globally.
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-[#ece9ff] text-[#3820d7]">
          <Power size={17} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {features.length > 0 ? (
          features.map((feature) => {
            const enabled = feature.status === "ENABLED";

            return (
              <button
                key={feature.id}
                type="button"
                disabled={isPending || !canWriteFeatures}
                onClick={() => onToggle(feature)}
                className="flex items-center justify-between gap-4 rounded-lg border border-[#eeeef4] p-3 text-left transition hover:border-[#cac6ff] hover:bg-[#fbfbff] disabled:opacity-70"
              >
                <span>
                  <span className="block text-[13px] font-black text-[#1d1b2f]">
                    {feature.platformFeature.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-bold text-[#8b8c9a]">
                    {feature.platformFeature.code}
                  </span>
                </span>
                <span className={`flex items-center gap-2 text-[11px] font-black ${enabled ? "text-[#0f8f66]" : "text-[#8b8c9a]"}`}>
                  {enabled ? <ToggleRight size={26} aria-hidden="true" /> : <ToggleLeft size={26} aria-hidden="true" />}
                  {feature.status}
                </span>
              </button>
            );
          })
        ) : (
          <EmptyState title="No tenant features" body="Feature rows appear after a tenant context is available." />
        )}
      </div>
    </section>
  );
}

function countByStatus(tenants: TenantDetails[]) {
  return tenants.reduce<Record<string, number>>((accumulator, tenant) => {
    accumulator[tenant.status] = (accumulator[tenant.status] ?? 0) + 1;
    return accumulator;
  }, {});
}

function PlatformTenantsTable({
  tenants,
  search,
  onSearch,
  onStatus,
  onReviewOnboarding,
  onInspect,
  isPending,
  isLoadingOnboarding,
  isInspectingTenant,
  canManagePlatformTenants,
}: {
  tenants: TenantDetails[];
  search: string;
  onSearch: (value: string) => void;
  onStatus: (tenant: TenantDetails, status: "activate" | "suspend" | "archive") => void;
  onReviewOnboarding: (tenant: TenantDetails) => void;
  onInspect: (tenant: TenantDetails) => void;
  isPending: boolean;
  isLoadingOnboarding: boolean;
  isInspectingTenant: boolean;
  canManagePlatformTenants: boolean;
}) {
  return (
    <section className="rounded-lg bg-white">
      <div className="border-b border-[#eeeef4] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-black text-[#1d1b2f]">Platform tenants</h3>
            <p className="mt-1 text-[12px] font-medium text-[#8b8c9a]">
              Create and govern tenant lifecycle from platform administration.
            </p>
          </div>
          <div className="flex h-10 min-w-[260px] items-center gap-2 rounded-md border border-[#d8d9e4] px-3">
            <Search size={14} className="text-[#8b8c9a]" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search tenants"
              className="h-full min-w-0 flex-1 bg-transparent text-[12px] font-semibold outline-none placeholder:text-[#9da1b2]"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {tenants.map((tenant) => (
          <article key={tenant.id} className="rounded-xl border border-[#e5ebf5] bg-[#fbfcff] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[#1d1b2f]">{tenant.name}</p>
                <p className="mt-1 truncate text-[11px] font-semibold text-[#8b8c9a]">{tenant.slug}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(tenant.status)}`}>
                {tenant.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-[#68748c]">
              <span className="rounded-lg bg-white p-2">Plan: {tenant.subscription?.planName ?? "Not set"}</span>
              <span className="rounded-lg bg-white p-2">Contact: {tenant.supportEmail ?? "None"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusButton
                disabled={isInspectingTenant || !canManagePlatformTenants}
                onClick={() => onInspect(tenant)}
                icon={Eye}
              >
                Inspect
              </StatusButton>
              <StatusButton
                disabled={isLoadingOnboarding || !canManagePlatformTenants}
                onClick={() => onReviewOnboarding(tenant)}
              >
                Readiness
              </StatusButton>
              <StatusButton disabled={isPending || !canManagePlatformTenants} onClick={() => onStatus(tenant, "activate")}>Activate</StatusButton>
              <StatusButton disabled={isPending || !canManagePlatformTenants} onClick={() => onStatus(tenant, "suspend")}>Suspend</StatusButton>
              <StatusButton disabled={isPending || !canManagePlatformTenants} onClick={() => onStatus(tenant, "archive")}>Archive</StatusButton>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left">
          <thead className="border-b border-[#eeeef4] text-[11px] font-black text-[#686b7c]">
            <tr>
              <th className="px-5 py-3">Tenant</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f4] text-[12px]">
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="px-5 py-4">
                  <div className="font-black text-[#1d1b2f]">{tenant.name}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-[#8b8c9a]">{tenant.supportEmail ?? tenant.industry ?? "No contact"}</div>
                </td>
                <td className="px-5 py-4 font-bold text-[#4f5262]">{tenant.slug}</td>
                <td className="px-5 py-4 font-bold text-[#4f5262]">{tenant.subscription?.planName ?? "Not set"}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(tenant.status)}`}>
                    {tenant.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusButton
                      disabled={isInspectingTenant || !canManagePlatformTenants}
                      onClick={() => onInspect(tenant)}
                      icon={Eye}
                    >
                      Inspect
                    </StatusButton>
                    <StatusButton
                      disabled={isLoadingOnboarding || !canManagePlatformTenants}
                      onClick={() => onReviewOnboarding(tenant)}
                    >
                      Readiness
                    </StatusButton>
                    <StatusButton disabled={isPending || !canManagePlatformTenants} onClick={() => onStatus(tenant, "activate")}>Activate</StatusButton>
                    <StatusButton disabled={isPending || !canManagePlatformTenants} onClick={() => onStatus(tenant, "suspend")}>Suspend</StatusButton>
                    <StatusButton disabled={isPending || !canManagePlatformTenants} onClick={() => onStatus(tenant, "archive")}>Archive</StatusButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tenants.length === 0 ? (
        <div className="px-5 py-16">
          <EmptyState title="No tenants found" body="Provision a tenant or adjust your search filters." />
        </div>
      ) : null}
    </section>
  );
}

function TenantInspectionPanel({
  tenant,
  features,
  onboarding,
  isPending,
  onSubscriptionSubmit,
  onFeatureToggle,
  onOpenDirectory,
  onOpenProvision,
}: {
  tenant: TenantDetails | null;
  features: TenantFeature[];
  onboarding: TenantOnboarding | null;
  isPending: boolean;
  onSubscriptionSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFeatureToggle: (feature: TenantFeature) => void;
  onOpenDirectory: () => void;
  onOpenProvision: () => void;
}) {
  if (!tenant) {
    return (
      <section className="grid gap-4 rounded-xl border border-dashed border-[#d8e2f1] bg-[#fbfcff] p-6 text-center">
        <EmptyState
          title="Select a tenant to inspect"
          body="Open the tenant directory, choose Inspect, and this workspace will show operating posture, subscription controls, feature access, and readiness."
        />
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onOpenDirectory}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#3820d7] px-4 text-[12px] font-black text-white"
          >
            Open tenant directory
          </button>
          <button
            type="button"
            onClick={onOpenProvision}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#d8d9e4] bg-white px-4 text-[12px] font-black text-[#10143f]"
          >
            Provision tenant
          </button>
        </div>
      </section>
    );
  }

  const summary = tenant.platformSummary;
  const subscription = tenant.subscription;
  const enabledFeatures = features.filter((feature) => feature.status === "ENABLED").length;
  const readiness = onboarding?.completionPercent ?? 0;

  const metricCards = [
    { label: "Users", value: summary ? `${summary.activeUsers}/${summary.totalUsers}` : "Not loaded", detail: "active / total", icon: UsersRound },
    { label: "Employees", value: summary ? `${summary.activeEmployees}/${summary.totalEmployees}` : "Not loaded", detail: "active / total", icon: UsersRound },
    { label: "Structure", value: summary ? `${summary.organizationNodes}` : "Not loaded", detail: `${summary?.costCenters ?? 0} cost centers`, icon: Building2 },
    { label: "Features", value: `${enabledFeatures}/${features.length}`, detail: "enabled modules", icon: Boxes },
    { label: "Positions", value: summary ? `${summary.activePositions}/${summary.positions}` : "Not loaded", detail: "active / total", icon: ServerCog },
    { label: "Risk queue", value: summary ? summary.pendingApprovals + summary.failedOutbox : 0, detail: "approvals + failed events", icon: ShieldCheck },
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[#dfe8f6] bg-[#10143f] p-5 text-white shadow-[0_22px_55px_rgba(16,20,63,0.16)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase text-white/70">
                Tenant inspection
              </span>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black ${statusClass(tenant.status)}`}>
                {tenant.status}
              </span>
            </div>
            <h3 className="mt-3 truncate text-2xl font-black">{tenant.name}</h3>
            <p className="mt-1 text-sm font-semibold text-white/65">
              {tenant.slug} · {tenant.subdomain} · {tenant.industry ?? "Industry not set"}
            </p>
          </div>
          <div className="grid min-w-[240px] gap-2 rounded-xl border border-white/10 bg-white/[0.08] p-4">
            <p className="text-[10px] font-black uppercase text-white/50">Readiness</p>
            <div className="flex items-end justify-between gap-3">
              <span className="text-3xl font-black">{readiness}%</span>
              <span className="text-[12px] font-bold text-white/65">
                {onboarding ? `${onboarding.completed}/${onboarding.total} complete` : "No checklist"}
              </span>
            </div>
            <span className="h-2 overflow-hidden rounded-full bg-white/15">
              <span className="block h-full rounded-full bg-[#3ddc97]" style={{ width: `${readiness}%` }} />
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="rounded-xl border border-[#dfe8f6] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase text-[#68748c]">{metric.label}</p>
                  <p className="mt-2 text-2xl font-black text-[#10143f]">{metric.value}</p>
                  <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">{metric.detail}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={onSubscriptionSubmit} className="rounded-xl border border-[#dfe8f6] bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase text-[#68748c]">Subscription</p>
              <h4 className="mt-2 text-xl font-black text-[#10143f]">Plan, limits, and lifecycle</h4>
            </div>
            <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-black uppercase text-[#3820d7]">
              {subscription?.status ?? "No plan"}
            </span>
          </div>
          <fieldset disabled={isPending} className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field name="planCode" label="Plan code" defaultValue={subscription?.planCode ?? "ENTERPRISE"} />
            <Field name="planName" label="Plan name" defaultValue={subscription?.planName ?? "Enterprise"} />
            <Field name="status" label="Status" defaultValue={subscription?.status ?? "ACTIVE"} />
            <Field name="userLimit" label="User limit" type="number" defaultValue={String(subscription?.userLimit ?? "")} />
            <Field name="employeeLimit" label="Employee limit" type="number" defaultValue={String(subscription?.employeeLimit ?? "")} />
            <Field name="storageLimitMb" label="Storage MB" type="number" defaultValue={String(subscription?.storageLimitMb ?? "")} />
            <Field name="startsAt" label="Starts" type="date" defaultValue={dateInputValue(subscription?.startsAt)} />
            <Field name="endsAt" label="Ends" type="date" defaultValue={dateInputValue(subscription?.endsAt)} />
          </fieldset>
          <SubmitButton isPending={isPending}>Save subscription</SubmitButton>
        </form>

        <section className="rounded-xl border border-[#dfe8f6] bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase text-[#68748c]">Feature access</p>
              <h4 className="mt-2 text-xl font-black text-[#10143f]">Tenant module catalog</h4>
              <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
                Subscription and feature switches determine what the tenant sees in the app.
              </p>
            </div>
            <span className="rounded-full bg-[#eaf9f2] px-3 py-1 text-[10px] font-black uppercase text-[#0f8f66]">
              {enabledFeatures} enabled
            </span>
          </div>
          <div className="mt-5 grid max-h-[430px] gap-2 overflow-auto pr-1">
            {features.map((feature) => {
              const enabled = feature.status === "ENABLED";

              return (
                <button
                  key={feature.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => onFeatureToggle(feature)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3 text-left transition hover:border-[#3820d7] disabled:opacity-65"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[#10143f]">{feature.platformFeature.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-bold text-[#7a8297]">{feature.platformFeature.code}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${enabled ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#f0f0f2] text-[#686b7c]"}`}>
                    {feature.status}
                  </span>
                </button>
              );
            })}
            {features.length === 0 ? (
              <EmptyState title="No feature rows" body="Feature rows appear after platform features are seeded and attached to the tenant." />
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase text-[#68748c]">Readiness checklist</p>
            <h4 className="mt-2 text-xl font-black text-[#10143f]">What platform admins need to know</h4>
          </div>
          <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[10px] font-black uppercase text-[#2f6eea]">
            {onboarding?.generatedAt ? new Date(onboarding.generatedAt).toLocaleString() : "Live"}
          </span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {(onboarding?.steps ?? []).map((step) => (
            <article key={step.code} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#10143f]">{step.title}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase text-[#7a8297]">{step.owner}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${step.complete ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#fff4db] text-[#b56a00]"}`}>
                  {step.complete ? "Complete" : "Open"}
                </span>
              </div>
            </article>
          ))}
          {!onboarding?.steps.length ? (
            <div className="lg:col-span-2">
              <EmptyState title="No readiness data" body="Inspect a tenant again to load onboarding and platform readiness signals." />
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function ProvisionTenantForm({
  onSubmit,
  isPending,
  canManagePlatformTenants,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  canManagePlatformTenants: boolean;
}) {
  return (
    <form id="provision" onSubmit={onSubmit} className="rounded-lg bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-[#ece9ff] text-[#3820d7]">
          <Building2 size={17} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-xl font-black text-[#1d1b2f]">Provision tenant</h3>
          <p className="mt-1 max-w-3xl text-[12px] font-medium text-[#8b8c9a]">
            Creates the workspace, subscription, default roles, feature switches, and emails the first tenant administrator an activation link.
          </p>
        </div>
      </div>

      <fieldset disabled={isPending || !canManagePlatformTenants} className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
          <p className="text-[11px] font-black uppercase text-[#68748c]">Tenant profile</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field name="name" label="Tenant name" required placeholder="Amazon Inc" />
            <Field name="legalName" label="Legal name" placeholder="Amazon Incorporated" />
            <Field name="slug" label="Tenant slug" required placeholder="amazon-inc" />
            <Field name="subdomain" label="Subdomain" required placeholder="amazon" />
            <Field name="industry" label="Industry" placeholder="Retail" />
            <Field name="sizeBand" label="Size" placeholder="1001-5000" />
            <Field name="supportEmail" label="Support email" type="email" placeholder="hr@amazon.local" />
            <Field name="adminEmail" label="First admin email" type="email" required placeholder="admin@amazon.local" />
          </div>
        </div>

        <div className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
          <p className="text-[11px] font-black uppercase text-[#68748c]">Starting subscription</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field name="planCode" label="Plan code" defaultValue="ENTERPRISE_TRIAL" />
            <Field name="planName" label="Plan name" defaultValue="Enterprise Trial" />
            <Field name="subscriptionStatus" label="Plan status" defaultValue="TRIAL" />
            <Field name="userLimit" label="User limit" type="number" defaultValue="50" />
            <Field name="employeeLimit" label="Employee limit" type="number" defaultValue="500" />
            <Field name="storageLimitMb" label="Storage MB" type="number" defaultValue="10240" />
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending || !canManagePlatformTenants}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#3820d7] text-[13px] font-bold text-white transition hover:bg-[#2d18bf] disabled:opacity-70"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CirclePlus size={15} aria-hidden="true" />}
        {canManagePlatformTenants ? "Create tenant" : "Platform permission required"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#4f5262]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-3 text-[12px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#a9adbd] focus:border-[#3820d7] focus:bg-white"
      />
    </label>
  );
}

function ColorField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-[#4f5262]">{label}</span>
      <span className="mt-1.5 flex h-10 items-center gap-2 rounded-md border border-[#e1e2ea] bg-[#f8f8fa] px-2">
        <input name={name} type="color" defaultValue={defaultValue} className="h-6 w-7 border-0 bg-transparent p-0" />
        <input
          name={`${name}Text`}
          value={defaultValue}
          readOnly
          className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#19162f] outline-none"
        />
      </span>
    </label>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#eeeef4] bg-[#fbfbfc] p-3">
      <p className="text-[10px] font-black uppercase text-[#9ca0b2]">{label}</p>
      <p className="mt-2 truncate text-lg font-black text-[#1d1b2f]">{value}</p>
    </div>
  );
}

function SubmitButton({
  children,
  isPending,
  disabled,
}: {
  children: string;
  isPending: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isPending || disabled}
      className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#3820d7] text-[12px] font-bold text-white transition hover:bg-[#2d18bf] disabled:opacity-70"
    >
      {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
      {children}
    </button>
  );
}

function StatusButton({
  children,
  onClick,
  disabled,
  icon: Icon,
}: {
  children: string;
  onClick: () => void;
  disabled: boolean;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#e1e2ea] px-2.5 py-1.5 text-[10px] font-black text-[#4f5262] transition hover:border-[#3820d7] hover:text-[#3820d7] disabled:opacity-60"
    >
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-[#dcdde7] bg-[#fbfbfc] px-5 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[#ece9ff] text-[#3820d7]">
        <ShieldCheck size={22} aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-black text-[#1d1b2f]">{title}</p>
      <p className="mt-1 max-w-sm text-[12px] leading-5 text-[#8b8c9a]">{body}</p>
    </div>
  );
}

function stringValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || undefined;
}

function numberValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? Number(value) : undefined;
}

function dateValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? new Date(value).toISOString() : undefined;
}

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : undefined;
}

function statusClass(status?: string) {
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
