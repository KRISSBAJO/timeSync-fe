"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, FileText, Loader2, SendHorizonal } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api/client";
import type { PublicApplicationResponse, PublicJobDetail, PublicQuestion } from "@/lib/recruitment/types";

type PublicJobApplicationFormProps = {
  tenantSlug: string;
  job: PublicJobDetail;
};

export function PublicJobApplicationForm({ tenantSlug, job }: PublicJobApplicationFormProps) {
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<PublicApplicationResponse | null>(null);
  const questions = useMemo(() => job.questionSet?.questions ?? [], [job.questionSet]);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const answers = collectAnswers(form, questions);
    setPending(true);

    try {
      const response = await apiFetch<PublicApplicationResponse>(`/careers/${tenantSlug}/jobs/${job.slug}/apply`, {
        method: "POST",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          phone: form.get("phone"),
          currentEmployer: form.get("currentEmployer"),
          currentTitle: form.get("currentTitle"),
          locationName: form.get("locationName"),
          resumeUrl: form.get("resumeUrl"),
          source: form.get("source"),
          availabilityNote: form.get("availabilityNote"),
          consentAccepted: form.get("consentAccepted") === "on",
          answers,
          metadata: {
            source: "public_careers_form",
          },
        }),
        retryOnUnauthorized: false,
      });
      setReceipt(response);
      toast.success(response.alreadyApplied ? "We already have your application." : "Application received.");
      event.currentTarget.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Application could not be submitted.");
    } finally {
      setPending(false);
    }
  }

  if (receipt) {
    return (
      <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-emerald-700">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">Application received</p>
            <h2 className="mt-1 text-xl font-black">{receipt.alreadyApplied ? "Your application is already in review." : "Thanks for applying."}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900/75">
              Your application for {receipt.job.title} is now in the recruitment pipeline at {receipt.application.currentStage?.name ?? receipt.application.status}.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submitApplication} className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef6ff] text-[#2563eb]">
          <FileText size={18} />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Candidate application</p>
          <h2 className="text-xl font-black text-[#11143a]">Apply for this role</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <FormField label="First name"><input name="firstName" required className="form-field" /></FormField>
        <FormField label="Last name"><input name="lastName" required className="form-field" /></FormField>
        <FormField label="Email"><input name="email" required type="email" className="form-field" /></FormField>
        <FormField label="Phone"><input name="phone" className="form-field" /></FormField>
        <FormField label="Current employer"><input name="currentEmployer" className="form-field" /></FormField>
        <FormField label="Current title"><input name="currentTitle" className="form-field" /></FormField>
        <FormField label="Location"><input name="locationName" className="form-field" placeholder="City, state, country" /></FormField>
        <FormField label="Resume link"><input name="resumeUrl" type="url" className="form-field" placeholder="https://..." /></FormField>
        <FormField label="Source"><input name="source" className="form-field" placeholder="LinkedIn, referral, job board" /></FormField>
        <FormField label="Availability"><input name="availabilityNote" className="form-field" placeholder="Earliest start date or scheduling note" /></FormField>
      </div>

      {questions.length ? (
        <div className="mt-5 space-y-3 rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-4">
          {questions.map((question) => (
            <QuestionField key={question.id} question={question} />
          ))}
        </div>
      ) : null}

      <label className="mt-5 flex items-start gap-3 rounded-lg border border-[#dfe8f6] bg-[#fbfcff] p-4 text-sm font-semibold leading-6 text-[#4c5872]">
        <input name="consentAccepted" required type="checkbox" className="mt-1 h-4 w-4 rounded border-[#cfd8e6] text-[#3820d7]" />
        <span>{job.consentText}</span>
      </label>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2b1ab8] px-5 text-sm font-black text-white transition hover:bg-[#1f128a] disabled:opacity-60"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
          Submit application
        </button>
      </div>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{label}</span>
      {children}
    </label>
  );
}

function QuestionField({ question }: { question: PublicQuestion }) {
  const name = `question:${question.id}`;
  const required = question.required ?? false;

  if (question.type === "long_text") {
    return (
      <FormField label={question.label}>
        <textarea name={name} required={required} className="form-field min-h-28 resize-y" />
      </FormField>
    );
  }

  if (question.type === "yes_no") {
    return (
      <FormField label={question.label}>
        <select name={name} required={required} className="form-field" defaultValue="">
          <option value="">Select</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </FormField>
    );
  }

  if (question.options?.length) {
    return (
      <FormField label={question.label}>
        <select name={name} required={required} className="form-field" defaultValue="">
          <option value="">Select</option>
          {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </FormField>
    );
  }

  return (
    <FormField label={question.label}>
      <input name={name} required={required} className="form-field" />
    </FormField>
  );
}

function collectAnswers(form: FormData, questions: PublicQuestion[]) {
  return questions.reduce<Record<string, string>>((answers, question) => {
    const value = String(form.get(`question:${question.id}`) ?? "").trim();
    if (value) answers[question.id] = value;
    return answers;
  }, {});
}
