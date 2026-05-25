import { notFound } from "next/navigation";

import { HrGuideDetail } from "@/components/hr-guides/hr-guide-detail";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { tryServerApiJson } from "@/lib/api/server";
import type { HrArticleDetail } from "@/lib/hr-guides/types";

export const dynamic = "force-dynamic";

type HrGuideDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function HrGuideDetailPage({ params }: HrGuideDetailPageProps) {
  const { slug } = await params;
  const article = await tryServerApiJson<HrArticleDetail>(`/hr-guides/${slug}`);

  if (!article) {
    notFound();
  }

  return (
    <>
      <Header />
      <HrGuideDetail article={article} />
      <Footer />
    </>
  );
}
