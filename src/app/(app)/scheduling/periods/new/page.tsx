import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { CreatePeriodForm } from "@/components/scheduling/scheduling-action-forms";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type NewSchedulePeriodPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewSchedulePeriodPage({ searchParams }: NewSchedulePeriodPageProps) {
  const params = await searchParams;
  const session = await requireServerSession("/scheduling/periods/new");
  const canTenantSchedule = hasAnyPermission(session.user, ["scheduling.write"]);

  if (!canTenantSchedule) {
    return (
      <AccessDeniedPanel
        title="You do not have access to schedule periods."
        body="Schedule period creation is a tenant scheduling control reserved for HR and administrators."
      />
    );
  }

  return <CreatePeriodForm returnTo={safeReturnTo(readParam(params.returnTo))} today={todayKey()} />;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function safeReturnTo(value: string) {
  return value.startsWith("/scheduling") ? value : "/scheduling?tab=open&view=WEEK&employeeId=&employeeSearch=&from=&to=&status=&organizationNodeId=&costCenterId=&positionId=&locationName=";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
