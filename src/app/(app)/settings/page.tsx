import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { WorkspaceSettingsCenter } from "@/components/settings/workspace-settings-center";
import { tryServerApiJson } from "@/lib/api/server";
import type { BrowserSession } from "@/lib/api/types";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type { TenantDetails, TenantFeature, TenantSubscription } from "@/lib/tenants/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireServerSession("/settings");
  const profile = accessProfileForUser(session.user);

  if (!profile.isPlatform && !profile.isTenantAdmin) {
    return (
      <AccessDeniedPanel
        title="Workspace settings are not available for this role."
        body="Employees and managers can manage account sessions from the profile menu. Tenant policy, localization, and branding stay with tenant admins."
      />
    );
  }

  const canReadCurrentTenant = hasAnyPermission(session.user, ["tenants.settings.read"]);
  const canReadFeatures = hasAnyPermission(session.user, ["tenants.features.read"]);
  const canReadSubscription = hasAnyPermission(session.user, ["tenants.subscription.read"]);
  const canWriteSettings = hasAnyPermission(session.user, ["tenants.settings.write"]);
  const canWriteBranding = hasAnyPermission(session.user, ["tenants.branding.write"]);

  const [tenant, features, subscription, sessions] = await Promise.all([
    canReadCurrentTenant ? tryServerApiJson<TenantDetails>("/tenants/current") : Promise.resolve(null),
    canReadFeatures ? tryServerApiJson<TenantFeature[]>("/tenants/current/features") : Promise.resolve(null),
    canReadSubscription ? tryServerApiJson<TenantSubscription>("/tenants/current/subscription") : Promise.resolve(null),
    tryServerApiJson<BrowserSession[]>("/auth/sessions"),
  ]);

  return (
    <WorkspaceSettingsCenter
      session={session}
      tenant={tenant}
      features={features ?? tenant?.features ?? []}
      subscription={subscription ?? tenant?.subscription ?? null}
      sessions={sessions ?? []}
      canWriteSettings={canWriteSettings}
      canWriteBranding={canWriteBranding}
    />
  );
}
