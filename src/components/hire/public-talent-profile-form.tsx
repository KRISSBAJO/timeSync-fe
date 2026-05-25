"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api/client";
import type { PublicTalentProfileResponse, RecruitmentEmploymentType, RecruitmentWorkMode } from "@/lib/recruitment/types";

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

export function PublicTalentProfileForm() {
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<PublicTalentProfileResponse | null>(null);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);

    try {
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
          resumeUrl: form.get("resumeUrl"),
          portfolioUrl: form.get("portfolioUrl"),
          availabilityNote: form.get("availabilityNote"),
          preferredTenantSlug: form.get("preferredTenantSlug"),
          workModes: form.getAll("workModes"),
          employmentTypes: form.getAll("employmentTypes"),
          skills: String(form.get("skills") ?? "")
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
          source: "Public hiring marketplace",
          consentAccepted: form.get("consentAccepted") === "on",
          metadata: { source: "hire_page" },
        }),
        retryOnUnauthorized: false,
      });

      setReceipt(response);
      toast.success("Talent profile received.");
      event.currentTarget.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your talent profile.");
    } finally {
      setPending(false);
    }
  }

  if (receipt) {
    return (
      <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-emerald-700">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.08em] text-emerald-700">Profile live</p>
            <h2 className="mt-1 text-xl font-black">{receipt.profile.displayName} is in the marketplace.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900/75">
              Recruiters can now discover this profile for {receipt.profile.desiredTitle ?? "future roles"}.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submitProfile} className="rounded-lg border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_50px_rgba(18,31,67,0.08)]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-[#f1edff] text-[#3820d7]">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#63708a]">Talent profile</p>
          <h2 className="text-xl font-black text-[#11143a]">Be discoverable</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Field label="First name"><input name="firstName" required className="form-field" /></Field>
        <Field label="Last name"><input name="lastName" required className="form-field" /></Field>
        <Field label="Email"><input name="email" required type="email" className="form-field" /></Field>
        <Field label="Phone"><input name="phone" className="form-field" /></Field>
        <Field label="Desired title"><input name="desiredTitle" className="form-field" placeholder="Care Coordinator" /></Field>
        <Field label="Current title"><input name="currentTitle" className="form-field" /></Field>
        <Field label="Current employer"><input name="currentEmployer" className="form-field" /></Field>
        <Field label="Location"><input name="locationName" className="form-field" placeholder="Chicago, IL" /></Field>
        <Field label="Resume link"><input name="resumeUrl" type="url" className="form-field" placeholder="https://..." /></Field>
        <Field label="Portfolio link"><input name="portfolioUrl" type="url" className="form-field" placeholder="https://..." /></Field>
        <Field label="Preferred company slug"><input name="preferredTenantSlug" className="form-field" placeholder="acme-health" /></Field>
        <Field label="Availability"><input name="availabilityNote" className="form-field" placeholder="Two weeks notice" /></Field>
      </div>

      <Field label="Skills">
        <input name="skills" className="form-field" placeholder="Scheduling, payroll, EHR, care coordination" />
      </Field>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ChoiceGroup label="Work style" name="workModes" options={workModes} />
        <ChoiceGroup label="Employment type" name="employmentTypes" options={employmentTypes} />
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-lg border border-[#dfe8f6] bg-[#fbfcff] p-4 text-sm font-semibold leading-6 text-[#4c5872]">
        <input name="consentAccepted" required type="checkbox" className="mt-1 h-4 w-4 rounded border-[#cfd8e6] text-[#3820d7]" />
        <span>I consent to TimeSync storing my public talent profile and making it discoverable to participating employers for recruitment purposes.</span>
      </label>

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2b1ab8] px-5 text-sm font-black text-white disabled:opacity-60">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Publish profile
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-3 block">
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
