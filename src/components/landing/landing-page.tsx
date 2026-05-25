import { CommunicationsSection } from "./communications-section";
import { EmployeeGrowthSection } from "./employee-growth-section";
import { FeatureOverviewSection } from "./feature-overview-section";
import { Footer } from "./footer";
import { Header } from "./header";
import { HrGuidesSection } from "./hr-guides-section";
import { HeroSection } from "./hero-section";
import { OperationsSection } from "./operations-section";
import { PlatformSection } from "./platform-section";
import { QuoteSection } from "./quote-section";
import { PayrollSection } from "./payroll-section";
import { SchedulingSection } from "./scheduling-section";
import { StatsBand } from "./stats-band";
import { tryServerApiJson } from "@/lib/api/server";
import type { HrArticleListResponse } from "@/lib/hr-guides/types";

export async function LandingPage() {
  const hrGuides = await tryServerApiJson<HrArticleListResponse>("/hr-guides?featured=true&limit=3");

  return (
    <div className="min-h-screen bg-white text-[#101735]">
      <Header />
      <main className="relative overflow-hidden bg-white">
        <HeroSection />
        <StatsBand />
        <PlatformSection />
        <FeatureOverviewSection />
        <PayrollSection />
        <SchedulingSection />
        <OperationsSection />
        <CommunicationsSection />
        <EmployeeGrowthSection />
        <HrGuidesSection articles={hrGuides?.data ?? []} />
        <QuoteSection />
      </main>
      <Footer />
    </div>
  );
}
