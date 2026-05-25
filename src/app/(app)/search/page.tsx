import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { SearchCommandCenter } from "@/components/search/search-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { requireServerPermissions } from "@/lib/auth/session";
import type { GlobalSearchResults } from "@/lib/search/types";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = readParam(params.q);
  const type = readParam(params.types);
  const access = await requireServerPermissions(["dashboard.read"], "/search");
  const profile = accessProfileForUser(access.session.user);

  if (!profile.canUseTenantCommandCenter && !profile.isManager && !profile.isPlatform) {
    return (
      <AccessDeniedPanel
        title="Global search is not available for this role."
        body="Employee accounts use personal self-service surfaces. Global employee, role, and document search stays scoped to operational roles."
      />
    );
  }

  const apiQuery = new URLSearchParams({ limit: "8" });

  if (query) apiQuery.set("q", query);
  if (type) apiQuery.set("types", type);

  const results = access.authorized
    ? await tryServerApiJson<GlobalSearchResults>(`/search?${apiQuery}`)
    : null;

  return <SearchCommandCenter results={results} query={query} type={type} />;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
