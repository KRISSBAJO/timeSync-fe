"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  Loader2,
  LockKeyhole,
  Plus,
  Radio,
  Send,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";
import type {
  FormAssignment,
  FormQuestion,
  FormQuestionType,
  FormResponseSummary,
  PaginatedForms,
  WorkforceForm,
} from "@/lib/forms/types";

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

type FormsCommandCenterProps = {
  user: AuthUser;
  forms: PaginatedForms | null;
  assignments: FormAssignment[];
  canReadForms: boolean;
  canWriteForms: boolean;
};

type StudioTab = "assigned" | "studio" | "analysis";

type QuestionDraft = {
  clientId: string;
  type: FormQuestionType;
  title: string;
  required: boolean;
  optionsText: string;
};

const questionTypes: Array<{ value: FormQuestionType; label: string; needsOptions?: boolean }> = [
  { value: "SHORT_TEXT", label: "Short answer" },
  { value: "LONG_TEXT", label: "Paragraph" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "YES_NO", label: "Yes or no" },
  { value: "SINGLE_CHOICE", label: "Multiple choice", needsOptions: true },
  { value: "MULTI_CHOICE", label: "Checkboxes", needsOptions: true },
  { value: "DROPDOWN", label: "Dropdown", needsOptions: true },
  { value: "RATING", label: "Rating" },
];

export function FormsCommandCenter({
  user,
  forms,
  assignments,
  canReadForms,
  canWriteForms,
}: FormsCommandCenterProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StudioTab>(canReadForms ? "studio" : "assigned");
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestionDraft()]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignments[0]?.id ?? "");
  const [assignmentFormId, setAssignmentFormId] = useState(forms?.data[0]?.id ?? "");
  const [summaryFormId, setSummaryFormId] = useState(forms?.data[0]?.id ?? "");
  const [summary, setSummary] = useState<FormResponseSummary | null>(null);
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? assignments[0];
  const formRows = forms?.data ?? [];
  const openAssignments = assignments.filter((assignment) => assignment.status !== "SUBMITTED");
  const submittedAssignments = assignments.filter((assignment) => assignment.status === "SUBMITTED");

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setNotice(null);

    try {
      await action();
      setNotice({ type: "success", message: successMessage });
      startTransition(() => router.refresh());
    } catch (caught) {
      setNotice({ type: "error", message: caught instanceof Error ? caught.message : "Action failed." });
    }
  }

  async function createForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payloadQuestions = buildQuestionPayload(questions);

    await runAction(
      () =>
        apiFetch("/forms", {
          method: "POST",
          body: JSON.stringify({
            title: stringValue(formData, "title"),
            code: stringValue(formData, "code") || undefined,
            description: stringValue(formData, "description") || undefined,
            status: stringValue(formData, "publishNow") === "on" ? "PUBLISHED" : "DRAFT",
            anonymous: stringValue(formData, "anonymous") === "on",
            allowMultipleResponses: stringValue(formData, "allowMultipleResponses") === "on",
            closesAt: stringValue(formData, "closesAt") || undefined,
            questions: payloadQuestions,
          }),
        }),
      "Form created.",
    );
  }

  async function publishForm(form: WorkforceForm) {
    await runAction(
      () => apiFetch(`/forms/${form.id}/publish`, { method: "POST" }),
      `${form.title} is published.`,
    );
  }

  async function archiveForm(form: WorkforceForm) {
    await runAction(
      () => apiFetch(`/forms/${form.id}/archive`, { method: "POST" }),
      `${form.title} is archived.`,
    );
  }

  async function assignForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const targetForm = formRows.find((form) => form.id === assignmentFormId);

    await runAction(
      () =>
        apiFetch(`/forms/${assignmentFormId}/assign`, {
          method: "POST",
          body: JSON.stringify({
            allActiveEmployees: stringValue(formData, "allActiveEmployees") === "on",
            employeeIds: splitIds(stringValue(formData, "employeeIds")),
            userIds: splitIds(stringValue(formData, "userIds")),
            dueAt: stringValue(formData, "dueAt") || undefined,
            message: stringValue(formData, "message") || undefined,
            notifyRecipients: true,
          }),
        }),
      `${targetForm?.title ?? "Form"} assigned.`,
    );
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAssignment) return;
    const formData = new FormData(event.currentTarget);
    const answers = selectedAssignment.form.questions.map((question) => ({
      questionId: question.id,
      value: readQuestionAnswer(question, formData),
    }));

    await runAction(
      () =>
        apiFetch(`/forms/my/assignments/${selectedAssignment.id}/responses`, {
          method: "POST",
          body: JSON.stringify({ answers, metadata: { source: "employee_workspace" } }),
        }),
      "Response submitted.",
    );
  }

  async function loadSummary() {
    if (!summaryFormId) return;
    setNotice(null);

    try {
      const response = await apiFetch<FormResponseSummary>(`/forms/${summaryFormId}/summary`);
      setSummary(response);
    } catch (caught) {
      setNotice({ type: "error", message: caught instanceof Error ? caught.message : "Unable to load analysis." });
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_50px_rgba(18,31,67,0.06)]">
        <div className="relative grid gap-5 p-5 xl:grid-cols-[1fr_360px]">
          <div className="pointer-events-none absolute inset-0 bg-purple-50/70" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <Pill icon={ClipboardList} label="Forms and surveys" />
              <Pill icon={LockKeyhole} label="Tenant governed" />
            </div>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.55rem,2.8vw,2.35rem)] font-black leading-tight text-[#11143a]">
              Build and assign workforce forms with confidence.
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-[#63708a]">
              Build custom forms, assign them to employees, capture structured responses,
              and review response intelligence without losing tenant boundaries or auditability.
            </p>
          </div>
          <div className="relative rounded-xl border border-[#dfe8f6] bg-[#11143a] p-5 text-white shadow-[0_18px_45px_rgba(17,20,58,0.18)]">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
              Workspace state
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <DarkMetric label="Forms" value={formRows.length} />
              <DarkMetric label="Open" value={openAssignments.length} />
              <DarkMetric label="Done" value={submittedAssignments.length} />
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-white/68">
              Signed in as {user.username ?? user.email}. Your view is limited by role and permissions.
            </p>
          </div>
        </div>
      </section>

      {notice ? (
        <div
          className={
            notice.type === "success"
              ? "rounded-xl border border-[#c8f3df] bg-[#effcf6] px-4 py-3 text-sm font-bold text-[#087f5b]"
              : "rounded-xl border border-[#ffd4d0] bg-[#fff5f5] px-4 py-3 text-sm font-bold text-[#b42318]"
          }
        >
          {notice.message}
        </div>
      ) : null}

      <section className="rounded-xl border border-[#dfe8f6] bg-white shadow-[0_18px_45px_rgba(18,31,67,0.05)]">
        <div className="grid gap-3 border-b border-[#e8eef7] p-3 lg:grid-cols-3">
          <TabButton
            active={activeTab === "assigned"}
            icon={Radio}
            title="Assigned to me"
            description="Forms waiting for your response"
            onClick={() => setActiveTab("assigned")}
          />
          {canReadForms ? (
            <TabButton
              active={activeTab === "studio"}
              icon={FilePenLine}
              title="Form studio"
              description="Create, publish, and send forms"
              onClick={() => setActiveTab("studio")}
            />
          ) : null}
          {canReadForms ? (
            <TabButton
              active={activeTab === "analysis"}
              icon={BarChart3}
              title="Response analysis"
              description="Completion and answer signals"
              onClick={() => setActiveTab("analysis")}
            />
          ) : null}
        </div>

        <div className="p-5">
          {activeTab === "assigned" ? (
            <AssignedFormsPanel
              assignments={assignments}
              selectedAssignment={selectedAssignment}
              selectedAssignmentId={selectedAssignmentId}
              setSelectedAssignmentId={setSelectedAssignmentId}
              submitAssignment={submitAssignment}
              isPending={isPending}
            />
          ) : null}

          {activeTab === "studio" && canReadForms ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
              <FormLibrary
                forms={formRows}
                canWriteForms={canWriteForms}
                publishForm={publishForm}
                archiveForm={archiveForm}
                isPending={isPending}
              />
              <FormBuilder
                canWriteForms={canWriteForms}
                questions={questions}
                setQuestions={setQuestions}
                createForm={createForm}
                assignmentFormId={assignmentFormId}
                setAssignmentFormId={setAssignmentFormId}
                forms={formRows}
                assignForm={assignForm}
                isPending={isPending}
              />
            </div>
          ) : null}

          {activeTab === "analysis" && canReadForms ? (
            <AnalysisPanel
              forms={formRows}
              summaryFormId={summaryFormId}
              setSummaryFormId={setSummaryFormId}
              summary={summary}
              loadSummary={loadSummary}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function AssignedFormsPanel({
  assignments,
  selectedAssignment,
  selectedAssignmentId,
  setSelectedAssignmentId,
  submitAssignment,
  isPending,
}: {
  assignments: FormAssignment[];
  selectedAssignment?: FormAssignment;
  selectedAssignmentId: string;
  setSelectedAssignmentId: (value: string) => void;
  submitAssignment: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No forms assigned"
        body="Assigned workforce forms, acknowledgements, and surveys will appear here."
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-3">
        {assignments.map((assignment) => (
          <button
            key={assignment.id}
            type="button"
            onClick={() => setSelectedAssignmentId(assignment.id)}
            className={`w-full rounded-xl border p-4 text-left transition ${
              selectedAssignmentId === assignment.id
                ? "border-[#4a22e8] bg-[#f4f1ff] shadow-[0_14px_34px_rgba(74,34,232,0.12)]"
                : "border-[#dfe8f6] bg-[#fbfcff] hover:border-[#b8c6e0]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#11143a]">{assignment.form.title}</p>
                <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-[#68748c]">
                  {assignment.form.description ?? "No description provided."}
                </p>
              </div>
              <StatusPill status={assignment.status} />
            </div>
            <p className="mt-3 text-[11px] font-black uppercase text-[#8a94aa]">
              {assignment.dueAt ? `Due ${formatDate(assignment.dueAt)}` : "No due date"}
            </p>
          </button>
        ))}
      </aside>

      {selectedAssignment ? (
        <form onSubmit={submitAssignment} className="rounded-xl border border-[#dfe8f6] bg-white p-5">
          <div className="flex flex-col gap-4 border-b border-[#edf2f9] pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-[#3820d7]">Employee response</p>
              <h3 className="mt-2 text-2xl font-black text-[#11143a]">{selectedAssignment.form.title}</h3>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#68748c]">
                {selectedAssignment.form.description ?? "Complete the questions below and submit once ready."}
              </p>
            </div>
            <StatusPill status={selectedAssignment.status} />
          </div>

          <div className="mt-5 space-y-4">
            {selectedAssignment.form.questions.map((question) => (
              <QuestionInput key={question.id} question={question} disabled={selectedAssignment.status === "SUBMITTED"} />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold leading-6 text-[#68748c]">
              Submitting sends your response to the assigned HR workflow. You can see completion status here after submission.
            </p>
            <button
              type="submit"
              disabled={isPending || selectedAssignment.status === "SUBMITTED"}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#4a22e8] px-5 text-sm font-black text-white shadow-[0_16px_34px_rgba(74,34,232,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              Submit response
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function FormLibrary({
  forms,
  canWriteForms,
  publishForm,
  archiveForm,
  isPending,
}: {
  forms: WorkforceForm[];
  canWriteForms: boolean;
  publishForm: (form: WorkforceForm) => void;
  archiveForm: (form: WorkforceForm) => void;
  isPending: boolean;
}) {
  if (forms.length === 0) {
    return <EmptyState icon={FilePenLine} title="No forms yet" body="Create your first governed HR form from the builder." />;
  }

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white">
      <div className="border-b border-[#edf2f9] p-4">
        <p className="text-[11px] font-black uppercase text-[#68748c]">Form library</p>
        <h3 className="mt-1 text-xl font-black text-[#11143a]">Reusable workforce forms</h3>
      </div>
      <div className="divide-y divide-[#edf2f9]">
        {forms.map((form) => (
          <div key={form.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-black text-[#11143a]">{form.title}</p>
                <FormStatusPill status={form.status} />
                {form.anonymous ? <span className="rounded-full bg-[#f0fdf4] px-2 py-1 text-[10px] font-black uppercase text-[#099268]">Anonymous</span> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-[#68748c]">
                {form.description ?? "No description provided."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase text-[#71809a]">
                <span>{form._count?.questions ?? form.questions?.length ?? 0} questions</span>
                <span>{form._count?.assignments ?? 0} assigned</span>
                <span>{form._count?.responses ?? 0} responses</span>
              </div>
            </div>
            {canWriteForms ? (
              <div className="flex flex-wrap gap-2">
                {form.status !== "PUBLISHED" ? (
                  <button
                    type="button"
                    onClick={() => publishForm(form)}
                    disabled={isPending}
                    className="rounded-lg bg-[#4a22e8] px-3 py-2 text-[12px] font-black text-white disabled:opacity-60"
                  >
                    Publish
                  </button>
                ) : null}
                {form.status !== "ARCHIVED" ? (
                  <button
                    type="button"
                    onClick={() => archiveForm(form)}
                    disabled={isPending}
                    className="rounded-lg border border-[#dfe8f6] px-3 py-2 text-[12px] font-black text-[#34405f] disabled:opacity-60"
                  >
                    Archive
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function FormBuilder({
  canWriteForms,
  questions,
  setQuestions,
  createForm,
  assignmentFormId,
  setAssignmentFormId,
  forms,
  assignForm,
  isPending,
}: {
  canWriteForms: boolean;
  questions: QuestionDraft[];
  setQuestions: (questions: QuestionDraft[]) => void;
  createForm: (event: FormEvent<HTMLFormElement>) => void;
  assignmentFormId: string;
  setAssignmentFormId: (value: string) => void;
  forms: WorkforceForm[];
  assignForm: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}) {
  if (!canWriteForms) {
    return (
      <EmptyState
        icon={LockKeyhole}
        title="Form authoring is restricted"
        body="You can review forms, but creating and assigning forms requires HR/admin form permissions."
      />
    );
  }

  return (
    <aside className="space-y-5">
      <form onSubmit={createForm} className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
        <p className="text-[11px] font-black uppercase text-[#3820d7]">Create form</p>
        <div className="mt-4 space-y-3">
          <Input name="title" label="Title" placeholder="Quarterly engagement pulse" required />
          <Input name="code" label="Code" placeholder="ENGAGEMENT_Q2" />
          <Textarea name="description" label="Description" placeholder="Explain why this form matters." />
          <Input name="closesAt" label="Close date" type="datetime-local" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox name="anonymous" label="Anonymous responses" />
            <Checkbox name="allowMultipleResponses" label="Allow repeat responses" />
            <Checkbox name="publishNow" label="Publish immediately" />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase text-[#68748c]">Questions</p>
            <button
              type="button"
              onClick={() => setQuestions([...questions, newQuestionDraft()])}
              className="inline-flex items-center gap-1 rounded-lg border border-[#dfe8f6] bg-white px-3 py-2 text-[12px] font-black text-[#34405f]"
            >
              <Plus size={14} aria-hidden="true" />
              Add
            </button>
          </div>
          {questions.map((question, index) => (
            <QuestionDraftEditor
              key={question.clientId}
              question={question}
              index={index}
              onChange={(next) => {
                const copy = [...questions];
                copy[index] = next;
                setQuestions(copy);
              }}
              onRemove={() => setQuestions(questions.length > 1 ? questions.filter((item) => item.clientId !== question.clientId) : questions)}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#4a22e8] px-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(74,34,232,0.2)] disabled:opacity-60"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          Save form
        </button>
      </form>

      <form onSubmit={assignForm} className="rounded-xl border border-[#dfe8f6] bg-white p-4">
        <p className="text-[11px] font-black uppercase text-[#68748c]">Send form</p>
        <div className="mt-4 space-y-3">
          <label className="grid gap-1">
            <span className="text-[11px] font-black uppercase text-[#68748c]">Published form</span>
            <select
              value={assignmentFormId}
              onChange={(event) => setAssignmentFormId(event.target.value)}
              className="h-11 rounded-lg border border-[#d4ddea] bg-white px-3 text-sm font-bold text-[#11143a] outline-none"
            >
              {forms.filter((form) => form.status === "PUBLISHED").map((form) => (
                <option key={form.id} value={form.id}>{form.title}</option>
              ))}
            </select>
          </label>
          <Checkbox name="allActiveEmployees" label="Send to all active employees with login access" />
          <Textarea name="employeeIds" label="Employee IDs" placeholder="Comma-separated employee IDs for targeted assignment" />
          <Textarea name="userIds" label="User IDs" placeholder="Comma-separated user IDs if needed" />
          <Input name="dueAt" label="Due date" type="datetime-local" />
          <Textarea name="message" label="Recipient message" placeholder="Add a short instruction for recipients." />
        </div>
        <button
          type="submit"
          disabled={isPending || !assignmentFormId}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#11143a] px-4 text-sm font-black text-white disabled:opacity-60"
        >
          <Send size={16} aria-hidden="true" />
          Send assignments
        </button>
      </form>
    </aside>
  );
}

function AnalysisPanel({
  forms,
  summaryFormId,
  setSummaryFormId,
  summary,
  loadSummary,
}: {
  forms: WorkforceForm[];
  summaryFormId: string;
  setSummaryFormId: (value: string) => void;
  summary: FormResponseSummary | null;
  loadSummary: () => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
        <p className="text-[11px] font-black uppercase text-[#68748c]">Analysis source</p>
        <select
          value={summaryFormId}
          onChange={(event) => setSummaryFormId(event.target.value)}
          className="mt-3 h-11 w-full rounded-lg border border-[#d4ddea] bg-white px-3 text-sm font-bold text-[#11143a] outline-none"
        >
          {forms.map((form) => (
            <option key={form.id} value={form.id}>{form.title}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={loadSummary}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#4a22e8] text-sm font-black text-white"
        >
          <BarChart3 size={16} aria-hidden="true" />
          Load analysis
        </button>
      </aside>

      {summary ? (
        <section className="rounded-xl border border-[#dfe8f6] bg-white p-5">
          <div className="flex flex-col gap-4 border-b border-[#edf2f9] pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase text-[#3820d7]">Response intelligence</p>
              <h3 className="mt-2 text-2xl font-black text-[#11143a]">{summary.form.title}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniMetric label="Assigned" value={summary.totals.assignments} />
              <MiniMetric label="Responses" value={summary.totals.responses} />
              <MiniMetric label="Submitted" value={summary.totals.submittedAssignments} />
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            {summary.questions.map((question) => (
              <div key={question.questionId} className="rounded-xl border border-[#edf2f9] bg-[#fbfcff] p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-[#11143a]">{question.title}</p>
                    <p className="mt-1 text-[12px] font-bold uppercase text-[#7a8599]">
                      {humanize(question.type)} · {question.responseCount} responses
                    </p>
                  </div>
                  {question.average !== null ? (
                    <span className="rounded-lg bg-[#eef5ff] px-3 py-2 text-sm font-black text-[#2f6eea]">
                      Avg {question.average.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                {Object.keys(question.optionCounts).length > 0 ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(question.optionCounts).map(([label, count]) => (
                      <div key={label} className="rounded-lg bg-white px-3 py-2">
                        <p className="text-[12px] font-black text-[#11143a]">{humanize(label)}</p>
                        <p className="mt-1 text-lg font-black text-[#4a22e8]">{count}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState icon={BarChart3} title="Load a form summary" body="Choose a form to view completion counts, option totals, and rating averages." />
      )}
    </div>
  );
}

function QuestionDraftEditor({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: QuestionDraft;
  index: number;
  onChange: (question: QuestionDraft) => void;
  onRemove: () => void;
}) {
  const selectedType = questionTypes.find((type) => type.value === question.type);

  return (
    <div className="rounded-xl border border-[#dfe8f6] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase text-[#68748c]">Question {index + 1}</p>
        <button type="button" onClick={onRemove} className="text-[11px] font-black text-[#b42318]">
          Remove
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <input
          value={question.title}
          onChange={(event) => onChange({ ...question, title: event.target.value })}
          placeholder="Question title"
          className="h-10 rounded-lg border border-[#d4ddea] px-3 text-sm font-bold text-[#11143a] outline-none"
        />
        <select
          value={question.type}
          onChange={(event) => onChange({ ...question, type: event.target.value as FormQuestionType })}
          className="h-10 rounded-lg border border-[#d4ddea] bg-white px-3 text-sm font-bold text-[#11143a] outline-none"
        >
          {questionTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        {selectedType?.needsOptions ? (
          <textarea
            value={question.optionsText}
            onChange={(event) => onChange({ ...question, optionsText: event.target.value })}
            placeholder="One option per line. Example: A | Strongly agree"
            className="min-h-20 rounded-lg border border-[#d4ddea] px-3 py-2 text-sm font-bold text-[#11143a] outline-none"
          />
        ) : null}
        <label className="inline-flex items-center gap-2 text-[12px] font-black text-[#34405f]">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(event) => onChange({ ...question, required: event.target.checked })}
          />
          Required
        </label>
      </div>
    </div>
  );
}

function QuestionInput({ question, disabled }: { question: FormQuestion; disabled: boolean }) {
  const commonClass = "mt-2 w-full rounded-lg border border-[#d4ddea] bg-white px-3 text-sm font-bold text-[#11143a] outline-none focus:border-[#4a22e8]";

  return (
    <fieldset className="rounded-xl border border-[#dfe8f6] bg-[#fbfcff] p-4">
      <legend className="text-sm font-black text-[#11143a]">
        {question.title}
        {question.required ? <span className="text-[#e03131]"> *</span> : null}
      </legend>
      {question.description ? (
        <p className="mt-1 text-[12px] font-semibold leading-5 text-[#68748c]">{question.description}</p>
      ) : null}
      {question.type === "SHORT_TEXT" ? <input name={question.id} disabled={disabled} className={`${commonClass} h-11`} /> : null}
      {question.type === "LONG_TEXT" ? <textarea name={question.id} disabled={disabled} className={`${commonClass} min-h-28 py-3`} /> : null}
      {question.type === "NUMBER" || question.type === "RATING" ? (
        <input name={question.id} type="number" min={question.type === "RATING" ? 1 : undefined} max={question.type === "RATING" ? 10 : undefined} disabled={disabled} className={`${commonClass} h-11`} />
      ) : null}
      {question.type === "DATE" ? <input name={question.id} type="date" disabled={disabled} className={`${commonClass} h-11`} /> : null}
      {question.type === "YES_NO" ? (
        <select name={question.id} disabled={disabled} className={`${commonClass} h-11`}>
          <option value="">Choose</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : null}
      {question.type === "SINGLE_CHOICE" ? (
        <div className="mt-3 grid gap-2">
          {safeOptions(question).map((option) => (
            <label key={option.value} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#34405f]">
              <input type="radio" name={question.id} value={option.value} disabled={disabled} />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
      {question.type === "MULTI_CHOICE" ? (
        <div className="mt-3 grid gap-2">
          {safeOptions(question).map((option) => (
            <label key={option.value} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#34405f]">
              <input type="checkbox" name={question.id} value={option.value} disabled={disabled} />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
      {question.type === "DROPDOWN" ? (
        <select name={question.id} disabled={disabled} className={`${commonClass} h-11`}>
          <option value="">Choose</option>
          {safeOptions(question).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : null}
    </fieldset>
  );
}

function TabButton({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
        active
          ? "border-[#4a22e8] bg-[#f4f1ff] shadow-[0_12px_30px_rgba(74,34,232,0.12)]"
          : "border-transparent bg-white hover:border-[#dfe8f6] hover:bg-[#fbfcff]"
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${active ? "bg-[#4a22e8] text-white" : "bg-[#eef3fb] text-[#647088]"}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-black text-[#11143a]">{title}</span>
        <span className="mt-0.5 line-clamp-1 block text-[12px] font-semibold text-[#758099]">{description}</span>
      </span>
    </button>
  );
}

function Input({ label, name, type = "text", placeholder, required }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black uppercase text-[#68748c]">{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} className="h-11 rounded-lg border border-[#d4ddea] bg-white px-3 text-sm font-bold text-[#11143a] outline-none focus:border-[#4a22e8]" />
    </label>
  );
}

function Textarea({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black uppercase text-[#68748c]">{label}</span>
      <textarea name={name} placeholder={placeholder} className="min-h-24 rounded-lg border border-[#d4ddea] bg-white px-3 py-2 text-sm font-bold text-[#11143a] outline-none focus:border-[#4a22e8]" />
    </label>
  );
}

function Checkbox({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-[#dfe8f6] bg-white px-3 py-2 text-[12px] font-black text-[#34405f]">
      <input type="checkbox" name={name} />
      {label}
    </label>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-xl border border-dashed border-[#d6e0ef] bg-[#fbfcff] p-8 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#eef3ff] text-[#4a22e8]">
          <Icon size={26} aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-xl font-black text-[#11143a]">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[#68748c]">{body}</p>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe8f6] bg-white/80 px-3 py-1 text-[10px] font-black uppercase text-[#4a22e8]">
      <Icon size={13} aria-hidden="true" />
      {label}
    </span>
  );
}

function DarkMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.08] p-3">
      <p className="text-[10px] font-black uppercase text-white/48">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#dfe8f6] bg-[#fbfcff] px-4 py-3 text-center">
      <p className="text-lg font-black text-[#11143a]">{value}</p>
      <p className="text-[10px] font-black uppercase text-[#71809a]">{label}</p>
    </div>
  );
}

function FormStatusPill({ status }: { status: string }) {
  const tone = status === "PUBLISHED" ? "bg-[#e7f8ef] text-[#087f5b]" : status === "ARCHIVED" ? "bg-[#f1f3f5] text-[#667085]" : "bg-[#fff5d6] text-[#b7791f]";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${tone}`}>{humanize(status)}</span>;
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "SUBMITTED" ? "bg-[#e7f8ef] text-[#087f5b]" : status === "EXPIRED" ? "bg-[#fff5f5] text-[#b42318]" : "bg-[#eef5ff] text-[#2f6eea]";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${tone}`}>{humanize(status)}</span>;
}

function newQuestionDraft(): QuestionDraft {
  return {
    clientId: crypto.randomUUID(),
    type: "SHORT_TEXT",
    title: "",
    required: false,
    optionsText: "",
  };
}

function buildQuestionPayload(questions: QuestionDraft[]) {
  return questions.map((question, index) => ({
    order: index + 1,
    type: question.type,
    title: question.title.trim(),
    required: question.required,
    options: needsOptions(question.type) ? parseOptions(question.optionsText) : undefined,
  }));
}

function parseOptions(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawValue, ...labelParts] = line.split("|").map((part) => part.trim());
      const label = labelParts.join(" | ") || rawValue;
      return {
        value: labelParts.length > 0 ? rawValue : `OPTION_${index + 1}`,
        label,
      };
    });
}

function needsOptions(type: FormQuestionType) {
  return type === "SINGLE_CHOICE" || type === "MULTI_CHOICE" || type === "DROPDOWN";
}

function readQuestionAnswer(question: FormQuestion, formData: FormData) {
  if (question.type === "MULTI_CHOICE") {
    return formData.getAll(question.id).map(String).filter(Boolean);
  }

  const value = formData.get(question.id);
  if (value === null || value === "") return null;
  if (question.type === "YES_NO") return value === "true";
  if (question.type === "NUMBER" || question.type === "RATING") return Number(value);
  return String(value);
}

function safeOptions(question: FormQuestion) {
  return Array.isArray(question.options) ? question.options : [];
}

function splitIds(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function humanize(value: string) {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
