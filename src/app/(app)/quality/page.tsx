import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { DataQualityCommandCenter } from "@/components/quality/data-quality-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { requireServerPermissions } from "@/lib/auth/session";
import type { DataQualityDashboard } from "@/lib/quality/types";

export const dynamic = "force-dynamic";

export default async function QualityPage() {
  const access = await requireServerPermissions(["analytics.read"], "/quality");
  const profile = accessProfileForUser(access.session.user);

  if (!profile.canUseQualityCenter) {
    return (
      <AccessDeniedPanel
        title="Quality center is not available for this role."
        body="Compliance and data-quality remediation belongs to HR, tenant admins, auditors, and platform operators."
      />
    );
  }

  const quality = access.authorized
    ? await tryServerApiJson<DataQualityDashboard>("/dashboard/data-quality")
    : null;

  return <DataQualityCommandCenter quality={quality} />;
}
