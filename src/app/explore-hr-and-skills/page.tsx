import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { HrGuidesIndex } from "@/components/hr-guides/hr-guides-index";
import { tryServerApiJson } from "@/lib/api/server";
import type { HrArticleListResponse } from "@/lib/hr-guides/types";

export const dynamic = "force-dynamic";

export default async function ExploreHrAndSkillsPage() {
  const payload = await tryServerApiJson<HrArticleListResponse>(
    "/hr-guides?category=skills-growth&limit=12",
  );

  return (
    <>
      <Header />
      <HrGuidesIndex
        payload={payload ?? emptyPayload()}
        activeCategory="skills-growth"
        eyebrow="Explore HR and skills"
        title="Build capability journeys with evidence, skills, and employee growth signals."
        copy="A focused workspace for onboarding, document readiness, skill evidence, capability planning, recognition, and the HR operating patterns that keep employee growth measurable."
      />
      <Footer />
    </>
  );
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
