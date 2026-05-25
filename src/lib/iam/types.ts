export type RoleScope =
  | "PLATFORM"
  | "TENANT"
  | "ORGANIZATION_NODE"
  | "DEPARTMENT"
  | "TEAM"
  | "SELF";

export type Permission = {
  id: string;
  tenantId?: string | null;
  code: string;
  name: string;
  module: string;
  description?: string | null;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type RolePermission = {
  id: string;
  roleId: string;
  permissionId: string;
  permission: Permission;
};

export type Role = {
  id: string;
  tenantId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  scope: RoleScope;
  isSystem: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  permissions: RolePermission[];
};

export type PermissionTemplateRisk = "low" | "medium" | "high";
export type PermissionTemplateScope = "platform" | "tenant";

export type PermissionTemplate = {
  code: string;
  name: string;
  description: string;
  scope: PermissionTemplateScope;
  riskLevel: PermissionTemplateRisk;
  recommendedFor: string[];
  permissionCodes: string[];
  permissionCount?: number;
};

export type PermissionBootstrapStatus = {
  catalogVersion: string;
  catalogCount: number;
  existingGlobalCount: number;
  missingCount: number;
  changedCount: number;
  unmanagedCount: number;
  missing: string[];
  changed: string[];
  unmanaged: string[];
};

export type PermissionBootstrapResult = {
  catalogVersion: string;
  permissions: {
    catalogCount: number;
    created: string[];
    updated: string[];
    unchanged: string[];
  };
  platformRoles: Array<{
    roleCode: string;
    roleFound: boolean;
    attached: string[];
  }>;
  appliedAt: string;
};
