import type { AuthUser } from "@/lib/api/types";

export const PLATFORM_ADMIN_ROLES = new Set(["SUPER_ADMIN", "PLATFORM_SUPPORT"]);

export function isPlatformOperator(user?: AuthUser | null) {
  return Boolean(
    user?.type === "PLATFORM_ADMIN" ||
      user?.roles?.some((role) => PLATFORM_ADMIN_ROLES.has(role)),
  );
}

export function hasPermission(user: AuthUser | null | undefined, permission: string) {
  return isPlatformOperator(user) || Boolean(user?.permissions?.includes(permission));
}

export function hasAnyPermission(user: AuthUser | null | undefined, permissions: readonly string[] = []) {
  return (
    permissions.length === 0 ||
    isPlatformOperator(user) ||
    permissions.some((permission) => Boolean(user?.permissions?.includes(permission)))
  );
}

export function hasEveryPermission(user: AuthUser | null | undefined, permissions: readonly string[] = []) {
  return (
    permissions.length === 0 ||
    isPlatformOperator(user) ||
    permissions.every((permission) => Boolean(user?.permissions?.includes(permission)))
  );
}

export function routeRequirementFor(pathname: string) {
  const match = ROUTE_REQUIREMENTS.find((route) => pathname === route.href || pathname.startsWith(`${route.href}/`));
  return match?.permissions ?? [];
}

export const ROUTE_REQUIREMENTS = [
  { href: "/dashboard", permissions: ["dashboard.read"] },
  { href: "/profile", permissions: ["dashboard.read"] },
  { href: "/search", permissions: ["dashboard.read"] },
  { href: "/workforce", permissions: ["employees.read", "persons.read", "assignments.read"] },
  { href: "/organization", permissions: ["organization.read", "cost-centers.read"] },
  { href: "/positions", permissions: ["positions.read"] },
  { href: "/workflows", permissions: ["workflows.read", "approvals.read"] },
  { href: "/scheduling", permissions: ["scheduling.self", "scheduling.write", "scheduling.team.write"] },
  { href: "/attendance", permissions: ["attendance.self", "attendance.team.write", "attendance.write", "attendance.controls.write", "attendance.reports.read"] },
  { href: "/documents", permissions: ["documents.read"] },
  { href: "/forms", permissions: ["dashboard.read"] },
  { href: "/notifications", permissions: ["notifications.read"] },
  { href: "/content", permissions: ["content.write", "content.publish"] },
  { href: "/iam", permissions: ["iam.roles.read", "iam.permissions.read", "iam.users.read"] },
  { href: "/tenants", permissions: ["tenants.settings.read", "platform.tenants.manage"] },
  { href: "/audit", permissions: ["audit.read", "activity.read", "outbox.read"] },
  { href: "/quality", permissions: ["analytics.read", "dashboard.write"] },
  { href: "/settings", permissions: ["tenants.settings.read", "tenants.branding.read"] },
] as const;
