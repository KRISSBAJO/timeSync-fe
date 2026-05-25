import { EmployeeSelfServiceWorkspace, type ProfileSectionKey } from "@/components/profile/employee-self-service-workspace";
import { tryServerApiJson } from "@/lib/api/server";
import { requireServerPermissions } from "@/lib/auth/session";
import type { MyEmploymentResponse } from "@/lib/workforce/types";

export const dynamic = "force-dynamic";

const profileSections = new Set<ProfileSectionKey>(["overview", "personal", "records", "terms", "tasks", "documents", "access"]);

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ section?: string }>;
}) {
  const access = await requireServerPermissions(["dashboard.read"], "/profile");
  const params = await searchParams;
  const requestedSection = params?.section;
  const initialSection = requestedSection && profileSections.has(requestedSection as ProfileSectionKey)
    ? requestedSection as ProfileSectionKey
    : "overview";
  const employment = access.authorized
    ? await tryServerApiJson<MyEmploymentResponse>("/employees/me")
    : null;

  return <EmployeeSelfServiceWorkspace session={access.session} employment={employment} initialSection={initialSection} />;
}
