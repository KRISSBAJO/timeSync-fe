"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Loader2,
  SendHorizonal,
  Sparkles,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api/client";
import { readResumeUpload, resumeFileFromForm } from "@/lib/recruitment/resume-upload";
import type {
  PublicTalentProfileResponse,
  RecruitmentEmploymentType,
  RecruitmentWorkMode,
} from "@/lib/recruitment/types";

const workModes: Array<{ value: RecruitmentWorkMode; label: string }> = [
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "ONSITE", label: "Onsite" },
];

const employmentTypes: Array<{ value: RecruitmentEmploymentType; label: string }> = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "INTERN", label: "Intern" },
  { value: "PER_DIEM", label: "Per diem" },
];

export function CandidateSignupBuilder() {
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<PublicTalentProfileResponse | null>(null);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);

    try {
      const resumeFile = await readResumeUpload(resumeFileFromForm(form));
      const response = await apiFetch<PublicTalentProfileResponse>("/hiring/talent-profiles", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          phone: form.get("phone"),
          desiredTitle: form.get("desiredTitle"),
          currentTitle: form.get("currentTitle"),
          currentEmployer: form.get("currentEmployer"),
          locationName: form.get("locationName"),
          resumeFile,
          portfolioUrl: form.get("portfolioUrl"),
          availabilityNote: form.get("availabilityNote"),
          preferredTenantSlug: form.get("preferredTenantSlug"),
          workModes: form.getAll("workModes"),
          employmentTypes: form.getAll("employmentTypes"),
          skills: splitList(String(form.get("skills") ?? "")),
          source: "Candidate signup",
          consentAccepted: form.get("consentAccepted") === "on",
          metadata: {
            source: "candidate_signup_builder",
            candidateSignup: {
              channel: "public_hire_signup",
              accountType: "public_candidate",
            },
            profileBuilder: {
              headline: form.get("headline"),
              professionalSummary: form.get("professionalSummary"),
              targetIndustries: splitList(String(form.get("targetIndustries") ?? "")),
              linkedInUrl: form.get("linkedInUrl"),
              portfolioUrl: form.get("portfolioUrl"),
            },
            resumeBuilder: {
              summary: form.get("resumeSummary"),
              experience: form.get("experience"),
              education: form.get("education"),
              certifications: form.get("certifications"),
              languages: form.get("languages"),
            },
          },
        }),
        retryOnUnauthorized: false,
      });

      setReceipt(response);
      toast.success("Candidate profile created.");
      event.currentTarget.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create candidate profile.");
    } finally {
      setPending(false);
    }
  }

  if (receipt) {
    return (
      <section className="mx-auto max-w-5xl rounded-lg border border-emerald-100 bg-emerald-50 p-6 text-emerald-950 shadow-[0_22px_55px_rgba(16,185,129,0.12)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white text-emerald-700">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">Candidate profile live</p>
              <h1 className="mt-1 text-2xl font-black">{receipt.profile.displayName} is ready for hiring teams.</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900/75">
                Profile status: {receipt.profile.status}. Target role: {receipt.profile.desiredTitle ?? "Open to opportunities"}.
              </p>
            </div>
          </div>
          <Link href="/hire" className="inline-flex h-10 items-center rounded-md border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-800">
            Back to Hire
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submitProfile} className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/hire" className="inline-flex h-10 items-center gap-2 rounded-md border border-[#dfe8f6] bg-white px-4 text-sm font-black text-[#3820d7]">
            <ArrowLeft size={16} />
            Hire
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe8f6] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-[#63708a]">
            <UserRoundPlus size={14} />
            Candidate signup
          </span>
        </div>

        <section className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <BuilderHeader icon={UserRoundPlus} eyebrow="Account" title="Candidate identity" />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="First name"><input name="firstName" required className="form-field" /></Field>
            <Field label="Last name"><input name="lastName" required className="form-field" /></Field>
            <Field label="Email"><input name="email" required type="email" className="form-field" /></Field>
            <Field label="Phone"><input name="phone" className="form-field" /></Field>
            <Field label="Location"><input name="locationName" className="form-field" placeholder="Chicago, IL" /></Field>
            <Field label="Preferred company slug"><input name="preferredTenantSlug" className="form-field" placeholder="acme-health" /></Field>
          </div>
        </section>

        <section className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <BuilderHeader icon={Sparkles} eyebrow="Profile builder" title="Public talent profile" />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="Headline"><input name="headline" className="form-field" placeholder="Care operations specialist focused on patient support" /></Field>
            <Field label="Desired title"><input name="desiredTitle" className="form-field" placeholder="Care Coordinator" /></Field>
            <Field label="Current title"><input name="currentTitle" className="form-field" /></Field>
            <Field label="Current employer"><input name="currentEmployer" className="form-field" /></Field>
            <Field label="Portfolio"><input name="portfolioUrl" type="url" className="form-field" placeholder="https://..." /></Field>
            <Field label="Availability"><input name="availabilityNote" className="form-field" placeholder="Two weeks notice" /></Field>
          </div>
          <Field label="Professional summary">
            <textarea name="professionalSummary" className="form-field min-h-28 resize-y" placeholder="A concise hiring profile summary" />
          </Field>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Skills"><input name="skills" className="form-field" placeholder="Scheduling, EHR, payroll, care coordination" /></Field>
            <Field label="Target industries"><input name="targetIndustries" className="form-field" placeholder="Healthcare, home care, operations" /></Field>
            <Field label="LinkedIn"><input name="linkedInUrl" type="url" className="form-field" placeholder="https://linkedin.com/in/..." /></Field>
          </div>
        </section>

        <section className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <BuilderHeader icon={FileUp} eyebrow="Resume builder" title="Resume upload and structured resume" />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="Resume upload">
              <input name="resumeFile" type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" required className="form-field file:mr-3 file:rounded-md file:border-0 file:bg-[#eef2ff] file:px-3 file:py-2 file:text-xs file:font-black file:text-[#3820d7]" />
            </Field>
            <Field label="Languages"><input name="languages" className="form-field" placeholder="English, Spanish" /></Field>
          </div>
          <Field label="Resume summary">
            <textarea name="resumeSummary" className="form-field min-h-24 resize-y" placeholder="Career summary for the resume" />
          </Field>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field label="Experience"><textarea name="experience" className="form-field min-h-32 resize-y" placeholder="Role, company, results" /></Field>
            <Field label="Education"><textarea name="education" className="form-field min-h-32 resize-y" placeholder="School, program, dates" /></Field>
            <Field label="Certifications"><textarea name="certifications" className="form-field min-h-32 resize-y" placeholder="CNA, CPR, SHRM, etc." /></Field>
          </div>
        </section>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <section className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-[#63708a]">Preferences</p>
          <div className="mt-4 grid gap-3">
            <ChoiceGroup label="Work style" name="workModes" options={workModes} />
            <ChoiceGroup label="Employment type" name="employmentTypes" options={employmentTypes} />
          </div>
        </section>

        <section className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.08em] text-[#63708a]">Publish</p>
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-[#dfe8f6] bg-[#fbfcff] p-4 text-sm font-semibold leading-6 text-[#4c5872]">
            <input name="consentAccepted" required type="checkbox" className="mt-1 h-4 w-4 rounded border-[#cfd8e6] text-[#3820d7]" />
            <span>I consent to TimeSync storing my candidate profile and making it discoverable to participating employers for recruitment purposes.</span>
          </label>
          <button type="submit" disabled={pending} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2b1ab8] px-5 text-sm font-black text-white disabled:opacity-60">
            {pending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
            Create candidate profile
          </button>
        </section>
      </aside>
    </form>
  );
}

function BuilderHeader({ icon: Icon, eyebrow, title }: { icon: LucideIcon; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef2ff] text-[#3820d7]">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{eyebrow}</p>
        <h2 className="text-xl font-black text-[#11143a]">{title}</h2>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{label}</span>
      {children}
    </label>
  );
}

function ChoiceGroup({ label, name, options }: { label: string; name: string; options: Array<{ value: string; label: string }> }) {
  return (
    <fieldset className="rounded-lg border border-[#edf1f7] bg-[#fbfcff] p-3">
      <legend className="px-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="inline-flex items-center gap-2 rounded-md border border-[#dfe8f6] bg-white px-3 py-2 text-xs font-black text-[#4c5872]">
            <input name={name} value={option.value} type="checkbox" className="h-3.5 w-3.5 rounded border-[#cfd8e6] text-[#3820d7]" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function splitList(value: string) {
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}
