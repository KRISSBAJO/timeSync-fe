import { CreateActionCenter } from "@/components/create/create-action-center";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const CREATE_PERMISSIONS = [
  "persons.write",
  "employees.write",
  "organization.write",
  "positions.write",
  "workflows.write",
  "documents.write",
  "notifications.write",
  "iam.roles.write",
  "platform.tenants.manage",
] as const;

export default async function CreatePage() {
  const session = await requireServerSession("/create");
  const profile = accessProfileForUser(session.user);

  if (!profile.canUseAdminCreate || !hasAnyPermission(session.user, CREATE_PERMISSIONS)) {
    return (
      <div className="rounded-lg border border-[#ffdcb5] bg-[#fff8ed] p-6">
        <p className="text-sm font-black uppercase text-[#c76a00]">Admin action required</p>
        <h2 className="mt-2 text-2xl font-black text-[#121a46]">Create actions are not available for this role.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5d6782]">
          Employees and standard managers use self-service and assigned task workflows. HR, tenant admins, and platform admins can access governed create actions.
        </p>
      </div>
    );
  }

  return <CreateActionCenter session={session} />;
}
