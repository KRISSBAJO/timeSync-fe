import { AccessDeniedPanel } from "@/components/app/access-denied-panel";
import { DocumentComplianceCenter } from "@/components/documents/document-compliance-center";
import { tryServerApiJson } from "@/lib/api/server";
import { accessProfileForUser } from "@/lib/auth/access-profile";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireServerPermissions } from "@/lib/auth/session";
import type {
  DocumentCompliance,
  DocumentRecord,
  DocumentVersion,
  PaginatedDocumentTypes,
  PaginatedDocuments,
} from "@/lib/documents/types";

export const dynamic = "force-dynamic";

type DocumentsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const params = await searchParams;
  const filters = {
    search: readParam(params.search),
    verificationStatus: readParam(params.verificationStatus),
    visibility: readParam(params.visibility),
    expiredOnly: readParam(params.expiredOnly),
  };
  const selectedDocumentId = readParam(params.document);
  const access = await requireServerPermissions(["documents.read"], "/documents");
  const profile = accessProfileForUser(access.session.user);

  if (!profile.canUseTenantCommandCenter && !profile.isManager) {
    return (
      <AccessDeniedPanel
        title="Document administration is not available for this role."
        body="Employee document self-service should be exposed through a personal profile surface, while this compliance center stays limited to HR, managers, and tenant administrators."
      />
    );
  }

  const documentQuery = buildDocumentQuery(filters);
  const canWriteDocuments = hasAnyPermission(access.session.user, ["documents.write"]);
  const canVerifyDocuments = hasAnyPermission(access.session.user, ["documents.verify"]);

  const [documents, compliance, expiring, documentTypes, selectedDocument, selectedVersions] = access.authorized
    ? await Promise.all([
        tryServerApiJson<PaginatedDocuments>(`/documents?${documentQuery}`),
        tryServerApiJson<DocumentCompliance>("/documents/compliance?expiresWithinDays=60"),
        tryServerApiJson<DocumentRecord[]>("/documents/expiring?expiresWithinDays=60"),
        tryServerApiJson<PaginatedDocumentTypes>("/documents/types?limit=50"),
        selectedDocumentId ? tryServerApiJson<DocumentRecord>(`/documents/${selectedDocumentId}`) : Promise.resolve(null),
        selectedDocumentId ? tryServerApiJson<DocumentVersion[]>(`/documents/${selectedDocumentId}/versions`) : Promise.resolve(null),
      ])
    : [null, null, null, null, null, null];

  return (
    <DocumentComplianceCenter
      documents={documents}
      compliance={compliance}
      expiring={expiring}
      documentTypes={documentTypes}
      selectedDocument={selectedDocument}
      selectedVersions={selectedVersions}
      filters={filters}
      permissions={{
        canWriteDocuments,
        canVerifyDocuments,
      }}
    />
  );
}

function buildDocumentQuery(filters: DocumentFilters) {
  const params = new URLSearchParams({ limit: "50" });

  if (filters.search) params.set("search", filters.search);
  if (filters.verificationStatus) params.set("verificationStatus", filters.verificationStatus);
  if (filters.visibility) params.set("visibility", filters.visibility);
  if (filters.expiredOnly) params.set("expiredOnly", "true");

  return params.toString();
}

type DocumentFilters = {
  search: string;
  verificationStatus: string;
  visibility: string;
  expiredOnly: string;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
