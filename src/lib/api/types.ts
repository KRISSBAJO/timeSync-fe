export type AuthTenant = {
  id: string;
  slug: string;
  name: string;
  enabledFeatures?: string[];
};

export type AuthUser = {
  id: string;
  identityId?: string | null;
  membershipId?: string | null;
  email: string;
  username: string | null;
  tenantId: string | null;
  type: string;
  status: string;
  roles: string[];
  permissions: string[];
};

export type AuthIdentity = {
  id: string;
  email: string;
};

export type AuthMembership = {
  id: string;
  tenantId: string | null;
  type: string;
  status: string;
  isDefault: boolean;
};

export type AuthWorkspace = {
  membershipId: string;
  userId: string | null;
  tenantId: string | null;
  type: string;
  status: string;
  isDefault: boolean;
  isCurrent: boolean;
  displayName: string;
  slug: string;
  tenant: (AuthTenant & { status?: string }) | null;
  user: {
    id: string;
    email: string;
    username: string | null;
    status: string;
    type: string;
    roles: string[];
  } | null;
  lastAccessedAt: string | null;
};

export type AuthSession = {
  user: AuthUser;
  identity?: AuthIdentity;
  membership?: AuthMembership;
  tenant: AuthTenant | null;
  workspaces?: AuthWorkspace[];
  expiresAt: string;
  csrfToken?: string;
};

export type ApiEnvelope<T> = {
  data: T;
  meta: {
    requestId?: string;
    timestamp: string;
  };
};

export type BrowserSession = {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  revokedAt: string | null;
  isCurrent?: boolean;
  createdAt: string;
};

export type ApiErrorBody = {
  message?: string | string[];
  error?:
    | string
    | {
        statusCode?: number;
        code?: string;
        message?: string | string[];
        details?: unknown;
      };
  statusCode?: number;
  code?: string;
  details?: unknown;
};
