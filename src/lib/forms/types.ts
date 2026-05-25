export type FormStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type FormQuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DATE"
  | "YES_NO"
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "DROPDOWN"
  | "RATING";

export type FormAssignmentStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "CANCELLED"
  | "EXPIRED";

export type FormQuestionOption = {
  value: string;
  label: string;
};

export type FormQuestion = {
  id: string;
  formId: string;
  order: number;
  type: FormQuestionType;
  title: string;
  description?: string | null;
  required: boolean;
  options?: FormQuestionOption[] | null;
  validation?: Record<string, unknown> | null;
};

export type WorkforceForm = {
  id: string;
  tenantId: string;
  code?: string | null;
  title: string;
  description?: string | null;
  status: FormStatus;
  anonymous: boolean;
  allowMultipleResponses: boolean;
  closesAt?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  questions?: FormQuestion[];
  _count?: {
    questions?: number;
    assignments?: number;
    responses?: number;
  };
};

export type FormAssignment = {
  id: string;
  tenantId: string;
  formId: string;
  employeeId?: string | null;
  userId?: string | null;
  status: FormAssignmentStatus;
  dueAt?: string | null;
  sentAt?: string | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  form: WorkforceForm & {
    questions: FormQuestion[];
  };
};

export type PaginatedForms = {
  data: WorkforceForm[];
  nextCursor?: string | null;
};

export type FormQuestionSummary = {
  questionId: string;
  title: string;
  type: FormQuestionType;
  required: boolean;
  responseCount: number;
  optionCounts: Record<string, number>;
  average: number | null;
};

export type FormResponseSummary = {
  form: {
    id: string;
    title: string;
    status: FormStatus;
    anonymous: boolean;
    allowMultipleResponses: boolean;
  };
  totals: {
    questions: number;
    assignments: number;
    responses: number;
    submittedAssignments: number;
  };
  assignmentStatus: Array<{
    status: FormAssignmentStatus;
    count: number;
  }>;
  questions: FormQuestionSummary[];
};
