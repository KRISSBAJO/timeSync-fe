import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { GovernanceOperationsCenter } from "@/components/history/governance-operations-center";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type {
  OutboxSummary,
  PaginatedActivityLogs,
  PaginatedAuditLogs,
  PaginatedOutboxMessages,
  PaginatedTimelineEvents,
} from "@/lib/history/types";

export const dynamic = "force-dynamic";

type AuditPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    module: readParam(params.module),
    outboxStatus: readParam(params.outboxStatus),
  };
  const session = await requireServerSession("/audit");
  const profile = accessProfileForUser(session.user);

  if (!profile.canUseAuditCenter) {
    return (
      <AccessDeniedPanel
        title="Governance logs are not available for this role."
        body="Audit, activity, timeline, and outbox operations are intentionally limited to HR, tenant admins, auditors, and platform operators."
      />
    );
  }

  const baseQuery = buildBaseQuery(filters);
  const outboxQuery = buildOutboxQuery(filters);

  const [auditLogs, activityLogs, timelineEvents, outboxMessages, outboxSummary] = await Promise.all([
    hasAnyPermission(session.user, ["audit.read"])
      ? tryServerApiJson<PaginatedAuditLogs>(`/audit-logs?${baseQuery}`)
      : Promise.resolve(null),
    hasAnyPermission(session.user, ["activity.read"])
      ? tryServerApiJson<PaginatedActivityLogs>(`/activity-logs?${baseQuery}`)
      : Promise.resolve(null),
    hasAnyPermission(session.user, ["timeline.read"])
      ? tryServerApiJson<PaginatedTimelineEvents>(`/timeline-events?${baseQuery}`)
      : Promise.resolve(null),
    hasAnyPermission(session.user, ["outbox.read"])
      ? tryServerApiJson<PaginatedOutboxMessages>(`/outbox/messages?${outboxQuery}`)
      : Promise.resolve(null),
    hasAnyPermission(session.user, ["outbox.read"])
      ? tryServerApiJson<OutboxSummary>("/outbox/messages/summary")
      : Promise.resolve(null),
  ]);

  return (
    <GovernanceOperationsCenter
      auditLogs={auditLogs}
      activityLogs={activityLogs}
      timelineEvents={timelineEvents}
      outboxMessages={outboxMessages}
      outboxSummary={outboxSummary}
      filters={filters}
    />
  );
}

function buildBaseQuery(filters: GovernanceFilters) {
  const params = new URLSearchParams({ limit: "50" });
  if (filters.search) params.set("search", filters.search);
  if (filters.module) params.set("module", filters.module);
  return params.toString();
}

function buildOutboxQuery(filters: GovernanceFilters) {
  const params = new URLSearchParams({ limit: "50" });
  if (filters.search) params.set("search", filters.search);
  if (filters.outboxStatus) params.set("status", filters.outboxStatus);
  return params.toString();
}

type GovernanceFilters = {
  search: string;
  module: string;
  outboxStatus: string;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
