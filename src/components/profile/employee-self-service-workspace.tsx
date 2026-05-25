"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  ContactRound,
  FileCheck2,
  FileText,
  HeartPulse,
  Landmark,
  LockKeyhole,
  Loader2,
  MapPin,
  Save,
  ShieldCheck,
  UploadCloud,
  UserRound,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { AuthSession } from "@/lib/api/types";
import { displayUserName } from "@/lib/auth/user";
import type {
  EmployeeSelfServiceDocument,
  EmployeeSelfServiceProfile,
  EmployeeLifecycleTask,
  MyEmploymentResponse,
  WorkforceAssignment,
} from "@/lib/workforce/types";

type ProfilePerson = EmployeeSelfServiceProfile["person"] & {
  contacts?: Array<{
    id: string;
    type: string;
    value: string;
    label?: string | null;
    isPrimary?: boolean | null;
    verifiedAt?: string | null;
  }>;
  addresses?: Array<{
    id: string;
    type?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    isPrimary?: boolean | null;
  }>;
};

export type ProfileSectionKey = "overview" | "personal" | "records" | "terms" | "tasks" | "documents" | "access";

type SelfServiceDocumentUploadIntent = {
  provider: "local" | "s3" | "external";
  method: "PUT";
  uploadUrl: string;
  fileUrl: string;
  objectKey: string;
  expiresAt: string;
  headers: Record<string, string>;
  version: {
    fileName: string;
    fileUrl: string;
    mimeType?: string;
    sizeBytes?: number;
    checksum?: string;
    setCurrent?: boolean;
    metadata?: Record<string, unknown>;
  };
};

export function EmployeeSelfServiceWorkspace({
  session,
  employment,
  initialSection = "overview",
}: {
  session: AuthSession;
  employment: MyEmploymentResponse | null;
  initialSection?: ProfileSectionKey;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSectionKey>(initialSection);
  const sectionTopRef = useRef<HTMLDivElement>(null);
  const employee = employment?.employee ?? null;
  const person = employee?.person as ProfilePerson | undefined;
  const primaryAssignment = employee ? currentAssignment(employee.assignments) : null;
  const documents = employee?.documents ?? [];
  const timeline = employee?.timelineEvents ?? [];
  const actions = employee?.workforceActions ?? [];
  const displayName = employee && person ? personName(person) : displayUserName(session.user);
  const readiness = employee?.masterDataReadiness?.completionPercent ?? readinessScore(employee, primaryAssignment, documents);

  async function updateSelfServiceProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = compactDeep({
      preferredName: stringValue(formData, "preferredName"),
      photoUrl: stringValue(formData, "photoUrl"),
      bio: stringValue(formData, "bio"),
      personalEmail: stringValue(formData, "personalEmail"),
      phone: stringValue(formData, "phone"),
      address: {
        type: "home",
        line1: stringValue(formData, "line1"),
        line2: stringValue(formData, "line2"),
        city: stringValue(formData, "city"),
        state: stringValue(formData, "state"),
        postalCode: stringValue(formData, "postalCode"),
      },
      emergencyContact: {
        name: stringValue(formData, "emergencyName"),
        relationship: stringValue(formData, "emergencyRelationship"),
        phone: stringValue(formData, "emergencyPhone"),
        email: stringValue(formData, "emergencyEmail"),
      },
      demographics: {
        pronouns: stringValue(formData, "pronouns"),
        preferredLanguageCode: stringValue(formData, "preferredLanguageCode"),
        ethnicity: stringValue(formData, "ethnicity"),
        religion: stringValue(formData, "religion"),
        disabilityAccommodation: stringValue(formData, "disabilityAccommodation"),
        veteranCategory: stringValue(formData, "veteranCategory"),
        consentGiven: formData.get("consentGiven") === "on",
      },
    });

    setMessage(null);

    startTransition(async () => {
      try {
        await apiFetch("/employees/me/master-data", {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Your profile has been updated." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      }
    });
  }

  async function updateSelfServiceRecords(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const dependentRaw = {
      fullName: stringValue(formData, "dependentFullName"),
      relationship: stringValue(formData, "dependentRelationship"),
      dateOfBirth: dateValue(formData, "dependentDateOfBirth"),
      benefitEligible: formData.get("dependentBenefitEligible") === "on",
      taxDependent: formData.get("dependentTaxDependent") === "on",
    };
    const referenceCore = {
      name: stringValue(formData, "referenceName"),
      relationship: stringValue(formData, "referenceRelationship"),
      company: stringValue(formData, "referenceCompany"),
      email: stringValue(formData, "referenceEmail"),
      phone: stringValue(formData, "referencePhone"),
    };
    const payoutRaw = {
      accountHolderName: stringValue(formData, "payoutAccountHolderName"),
      bankName: stringValue(formData, "payoutBankName"),
      accountType: stringValue(formData, "payoutAccountType"),
      currencyCode: stringValue(formData, "payoutCurrencyCode"),
      accountNumber: stringValue(formData, "payoutAccountNumber"),
      routingNumber: stringValue(formData, "payoutRoutingNumber"),
      allocationPercent: numberValue(formData, "payoutAllocationPercent"),
      isPrimary: formData.get("payoutIsPrimary") === "on",
    };
    const statutoryCore = {
      label: stringValue(formData, "statutoryLabel"),
      identifier: stringValue(formData, "statutoryIdentifier"),
      issuedAt: dateValue(formData, "statutoryIssuedAt"),
      expiresAt: dateValue(formData, "statutoryExpiresAt"),
      note: stringValue(formData, "statutoryNote"),
    };
    const workEligibilityCore = {
      workPermitRequired: formData.get("workPermitRequired") === "on",
      permitType: stringValue(formData, "permitType"),
      permitNumber: stringValue(formData, "permitNumber"),
      issuedAt: dateValue(formData, "permitIssuedAt"),
      expiresAt: dateValue(formData, "permitExpiresAt"),
      note: stringValue(formData, "eligibilityNote"),
    };
    const dependent = compactDeep(dependentRaw);
    const reference = compactDeep({ type: stringValue(formData, "referenceType") || "PROFESSIONAL", ...referenceCore });
    const payoutAccount = compactDeep(payoutRaw);
    const statutoryIdentifier = compactDeep({
      type: stringValue(formData, "statutoryType") || "TAX_ID",
      status: "PENDING_VERIFICATION",
      ...statutoryCore,
    });
    const workEligibility = compactDeep({
      status: "PENDING_REVIEW",
      ...workEligibilityCore,
    });
    const payload = compactDeep({
      dependents: hasUserEnteredRecord(dependentRaw) ? [dependent] : undefined,
      references: hasUserEnteredRecord(referenceCore) ? [reference] : undefined,
      payoutAccounts: hasUserEnteredRecord(payoutRaw, ["isPrimary"]) ? [payoutAccount] : undefined,
      statutoryIdentifiers: hasUserEnteredRecord(statutoryCore) ? [statutoryIdentifier] : undefined,
      workEligibility: hasUserEnteredRecord(workEligibilityCore) ? workEligibility : undefined,
    });

    if (!Object.keys(payload).length) {
      setMessage({ type: "error", text: "Add a family, reference, payout, or eligibility record before saving." });
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        await apiFetch("/employees/me/extended-profile", {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage({ type: "success", text: "Your employment records were submitted for review." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      }
    });
  }

  async function completeSelfLifecycleTask(taskId: string) {
    setMessage(null);

    startTransition(async () => {
      try {
        await apiFetch(`/employees/me/lifecycle-tasks/${taskId}/complete`, {
          method: "POST",
          body: JSON.stringify({ note: "Completed from my employment workspace." }),
        });
        setMessage({ type: "success", text: "Task completed." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      }
    });
  }

  async function submitSelfServiceDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    const selectedFile = selectedFileFromForm(formData, "documentFile");
    const payload = compactDeep({
      title: stringValue(formData, "documentTitle"),
      description: stringValue(formData, "documentDescription"),
      expiresAt: dateValue(formData, "documentExpiresAt"),
    });

    if (!payload.title) {
      setMessage({ type: "error", text: "Enter a document title before submitting." });
      return;
    }

    if (!selectedFile) {
      setMessage({ type: "error", text: "Choose a file to upload before submitting the document." });
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        const checksum = await sha256Checksum(selectedFile);
        const intent = await apiFetch<SelfServiceDocumentUploadIntent>("/employees/me/documents/upload-intent", {
          method: "POST",
          body: JSON.stringify(
            compactDeep({
              fileName: selectedFile.name,
              mimeType: selectedFile.type || "application/octet-stream",
              sizeBytes: selectedFile.size,
              checksum,
              metadata: {
                source: "employee-self-service-browser-upload",
              },
            }),
          ),
        });

        await uploadFileWithIntent(intent, selectedFile);

        await apiFetch("/employees/me/documents", {
          method: "POST",
          body: JSON.stringify(
            compactDeep({
              ...payload,
              fileName: intent.version.fileName,
              fileUrl: intent.version.fileUrl,
              mimeType: intent.version.mimeType || selectedFile.type || "application/octet-stream",
              sizeBytes: intent.version.sizeBytes ?? selectedFile.size,
              checksum: intent.version.checksum || checksum,
              metadata: intent.version.metadata,
            }),
          ),
        });
        form.reset();
        setMessage({ type: "success", text: "Your file was uploaded and submitted for HR review." });
        router.refresh();
      } catch (error) {
        setMessage({ type: "error", text: errorMessage(error) });
      }
    });
  }

  if (!employee) {
    return (
      <section className="rounded-xl border border-[#dfe8f6] bg-white p-6 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
          <UserRound size={22} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-black text-[#10143f]">Your employee profile is not linked yet.</h2>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[#68748c]">
          Your account is active, but TimeSync has not connected it to an employee record. Once HR links your person profile and employment relationship, your assignment, documents, and employment history will appear here.
        </p>
        <Link
          href="/notifications"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-black text-white! shadow-[0_14px_30px_rgba(56,32,215,0.2)]"
        >
          Open notifications
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }

  const visibleTasks = (employee.lifecycleTasks ?? []).filter((task) => task.ownerType === "EMPLOYEE" || task.assignedEmployeeId);
  const openTasks = visibleTasks.filter((task) => !["COMPLETED", "WAIVED", "CANCELLED"].includes(task.status));
  const sectionItems = profileSections({
    documents: documents.length,
    tasks: openTasks.length,
    records:
      (employee.dependents?.length ?? 0) +
      (employee.references?.length ?? 0) +
      (employee.payoutAccounts?.length ?? 0) +
      (employee.statutoryIdentifiers?.length ?? 0) +
      (employee.workEligibility ? 1 : 0),
  });
  const lockedRecordCount = selfServiceLockedRecordCount(employee);
  const selectProfileSection = (section: ProfileSectionKey) => {
    setActiveSection(section);
    window.requestAnimationFrame(() => {
      sectionTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="relative grid gap-5 p-5 lg:grid-cols-[1fr_340px]">
          <div className="pointer-events-none absolute inset-0 bg-purple-50/70" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ece9ff] px-3 py-1 text-[10px] font-extrabold uppercase text-[#3820d7]">
                My employment
              </span>
              <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase ${statusClass(employee.status)}`}>
                {humanize(employee.status)}
              </span>
            </div>

            <h2 className="mt-4 max-w-4xl text-[clamp(1.6rem,3vw,2.55rem)] font-black leading-tight text-[#10143f]">
              Welcome back, {displayName}.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[#5d6782]">
              Review your employment record, current assignment, documents available to you, and recent workforce history from one personal workspace.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ProfileMetric label="Employee number" value={employee.employeeNumber} icon={BadgeCheck} />
              <ProfileMetric label="Employment type" value={humanize(employee.employmentType)} icon={BriefcaseBusiness} />
              <ProfileMetric label="Hire date" value={formatDate(employee.hireDate)} icon={CalendarClock} />
              <ProfileMetric label="Readiness" value={`${readiness}%`} icon={ShieldCheck} />
            </div>
          </div>

          <div className="relative rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_16px_42px_rgba(17,20,58,0.16)]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/52">Current assignment</p>
            <h3 className="mt-3 text-2xl font-black">{assignmentTitle(primaryAssignment)}</h3>
            <div className="mt-4 space-y-3 text-sm font-semibold text-white/72">
              <AssignmentLine label="Organization" value={primaryAssignment?.organizationNode?.name} />
              <AssignmentLine label="Cost center" value={primaryAssignment?.costCenter?.name} />
              <AssignmentLine label="Manager" value={managerName(primaryAssignment)} />
              <AssignmentLine label="Effective from" value={formatDate(primaryAssignment?.effectiveFrom)} />
            </div>
          </div>
        </div>
      </section>

      <ProfileSectionNav
        sections={sectionItems}
        activeSection={activeSection}
        lockedRecordCount={lockedRecordCount}
        onChange={selectProfileSection}
      />

      <div ref={sectionTopRef} className="scroll-mt-28">
        {activeSection === "overview" ? (
          <SelfServiceOverviewPanel
            session={session}
            employee={employee}
            person={person}
            displayName={displayName}
            primaryAssignment={primaryAssignment}
            timeline={timeline}
            actionsCount={actions.length}
            documentsCount={documents.length}
            openTasksCount={openTasks.length}
            recordsCount={sectionItems.find((item) => item.key === "records")?.count ?? 0}
            onOpenSection={selectProfileSection}
          />
        ) : null}

        {activeSection === "personal" ? (
          <SelfServiceMasterDataPanel
            person={person}
            pending={isPending}
            message={message}
            onSubmit={updateSelfServiceProfile}
          />
        ) : null}

        {activeSection === "records" ? (
          <SelfServiceExtendedRecordsPanel
            employee={employee}
            pending={isPending}
            onSubmit={updateSelfServiceRecords}
          />
        ) : null}

        {activeSection === "terms" ? <SelfServiceEmploymentTermsPanel employee={employee} /> : null}

        {activeSection === "tasks" ? (
          <SelfServiceLifecycleTasksPanel
            tasks={employee.lifecycleTasks ?? []}
            pending={isPending}
            onComplete={completeSelfLifecycleTask}
          />
        ) : null}

        {activeSection === "documents" ? (
          <SelfServiceDocumentsPanel
            documents={documents}
            pending={isPending}
            onSubmit={submitSelfServiceDocument}
          />
        ) : null}

        {activeSection === "access" ? <SelfServiceAccessPanel session={session} /> : null}
      </div>
    </div>
  );
}

function ProfileMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-[#dfe8f6] bg-white/82 p-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef5ff] text-[#3820d7]">
        <Icon size={17} aria-hidden="true" />
      </span>
      <p className="mt-3 text-[10px] font-black uppercase text-[#68748c]">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#10143f]">{value}</p>
    </div>
  );
}

function profileSections(counts: { documents: number; tasks: number; records: number }) {
  return [
    {
      key: "overview",
      label: "Overview",
      description: "Snapshot and recent history",
      icon: UserRound,
    },
    {
      key: "personal",
      label: "Personal details",
      description: "Contact, address, emergency",
      icon: ContactRound,
    },
    {
      key: "records",
      label: "Employment records",
      description: "Family, references, payout",
      icon: FileCheck2,
      count: counts.records,
    },
    {
      key: "terms",
      label: "Terms",
      description: "Contract and reporting",
      icon: BriefcaseBusiness,
    },
    {
      key: "tasks",
      label: "Tasks",
      description: "Actions assigned to you",
      icon: ClipboardCheck,
      count: counts.tasks,
    },
    {
      key: "documents",
      label: "Documents",
      description: "Files and submissions",
      icon: FileText,
      count: counts.documents,
    },
    {
      key: "access",
      label: "Access",
      description: "Role and account notices",
      icon: ShieldCheck,
    },
  ] satisfies Array<{
    key: ProfileSectionKey;
    label: string;
    description: string;
    icon: LucideIcon;
    count?: number;
  }>;
}

function ProfileSectionNav({
  sections,
  activeSection,
  lockedRecordCount,
  onChange,
}: {
  sections: ReturnType<typeof profileSections>;
  activeSection: ProfileSectionKey;
  lockedRecordCount: number;
  onChange: (section: ProfileSectionKey) => void;
}) {
  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-4 shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7b849b]">Profile workspace</p>
          <h3 className="mt-1 text-lg font-black text-[#10143f]">Choose one section to work on</h3>
        </div>
        <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] px-3 py-2 text-[12px] font-bold text-[#5d6782]">
          <LockKeyhole size={15} className="shrink-0 text-[#3820d7]" aria-hidden="true" />
          <span className="truncate">
            {lockedRecordCount} submitted sensitive {lockedRecordCount === 1 ? "record is" : "records are"} review-only
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
        {sections.map((section) => {
          const active = section.key === activeSection;
          const Icon = section.icon;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onChange(section.key)}
              className={`group relative flex min-h-[82px] items-center gap-3 rounded-xl border p-3 text-left transition ${
                active
                  ? "border-[#3820d7] bg-[#f5f3ff] shadow-[0_12px_28px_rgba(56,32,215,0.12)]"
                  : "border-[#e4ebf6] bg-[#fbfcff] hover:border-[#cbd8f0] hover:bg-white"
              }`}
            >
              {active ? <span className="absolute inset-x-3 top-0 h-1 rounded-b-full bg-[#3820d7]" /> : null}
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                  active ? "bg-[#3820d7] text-white" : "bg-[#eef5ff] text-[#66718a] group-hover:text-[#3820d7]"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-black text-[#10143f]">{section.label}</span>
                  {section.count !== undefined ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? "bg-white text-[#3820d7]" : "bg-[#eef2fa] text-[#68748c]"}`}>
                      {section.count}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 line-clamp-2 block text-[11px] font-semibold leading-4 text-[#7b849b]">{section.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SelfServiceOverviewPanel({
  session,
  employee,
  person,
  displayName,
  primaryAssignment,
  timeline,
  actionsCount,
  documentsCount,
  openTasksCount,
  recordsCount,
  onOpenSection,
}: {
  session: AuthSession;
  employee: EmployeeSelfServiceProfile;
  person?: ProfilePerson;
  displayName: string;
  primaryAssignment: WorkforceAssignment | null;
  timeline: NonNullable<EmployeeSelfServiceProfile["timelineEvents"]>;
  actionsCount: number;
  documentsCount: number;
  openTasksCount: number;
  recordsCount: number;
  onOpenSection: (section: ProfileSectionKey) => void;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-5">
        <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase text-[#68748c]">Profile snapshot</p>
              <h3 className="mt-1 text-xl font-black text-[#10143f]">Your employment file</h3>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
              <BriefcaseBusiness size={20} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <InfoTile label="Full name" value={person ? personName(person) : displayName} />
            <InfoTile label="Preferred name" value={person?.preferredName ?? "Not set"} />
            <InfoTile label="Confirmation date" value={formatDate(employee.confirmationDate)} />
            <InfoTile label="End date" value={formatDate(employee.endDate)} />
            <InfoTile label="Primary contact" value={primaryContact(person)} />
            <InfoTile label="Primary location" value={primaryAddress(person)} />
          </div>
        </div>

        <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <p className="text-[11px] font-black uppercase text-[#68748c]">Quick paths</p>
          <h3 className="mt-1 text-xl font-black text-[#10143f]">Continue where it matters</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ProfileActionCard
              icon={ContactRound}
              title="Update personal details"
              description="Keep contact, address, emergency, and voluntary profile details current."
              action="Open details"
              onClick={() => onOpenSection("personal")}
            />
            <ProfileActionCard
              icon={FileCheck2}
              title="Submit employment records"
              description="Add family, reference, payout, tax, and eligibility records for review."
              action="Open records"
              onClick={() => onOpenSection("records")}
              count={recordsCount}
            />
            <ProfileActionCard
              icon={ClipboardCheck}
              title="Complete assigned tasks"
              description="Finish onboarding, document, and readiness actions assigned to you."
              action="Open tasks"
              onClick={() => onOpenSection("tasks")}
              count={openTasksCount}
            />
            <ProfileActionCard
              icon={FileText}
              title="Manage documents"
              description="Review employee-visible files and submit new supporting documents."
              action="Open documents"
              onClick={() => onOpenSection("documents")}
              count={documentsCount}
            />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase text-[#68748c]">Current placement</p>
              <h3 className="mt-1 text-xl font-black text-[#10143f]">{assignmentTitle(primaryAssignment)}</h3>
            </div>
            <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-[11px] font-black text-[#3820d7]">
              {employee.employeeNumber}
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            <InfoTile label="Organization" value={primaryAssignment?.organizationNode?.name ?? "Not assigned"} />
            <InfoTile label="Cost center" value={primaryAssignment?.costCenter?.name ?? "Not assigned"} />
            <InfoTile label="Manager" value={managerName(primaryAssignment)} />
            <InfoTile label="Effective from" value={formatDate(primaryAssignment?.effectiveFrom)} />
          </div>
        </div>

        <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <p className="text-[11px] font-black uppercase text-[#68748c]">Useful places</p>
          <h3 className="mt-1 text-xl font-black text-[#10143f]">Personal workspace links</h3>
          <div className="mt-5 grid gap-3">
            <QuickLink href="/notifications" title="Notifications" description="Open account notices and workflow messages." icon={Bell} />
            <QuickLink href="/hr-guides" title="HR guides" description="Read policies, operating guides, and workforce articles." icon={BookOpenText} />
            <button
              type="button"
              onClick={() => onOpenSection("access")}
              className="group flex items-center gap-3 rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-4 text-left transition hover:border-[#cbd8f0] hover:bg-white"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#3820d7]">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-[#10143f]">Access and security</span>
                <span className="mt-1 block text-[12px] font-semibold leading-5 text-[#68748c]">
                  Review the role attached to your current session.
                </span>
              </span>
              <ArrowRight size={16} className="text-[#8a92a6] transition group-hover:translate-x-1 group-hover:text-[#3820d7]" aria-hidden="true" />
            </button>
          </div>
        </div>

        <EmployeeTimelineCard timeline={timeline} actionsCount={actionsCount} />

        <div className="rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(18,31,67,0.12)]">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/48">Signed in as</p>
          <h3 className="mt-3 text-xl font-black">{displayUserName(session.user)}</h3>
          <p className="mt-2 text-sm font-semibold text-white/64">
            {session.user.roles.join(", ") || session.user.type}
          </p>
        </div>
      </div>
    </section>
  );
}

function ProfileActionCard({
  icon: Icon,
  title,
  description,
  action,
  count,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#cbd8f0] hover:bg-white hover:shadow-[0_18px_38px_rgba(18,31,67,0.08)]"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
          <Icon size={20} aria-hidden="true" />
        </span>
        {count !== undefined ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#68748c] shadow-[inset_0_0_0_1px_#dfe8f6]">
            {count}
          </span>
        ) : null}
      </span>
      <span className="mt-4 block text-sm font-black text-[#10143f]">{title}</span>
      <span className="mt-2 block min-h-12 text-[12px] font-semibold leading-6 text-[#68748c]">{description}</span>
      <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-black text-[#3820d7]">
        {action}
        <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </button>
  );
}

function EmployeeTimelineCard({
  timeline,
  actionsCount,
}: {
  timeline: NonNullable<EmployeeSelfServiceProfile["timelineEvents"]>;
  actionsCount: number;
}) {
  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase text-[#68748c]">Recent history</p>
          <h3 className="mt-1 text-xl font-black text-[#10143f]">Employment timeline</h3>
        </div>
        <span className="rounded-full bg-[#f6f8fd] px-3 py-1 text-[11px] font-black text-[#68748c]">
          {actionsCount} actions
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {timeline.length > 0 ? (
          timeline.slice(0, 5).map((event) => (
            <div key={event.id} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-4">
              <p className="text-sm font-black text-[#10143f]">{event.title}</p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-[#68748c]">
                {event.description ?? "A workforce event was recorded."}
              </p>
              <p className="mt-2 text-[10px] font-black uppercase text-[#9aa2b3]">{formatDateTime(event.createdAt)}</p>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-4 text-sm font-semibold leading-6 text-[#68748c]">
            Your employment timeline will appear as HR completes onboarding, assignments, and lifecycle updates.
          </p>
        )}
      </div>
    </div>
  );
}

function SelfServiceEmploymentTermsPanel({ employee }: { employee: EmployeeSelfServiceProfile }) {
  const terms = employee.employmentTerms ?? [];
  const components = employee.compensationComponents ?? [];
  const relationships = employee.reportingRelationships ?? [];
  const activeTerm = terms.find((term) => term.status === "ACTIVE" && !term.effectiveTo) ?? terms[0] ?? null;
  const activeRelationships = relationships.filter((relationship) => relationship.status === "ACTIVE");

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase text-[#68748c]">Terms and reporting</p>
          <h3 className="mt-1 text-xl font-black text-[#10143f]">Your employment terms</h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            View the controlled employment terms, pay-readiness records, and reporting lines currently visible on your employee file.
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
          <BriefcaseBusiness size={20} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoTile label="Contract type" value={activeTerm ? humanize(activeTerm.contractType) : "Not set"} />
        <InfoTile label="Pay cadence" value={activeTerm?.payFrequency ? humanize(activeTerm.payFrequency) : "Not set"} />
        <InfoTile label="Base placeholder" value={formatMoney(activeTerm?.baseAmount, activeTerm?.currencyCode)} />
        <InfoTile label="Reporting lines" value={`${activeRelationships.length}`} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <SelfRecordList
          title="Employment terms"
          items={terms.map((term) => ({
            id: term.id,
            title: term.title || humanize(term.contractType),
            detail: `${humanize(term.status)} · ${formatDate(term.effectiveFrom)} to ${formatDate(term.effectiveTo)} · ${[term.position?.title, term.organizationNode?.name].filter(Boolean).join(" · ") || "Terms record"}`,
          }))}
          empty="No employment terms are visible yet."
        />
        <SelfRecordList
          title="Pay-readiness components"
          items={components.map((component) => ({
            id: component.id,
            title: component.name,
            detail: `${humanize(component.type)} · ${formatMoney(component.amount, component.currencyCode)} · ${component.frequency ? humanize(component.frequency) : "Frequency not set"}`,
          }))}
          empty="No pay-readiness components are visible yet."
        />
        <SelfRecordList
          title="Reporting relationships"
          items={relationships.map((relationship) => ({
            id: relationship.id,
            title: humanize(relationship.type),
            detail: `${relationship.relatedEmployee?.person ? personName(relationship.relatedEmployee.person) : "Related employee"} · ${formatDate(relationship.startsAt)} to ${formatDate(relationship.endsAt)}`,
          }))}
          empty="No additional reporting relationships are visible yet."
        />
      </div>
    </section>
  );
}

function SelfServiceMasterDataPanel({
  person,
  pending,
  message,
  onSubmit,
}: {
  person?: ProfilePerson;
  pending: boolean;
  message: { type: "success" | "error"; text: string } | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const email = contactByType(person, "EMAIL");
  const phone = contactByType(person, "PHONE");
  const address = person?.addresses?.find((item) => item.isPrimary) ?? person?.addresses?.[0];
  const emergency = person?.emergencyContacts?.find((item) => item.isPrimary) ?? person?.emergencyContacts?.[0];
  const demographics = person?.demographicProfile;

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase text-[#68748c]">My profile details</p>
          <h3 className="mt-1 text-xl font-black text-[#10143f]">Keep your personal record current</h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            Update the contact, emergency, and voluntary profile information HR uses for communication, support, and employment readiness.
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
          <ContactRound size={20} aria-hidden="true" />
        </span>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SelfInput name="preferredName" label="Preferred name" defaultValue={person?.preferredName} />
          <SelfInput name="personalEmail" label="Personal email" defaultValue={email?.value} type="email" />
          <SelfInput name="phone" label="Mobile phone" defaultValue={phone?.value} />
          <SelfInput name="photoUrl" label="Profile photo URL" defaultValue={person?.photoUrl} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <fieldset className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
            <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
              <MapPin size={17} className="text-[#3820d7]" aria-hidden="true" />
              Home address
            </legend>
            <div className="mt-3 grid gap-3">
              <SelfInput name="line1" label="Address line 1" defaultValue={address?.line1} />
              <SelfInput name="line2" label="Address line 2" defaultValue={address?.line2} />
              <div className="grid gap-3 sm:grid-cols-3">
                <SelfInput name="city" label="City" defaultValue={address?.city} />
                <SelfInput name="state" label="State" defaultValue={address?.state} />
                <SelfInput name="postalCode" label="Postal code" defaultValue={address?.postalCode} />
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
            <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
              <HeartPulse size={17} className="text-[#19a974]" aria-hidden="true" />
              Emergency contact
            </legend>
            <div className="mt-3 grid gap-3">
              <SelfInput name="emergencyName" label="Name" defaultValue={emergency?.name} />
              <SelfInput name="emergencyRelationship" label="Relationship" defaultValue={emergency?.relationship} />
              <SelfInput name="emergencyPhone" label="Phone" defaultValue={emergency?.phone} />
              <SelfInput name="emergencyEmail" label="Email" defaultValue={emergency?.email} type="email" />
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
            <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#10143f]">
              <ShieldCheck size={17} className="text-[#3820d7]" aria-hidden="true" />
              Voluntary profile
            </legend>
            <div className="mt-3 grid gap-3">
              <SelfInput name="pronouns" label="Pronouns" defaultValue={demographics?.pronouns} />
              <SelfInput name="preferredLanguageCode" label="Preferred language" defaultValue={demographics?.preferredLanguageCode} />
              <SelfInput name="ethnicity" label="Ethnicity" defaultValue={demographics?.ethnicity} />
              <SelfInput name="religion" label="Religion" defaultValue={demographics?.religion} />
              <SelfInput name="disabilityAccommodation" label="Accommodation notes" defaultValue={demographics?.disabilityAccommodation} />
              <SelfInput name="veteranCategory" label="Veteran category" defaultValue={demographics?.veteranCategory} />
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
                <input
                  name="consentGiven"
                  type="checkbox"
                  defaultChecked={Boolean(demographics?.consentGivenAt && !demographics.consentWithdrawnAt)}
                  className="h-4 w-4 accent-[#3820d7]"
                />
                Consent on file
              </label>
            </div>
          </fieldset>
        </div>

        <label className="grid gap-1.5">
          <span className="text-[10px] font-black uppercase text-[#69738c]">Profile summary</span>
          <textarea
            name="bio"
            defaultValue={person?.bio ?? ""}
            rows={3}
            placeholder="Share work preferences, accessibility notes, or a short profile summary"
            className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {message ? (
            <p
              className={`rounded-lg px-3 py-2 text-sm font-bold ${
                message.type === "success" ? "bg-[#eaf9f2] text-[#0f8f66]" : "bg-[#fff5f5] text-[#b42318]"
              }`}
            >
              {message.text}
            </p>
          ) : (
            <p className="text-[12px] font-semibold leading-5 text-[#68748c]">
              Legal name, hire dates, compensation, and assignment changes are maintained by authorized HR teams.
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.2)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            Save profile
          </button>
        </div>
      </form>
    </section>
  );
}

function SelfServiceExtendedRecordsPanel({
  employee,
  pending,
  onSubmit,
}: {
  employee: EmployeeSelfServiceProfile;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const dependents = employee.dependents ?? [];
  const references = employee.references ?? [];
  const payoutAccounts = employee.payoutAccounts ?? [];
  const statutoryIdentifiers = employee.statutoryIdentifiers ?? [];
  const eligibility = employee.workEligibility;

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase text-[#68748c]">Employment records</p>
          <h3 className="mt-1 text-xl font-black text-[#10143f]">Family, references, payout, and eligibility</h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            Submit supporting records for HR review. Sensitive payout details are stored as masked verification data.
          </p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
          <FileCheck2 size={20} aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SelfRecordMetric icon={UsersRound} label="Family records" value={`${dependents.length}`} />
        <SelfRecordMetric icon={UserRoundCheck} label="References" value={`${references.length}`} />
        <SelfRecordMetric icon={Banknote} label="Payout" value={payoutAccounts[0] ? humanize(payoutAccounts[0].status) : "Not set"} />
        <SelfRecordMetric icon={Landmark} label="Tax and statutory" value={`${statutoryIdentifiers.length}`} />
      </div>

      <div className="mt-5 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#ece9ff] text-[#3820d7]">
              <LockKeyhole size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-[#10143f]">Controlled record rule</p>
              <p className="mt-1 max-w-3xl text-[12px] font-semibold leading-5 text-[#68748c]">
                Payout, statutory, work-eligibility, and reference records become review-only after submission. You will see masked values and status, but HR must reject, reopen, or request a replacement before the original record can be changed.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-[#68748c] shadow-[inset_0_0_0_1px_#dfe8f6]">
            Masked after submit
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          <SelfRecordList
            title="Current records"
            items={[
              ...dependents.map((dependent) => ({
                id: `dependent-${dependent.id}`,
                title: dependent.fullName,
                detail: `${dependent.relationship} · ${dependent.benefitEligible ? "Benefit eligible" : "Recorded"}`,
                status: "Employee visible",
              })),
              ...references.map((reference) => ({
                id: `reference-${reference.id}`,
                title: reference.name,
                detail: `${humanize(reference.type)} · ${humanize(reference.status)} · ${reference.company ?? reference.relationship ?? "Reference"}`,
                status: sensitiveRecordStatusLabel(reference.status),
              })),
              ...payoutAccounts.map((account) => ({
                id: `payout-${account.id}`,
                title: account.bankName,
                detail: payoutMask(account),
                status: sensitiveRecordStatusLabel(account.status),
              })),
              ...statutoryIdentifiers.map((identifier) => ({
                id: `statutory-${identifier.id}`,
                title: identifier.label || humanize(identifier.type),
                detail: `${humanize(identifier.status)} · ${
                  identifier.identifierLast4 ? `ending ${identifier.identifierLast4}` : "masked identifier"
                }`,
                status: sensitiveRecordStatusLabel(identifier.status),
              })),
              ...(eligibility
                ? [
                    {
                      id: `eligibility-${eligibility.id}`,
                      title: humanize(eligibility.status),
                      detail: eligibility.expiresAt ? `Expires ${formatDate(eligibility.expiresAt)}` : "Work eligibility record",
                      status: sensitiveRecordStatusLabel(eligibility.status),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <form onSubmit={onSubmit} className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
          <p className="text-sm font-black text-[#10143f]">Submit or refresh records</p>
          <div className="mt-4 grid gap-4">
            <fieldset className="grid gap-3 md:grid-cols-2">
              <legend className="mb-2 text-[10px] font-black uppercase text-[#68748c]">Family or beneficiary</legend>
              <SelfInput name="dependentFullName" label="Full name" />
              <SelfInput name="dependentRelationship" label="Relationship" />
              <SelfInput name="dependentDateOfBirth" label="Date of birth" type="date" />
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
                <input name="dependentBenefitEligible" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
                Benefit eligible
              </label>
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
                <input name="dependentTaxDependent" type="checkbox" className="h-4 w-4 accent-[#3820d7]" />
                Tax dependent
              </label>
            </fieldset>

            <fieldset className="grid gap-3 md:grid-cols-2">
              <legend className="mb-2 text-[10px] font-black uppercase text-[#68748c]">Reference</legend>
              <SelfSelect name="referenceType" label="Reference type" defaultValue="PROFESSIONAL" options={["PROFESSIONAL", "EMPLOYMENT", "ACADEMIC", "CHARACTER", "OTHER"]} />
              <SelfInput name="referenceName" label="Name" />
              <SelfInput name="referenceRelationship" label="Relationship" />
              <SelfInput name="referenceCompany" label="Company" />
              <SelfInput name="referenceEmail" label="Email" type="email" />
              <SelfInput name="referencePhone" label="Phone" />
            </fieldset>

            <fieldset className="grid gap-3 md:grid-cols-2">
              <legend className="mb-2 text-[10px] font-black uppercase text-[#68748c]">Payout account</legend>
              <SelfInput name="payoutAccountHolderName" label="Account holder" />
              <SelfInput name="payoutBankName" label="Bank name" />
              <SelfInput name="payoutAccountType" label="Account type" />
              <SelfInput name="payoutCurrencyCode" label="Currency" />
              <SelfInput name="payoutAccountNumber" label="Account number" />
              <SelfInput name="payoutRoutingNumber" label="Routing number" />
              <SelfInput name="payoutAllocationPercent" label="Allocation %" type="number" />
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
                <input name="payoutIsPrimary" type="checkbox" defaultChecked className="h-4 w-4 accent-[#3820d7]" />
                Primary account
              </label>
            </fieldset>

            <fieldset className="grid gap-3 md:grid-cols-2">
              <legend className="mb-2 text-[10px] font-black uppercase text-[#68748c]">Tax and statutory identifier</legend>
              <SelfSelect name="statutoryType" label="Identifier type" defaultValue="TAX_ID" options={["TAX_ID", "NATIONAL_ID", "SOCIAL_SECURITY", "PENSION", "INSURANCE", "HEALTH_INSURANCE", "WORK_PERMIT", "OTHER"]} />
              <SelfInput name="statutoryLabel" label="Label" />
              <SelfInput name="statutoryIdentifier" label="Identifier" />
              <SelfInput name="statutoryIssuedAt" label="Issued" type="date" />
              <SelfInput name="statutoryExpiresAt" label="Expires" type="date" />
              <SelfInput name="statutoryNote" label="Review note" />
            </fieldset>

            <fieldset className="grid gap-3 md:grid-cols-2">
              <legend className="mb-2 text-[10px] font-black uppercase text-[#68748c]">Work eligibility</legend>
              <SelfInput name="permitType" label="Permit type" defaultValue={eligibility?.permitType} />
              <SelfInput name="permitNumber" label="Permit number" defaultValue={eligibility?.permitNumber} />
              <SelfInput name="permitIssuedAt" label="Issued" type="date" defaultValue={dateInputValue(eligibility?.issuedAt)} />
              <SelfInput name="permitExpiresAt" label="Expires" type="date" defaultValue={dateInputValue(eligibility?.expiresAt)} />
              <label className="flex min-h-10 items-center gap-3 rounded-lg border border-[#d3d9e8] bg-white px-3 text-[12px] font-black text-[#151936]">
                <input name="workPermitRequired" type="checkbox" defaultChecked={eligibility?.workPermitRequired ?? false} className="h-4 w-4 accent-[#3820d7]" />
                Permit required
              </label>
              <SelfInput name="eligibilityNote" label="Review note" defaultValue={eligibility?.note} />
            </fieldset>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] font-semibold leading-5 text-[#68748c]">
              Submitting creates a reviewed replacement record. It does not expose stored bank, tax, or eligibility values after upload.
            </p>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(56,32,215,0.2)] transition hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
              Submit records
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function SelfServiceLifecycleTasksPanel({
  tasks,
  pending,
  onComplete,
}: {
  tasks: EmployeeLifecycleTask[];
  pending: boolean;
  onComplete: (taskId: string) => void;
}) {
  const visibleTasks = tasks.filter((task) => task.ownerType === "EMPLOYEE" || task.assignedEmployeeId);
  const openTasks = visibleTasks.filter((task) => !["COMPLETED", "WAIVED", "CANCELLED"].includes(task.status));

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase text-[#68748c]">My tasks</p>
          <h3 className="mt-1 text-xl font-black text-[#10143f]">Employment readiness actions</h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#68748c]">
            Complete the items assigned to you for onboarding, payout readiness, references, documents, and employment compliance.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <SelfTaskStat label="Open" value={String(openTasks.length)} />
          <SelfTaskStat label="All" value={String(visibleTasks.length)} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleTasks.length ? (
          visibleTasks.slice(0, 6).map((task) => {
            const completed = ["COMPLETED", "WAIVED", "CANCELLED"].includes(task.status);

            return (
              <div key={task.id} className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#3820d7]">
                    <ClipboardCheck size={18} aria-hidden="true" />
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${taskStatusClass(task.status)}`}>
                    {humanize(task.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-black text-[#10143f]">{task.title}</p>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-[#68748c]">
                  {task.category || humanize(task.ownerType)} · due {formatDate(task.dueAt)}
                </p>
                {task.instructions ? (
                  <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-5 text-[#68748c]">{task.instructions}</p>
                ) : null}
                {!completed ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onComplete(task.id)}
                    className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#3820d7] px-3 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(56,32,215,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <BadgeCheck size={14} aria-hidden="true" />}
                    Mark complete
                  </button>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="md:col-span-2 xl:col-span-3 rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-4 text-sm font-semibold leading-6 text-[#68748c]">
            No employment readiness tasks are assigned to you right now.
          </p>
        )}
      </div>
    </section>
  );
}

function SelfServiceDocumentsPanel({
  documents,
  pending,
  onSubmit,
}: {
  documents: EmployeeSelfServiceDocument[];
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  return (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase text-[#68748c]">Documents</p>
            <h3 className="mt-1 text-xl font-black text-[#10143f]">Files visible to you</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#68748c]">
              Review employee-visible documents, verification status, and expiration dates.
            </p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f0fbf6] text-[#19a974]">
            <FileText size={20} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {documents.length > 0 ? (
            documents.map((document) => <DocumentRow key={document.id} document={document} />)
          ) : (
            <p className="rounded-lg border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-4 text-sm font-semibold leading-6 text-[#68748c]">
              No employee-visible documents are available yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase text-[#68748c]">Submit a document</p>
            <h3 className="mt-1 text-xl font-black text-[#10143f]">Send a file for HR review</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#68748c]">
              Add signed forms, certifications, eligibility records, or policy acknowledgements.
            </p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
            <FileCheck2 size={20} aria-hidden="true" />
          </span>
        </div>

        <form onSubmit={onSubmit} className="mt-5 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SelfInput name="documentTitle" label="Document title" />
            <SelfInput name="documentExpiresAt" label="Expires" type="date" />
            <label className="md:col-span-2 grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">File upload</span>
              <input
                name="documentFile"
                type="file"
                onChange={(event) => setSelectedFile(event.currentTarget.files?.[0] ?? null)}
                className="block h-11 rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] file:mr-3 file:rounded-md file:border-0 file:bg-[#ece9ff] file:px-3 file:py-1.5 file:text-[12px] file:font-black file:text-[#3820d7]"
              />
            </label>
            <label className="md:col-span-2 grid gap-1.5">
              <span className="text-[10px] font-black uppercase text-[#69738c]">Description</span>
              <textarea
                name="documentDescription"
                rows={3}
                className="rounded-lg border border-[#d3d9e8] bg-white px-3 py-2 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
                placeholder="What this document supports"
              />
            </label>
          </div>
          <div className="mt-4 rounded-xl border border-dashed border-[#b9c7e5] bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-[#10143f]">
                  {selectedFile ? selectedFile.name : "No file selected"}
                </p>
                <p className="mt-1 text-[12px] font-semibold leading-5 text-[#68748c]">
                  {selectedFile
                    ? `${selectedFile.type || "Unknown type"} · ${formatSize(selectedFile.size)}`
                    : "TimeSync will upload to the configured document store and attach the stored file automatically."}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#eef5ff] px-3 py-1 text-[11px] font-black text-[#3820d7]">
                <UploadCloud size={14} aria-hidden="true" />
                S3/R2 or local storage
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-[12px] font-black text-white shadow-[0_12px_24px_rgba(56,32,215,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <UploadCloud size={14} aria-hidden="true" />}
            Upload and submit
          </button>
        </form>
      </div>
    </section>
  );
}

function SelfServiceAccessPanel({ session }: { session: AuthSession }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase text-[#68748c]">Access and security</p>
            <h3 className="mt-1 text-xl font-black text-[#10143f]">{displayUserName(session.user)}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#68748c]">
              Your access is scoped to your assigned role and employment relationship.
            </p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5ff] text-[#3820d7]">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <InfoTile label="Account" value={session.user.email} />
          <InfoTile label="User type" value={humanize(session.user.type)} />
          <InfoTile label="Roles" value={session.user.roles.join(", ") || "Not set"} />
          <InfoTile label="Tenant" value={session.tenant?.name ?? "Not set"} />
        </div>
      </div>

      <div className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
        <p className="text-[11px] font-black uppercase text-[#68748c]">Account notices</p>
        <h3 className="mt-1 text-xl font-black text-[#10143f]">Notifications and messages</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#68748c]">
          Security notices, workflow messages, and HR updates remain available from your notification center.
        </p>
        <Link
          href="/notifications"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg border border-[#dfe8f6] bg-white px-4 text-sm font-black text-[#3820d7] transition hover:bg-[#f6f8fd]"
        >
          Review account notices
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function SelfTaskStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-xl border border-[#e4ebf6] bg-[#fbfcff] px-4 py-3">
      <p className="text-lg font-black text-[#10143f]">{value}</p>
      <p className="text-[9px] font-black uppercase text-[#7b849b]">{label}</p>
    </div>
  );
}

function SelfRecordMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e4ebf6] bg-[#fbfcff] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef5ff] text-[#3820d7]">
        <Icon size={18} aria-hidden="true" />
      </span>
      <p className="mt-3 text-[10px] font-black uppercase text-[#7b849b]">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#10143f]">{value}</p>
    </div>
  );
}

function SelfRecordList({
  title,
  items,
  empty = "No supporting records have been submitted yet.",
}: {
  title: string;
  items: Array<{ id: string; title: string; detail: string; status?: string }>;
  empty?: string;
}) {
  return (
    <div className="rounded-xl border border-[#e4ebf6] bg-white p-4">
      <h4 className="text-sm font-black text-[#10143f]">{title}</h4>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-black text-[#10143f]">{item.title}</p>
              {item.status ? (
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase text-[#68748c] shadow-[inset_0_0_0_1px_#dfe8f6]">
                  {item.status}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#68748c]">{item.detail}</p>
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

function SelfInput({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-black uppercase text-[#69738c]">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        className="h-10 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none placeholder:text-[#9ba2b5]"
      />
    </label>
  );
}

function SelfSelect({
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
    <label className="grid gap-1.5">
      <span className="text-[10px] font-black uppercase text-[#69738c]">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 rounded-lg border border-[#d3d9e8] bg-white px-3 text-sm font-bold text-[#151936] outline-none"
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

function AssignmentLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 last:border-0 last:pb-0">
      <span className="text-white/48">{label}</span>
      <span className="max-w-[180px] truncate text-right font-black text-white">{value || "Not assigned"}</span>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f8fbff] p-4">
      <p className="text-[10px] font-black uppercase text-[#7b849b]">{label}</p>
      <p className="mt-2 text-sm font-black text-[#10143f]">{value}</p>
    </div>
  );
}

function DocumentRow({ document }: { document: EmployeeSelfServiceDocument }) {
  return (
    <div className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#10143f]">{document.title}</p>
          <p className="mt-1 text-[12px] font-semibold text-[#68748c]">
            {document.documentType?.name ?? "Employee document"} · {humanize(document.verificationStatus)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#eef5ff] px-2.5 py-1 text-[10px] font-black text-[#3820d7]">
          v{document.currentVersion?.versionNo ?? document.versions?.[0]?.versionNo ?? 1}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold text-[#7d879b]">
        <span>{document.currentVersion?.fileName ?? "File pending"}</span>
        <span>Expires {formatDate(document.expiresAt)}</span>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-4 transition hover:border-[#cbd8f0] hover:bg-white">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eef5ff] text-[#3820d7]">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-[#10143f]">{title}</span>
        <span className="mt-1 block text-[12px] font-semibold leading-5 text-[#68748c]">{description}</span>
      </span>
      <ArrowRight size={16} className="text-[#8a92a6] transition group-hover:translate-x-1 group-hover:text-[#3820d7]" aria-hidden="true" />
    </Link>
  );
}

function currentAssignment(assignments?: WorkforceAssignment[]) {
  return assignments?.find((assignment) => assignment.isPrimary && !assignment.effectiveTo) ?? assignments?.find((assignment) => !assignment.effectiveTo) ?? assignments?.[0] ?? null;
}

function assignmentTitle(assignment: WorkforceAssignment | null) {
  return assignment?.position?.title ?? assignment?.organizationNode?.name ?? "Assignment pending";
}

function managerName(assignment: WorkforceAssignment | null) {
  const manager = assignment?.managerEmployee?.person;
  return manager ? personName(manager) : "Not assigned";
}

function personName(person: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  preferredName?: string | null;
}) {
  return person.preferredName || [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ") || "Employee";
}

function primaryContact(person?: ProfilePerson) {
  const contact = person?.contacts?.find((item) => item.isPrimary) ?? person?.contacts?.[0];
  return contact ? `${contact.label || humanize(contact.type)}: ${contact.value}` : "Not set";
}

function contactByType(person: ProfilePerson | undefined, type: string) {
  return (
    person?.contacts?.find((item) => item.type.toUpperCase() === type && item.isPrimary) ??
    person?.contacts?.find((item) => item.type.toUpperCase() === type)
  );
}

function primaryAddress(person?: ProfilePerson) {
  const address = person?.addresses?.find((item) => item.isPrimary) ?? person?.addresses?.[0];
  if (!address) return "Not set";
  return [address.line1, address.city, address.state, address.postalCode].filter(Boolean).join(", ") || "Not set";
}

function readinessScore(
  employee: EmployeeSelfServiceProfile | null,
  assignment: WorkforceAssignment | null,
  documents: EmployeeSelfServiceDocument[],
) {
  if (!employee) return 0;
  const checks = [
    Boolean(employee.employeeNumber),
    Boolean(employee.hireDate),
    Boolean(assignment),
    documents.length > 0,
    employee.status === "ACTIVE" || employee.status === "PROBATION",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function statusClass(status: string) {
  if (status === "ACTIVE" || status === "PROBATION") return "bg-[#eaf9f2] text-[#108861]";
  if (status === "PREBOARDING") return "bg-[#eef5ff] text-[#3867e8]";
  if (status === "SUSPENDED") return "bg-[#fff8e5] text-[#a66300]";
  return "bg-[#f3f4f7] text-[#68748c]";
}

function taskStatusClass(status: string) {
  if (status === "COMPLETED") return "bg-[#eaf9f2] text-[#108861]";
  if (status === "OPEN" || status === "IN_PROGRESS") return "bg-[#eef5ff] text-[#3867e8]";
  if (status === "BLOCKED") return "bg-[#fff8e5] text-[#a66300]";
  return "bg-[#f3f4f7] text-[#68748c]";
}

function humanize(value?: string | null) {
  return value ? value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not set";
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not set";
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not set";
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

function selectedFileFromForm(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

async function sha256Checksum(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const bytes = Array.from(new Uint8Array(digest));
  return `sha256:${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function uploadFileWithIntent(intent: SelfServiceDocumentUploadIntent, file: File) {
  const headers = new Headers(intent.headers);

  if (!headers.has("content-type")) {
    headers.set("content-type", file.type || "application/octet-stream");
  }

  const response = await fetch(uploadIntentUrl(intent.uploadUrl), {
    method: intent.method,
    headers,
    body: file,
    credentials: intent.provider === "local" ? "include" : "omit",
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}.`);
  }
}

function uploadIntentUrl(value: string) {
  if (value.startsWith("/api/v1/")) {
    return `/api/backend/${value.slice("/api/v1/".length)}`;
  }

  return value;
}

function formatSize(value?: number | null) {
  if (!value) return "Size unknown";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function payoutMask(account: { accountNumberLast4?: string | null; ibanLast4?: string | null; routingNumberLast4?: string | null; currencyCode?: string | null }) {
  const tail = account.accountNumberLast4 || account.ibanLast4;
  return `${account.currencyCode ?? "Currency"} · ${tail ? `ending ${tail}` : "masked account"}${account.routingNumberLast4 ? ` · routing ${account.routingNumberLast4}` : ""}`;
}

function hasUserEnteredRecord(value: Record<string, unknown>, ignoredKeys: string[] = []) {
  return Object.entries(value).some(([key, item]) => {
    if (ignoredKeys.includes(key)) return false;
    if (item === undefined || item === "" || item === false) return false;
    return true;
  });
}

function selfServiceLockedRecordCount(employee: EmployeeSelfServiceProfile) {
  const lockedStatuses = new Set(["PENDING", "CONTACTED", "VERIFIED", "PENDING_VERIFICATION", "AUTHORIZED", "EXPIRING_SOON"]);
  const references = (employee.references ?? []).filter((record) => lockedStatuses.has(record.status)).length;
  const payout = (employee.payoutAccounts ?? []).filter((record) => lockedStatuses.has(record.status)).length;
  const statutory = (employee.statutoryIdentifiers ?? []).filter((record) => lockedStatuses.has(record.status)).length;
  const eligibility = employee.workEligibility && lockedStatuses.has(employee.workEligibility.status) ? 1 : 0;

  return references + payout + statutory + eligibility;
}

function sensitiveRecordStatusLabel(status: string) {
  if (["REJECTED", "DRAFT", "NOT_REVIEWED"].includes(status)) return "Reopen";
  if (["VERIFIED", "AUTHORIZED", "EXPIRING_SOON"].includes(status)) return "Locked";
  if (["PENDING", "CONTACTED", "PENDING_VERIFICATION", "PENDING_REVIEW"].includes(status)) return "In review";
  return humanize(status);
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Your profile could not be updated.";
}
