import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { ScopedDashboard } from "@/components/dashboard/scoped-dashboard";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerPermissions } from "@/lib/auth/session";
import type { AttendanceSummary, MyAttendanceWorkspace } from "@/lib/attendance/types";
import type { PermissionTemplate } from "@/lib/iam/types";
import type { MyScheduleWorkspace, SchedulingSummary } from "@/lib/scheduling/types";
import type { TenantOnboarding } from "@/lib/tenants/types";
import type { MyEmploymentResponse } from "@/lib/workforce/types";
import { tenantAllowsFeatures } from "@/config/navigation";

export const dynamic = "force-dynamic";

type AnalyticsSnapshotList = {
  data: Array<Record<string, unknown>>;
};

export default async function DashboardPage() {
  const access = await requireServerPermissions(["dashboard.read"], "/dashboard");
  const profile = accessProfileForUser(access.session.user);
  const useTenantCommandCenter = profile.canUseTenantCommandCenter || profile.isPlatform || profile.isAuditor;
  const canReadAnalytics = hasAnyPermission(access.session.user, ["analytics.read"]);
  const canReadOnboarding = hasAnyPermission(access.session.user, ["tenants.settings.read"]);
  const canReadPermissionTemplates = hasAnyPermission(access.session.user, ["iam.permissions.read"]);
  const canReadScheduling =
    tenantAllowsFeatures(access.session.tenant, ["SCHEDULING"]) &&
    hasAnyPermission(access.session.user, ["scheduling.self", "scheduling.write", "scheduling.team.write"]);
  const canReadAttendance =
    tenantAllowsFeatures(access.session.tenant, ["ATTENDANCE"]) &&
    hasAnyPermission(access.session.user, ["attendance.self", "attendance.write", "attendance.team.write"]);
  const overview = access.authorized && useTenantCommandCenter
    ? await tryServerApiJson<Record<string, unknown>>("/dashboard/overview")
    : null;

  if (!useTenantCommandCenter) {
    const [selfEmployment, scheduleSummary, mySchedule, attendanceSummary, myAttendance] = access.authorized
      ? await Promise.all([
          tryServerApiJson<MyEmploymentResponse>("/employees/me"),
          canReadScheduling
            ? tryServerApiJson<SchedulingSummary>("/scheduling/summary")
            : Promise.resolve(null),
          canReadScheduling
            ? tryServerApiJson<MyScheduleWorkspace>("/scheduling/my?limit=30")
            : Promise.resolve(null),
          canReadAttendance
            ? tryServerApiJson<AttendanceSummary>("/attendance/summary")
            : Promise.resolve(null),
          canReadAttendance
            ? tryServerApiJson<MyAttendanceWorkspace>("/attendance/my?limit=20")
            : Promise.resolve(null),
        ])
      : [null, null, null, null, null];

    return (
      <ScopedDashboard
        data={null}
        session={access.session}
        profile={profile}
        selfEmployment={selfEmployment}
        scheduleSummary={scheduleSummary}
        mySchedule={mySchedule}
        attendanceSummary={attendanceSummary}
        myAttendance={myAttendance}
      />
    );
  }

  const [
    workforce,
    positions,
    operations,
    risks,
    widgets,
    latestSnapshots,
    onboarding,
    permissionTemplates,
    scheduling,
  ] = access.authorized
    ? await Promise.all([
        tryServerApiJson<Record<string, unknown>>("/dashboard/workforce"),
        tryServerApiJson<Record<string, unknown>>("/dashboard/positions"),
        tryServerApiJson<Record<string, unknown>>("/dashboard/operations"),
        tryServerApiJson<Record<string, unknown>>("/dashboard/risks"),
        tryServerApiJson<Array<Record<string, unknown>>>("/dashboard/widgets"),
        canReadAnalytics
          ? tryServerApiJson<AnalyticsSnapshotList>("/analytics/snapshots/latest")
          : Promise.resolve(null),
        canReadOnboarding
          ? tryServerApiJson<TenantOnboarding>("/tenants/current/onboarding")
          : Promise.resolve(null),
        canReadPermissionTemplates
          ? tryServerApiJson<PermissionTemplate[]>("/iam/permission-templates")
          : Promise.resolve(null),
        canReadScheduling
          ? tryServerApiJson<SchedulingSummary>("/scheduling/summary")
          : Promise.resolve(null),
      ])
    : [null, null, null, null, null, null, null, null, null];

  return (
    <DashboardOverview
      data={overview}
      generatedAt={readGeneratedAt(overview)}
      session={access.session}
      intelligence={{
        workforce,
        positions,
        operations,
        risks,
        widgets: widgets ?? [],
        snapshots: latestSnapshots?.data ?? [],
        scheduling,
      }}
      governance={{
        onboarding,
        permissionTemplates: permissionTemplates ?? [],
      }}
    />
  );
}

function readGeneratedAt(overview: Record<string, unknown> | null) {
  return typeof overview?.generatedAt === "string" ? overview.generatedAt : undefined;
}
