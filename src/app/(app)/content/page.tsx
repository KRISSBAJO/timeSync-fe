import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { ContentAdminCenter } from "@/components/content/content-admin-center";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerPermissions } from "@/lib/auth/session";
import type { HrArticleListResponse } from "@/lib/hr-guides/types";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const access = await requireServerPermissions(["content.write"], "/content");
  const profile = accessProfileForUser(access.session.user);

  if (!profile.canUseContentAdmin) {
    return (
      <AccessDeniedPanel
        title="Content administration is not available for this role."
        body="Employees can read published HR Guides from the public guide library. Publishing, moderation, and article operations stay with HR and admin roles."
      />
    );
  }

  const payload = access.authorized
    ? await tryServerApiJson<HrArticleListResponse>("/platform/hr-guides?limit=50")
    : null;

  return (
    <ContentAdminCenter
      payload={payload ?? emptyPayload()}
      canWrite={hasAnyPermission(access.session.user, ["content.write"])}
      canPublish={hasAnyPermission(access.session.user, ["content.publish"])}
    />
  );
}

function emptyPayload(): HrArticleListResponse {
  return {
    data: [],
    categories: [],
    page: {
      limit: 50,
      offset: 0,
      total: 0,
    },
  };
}
