export type DocumentVisibility =
  | "PRIVATE"
  | "HR_ONLY"
  | "MANAGER_VISIBLE"
  | "EMPLOYEE_VISIBLE"
  | "PUBLIC_INTERNAL";

export type DocumentVerificationStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

export type DocumentType = {
  id: string;
  tenantId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  requiresExpiry: boolean;
  requiresVerification: boolean;
};

export type DocumentEmployee = {
  id: string;
  employeeNumber: string;
  person: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    preferredName?: string | null;
    photoUrl?: string | null;
  };
};

export type DocumentVersion = {
  id: string;
  versionNo: number;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  checksum?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  uploadedBy?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
};

export type DocumentRecord = {
  id: string;
  tenantId: string;
  employeeId?: string | null;
  documentTypeId?: string | null;
  title: string;
  description?: string | null;
  visibility: DocumentVisibility;
  verificationStatus: DocumentVerificationStatus;
  currentVersionId?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: DocumentEmployee | null;
  documentType?: DocumentType | null;
  currentVersion?: DocumentVersion | null;
  versions?: DocumentVersion[];
  _count?: {
    versions: number;
  };
};

export type DocumentSummary = {
  totalDocuments: number;
  missingCurrentVersion: number;
  expiredDocuments: number;
  expiringSoon: number;
  employeesWithoutDocuments: number;
  byVerificationStatus: Partial<Record<DocumentVerificationStatus, number>>;
  byVisibility: Partial<Record<DocumentVisibility, number>>;
  byDocumentType: Array<{
    documentTypeId: string | null;
    count: number;
  }>;
};

export type DocumentCompliance = DocumentSummary & {
  asOf: string;
  expiresWithinDays: number;
  issues: Array<{
    document: DocumentRecord;
    issueCodes: string[];
  }>;
};

export type PaginatedDocuments = {
  data: DocumentRecord[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};

export type PaginatedDocumentTypes = {
  data: DocumentType[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};
