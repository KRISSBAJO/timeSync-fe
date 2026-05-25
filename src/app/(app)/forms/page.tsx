import { FormsCommandCenter } from "@/components/forms/forms-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerPermissions } from "@/lib/auth/session";
import type { FormAssignment, PaginatedForms } from "@/lib/forms/types";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  const access = await requireServerPermissions(["dashboard.read"], "/forms");
  const canReadForms = hasAnyPermission(access.session.user, ["forms.read"]);
  const canWriteForms = hasAnyPermission(access.session.user, ["forms.write"]);

  const [assignments, forms] = access.authorized
    ? await Promise.all([
        tryServerApiJson<FormAssignment[]>("/forms/my/assignments?limit=50"),
        canReadForms
          ? tryServerApiJson<PaginatedForms>("/forms?limit=50")
          : Promise.resolve(null),
      ])
    : [[], null];

  return (
    <FormsCommandCenter
      user={access.session.user}
      assignments={assignments ?? []}
      forms={forms}
      canReadForms={canReadForms}
      canWriteForms={canWriteForms}
    />
  );
}
