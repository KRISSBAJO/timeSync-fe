export type EmployeeStatus =
  | "PREBOARDING"
  | "ACTIVE"
  | "PROBATION"
  | "SUSPENDED"
  | "SEPARATED"
  | "RETIRED"
  | "ALUMNI"
  | "ARCHIVED";

export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "TEMPORARY"
  | "CONSULTANT"
  | "INTERN"
  | "VOLUNTEER"
  | "SEASONAL"
  | "OUTSOURCED";

export type AssignmentType = "PRIMARY" | "ACTING" | "TEMPORARY" | "MATRIX" | "PROJECT" | "SECONDMENT";

export type WorkforceLeadershipRole =
  | "MANAGER"
  | "SUPERVISOR"
  | "UNIT_HEAD"
  | "DEPARTMENT_HEAD"
  | "PROJECT_LEAD"
  | "HR_BUSINESS_PARTNER"
  | "APPROVER";

export type EmployeeReferenceStatus = "PENDING" | "CONTACTED" | "VERIFIED" | "REJECTED" | "ARCHIVED";

export type EmployeeReferenceType = "PROFESSIONAL" | "EMPLOYMENT" | "ACADEMIC" | "CHARACTER" | "OTHER";

export type EmployeeBackgroundCheckStatus =
  | "NOT_STARTED"
  | "REQUESTED"
  | "IN_PROGRESS"
  | "CLEAR"
  | "REVIEW_REQUIRED"
  | "ADVERSE_ACTION"
  | "CANCELLED"
  | "EXPIRED";

export type EmployeeLifecyclePlanType = "PREBOARDING" | "ONBOARDING" | "CROSSBOARDING" | "OFFBOARDING" | "REHIRE";

export type EmployeeLifecyclePlanStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "ARCHIVED";

export type EmployeeLifecycleTemplateStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type EmployeeLifecycleTaskOwnerType = "EMPLOYEE" | "MANAGER" | "HR" | "IT" | "FINANCE" | "CUSTOM";

export type EmployeeLifecycleTaskStatus = "OPEN" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "WAIVED" | "CANCELLED";

export type EmployeeLifecycleTaskPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type EmployeeStatutoryIdentifierType =
  | "TAX_ID"
  | "NATIONAL_ID"
  | "SOCIAL_SECURITY"
  | "PENSION"
  | "INSURANCE"
  | "HEALTH_INSURANCE"
  | "WORK_PERMIT"
  | "OTHER";

export type EmployeeStatutoryIdentifierStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED"
  | "ARCHIVED";

export type PayoutAccountStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "DISABLED"
  | "ARCHIVED";

export type WorkEligibilityStatus =
  | "NOT_REVIEWED"
  | "PENDING_REVIEW"
  | "AUTHORIZED"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "REJECTED";

export type EmploymentContractType =
  | "PERMANENT"
  | "FIXED_TERM"
  | "CONTRACTOR"
  | "TEMPORARY"
  | "INTERNSHIP"
  | "CONSULTING"
  | "SEASONAL"
  | "VOLUNTEER"
  | "OUTSOURCED"
  | "OTHER";

export type EmploymentTermStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "SUPERSEDED"
  | "ENDED"
  | "CANCELLED"
  | "ARCHIVED";

export type PayFrequency =
  | "HOURLY"
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "SEMIMONTHLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUAL"
  | "PROJECT"
  | "MILESTONE";

export type CompensationComponentType =
  | "BASE_PAY"
  | "ALLOWANCE"
  | "BONUS"
  | "COMMISSION"
  | "STIPEND"
  | "OVERTIME"
  | "DEDUCTION"
  | "OTHER";

export type CompensationChangeStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EFFECTIVE"
  | "SUPERSEDED"
  | "CANCELLED";

export type ReportingRelationshipType =
  | "MANAGER"
  | "SUPERVISOR"
  | "UNIT_HEAD"
  | "DOTTED_LINE"
  | "PROJECT_LEAD"
  | "HR_BUSINESS_PARTNER"
  | "MENTOR"
  | "APPROVER"
  | "OTHER";

export type ReportingRelationshipStatus = "ACTIVE" | "ENDED" | "CANCELLED" | "ARCHIVED";

export type EmployeeExitRecordStatus =
  | "DRAFT"
  | "ACTIVE"
  | "READY_FOR_SEPARATION"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

export type EmployeeClearanceType =
  | "ASSET"
  | "ACCESS"
  | "DOCUMENT"
  | "KNOWLEDGE_TRANSFER"
  | "FINANCE"
  | "BENEFITS"
  | "FACILITIES"
  | "OTHER";

export type EmployeeClearanceStatus = "OPEN" | "IN_PROGRESS" | "CLEARED" | "BLOCKED" | "WAIVED" | "CANCELLED";

export type EmployeeRehirePolicy = "SAME_EMPLOYEE_RECORD" | "NEW_EMPLOYMENT_RECORD";

export type EmployeeRehireRecordStatus = "DRAFT" | "REVIEW" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";

export type WorkforcePerson = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  preferredName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  nationalityId?: string | null;
  nationality?: {
    id: string;
    name: string;
    iso2?: string | null;
    iso3?: string | null;
  } | null;
  photoUrl?: string | null;
  signatureUrl?: string | null;
  bloodGroup?: string | null;
  disabilityStatus?: string | null;
  veteranStatus?: string | null;
  bio?: string | null;
  contacts?: WorkforcePersonContact[];
  addresses?: WorkforcePersonAddress[];
  emergencyContacts?: WorkforceEmergencyContact[];
  demographicProfile?: WorkforceDemographicProfile | null;
};

export type WorkforcePersonContact = {
  id: string;
  type: string;
  value: string;
  label?: string | null;
  isPrimary?: boolean | null;
  verifiedAt?: string | null;
};

export type WorkforcePersonAddress = {
  id: string;
  type?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countryId?: string | null;
  country?: {
    id: string;
    name: string;
    iso2?: string | null;
  } | null;
  isPrimary?: boolean | null;
};

export type WorkforceEmergencyContact = {
  id: string;
  name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary?: boolean | null;
};

export type WorkforceDemographicProfile = {
  id: string;
  pronouns?: string | null;
  genderIdentity?: string | null;
  sexAssignedAtBirth?: string | null;
  sexualOrientation?: string | null;
  race?: string | null;
  preferredLanguageCode?: string | null;
  primaryLanguageCode?: string | null;
  ethnicity?: string | null;
  ethnicityDetail?: string | null;
  religion?: string | null;
  religionDetail?: string | null;
  demographicCountryId?: string | null;
  demographicCountry?: {
    id: string;
    name: string;
    iso2?: string | null;
  } | null;
  caregiverStatus?: string | null;
  disabilityAccommodation?: string | null;
  accommodationRequired?: boolean | null;
  veteranCategory?: string | null;
  consentSource?: string | null;
  consentNote?: string | null;
  consentGivenAt?: string | null;
  consentWithdrawnAt?: string | null;
  verifiedAt?: string | null;
  verifiedById?: string | null;
};

export type WorkforceUser = {
  id: string;
  email: string;
  username?: string | null;
  status?: string | null;
};

export type WorkforceAssignment = {
  id: string;
  employeeId?: string | null;
  type?: AssignmentType | null;
  positionId?: string | null;
  organizationNodeId?: string | null;
  costCenterId?: string | null;
  managerEmployeeId?: string | null;
  supervisorEmployeeId?: string | null;
  unitHeadEmployeeId?: string | null;
  gradeId?: string | null;
  levelId?: string | null;
  isPrimary?: boolean | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  reason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  position?: {
    id: string;
    code?: string | null;
    title?: string | null;
  } | null;
  organizationNode?: {
    id: string;
    code?: string | null;
    name?: string | null;
    type?: string | null;
  } | null;
  costCenter?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
  managerEmployee?: {
    id: string;
    employeeNumber?: string | null;
    person?: Pick<WorkforcePerson, "id" | "firstName" | "lastName" | "preferredName"> | null;
  } | null;
  supervisorEmployee?: {
    id: string;
    employeeNumber?: string | null;
    person?: Pick<WorkforcePerson, "id" | "firstName" | "lastName" | "preferredName"> | null;
  } | null;
  unitHeadEmployee?: {
    id: string;
    employeeNumber?: string | null;
    person?: Pick<WorkforcePerson, "id" | "firstName" | "lastName" | "preferredName"> | null;
  } | null;
  grade?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
  level?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
};

export type WorkforceLeadershipDesignation = {
  id: string;
  employeeId: string;
  role: WorkforceLeadershipRole;
  organizationNodeId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  reason?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  organizationNode?: {
    id: string;
    code?: string | null;
    name?: string | null;
    type?: string | null;
  } | null;
};

export type EmployeeListItem = {
  id: string;
  employeeNumber: string;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  hireDate?: string | null;
  confirmationDate?: string | null;
  endDate?: string | null;
  separationReason?: string | null;
  source?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  person: WorkforcePerson;
  user?: WorkforceUser | null;
  assignments?: WorkforceAssignment[];
  leadershipDesignations?: WorkforceLeadershipDesignation[];
};

export type WorkforceActionStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type WorkforceActionType =
  | "HIRE"
  | "CONFIRMATION"
  | "TRANSFER"
  | "PROMOTION"
  | "DEMOTION"
  | "SECONDMENT"
  | "ACTING_ASSIGNMENT"
  | "SUSPENSION"
  | "REINSTATEMENT"
  | "SEPARATION"
  | "RETIREMENT"
  | "REHIRE"
  | "PROFILE_CHANGE"
  | "POSITION_CHANGE"
  | "MANAGER_CHANGE";

export type WorkforceAction = {
  id: string;
  type: WorkforceActionType;
  status: WorkforceActionStatus;
  effectiveDate?: string | null;
  reason?: string | null;
  previousState?: Record<string, unknown> | null;
  proposedState?: Record<string, unknown> | null;
  finalState?: Record<string, unknown> | null;
  completedAt?: string | null;
  createdAt: string;
  history?: Array<{
    id: string;
    status: WorkforceActionStatus;
    note?: string | null;
    createdAt: string;
  }>;
};

export type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
};

export type EmployeeDependent = {
  id: string;
  fullName: string;
  relationship: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  taxDependent: boolean;
  benefitEligible: boolean;
  isStudent: boolean;
  isDisabled: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type EmployeeReference = {
  id: string;
  type?: EmployeeReferenceType | null;
  name: string;
  relationship?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  yearsKnown?: number | null;
  status: EmployeeReferenceStatus;
  note?: string | null;
  verifiedAt?: string | null;
};

export type EmployeeReferenceDocument = {
  id: string;
  referenceId?: string | null;
  documentId?: string | null;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  checksum?: string | null;
  verificationStatus: "NOT_REQUIRED" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  createdAt?: string | null;
};

export type EmployeeBackgroundCheck = {
  id: string;
  provider?: string | null;
  packageName?: string | null;
  status: EmployeeBackgroundCheckStatus;
  requestedAt?: string | null;
  completedAt?: string | null;
  expiresAt?: string | null;
  adjudicatedAt?: string | null;
  resultSummary?: string | null;
  reportUrl?: string | null;
};

export type EmployeePayoutAccount = {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountType?: string | null;
  countryId?: string | null;
  currencyCode?: string | null;
  accountNumberLast4?: string | null;
  routingNumberLast4?: string | null;
  ibanLast4?: string | null;
  swiftCode?: string | null;
  allocationPercent: number;
  isPrimary: boolean;
  status: PayoutAccountStatus;
  verifiedAt?: string | null;
  country?: {
    id: string;
    name: string;
    iso2?: string | null;
  } | null;
};

export type EmployeeStatutoryIdentifier = {
  id: string;
  type: EmployeeStatutoryIdentifierType;
  label?: string | null;
  countryId?: string | null;
  identifierLast4?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  status: EmployeeStatutoryIdentifierStatus;
  note?: string | null;
  verifiedAt?: string | null;
  country?: {
    id: string;
    name: string;
    iso2?: string | null;
  } | null;
};

export type EmployeeWorkEligibility = {
  id: string;
  status: WorkEligibilityStatus;
  workCountryId?: string | null;
  taxCountryId?: string | null;
  workPermitRequired: boolean;
  permitType?: string | null;
  permitNumber?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  note?: string | null;
  verifiedAt?: string | null;
  workCountry?: {
    id: string;
    name: string;
    iso2?: string | null;
  } | null;
  taxCountry?: {
    id: string;
    name: string;
    iso2?: string | null;
  } | null;
};

export type EmployeeEmploymentTerm = {
  id: string;
  contractType: EmploymentContractType;
  status: EmploymentTermStatus;
  title?: string | null;
  reference?: string | null;
  payFrequency?: PayFrequency | null;
  currencyCode?: string | null;
  baseAmount?: string | number | null;
  gradeId?: string | null;
  levelId?: string | null;
  positionId?: string | null;
  organizationNodeId?: string | null;
  costCenterId?: string | null;
  documentId?: string | null;
  workflowRequestId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;
  grade?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
  level?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
  position?: {
    id: string;
    code?: string | null;
    title?: string | null;
  } | null;
  organizationNode?: {
    id: string;
    code?: string | null;
    name?: string | null;
    type?: string | null;
  } | null;
  costCenter?: {
    id: string;
    code?: string | null;
    name?: string | null;
  } | null;
};

export type EmployeeCompensationComponent = {
  id: string;
  termId?: string | null;
  type: CompensationComponentType;
  name: string;
  amount?: string | number | null;
  currencyCode?: string | null;
  frequency?: PayFrequency | null;
  taxable: boolean;
  status: CompensationChangeStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt?: string | null;
};

export type EmployeeCompensationChange = {
  id: string;
  termId?: string | null;
  status: CompensationChangeStatus;
  effectiveDate: string;
  reason?: string | null;
  previousState?: Record<string, unknown> | null;
  proposedState: Record<string, unknown>;
  finalState?: Record<string, unknown> | null;
  workflowRequestId?: string | null;
  approvedAt?: string | null;
  appliedAt?: string | null;
  createdAt?: string | null;
};

export type EmployeeReportingRelationship = {
  id: string;
  employeeId: string;
  relatedEmployeeId: string;
  type: ReportingRelationshipType;
  status: ReportingRelationshipStatus;
  organizationNodeId?: string | null;
  positionId?: string | null;
  startsAt: string;
  endsAt?: string | null;
  reason?: string | null;
  relatedEmployee?: {
    id: string;
    employeeNumber?: string | null;
    person?: Pick<WorkforcePerson, "id" | "firstName" | "lastName" | "preferredName"> | null;
    leadershipDesignations?: WorkforceLeadershipDesignation[];
  } | null;
  organizationNode?: {
    id: string;
    code?: string | null;
    name?: string | null;
    type?: string | null;
  } | null;
  position?: {
    id: string;
    code?: string | null;
    title?: string | null;
  } | null;
};

export type EmployeeLifecycleTask = {
  id: string;
  planId: string;
  employeeId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  ownerType: EmployeeLifecycleTaskOwnerType;
  assignedUserId?: string | null;
  assignedEmployeeId?: string | null;
  status: EmployeeLifecycleTaskStatus;
  priority: EmployeeLifecycleTaskPriority;
  dueAt?: string | null;
  completedAt?: string | null;
  blockedReason?: string | null;
  instructions?: string | null;
  evidence?: Record<string, unknown> | null;
  createdAt?: string | null;
  plan?: {
    id: string;
    type: EmployeeLifecyclePlanType;
    status: EmployeeLifecyclePlanStatus;
    title: string;
  } | null;
  assignedUser?: WorkforceUser | null;
  completedBy?: WorkforceUser | null;
  assignedEmployee?: {
    id: string;
    employeeNumber?: string | null;
    person?: Pick<WorkforcePerson, "id" | "firstName" | "lastName" | "preferredName"> | null;
  } | null;
};

export type EmployeeLifecyclePlan = {
  id: string;
  employeeId: string;
  type: EmployeeLifecyclePlanType;
  status: EmployeeLifecyclePlanStatus;
  title: string;
  description?: string | null;
  startsAt?: string | null;
  targetDate?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string | null;
  tasks?: EmployeeLifecycleTask[];
};

export type EmployeeLifecycleTemplateTask = {
  id: string;
  templateId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  ownerType: EmployeeLifecycleTaskOwnerType;
  priority: EmployeeLifecycleTaskPriority;
  sortOrder: number;
  dueOffsetDays?: number | null;
  requiresDocument: boolean;
  documentTypeId?: string | null;
  instructions?: string | null;
  createdAt?: string | null;
  documentType?: {
    id: string;
    code: string;
    name: string;
    requiresExpiry?: boolean | null;
    requiresVerification?: boolean | null;
  } | null;
};

export type EmployeeLifecycleTemplate = {
  id: string;
  tenantId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  type: EmployeeLifecyclePlanType;
  status: EmployeeLifecycleTemplateStatus;
  targetDays?: number | null;
  isSystem?: boolean | null;
  createdAt?: string | null;
  tasks?: EmployeeLifecycleTemplateTask[];
};

export type EmployeeClearanceItem = {
  id: string;
  tenantId?: string;
  exitRecordId: string;
  employeeId: string;
  type: EmployeeClearanceType;
  status: EmployeeClearanceStatus;
  title: string;
  description?: string | null;
  ownerUserId?: string | null;
  ownerEmployeeId?: string | null;
  assetTag?: string | null;
  systemName?: string | null;
  dueAt?: string | null;
  clearedAt?: string | null;
  blockedReason?: string | null;
  evidence?: Record<string, unknown> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  ownerUser?: WorkforceUser | null;
  ownerEmployee?: {
    id: string;
    employeeNumber?: string | null;
    person?: Pick<WorkforcePerson, "id" | "firstName" | "lastName" | "preferredName"> | null;
  } | null;
  clearedBy?: WorkforceUser | null;
};

export type EmployeeRehireRecord = {
  id: string;
  tenantId?: string;
  employeeId: string;
  exitRecordId?: string | null;
  newEmployeeId?: string | null;
  policy: EmployeeRehirePolicy;
  status: EmployeeRehireRecordStatus;
  requestedAt?: string | null;
  effectiveDate?: string | null;
  reason?: string | null;
  decisionNote?: string | null;
  approvedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  approvedBy?: WorkforceUser | null;
  createdBy?: WorkforceUser | null;
  newEmployee?: {
    id: string;
    employeeNumber?: string | null;
    person?: Pick<WorkforcePerson, "id" | "firstName" | "lastName" | "preferredName"> | null;
  } | null;
};

export type EmployeeExitRecord = {
  id: string;
  tenantId?: string;
  employeeId: string;
  lifecyclePlanId?: string | null;
  status: EmployeeExitRecordStatus;
  separationType?: string | null;
  separationReason?: string | null;
  noticeDate?: string | null;
  lastWorkingDate?: string | null;
  separationDate?: string | null;
  eligibleForRehire?: boolean | null;
  rehireRecommendation?: string | null;
  exitInterviewCompleted: boolean;
  finalDocumentCollectionStatus: EmployeeClearanceStatus;
  assetClearanceStatus: EmployeeClearanceStatus;
  accessClearanceStatus: EmployeeClearanceStatus;
  accessCutoffAt?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  lifecyclePlan?: {
    id: string;
    type: EmployeeLifecyclePlanType;
    status: EmployeeLifecyclePlanStatus;
    title: string;
    targetDate?: string | null;
  } | null;
  clearanceItems?: EmployeeClearanceItem[];
  rehireRecords?: EmployeeRehireRecord[];
  createdBy?: WorkforceUser | null;
  updatedBy?: WorkforceUser | null;
  completedBy?: WorkforceUser | null;
};

export type EmployeeGovernanceSnapshot = {
  employeeId: string;
  employeeNumber: string;
  generatedAt: string;
  fieldAccess: {
    sensitiveData: "VISIBLE" | "MASKED";
    identity: { read: boolean; write: boolean };
    payout: { read: boolean; write: boolean; masked: boolean };
    statutory: { read: boolean; write: boolean; masked: boolean };
    exit: { read: boolean; write: boolean };
  };
  readiness: EmployeeMasterDataReadiness;
  compliance: {
    score: number;
    lifecycleCompletionPercent: number;
    exitClearancePercent: number;
    documentCounts: Record<string, number>;
    outboxCounts: Record<string, number>;
  };
  activeExit?: EmployeeExitRecord | null;
  sensitiveProfile: {
    payoutAccounts: Array<{
      id: string;
      bankName: string;
      accountHolderName?: string | null;
      accountNumberLast4?: string | null;
      routingNumberLast4?: string | null;
      ibanLast4?: string | null;
      currencyCode?: string | null;
      status: PayoutAccountStatus;
      isPrimary: boolean;
    }>;
    statutoryIdentifiers: Array<{
      id: string;
      type: EmployeeStatutoryIdentifierType;
      label?: string | null;
      country?: string | null;
      identifierLast4?: string | null;
      status: EmployeeStatutoryIdentifierStatus;
      expiresAt?: string | null;
    }>;
  };
  recentAudit: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    createdAt: string;
    actor?: WorkforceUser | null;
  }>;
  recentTimeline: TimelineEvent[];
  importHistory: Array<{
    id: string;
    jobId: string;
    line: number;
    status: string;
    employeeNumber?: string | null;
    processedAt?: string | null;
  }>;
  qualitySignals: {
    missingFields: EmployeeMasterDataReadiness["missing"];
    openLifecycleTasks: number;
    blockedLifecycleTasks: number;
    openClearanceItems: number;
  };
};

export type EmployeeDetails = EmployeeListItem & {
  workforceActions?: WorkforceAction[];
  timelineEvents?: TimelineEvent[];
  dependents?: EmployeeDependent[];
  references?: EmployeeReference[];
  referenceDocuments?: EmployeeReferenceDocument[];
  backgroundChecks?: EmployeeBackgroundCheck[];
  payoutAccounts?: EmployeePayoutAccount[];
  statutoryIdentifiers?: EmployeeStatutoryIdentifier[];
  workEligibility?: EmployeeWorkEligibility | null;
  employmentTerms?: EmployeeEmploymentTerm[];
  compensationComponents?: EmployeeCompensationComponent[];
  compensationChanges?: EmployeeCompensationChange[];
  reportingRelationships?: EmployeeReportingRelationship[];
  lifecyclePlans?: EmployeeLifecyclePlan[];
  lifecycleTasks?: EmployeeLifecycleTask[];
  exitRecords?: EmployeeExitRecord[];
  clearanceItems?: EmployeeClearanceItem[];
  rehireRecords?: EmployeeRehireRecord[];
  masterDataReadiness?: EmployeeMasterDataReadiness;
};

export type EmployeeMasterDataReadiness = {
  completed: number;
  total: number;
  completionPercent: number;
  missing: Array<{
    key: string;
    label: string;
  }>;
  groups: Record<
    "identity" | "employment" | "assignment" | "contacts" | "compliance",
    {
      completed: number;
      total: number;
      completionPercent: number;
      missing: Array<{
        key: string;
        label: string;
      }>;
    }
  >;
};

export type EmployeeSelfServiceDocument = {
  id: string;
  title: string;
  description?: string | null;
  visibility: "PRIVATE" | "HR_ONLY" | "MANAGER_VISIBLE" | "EMPLOYEE_VISIBLE" | "PUBLIC_INTERNAL";
  verificationStatus: "NOT_REQUIRED" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  expiresAt?: string | null;
  createdAt?: string | null;
  documentType?: {
    id: string;
    code: string;
    name: string;
  } | null;
  currentVersion?: {
    id: string;
    versionNo: number;
    fileName: string;
    fileUrl: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    createdAt?: string | null;
  } | null;
  versions?: Array<{
    id: string;
    versionNo: number;
    fileName: string;
    fileUrl: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    createdAt?: string | null;
  }>;
};

export type EmployeeSelfServiceProfile = EmployeeDetails & {
  documents?: EmployeeSelfServiceDocument[];
};

export type MyEmploymentResponse = {
  employee: EmployeeSelfServiceProfile | null;
  scope: "SELF" | "UNLINKED";
};

export type PaginatedEmployees = {
  data: EmployeeListItem[];
  page: {
    limit: number;
    total?: number;
    nextCursor?: string | null;
  };
};

export type EmployeeSummary = {
  total: number;
  activeWorkforce: number;
  recentHires: number;
  recentSeparations: number;
  byStatus: Partial<Record<EmployeeStatus, number>>;
  byEmploymentType: Partial<Record<EmploymentType, number>>;
};

export type EmployeeNumberPreview = {
  employeeNumber: string;
  prefix: string;
  nextSequence: number;
};

export type EmployeeImportBatch = {
  id: string;
  status?: "QUEUED" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED" | "CANCELLED";
  rows: number;
  processed?: number;
  created: number;
  failed?: number;
  skipped?: number;
  employeeIds: string[];
  committedAt: string;
  queuedAt?: string;
  completedAt?: string | null;
  committedBy?: {
    id: string;
    email: string;
    username?: string | null;
  } | null;
};

export type PaginatedEmployeeImportBatches = {
  data: EmployeeImportBatch[];
  page: {
    limit: number;
    nextCursor?: string | null;
  };
};
