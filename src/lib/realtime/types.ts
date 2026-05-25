export type RealtimeSeverity = "INFO" | "ACTION" | "WARNING" | "CRITICAL";

export type RealtimeFeedItem = {
  id: string;
  sourceId: string;
  type: "NOTIFICATION" | "TIMELINE" | "ACTIVITY";
  severity: RealtimeSeverity;
  title: string;
  description?: string | null;
  createdAt: string;
  href: string;
  meta?: Record<string, unknown>;
};

export type RealtimeFeed = {
  serverTime: string;
  tenantId: string;
  summary: {
    unreadNotifications: number;
    pendingApprovals: number;
    failedOutbox: number;
    liveItems: number;
  };
  items: RealtimeFeedItem[];
};
