"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { parseApiError } from "@/lib/api/error";

const companySizes = ["1-50", "51-200", "201-500", "501-1,000", "1,001-5,000", "5,000+"];

type DemoFormState = {
  fullName: string;
  workEmail: string;
  companyName: string;
  jobTitle: string;
  companySize: string;
  message: string;
};

const initialState: DemoFormState = {
  fullName: "",
  workEmail: "",
  companyName: "",
  jobTitle: "",
  companySize: "",
  message: "",
};

export function DemoRequestForm() {
  const [form, setForm] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submitDemoRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/backend/demo-requests", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          source: "landing-page",
          metadata: {
            landingVersion: "enterprise-home",
          },
        }),
      });

      if (!response.ok) {
        throw await parseApiError(response);
      }

      setSubmitted(true);
      setForm(initialState);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Demo request could not be sent.");
    } finally {
      setPending(false);
    }
  }

  function updateField<K extends keyof DemoFormState>(key: K, value: DemoFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-white/14 bg-white p-6 shadow-[0_26px_70px_rgba(0,0,0,0.22)]">
        <div className="grid h-12 w-12 place-items-center rounded-md bg-[#eaf9f2] text-[#12b886]">
          <CheckCircle2 size={24} aria-hidden="true" />
        </div>
        <h3 className="mt-5 text-2xl font-black text-[#11143a]">Demo request received.</h3>
        <p className="mt-3 text-sm leading-7 text-[#596579]">
          Thanks. A TimeSync platform specialist can review your organization needs,
          then help provision the right tenant setup when you are ready.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="landing-button-secondary mt-6"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submitDemoRequest}
      className="rounded-lg border border-white/14 bg-white p-5 shadow-[0_26px_70px_rgba(0,0,0,0.22)] sm:p-6"
    >
      <div>
        <p className="text-xs font-black uppercase text-[#3820d7]">Request a guided demo</p>
        <h3 className="mt-2 text-2xl font-black text-[#11143a]">Tell us about your workforce.</h3>
        <p className="mt-2 text-sm leading-6 text-[#596579]">
          Share a few details and our enterprise team will follow up with a tailored walkthrough.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Full name" required>
          <input
            required
            value={form.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            className="landing-input"
            placeholder="Jordan Ellis"
          />
        </Field>
        <Field label="Work email" required>
          <input
            required
            type="email"
            value={form.workEmail}
            onChange={(event) => updateField("workEmail", event.target.value)}
            className="landing-input"
            placeholder="jordan@company.com"
          />
        </Field>
        <Field label="Company" required>
          <input
            required
            value={form.companyName}
            onChange={(event) => updateField("companyName", event.target.value)}
            className="landing-input"
            placeholder="Acme Health Group"
          />
        </Field>
        <Field label="Role">
          <input
            value={form.jobTitle}
            onChange={(event) => updateField("jobTitle", event.target.value)}
            className="landing-input"
            placeholder="People operations lead"
          />
        </Field>
        <Field label="Company size">
          <select
            value={form.companySize}
            onChange={(event) => updateField("companySize", event.target.value)}
            className="landing-input"
          >
            <option value="">Select size</option>
            {companySizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Main need">
          <input
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            className="landing-input"
            placeholder="Time, HR, approvals..."
          />
        </Field>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-[#fecaca] bg-[#fff5f5] px-3 py-2 text-sm font-bold text-[#b42318]">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="landing-button-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-70">
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Sending request..." : "Request demo"}
      </button>
    </form>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black text-[#263258]">
        {label}
        {required ? <span className="text-[#3820d7]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
