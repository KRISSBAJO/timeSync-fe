import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { IamSecurityCenter } from "@/components/iam/iam-security-center";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type { Permission, PermissionBootstrapStatus, PermissionTemplate, Role } from "@/lib/iam/types";

export const dynamic = "force-dynamic";

export default async function IamPage() {
  const session = await requireServerSession("/iam");
  const profile = accessProfileForUser(session.user);

  if (!profile.isPlatform && !profile.isTenantAdmin) {
    return (
      <AccessDeniedPanel
        title="IAM administration is not available for this role."
        body="Role, permission, and user administration is limited to tenant admins and platform operators."
      />
    );
  }

  const canReadRoles = hasAnyPermission(session.user, ["iam.roles.read"]);
  const canReadPermissions = hasAnyPermission(session.user, ["iam.permissions.read"]);
  const canWriteRoles = hasAnyPermission(session.user, ["iam.roles.write"]);

  const [roles, permissions, permissionTemplates, permissionBootstrapStatus] = await Promise.all([
    canReadRoles ? tryServerApiJson<Role[]>("/iam/roles") : Promise.resolve(null),
    canReadPermissions ? tryServerApiJson<Permission[]>("/iam/permissions") : Promise.resolve(null),
    canReadPermissions
      ? tryServerApiJson<PermissionTemplate[]>("/iam/permission-templates")
      : Promise.resolve(null),
    profile.isPlatform
      ? tryServerApiJson<PermissionBootstrapStatus>("/iam/permissions/bootstrap")
      : Promise.resolve(null),
  ]);

  return (
    <IamSecurityCenter
      roles={roles ?? []}
      permissions={permissions ?? []}
      permissionTemplates={permissionTemplates ?? []}
      canWriteRoles={canWriteRoles}
      isPlatform={profile.isPlatform}
      permissionBootstrapStatus={permissionBootstrapStatus}
    />
  );
}
