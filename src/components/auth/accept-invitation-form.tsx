"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { parseApiError } from "@/lib/api/error";

type AcceptInvitationResult = {
  accepted: boolean;
  email: string;
  tenantSlug: string;
};

export function AcceptInvitationForm({ token }: { token: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AcceptInvitationResult | null>(null);
  const loginHref = useMemo(() => {
    if (!result) return "/login";
    const params = new URLSearchParams({
      tenantSlug: result.tenantSlug,
      next: "/profile",
    });
    return `/login?${params.toString()}`;
  }, [result]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/backend/auth/invitations/accept", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        throw await parseApiError(response);
      }

      const payload = (await response.json()) as { data?: AcceptInvitationResult } & AcceptInvitationResult;
      setResult(payload.data ?? payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to activate this account.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-[390px] text-center">
        <h1 className="text-2xl font-black tracking-[-0.02em] text-[#25175c]">Invitation link missing</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-[#625f79]">
          Ask HR to resend your TimeSync account invitation.
        </p>
        <Link
          href="/login"
          className="mt-10 inline-flex h-12 w-full items-center justify-center rounded-md bg-[#3820d7] text-sm font-bold text-white transition hover:bg-[#2d18bf]"
        >
          Back to login
        </Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-[390px] text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e9fbf4] text-3xl font-black text-[#18a875]">
          ✓
        </div>
        <h1 className="mt-7 text-2xl font-black tracking-[-0.02em] text-[#25175c]">Your account is ready</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-[#625f79]">
          Sign in with <span className="font-black text-[#25175c]">{result.email}</span> and tenant slug{" "}
          <span className="font-black text-[#25175c]">{result.tenantSlug}</span>.
        </p>
        <Link
          href={loginHref}
          className="mt-10 inline-flex h-12 w-full items-center justify-center rounded-md bg-[#3820d7] text-sm font-bold text-white transition hover:bg-[#2d18bf]"
        >
          Continue to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[430px]">
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#ece9ff] text-xl font-black text-[#3820d7]">
          TS
        </div>
        <h1 className="mt-7 text-3xl font-black tracking-[-0.02em] text-[#25175c]">Set up your account</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-[#625f79]">
          Create your password to activate your TimeSync employee workspace.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <PasswordInput
          label="Password"
          name="password"
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />
        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          show={showConfirm}
          onToggle={() => setShowConfirm((value) => !value)}
        />
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-[#ffd0d0] bg-[#fff5f5] px-4 py-3 text-sm font-bold text-[#b42318]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-9 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#3820d7] text-sm font-bold text-white shadow-[0_14px_30px_rgba(56,32,215,0.22)] transition hover:-translate-y-0.5 hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
        Activate account
      </button>
    </form>
  );
}

function PasswordInput({
  label,
  name,
  show,
  onToggle,
}: {
  label: string;
  name: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-[#19162f]">{label}</span>
      <div className="relative mt-2">
        <input
          required
          name={name}
          type={show ? "text" : "password"}
          minLength={8}
          autoComplete="new-password"
          placeholder="********"
          className="h-12 w-full rounded-md border border-transparent bg-[#f0f0f0] px-4 pr-12 text-sm font-semibold text-[#19162f] outline-none transition placeholder:text-[#b9bed0] focus:border-[#3820d7] focus:bg-white focus:ring-4 focus:ring-[#3820d7]/10"
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={onToggle}
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[#9aa2b7] transition hover:bg-white hover:text-[#3820d7]"
        >
          {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
    </label>
  );
}
