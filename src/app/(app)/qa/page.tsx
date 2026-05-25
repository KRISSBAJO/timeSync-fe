import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { QaCommandCenter } from "@/components/qa/qa-command-center";
import { tryServerApiJson } from "@/lib/api/server";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/session";
import type { QaRunListItem, QaScriptSummary } from "@/lib/qa/types";

export const dynamic = "force-dynamic";

const QA_ACCESS = ["qa.read", "qa.run"] as const;

export default async function QaPage() {
  const session = await requireServerSession("/qa");
  const authorized = hasAnyPermission(session.user, QA_ACCESS);

  if (!authorized) {
    return (
      <AccessDeniedPanel
        title="QA Console is not available for this role."
        body="Script execution is limited to tenant administrators or platform operators with QA permissions."
      />
    );
  }

  const [scripts, runs] = await Promise.all([
    tryServerApiJson<QaScriptSummary[]>("/qa/scripts"),
    tryServerApiJson<QaRunListItem[]>("/qa/runs?limit=25"),
  ]);

  if (!scripts) {
    return (
      <AccessDeniedPanel
        title="QA Console is not ready yet."
        body="The backend QA runner must be available before scripts can be launched from the workspace."
      />
    );
  }

  return <QaCommandCenter session={session} scripts={scripts} runs={runs ?? []} />;
}

