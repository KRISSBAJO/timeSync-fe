import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CalendarCheck2,
  CalendarClock,
  Clock3,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FilePenLine,
  Fingerprint,
  GitBranch,
  BriefcaseBusiness,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Settings,
  ShieldCheck,
  UserRound,
  UserRoundCog,
  UsersRound,
} from "lucide-react";

import type { AuthTenant, AuthUser } from "@/lib/api/types";
import type { AccessAudience } from "@/lib/auth/access-profile";
import { accessProfileForUser, profileAllows } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";

export type NavigationItem = {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  permissions: string[];
  group: NavigationGroupKey;
  audiences?: AccessAudience[];
  features?: string[];
};

export type NavigationGroupKey =
  | "workspace"
  | "workforce"
  | "operations"
  | "governance"
  | "administration";

export type NavigationGroupDefinition = {
  key: NavigationGroupKey;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type NavigationGroup = NavigationGroupDefinition & {
  items: NavigationItem[];
};

export const navigationGroupDefinitions: NavigationGroupDefinition[] = [
  {
    key: "workspace",
    title: "Workspace",
    description: "Dashboard and personal profile",
    icon: LayoutDashboard,
  },
  {
    key: "workforce",
    title: "Workforce",
    description: "People, structure, and positions",
    icon: UsersRound,
  },
  {
    key: "operations",
    title: "Operations",
    description: "Approvals, files, forms, and notices",
    icon: ClipboardList,
  },
  {
    key: "governance",
    title: "Governance",
    description: "Content, audit, and quality controls",
    icon: ShieldCheck,
  },
  {
    key: "administration",
    title: "Administration",
    description: "Access, tenants, and settings",
    icon: Settings,
  },
];

export const appNavigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    description: "Role-aware workforce overview and personal workspace",
    icon: LayoutDashboard,
    permissions: ["dashboard.read"],
    group: "workspace",
    audiences: ["manager", "employee"],
  },
  {
    title: "My Profile",
    href: "/profile",
    description: "Personal employment, assignment, documents, and access",
    icon: UserRound,
    permissions: ["dashboard.read"],
    group: "workspace",
    audiences: ["platform", "tenant-admin", "hr", "manager", "employee", "auditor"],
    features: ["ESS"],
  },
  {
    title: "My Schedule",
    href: "/scheduling",
    description: "Shifts, open work, availability, and overtime",
    icon: CalendarClock,
    permissions: ["scheduling.self"],
    group: "workspace",
    audiences: ["employee"],
    features: ["SCHEDULING"],
  },
  {
    title: "My Attendance",
    href: "/attendance",
    description: "Clock-ins, exceptions, and timesheets",
    icon: Clock3,
    permissions: ["attendance.self"],
    group: "workspace",
    audiences: ["employee"],
    features: ["ATTENDANCE"],
  },
  {
    title: "My Leave",
    href: "/leave",
    description: "Balances, requests, and approval status",
    icon: CalendarCheck2,
    permissions: ["leave.self"],
    group: "workspace",
    audiences: ["employee"],
    features: ["LEAVE"],
  },
  {
    title: "Employees",
    href: "/workforce",
    description: "People, employee lifecycle, assignments, and movement",
    icon: UsersRound,
    permissions: ["employees.read", "persons.read", "assignments.read"],
    group: "workforce",
    audiences: ["tenant-admin", "hr", "manager"],
    features: ["WORKFORCE_CORE"],
  },
  {
    title: "Organization",
    href: "/organization",
    description: "Dynamic hierarchy, org tree, and cost centers",
    icon: Building2,
    permissions: ["organization.read", "cost-centers.read"],
    group: "workforce",
    audiences: ["tenant-admin", "hr"],
    features: ["ORGANIZATION"],
  },
  {
    title: "Job Titles",
    href: "/positions",
    description: "Position control, grades, levels, and capacity",
    icon: GitBranch,
    permissions: ["positions.read"],
    group: "workforce",
    audiences: ["tenant-admin", "hr"],
    features: ["POSITIONS"],
  },
  {
    title: "Scheduling",
    href: "/scheduling",
    description: "Shift planning, open work, availability, and overtime",
    icon: CalendarClock,
    permissions: ["scheduling.self", "scheduling.write", "scheduling.team.write"],
    group: "operations",
    audiences: ["tenant-admin", "hr", "manager"],
    features: ["SCHEDULING"],
  },
  {
    title: "Attendance",
    href: "/attendance",
    description: "Punches, exceptions, timesheets, and policy",
    icon: Clock3,
    permissions: ["attendance.self", "attendance.team.write", "attendance.write"],
    group: "operations",
    audiences: ["tenant-admin", "hr", "manager"],
    features: ["ATTENDANCE"],
  },
  {
    title: "Leave",
    href: "/leave",
    description: "Balances, requests, workflow approvals, and policy",
    icon: CalendarCheck2,
    permissions: ["leave.self", "leave.team.read", "leave.team.write", "leave.approve", "leave.policy.write"],
    group: "operations",
    audiences: ["tenant-admin", "hr", "manager"],
    features: ["LEAVE"],
  },
  {
    title: "Recruitment",
    href: "/recruitment",
    description: "Requisitions, candidates, interviews, and offers",
    icon: BriefcaseBusiness,
    permissions: ["recruitment.read", "recruitment.write", "recruitment.approve", "recruitment.offer.write"],
    group: "operations",
    audiences: ["tenant-admin", "hr", "manager"],
    features: ["RECRUITMENT"],
  },
  {
    title: "Approvals",
    href: "/workflows",
    description: "Workflow builder, approvals, and delegation",
    icon: ListChecks,
    permissions: ["workflows.read", "approvals.read"],
    group: "operations",
    audiences: ["tenant-admin", "hr", "manager"],
    features: ["WORKFLOWS"],
  },
  {
    title: "Documents",
    href: "/documents",
    description: "Document types, versions, verification, and expiry",
    icon: FileText,
    permissions: ["documents.read"],
    group: "operations",
    audiences: ["tenant-admin", "hr", "manager"],
    features: ["DOCUMENTS"],
  },
  {
    title: "Forms",
    href: "/forms",
    description: "Assigned forms, surveys, responses, and analysis",
    icon: ClipboardList,
    permissions: ["dashboard.read"],
    group: "operations",
    audiences: ["tenant-admin", "hr", "manager", "employee"],
    features: ["FORMS"],
  },
  {
    title: "Messages",
    href: "/notifications",
    description: "Templates, preferences, outbound queue, and delivery",
    icon: Bell,
    permissions: ["notifications.read"],
    group: "operations",
    audiences: ["platform", "tenant-admin", "hr", "manager", "employee", "auditor"],
    features: ["NOTIFICATIONS"],
  },
  {
    title: "Content",
    href: "/content",
    description: "HR Guides, publishing, comments, and article signals",
    icon: FilePenLine,
    permissions: ["content.write", "content.publish"],
    group: "governance",
    audiences: ["platform", "tenant-admin", "hr"],
  },
  {
    title: "Admins",
    href: "/iam",
    description: "Roles, permissions, users, and sessions",
    icon: LockKeyhole,
    permissions: ["iam.roles.read", "iam.permissions.read", "iam.users.read"],
    group: "administration",
    audiences: ["platform", "tenant-admin"],
  },
  {
    title: "Tenants",
    href: "/tenants",
    description: "Tenant settings, features, branding, and subscriptions",
    icon: UserRoundCog,
    permissions: ["tenants.settings.read", "platform.tenants.manage"],
    group: "administration",
    audiences: ["platform", "tenant-admin"],
  },
  {
    title: "Audit",
    href: "/audit",
    description: "Audit logs, timeline, activity, and outbox events",
    icon: ShieldCheck,
    permissions: ["audit.read", "activity.read", "outbox.read"],
    group: "governance",
    audiences: ["platform", "tenant-admin", "hr", "auditor"],
  },
  {
    title: "Quality",
    href: "/quality",
    description: "Compliance, data quality, and remediation signals",
    icon: ClipboardCheck,
    permissions: ["analytics.read", "dashboard.write"],
    group: "governance",
    audiences: ["platform", "tenant-admin", "hr", "auditor"],
    features: ["ANALYTICS"],
  },
  {
    title: "Settings",
    href: "/settings",
    description: "Security policy, localization, and tenant controls",
    icon: Settings,
    permissions: ["tenants.settings.read", "tenants.branding.read"],
    group: "administration",
    audiences: ["platform", "tenant-admin"],
  },
];

export const utilityNavigation: NavigationItem[] = [
  {
    title: "Security Sessions",
    href: "/settings#sessions",
    description: "Current browser sessions and device trust",
    icon: Fingerprint,
    permissions: [],
    group: "administration",
  },
];

export function navigationForUser(user?: AuthUser | null, tenant?: AuthTenant | null) {
  const profile = accessProfileForUser(user);

  return appNavigation.filter((item) => (
    hasAnyPermission(user, item.permissions) &&
    profileAllows(profile, item.audiences) &&
    tenantAllowsFeatures(tenant, item.features)
  ));
}

export function navigationGroupsForUser(user?: AuthUser | null, tenant?: AuthTenant | null): NavigationGroup[] {
  const visibleItems = navigationForUser(user, tenant);

  return navigationGroupDefinitions
    .map((group) => ({
      ...group,
      items: visibleItems.filter((item) => item.group === group.key),
    }))
    .filter((group) => group.items.length > 0);
}

export function routeFeatureRequirementFor(pathname: string) {
  const features = appNavigation
    .filter((route) => pathname === route.href || pathname.startsWith(`${route.href}/`))
    .flatMap((route) => route.features ?? []);

  return Array.from(new Set(features));
}

export function tenantAllowsFeatures(tenant?: AuthTenant | null, features: readonly string[] = []) {
  if (features.length === 0 || !tenant) {
    return true;
  }

  if (!tenant.enabledFeatures) {
    return true;
  }

  const enabledFeatures = new Set(tenant.enabledFeatures);
  return features.every((feature) => enabledFeatures.has(feature));
}
