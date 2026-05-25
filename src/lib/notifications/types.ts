export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "PUSH";
export type NotificationStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED" | "CANCELLED";

export type NotificationTemplate = {
  id: string;
  tenantId?: string | null;
  code: string;
  name: string;
  channel: NotificationChannel;
  subject?: string | null;
  body: string;
  isActive: boolean;
};

export type NotificationRecord = {
  id: string;
  tenantId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  status: NotificationStatus;
  templateCode?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
  recipients?: NotificationRecipient[];
};

export type NotificationRecipient = {
  id: string;
  notificationId: string;
  userId?: string | null;
  employeeId?: string | null;
  destination?: string | null;
  status: NotificationStatus;
  readAt?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  notification?: NotificationRecord;
  user?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
  employee?: {
    id: string;
    employeeNumber?: string;
    person?: {
      firstName: string;
      lastName: string;
      preferredName?: string | null;
    };
  } | null;
};

export type NotificationPreference = {
  id: string;
  userId: string;
  channel: NotificationChannel;
  module: string;
  enabled: boolean;
};

export type NotificationSummary = {
  unreadInbox: number;
  pendingDelivery: number;
  failedDelivery: number;
  byChannel: Partial<Record<NotificationChannel, number>>;
  byStatus: Partial<Record<NotificationStatus, number>>;
};

export type PaginatedNotificationRecipients = {
  data: NotificationRecipient[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedNotifications = {
  data: NotificationRecord[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedNotificationTemplates = {
  data: NotificationTemplate[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

