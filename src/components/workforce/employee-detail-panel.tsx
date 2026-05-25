"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  Clock3,
  ClipboardCheck,
  FileCheck2,
  GitBranch,
  History,
  HeartPulse,
  Landmark,
  Loader2,
  Mail,
  Save,
  PauseCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserRoundCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import {
  EmployeeAssignmentEditor,
  type AssignmentCatalogs,
} from "@/components/workforce/employee-assignment-editor";
import type {
  EmployeeDetails,
  EmployeeClearanceStatus,
  EmployeeClearanceType,
  EmployeeGovernanceSnapshot,
  CompensationChangeStatus,
  CompensationComponentType,
  EmploymentContractType,
  EmploymentTermStatus,
  EmployeeListItem,
  EmployeeLifecyclePlan,
  EmployeeLifecycleTemplate,
  EmployeeLifecycleTask,
  EmployeeRehirePolicy,
  EmployeeRehireRecordStatus,
  EmployeeStatus,
  PayFrequency,
  ReportingRelationshipType,
  TimelineEvent,
  WorkforceAction,
  WorkforceAssignment,
  WorkforceLeadershipRole,
  WorkforcePerson,
} from "@/lib/workforce/types";

const contractTypes: EmploymentContractType[] = ["PERMANENT", "FIXED_TERM", "CONTRACTOR", "TEMPORARY", "INTERNSHIP", "CONSULTING", "SEASONAL", "OUTSOURCED", "OTHER"];
const employmentTermStatuses: EmploymentTermStatus[] = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "SUPERSEDED", "ENDED", "CANCELLED", "ARCHIVED"];
const payFrequencies: PayFrequency[] = ["HOURLY", "DAILY", "WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY", "QUARTERLY", "ANNUAL", "PROJECT", "MILESTONE"];
const componentTypes: CompensationComponentType[] = ["BASE_PAY", "ALLOWANCE", "BONUS", "COMMISSION", "STIPEND", "OVERTIME", "DEDUCTION", "OTHER"];
const compensationChangeStatuses: CompensationChangeStatus[] = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "EFFECTIVE", "SUPERSEDED", "CANCELLED"];
const reportingTypes: ReportingRelationshipType[] = ["MANAGER", "SUPERVISOR", "UNIT_HEAD", "DOTTED_LINE", "PROJECT_LEAD", "HR_BUSINESS_PARTNER", "MENTOR", "APPROVER", "OTHER"];
const clearanceTypes: EmployeeClearanceType[] = ["ASSET", "ACCESS", "DOCUMENT", "KNOWLEDGE_TRANSFER", "FINANCE", "BENEFITS", "FACILITIES", "OTHER"];
const clearanceStatuses: EmployeeClearanceStatus[] = ["OPEN", "IN_PROGRESS", "CLEARED", "BLOCKED", "WAIVED", "CANCELLED"];
const rehirePolicies: EmployeeRehirePolicy[] = ["SAME_EMPLOYEE_RECORD", "NEW_EMPLOYMENT_RECORD"];
const rehireStatuses: EmployeeRehireRecordStatus[] = ["DRAFT", "REVIEW", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];
const pronounOptions = ["She/her", "He/him", "They/them", "She/they", "He/they", "Prefer not to say", "Self describe"];
const languageOptions = ["en", "fr", "es", "pt", "ar", "sw", "yo", "ig", "ha", "am", "zu", "xh", "af"];
const raceOptions = ["Black or African descent", "Asian", "White", "Middle Eastern or North African", "Indigenous", "Mixed or multiple groups", "Prefer not to say", "Self describe"];
const ethnicityOptions = ["Yoruba", "Igbo", "Hausa", "Fulani", "Akan", "Amhara", "Oromo", "Somali", "Zulu", "Xhosa", "Mixed heritage", "Prefer not to say", "Self describe"];
const religionOptions = ["Christianity", "Islam", "Hinduism", "Buddhism", "Judaism", "Traditional or indigenous faith", "No religion", "Prefer not to say", "Self describe"];
const genderIdentityOptions = ["Woman", "Man", "Non-binary", "Gender diverse", "Prefer not to say", "Self describe"];
const sexAssignedOptions = ["Female", "Male", "Intersex", "Prefer not to say"];
const sexualOrientationOptions = ["Heterosexual", "Gay or lesbian", "Bisexual", "Queer", "Asexual", "Prefer not to say", "Self describe"];
const disabilityDisclosureOptions = ["Not disclosed", "No disclosed disability", "Disability disclosed", "Prefer not to say"];
const accommodationStatusOptions = ["No accommodation requested", "Accommodation requested", "Accommodation approved", "Accommodation declined", "Prefer not to say"];
const veteranStatusOptions = ["Not applicable", "Non-veteran", "Veteran", "Reservist", "Military spouse", "Prefer not to say"];
const veteranCategoryOptions = ["Not applicable", "Protected veteran", "Disabled veteran", "Recently separated veteran", "Armed forces service medal veteran", "Prefer not to say"];
const caregiverStatusOptions = ["Not disclosed", "No caregiving responsibility", "Primary caregiver", "Secondary caregiver", "Elder care responsibility", "Childcare responsibility", "Prefer not to say"];

type EmployeeDetailPermissions = {
  canWriteEmployees: boolean;
  canSuspendEmployees: boolean;
  canSeparateEmployees: boolean;
  canReadWorkforceActions: boolean;
  canReadTimeline: boolean;
  canReadAssignments: boolean;
  canWriteAssignments: boolean;
};

type EmployeeWorkspaceTab =
  | "overview"
  | "profile"
  | "employment"
  | "records"
  | "tasks"
  | "offboarding"
  | "assignment"
  | "access"
  | "history";

type ExtendedRecordForm =
  | "dependent"
  | "reference"
  | "referenceDocument"
  | "background"
  | "payout"
  | "statutory"
  | "eligibility";

type LifecycleAction = {
  key: "hire" | "confirm" | "suspend" | "reinstate" | "separate" | "retire" | "alumni" | "rehire" | "archive";
  label: string;
  description: string;
  icon: typeof UserCheck;
  tone: "primary" | "green" | "amber" | "red" | "slate";
  allowed: boolean;
  recommendedFor: EmployeeStatus[];
  statusOptions?: EmployeeStatus[];
};

export function EmployeeDetailPanel({
  employee,
  workforceActions,
  timelineEvents,
  assignmentHistory,
  assignmentCatalogs,
  permissions,
}: {
  employee: EmployeeDetails;
  workforceActions: WorkforceAction[] | null;
  timelineEvents: TimelineEvent[] | null;
  assignmentHistory: WorkforceAssignment[] | null;
  assignmentCatalogs: AssignmentCatalogs;
  permissions: EmployeeDetailPermissions;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [targetStatus, setTargetStatus] = useState<EmployeeStatus>("ACTIVE");
  const [lifecycleTemplates, setLifecycleTemplates] = useState<EmployeeLifecycleTemplate[]>([]);
  const [governanceSnapshot, setGovernanceSnapshot] = useState<EmployeeGovernanceSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<EmployeeWorkspaceTab>("overview");
  const workspaceTopRef = useRef<HTMLDivElement>(null);

  const primary = primaryAssignment(employee);
  useEffect(() => {
    if (!permissions.canWriteEmployees) return;

    let mounted = true;
    apiFetch<EmployeeLifecycleTemplate[]>("/employees/lifecycle-templates")
      .then((templates) => {
        if (mounted) setLifecycleTemplates(templates);
      })
      .catch(() => {
        if (mounted) setLifecycleTemplates([]);
      });

    return () => {
      mounted = false;
    };
  }, [permissions.canWriteEmployees]);

  useEffect(() => {
    if (!permissions.canReadWorkforceActions && !permissions.canWriteEmployees && !permissions.canSeparateEmployees) return;

    let mounted = true;
    apiFetch<EmployeeGovernanceSnapshot>(`/employees/${employee.id}/governance-snapshot`)
      .then((snapshot) => {
        if (mounted) setGovernanceSnapshot(snapshot);
      })
      .catch(() => {
        if (mounted) setGovernanceSnapshot(null);
      });

    return () => {
      mounted = false;
    };
  }, [employee.id, permissions.canReadWorkforceActions, permissions.canSeparateEmployees, permissions.canWriteEmployees]);
  const actions = useMemo<LifecycleAction[]>(
    () => [
      {
        key: "hire",
        label: "Hire",
        description: "Move preboarding into active employment.",
        icon: UserCheck,
        tone: "green",
        allowed: permissions.canWriteEmployees,
        recommendedFor: ["PREBOARDING"],
        statusOptions: ["ACTIVE", "PROBATION"],
      },
      {
        key: "confirm",
        label: "Confirm",
        description: "Set confirmation date and active status.",
        icon: BadgeCheck,
        tone: "primary",
        allowed: permissions.canWriteEmployees,
        recommendedFor: ["PROBATION"],
      },
      {
        key: "suspend",
        label: "Suspend",
        description: "Pause employment with full history.",
        icon: PauseCircle,
        tone: "amber",
        allowed: permissions.canSuspendEmployees,
        recommendedFor: ["ACTIVE", "PROBATION"],
      },
      {
        key: "reinstate",
        label: "Reinstate",
        description: "Return a suspended employee to work.",
        icon: RotateCcw,
        tone: "green",
        allowed: permissions.canSuspendEmployees,
        recommendedFor: ["SUSPENDED"],
        statusOptions: ["ACTIVE", "PROBATION"],
      },
      {
        key: "separate",
        label: "Separate",
        description: "End employment and capture reason.",
        icon: UserMinus,
        tone: "red",
        allowed: permissions.canSeparateEmployees,
        recommendedFor: ["ACTIVE", "PROBATION", "SUSPENDED"],
      },
      {
        key: "retire",
        label: "Retire",
        description: "Move employee into retired state.",
        icon: BriefcaseBusiness,
        tone: "slate",
        allowed: permissions.canSeparateEmployees,
        recommendedFor: ["ACTIVE", "PROBATION", "SUSPENDED"],
      },
      {
        key: "alumni",
        label: "Alumni",
        description: "Mark separated or retired worker as alumni.",
        icon: History,
        tone: "slate",
        allowed: permissions.canSeparateEmployees,
        recommendedFor: ["SEPARATED", "RETIRED"],
      },
      {
        key: "rehire",
        label: "Rehire",
        description: "Open a new employment chapter.",
        icon: RotateCcw,
        tone: "primary",
        allowed: permissions.canWriteEmployees,
        recommendedFor: ["SEPARATED", "RETIRED", "ALUMNI"],
        statusOptions: ["PREBOARDING", "ACTIVE", "PROBATION"],
      },
      {
        key: "archive",
        label: "Archive",
        description: "Close a terminal employment record.",
        icon: ShieldAlert,
        tone: "red",
        allowed: permissions.canWriteEmployees,
        recommendedFor: ["SEPARATED", "RETIRED", "ALUMNI"],
      },
    ],
    [permissions.canSeparateEmployees, permissions.canSuspendEmployees, permissions.canWriteEmployees],
  );

  async function runLifecycleAction(action: LifecycleAction) {
    setMessage(null);
    setPendingAction(action.key);

    const payload = compactPayload({
      effectiveDate: effectiveDate ? new Date(`${effectiveDate}T00:00:00.000Z`).toISOString() : undefined,
      reason: reason || undefined,
      note: note || undefined,
      status: action.statusOptions?.includes(targetStatus) ? targetStatus : undefined,
      separationReason: action.key === "separate" ? reason || undefined : undefined,
    });

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/${action.key}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: `${action.label} action completed and history was updated.` });
        setReason("");
        setNote("");
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function linkAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to link employee accounts." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = stringValue(formData, "email");
    const username = stringValue(formData, "username");

    if (!email) {
      setMessage({ type: "error", text: "Enter the employee account email." });
      return;
    }

    setMessage(null);
    setPendingAction("account-link");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/account`, {
          method: "POST",
          body: JSON.stringify({
            email,
            username: username || undefined,
            roleCode: "EMPLOYEE",
          }),
        });
        setMessage({ type: "success", text: "Employee account linked. An account setup email has been sent." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function resendInvitation() {
    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to send employee invitations." });
      return;
    }

    setMessage(null);
    setPendingAction("account-resend");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/account/resend-invitation`, {
          method: "POST",
        });
        setMessage({ type: "success", text: "A fresh account setup email has been sent." });
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createLeadershipDesignation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to update leadership eligibility." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const role = stringValue(formData, "role") as WorkforceLeadershipRole;
    const organizationNodeId = stringValue(formData, "organizationNodeId");
    const reason = stringValue(formData, "reason");

    setMessage(null);
    setPendingAction("leadership-designation");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/leadership-designations`, {
          method: "POST",
          body: JSON.stringify({
            role,
            organizationNodeId: organizationNodeId || undefined,
            reason: reason || undefined,
          }),
        });
        setMessage({ type: "success", text: "Leadership eligibility updated for assignment routing." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createEmploymentTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to maintain employment terms." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      contractType: stringValue(formData, "contractType"),
      status: stringValue(formData, "termStatus"),
      title: stringValue(formData, "title"),
      reference: stringValue(formData, "reference"),
      payFrequency: stringValue(formData, "payFrequency"),
      currencyCode: stringValue(formData, "currencyCode"),
      baseAmount: stringValue(formData, "baseAmount"),
      gradeId: stringValue(formData, "gradeId"),
      levelId: stringValue(formData, "levelId"),
      positionId: stringValue(formData, "positionId"),
      organizationNodeId: stringValue(formData, "organizationNodeId"),
      costCenterId: stringValue(formData, "costCenterId"),
      effectiveFrom: dateValue(formData, "effectiveFrom"),
      effectiveTo: dateValue(formData, "effectiveTo"),
      approveNow: formData.get("approveNow") === "on",
    });

    setMessage(null);
    setPendingAction("employment-term");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/employment-terms`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Employment terms were recorded." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createCompensationComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to maintain compensation components." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      termId: stringValue(formData, "termId"),
      type: stringValue(formData, "componentType"),
      name: stringValue(formData, "name"),
      amount: stringValue(formData, "amount"),
      currencyCode: stringValue(formData, "currencyCode"),
      frequency: stringValue(formData, "frequency"),
      status: stringValue(formData, "componentStatus"),
      taxable: formData.get("taxable") === "on",
      effectiveFrom: dateValue(formData, "effectiveFrom"),
      effectiveTo: dateValue(formData, "effectiveTo"),
    });

    setMessage(null);
    setPendingAction("compensation-component");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/compensation-components`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Compensation component was recorded." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createCompensationChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to prepare compensation changes." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const proposedState = compactDeep({
      baseAmount: stringValue(formData, "proposedBaseAmount"),
      currencyCode: stringValue(formData, "proposedCurrencyCode"),
      payFrequency: stringValue(formData, "proposedPayFrequency"),
      gradeId: stringValue(formData, "proposedGradeId"),
      levelId: stringValue(formData, "proposedLevelId"),
    });
    const payload = compactDeep({
      termId: stringValue(formData, "termId"),
      status: stringValue(formData, "changeStatus"),
      effectiveDate: dateValue(formData, "effectiveDate"),
      reason: stringValue(formData, "reason"),
      proposedState,
    });

    setMessage(null);
    setPendingAction("compensation-change");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/compensation-changes`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Compensation change was prepared for review." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function runCompensationChangeAction(changeId: string, action: "approve" | "apply") {
    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to action compensation changes." });
      return;
    }

    setMessage(null);
    setPendingAction(`compensation-${action}-${changeId}`);

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/compensation-changes/${changeId}/${action}`, {
          method: "POST",
        });
        setMessage({ type: "success", text: `Compensation change ${action === "approve" ? "approved" : "applied"}.` });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createReportingRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteAssignments) {
      setMessage({ type: "error", text: "You do not have permission to maintain reporting relationships." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      relatedEmployeeId: stringValue(formData, "relatedEmployeeId"),
      type: stringValue(formData, "type"),
      organizationNodeId: stringValue(formData, "organizationNodeId"),
      positionId: stringValue(formData, "positionId"),
      startsAt: dateValue(formData, "startsAt"),
      endsAt: dateValue(formData, "endsAt"),
      reason: stringValue(formData, "reason"),
    });

    setMessage(null);
    setPendingAction("reporting-relationship");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/reporting-relationships`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Reporting relationship was added." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function updateMasterData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to update employee master data." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      firstName: stringValue(formData, "firstName"),
      middleName: stringValue(formData, "middleName"),
      lastName: stringValue(formData, "lastName"),
      preferredName: stringValue(formData, "preferredName"),
      dateOfBirth: dateValue(formData, "dateOfBirth"),
      gender: stringValue(formData, "gender"),
      maritalStatus: stringValue(formData, "maritalStatus"),
      bloodGroup: stringValue(formData, "bloodGroup"),
      disabilityStatus: stringValue(formData, "disabilityStatus"),
      veteranStatus: stringValue(formData, "veteranStatus"),
      bio: stringValue(formData, "bio"),
      demographics: {
        pronouns: stringValue(formData, "pronouns"),
        genderIdentity: stringValue(formData, "genderIdentity"),
        sexAssignedAtBirth: stringValue(formData, "sexAssignedAtBirth"),
        sexualOrientation: stringValue(formData, "sexualOrientation"),
        race: stringValue(formData, "race"),
        preferredLanguageCode: stringValue(formData, "preferredLanguageCode"),
        primaryLanguageCode: stringValue(formData, "primaryLanguageCode"),
        ethnicity: stringValue(formData, "ethnicity"),
        ethnicityDetail: stringValue(formData, "ethnicityDetail"),
        religion: stringValue(formData, "religion"),
        religionDetail: stringValue(formData, "religionDetail"),
        caregiverStatus: stringValue(formData, "caregiverStatus"),
        disabilityAccommodation: stringValue(formData, "disabilityAccommodation"),
        accommodationRequired: formData.get("accommodationRequired") === "on",
        veteranCategory: stringValue(formData, "veteranCategory"),
        consentSource: stringValue(formData, "consentSource"),
        consentNote: stringValue(formData, "consentNote"),
        consentGiven: formData.get("consentGiven") === "on",
      },
    });

    setMessage(null);
    setPendingAction("master-data");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/master-data`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Employee master data was updated." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function updateExtendedProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to update employee profile records." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const dependent = compactDeep({
      fullName: stringValue(formData, "dependentFullName"),
      relationship: stringValue(formData, "dependentRelationship"),
      dateOfBirth: dateValue(formData, "dependentDateOfBirth"),
      benefitEligible: formData.get("dependentBenefitEligible") === "on",
      taxDependent: formData.get("dependentTaxDependent") === "on",
    });
    const reference = compactDeep({
      type: stringValue(formData, "referenceType"),
      name: stringValue(formData, "referenceName"),
      relationship: stringValue(formData, "referenceRelationship"),
      company: stringValue(formData, "referenceCompany"),
      email: stringValue(formData, "referenceEmail"),
      phone: stringValue(formData, "referencePhone"),
      status: stringValue(formData, "referenceStatus"),
    });
    const referenceDocument = compactDeep({
      referenceId: stringValue(formData, "referenceDocumentReferenceId"),
      fileName: stringValue(formData, "referenceDocumentFileName"),
      fileUrl: stringValue(formData, "referenceDocumentFileUrl"),
      verificationStatus: stringValue(formData, "referenceDocumentVerificationStatus"),
    });
    const backgroundCheck = compactDeep({
      provider: stringValue(formData, "backgroundProvider"),
      packageName: stringValue(formData, "backgroundPackageName"),
      status: stringValue(formData, "backgroundStatus"),
      requestedAt: dateValue(formData, "backgroundRequestedAt"),
      completedAt: dateValue(formData, "backgroundCompletedAt"),
      expiresAt: dateValue(formData, "backgroundExpiresAt"),
      resultSummary: stringValue(formData, "backgroundResultSummary"),
      reportUrl: stringValue(formData, "backgroundReportUrl"),
    });
    const payoutAccount = compactDeep({
      accountHolderName: stringValue(formData, "payoutAccountHolderName"),
      bankName: stringValue(formData, "payoutBankName"),
      accountType: stringValue(formData, "payoutAccountType"),
      currencyCode: stringValue(formData, "payoutCurrencyCode"),
      accountNumber: stringValue(formData, "payoutAccountNumber"),
      routingNumber: stringValue(formData, "payoutRoutingNumber"),
      allocationPercent: numberValue(formData, "payoutAllocationPercent"),
      isPrimary: formData.get("payoutIsPrimary") === "on",
      status: stringValue(formData, "payoutStatus"),
    });
    const statutoryIdentifier = compactDeep({
      type: stringValue(formData, "statutoryType"),
      label: stringValue(formData, "statutoryLabel"),
      identifier: stringValue(formData, "statutoryIdentifier"),
      status: stringValue(formData, "statutoryStatus"),
      issuedAt: dateValue(formData, "statutoryIssuedAt"),
      expiresAt: dateValue(formData, "statutoryExpiresAt"),
      note: stringValue(formData, "statutoryNote"),
    });
    const workEligibility = compactDeep({
      status: stringValue(formData, "eligibilityStatus"),
      workPermitRequired: formData.get("workPermitRequired") === "on",
      permitType: stringValue(formData, "permitType"),
      permitNumber: stringValue(formData, "permitNumber"),
      issuedAt: dateValue(formData, "permitIssuedAt"),
      expiresAt: dateValue(formData, "permitExpiresAt"),
      note: stringValue(formData, "eligibilityNote"),
    });
    const payload = compactDeep({
      dependents: Object.keys(dependent).length ? [dependent] : undefined,
      references: Object.keys(reference).length ? [reference] : undefined,
      referenceDocuments: Object.keys(referenceDocument).length ? [referenceDocument] : undefined,
      backgroundChecks: Object.keys(backgroundCheck).length ? [backgroundCheck] : undefined,
      payoutAccounts: Object.keys(payoutAccount).length ? [payoutAccount] : undefined,
      statutoryIdentifiers: Object.keys(statutoryIdentifier).length ? [statutoryIdentifier] : undefined,
      workEligibility: Object.keys(workEligibility).length ? workEligibility : undefined,
    });

    if (!Object.keys(payload).length) {
      setMessage({ type: "error", text: "Add at least one profile record before saving." });
      return;
    }

    setMessage(null);
    setPendingAction("extended-profile");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/extended-profile`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Employee profile records were updated." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function removeExtendedRecord(
    kind: "dependent" | "reference" | "referenceDocument" | "backgroundCheck" | "payoutAccount" | "statutoryIdentifier",
    id: string,
  ) {
    if (!permissions.canWriteEmployees) return;

    const payload =
      kind === "dependent"
        ? { removeDependentIds: [id] }
        : kind === "reference"
          ? { removeReferenceIds: [id] }
          : kind === "referenceDocument"
            ? { removeReferenceDocumentIds: [id] }
            : kind === "backgroundCheck"
              ? { removeBackgroundCheckIds: [id] }
              : kind === "statutoryIdentifier"
                ? { removeStatutoryIdentifierIds: [id] }
                : { removePayoutAccountIds: [id] };

    setMessage(null);
    setPendingAction(`remove-${kind}-${id}`);

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/extended-profile`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Profile record removed from the active employee file." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createLifecyclePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to create lifecycle plans." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      type: stringValue(formData, "planType") || "ONBOARDING",
      title: stringValue(formData, "planTitle"),
      description: stringValue(formData, "planDescription"),
      startsAt: dateValue(formData, "planStartsAt"),
      targetDate: dateValue(formData, "planTargetDate"),
      status: "ACTIVE",
    });

    if (!payload.title) {
      setMessage({ type: "error", text: "Enter a lifecycle plan title." });
      return;
    }

    setMessage(null);
    setPendingAction("lifecycle-plan-create");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/lifecycle-plans`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Lifecycle plan created for this employee." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createLifecycleTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to manage onboarding templates." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      code: stringValue(formData, "templateCode"),
      name: stringValue(formData, "templateName"),
      type: stringValue(formData, "templateType") || "ONBOARDING",
      status: stringValue(formData, "templateStatus") || "ACTIVE",
      targetDays: numberValue(formData, "templateTargetDays"),
      description: stringValue(formData, "templateDescription"),
    });

    if (!payload.code || !payload.name) {
      setMessage({ type: "error", text: "Enter a template code and name." });
      return;
    }

    setMessage(null);
    setPendingAction("lifecycle-template-create");

    startTransition(async () => {
      try {
        const template = await apiFetch<EmployeeLifecycleTemplate>("/employees/lifecycle-templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setLifecycleTemplates((current) => [template, ...current]);
        setMessage({ type: "success", text: "Onboarding template created." });
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createLifecycleTemplateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to manage template tasks." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const templateId = stringValue(formData, "templateTaskTemplateId");
    const payload = compactDeep({
      title: stringValue(formData, "templateTaskTitle"),
      category: stringValue(formData, "templateTaskCategory"),
      ownerType: stringValue(formData, "templateTaskOwnerType") || "EMPLOYEE",
      priority: stringValue(formData, "templateTaskPriority") || "NORMAL",
      sortOrder: numberValue(formData, "templateTaskSortOrder"),
      dueOffsetDays: numberValue(formData, "templateTaskDueOffsetDays"),
      requiresDocument: formData.get("templateTaskRequiresDocument") === "on",
      instructions: stringValue(formData, "templateTaskInstructions"),
    });

    if (!templateId || !payload.title) {
      setMessage({ type: "error", text: "Choose a template and enter a task title." });
      return;
    }

    setMessage(null);
    setPendingAction("lifecycle-template-task-create");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/lifecycle-templates/${templateId}/tasks`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const templates = await apiFetch<EmployeeLifecycleTemplate[]>("/employees/lifecycle-templates");
        setLifecycleTemplates(templates);
        setMessage({ type: "success", text: "Template task added." });
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function applyLifecycleTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to assign onboarding templates." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      templateId: stringValue(formData, "applyTemplateId"),
      title: stringValue(formData, "applyTemplateTitle"),
      startsAt: dateValue(formData, "applyTemplateStartsAt"),
      targetDate: dateValue(formData, "applyTemplateTargetDate"),
    });

    if (!payload.templateId) {
      setMessage({ type: "error", text: "Choose an active template to assign." });
      return;
    }

    setMessage(null);
    setPendingAction("lifecycle-template-apply");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/lifecycle-plans/from-template`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Onboarding plan assigned from template." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createLifecycleTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) {
      setMessage({ type: "error", text: "You do not have permission to assign lifecycle tasks." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const planId = stringValue(formData, "taskPlanId");
    const payload = compactDeep({
      title: stringValue(formData, "taskTitle"),
      category: stringValue(formData, "taskCategory"),
      ownerType: stringValue(formData, "taskOwnerType") || "HR",
      priority: stringValue(formData, "taskPriority") || "NORMAL",
      dueAt: dateValue(formData, "taskDueAt"),
      description: stringValue(formData, "taskDescription"),
      instructions: stringValue(formData, "taskInstructions"),
    });

    if (!planId || !payload.title) {
      setMessage({ type: "error", text: "Choose a plan and enter a task title." });
      return;
    }

    setMessage(null);
    setPendingAction("lifecycle-task-create");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/lifecycle-plans/${planId}/tasks`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Lifecycle task assigned and routed." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function completeLifecycleTask(taskId: string) {
    if (!permissions.canWriteEmployees) return;

    setMessage(null);
    setPendingAction(`lifecycle-task-complete-${taskId}`);

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/lifecycle-tasks/${taskId}/complete`, {
          method: "POST",
          body: JSON.stringify({ note: "Completed from the employee workspace." }),
        });
        setMessage({ type: "success", text: "Lifecycle task completed." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function blockLifecycleTask(taskId: string) {
    if (!permissions.canWriteEmployees) return;

    setMessage(null);
    setPendingAction(`lifecycle-task-block-${taskId}`);

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/lifecycle-tasks/${taskId}/block`, {
          method: "POST",
          body: JSON.stringify({ reason: "Needs follow-up before completion." }),
        });
        setMessage({ type: "success", text: "Lifecycle task marked for follow-up." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function waiveLifecycleTask(taskId: string) {
    if (!permissions.canWriteEmployees) return;

    setMessage(null);
    setPendingAction(`lifecycle-task-waive-${taskId}`);

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/lifecycle-tasks/${taskId}/waive`, {
          method: "POST",
          body: JSON.stringify({ reason: "Not required for this employee record." }),
        });
        setMessage({ type: "success", text: "Lifecycle task waived." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function remindLifecycleTask(taskId: string) {
    if (!permissions.canWriteEmployees) return;

    setMessage(null);
    setPendingAction(`lifecycle-task-remind-${taskId}`);

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/lifecycle-tasks/${taskId}/remind`, {
          method: "POST",
          body: JSON.stringify({ message: "Please complete this employment readiness action." }),
        });
        setMessage({ type: "success", text: "Reminder sent to the assigned owner." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function startOffboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canSeparateEmployees) {
      setMessage({ type: "error", text: "You do not have permission to manage offboarding." });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      templateId: stringValue(formData, "exitTemplateId"),
      separationType: stringValue(formData, "exitSeparationType"),
      separationReason: stringValue(formData, "exitSeparationReason"),
      noticeDate: dateValue(formData, "exitNoticeDate"),
      lastWorkingDate: dateValue(formData, "exitLastWorkingDate"),
      separationDate: dateValue(formData, "exitSeparationDate"),
      accessCutoffAt: dateValue(formData, "exitAccessCutoffAt"),
      eligibleForRehire: formData.get("exitEligibleForRehire") === "on",
      rehireRecommendation: stringValue(formData, "exitRehireRecommendation"),
    });

    setMessage(null);
    setPendingAction("offboarding-start");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/offboarding/start`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Offboarding case opened with clearance controls." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createClearanceItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canSeparateEmployees) return;

    const formData = new FormData(event.currentTarget);
    const exitRecordId = stringValue(formData, "clearanceExitRecordId");
    const payload = compactDeep({
      type: stringValue(formData, "clearanceType") || "OTHER",
      title: stringValue(formData, "clearanceTitle"),
      description: stringValue(formData, "clearanceDescription"),
      assetTag: stringValue(formData, "clearanceAssetTag"),
      systemName: stringValue(formData, "clearanceSystemName"),
      dueAt: dateValue(formData, "clearanceDueAt"),
    });

    if (!exitRecordId || !payload.title) {
      setMessage({ type: "error", text: "Choose an offboarding case and enter a clearance title." });
      return;
    }

    setMessage(null);
    setPendingAction("clearance-create");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/exit-records/${exitRecordId}/clearance-items`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Clearance item added." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function updateClearanceItemStatus(itemId: string, status: EmployeeClearanceStatus) {
    if (!permissions.canSeparateEmployees) return;

    setMessage(null);
    setPendingAction(`clearance-${itemId}-${status}`);

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/exit-clearance-items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        setMessage({ type: "success", text: "Clearance status updated." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function completeExitRecord(exitRecordId: string) {
    if (!permissions.canSeparateEmployees) return;

    setMessage(null);
    setPendingAction(`exit-complete-${exitRecordId}`);

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/exit-records/${exitRecordId}/complete`, {
          method: "POST",
        });
        setMessage({ type: "success", text: "Offboarding case completed." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  async function createRehireRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissions.canWriteEmployees) return;

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      exitRecordId: stringValue(formData, "rehireExitRecordId"),
      policy: stringValue(formData, "rehirePolicy") || "SAME_EMPLOYEE_RECORD",
      status: stringValue(formData, "rehireStatus") || "REVIEW",
      effectiveDate: dateValue(formData, "rehireEffectiveDate"),
      reason: stringValue(formData, "rehireReason"),
      decisionNote: stringValue(formData, "rehireDecisionNote"),
    });

    setMessage(null);
    setPendingAction("rehire-record-create");

    startTransition(async () => {
      try {
        await apiFetch(`/employees/${employee.id}/rehire-records`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Rehire review recorded." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      } finally {
        setPendingAction(null);
      }
    });
  }

  const openTasks = (employee.lifecycleTasks ?? []).filter((task) => !["COMPLETED", "WAIVED", "CANCELLED"].includes(task.status));
  const activeExitRecords = (employee.exitRecords ?? []).filter((record) => !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(record.status));
  const readiness = governanceSnapshot?.readiness.completionPercent ?? employee.masterDataReadiness?.completionPercent ?? fallbackReadiness(employee).completionPercent;
  const tabs = employeeWorkspaceTabs({
    profile: employee.person.contacts?.length ?? 0,
    records:
      (employee.dependents?.length ?? 0) +
      (employee.references?.length ?? 0) +
      (employee.payoutAccounts?.length ?? 0) +
      (employee.statutoryIdentifiers?.length ?? 0) +
      (employee.backgroundChecks?.length ?? 0),
    tasks: openTasks.length,
    offboarding: activeExitRecords.length,
    assignments: (assignmentHistory ?? employee.assignments ?? []).length,
    history: (workforceActions?.length ?? 0) + (timelineEvents?.length ?? 0),
  });
  const selectWorkspaceTab = (tab: EmployeeWorkspaceTab) => {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      workspaceTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <EmployeeRecordSidebar
        tabs={tabs}
        activeTab={activeTab}
        onChange={selectWorkspaceTab}
      />

      <div ref={workspaceTopRef} className="min-w-0 scroll-mt-28 space-y-5">
        {message ? <EmployeeWorkspaceMessage message={message} /> : null}

        {activeTab === "overview" ? (
          <EmployeeRecordOverview
            employee={employee}
            primary={primary}
            readiness={readiness}
            openTasks={openTasks.length}
            activeExitRecords={activeExitRecords.length}
            workforceActions={workforceActions}
            timelineEvents={timelineEvents}
            permissions={permissions}
            onOpenTab={selectWorkspaceTab}
          />
        ) : null}

        {activeTab === "profile" ? (
          <MasterDataPanel
            employee={employee}
            pending={pendingAction === "master-data"}
            canWrite={permissions.canWriteEmployees}
            onSubmit={updateMasterData}
          />
        ) : null}

        {activeTab === "employment" ? (
          <EmploymentTermsPanel
            employee={employee}
            catalogs={assignmentCatalogs}
            canWrite={permissions.canWriteEmployees}
            pendingAction={pendingAction}
            onCreateTerm={createEmploymentTerm}
            onCreateComponent={createCompensationComponent}
            onCreateChange={createCompensationChange}
            onRunChangeAction={runCompensationChangeAction}
          />
        ) : null}

        {activeTab === "records" ? (
          <ExtendedProfilePanel
            employee={employee}
            pending={pendingAction === "extended-profile"}
            canWrite={permissions.canWriteEmployees}
            removingKey={pendingAction}
            onSubmit={updateExtendedProfile}
            onRemove={removeExtendedRecord}
          />
        ) : null}

        {activeTab === "tasks" ? (
          <div className="space-y-5">
            <LifecycleOperationsPanel
              plans={employee.lifecyclePlans ?? []}
              tasks={employee.lifecycleTasks ?? []}
              templates={lifecycleTemplates}
              canWrite={permissions.canWriteEmployees}
              pendingAction={pendingAction}
              onCreatePlan={createLifecyclePlan}
              onCreateTemplate={createLifecycleTemplate}
              onCreateTemplateTask={createLifecycleTemplateTask}
              onApplyTemplate={applyLifecycleTemplate}
              onCreateTask={createLifecycleTask}
              onCompleteTask={completeLifecycleTask}
              onBlockTask={blockLifecycleTask}
              onWaiveTask={waiveLifecycleTask}
              onRemindTask={remindLifecycleTask}
            />
            <LifecycleActionPanel
              actions={actions}
              employee={employee}
              isPending={isPending}
              pendingAction={pendingAction}
              effectiveDate={effectiveDate}
              targetStatus={targetStatus}
              reason={reason}
              note={note}
              onEffectiveDateChange={setEffectiveDate}
              onTargetStatusChange={setTargetStatus}
              onReasonChange={setReason}
              onNoteChange={setNote}
              onRun={runLifecycleAction}
            />
          </div>
        ) : null}

        {activeTab === "offboarding" ? (
          <ExitGovernancePanel
            employee={employee}
            templates={lifecycleTemplates}
            snapshot={governanceSnapshot}
            canSeparate={permissions.canSeparateEmployees}
            canWrite={permissions.canWriteEmployees}
            pendingAction={pendingAction}
            onStartOffboarding={startOffboarding}
            onCreateClearanceItem={createClearanceItem}
            onUpdateClearanceItemStatus={updateClearanceItemStatus}
            onCompleteExitRecord={completeExitRecord}
            onCreateRehireRecord={createRehireRecord}
          />
        ) : null}

        {activeTab === "assignment" ? (
          <div className="space-y-5">
            {permissions.canWriteEmployees ? (
              <LeadershipEligibilityPanel
                employee={employee}
                organizationNodes={assignmentCatalogs.organizationNodes}
                pending={pendingAction === "leadership-designation"}
                onSubmit={createLeadershipDesignation}
              />
            ) : null}
            {permissions.canReadAssignments ? (
              <EmployeeAssignmentEditor
                employee={employee}
                assignments={assignmentHistory ?? employee.assignments ?? []}
                catalogs={assignmentCatalogs}
                canWriteAssignments={permissions.canWriteAssignments}
              />
            ) : (
              <EmployeeWorkspaceEmpty title="Assignment access is limited" body="Assignment history is available to authorized HR and management roles." />
            )}
            {permissions.canReadAssignments ? (
              <ReportingGovernancePanel
                employee={employee}
                catalogs={assignmentCatalogs}
                canWriteAssignments={permissions.canWriteAssignments}
                pending={pendingAction === "reporting-relationship"}
                onSubmit={createReportingRelationship}
              />
            ) : null}
          </div>
        ) : null}

        {activeTab === "access" ? (
          permissions.canWriteEmployees ? (
            <AccountLinkPanel
              employee={employee}
              pending={pendingAction === "account-link"}
              resendPending={pendingAction === "account-resend"}
              onSubmit={linkAccount}
              onResend={resendInvitation}
            />
          ) : (
            <EmployeeWorkspaceEmpty title="Account governance is limited" body="Employee account linking and invitations are maintained by authorized HR or tenant administrators." />
          )
        ) : null}

        {activeTab === "history" ? (
          <EmployeeHistoryPanel
            workforceActions={workforceActions}
            timelineEvents={timelineEvents}
            permissions={permissions}
          />
        ) : null}
      </div>
    </section>
  );
}

function employeeWorkspaceTabs(counts: {
  profile: number;
  records: number;
  tasks: number;
  offboarding: number;
  assignments: number;
  history: number;
}) {
  return [
    { key: "overview", label: "Overview", description: "Command summary", icon: UserCheck },
    { key: "profile", label: "Profile", description: "Identity and contacts", icon: UserRoundCog, count: counts.profile },
    { key: "employment", label: "Employment", description: "Terms and compensation", icon: BriefcaseBusiness },
    { key: "records", label: "Records", description: "Dependents and compliance", icon: FileCheck2, count: counts.records },
    { key: "tasks", label: "Lifecycle", description: "Plans, tasks, status", icon: ClipboardCheck, count: counts.tasks },
    { key: "offboarding", label: "Exit and rehire", description: "Clearance controls", icon: UserMinus, count: counts.offboarding },
    { key: "assignment", label: "Assignment", description: "Position and reporting", icon: GitBranch, count: counts.assignments },
    { key: "access", label: "Account", description: "Login and invites", icon: Mail },
    { key: "history", label: "History", description: "Actions and timeline", icon: History, count: counts.history },
  ] satisfies Array<{
    key: EmployeeWorkspaceTab;
    label: string;
    description: string;
    icon: LucideIcon;
    count?: number;
  }>;
}

function EmployeeRecordSidebar({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: ReturnType<typeof employeeWorkspaceTabs>;
  activeTab: EmployeeWorkspaceTab;
  onChange: (tab: EmployeeWorkspaceTab) => void;
}) {
  return (
    <aside className="rounded-2xl border border-[#dfe8f6] bg-white p-3 shadow-[0_18px_42px_rgba(18,31,67,0.055)] xl:sticky xl:top-24 xl:self-start">
      <div className="border-b border-[#edf1f7] px-2 pb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7b849b]">Record sections</p>
        <p className="mt-1 text-sm font-black text-[#10143f]">Work one area at a time</p>
      </div>

      <nav className="mt-3" aria-label="Employee record sections">
        <div className="flex gap-2 overflow-x-auto pb-1 xl:grid xl:overflow-visible xl:pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`group flex min-w-[210px] items-center gap-3 rounded-xl border p-3 text-left transition xl:min-w-0 ${
                active
                  ? "border-[#3820d7] bg-[#f2f0ff] shadow-[0_12px_26px_rgba(56,32,215,0.12)]"
                  : "border-[#e4ebf6] bg-[#fbfcff] hover:border-[#cbd8f0] hover:bg-white"
              }`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${active ? "bg-[#3820d7] text-white" : "bg-[#eef5ff] text-[#66718a] group-hover:text-[#3820d7]"}`}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-black text-[#10143f]">{tab.label}</span>
                  {tab.count !== undefined ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? "bg-white text-[#3820d7]" : "bg-[#eef2fa] text-[#68748c]"}`}>
                      {tab.count}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block truncate text-[11px] font-semibold text-[#7b849b]">{tab.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      </nav>
    </aside>
  );
}

function EmployeeWorkspaceMessage({ message }: { message: { type: "success" | "error"; text: string } }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-bold ${
        message.type === "success"
          ? "border-[#b7ebd2] bg-[#eaf9f2] text-[#0f8f66]"
          : "border-[#ffd0d0] bg-[#fff5f5] text-[#b42318]"
      }`}
    >
      {message.text}
    </div>
  );
}

function EmployeeRecordOverview({
  employee,
  primary,
  readiness,
  openTasks,
  activeExitRecords,
  workforceActions,
  timelineEvents,
  permissions,
  onOpenTab,
}: {
  employee: EmployeeDetails;
  primary: WorkforceAssignment | null;
  readiness: number;
  openTasks: number;
  activeExitRecords: number;
  workforceActions: WorkforceAction[] | null;
  timelineEvents: TimelineEvent[] | null;
  permissions: EmployeeDetailPermissions;
  onOpenTab: (tab: EmployeeWorkspaceTab) => void;
}) {
  const activeTerm = employee.employmentTerms?.find((term) => term.status === "ACTIVE" && !term.effectiveTo) ?? employee.employmentTerms?.[0] ?? null;

  return (
    <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-5">
        <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase text-[#68748c]">Record overview</p>
              <h3 className="mt-1 text-xl font-black text-[#10143f]">What needs attention</h3>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <OverviewMetric label="Readiness" value={`${readiness}%`} icon={ShieldCheck} tone="blue" onClick={() => onOpenTab("profile")} />
            <OverviewMetric label="Open tasks" value={`${openTasks}`} icon={ClipboardCheck} tone="amber" onClick={() => onOpenTab("tasks")} />
            <OverviewMetric label="Exit cases" value={`${activeExitRecords}`} icon={UserMinus} tone="red" onClick={() => onOpenTab("offboarding")} />
            <OverviewMetric label="History" value={`${(workforceActions?.length ?? 0) + (timelineEvents?.length ?? 0)}`} icon={History} tone="slate" onClick={() => onOpenTab("history")} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <OverviewCard
            icon={BriefcaseBusiness}
            title="Employment terms"
            body={`${activeTerm ? humanize(activeTerm.contractType) : "Terms pending"} · ${activeTerm?.payFrequency ? humanize(activeTerm.payFrequency) : "Pay cadence not set"}`}
            action="Open employment"
            onClick={() => onOpenTab("employment")}
          />
          <OverviewCard
            icon={GitBranch}
            title="Assignment and reporting"
            body={`${assignmentTitle(primary)} · ${managerName(primary)}`}
            action="Open assignment"
            onClick={() => onOpenTab("assignment")}
          />
          <OverviewCard
            icon={FileCheck2}
            title="Compliance records"
            body={`${employee.references?.length ?? 0} references · ${employee.payoutAccounts?.length ?? 0} payout accounts · ${employee.statutoryIdentifiers?.length ?? 0} statutory IDs`}
            action="Open records"
            onClick={() => onOpenTab("records")}
          />
          <OverviewCard
            icon={Mail}
            title="Employee account"
            body={employee.user?.email ? `${employee.user.email} · ${humanize(employee.user.status ?? "LINKED")}` : "No self-service login linked"}
            action="Open account"
            onClick={() => onOpenTab("access")}
          />
        </div>
      </div>

      <EmployeeHistoryPanel
        workforceActions={workforceActions}
        timelineEvents={timelineEvents}
        permissions={permissions}
        compact
      />
    </section>
  );
}

function OverviewMetric({
  label,
  value,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "blue" | "amber" | "red" | "slate";
  onClick: () => void;
}) {
  const toneClass =
    tone === "blue"
      ? "bg-[#eef5ff] text-[#3867e8]"
      : tone === "amber"
        ? "bg-[#fff8e5] text-[#a66300]"
        : tone === "red"
          ? "bg-[#fff5f5] text-[#b42318]"
          : "bg-[#f4f7fc] text-[#68748c]";

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#cbd8f0] hover:bg-white hover:shadow-[0_16px_35px_rgba(18,31,67,0.08)]"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <p className="mt-3 text-[10px] font-black uppercase text-[#7b849b]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#10143f]">{value}</p>
    </button>
  );
}

function OverviewCard({
  icon: Icon,
  title,
  body,
  action,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-[#dfe8f6] bg-white p-5 text-left shadow-[0_18px_45px_rgba(18,31,67,0.05)] transition hover:-translate-y-0.5 hover:border-[#cbd8f0]"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-black text-[#10143f]">{title}</p>
      <p className="mt-2 min-h-12 text-[12px] font-semibold leading-6 text-[#68748c]">{body}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-black text-[#3820d7]">
        {action}
        <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </button>
  );
}

function LifecycleActionPanel({
  actions,
  employee,
  isPending,
  pendingAction,
  effectiveDate,
  targetStatus,
  reason,
  note,
  onEffectiveDateChange,
  onTargetStatusChange,
  onReasonChange,
  onNoteChange,
  onRun,
}: {
  actions: LifecycleAction[];
  employee: EmployeeDetails;
  isPending: boolean;
  pendingAction: string | null;
  effectiveDate: string;
  targetStatus: EmployeeStatus;
  reason: string;
  note: string;
  onEffectiveDateChange: (value: string) => void;
  onTargetStatusChange: (value: EmployeeStatus) => void;
  onReasonChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onRun: (action: LifecycleAction) => void;
}) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase text-[#68748c]">Status actions</p>
          <h3 className="mt-1 text-xl font-black text-[#10143f]">Move the employee lifecycle deliberately</h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            Choose an effective date, reason, and action. Every move creates history and keeps the employee record auditable.
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
          <History size={20} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
        <div className="grid gap-3 xl:grid-cols-4">
          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase text-[#69738c]">Effective date</span>
            <input
              type="date"
              value={effectiveDate}
              onChange={(event) => onEffectiveDateChange(event.target.value)}
              className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase text-[#69738c]">Target status</span>
            <select
              value={targetStatus}
              onChange={(event) => onTargetStatusChange(event.target.value as EmployeeStatus)}
              className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
            >
              {["PREBOARDING", "ACTIVE", "PROBATION"].map((status) => (
                <option key={status} value={status}>
                  {humanize(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase text-[#69738c]">Reason</span>
            <input
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Approved lifecycle change"
              className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase text-[#69738c]">Audit note</span>
            <input
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="HR operations note"
              className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const recommended = action.recommendedFor.includes(employee.status);
          const disabled = !action.allowed || isPending;
          const Icon = action.icon;

          return (
            <button
              key={action.key}
              type="button"
              disabled={disabled}
              onClick={() => onRun(action)}
              className={`group rounded-xl border p-4 text-left transition ${
                disabled
                  ? "border-[#e6ebf4] bg-[#f8fbff] opacity-55"
                  : recommended
                    ? "border-[#3820d7] bg-white shadow-[0_16px_34px_rgba(56,32,215,0.10)] hover:-translate-y-0.5"
                    : "border-[#e3e9f4] bg-white hover:border-[#b9c7e5]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${actionToneClass(action.tone)}`}>
                  {pendingAction === action.key ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                </span>
                {recommended ? (
                  <span className="rounded-full bg-[#ece9ff] px-2 py-1 text-[9px] font-black uppercase text-[#3820d7]">
                    Suggested
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-black text-[#11163c]">{action.label}</p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#68748c]">{action.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EmployeeHistoryPanel({
  workforceActions,
  timelineEvents,
  permissions,
  compact = false,
}: {
  workforceActions: WorkforceAction[] | null;
  timelineEvents: TimelineEvent[] | null;
  permissions: EmployeeDetailPermissions;
  compact?: boolean;
}) {
  return (
    <section className={`grid gap-5 ${compact ? "" : "xl:grid-cols-[0.95fr_1.05fr]"}`}>
      <div className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase text-white/58">Workforce actions</p>
            <h4 className="mt-1 text-lg font-extrabold">{workforceActions?.length ?? 0} recorded</h4>
          </div>
          <History size={20} className="text-white/54" aria-hidden="true" />
        </div>
        <div className="mt-4 space-y-3">
          {!permissions.canReadWorkforceActions ? (
            <p className="text-sm leading-6 text-white/64">Workforce action history is available to authorized HR and management roles.</p>
          ) : workforceActions && workforceActions.length > 0 ? (
            workforceActions.slice(0, compact ? 4 : 12).map((action) => (
              <div key={action.id} className="rounded-lg border border-white/10 bg-white/8 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black">{humanize(action.type)}</p>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-black uppercase text-white/70">
                    {humanize(action.status)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] font-semibold text-white/58">
                  {formatDate(action.effectiveDate ?? action.completedAt ?? action.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-white/64">No workforce actions recorded for this employee yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase text-[#68748c]">Timeline</p>
            <h4 className="mt-1 text-lg font-extrabold text-[#121a46]">Recent history</h4>
          </div>
          <Clock3 size={20} className="text-[#6b7590]" aria-hidden="true" />
        </div>
        <div className="mt-4 space-y-3">
          {!permissions.canReadTimeline ? (
            <p className="text-sm leading-6 text-[#68748c]">Employee timeline visibility is limited to authorized HR and management roles.</p>
          ) : timelineEvents && timelineEvents.length > 0 ? (
            timelineEvents.slice(0, compact ? 5 : 14).map((event) => (
              <div key={event.id} className="border-l-2 border-[#dfe8f6] pl-3">
                <p className="text-sm font-black text-[#151936]">{event.title}</p>
                <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
                  {humanize(event.type)} · {formatDateTime(event.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-[#68748c]">Timeline events will appear as lifecycle changes are executed.</p>
          )}
        </div>
        {!compact ? (
          <Link
            href="/workforce"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-[#d3d9e8] px-4 text-[12px] font-black text-[#4d566d]"
          >
            Close workspace
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function EmployeeWorkspaceEmpty({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-6 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
        <ShieldCheck size={22} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-xl font-black text-[#10143f]">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#68748c]">{body}</p>
    </section>
  );
}

function EmploymentTermsPanel({
  employee,
  catalogs,
  canWrite,
  pendingAction,
  onCreateTerm,
  onCreateComponent,
  onCreateChange,
  onRunChangeAction,
}: {
  employee: EmployeeDetails;
  catalogs: AssignmentCatalogs;
  canWrite: boolean;
  pendingAction: string | null;
  onCreateTerm: (event: FormEvent<HTMLFormElement>) => void;
  onCreateComponent: (event: FormEvent<HTMLFormElement>) => void;
  onCreateChange: (event: FormEvent<HTMLFormElement>) => void;
  onRunChangeAction: (changeId: string, action: "approve" | "apply") => void;
}) {
  const terms = employee.employmentTerms ?? [];
  const components = employee.compensationComponents ?? [];
  const changes = employee.compensationChanges ?? [];
  const activeTerm = terms.find((term) => term.status === "ACTIVE" && !term.effectiveTo) ?? terms[0] ?? null;
  const termOptions = terms.map((term) => ({
    id: term.id,
    label: `${term.reference || term.title || humanize(term.contractType)} · ${formatDate(term.effectiveFrom)}`,
  }));
  const [activeForm, setActiveForm] = useState<"terms" | "component" | "change">("terms");
  const formTabs = [
    {
      key: "terms" as const,
      label: "Employment terms",
      description: "Contract, placement, grade, and effective dates",
      icon: FileCheck2,
      count: terms.length,
    },
    {
      key: "component" as const,
      label: "Pay component",
      description: "Allowances, bonuses, deductions, and tax flags",
      icon: Landmark,
      count: components.length,
    },
    {
      key: "change" as const,
      label: "Change proposal",
      description: "Prepare compensation moves for review",
      icon: ClipboardCheck,
      count: changes.length,
    },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_46px_rgba(18,31,67,0.055)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ece9ff] text-[#3820d7]">
                <Banknote size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#68748c]">Contract and compensation foundation</p>
                <h4 className="mt-1 text-2xl font-black tracking-tight text-[#10143f]">Employment terms workspace</h4>
              </div>
            </div>
            <p className="mt-4 max-w-4xl text-sm font-semibold leading-6 text-[#68748c]">
              Maintain contract terms, grade alignment, pay cadence, allowances, and compensation proposals in one governed record.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
            <EmploymentSummaryMetric label="Terms status" value={activeTerm ? humanize(activeTerm.status) : "Pending"} />
            <EmploymentSummaryMetric label="Pay cadence" value={activeTerm?.payFrequency ? humanize(activeTerm.payFrequency) : "Not set"} />
            <EmploymentSummaryMetric label="Base placeholder" value={formatMoney(activeTerm?.baseAmount, activeTerm?.currencyCode)} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 min-[1800px]:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-[#dfe8f6] bg-white p-2 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
            <div className="grid gap-2 lg:grid-cols-3">
              {formTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeForm === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveForm(tab.key)}
                    className={`group flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-[#3820d7] bg-[#f3f0ff] shadow-[0_14px_30px_rgba(56,32,215,0.12)]"
                        : "border-transparent bg-white hover:border-[#dfe8f6] hover:bg-[#fbfcff]"
                    }`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      active ? "bg-[#3820d7] text-white" : "bg-[#eef5ff] text-[#68748c] group-hover:text-[#3820d7]"
                    }`}>
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-black text-[#10143f]">{tab.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          active ? "bg-white text-[#3820d7]" : "bg-[#eef2fa] text-[#68748c]"
                        }`}>
                          {tab.count}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[11px] font-semibold text-[#7b849b]">{tab.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeForm === "terms" ? (
          <form onSubmit={onCreateTerm} className="rounded-2xl border border-[#dfe8f6] bg-white p-5 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
            <div className="flex flex-col gap-3 border-b border-[#edf1f7] pb-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ece9ff] text-[#3820d7]">
                  <FileCheck2 size={18} aria-hidden="true" />
                </span>
                <div>
                  <h5 className="text-base font-black text-[#10143f]">Employment terms</h5>
                  <p className="mt-1 text-xs font-semibold text-[#68748c]">Contract type, pay cadence, placement, grade, and effective dates.</p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-[#f4f7fc] px-3 py-1 text-[10px] font-black uppercase text-[#68748c]">
                {terms.length} saved
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <MasterInput name="title" label="Title" defaultValue="Employment terms" />
              <MasterInput name="reference" label="Reference" />
              <MasterSelect name="contractType" label="Contract type" defaultValue="PERMANENT" options={contractTypes} />
              <MasterSelect name="termStatus" label="Status" defaultValue="ACTIVE" options={employmentTermStatuses} />
              <MasterSelect name="payFrequency" label="Pay frequency" defaultValue="MONTHLY" options={payFrequencies} />
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <MasterInput name="currencyCode" label="Currency" defaultValue="USD" />
                <MasterInput name="baseAmount" label="Base amount" />
              </div>
              <CatalogSelect name="positionId" label="Position" items={catalogs.positions} labelFor={(item) => `${item.code} - ${item.title}`} />
              <CatalogSelect name="organizationNodeId" label="Org placement" items={catalogs.organizationNodes} labelFor={(item) => `${item.code} - ${item.name}`} />
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <CatalogSelect name="gradeId" label="Grade" items={catalogs.grades} labelFor={(item) => `${item.code} - ${item.name}`} />
                <CatalogSelect name="levelId" label="Level" items={catalogs.levels} labelFor={(item) => `${item.code} - ${item.name}`} />
              </div>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <MasterInput name="effectiveFrom" label="Effective from" type="date" defaultValue={todayInputDate()} />
                <MasterInput name="effectiveTo" label="Effective to" type="date" />
              </div>
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-3 text-[12px] font-black text-[#4d566d]">
                <input name="approveNow" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
                Approve now
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <PanelSubmit compact disabled={!canWrite || pendingAction === "employment-term"} loading={pendingAction === "employment-term"} label="Save terms" />
            </div>
          </form>
          ) : null}

          {activeForm === "component" ? (
            <form onSubmit={onCreateComponent} className="rounded-2xl border border-[#dfe8f6] bg-white p-5 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
              <div className="flex items-center gap-3 border-b border-[#edf1f7] pb-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf9f2] text-[#0f8f66]">
                  <Landmark size={18} aria-hidden="true" />
                </span>
                <div>
                  <h5 className="text-base font-black text-[#10143f]">Pay component</h5>
                  <p className="mt-1 text-xs font-semibold text-[#68748c]">Allowances, stipends, bonuses, deductions, and taxable flags.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                <SelectById name="termId" label="Terms record" items={termOptions} emptyLabel="No linked terms" />
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <MasterSelect name="componentType" label="Type" defaultValue="ALLOWANCE" options={componentTypes} />
                  <MasterSelect name="componentStatus" label="Status" defaultValue="EFFECTIVE" options={compensationChangeStatuses} />
                </div>
                <MasterInput name="name" label="Name" defaultValue="Allowance" required />
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <MasterInput name="amount" label="Amount" />
                  <MasterInput name="currencyCode" label="Currency" defaultValue={activeTerm?.currencyCode ?? "USD"} />
                </div>
                <MasterSelect name="frequency" label="Frequency" defaultValue={activeTerm?.payFrequency ?? "MONTHLY"} options={payFrequencies} />
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <MasterInput name="effectiveFrom" label="Effective from" type="date" defaultValue={todayInputDate()} />
                  <MasterInput name="effectiveTo" label="Effective to" type="date" />
                </div>
                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-3 text-[12px] font-black text-[#4d566d]">
                  <input name="taxable" type="checkbox" defaultChecked className="h-4 w-4 accent-[#3820d7]" />
                  Taxable
                </label>
              </div>
              <PanelSubmit disabled={!canWrite || pendingAction === "compensation-component"} loading={pendingAction === "compensation-component"} label="Add component" />
            </form>
          ) : null}

          {activeForm === "change" ? (
            <form onSubmit={onCreateChange} className="rounded-2xl border border-[#dfe8f6] bg-white p-5 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
              <div className="flex items-center gap-3 border-b border-[#edf1f7] pb-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff4db] text-[#b66b00]">
                  <ClipboardCheck size={18} aria-hidden="true" />
                </span>
                <div>
                  <h5 className="text-base font-black text-[#10143f]">Change proposal</h5>
                  <p className="mt-1 text-xs font-semibold text-[#68748c]">Prepare controlled compensation changes for review and approval.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                <SelectById name="termId" label="Terms record" items={termOptions} emptyLabel="Select terms" />
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <MasterSelect name="changeStatus" label="Status" defaultValue="PENDING_APPROVAL" options={compensationChangeStatuses} />
                  <MasterInput name="effectiveDate" label="Effective date" type="date" defaultValue={todayInputDate()} />
                </div>
                <MasterInput name="reason" label="Reason" defaultValue="Compensation review" />
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <MasterInput name="proposedBaseAmount" label="New base" />
                  <MasterInput name="proposedCurrencyCode" label="Currency" defaultValue={activeTerm?.currencyCode ?? "USD"} />
                </div>
                <MasterSelect name="proposedPayFrequency" label="New pay cadence" defaultValue={activeTerm?.payFrequency ?? "MONTHLY"} options={payFrequencies} />
                <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                  <CatalogSelect name="proposedGradeId" label="New grade" items={catalogs.grades} labelFor={(item) => `${item.code} - ${item.name}`} />
                  <CatalogSelect name="proposedLevelId" label="New level" items={catalogs.levels} labelFor={(item) => `${item.code} - ${item.name}`} />
                </div>
              </div>
              <PanelSubmit disabled={!canWrite || pendingAction === "compensation-change"} loading={pendingAction === "compensation-change"} label="Prepare change" />
            </form>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-5 min-[1800px]:sticky min-[1800px]:top-24 min-[1800px]:self-start">
          <TermsList title="Terms history" empty="No employment terms recorded." items={terms.map((term) => ({
            id: term.id,
            title: term.title || humanize(term.contractType),
            detail: `${humanize(term.status)} · ${formatDate(term.effectiveFrom)} to ${formatDate(term.effectiveTo)} · ${formatMoney(term.baseAmount, term.currencyCode)}`,
            tag: term.payFrequency ? humanize(term.payFrequency) : "Terms",
          }))} />
          <TermsList title="Components" empty="No compensation components recorded." items={components.map((component) => ({
            id: component.id,
            title: component.name,
            detail: `${humanize(component.type)} · ${formatMoney(component.amount, component.currencyCode)} · ${formatDate(component.effectiveFrom)}`,
            tag: humanize(component.status),
          }))} />
          <div className="rounded-2xl border border-[#e4ebf6] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-sm font-black text-[#10143f]">Change queue</h5>
              <span className="rounded-full bg-[#f4f7fc] px-2.5 py-1 text-[10px] font-black text-[#68748c]">
                {changes.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {changes.length ? (
                changes.map((change) => (
                  <div key={change.id} className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#10143f]">{humanize(change.status)}</p>
                        <p className="mt-1 text-[12px] font-semibold leading-5 text-[#68748c]">
                          {formatDate(change.effectiveDate)} · {change.reason || "Compensation change"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#ece9ff] px-2 py-1 text-[9px] font-black uppercase text-[#3820d7]">
                        Review
                      </span>
                    </div>
                    {canWrite ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pendingAction === `compensation-approve-${change.id}` || change.status === "APPROVED" || change.status === "EFFECTIVE"}
                          onClick={() => onRunChangeAction(change.id, "approve")}
                          className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[11px] font-black text-[#4d566d] disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={pendingAction === `compensation-apply-${change.id}` || change.status !== "APPROVED"}
                          onClick={() => onRunChangeAction(change.id, "apply")}
                          className="inline-flex h-8 items-center gap-2 rounded-lg bg-[#3820d7] px-3 text-[11px] font-black text-white disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-3 text-[12px] font-semibold leading-5 text-[#68748c]">
                  No compensation changes are waiting.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ReportingGovernancePanel({
  employee,
  catalogs,
  canWriteAssignments,
  pending,
  onSubmit,
}: {
  employee: EmployeeDetails;
  catalogs: AssignmentCatalogs;
  canWriteAssignments: boolean;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const relationships = employee.reportingRelationships ?? [];
  const candidates = uniqueEmployees([...catalogs.managers, ...catalogs.supervisors, ...catalogs.unitHeads]).filter((item) => item.id !== employee.id);

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ece9ff] text-[#3820d7]">
            <GitBranch size={20} aria-hidden="true" />
          </span>
          <p className="mt-4 text-[11px] font-black uppercase text-[#68748c]">Reporting governance</p>
          <h4 className="mt-1 text-xl font-black text-[#10143f]">{relationships.filter((item) => item.status === "ACTIVE").length} active lines</h4>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#68748c]">
            Assignment records capture current placement. Reporting relationships preserve formal, dotted-line, project, and HRBP accountability over time.
          </p>
        </aside>

        <div>
          <form onSubmit={onSubmit} className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase text-[#68748c]">Relationship editor</p>
                <h4 className="mt-1 text-lg font-black text-[#10143f]">Add a governed reporting line</h4>
              </div>
              <PanelSubmit disabled={!canWriteAssignments || pending || candidates.length === 0} loading={pending} label="Add relationship" compact />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SelectById
                name="relatedEmployeeId"
                label="Related employee"
                items={candidates.map((candidate) => ({
                  id: candidate.id,
                  label: `${personName(candidate.person)} - ${candidate.employeeNumber}`,
                }))}
                emptyLabel="Select from leadership pools"
              />
              <MasterSelect name="type" label="Relationship type" defaultValue="DOTTED_LINE" options={reportingTypes} />
              <CatalogSelect name="organizationNodeId" label="Scope" items={catalogs.organizationNodes} labelFor={(item) => `${item.code} - ${item.name}`} />
              <CatalogSelect name="positionId" label="Position context" items={catalogs.positions} labelFor={(item) => `${item.code} - ${item.title}`} />
              <MasterInput name="startsAt" label="Starts" type="date" defaultValue={todayInputDate()} />
              <MasterInput name="endsAt" label="Ends" type="date" />
              <div className="md:col-span-2">
                <MasterInput name="reason" label="Reason" defaultValue="Reporting governance update" />
              </div>
            </div>
            {candidates.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-[#dfe8f6] bg-white p-3 text-[12px] font-semibold leading-5 text-[#68748c]">
                Designate managers, supervisors, or unit heads before assigning reporting relationships.
              </p>
            ) : null}
          </form>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {relationships.length ? (
              relationships.map((relationship) => (
                <div key={relationship.id} className="rounded-xl border border-[#e4ebf6] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#10143f]">{humanize(relationship.type)}</p>
                      <p className="mt-1 truncate text-[12px] font-semibold text-[#68748c]">
                        {relationship.relatedEmployee?.person ? personName(relationship.relatedEmployee.person) : "Related employee"} · {formatDate(relationship.startsAt)} to {formatDate(relationship.endsAt)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${relationship.status === "ACTIVE" ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#f3f4f8] text-[#596277]"}`}>
                      {humanize(relationship.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] font-semibold leading-5 text-[#68748c]">
                    {[relationship.organizationNode?.name, relationship.position?.title, relationship.reason].filter(Boolean).join(" · ") || "No additional scope recorded."}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-4 text-sm font-semibold leading-6 text-[#68748c]">
                No additional reporting relationships recorded. Formal manager, supervisor, and unit-head values can still be held on the current assignment.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MasterDataPanel({
  employee,
  pending,
  canWrite,
  onSubmit,
}: {
  employee: EmployeeDetails;
  pending: boolean;
  canWrite: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const person = employee.person;
  const demographics = person.demographicProfile;
  const readiness = employee.masterDataReadiness ?? fallbackReadiness(employee);
  const missing = readiness.missing.slice(0, 5);

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ece9ff] text-[#3820d7]">
              <ClipboardCheck size={20} aria-hidden="true" />
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#68748c]">
              {readiness.completed}/{readiness.total}
            </span>
          </div>
          <h4 className="mt-4 text-lg font-black text-[#11163c]">Master data readiness</h4>
          <div className="mt-4 h-2 rounded-full bg-[#e9eef8]">
            <div
              className="h-full rounded-full bg-[#3820d7]"
              style={{ width: `${Math.max(8, readiness.completionPercent)}%` }}
            />
          </div>
          <p className="mt-3 text-3xl font-black text-[#11163c]">{readiness.completionPercent}%</p>
          {missing.length > 0 ? (
            <div className="mt-4 space-y-2">
              {missing.map((item) => (
                <div key={item.key} className="rounded-lg border border-[#e4ebf6] bg-white px-3 py-2 text-[12px] font-bold text-[#68748c]">
                  {item.label}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-[#d8f2e7] bg-[#f0fbf6] px-3 py-2 text-[12px] font-black text-[#108861]">
              Core profile is complete.
            </p>
          )}
        </aside>

        <form onSubmit={onSubmit} className="min-w-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-[#68748c]">Employee master data</p>
              <h4 className="mt-1 text-xl font-black text-[#10143f]">Identity, demographics, and readiness</h4>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
                Maintain the governed employee profile used by onboarding, assignments, documents, compliance, and self-service.
              </p>
            </div>
            <button
              type="submit"
              disabled={!canWrite || pending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.2)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
              Save master data
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MasterInput name="firstName" label="Legal first name" defaultValue={person.firstName} required />
            <MasterInput name="middleName" label="Middle name" defaultValue={person.middleName} />
            <MasterInput name="lastName" label="Legal last name" defaultValue={person.lastName} required />
            <MasterInput name="preferredName" label="Preferred name" defaultValue={person.preferredName} />
            <MasterInput name="dateOfBirth" label="Date of birth" defaultValue={dateInputValue(person.dateOfBirth)} type="date" />
            <MasterSelect name="gender" label="Gender" defaultValue={person.gender} options={["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]} />
            <MasterSelect name="maritalStatus" label="Marital status" defaultValue={person.maritalStatus} options={["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "SEPARATED", "OTHER"]} />
            <MasterInput name="bloodGroup" label="Blood group" defaultValue={person.bloodGroup} />
          </div>

          <section className="mt-5 rounded-2xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
            <div className="flex flex-col gap-2 border-b border-[#edf1f7] pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#68748c]">Voluntary profile</p>
                <h5 className="mt-1 text-base font-black text-[#10143f]">Self-identified and consented information</h5>
                <p className="mt-1 max-w-3xl text-[12px] font-semibold leading-5 text-[#68748c]">
                  These fields are optional and should be collected only where policy, law, and employee consent allow.
                </p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                demographics?.consentGivenAt && !demographics.consentWithdrawnAt ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#fff4db] text-[#b66b00]"
              }`}>
                {demographics?.consentGivenAt && !demographics.consentWithdrawnAt ? "Consent active" : "Consent needed"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MasterSelect name="pronouns" label="Pronouns" defaultValue={demographics?.pronouns} options={pronounOptions} />
              <MasterSelect name="genderIdentity" label="Gender identity" defaultValue={demographics?.genderIdentity} options={genderIdentityOptions} />
              <MasterSelect name="sexAssignedAtBirth" label="Sex assigned at birth" defaultValue={demographics?.sexAssignedAtBirth} options={sexAssignedOptions} />
              <MasterSelect name="sexualOrientation" label="Sexual orientation" defaultValue={demographics?.sexualOrientation} options={sexualOrientationOptions} />
              <MasterSelect name="preferredLanguageCode" label="Preferred language" defaultValue={demographics?.preferredLanguageCode} options={languageOptions} />
              <MasterSelect name="primaryLanguageCode" label="Primary language" defaultValue={demographics?.primaryLanguageCode} options={languageOptions} />
              <MasterSelect name="race" label="Race group" defaultValue={demographics?.race} options={raceOptions} />
              <MasterSelect name="ethnicity" label="Ethnic group" defaultValue={demographics?.ethnicity} options={ethnicityOptions} />
              <MasterInput name="ethnicityDetail" label="Ethnicity detail" defaultValue={demographics?.ethnicityDetail} placeholder="Clan, community, or self-described group" />
              <MasterSelect name="religion" label="Religion" defaultValue={demographics?.religion} options={religionOptions} />
              <MasterInput name="religionDetail" label="Religion detail" defaultValue={demographics?.religionDetail} placeholder="Denomination, tradition, or self-described faith" />
              <MasterSelect name="caregiverStatus" label="Caregiver status" defaultValue={demographics?.caregiverStatus} options={caregiverStatusOptions} />
              <MasterSelect name="disabilityStatus" label="Disability disclosure" defaultValue={person.disabilityStatus} options={disabilityDisclosureOptions} />
              <MasterSelect name="disabilityAccommodation" label="Accommodation status" defaultValue={demographics?.disabilityAccommodation} options={accommodationStatusOptions} />
              <MasterSelect name="veteranStatus" label="Military or veteran status" defaultValue={person.veteranStatus} options={veteranStatusOptions} />
              <MasterSelect name="veteranCategory" label="Veteran category" defaultValue={demographics?.veteranCategory} options={veteranCategoryOptions} />
              <MasterSelect name="consentSource" label="Consent source" defaultValue={demographics?.consentSource} options={["HR intake", "Employee self-service", "Onboarding form", "Annual update", "Other"]} />
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-black text-[#151936]">
                <input
                  name="consentGiven"
                  type="checkbox"
                  defaultChecked={Boolean(demographics?.consentGivenAt && !demographics.consentWithdrawnAt)}
                  className="h-4 w-4 accent-[#3820d7]"
                />
                Consent on file
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-black text-[#151936]">
                <input
                  name="accommodationRequired"
                  type="checkbox"
                  defaultChecked={Boolean(demographics?.accommodationRequired)}
                  className="h-4 w-4 accent-[#3820d7]"
                />
                Accommodation action required
              </label>
            </div>

            <label className="mt-3 grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Consent or accommodation note</span>
              <textarea
                name="consentNote"
                defaultValue={demographics?.consentNote ?? ""}
                rows={3}
                className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                placeholder="Consent context, accommodation workflow note, or locally required HR note"
              />
            </label>
          </section>

          <label className="mt-4 grid gap-1.5">
            <span className="text-[10px] font-black uppercase text-[#69738c]">Profile summary</span>
            <textarea
              name="bio"
              defaultValue={person.bio ?? ""}
              rows={3}
              className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
              placeholder="Role context, workforce notes, or employee profile summary"
            />
          </label>

          {!canWrite ? (
            <p className="mt-3 rounded-lg border border-[#e4ebf6] bg-[#fbfcff] px-3 py-2 text-[12px] font-bold leading-5 text-[#68748c]">
              Master data changes are available to authorized HR roles.
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function ExtendedProfilePanel({
  employee,
  pending,
  canWrite,
  removingKey,
  onSubmit,
  onRemove,
}: {
  employee: EmployeeDetails;
  pending: boolean;
  canWrite: boolean;
  removingKey: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (
    kind: "dependent" | "reference" | "referenceDocument" | "backgroundCheck" | "payoutAccount" | "statutoryIdentifier",
    id: string,
  ) => void;
}) {
  const dependents = employee.dependents ?? [];
  const references = employee.references ?? [];
  const referenceDocuments = employee.referenceDocuments ?? [];
  const backgroundChecks = employee.backgroundChecks ?? [];
  const payoutAccounts = employee.payoutAccounts ?? [];
  const statutoryIdentifiers = employee.statutoryIdentifiers ?? [];
  const eligibility = employee.workEligibility;
  const [activeRecordForm, setActiveRecordForm] = useState<ExtendedRecordForm>("dependent");
  const recordForms = [
    {
      key: "dependent" as const,
      label: "Dependent",
      description: "Family, beneficiary, benefit, and tax context",
      icon: HeartPulse,
      count: dependents.length,
    },
    {
      key: "reference" as const,
      label: "Referee",
      description: "Professional, employment, academic, or character reference",
      icon: UserCheck,
      count: references.length,
    },
    {
      key: "referenceDocument" as const,
      label: "Evidence file",
      description: "Reference letters, verification files, and supporting records",
      icon: FileCheck2,
      count: referenceDocuments.length,
    },
    {
      key: "background" as const,
      label: "Background",
      description: "Screening provider, package, status, and review note",
      icon: ShieldCheck,
      count: backgroundChecks.length,
    },
    {
      key: "payout" as const,
      label: "Payout",
      description: "Bank account, allocation, currency, and verification state",
      icon: Banknote,
      count: payoutAccounts.length,
    },
    {
      key: "statutory" as const,
      label: "Tax and statutory",
      description: "Tax, pension, insurance, permit, and national IDs",
      icon: Landmark,
      count: statutoryIdentifiers.length,
    },
    {
      key: "eligibility" as const,
      label: "Eligibility",
      description: "Work authorization and permit review",
      icon: BadgeCheck,
      count: eligibility ? 1 : 0,
    },
  ];
  const activeRecord = recordForms.find((form) => form.key === activeRecordForm) ?? recordForms[0];

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase text-[#68748c]">Employee record extensions</p>
          <h4 className="mt-1 text-xl font-black text-[#10143f]">Family, references, payout, and eligibility</h4>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            Keep supporting employment records current, review-sensitive information, and maintain a clear readiness trail.
          </p>
        </div>
        <button
          type="submit"
          form="employee-extended-profile-form"
          disabled={!canWrite || pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.2)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
          Save {activeRecord.label.toLowerCase()}
        </button>
      </div>

      <form
        id="employee-extended-profile-form"
        onSubmit={onSubmit}
        className="mt-5 rounded-2xl border border-[#dfe8f6] bg-white p-2 shadow-[0_16px_38px_rgba(18,31,67,0.04)]"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
          {recordForms.map((tab) => {
            const Icon = tab.icon;
            const active = tab.key === activeRecordForm;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveRecordForm(tab.key)}
                className={`group flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-[#3820d7] bg-[#f3f0ff] shadow-[0_14px_30px_rgba(56,32,215,0.12)]"
                    : "border-transparent bg-white hover:border-[#dfe8f6] hover:bg-[#fbfcff]"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  active ? "bg-[#3820d7] text-white" : "bg-[#eef5ff] text-[#68748c] group-hover:text-[#3820d7]"
                }`}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-black text-[#10143f]">{tab.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      active ? "bg-white text-[#3820d7]" : "bg-[#eef2fa] text-[#68748c]"
                    }`}>
                      {tab.count}
                    </span>
                  </span>
                  <span className="mt-1 hidden truncate text-[11px] font-semibold text-[#7b849b] min-[1500px]:block">{tab.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <fieldset disabled={activeRecordForm !== "dependent"} className={`${activeRecordForm === "dependent" ? "block" : "hidden"} mt-3 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-5`}>
          <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
            <HeartPulse size={17} className="text-[#19a974]" aria-hidden="true" />
            Add dependent or beneficiary
          </legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <MasterInput name="dependentFullName" label="Full name" />
            <MasterInput name="dependentRelationship" label="Relationship" />
            <MasterInput name="dependentDateOfBirth" label="Date of birth" type="date" />
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
              <input name="dependentBenefitEligible" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
              Benefit eligible
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
              <input name="dependentTaxDependent" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
              Tax dependent
            </label>
          </div>
        </fieldset>

        <fieldset disabled={activeRecordForm !== "reference"} className={`${activeRecordForm === "reference" ? "block" : "hidden"} mt-3 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-5`}>
          <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
            <UserCheck size={17} className="text-[#3820d7]" aria-hidden="true" />
            Add reference
          </legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <MasterSelect name="referenceType" label="Reference type" defaultValue="PROFESSIONAL" options={["PROFESSIONAL", "EMPLOYMENT", "ACADEMIC", "CHARACTER", "OTHER"]} />
            <MasterInput name="referenceName" label="Name" />
            <MasterInput name="referenceRelationship" label="Relationship" />
            <MasterInput name="referenceCompany" label="Company" />
            <MasterInput name="referenceEmail" label="Email" type="email" />
            <MasterInput name="referencePhone" label="Phone" />
            <MasterSelect name="referenceStatus" label="Review status" defaultValue="PENDING" options={["PENDING", "CONTACTED", "VERIFIED", "REJECTED"]} />
          </div>
        </fieldset>

        <fieldset disabled={activeRecordForm !== "referenceDocument"} className={`${activeRecordForm === "referenceDocument" ? "block" : "hidden"} mt-3 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-5`}>
          <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
            <FileCheck2 size={17} className="text-[#3820d7]" aria-hidden="true" />
            Reference document
          </legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Linked reference</span>
              <select
                name="referenceDocumentReferenceId"
                defaultValue=""
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
              >
                <option value="">Attach to employee file</option>
                {references.map((reference) => (
                  <option key={reference.id} value={reference.id}>
                    {reference.name} · {humanize(reference.type ?? "REFERENCE")}
                  </option>
                ))}
              </select>
            </label>
            <MasterInput name="referenceDocumentFileName" label="File name" />
            <MasterInput name="referenceDocumentFileUrl" label="File URL" />
            <MasterSelect name="referenceDocumentVerificationStatus" label="Verification" defaultValue="PENDING" options={["NOT_REQUIRED", "PENDING", "VERIFIED", "REJECTED", "EXPIRED"]} />
          </div>
        </fieldset>

        <fieldset disabled={activeRecordForm !== "background"} className={`${activeRecordForm === "background" ? "block" : "hidden"} mt-3 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-5`}>
          <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
            <ShieldCheck size={17} className="text-[#19a974]" aria-hidden="true" />
            Background review
          </legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <MasterInput name="backgroundProvider" label="Provider" />
            <MasterInput name="backgroundPackageName" label="Package" />
            <MasterSelect name="backgroundStatus" label="Status" defaultValue="REQUESTED" options={["NOT_STARTED", "REQUESTED", "IN_PROGRESS", "CLEAR", "REVIEW_REQUIRED", "ADVERSE_ACTION", "CANCELLED", "EXPIRED"]} />
            <MasterInput name="backgroundRequestedAt" label="Requested" type="date" />
            <MasterInput name="backgroundCompletedAt" label="Completed" type="date" />
            <MasterInput name="backgroundExpiresAt" label="Expires" type="date" />
            <MasterInput name="backgroundReportUrl" label="Report URL" />
            <MasterInput name="backgroundResultSummary" label="Review note" />
          </div>
        </fieldset>

        <fieldset disabled={activeRecordForm !== "payout"} className={`${activeRecordForm === "payout" ? "block" : "hidden"} mt-3 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-5`}>
          <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
            <Banknote size={17} className="text-[#19a974]" aria-hidden="true" />
            Add payout account
          </legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <MasterInput name="payoutAccountHolderName" label="Account holder" />
            <MasterInput name="payoutBankName" label="Bank name" />
            <MasterInput name="payoutAccountType" label="Account type" />
            <MasterInput name="payoutCurrencyCode" label="Currency" />
            <MasterInput name="payoutAccountNumber" label="Account number" />
            <MasterInput name="payoutRoutingNumber" label="Routing number" />
            <MasterInput name="payoutAllocationPercent" label="Allocation %" type="number" />
            <MasterSelect name="payoutStatus" label="Verification" defaultValue="PENDING_VERIFICATION" options={["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "DISABLED"]} />
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
              <input name="payoutIsPrimary" type="checkbox" defaultChecked className="h-4 w-4 accent-[#3820d7]" />
              Primary account
            </label>
          </div>
        </fieldset>

        <fieldset disabled={activeRecordForm !== "statutory"} className={`${activeRecordForm === "statutory" ? "block" : "hidden"} mt-3 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-5`}>
          <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
            <Landmark size={17} className="text-[#3820d7]" aria-hidden="true" />
            Tax and statutory identifier
          </legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <MasterSelect name="statutoryType" label="Identifier type" defaultValue="TAX_ID" options={["TAX_ID", "NATIONAL_ID", "SOCIAL_SECURITY", "PENSION", "INSURANCE", "HEALTH_INSURANCE", "WORK_PERMIT", "OTHER"]} />
            <MasterInput name="statutoryLabel" label="Label" />
            <MasterInput name="statutoryIdentifier" label="Identifier" />
            <MasterSelect name="statutoryStatus" label="Verification" defaultValue="PENDING_VERIFICATION" options={["DRAFT", "PENDING_VERIFICATION", "VERIFIED", "REJECTED", "EXPIRED", "ARCHIVED"]} />
            <MasterInput name="statutoryIssuedAt" label="Issued" type="date" />
            <MasterInput name="statutoryExpiresAt" label="Expires" type="date" />
            <label className="md:col-span-2 grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Finance or HR note</span>
              <textarea
                name="statutoryNote"
                rows={2}
                className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                placeholder="Verification source, statutory context, or finance readiness note"
              />
            </label>
          </div>
        </fieldset>

        <fieldset disabled={activeRecordForm !== "eligibility"} className={`${activeRecordForm === "eligibility" ? "block" : "hidden"} mt-3 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-5`}>
          <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
            <FileCheck2 size={17} className="text-[#3820d7]" aria-hidden="true" />
            Work eligibility
          </legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <MasterSelect name="eligibilityStatus" label="Eligibility status" defaultValue={eligibility?.status ?? "PENDING_REVIEW"} options={["NOT_REVIEWED", "PENDING_REVIEW", "AUTHORIZED", "EXPIRING_SOON", "EXPIRED", "REJECTED"]} />
            <MasterInput name="permitType" label="Permit type" defaultValue={eligibility?.permitType} />
            <MasterInput name="permitNumber" label="Permit number" defaultValue={eligibility?.permitNumber} />
            <MasterInput name="permitIssuedAt" label="Issued" type="date" defaultValue={dateInputValue(eligibility?.issuedAt)} />
            <MasterInput name="permitExpiresAt" label="Expires" type="date" defaultValue={dateInputValue(eligibility?.expiresAt)} />
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
              <input name="workPermitRequired" type="checkbox" defaultChecked={eligibility?.workPermitRequired ?? false} className="h-4 w-4 accent-[#3820d7]" />
              Permit required
            </label>
          </div>
          <label className="mt-3 grid gap-1.5">
            <span className="text-[10px] font-black uppercase text-[#69738c]">Review note</span>
            <textarea
              name="eligibilityNote"
              defaultValue={eligibility?.note ?? ""}
              rows={2}
              className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
            />
          </label>
        </fieldset>
      </form>

      <div className="mt-5 grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        <ExtendedList
          title="Dependents and beneficiaries"
          empty="No dependent or beneficiary records."
          items={dependents.map((dependent) => ({
            id: dependent.id,
            title: dependent.fullName,
            detail: `${dependent.relationship} · ${dependent.benefitEligible ? "Benefit eligible" : "Benefits not marked"}`,
            tag: dependent.taxDependent ? "Tax dependent" : "Employee file",
            removeKind: "dependent" as const,
          }))}
          canWrite={canWrite}
          removingKey={removingKey}
          onRemove={onRemove}
        />
        <ExtendedList
          title="References"
          empty="No employment references."
          items={references.map((reference) => ({
            id: reference.id,
            title: reference.name,
            detail: [reference.relationship, reference.company, reference.email].filter(Boolean).join(" · ") || "Reference contact",
            tag: humanize(reference.status),
            removeKind: "reference" as const,
          }))}
          canWrite={canWrite}
          removingKey={removingKey}
          onRemove={onRemove}
        />
        <ExtendedList
          title="Reference documents"
          empty="No reference documents."
          items={referenceDocuments.map((document) => ({
            id: document.id,
            title: document.fileName,
            detail: document.fileUrl,
            tag: humanize(document.verificationStatus),
            removeKind: "referenceDocument" as const,
          }))}
          canWrite={canWrite}
          removingKey={removingKey}
          onRemove={onRemove}
        />
        <ExtendedList
          title="Background checks"
          empty="No background checks."
          items={backgroundChecks.map((check) => ({
            id: check.id,
            title: check.packageName || check.provider || "Background check",
            detail: [check.provider, check.completedAt ? `Completed ${formatDate(check.completedAt)}` : null, check.resultSummary].filter(Boolean).join(" · ") || "Compliance review",
            tag: humanize(check.status),
            removeKind: "backgroundCheck" as const,
          }))}
          canWrite={canWrite}
          removingKey={removingKey}
          onRemove={onRemove}
        />
        <ExtendedList
          title="Payout accounts"
          empty="No payout accounts."
          items={payoutAccounts.map((account) => ({
            id: account.id,
            title: account.bankName,
            detail: payoutMask(account),
            tag: account.isPrimary ? "Primary" : humanize(account.status),
            removeKind: "payoutAccount" as const,
          }))}
          canWrite={canWrite}
          removingKey={removingKey}
          onRemove={onRemove}
        />
        <ExtendedList
          title="Tax and statutory IDs"
          empty="No tax or statutory identifiers."
          items={statutoryIdentifiers.map((identifier) => ({
            id: identifier.id,
            title: identifier.label || humanize(identifier.type),
            detail: [
              identifier.country?.name,
              identifier.identifierLast4 ? `ending ${identifier.identifierLast4}` : "masked identifier",
              identifier.expiresAt ? `expires ${formatDate(identifier.expiresAt)}` : null,
            ]
              .filter(Boolean)
              .join(" · "),
            tag: humanize(identifier.status),
            removeKind: "statutoryIdentifier" as const,
          }))}
          canWrite={canWrite}
          removingKey={removingKey}
          onRemove={onRemove}
        />
      </div>

      {!canWrite ? (
        <p className="mt-4 rounded-lg border border-[#e4ebf6] bg-[#fbfcff] px-3 py-2 text-[12px] font-bold leading-5 text-[#68748c]">
          Extended profile record changes are available to authorized HR roles.
        </p>
      ) : null}
    </section>
  );
}

function ExitGovernancePanel({
  employee,
  templates,
  snapshot,
  canSeparate,
  canWrite,
  pendingAction,
  onStartOffboarding,
  onCreateClearanceItem,
  onUpdateClearanceItemStatus,
  onCompleteExitRecord,
  onCreateRehireRecord,
}: {
  employee: EmployeeDetails;
  templates: EmployeeLifecycleTemplate[];
  snapshot: EmployeeGovernanceSnapshot | null;
  canSeparate: boolean;
  canWrite: boolean;
  pendingAction: string | null;
  onStartOffboarding: (event: FormEvent<HTMLFormElement>) => void;
  onCreateClearanceItem: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateClearanceItemStatus: (itemId: string, status: EmployeeClearanceStatus) => void;
  onCompleteExitRecord: (exitRecordId: string) => void;
  onCreateRehireRecord: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const exitRecords = employee.exitRecords ?? [];
  const activeExit = snapshot?.activeExit ?? exitRecords.find((record) => !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(record.status)) ?? null;
  const clearanceItems = activeExit?.clearanceItems ?? employee.clearanceItems ?? [];
  const offboardingTemplates = templates.filter((template) => template.type === "OFFBOARDING" && template.status === "ACTIVE");
  const rehireRecords = employee.rehireRecords ?? exitRecords.flatMap((record) => record.rehireRecords ?? []);
  const exitRecordId = activeExit?.id ?? exitRecords[0]?.id ?? "";
  const openClearance = clearanceItems.filter((item) => !["CLEARED", "WAIVED", "CANCELLED"].includes(item.status)).length;

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase text-[#68748c]">Exit and governance</p>
          <h4 className="mt-1 text-xl font-black text-[#10143f]">Offboarding, rehire, masking, and compliance controls</h4>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            Manage exit readiness, asset and access clearance, alumni decisions, rehire policy, and sensitive-data visibility from one governed employee record.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <LifecycleStat label="Score" value={`${snapshot?.compliance.score ?? employee.masterDataReadiness?.completionPercent ?? 0}%`} />
          <LifecycleStat label="Open" value={String(openClearance)} />
          <LifecycleStat label="Rehire" value={String(rehireRecords.length)} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 2xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          {canSeparate ? (
            <form onSubmit={onStartOffboarding} className="rounded-xl border border-[#e4ebf6] bg-[linear-gradient(135deg,#fbfcff,#f7f8ff)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-[#3820d7]">Managed exit</p>
                  <h5 className="mt-1 text-base font-black text-[#10143f]">Open offboarding case</h5>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-[#68748c]">
                    Start exit controls before final separation so HR, IT, finance, and managers close every dependency.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-[#68748c] shadow-sm">
                  {offboardingTemplates.length} templates
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-black uppercase text-[#69738c]">Offboarding template</span>
                  <select
                    name="exitTemplateId"
                    defaultValue={offboardingTemplates[0]?.id ?? ""}
                    className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
                  >
                    <option value="">Use default clearance controls</option>
                    {offboardingTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} · {template.tasks?.length ?? 0} tasks
                      </option>
                    ))}
                  </select>
                </label>
                <MasterInput name="exitSeparationType" label="Separation type" placeholder="Voluntary, redundancy, contract end" />
                <MasterInput name="exitNoticeDate" label="Notice date" type="date" />
                <MasterInput name="exitLastWorkingDate" label="Last working day" type="date" />
                <MasterInput name="exitSeparationDate" label="Separation date" type="date" />
                <MasterInput name="exitAccessCutoffAt" label="Access cutoff" type="date" />
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
                  <input name="exitEligibleForRehire" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
                  Eligible for rehire
                </label>
                <label className="md:col-span-2 grid gap-1.5">
                  <span className="text-[10px] font-black uppercase text-[#69738c]">Separation reason</span>
                  <textarea
                    name="exitSeparationReason"
                    rows={2}
                    className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                    placeholder="Reason, risk context, and business notes"
                  />
                </label>
                <label className="md:col-span-2 grid gap-1.5">
                  <span className="text-[10px] font-black uppercase text-[#69738c]">Rehire recommendation</span>
                  <textarea
                    name="exitRehireRecommendation"
                    rows={2}
                    className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                    placeholder="Manager and HR guidance for future rehire decisions"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={pendingAction === "offboarding-start" || Boolean(activeExit)}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pendingAction === "offboarding-start" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <UserMinus size={15} aria-hidden="true" />}
                Open offboarding
              </button>
            </form>
          ) : null}

          <form onSubmit={onCreateClearanceItem} className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
            <p className="text-sm font-black text-[#10143f]">Add clearance item</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Case</span>
                <select
                  name="clearanceExitRecordId"
                  defaultValue={exitRecordId}
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
                >
                  <option value="">Open offboarding first</option>
                  {exitRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {humanize(record.status)} · {formatDate(record.separationDate)}
                    </option>
                  ))}
                </select>
              </label>
              <MasterSelect name="clearanceType" label="Type" defaultValue="ASSET" options={clearanceTypes} />
              <MasterInput name="clearanceTitle" label="Title" />
              <MasterInput name="clearanceDueAt" label="Due date" type="date" />
              <MasterInput name="clearanceAssetTag" label="Asset tag" />
              <MasterInput name="clearanceSystemName" label="System name" />
              <label className="md:col-span-2 grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Description</span>
                <textarea
                  name="clearanceDescription"
                  rows={2}
                  className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  placeholder="What must be returned, revoked, collected, or verified"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!canSeparate || !exitRecordId || pendingAction === "clearance-create"}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pendingAction === "clearance-create" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <ClipboardCheck size={15} aria-hidden="true" />}
              Add clearance
            </button>
          </form>

          <form onSubmit={onCreateRehireRecord} className="rounded-xl border border-[#e4ebf6] bg-white p-4">
            <p className="text-sm font-black text-[#10143f]">Rehire review</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Related exit case</span>
                <select
                  name="rehireExitRecordId"
                  defaultValue={exitRecords[0]?.id ?? ""}
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
                >
                  <option value="">No related exit case</option>
                  {exitRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {humanize(record.status)} · {formatDate(record.separationDate)}
                    </option>
                  ))}
                </select>
              </label>
              <MasterSelect name="rehirePolicy" label="Policy" defaultValue="SAME_EMPLOYEE_RECORD" options={rehirePolicies} />
              <MasterSelect name="rehireStatus" label="Decision" defaultValue="REVIEW" options={rehireStatuses} />
              <MasterInput name="rehireEffectiveDate" label="Effective date" type="date" />
              <label className="md:col-span-2 grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Reason</span>
                <textarea
                  name="rehireReason"
                  rows={2}
                  className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  placeholder="Why this employee is being reviewed for rehire"
                />
              </label>
              <label className="md:col-span-2 grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Decision note</span>
                <textarea
                  name="rehireDecisionNote"
                  rows={2}
                  className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  placeholder="Policy decision, approvers, or conditions"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!canWrite || pendingAction === "rehire-record-create"}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-[#d4dcf0] bg-white px-4 text-[12px] font-black text-[#11163c] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pendingAction === "rehire-record-create" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />}
              Record review
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#e4ebf6] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-sm font-black text-[#10143f]">Active clearance</h5>
              <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${clearanceClass(activeExit?.accessClearanceStatus ?? "OPEN")}`}>
                Access {humanize(activeExit?.accessClearanceStatus ?? "OPEN")}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <ClearanceMetric label="Assets" value={humanize(activeExit?.assetClearanceStatus ?? "OPEN")} status={activeExit?.assetClearanceStatus ?? "OPEN"} />
              <ClearanceMetric label="Documents" value={humanize(activeExit?.finalDocumentCollectionStatus ?? "OPEN")} status={activeExit?.finalDocumentCollectionStatus ?? "OPEN"} />
              <ClearanceMetric label="Exit ready" value={`${snapshot?.compliance.exitClearancePercent ?? 0}%`} status={openClearance ? "IN_PROGRESS" : "CLEARED"} />
            </div>

            <div className="mt-4 space-y-2">
              {clearanceItems.length ? (
                clearanceItems.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#10143f]">{item.title}</p>
                        <p className="mt-1 text-[12px] font-semibold text-[#68748c]">
                          {humanize(item.type)} · due {formatDate(item.dueAt)} {item.systemName ? `· ${item.systemName}` : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${clearanceClass(item.status)}`}>
                        {humanize(item.status)}
                      </span>
                    </div>
                    {canSeparate ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {clearanceStatuses.filter((status) => ["IN_PROGRESS", "CLEARED", "BLOCKED", "WAIVED"].includes(status)).map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={pendingAction === `clearance-${item.id}-${status}`}
                            onClick={() => onUpdateClearanceItemStatus(item.id, status)}
                            className="h-8 rounded-lg border border-[#d7dff0] bg-white px-3 text-[11px] font-black text-[#11163c] disabled:opacity-55"
                          >
                            {pendingAction === `clearance-${item.id}-${status}` ? "Saving..." : humanize(status)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-3 text-[12px] font-semibold leading-5 text-[#68748c]">
                  No active offboarding clearance items are open for this employee.
                </p>
              )}
            </div>

            {activeExit ? (
              <button
                type="button"
                disabled={!canSeparate || openClearance > 0 || pendingAction === `exit-complete-${activeExit.id}`}
                onClick={() => onCompleteExitRecord(activeExit.id)}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#10143f] px-4 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pendingAction === `exit-complete-${activeExit.id}` ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <FileCheck2 size={15} aria-hidden="true" />}
                Complete offboarding
              </button>
            ) : null}
          </div>

          <div className="rounded-xl border border-[#11163c] bg-[#11163c] p-4 text-white">
            <p className="text-[10px] font-black uppercase text-[#9ba8ff]">Governance snapshot</p>
            <h5 className="mt-1 text-lg font-black">Field access and readiness</h5>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DarkMetric label="Profile readiness" value={`${snapshot?.readiness.completionPercent ?? employee.masterDataReadiness?.completionPercent ?? 0}%`} />
              <DarkMetric label="Sensitive data" value={snapshot?.fieldAccess.sensitiveData === "VISIBLE" ? "Visible" : "Masked"} />
              <DarkMetric label="Lifecycle" value={`${snapshot?.compliance.lifecycleCompletionPercent ?? 0}%`} />
              <DarkMetric label="Open tasks" value={String(snapshot?.qualitySignals.openLifecycleTasks ?? 0)} />
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/8 p-3">
              <p className="text-[11px] font-black uppercase text-white/60">Recent governance events</p>
              <div className="mt-3 space-y-2">
                {(snapshot?.recentAudit ?? []).slice(0, 3).map((audit) => (
                  <div key={audit.id} className="rounded-lg bg-white/8 p-2">
                    <p className="text-[12px] font-black">{humanize(audit.action)} · {audit.entityType}</p>
                    <p className="mt-1 text-[11px] font-semibold text-white/60">{formatDateTime(audit.createdAt)}</p>
                  </div>
                ))}
                {snapshot?.recentAudit?.length ? null : (
                  <p className="text-[12px] font-semibold text-white/60">No recent governance events are visible.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e4ebf6] bg-white p-4">
            <h5 className="text-sm font-black text-[#10143f]">Rehire history</h5>
            <div className="mt-3 space-y-2">
              {rehireRecords.length ? (
                rehireRecords.map((record) => (
                  <div key={record.id} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-[#10143f]">{humanize(record.policy)}</p>
                        <p className="mt-1 text-[12px] font-semibold text-[#68748c]">
                          Effective {formatDate(record.effectiveDate)} · {record.createdBy?.username ?? record.createdBy?.email ?? "Recorded"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${lifecycleStatusClass(record.status)}`}>
                        {humanize(record.status)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-3 text-[12px] font-semibold leading-5 text-[#68748c]">
                  No rehire review has been recorded for this employee.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LifecycleOperationsPanel({
  plans,
  tasks,
  templates,
  canWrite,
  pendingAction,
  onCreatePlan,
  onCreateTemplate,
  onCreateTemplateTask,
  onApplyTemplate,
  onCreateTask,
  onCompleteTask,
  onBlockTask,
  onWaiveTask,
  onRemindTask,
}: {
  plans: EmployeeLifecyclePlan[];
  tasks: EmployeeLifecycleTask[];
  templates: EmployeeLifecycleTemplate[];
  canWrite: boolean;
  pendingAction: string | null;
  onCreatePlan: (event: FormEvent<HTMLFormElement>) => void;
  onCreateTemplate: (event: FormEvent<HTMLFormElement>) => void;
  onCreateTemplateTask: (event: FormEvent<HTMLFormElement>) => void;
  onApplyTemplate: (event: FormEvent<HTMLFormElement>) => void;
  onCreateTask: (event: FormEvent<HTMLFormElement>) => void;
  onCompleteTask: (taskId: string) => void;
  onBlockTask: (taskId: string) => void;
  onWaiveTask: (taskId: string) => void;
  onRemindTask: (taskId: string) => void;
}) {
  const activeTasks = tasks.filter((task) => !["COMPLETED", "WAIVED", "CANCELLED"].includes(task.status));
  const firstPlanId = plans.find((plan) => !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(plan.status))?.id ?? plans[0]?.id ?? "";
  const activeTemplates = templates.filter((template) => template.status === "ACTIVE");
  const firstTemplateId = activeTemplates[0]?.id ?? templates[0]?.id ?? "";

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase text-[#68748c]">Lifecycle operations</p>
          <h4 className="mt-1 text-xl font-black text-[#10143f]">Preboarding, onboarding, compliance, and finance tasks</h4>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            Route employee, HR, manager, IT, and finance work into tracked plans so reference checks, background reviews,
            payout readiness, and statutory verification have a governed completion trail.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <LifecycleStat label="Plans" value={String(plans.length)} />
          <LifecycleStat label="Open" value={String(activeTasks.length)} />
          <LifecycleStat label="Done" value={String(tasks.filter((task) => task.status === "COMPLETED").length)} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 2xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          {canWrite ? (
            <div className="rounded-xl border border-[#dfe8f6] bg-[linear-gradient(135deg,#fbfcff,#f6f8ff)] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-[#3820d7]">Template library</p>
                  <h5 className="mt-1 text-base font-black text-[#10143f]">Reusable onboarding checklists</h5>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-[#68748c]">
                    Build once, assign repeatedly. Templates generate employee, HR, manager, IT, finance, and document tasks with dates.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-[#68748c] shadow-sm">
                  {templates.length} templates
                </span>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <form onSubmit={onCreateTemplate} className="rounded-xl border border-[#e4ebf6] bg-white p-3">
                  <p className="text-[12px] font-black text-[#10143f]">New template</p>
                  <div className="mt-3 grid gap-2">
                    <MasterInput name="templateCode" label="Code" />
                    <MasterInput name="templateName" label="Name" />
                    <MasterSelect name="templateType" label="Type" defaultValue="ONBOARDING" options={["PREBOARDING", "ONBOARDING", "CROSSBOARDING", "OFFBOARDING", "REHIRE"]} />
                    <MasterSelect name="templateStatus" label="Status" defaultValue="ACTIVE" options={["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]} />
                    <MasterInput name="templateTargetDays" label="Target days" type="number" />
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-black uppercase text-[#69738c]">Description</span>
                      <textarea
                        name="templateDescription"
                        rows={2}
                        className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                        placeholder="What this checklist controls"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={pendingAction === "lifecycle-template-create"}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-[#3820d7] px-3 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingAction === "lifecycle-template-create" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ClipboardCheck size={14} aria-hidden="true" />}
                    Create template
                  </button>
                </form>

                <form onSubmit={onCreateTemplateTask} className="rounded-xl border border-[#e4ebf6] bg-white p-3">
                  <p className="text-[12px] font-black text-[#10143f]">Template task</p>
                  <div className="mt-3 grid gap-2">
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-black uppercase text-[#69738c]">Template</span>
                      <select
                        name="templateTaskTemplateId"
                        defaultValue={firstTemplateId}
                        className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
                      >
                        <option value="">Create a template first</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} · {humanize(template.status)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <MasterInput name="templateTaskTitle" label="Task title" />
                    <MasterInput name="templateTaskCategory" label="Category" />
                    <MasterSelect name="templateTaskOwnerType" label="Owner" defaultValue="EMPLOYEE" options={["EMPLOYEE", "MANAGER", "HR", "IT", "FINANCE", "CUSTOM"]} />
                    <MasterSelect name="templateTaskPriority" label="Priority" defaultValue="NORMAL" options={["LOW", "NORMAL", "HIGH", "CRITICAL"]} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <MasterInput name="templateTaskSortOrder" label="Order" type="number" />
                      <MasterInput name="templateTaskDueOffsetDays" label="Due offset" type="number" />
                    </div>
                    <label className="flex min-h-10 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
                      <input name="templateTaskRequiresDocument" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
                      Requires document
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-black uppercase text-[#69738c]">Instructions</span>
                      <textarea
                        name="templateTaskInstructions"
                        rows={2}
                        className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                        placeholder="Task directions for the owner"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={pendingAction === "lifecycle-template-task-create" || templates.length === 0}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-[#3820d7] px-3 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingAction === "lifecycle-template-task-create" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <UserRoundCog size={14} aria-hidden="true" />}
                    Add task
                  </button>
                </form>

                <form onSubmit={onApplyTemplate} className="rounded-xl border border-[#e4ebf6] bg-white p-3">
                  <p className="text-[12px] font-black text-[#10143f]">Assign template</p>
                  <div className="mt-3 grid gap-2">
                    <label className="grid gap-1.5">
                      <span className="text-[10px] font-black uppercase text-[#69738c]">Active template</span>
                      <select
                        name="applyTemplateId"
                        defaultValue={activeTemplates[0]?.id ?? ""}
                        className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
                      >
                        <option value="">No active templates</option>
                        {activeTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} · {template.tasks?.length ?? 0} tasks
                          </option>
                        ))}
                      </select>
                    </label>
                    <MasterInput name="applyTemplateTitle" label="Plan title" />
                    <MasterInput name="applyTemplateStartsAt" label="Starts" type="date" />
                    <MasterInput name="applyTemplateTargetDate" label="Target" type="date" />
                    <div className="rounded-lg bg-[#fbfcff] p-3 text-[12px] font-semibold leading-5 text-[#68748c]">
                      Assigning a template creates an active plan and routes its tasks to the correct owners.
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={pendingAction === "lifecycle-template-apply" || activeTemplates.length === 0}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-[#3820d7] px-3 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingAction === "lifecycle-template-apply" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}
                    Assign plan
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          <form onSubmit={onCreatePlan} className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
            <p className="text-sm font-black text-[#10143f]">Create plan</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <MasterSelect name="planType" label="Plan type" defaultValue="ONBOARDING" options={["PREBOARDING", "ONBOARDING", "CROSSBOARDING", "OFFBOARDING", "REHIRE"]} />
              <MasterInput name="planTitle" label="Plan title" />
              <MasterInput name="planStartsAt" label="Starts" type="date" />
              <MasterInput name="planTargetDate" label="Target date" type="date" />
              <label className="md:col-span-2 grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Description</span>
                <textarea
                  name="planDescription"
                  rows={2}
                  className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  placeholder="Plan purpose, owner notes, or readiness outcome"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!canWrite || pendingAction === "lifecycle-plan-create"}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pendingAction === "lifecycle-plan-create" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <ClipboardCheck size={15} aria-hidden="true" />}
              Create plan
            </button>
          </form>

          <form onSubmit={onCreateTask} className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
            <p className="text-sm font-black text-[#10143f]">Assign task</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Plan</span>
                <select
                  name="taskPlanId"
                  defaultValue={firstPlanId}
                  className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
                >
                  <option value="">Create a plan first</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title} · {humanize(plan.type)}
                    </option>
                  ))}
                </select>
              </label>
              <MasterInput name="taskTitle" label="Task title" />
              <MasterInput name="taskCategory" label="Category" />
              <MasterSelect name="taskOwnerType" label="Owner" defaultValue="HR" options={["EMPLOYEE", "MANAGER", "HR", "IT", "FINANCE", "CUSTOM"]} />
              <MasterSelect name="taskPriority" label="Priority" defaultValue="NORMAL" options={["LOW", "NORMAL", "HIGH", "CRITICAL"]} />
              <MasterInput name="taskDueAt" label="Due date" type="date" />
              <label className="md:col-span-2 grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Instructions</span>
                <textarea
                  name="taskInstructions"
                  rows={2}
                  className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  placeholder="What needs to be submitted, reviewed, approved, or verified"
                />
              </label>
              <label className="md:col-span-2 grid gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#69738c]">Description</span>
                <textarea
                  name="taskDescription"
                  rows={2}
                  className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                  placeholder="Task context for the assignee and reviewers"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!canWrite || pendingAction === "lifecycle-task-create" || plans.length === 0}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pendingAction === "lifecycle-task-create" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <UserRoundCog size={15} aria-hidden="true" />}
              Assign task
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#e4ebf6] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-sm font-black text-[#10143f]">Active plans</h5>
              <span className="rounded-full bg-[#f4f7fc] px-3 py-1 text-[10px] font-black uppercase text-[#68748c]">
                {plans.length} total
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {plans.length ? (
                plans.map((plan) => (
                  <div key={plan.id} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#10143f]">{plan.title}</p>
                        <p className="mt-1 text-[12px] font-semibold text-[#68748c]">
                          {humanize(plan.type)} · target {formatDate(plan.targetDate)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${lifecycleStatusClass(plan.status)}`}>
                        {humanize(plan.status)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-3 text-[12px] font-semibold leading-5 text-[#68748c]">
                  No lifecycle plans have been created yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#e4ebf6] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-sm font-black text-[#10143f]">Task queue</h5>
              <span className="rounded-full bg-[#f4f7fc] px-3 py-1 text-[10px] font-black uppercase text-[#68748c]">
                {tasks.length} total
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {tasks.length ? (
                tasks.slice(0, 10).map((task) => (
                  <div key={task.id} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#10143f]">{task.title}</p>
                        <p className="mt-1 text-[12px] font-semibold text-[#68748c]">
                          {humanize(task.ownerType)} · {task.category || "Lifecycle"} · due {formatDate(task.dueAt)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${lifecycleStatusClass(task.status)}`}>
                        {humanize(task.status)}
                      </span>
                    </div>
                    {task.instructions ? (
                      <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-[#68748c]">{task.instructions}</p>
                    ) : null}
                    {canWrite && !["COMPLETED", "WAIVED", "CANCELLED"].includes(task.status) ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <TaskActionButton
                          label="Complete"
                          pending={pendingAction === `lifecycle-task-complete-${task.id}`}
                          onClick={() => onCompleteTask(task.id)}
                        />
                        <TaskActionButton
                          label="Follow up"
                          pending={pendingAction === `lifecycle-task-block-${task.id}`}
                          onClick={() => onBlockTask(task.id)}
                        />
                        <TaskActionButton
                          label="Remind"
                          pending={pendingAction === `lifecycle-task-remind-${task.id}`}
                          onClick={() => onRemindTask(task.id)}
                        />
                        <TaskActionButton
                          label="Waive"
                          pending={pendingAction === `lifecycle-task-waive-${task.id}`}
                          onClick={() => onWaiveTask(task.id)}
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-3 text-[12px] font-semibold leading-5 text-[#68748c]">
                  No lifecycle tasks have been assigned yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {!canWrite ? (
        <p className="mt-4 rounded-lg border border-[#e4ebf6] bg-[#fbfcff] px-3 py-2 text-[12px] font-bold leading-5 text-[#68748c]">
          Lifecycle routing is managed by authorized HR operations roles.
        </p>
      ) : null}
    </section>
  );
}

function LifecycleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] px-4 py-3">
      <p className="text-lg font-black text-[#10143f]">{value}</p>
      <p className="text-[9px] font-black uppercase text-[#7b849b]">{label}</p>
    </div>
  );
}

function ClearanceMetric({ label, value, status }: { label: string; value: string; status: EmployeeClearanceStatus }) {
  const width = status === "CLEARED" || status === "WAIVED" ? "100%" : status === "OPEN" ? "22%" : "62%";

  return (
    <div className="rounded-xl border border-[#e3eaf7] bg-[#fbfcff] p-3">
      <p className="text-[9px] font-black uppercase text-[#7a849b]">{label}</p>
      <p className="mt-2 text-sm font-black text-[#10143f]">{value}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8eef7]">
        <div
          className={`h-full rounded-full ${
            status === "CLEARED" || status === "WAIVED"
              ? "bg-[#12b886]"
              : status === "BLOCKED"
                ? "bg-[#f03e3e]"
                : "bg-[#4c6fff]"
          }`}
          style={{ width }}
        />
      </div>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-3">
      <p className="text-[9px] font-black uppercase text-white/55">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function TaskActionButton({
  label,
  pending,
  onClick,
}: {
  label: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[11px] font-black text-[#4d566d] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

function ExtendedList({
  title,
  empty,
  items,
  canWrite,
  removingKey,
  onRemove,
}: {
  title: string;
  empty: string;
  items: Array<{
    id: string;
    title: string;
    detail: string;
    tag: string;
    removeKind: "dependent" | "reference" | "referenceDocument" | "backgroundCheck" | "payoutAccount" | "statutoryIdentifier";
  }>;
  canWrite: boolean;
  removingKey: string | null;
  onRemove: (
    kind: "dependent" | "reference" | "referenceDocument" | "backgroundCheck" | "payoutAccount" | "statutoryIdentifier",
    id: string,
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-[#e4ebf6] bg-white p-4">
      <h5 className="text-sm font-black text-[#10143f]">{title}</h5>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => {
            const key = `remove-${item.removeKind}-${item.id}`;
            return (
              <div key={item.id} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#10143f]">{item.title}</p>
                    <p className="mt-1 truncate text-[12px] font-semibold text-[#68748c]">{item.detail}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#ece9ff] px-2 py-1 text-[9px] font-black uppercase text-[#3820d7]">
                    {item.tag}
                  </span>
                </div>
                {canWrite ? (
                  <button
                    type="button"
                    disabled={removingKey === key}
                    onClick={() => onRemove(item.removeKind, item.id)}
                    className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[11px] font-black text-[#4d566d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {removingKey === key ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : null}
                    Remove
                  </button>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-3 text-[12px] font-semibold leading-5 text-[#68748c]">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}

function MasterInput({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-[10px] font-black uppercase text-[#69738c]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-11 w-full min-w-0 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
      />
    </label>
  );
}

function MasterSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  options: string[];
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-[10px] font-black uppercase text-[#69738c]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full min-w-0 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
      >
        <option value="">Not set</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {humanize(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function CatalogSelect<T extends { id: string }>({
  name,
  label,
  items,
  labelFor,
}: {
  name: string;
  label: string;
  items: T[];
  labelFor: (item: T) => string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-[10px] font-black uppercase text-[#69738c]">{label}</span>
      <select
        name={name}
        defaultValue=""
        className="h-11 w-full min-w-0 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
      >
        <option value="">Not set</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {labelFor(item)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectById({
  name,
  label,
  items,
  emptyLabel,
}: {
  name: string;
  label: string;
  items: Array<{ id: string; label: string }>;
  emptyLabel: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-[10px] font-black uppercase text-[#69738c]">{label}</span>
      <select
        name={name}
        defaultValue={items[0]?.id ?? ""}
        className="h-11 w-full min-w-0 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
      >
        <option value="">{emptyLabel}</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PanelSubmit({
  disabled,
  loading,
  label,
  compact,
}: {
  disabled: boolean;
  loading: boolean;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.18)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-55 ${
        compact ? "h-10" : "mt-4 h-11 w-full"
      }`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
      {label}
    </button>
  );
}

function EmploymentSummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#7b849b]">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#10143f]">{value}</p>
    </div>
  );
}

function TermsList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; detail: string; tag: string }>;
}) {
  return (
    <div className="rounded-xl border border-[#e4ebf6] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h5 className="text-sm font-black text-[#10143f]">{title}</h5>
        <span className="rounded-full bg-[#f4f7fc] px-2.5 py-1 text-[10px] font-black text-[#68748c]">
          {items.length}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#10143f]">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-[#68748c]">{item.detail}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#eef5ff] px-2 py-1 text-[9px] font-black uppercase text-[#3867e8]">
                  {item.tag}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-3 text-[12px] font-semibold leading-5 text-[#68748c]">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}

function MiniFact({ icon: Icon, label, value }: { icon: typeof CalendarClock; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e3e9f4] bg-[#fbfcff] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef5ff] text-[#2f6eea]">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-[#8a92a6]">{label}</p>
          <p className="mt-1 truncate text-sm font-black text-[#121a46]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function AccountLinkPanel({
  employee,
  pending,
  resendPending,
  onSubmit,
  onResend,
}: {
  employee: EmployeeDetails;
  pending: boolean;
  resendPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
}) {
  const linkedEmail = employee.user?.email;

  return (
    <section className="rounded-xl border border-[#e3e9f4] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
              Self-service account
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${linkedEmail ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#fff4db] text-[#b66b00]"}`}>
              {linkedEmail ? "Linked" : "Not linked"}
            </span>
          </div>
          <h4 className="mt-3 text-lg font-extrabold text-[#121a46]">
            {linkedEmail ? "Employee account is connected." : "Connect this employee to a login account."}
          </h4>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            This connects the user account, person identity, and employee relationship. If the account is new, TimeSync sends a secure setup email so the employee can create a password and access their profile.
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#eef5ff] text-[#3820d7]">
          <UserRoundCog size={20} aria-hidden="true" />
        </span>
      </div>

      {linkedEmail ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <MiniFact icon={Mail} label="Login email" value={linkedEmail} />
            <MiniFact icon={BadgeCheck} label="Account status" value={employee.user?.status ? humanize(employee.user.status) : "Linked"} />
          </div>
          <button
            type="button"
            disabled={resendPending}
            onClick={onResend}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d3d9e8] bg-white px-4 text-[12px] font-black text-[#4d566d] shadow-[0_12px_26px_rgba(18,31,67,0.05)] transition hover:border-[#9fb1d2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendPending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Mail size={15} aria-hidden="true" />}
            Resend setup email
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Work email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="employee@company.com"
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Username</span>
              <input
                name="username"
                placeholder="optional"
                className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
              />
            </label>
          </div>
          <p className="rounded-lg border border-[#dbe6f6] bg-[#f8fbff] px-3 py-2 text-[12px] font-bold leading-5 text-[#66708a]">
            The employee will receive an email with a secure setup link. They create their own password before signing in.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.2)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <UserCheck size={16} aria-hidden="true" />}
            Link account
          </button>
        </form>
      )}
    </section>
  );
}

function LeadershipEligibilityPanel({
  employee,
  organizationNodes,
  pending,
  onSubmit,
}: {
  employee: EmployeeDetails;
  organizationNodes: AssignmentCatalogs["organizationNodes"];
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const designations = employee.leadershipDesignations ?? [];

  return (
    <section className="rounded-xl border border-[#e3e9f4] bg-white p-4 shadow-[0_16px_38px_rgba(18,31,67,0.04)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
              Leadership eligibility
            </span>
            <span className="rounded-full bg-[#f4f7fc] px-3 py-1 text-[10px] font-black uppercase text-[#68748c]">
              {designations.length} active
            </span>
          </div>
          <h4 className="mt-3 text-lg font-extrabold text-[#121a46]">Govern who can be selected in assignments.</h4>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            Designate employees into controlled pools before they can be assigned as managers, supervisors, unit heads, or approvers.
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#eef5ff] text-[#3820d7]">
          <UserRoundCog size={20} aria-hidden="true" />
        </span>
      </div>

      {designations.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {designations.map((designation) => (
            <span
              key={designation.id}
              className="rounded-full border border-[#dce5f4] bg-[#fbfcff] px-3 py-1.5 text-[11px] font-black text-[#2f3650]"
            >
              {humanize(designation.role)}
              {designation.organizationNode?.name ? ` · ${designation.organizationNode.name}` : ""}
            </span>
          ))}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-5 grid gap-3 xl:grid-cols-[1fr_1fr_1.4fr_auto] xl:items-end">
        <label className="grid gap-1.5">
          <span className="text-[10px] font-black uppercase text-[#69738c]">Eligibility role</span>
          <select
            name="role"
            className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
            defaultValue="MANAGER"
          >
            {["MANAGER", "SUPERVISOR", "UNIT_HEAD", "DEPARTMENT_HEAD", "PROJECT_LEAD", "APPROVER"].map((role) => (
              <option key={role} value={role}>
                {humanize(role)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[10px] font-black uppercase text-[#69738c]">Org scope</span>
          <select
            name="organizationNodeId"
            className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
            defaultValue=""
          >
            <option value="">All assigned scope</option>
            {organizationNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.code} - {node.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[10px] font-black uppercase text-[#69738c]">Reason</span>
          <input
            name="reason"
            placeholder="Approved leadership eligibility"
            className="h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.2)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <BadgeCheck size={16} aria-hidden="true" />}
          Designate
        </button>
      </form>
    </section>
  );
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""));
}

function compactDeep(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return [key, compactDeep(item as Record<string, unknown>)] as const;
        }

        return [key, item] as const;
      })
      .filter(([, item]) => {
        if (item === undefined || item === "") return false;
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return Object.keys(item).length > 0;
        }
        return true;
      }),
  );
}

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function dateValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : "";
}

function numberValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value ? Number(value) : undefined;
}

function dateInputValue(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(amount?: string | number | null, currencyCode?: string | null) {
  if (amount === undefined || amount === null || amount === "") return "Not set";
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) return `${currencyCode ?? ""} ${String(amount)}`.trim();

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function uniqueEmployees(items: EmployeeListItem[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function payoutMask(account: { accountNumberLast4?: string | null; ibanLast4?: string | null; routingNumberLast4?: string | null; currencyCode?: string | null }) {
  const accountTail = account.accountNumberLast4 || account.ibanLast4;
  const accountLabel = accountTail ? `ending ${accountTail}` : "masked account";
  const routingLabel = account.routingNumberLast4 ? ` · routing ${account.routingNumberLast4}` : "";
  return `${account.currencyCode ?? "Currency"} · ${accountLabel}${routingLabel}`;
}

function primaryAssignment(employee: EmployeeDetails) {
  return employee.assignments?.find((assignment) => assignment.isPrimary) ?? employee.assignments?.[0] ?? null;
}

function assignmentTitle(assignment: WorkforceAssignment | null) {
  return assignment?.position?.title ?? assignment?.organizationNode?.name ?? "No active assignment";
}

function managerName(assignment: WorkforceAssignment | null) {
  const person = assignment?.managerEmployee?.person;
  return person ? personName(person) : "Unassigned";
}

function personName(person: Pick<WorkforcePerson, "firstName" | "middleName" | "lastName" | "preferredName">) {
  return person.preferredName || [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

function fallbackReadiness(employee: EmployeeDetails) {
  const checks = [
    { key: "legal_name", label: "Legal name", complete: Boolean(employee.person.firstName && employee.person.lastName) },
    { key: "hire_date", label: "Hire date", complete: Boolean(employee.hireDate) },
    { key: "primary_assignment", label: "Primary assignment", complete: Boolean(employee.assignments?.length) },
    { key: "email", label: "Email contact", complete: Boolean(employee.person.contacts?.some((contact) => contact.type === "EMAIL")) },
  ];
  const completed = checks.filter((check) => check.complete).length;
  const missing = checks.filter((check) => !check.complete).map(({ key, label }) => ({ key, label }));

  return {
    completed,
    total: checks.length,
    completionPercent: Math.round((completed / checks.length) * 100),
    missing,
    groups: {
      identity: { completed, total: checks.length, completionPercent: Math.round((completed / checks.length) * 100), missing },
      employment: { completed: 0, total: 0, completionPercent: 0, missing: [] },
      assignment: { completed: 0, total: 0, completionPercent: 0, missing: [] },
      contacts: { completed: 0, total: 0, completionPercent: 0, missing: [] },
      compliance: { completed: 0, total: 0, completionPercent: 0, missing: [] },
    },
  };
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not set";
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not set";
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function actionToneClass(tone: LifecycleAction["tone"]) {
  const classes = {
    primary: "bg-[#ece9ff] text-[#3820d7]",
    green: "bg-[#eaf9f2] text-[#0f8f66]",
    amber: "bg-[#fff4db] text-[#b66b00]",
    red: "bg-[#fff5f5] text-[#b42318]",
    slate: "bg-[#f3f4f8] text-[#596277]",
  };

  return classes[tone];
}

function lifecycleStatusClass(status: string) {
  if (status === "COMPLETED" || status === "CLEAR" || status === "VERIFIED") return "bg-[#eaf9f2] text-[#0f8f66]";
  if (status === "ACTIVE" || status === "IN_PROGRESS") return "bg-[#eef5ff] text-[#2f6eea]";
  if (status === "BLOCKED" || status === "REVIEW_REQUIRED" || status === "PENDING_VERIFICATION") return "bg-[#fff4db] text-[#b66b00]";
  if (status === "CANCELLED" || status === "REJECTED" || status === "ADVERSE_ACTION") return "bg-[#fff5f5] text-[#b42318]";
  return "bg-[#f3f4f8] text-[#596277]";
}

function clearanceClass(status: EmployeeClearanceStatus) {
  const classes: Record<EmployeeClearanceStatus, string> = {
    OPEN: "bg-[#eef5ff] text-[#2f6eea]",
    IN_PROGRESS: "bg-[#fff4db] text-[#b66b00]",
    CLEARED: "bg-[#eaf9f2] text-[#0f8f66]",
    BLOCKED: "bg-[#fff5f5] text-[#b42318]",
    WAIVED: "bg-[#f1ebff] text-[#6d35c4]",
    CANCELLED: "bg-[#f3f4f8] text-[#596277]",
  };

  return classes[status] ?? "bg-[#f3f4f8] text-[#596277]";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The lifecycle action could not be completed.";
}
