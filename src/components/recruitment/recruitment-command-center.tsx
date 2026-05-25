"use client";

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  GitPullRequestArrow,
  PanelTopOpen,
  PlusCircle,
  Search,
  Settings2,
  UserRoundSearch,
  UsersRound,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/client";
import type { AuthSession } from "@/lib/api/types";
import { hasAnyPermission } from "@/lib/auth/permissions";
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

type RecruitmentTab = "overview" | "requisitions" | "candidates" | "pipeline" | "interviews" | "offers" | "reports" | "settings";

type RecruitmentCommandCenterProps = {
  session: AuthSession;
  summary: RecruitmentSummary | null;
  requisitions: PaginatedRecruitment<RecruitmentRequisition> | null;
  candidates: PaginatedRecruitment<RecruitmentCandidate> | null;
  applications: PaginatedRecruitment<RecruitmentApplication> | null;
  interviews: PaginatedRecruitment<RecruitmentInterview> | null;
  offers: PaginatedRecruitment<RecruitmentOffer> | null;
  approvalRules: RecruitmentApprovalRule[];
  reports: RecruitmentReports | null;
  employees: ScheduleEmployee[];
  filters: RecruitmentPageFilters;
  initialTab: RecruitmentTab;
};

type ModalState =
  | { type: "requisition" }
  | { type: "candidate" }
  | { type: "application" }
  | { type: "interview" }
  | { type: "offer" }
  | { type: "decision"; title: string; endpoint: string; success: string; tone: "approve" | "reject" | "submit" }
  | { type: "detail"; title: string; body: ReactNode }
  | null;

const tabs: Array<{
  key: RecruitmentTab;
  label: string;
  description: string;
  icon: LucideIcon;
  permissions: string[];
}> = [
  { key: "overview", label: "Overview", description: "Hiring command", icon: BriefcaseBusiness, permissions: ["recruitment.read"] },
  { key: "requisitions", label: "Requisitions", description: "Hiring demand", icon: GitPullRequestArrow, permissions: ["recruitment.read"] },
  { key: "candidates", label: "Candidates", description: "Talent records", icon: UserRoundSearch, permissions: ["recruitment.read"] },
  { key: "pipeline", label: "Pipeline", description: "Stage movement", icon: PanelTopOpen, permissions: ["recruitment.read"] },
  { key: "interviews", label: "Interviews", description: "Panels and feedback", icon: CalendarClock, permissions: ["recruitment.read"] },
  { key: "offers", label: "Offers", description: "Comp approvals", icon: BadgeCheck, permissions: ["recruitment.read"] },
  { key: "reports", label: "Reports", description: "Funnel analytics", icon: BarChart3, permissions: ["recruitment.reports.read"] },
  { key: "settings", label: "Settings", description: "Workflow adoption", icon: Settings2, permissions: ["recruitment.write"] },
];

export function RecruitmentCommandCenter({
  session,
  summary,
  requisitions,
  candidates,
  applications,
  interviews,
  offers,
  approvalRules,
  reports,
  employees,
  filters,
  initialTab,
}: RecruitmentCommandCenterProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RecruitmentTab>(initialTab);
  const [modal, setModal] = useState<ModalState>(null);
  const [isPending, startTransition] = useTransition();

  const permissions = summary?.permissions ?? {
    readRecruitment: hasAnyPermission(session.user, ["recruitment.read"]),
    manageRecruitment: hasAnyPermission(session.user, ["recruitment.write"]),
    approveRecruitment: hasAnyPermission(session.user, ["recruitment.approve"]),
    submitInterviewFeedback: hasAnyPermission(session.user, ["recruitment.interview"]),
    manageOffers: hasAnyPermission(session.user, ["recruitment.offer.write"]),
    readReports: hasAnyPermission(session.user, ["recruitment.reports.read"]),
  };
  const visibleTabs = useMemo(() => tabs.filter((tab) => hasAnyPermission(session.user, tab.permissions)), [session.user]);
  const currentTab = visibleTabs.some((tab) => tab.key === activeTab) ? activeTab : visibleTabs[0]?.key ?? "overview";
  const requisitionRows = requisitions?.data ?? summary?.requisitions ?? [];
  const candidateRows = candidates?.data ?? [];
  const applicationRows = applications?.data ?? [];
  const interviewRows = interviews?.data ?? [];
  const offerRows = offers?.data ?? [];
  const openRequisitionRows = requisitionRows.filter((row) => row.status === "OPEN" || row.status === "APPROVED");

  function refresh() {
    startTransition(() => router.refresh());
  }

  function changeTab(tab: RecruitmentTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/recruitment?${params.toString()}`, { scroll: false });
  }

  async function postAction(endpoint: string, body: Record<string, unknown>, success: string) {
    try {
      await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success(success);
      setModal(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recruitment action failed.");
    }
  }

  async function handleCreateRequisition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await postAction(
      "/recruitment/requisitions",
      cleanPayload({
        code: form.get("code"),
        title: form.get("title"),
        departmentName: form.get("departmentName"),
        locationName: form.get("locationName"),
        headcount: numberValue(form.get("headcount")),
        employmentType: form.get("employmentType"),
        workMode: form.get("workMode"),
        priority: numberValue(form.get("priority")),
        hiringManagerId: form.get("hiringManagerId"),
        recruiterId: form.get("recruiterId"),
        targetStartDate: dateValue(form.get("targetStartDate")),
        salaryMinCents: currencyToCents(form.get("salaryMin")),
        salaryMaxCents: currencyToCents(form.get("salaryMax")),
        description: form.get("description"),
        requirements: form.get("requirements"),
      }),
      "Requisition created.",
    );
  }

  async function handleCreateCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await postAction(
      "/recruitment/candidates",
      cleanPayload({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        phone: form.get("phone"),
        source: form.get("source"),
        currentEmployer: form.get("currentEmployer"),
        currentTitle: form.get("currentTitle"),
        locationName: form.get("locationName"),
        tags: String(form.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
      "Candidate created.",
    );
  }

  async function handleCreateApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await postAction(
      "/recruitment/applications",
      cleanPayload({
        candidateId: form.get("candidateId"),
        requisitionId: form.get("requisitionId"),
        source: form.get("source"),
      }),
      "Application added to pipeline.",
    );
  }

  async function handleScheduleInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await postAction(
      "/recruitment/interviews",
      cleanPayload({
        applicationId: form.get("applicationId"),
        scheduledStartAt: dateTimeValue(form.get("scheduledStartAt")),
        scheduledEndAt: dateTimeValue(form.get("scheduledEndAt")),
        timezone: form.get("timezone"),
        locationName: form.get("locationName"),
        meetingUrl: form.get("meetingUrl"),
        notes: form.get("notes"),
      }),
      "Interview scheduled.",
    );
  }

  async function handleCreateOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await postAction(
      "/recruitment/offers",
      cleanPayload({
        applicationId: form.get("applicationId"),
        basePayCents: currencyToCents(form.get("basePay")),
        startDate: dateValue(form.get("startDate")),
        expiresAt: dateValue(form.get("expiresAt")),
        decisionNote: form.get("decisionNote"),
      }),
      "Offer drafted.",
    );
  }

  async function handleDecision(event: FormEvent<HTMLFormElement>, decision: Extract<ModalState, { type: "decision" }>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await postAction(decision.endpoint, { comment: String(form.get("comment") ?? "") }, decision.success);
  }

  function quickAction(endpoint: string, success: string) {
    void postAction(endpoint, {}, success);
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_18px_55px_rgba(18,31,67,0.07)] backdrop-blur-xl">
        <div className="relative grid gap-4 p-4 xl:grid-cols-[1fr_320px]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(246,251,255,0.88)),radial-gradient(circle_at_5%_10%,rgba(14,165,233,0.10),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(34,197,94,0.12),transparent_30%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Pill icon={BriefcaseBusiness} label="Recruitment command center" />
              <Pill icon={ClipboardCheck} label="Workflow-backed approvals" />
            </div>
            <h1 className="mt-3 max-w-4xl text-2xl font-black leading-tight text-[#11143a] md:text-3xl">
              Govern hiring demand, candidate movement, interviews, and offer approvals in one place.
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#65708a]">
              Requisitions adopt approval templates, candidate applications move through structured pipeline stages, and offer packages keep their audit trail.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
              <MiniMetric label="Open reqs" value={summary?.metrics.openRequisitions ?? 0} icon={BriefcaseBusiness} tone="blue" />
              <MiniMetric label="Pending" value={summary?.metrics.pendingRequisitionApprovals ?? 0} icon={ClipboardCheck} tone="amber" />
              <MiniMetric label="Candidates" value={summary?.metrics.activeCandidates ?? candidateRows.length} icon={UsersRound} tone="green" />
              <MiniMetric label="Pipeline" value={summary?.metrics.activeApplications ?? applicationRows.length} icon={PanelTopOpen} tone="violet" />
              <MiniMetric label="Today" value={summary?.metrics.interviewsToday ?? 0} icon={CalendarClock} tone="rose" />
              <MiniMetric label="Offers" value={summary?.metrics.pendingOffers ?? offerRows.length} icon={BadgeCheck} tone="slate" />
            </div>
          </div>
          <aside className="relative rounded-2xl border border-[#dfe8f6] bg-[#11143a] p-4 text-white shadow-[0_18px_42px_rgba(17,20,58,0.18)]">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/55">Active workflow</p>
            <h2 className="mt-2 text-xl font-black leading-tight">Requisition to offer</h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/60">
              Hiring requests and offers use adopted workflow templates before they become operational commitments.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <DarkStat label="Rules" value={approvalRules.length} />
              <DarkStat label="Req" value={summary?.metrics.openRequisitions ?? 0} />
              <DarkStat label="Offer" value={summary?.metrics.pendingOffers ?? 0} />
            </div>
          </aside>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_18px_45px_rgba(18,31,67,0.05)] backdrop-blur-xl">
        <div role="tablist" aria-label="Recruitment sections" className="flex gap-2 overflow-x-auto border-b border-[#edf1f7] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeTab(tab.key)}
                className={`flex min-w-[178px] shrink-0 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                  active ? "border-[#4b22e8] bg-white shadow-[0_16px_34px_rgba(75,34,232,0.14)]" : "border-transparent bg-[#f7f9fd] hover:border-[#dfe8f6] hover:bg-white"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-[#4b22e8] text-white" : "bg-white text-[#68748c]"}`}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[#11143a]">{tab.label}</span>
                  <span className="block truncate text-xs font-semibold text-[#74809a]">{tab.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <form action="/recruitment" className="grid gap-3 border-b border-[#edf1f7] bg-white/70 p-4 lg:grid-cols-[1fr_180px_180px_auto]">
          <input type="hidden" name="tab" value={currentTab} />
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a94a8]" size={16} />
              <input name="search" className="form-field pl-9" defaultValue={filters.search ?? ""} placeholder="Candidate, requisition, source" />
            </div>
          </Field>
          <Field label="From">
            <input type="date" name="from" className="form-field" defaultValue={filters.from ?? ""} />
          </Field>
          <Field label="To">
            <input type="date" name="to" className="form-field" defaultValue={filters.to ?? ""} />
          </Field>
          <button type="submit" className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3820d7] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.24)]">
            <Filter size={16} />
            Apply
          </button>
        </form>

        <div className="space-y-5 p-4">
          {currentTab === "overview" ? (
            <>
              <ActionStrip
                permissions={permissions}
                onCreateRequisition={() => setModal({ type: "requisition" })}
                onCreateCandidate={() => setModal({ type: "candidate" })}
                onCreateApplication={() => setModal({ type: "application" })}
                onScheduleInterview={() => setModal({ type: "interview" })}
                onCreateOffer={() => setModal({ type: "offer" })}
              />
              <RequisitionTable rows={requisitionRows} permissions={permissions} setModal={setModal} quickAction={quickAction} />
              <PipelineTable rows={applicationRows.slice(0, 8)} setModal={setModal} />
            </>
          ) : null}

          {currentTab === "requisitions" ? (
            <RequisitionTable rows={requisitionRows} permissions={permissions} setModal={setModal} quickAction={quickAction} />
          ) : null}
          {currentTab === "candidates" ? <CandidateTable rows={candidateRows} setModal={setModal} /> : null}
          {currentTab === "pipeline" ? <PipelineTable rows={applicationRows} setModal={setModal} /> : null}
          {currentTab === "interviews" ? <InterviewTable rows={interviewRows} setModal={setModal} /> : null}
          {currentTab === "offers" ? <OfferTable rows={offerRows} permissions={permissions} setModal={setModal} /> : null}
          {currentTab === "reports" ? <ReportsView reports={reports} /> : null}
          {currentTab === "settings" ? <ApprovalRulesTable rows={approvalRules} /> : null}
        </div>
      </section>

      {modal
        ? createPortal(
            <ModalFrame onClose={() => setModal(null)}>
              {modal.type === "requisition" ? <RequisitionForm employees={employees} onSubmit={handleCreateRequisition} pending={isPending} /> : null}
              {modal.type === "candidate" ? <CandidateForm onSubmit={handleCreateCandidate} pending={isPending} /> : null}
              {modal.type === "application" ? <ApplicationForm candidates={candidateRows} requisitions={openRequisitionRows} onSubmit={handleCreateApplication} pending={isPending} /> : null}
              {modal.type === "interview" ? <InterviewForm applications={applicationRows} onSubmit={handleScheduleInterview} pending={isPending} /> : null}
              {modal.type === "offer" ? <OfferForm applications={applicationRows.filter((row) => row.status === "OFFER" || row.status === "INTERVIEW")} onSubmit={handleCreateOffer} pending={isPending} /> : null}
              {modal.type === "decision" ? <DecisionForm decision={modal} onSubmit={(event) => handleDecision(event, modal)} pending={isPending} /> : null}
              {modal.type === "detail" ? <DetailPanel title={modal.title}>{modal.body}</DetailPanel> : null}
            </ModalFrame>,
            document.body,
          )
        : null}
    </div>
  );
}

function ActionStrip({
  permissions,
  onCreateRequisition,
  onCreateCandidate,
  onCreateApplication,
  onScheduleInterview,
  onCreateOffer,
}: {
  permissions: RecruitmentSummary["permissions"];
  onCreateRequisition: () => void;
  onCreateCandidate: () => void;
  onCreateApplication: () => void;
  onScheduleInterview: () => void;
  onCreateOffer: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-3">
      {permissions.manageRecruitment ? <ActionButton icon={PlusCircle} label="Requisition" onClick={onCreateRequisition} /> : null}
      {permissions.manageRecruitment ? <ActionButton icon={UserRoundSearch} label="Candidate" onClick={onCreateCandidate} /> : null}
      {permissions.manageRecruitment ? <ActionButton icon={PanelTopOpen} label="Application" onClick={onCreateApplication} /> : null}
      {permissions.manageRecruitment ? <ActionButton icon={CalendarClock} label="Interview" onClick={onScheduleInterview} /> : null}
      {permissions.manageOffers ? <ActionButton icon={BadgeCheck} label="Offer" onClick={onCreateOffer} /> : null}
    </div>
  );
}

function RequisitionTable({
  rows,
  permissions,
  setModal,
  quickAction,
}: {
  rows: RecruitmentRequisition[];
  permissions: RecruitmentSummary["permissions"];
  setModal: (modal: ModalState) => void;
  quickAction: (endpoint: string, success: string) => void;
}) {
  const columns: Array<DataTableColumn<RecruitmentRequisition>> = [
    {
      key: "req",
      header: "Requisition",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-black">{row.title}</p>
          <p className="mt-1 truncate text-xs font-bold text-[#74809a]">{row.code}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "headcount", header: "Headcount", render: (row) => <span className="font-black">{row.headcount}</span> },
    { key: "mode", header: "Mode", render: (row) => <StatusBadge status={humanize(row.workMode)} /> },
    { key: "manager", header: "Hiring manager", render: (row) => employeeLabel(row.hiringManager) },
    { key: "apps", header: "Applications", render: (row) => row._count?.applications ?? 0 },
    { key: "workflow", header: "Workflow", render: (row) => <WorkflowSteps approval={row.approvalRequest} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {permissions.manageRecruitment && (row.status === "DRAFT" || row.status === "REJECTED") ? (
            <TinyButton label="Submit" onClick={() => setModal({ type: "decision", title: `Submit ${row.code}`, endpoint: `/recruitment/requisitions/${row.id}/submit`, success: "Requisition submitted.", tone: "submit" })} />
          ) : null}
          {permissions.approveRecruitment && row.status === "SUBMITTED" ? (
            <>
              <TinyButton label="Approve" tone="green" onClick={() => setModal({ type: "decision", title: `Approve ${row.code}`, endpoint: `/recruitment/requisitions/${row.id}/approve`, success: "Requisition approved.", tone: "approve" })} />
              <TinyButton label="Reject" tone="red" onClick={() => setModal({ type: "decision", title: `Reject ${row.code}`, endpoint: `/recruitment/requisitions/${row.id}/reject`, success: "Requisition rejected.", tone: "reject" })} />
            </>
          ) : null}
          {permissions.manageRecruitment && row.status === "APPROVED" ? <TinyButton label="Open" onClick={() => quickAction(`/recruitment/requisitions/${row.id}/open`, "Requisition opened.")} /> : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      title="Requisitions"
      eyebrow="Hiring demand"
      description="Approved requisitions can be opened for candidates; submitted requisitions stay attached to workflow history."
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={(row) => setModal({ type: "detail", title: row.title, body: <RequisitionDetail row={row} /> })}
      minWidth="1120px"
      emptyTitle="No requisitions"
      emptyBody="Create a requisition to start a governed hiring workflow."
    />
  );
}

function CandidateTable({ rows, setModal }: { rows: RecruitmentCandidate[]; setModal: (modal: ModalState) => void }) {
  const columns: Array<DataTableColumn<RecruitmentCandidate>> = [
    { key: "name", header: "Candidate", render: (row) => <strong>{candidateName(row)}</strong> },
    { key: "email", header: "Email", render: (row) => row.email },
    { key: "source", header: "Source", render: (row) => row.source ?? "Unspecified" },
    { key: "title", header: "Current title", render: (row) => row.currentTitle ?? "Not captured" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "tags", header: "Tags", render: (row) => <TagList tags={row.tags} /> },
  ];
  return (
    <DataTable
      title="Candidates"
      eyebrow="Talent records"
      description="Candidate records can be attached to open requisitions and moved through pipeline stages."
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={(row) => setModal({ type: "detail", title: candidateName(row), body: <CandidateDetail row={row} /> })}
      minWidth="920px"
      emptyTitle="No candidates"
      emptyBody="Candidates created by HR or imported from sources will appear here."
    />
  );
}

function PipelineTable({ rows, setModal }: { rows: RecruitmentApplication[]; setModal: (modal: ModalState) => void }) {
  const columns: Array<DataTableColumn<RecruitmentApplication>> = [
    { key: "candidate", header: "Candidate", render: (row) => <strong>{candidateName(row.candidate)}</strong> },
    { key: "req", header: "Requisition", render: (row) => row.requisition?.title ?? "Requisition" },
    { key: "stage", header: "Stage", render: (row) => <StatusBadge status={row.currentStage?.name ?? row.status} /> },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "score", header: "Score", render: (row) => row.score ?? "-" },
    { key: "applied", header: "Applied", render: (row) => formatDate(row.appliedAt) },
    { key: "activity", header: "Last activity", render: (row) => formatDate(row.lastActivityAt) },
  ];
  return (
    <DataTable
      title="Pipeline"
      eyebrow="Applications"
      description="Applications show candidate stage, score, interview history, and offer movement."
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={(row) => setModal({ type: "detail", title: candidateName(row.candidate), body: <ApplicationDetail row={row} /> })}
      minWidth="980px"
      emptyTitle="No applications"
      emptyBody="Attach candidates to open requisitions to populate the pipeline."
    />
  );
}

function InterviewTable({ rows, setModal }: { rows: RecruitmentInterview[]; setModal: (modal: ModalState) => void }) {
  const columns: Array<DataTableColumn<RecruitmentInterview>> = [
    { key: "candidate", header: "Candidate", render: (row) => <strong>{candidateName(row.application?.candidate)}</strong> },
    { key: "req", header: "Requisition", render: (row) => row.application?.requisition?.title ?? "Requisition" },
    { key: "when", header: "When", render: (row) => `${formatDateTime(row.scheduledStartAt)} to ${timeOnly(row.scheduledEndAt)}` },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "where", header: "Location", render: (row) => row.locationName ?? row.meetingUrl ?? "Not set" },
    { key: "feedback", header: "Feedback", render: (row) => row.feedback?.length ?? 0 },
  ];
  return (
    <DataTable
      title="Interviews"
      eyebrow="Panels"
      description="Scheduled interviews keep panel, timing, and feedback context visible."
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={(row) => setModal({ type: "detail", title: candidateName(row.application?.candidate), body: <InterviewDetail row={row} /> })}
      minWidth="1040px"
      emptyTitle="No interviews"
      emptyBody="Scheduled screens and panels will appear here."
    />
  );
}

function OfferTable({
  rows,
  permissions,
  setModal,
}: {
  rows: RecruitmentOffer[];
  permissions: RecruitmentSummary["permissions"];
  setModal: (modal: ModalState) => void;
}) {
  const columns: Array<DataTableColumn<RecruitmentOffer>> = [
    { key: "candidate", header: "Candidate", render: (row) => <strong>{candidateName(row.application?.candidate)}</strong> },
    { key: "req", header: "Requisition", render: (row) => row.application?.requisition?.title ?? "Requisition" },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "pay", header: "Base pay", render: (row) => formatMoney(row.basePayCents, row.currencyCode) },
    { key: "start", header: "Start", render: (row) => (row.startDate ? formatDate(row.startDate) : "-") },
    { key: "workflow", header: "Workflow", render: (row) => <WorkflowSteps approval={row.approvalRequest} /> },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {permissions.manageOffers && (row.status === "DRAFT" || row.status === "REJECTED") ? (
            <TinyButton label="Submit" onClick={() => setModal({ type: "decision", title: "Submit offer", endpoint: `/recruitment/offers/${row.id}/submit`, success: "Offer submitted.", tone: "submit" })} />
          ) : null}
          {permissions.approveRecruitment && row.status === "SUBMITTED" ? (
            <>
              <TinyButton label="Approve" tone="green" onClick={() => setModal({ type: "decision", title: "Approve offer", endpoint: `/recruitment/offers/${row.id}/approve`, success: "Offer approved.", tone: "approve" })} />
              <TinyButton label="Reject" tone="red" onClick={() => setModal({ type: "decision", title: "Reject offer", endpoint: `/recruitment/offers/${row.id}/reject`, success: "Offer rejected.", tone: "reject" })} />
            </>
          ) : null}
        </div>
      ),
    },
  ];
  return (
    <DataTable
      title="Offers"
      eyebrow="Compensation approval"
      description="Offer drafts and submitted packages stay attached to approval history."
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      onRowClick={(row) => setModal({ type: "detail", title: `Offer for ${candidateName(row.application?.candidate)}`, body: <OfferDetail row={row} /> })}
      minWidth="1040px"
      emptyTitle="No offers"
      emptyBody="Drafted and submitted offers will appear here."
    />
  );
}

function ReportsView({ reports }: { reports: RecruitmentReports | null }) {
  if (!reports) {
    return (
      <EmptyPanel
        title="Reports are unavailable"
        body="Recruitment reports require recruitment.reports.read permission."
      />
    );
  }

  const sourceColumns: Array<DataTableColumn<RecruitmentReports["sourceBreakdown"][number]>> = [
    { key: "source", header: "Source", render: (row) => <strong>{row.source}</strong> },
    { key: "count", header: "Candidates", render: (row) => row.count },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <MiniMetric label="Applications" value={reports.metrics.applications} icon={PanelTopOpen} tone="blue" />
        <MiniMetric label="Interviews" value={reports.metrics.interviews} icon={CalendarClock} tone="green" />
        <MiniMetric label="Offers" value={reports.metrics.offers} icon={BadgeCheck} tone="violet" />
        <MiniMetric label="Hires" value={reports.metrics.hires} icon={CheckCircle2} tone="green" />
        <MiniMetric label="Rejected" value={reports.metrics.rejectedApplications} icon={XCircle} tone="rose" />
        <MiniMetric label="Open reqs" value={reports.metrics.requisitionsOpened} icon={BriefcaseBusiness} tone="slate" />
      </div>
      <DataTable
        title="Candidate sources"
        eyebrow="Attribution"
        description="Candidates created in the selected range grouped by source."
        rows={reports.sourceBreakdown}
        columns={sourceColumns}
        getRowKey={(row) => row.source}
        minWidth="520px"
        emptyTitle="No source data"
        emptyBody="Candidate source attribution will appear here."
      />
    </div>
  );
}

function ApprovalRulesTable({ rows }: { rows: RecruitmentApprovalRule[] }) {
  const columns: Array<DataTableColumn<RecruitmentApprovalRule>> = [
    { key: "code", header: "Code", render: (row) => <strong>{row.code}</strong> },
    { key: "name", header: "Name", render: (row) => row.name },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "priority", header: "Priority", render: (row) => row.priority },
    { key: "trigger", header: "Trigger", render: (row) => row.triggerKey },
    { key: "workflow", header: "Workflow", render: (row) => row.workflowCode ?? row.workflowId ?? "Direct workflow" },
  ];
  return (
    <DataTable
      title="Workflow adoption rules"
      eyebrow="Settings"
      description="Organizations adopt approval templates by requisition and offer trigger rules."
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      minWidth="900px"
      emptyTitle="No approval rules"
      emptyBody="Recruitment workflow adoption rules will appear here."
    />
  );
}

function RequisitionForm({ employees, onSubmit, pending }: { employees: ScheduleEmployee[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return (
    <FormShell title="Create requisition" eyebrow="Hiring demand" onSubmit={onSubmit} pending={pending} submitLabel="Create">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Code"><input name="code" className="form-field" placeholder="REQ-CARE-004" required /></Field>
        <Field label="Title"><input name="title" className="form-field" placeholder="Care Specialist" required /></Field>
        <Field label="Department"><input name="departmentName" className="form-field" placeholder="Care Coordination" /></Field>
        <Field label="Location"><input name="locationName" className="form-field" placeholder="Chicago, IL" /></Field>
        <Field label="Headcount"><input name="headcount" type="number" min="1" className="form-field" defaultValue="1" /></Field>
        <Field label="Priority"><input name="priority" type="number" min="0" max="100" className="form-field" defaultValue="50" /></Field>
        <Field label="Employment type">
          <select name="employmentType" className="form-field" defaultValue="FULL_TIME">
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
            <option value="CONTRACT">Contract</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="INTERN">Intern</option>
            <option value="PER_DIEM">Per diem</option>
          </select>
        </Field>
        <Field label="Work mode">
          <select name="workMode" className="form-field" defaultValue="HYBRID">
            <option value="ONSITE">Onsite</option>
            <option value="HYBRID">Hybrid</option>
            <option value="REMOTE">Remote</option>
          </select>
        </Field>
        <Field label="Hiring manager"><EmployeeSelect name="hiringManagerId" employees={employees} /></Field>
        <Field label="Recruiter"><EmployeeSelect name="recruiterId" employees={employees} /></Field>
        <Field label="Target start"><input name="targetStartDate" type="date" className="form-field" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min pay"><input name="salaryMin" type="number" min="0" className="form-field" placeholder="52000" /></Field>
          <Field label="Max pay"><input name="salaryMax" type="number" min="0" className="form-field" placeholder="68000" /></Field>
        </div>
      </div>
      <Field label="Description"><textarea name="description" className="form-field min-h-24" /></Field>
      <Field label="Requirements"><textarea name="requirements" className="form-field min-h-24" /></Field>
    </FormShell>
  );
}

function CandidateForm({ onSubmit, pending }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return (
    <FormShell title="Create candidate" eyebrow="Talent record" onSubmit={onSubmit} pending={pending} submitLabel="Create">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="First name"><input name="firstName" className="form-field" required /></Field>
        <Field label="Last name"><input name="lastName" className="form-field" required /></Field>
        <Field label="Email"><input name="email" type="email" className="form-field" required /></Field>
        <Field label="Phone"><input name="phone" className="form-field" /></Field>
        <Field label="Source"><input name="source" className="form-field" placeholder="Referral" /></Field>
        <Field label="Location"><input name="locationName" className="form-field" /></Field>
        <Field label="Current employer"><input name="currentEmployer" className="form-field" /></Field>
        <Field label="Current title"><input name="currentTitle" className="form-field" /></Field>
      </div>
      <Field label="Tags"><input name="tags" className="form-field" placeholder="referral, healthcare" /></Field>
    </FormShell>
  );
}

function ApplicationForm({
  candidates,
  requisitions,
  onSubmit,
  pending,
}: {
  candidates: RecruitmentCandidate[];
  requisitions: RecruitmentRequisition[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  return (
    <FormShell title="Add application" eyebrow="Pipeline" onSubmit={onSubmit} pending={pending} submitLabel="Add">
      <Field label="Candidate">
        <select name="candidateId" className="form-field" required>
          <option value="">Select candidate</option>
          {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidateName(candidate)}</option>)}
        </select>
      </Field>
      <Field label="Requisition">
        <select name="requisitionId" className="form-field" required>
          <option value="">Select requisition</option>
          {requisitions.map((req) => <option key={req.id} value={req.id}>{req.code} - {req.title}</option>)}
        </select>
      </Field>
      <Field label="Source"><input name="source" className="form-field" placeholder="Referral" /></Field>
    </FormShell>
  );
}

function InterviewForm({ applications, onSubmit, pending }: { applications: RecruitmentApplication[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return (
    <FormShell title="Schedule interview" eyebrow="Panel" onSubmit={onSubmit} pending={pending} submitLabel="Schedule">
      <Field label="Application">
        <select name="applicationId" className="form-field" required>
          <option value="">Select application</option>
          {applications.map((application) => (
            <option key={application.id} value={application.id}>{candidateName(application.candidate)} - {application.requisition?.title ?? "Requisition"}</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Starts"><input type="datetime-local" name="scheduledStartAt" className="form-field" required /></Field>
        <Field label="Ends"><input type="datetime-local" name="scheduledEndAt" className="form-field" required /></Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Timezone"><input name="timezone" className="form-field" defaultValue="America/Chicago" /></Field>
        <Field label="Location"><input name="locationName" className="form-field" placeholder="Video panel" /></Field>
      </div>
      <Field label="Meeting URL"><input name="meetingUrl" className="form-field" placeholder="https://meet..." /></Field>
      <Field label="Notes"><textarea name="notes" className="form-field min-h-24" /></Field>
    </FormShell>
  );
}

function OfferForm({ applications, onSubmit, pending }: { applications: RecruitmentApplication[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return (
    <FormShell title="Draft offer" eyebrow="Compensation" onSubmit={onSubmit} pending={pending} submitLabel="Draft">
      <Field label="Application">
        <select name="applicationId" className="form-field" required>
          <option value="">Select application</option>
          {applications.map((application) => (
            <option key={application.id} value={application.id}>{candidateName(application.candidate)} - {application.requisition?.title ?? "Requisition"}</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Base pay"><input name="basePay" type="number" min="0" className="form-field" placeholder="66000" /></Field>
        <Field label="Start date"><input name="startDate" type="date" className="form-field" /></Field>
        <Field label="Expires"><input name="expiresAt" type="date" className="form-field" /></Field>
      </div>
      <Field label="Decision note"><textarea name="decisionNote" className="form-field min-h-24" /></Field>
    </FormShell>
  );
}

function DecisionForm({ decision, onSubmit, pending }: { decision: Extract<ModalState, { type: "decision" }>; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return (
    <FormShell title={decision.title} eyebrow="Workflow decision" onSubmit={onSubmit} pending={pending} submitLabel={humanize(decision.tone)}>
      <Field label="Decision note">
        <textarea name="comment" className="form-field min-h-28" placeholder="Optional note for audit history" autoFocus />
      </Field>
    </FormShell>
  );
}

function DetailPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">Details</p>
      <h2 className="mt-1 text-2xl font-black text-[#11143a]">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function RequisitionDetail({ row }: { row: RecruitmentRequisition }) {
  return (
    <DetailGrid
      rows={[
        ["Code", row.code],
        ["Status", humanize(row.status)],
        ["Headcount", row.headcount],
        ["Employment", humanize(row.employmentType)],
        ["Work mode", humanize(row.workMode)],
        ["Hiring manager", employeeLabel(row.hiringManager)],
        ["Recruiter", employeeLabel(row.recruiter)],
        ["Pay range", `${formatMoney(row.salaryMinCents, row.currencyCode)} - ${formatMoney(row.salaryMaxCents, row.currencyCode)}`],
        ["Description", row.description ?? "Not captured"],
        ["Requirements", row.requirements ?? "Not captured"],
      ]}
    />
  );
}

function CandidateDetail({ row }: { row: RecruitmentCandidate }) {
  return (
    <DetailGrid
      rows={[
        ["Email", row.email],
        ["Phone", row.phone ?? "Not captured"],
        ["Source", row.source ?? "Unspecified"],
        ["Current title", row.currentTitle ?? "Not captured"],
        ["Employer", row.currentEmployer ?? "Not captured"],
        ["Location", row.locationName ?? "Not captured"],
        ["Tags", row.tags.join(", ") || "None"],
      ]}
    />
  );
}

function ApplicationDetail({ row }: { row: RecruitmentApplication }) {
  return (
    <DetailGrid
      rows={[
        ["Candidate", candidateName(row.candidate)],
        ["Requisition", row.requisition?.title ?? "Requisition"],
        ["Stage", row.currentStage?.name ?? humanize(row.status)],
        ["Status", humanize(row.status)],
        ["Score", row.score ?? "Not scored"],
        ["Applied", formatDate(row.appliedAt)],
        ["Source", row.source ?? "Unspecified"],
      ]}
    />
  );
}

function InterviewDetail({ row }: { row: RecruitmentInterview }) {
  return (
    <DetailGrid
      rows={[
        ["Candidate", candidateName(row.application?.candidate)],
        ["Requisition", row.application?.requisition?.title ?? "Requisition"],
        ["When", `${formatDateTime(row.scheduledStartAt)} to ${timeOnly(row.scheduledEndAt)}`],
        ["Timezone", row.timezone],
        ["Location", row.locationName ?? row.meetingUrl ?? "Not set"],
        ["Status", humanize(row.status)],
        ["Notes", row.notes ?? "No notes"],
      ]}
    />
  );
}

function OfferDetail({ row }: { row: RecruitmentOffer }) {
  return (
    <DetailGrid
      rows={[
        ["Candidate", candidateName(row.application?.candidate)],
        ["Requisition", row.application?.requisition?.title ?? "Requisition"],
        ["Status", humanize(row.status)],
        ["Base pay", formatMoney(row.basePayCents, row.currencyCode)],
        ["Start", row.startDate ? formatDate(row.startDate) : "Not set"],
        ["Expires", row.expiresAt ? formatDate(row.expiresAt) : "Not set"],
        ["Decision note", row.decisionNote ?? "No note"],
      ]}
    />
  );
}

function DetailGrid({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{label}</p>
          <div className="mt-1 text-sm font-bold leading-6 text-[#11143a]">{value}</div>
        </div>
      ))}
    </div>
  );
}

function FormShell({ title, eyebrow, children, onSubmit, pending, submitLabel }: { title: string; eyebrow: string; children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean; submitLabel: string }) {
  return (
    <form onSubmit={onSubmit}>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#63708a]">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-black text-[#11143a]">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
      <div className="mt-6 flex justify-end gap-2 border-t border-[#edf1f7] pt-4">
        <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3820d7] px-5 text-sm font-black text-white disabled:opacity-60">
          <CheckCircle2 size={16} />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function ModalFrame({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#11143a]/55 p-4 backdrop-blur-md">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close recruitment modal" />
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#dfe8f6] bg-white p-5 shadow-[0_30px_90px_rgba(17,20,58,0.28)]">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-[#dfe8f6] bg-white text-[#63708a] hover:text-[#3820d7]" aria-label="Close">
          <X size={17} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{label}</span>
      {children}
    </label>
  );
}

function EmployeeSelect({ name, employees }: { name: string; employees: ScheduleEmployee[] }) {
  return (
    <select name={name} className="form-field" defaultValue="">
      <option value="">Not assigned</option>
      {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}
    </select>
  );
}

function MiniMetric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: string }) {
  const toneClass: Record<string, string> = {
    blue: "border-sky-100 bg-sky-50 text-sky-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
  };
  return (
    <div className={`rounded-2xl border p-3 ${toneClass[tone] ?? toneClass.blue}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.08em]">{label}</p>
        <Icon size={15} />
      </div>
      <p className="mt-2 text-2xl font-black text-[#11143a]">{value}</p>
    </div>
  );
}

function DarkStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/8 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/45">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function Pill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe8f6] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.04em] text-[#25109f]">
      <Icon size={14} />
      {label}
    </span>
  );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe8f6] bg-white px-3 text-sm font-black text-[#11143a] transition hover:border-[#4b22e8] hover:text-[#3820d7]">
      <Icon size={16} />
      {label}
    </button>
  );
}

function TinyButton({ label, onClick, tone = "default" }: { label: string; onClick: () => void; tone?: "default" | "green" | "red" }) {
  const toneClass = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "red" ? "bg-rose-50 text-rose-700" : "bg-[#f1edff] text-[#3820d7]";
  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} className={`rounded-lg px-3 py-2 text-xs font-black ${toneClass}`}>
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();
  const tone = upper.includes("APPROVED") || upper.includes("OPEN") || upper.includes("HIRED") || upper.includes("ACTIVE")
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : upper.includes("REJECT") || upper.includes("CANCEL") || upper.includes("DECLIN")
      ? "border-rose-100 bg-rose-50 text-rose-700"
      : upper.includes("SUBMITTED") || upper.includes("PENDING") || upper.includes("OFFER")
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-[#dfe8f6] bg-[#f7f9fd] text-[#63708a]";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{humanize(status)}</span>;
}

function WorkflowSteps({ approval }: { approval?: { status: string; steps?: Array<{ id: string; name: string; status: string }> } | null }) {
  const steps = approval?.steps ?? [];
  if (steps.length === 0) return <span className="text-xs font-bold text-[#74809a]">No workflow</span>;
  return (
    <div className="flex max-w-[300px] flex-wrap gap-1">
      {steps.map((step) => <span key={step.id} className="rounded-full border border-[#dfe8f6] px-2 py-1 text-[11px] font-black text-[#63708a]">{step.name} · {humanize(step.status)}</span>)}
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-xs font-bold text-[#74809a]">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-[#eef4ff] px-2 py-1 text-[11px] font-black text-[#315fba]">{tag}</span>)}
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-8 text-center">
      <p className="text-sm font-black text-[#11143a]">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[#74809a]">{body}</p>
    </div>
  );
}

function employeeLabel(employee?: ScheduleEmployee | null) {
  if (!employee) return "Unassigned";
  const person = employee.person;
  const name = person ? `${person.preferredName ?? person.firstName} ${person.lastName}` : employee.employeeNumber;
  return `${name}${employee.employeeNumber ? ` · ${employee.employeeNumber}` : ""}`;
}

function candidateName(candidate?: Pick<RecruitmentCandidate, "firstName" | "lastName"> | null) {
  return candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate";
}

function humanize(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function timeOnly(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatMoney(cents?: number | null, currency = "USD") {
  if (cents == null) return "-";
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function numberValue(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function currencyToCents(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : undefined;
}

function dateValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "");
  return raw ? new Date(`${raw}T00:00:00.000`).toISOString() : undefined;
}

function dateTimeValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "");
  return raw ? new Date(raw).toISOString() : undefined;
}

function cleanPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}
