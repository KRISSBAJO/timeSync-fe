export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "LOGIN"
  | "LOGOUT"
  | "INVITE"
  | "APPROVE"
  | "REJECT"
  | "ENABLE"
  | "DISABLE"
  | "SUSPEND"
  | "ACTIVATE"
  | "ARCHIVE"
  | "EXPORT"
  | "IMPORT";

export type OutboxStatus = "PENDING" | "PROCESSING" | "PUBLISHED" | "FAILED" | "CANCELLED";

export type AuditLog = {
  id: string;
  tenantId?: string | null;
  actorUserId?: string | null;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type ActivityLog = {
  id: string;
  tenantId?: string | null;
  userId?: string | null;
  module: string;
  message: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
};

export type TimelineEvent = {
  id: string;
  tenantId: string;
  employeeId?: string | null;
  actorUserId?: string | null;
  type: string;
  title: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  employee?: {
    id: string;
    employeeNumber: string;
    person: {
      firstName: string;
      lastName: string;
      preferredName?: string | null;
    };
  } | null;
  actor?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
};

export type OutboxMessage = {
  id: string;
  tenantId?: string | null;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  status: OutboxStatus;
  attempts: number;
  availableAt: string;
  processedAt?: string | null;
  failedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
};

export type OutboxSummary = {
  overdue: number;
  byStatus: Partial<Record<OutboxStatus, number>>;
};

export type PaginatedAuditLogs = {
  data: AuditLog[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedActivityLogs = {
  data: ActivityLog[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedTimelineEvents = {
  data: TimelineEvent[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedOutboxMessages = {
  data: OutboxMessage[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

