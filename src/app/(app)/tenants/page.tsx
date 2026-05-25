import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { TenantAdminDashboard } from "@/components/tenants/tenant-admin-dashboard";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type {
  PaginatedTenants,
  TenantAdminPayload,
  TenantDetails,
  TenantFeature,
  TenantOnboarding,
  TenantSubscription,
} from "@/lib/tenants/types";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const session = await requireServerSession("/tenants");
  const profile = accessProfileForUser(session.user);

  if (!profile.isPlatform && !profile.isTenantAdmin) {
    return (
      <AccessDeniedPanel
        title="Tenant administration is not available for this role."
        body="Tenant settings, feature flags, subscription, branding, and provisioning controls stay with tenant admins and platform operators."
      />
    );
  }

  const canReadCurrentTenant = hasAnyPermission(session.user, ["tenants.settings.read"]);
  const canReadFeatures = hasAnyPermission(session.user, ["tenants.features.read"]);
  const canReadSubscription = hasAnyPermission(session.user, ["tenants.subscription.read"]);
  const canManagePlatformTenants = hasAnyPermission(session.user, ["platform.tenants.manage"]);
  const canWriteSettings = hasAnyPermission(session.user, ["tenants.settings.write"]);
  const canWriteBranding = hasAnyPermission(session.user, ["tenants.branding.write"]);
  const canWriteFeatures = hasAnyPermission(session.user, ["tenants.features.write"]);

  const [currentTenant, currentFeatures, currentSubscription, platformTenants, currentOnboarding] = await Promise.all([
    canReadCurrentTenant ? tryServerApiJson<TenantDetails>("/tenants/current") : Promise.resolve(null),
    canReadFeatures ? tryServerApiJson<TenantFeature[]>("/tenants/current/features") : Promise.resolve(null),
    canReadSubscription ? tryServerApiJson<TenantSubscription>("/tenants/current/subscription") : Promise.resolve(null),
    canManagePlatformTenants
      ? tryServerApiJson<PaginatedTenants>("/platform/tenants?limit=50")
      : Promise.resolve(null),
    canReadCurrentTenant
      ? tryServerApiJson<TenantOnboarding>("/tenants/current/onboarding")
      : Promise.resolve(null),
  ]);

  const payload: TenantAdminPayload = {
    currentTenant,
    currentFeatures: currentFeatures ?? currentTenant?.features ?? [],
    currentSubscription,
    platformTenants: platformTenants?.data ?? [],
    currentOnboarding,
    capabilities: {
      canWriteSettings,
      canWriteBranding,
      canWriteFeatures,
      canManagePlatformTenants,
    },
  };

  return <TenantAdminDashboard payload={payload} />;
}
