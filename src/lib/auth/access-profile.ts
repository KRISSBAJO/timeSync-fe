import type { AuthUser } from "@/lib/api/types";

export type AccessAudience =
  | "platform"
  | "tenant-admin"
  | "hr"
  | "manager"
  | "employee"
  | "auditor";

const PLATFORM_ROLES = new Set(["SUPER_ADMIN", "PLATFORM_SUPPORT"]);
const TENANT_ADMIN_ROLES = new Set(["TENANT_ADMIN"]);
const HR_ROLES = new Set(["HR_ADMIN", "HR_MANAGER"]);
const MANAGER_ROLES = new Set(["MANAGER", "TEAM_LEAD"]);
const EMPLOYEE_ROLES = new Set(["EMPLOYEE", "CONTRACTOR"]);
const AUDITOR_ROLES = new Set(["AUDITOR", "COMPLIANCE_AUDITOR"]);

export type AccessProfile = {
  audiences: Set<AccessAudience>;
  primaryAudience: AccessAudience;
  isPlatform: boolean;
  isTenantAdmin: boolean;
  isHrOperator: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isAuditor: boolean;
  canUseTenantCommandCenter: boolean;
  canUseAdminCreate: boolean;
  canUseQualityCenter: boolean;
  canUseContentAdmin: boolean;
  canUseAuditCenter: boolean;
  canUseRealtimePulse: boolean;
};

export function accessProfileForUser(user?: AuthUser | null): AccessProfile {
  const roles = new Set(user?.roles ?? []);
  const isPlatform = user?.type === "PLATFORM_ADMIN" || hasRole(roles, PLATFORM_ROLES);
  const isTenantAdmin = hasRole(roles, TENANT_ADMIN_ROLES);
  const isHrOperator = hasRole(roles, HR_ROLES);
  const isManager = hasRole(roles, MANAGER_ROLES);
  const isAuditor = hasRole(roles, AUDITOR_ROLES);
  const isEmployee = hasRole(roles, EMPLOYEE_ROLES) || (!isPlatform && !isTenantAdmin && !isHrOperator && !isManager && !isAuditor);
  const audiences = new Set<AccessAudience>();

  if (isPlatform) audiences.add("platform");
  if (isTenantAdmin) audiences.add("tenant-admin");
  if (isHrOperator) audiences.add("hr");
  if (isManager) audiences.add("manager");
  if (isEmployee) audiences.add("employee");
  if (isAuditor) audiences.add("auditor");

  return {
    audiences,
    primaryAudience: primaryAudience(audiences),
    isPlatform,
    isTenantAdmin,
    isHrOperator,
    isManager,
    isEmployee,
    isAuditor,
    canUseTenantCommandCenter: isPlatform || isTenantAdmin || isHrOperator,
    canUseAdminCreate: isPlatform || isTenantAdmin || isHrOperator,
    canUseQualityCenter: isPlatform || isTenantAdmin || isHrOperator || isAuditor,
    canUseContentAdmin: isPlatform || isTenantAdmin || isHrOperator,
    canUseAuditCenter: isPlatform || isTenantAdmin || isHrOperator || isAuditor,
    canUseRealtimePulse: isPlatform || isTenantAdmin || isHrOperator || isManager,
  };
}

export function profileAllows(profile: AccessProfile, audiences?: readonly AccessAudience[]) {
  if (!audiences || audiences.length === 0) {
    return true;
  }

  return audiences.some((audience) => profile.audiences.has(audience));
}

function hasRole(roles: Set<string>, expected: Set<string>) {
  for (const role of expected) {
    if (roles.has(role)) {
      return true;
    }
  }

  return false;
}

function primaryAudience(audiences: Set<AccessAudience>): AccessAudience {
  for (const audience of ["platform", "tenant-admin", "hr", "manager", "auditor", "employee"] as const) {
    if (audiences.has(audience)) {
      return audience;
    }
  }

  return "employee";
}
