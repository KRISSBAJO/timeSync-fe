import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { HrGuidesIndex } from "@/components/hr-guides/hr-guides-index";
import { tryServerApiJson } from "@/lib/api/server";
import type { HrArticleListResponse } from "@/lib/hr-guides/types";

export const dynamic = "force-dynamic";

type HrGuidesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HrGuidesPage({ searchParams }: HrGuidesPageProps) {
  const params = await searchParams;
  const category = readParam(params.category);
  const search = readParam(params.search);
  const apiQuery = new URLSearchParams({ limit: "12" });

  if (category) apiQuery.set("category", category);
  if (search) apiQuery.set("search", search);

  const payload = await tryServerApiJson<HrArticleListResponse>(`/hr-guides?${apiQuery}`);

  return (
    <>
      <Header />
      <HrGuidesIndex payload={payload ?? emptyPayload()} activeCategory={category} />
      <Footer />
    </>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function emptyPayload(): HrArticleListResponse {
  return {
    data: [],
    categories: [],
    page: {
      limit: 12,
      offset: 0,
      total: 0,
    },
  };
}
