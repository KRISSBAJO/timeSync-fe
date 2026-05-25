import { NotificationOperationsCenter } from "@/components/notifications/notification-operations-center";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerPermissions } from "@/lib/auth/session";
import type {
  NotificationPreference,
  NotificationSummary,
  PaginatedNotificationRecipients,
  PaginatedNotifications,
  PaginatedNotificationTemplates,
} from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

type NotificationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    channel: readParam(params.channel),
    status: readParam(params.status),
    unreadOnly: readParam(params.unreadOnly),
  };
  const access = await requireServerPermissions(["notifications.read"], "/notifications");
  const canOperateNotifications = hasAnyPermission(access.session.user, ["notifications.write"]);
  const inboxQuery = buildInboxQuery(filters);
  const outboundQuery = buildOutboundQuery(filters);

  const [inbox, outbound, summary, templates, preferences] = access.authorized
    ? await Promise.all([
        tryServerApiJson<PaginatedNotificationRecipients>(`/notifications?${inboxQuery}`),
        canOperateNotifications
          ? tryServerApiJson<PaginatedNotifications>(`/notifications/outbound?${outboundQuery}`)
          : Promise.resolve(null),
        tryServerApiJson<NotificationSummary>("/notifications/summary"),
        canOperateNotifications
          ? tryServerApiJson<PaginatedNotificationTemplates>("/notifications/templates?limit=50")
          : Promise.resolve(null),
        tryServerApiJson<NotificationPreference[]>("/notifications/preferences"),
      ])
    : [null, null, null, null, null];

  return (
    <NotificationOperationsCenter
      inbox={inbox}
      outbound={outbound}
      summary={summary}
      templates={templates}
      preferences={preferences}
      filters={filters}
    />
  );
}

function buildInboxQuery(filters: NotificationFilters) {
  const params = new URLSearchParams({ limit: "50" });
  if (filters.search) params.set("search", filters.search);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.status) params.set("status", filters.status);
  if (filters.unreadOnly) params.set("unreadOnly", "true");
  return params.toString();
}

function buildOutboundQuery(filters: NotificationFilters) {
  const params = new URLSearchParams({ limit: "25" });
  if (filters.search) params.set("search", filters.search);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.status) params.set("status", filters.status);
  return params.toString();
}

type NotificationFilters = {
  search: string;
  channel: string;
  status: string;
  unreadOnly: string;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
