export type TenantStatus =
  | "PENDING_VERIFICATION"
  | "TRIAL"
  | "ACTIVE"
  | "SUSPENDED"
  | "ARCHIVED";

export type TenantFeatureStatus = "ENABLED" | "DISABLED" | "TRIAL" | "BETA";

export type TenantSettings = {
  defaultTimezone?: string | null;
  defaultLocale?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
  fiscalYearStartMonth?: number | null;
  employeeNumberPrefix?: string | null;
  employeeNumberNextSeq?: number | null;
  passwordPolicy?: Record<string, unknown> | null;
  sessionPolicy?: Record<string, unknown> | null;
  approvalPolicy?: Record<string, unknown> | null;
};

export type TenantBranding = {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  emailHeaderUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type TenantSubscription = {
  planCode: string;
  planName: string;
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
  trialEndsAt?: string | null;
  userLimit?: number | null;
  employeeLimit?: number | null;
  storageLimitMb?: number | null;
};

export type PlatformTenantSummary = {
  totalUsers: number;
  activeUsers: number;
  invitedUsers: number;
  totalEmployees: number;
  activeEmployees: number;
  organizationNodes: number;
  costCenters: number;
  positions: number;
  activePositions: number;
  workflows: number;
  documents: number;
  pendingApprovals: number;
  failedOutbox: number;
  enabledFeatures: number;
};

export type PlatformFeature = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type TenantFeature = {
  id: string;
  tenantId: string;
  platformFeatureId: string;
  status: TenantFeatureStatus;
  enabledAt?: string | null;
  disabledAt?: string | null;
  trialEndsAt?: string | null;
  limits?: Record<string, unknown> | null;
  configuration?: Record<string, unknown> | null;
  platformFeature: PlatformFeature;
};

export type TenantDetails = {
  id: string;
  name: string;
  legalName?: string | null;
  slug: string;
  subdomain: string;
  customDomain?: string | null;
  status: TenantStatus;
  industry?: string | null;
  sizeBand?: string | null;
  website?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  createdAt?: string;
  updatedAt?: string;
  country?: { name: string; iso2: string } | null;
  currency?: { code: string; symbol?: string | null } | null;
  settings?: TenantSettings | null;
  branding?: TenantBranding | null;
  subscription?: TenantSubscription | null;
  features?: TenantFeature[];
  platformSummary?: PlatformTenantSummary;
};

export type TenantOnboardingStep = {
  code: string;
  title: string;
  complete: boolean;
  owner: string;
  evidence: Record<string, unknown>;
};

export type TenantOnboardingAction = {
  code: string;
  title: string;
  owner: string;
};

export type TenantOnboarding = {
  tenant: Pick<TenantDetails, "id" | "name" | "slug" | "status">;
  completionPercent: number;
  completed: number;
  total: number;
  steps: TenantOnboardingStep[];
  nextBestActions: TenantOnboardingAction[];
  generatedAt: string;
};

export type PaginatedTenants = {
  data: TenantDetails[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type TenantAdminPayload = {
  currentTenant: TenantDetails | null;
  currentFeatures: TenantFeature[];
  currentSubscription: TenantSubscription | null;
  platformTenants: TenantDetails[];
  currentOnboarding: TenantOnboarding | null;
  capabilities: {
    canWriteSettings: boolean;
    canWriteBranding: boolean;
    canWriteFeatures: boolean;
    canManagePlatformTenants: boolean;
  };
};
