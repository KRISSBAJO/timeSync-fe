"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { login } from "@/lib/api/client";

type LoginMode = "tenant" | "platform";

export function LoginForm({
  nextPath = "/dashboard",
  defaultTenantSlug = "",
  defaultMode = "tenant",
}: {
  nextPath?: string;
  defaultTenantSlug?: string;
  defaultMode?: LoginMode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>(defaultMode);
  const [error, setError] = useState<string | null>(null);
  const safeNextPath = useMemo(
    () => (nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard"),
    [nextPath],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const tenantSlug = String(formData.get("tenantSlug") ?? "").trim();

    try {
      await login({
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
        tenantSlug: loginMode === "tenant" && tenantSlug ? tenantSlug : undefined,
        rememberDevice: formData.get("rememberDevice") === "on",
      });

      startTransition(() => {
        router.replace(safeNextPath);
        router.refresh();
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-[430px]">
      <div>
        <h1 className="text-[34px] font-black tracking-[-0.02em] text-[#25175c]">
          {loginMode === "tenant" ? "Workspace access" : "Platform access"}
        </h1>
        <p className="mt-1 text-[12px] font-medium text-[#25175c]">
          {loginMode === "tenant"
            ? "Sign in once, then switch between assigned workspaces."
            : "For TimeSync platform operators only."}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 rounded-xl border border-[#e0e4f2] bg-[#f7f8fc] p-1">
        {(["tenant", "platform"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setLoginMode(mode);
              setError(null);
            }}
            className={`h-11 rounded-lg text-[12px] font-black transition ${
              loginMode === mode
                ? "bg-white text-[#3820d7] shadow-[0_10px_22px_rgba(37,23,92,0.10)]"
                : "text-[#717993] hover:text-[#25175c]"
            }`}
          >
            {mode === "tenant" ? "Workspace user" : "Platform admin"}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-5">
        <label className="block">
          <span className="text-[12px] font-bold text-[#19162f]">Email address</span>
          <input
            required
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Login with your email or employee id"
            className="mt-2 h-14 w-full rounded-md border border-transparent bg-[#f0f0f0] px-4 text-[13px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#b9bed0] focus:border-[#3820d7] focus:bg-white focus:ring-4 focus:ring-[#3820d7]/10"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-bold text-[#19162f]">Password</span>
          <div className="relative mt-2">
            <input
              required
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="ChangeMe123!"
              minLength={8}
              className="h-14 w-full rounded-md border border-transparent bg-[#f0f0f0] px-4 pr-12 text-[13px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#b9bed0] focus:border-[#3820d7] focus:bg-white focus:ring-4 focus:ring-[#3820d7]/10"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[#9aa2b7] transition hover:bg-white hover:text-[#3820d7]"
            >
              {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>
        </label>

        {loginMode === "tenant" ? (
          <label className="block">
            <span className="text-[12px] font-bold text-[#19162f]">Workspace slug</span>
            <input
              name="tenantSlug"
              autoComplete="organization"
              placeholder="Optional, for example acme-health"
              defaultValue={defaultTenantSlug}
              className="mt-2 h-14 w-full rounded-md border border-transparent bg-[#f0f0f0] px-4 text-[13px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#b9bed0] focus:border-[#3820d7] focus:bg-white focus:ring-4 focus:ring-[#3820d7]/10"
            />
            <span className="mt-2 block text-[11px] font-semibold leading-4 text-[#81889d]">
              Leave this blank to enter your default workspace. Add it when you want to enter a specific tenant directly.
            </span>
          </label>
        ) : (
          <div className="rounded-lg border border-[#dedfea] bg-[#fbfcff] px-4 py-3 text-[12px] font-semibold leading-5 text-[#667089]">
            Platform operators sign in without a workspace slug. Assigned tenant workspaces can be opened from the account menu.
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-[12px] font-bold text-[#7a8297]">
            <input
              name="rememberDevice"
              type="checkbox"
              className="h-4 w-4 rounded border-[#b9c7dd] accent-[#3820d7]"
            />
            Remember this device
          </label>

          <Link href="/forgot-password" className="text-[12px] font-bold text-[#3820d7] transition hover:text-[#25175c]">
            Forgot password
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-md border border-[#ffd0d0] bg-[#fff5f5] px-4 py-3 text-sm font-bold text-[#b42318]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || isSubmitting}
        className="mt-10 inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-[#3820d7] px-5 text-[13px] font-bold text-white shadow-[0_14px_30px_rgba(56,32,215,0.22)] transition hover:-translate-y-0.5 hover:bg-[#2d18bf] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending || isSubmitting ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : null}
        {loginMode === "tenant" ? "Enter workspace" : "Enter platform"}
      </button>

      <p className="mt-4 text-center text-[12px] font-medium text-[#8b8c9a]">
        {loginMode === "tenant" ? "Platform operator?" : "Signing in to a workspace?"}{" "}
        <Link
          href={loginMode === "tenant" ? "/login?mode=platform" : "/login"}
          className="font-black text-[#3820d7] underline"
        >
          {loginMode === "tenant" ? "Use platform access" : "Use tenant workspace"}
        </Link>
      </p>
    </form>
  );
}
