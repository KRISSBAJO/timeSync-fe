import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { RecruitmentCommandCenter } from "@/components/recruitment/recruitment-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type {
  PaginatedRecruitment,
  RecruitmentApplication,
  RecruitmentApprovalRule,
  RecruitmentCandidate,
  RecruitmentInterview,
  RecruitmentOffer,
  RecruitmentPageFilters,
  RecruitmentReports,
  RecruitmentRequisition,
  RecruitmentSummary,
} from "@/lib/recruitment/types";
import type { ScheduleEmployee } from "@/lib/scheduling/types";

export const dynamic = "force-dynamic";

type RecruitmentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const RECRUITMENT_ACCESS = [
  "recruitment.read",
  "recruitment.write",
  "recruitment.approve",
  "recruitment.interview",
  "recruitment.offer.write",
  "recruitment.reports.read",
] as const;

export default async function RecruitmentPage({ searchParams }: RecruitmentPageProps) {
  const params = await searchParams;
  const session = await requireServerSession("/recruitment");
  const authorized = hasAnyPermission(session.user, RECRUITMENT_ACCESS);

  if (!authorized) {
    return (
      <AccessDeniedPanel
        title="Recruitment is not available for this role."
        body="Recruitment requisitions, candidates, interviews, and offers are available to HR, managers, and tenant administrators with recruitment access."
      />
    );
  }

  const filters = readFilters(params);
  const query = buildRecruitmentQuery(filters);
  const canManage = hasAnyPermission(session.user, ["recruitment.write", "recruitment.approve", "recruitment.offer.write"]);

  const [summary, requisitions, candidates, applications, interviews, offers, approvalRules, reports, employees] = await Promise.all([
    tryServerApiJson<RecruitmentSummary>("/recruitment/summary"),
    tryServerApiJson<PaginatedRecruitment<RecruitmentRequisition>>(`/recruitment/requisitions?${query}`),
    tryServerApiJson<PaginatedRecruitment<RecruitmentCandidate>>(`/recruitment/candidates?${query}`),
    tryServerApiJson<PaginatedRecruitment<RecruitmentApplication>>(`/recruitment/applications?${query}`),
    tryServerApiJson<PaginatedRecruitment<RecruitmentInterview>>(`/recruitment/interviews?${query}`),
    tryServerApiJson<PaginatedRecruitment<RecruitmentOffer>>(`/recruitment/offers?${query}`),
    canManage ? tryServerApiJson<RecruitmentApprovalRule[]>("/recruitment/approval-rules") : Promise.resolve(null),
    hasAnyPermission(session.user, ["recruitment.reports.read"]) ? tryServerApiJson<RecruitmentReports>(`/recruitment/reports?${query}`) : Promise.resolve(null),
    canManage ? tryServerApiJson<ScheduleEmployee[]>("/scheduling/employees?limit=100") : Promise.resolve(null),
  ]);

  if (!summary && !requisitions) {
    return (
      <AccessDeniedPanel
        title="Recruitment is not enabled for this workspace."
        body="When Recruitment is enabled for this tenant, requisitions, candidates, interviews, and offers will appear here."
      />
    );
  }

  return (
    <RecruitmentCommandCenter
      session={session}
      summary={summary}
      requisitions={requisitions}
      candidates={candidates}
      applications={applications}
      interviews={interviews}
      offers={offers}
      approvalRules={approvalRules ?? []}
      reports={reports}
      employees={employees ?? []}
      filters={filters}
      initialTab={normalizeTab(filters.tab)}
    />
  );
}

function readFilters(params: Record<string, string | string[] | undefined>): RecruitmentPageFilters {
  return {
    tab: readParam(params.tab),
    search: readParam(params.search),
    status: readParam(params.status),
    requisitionId: readParam(params.requisitionId),
    candidateId: readParam(params.candidateId),
    applicationId: readParam(params.applicationId),
    from: readParam(params.from),
    to: readParam(params.to),
  };
}

function buildRecruitmentQuery(filters: RecruitmentPageFilters) {
  const params = new URLSearchParams({ limit: "50" });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.requisitionId) params.set("requisitionId", filters.requisitionId);
  if (filters.candidateId) params.set("candidateId", filters.candidateId);
  if (filters.applicationId) params.set("applicationId", filters.applicationId);
  if (filters.from) params.set("from", startOfDayIso(filters.from));
  if (filters.to) params.set("to", endOfDayIso(filters.to));
  return params.toString();
}

function normalizeTab(tab?: string): "overview" | "requisitions" | "candidates" | "pipeline" | "interviews" | "offers" | "reports" | "settings" {
  if (
    tab === "requisitions" ||
    tab === "candidates" ||
    tab === "pipeline" ||
    tab === "interviews" ||
    tab === "offers" ||
    tab === "reports" ||
    tab === "settings"
  ) {
    return tab;
  }
  return "overview";
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function startOfDayIso(value: string) {
  return new Date(`${value}T00:00:00.000`).toISOString();
}

function endOfDayIso(value: string) {
  return new Date(`${value}T23:59:59.999`).toISOString();
}
