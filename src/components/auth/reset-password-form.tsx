"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { AuthShieldIcon } from "./auth-card-shell";

export function ResetPasswordForm() {
  const [complete, setComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComplete(true);
  }

  if (complete) {
    return (
      <div className="mx-auto max-w-[350px] text-center">
        <AuthShieldIcon success />
        <h1 className="mt-8 text-xl font-black text-[#25175c]">Password reset successful!</h1>
        <p className="mt-3 text-[13px] font-medium text-[#25175c]">
          You have successfully reset your password.
        </p>
        <Link
          href="/login"
          className="mt-12 inline-flex h-12 w-full items-center justify-center rounded-md bg-[#3820d7] text-[13px] font-bold text-white transition hover:bg-[#2d18bf]"
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[410px] text-center">
      <AuthShieldIcon />
      <h1 className="mt-8 text-3xl font-black tracking-[-0.02em] text-[#25175c]">Password reset</h1>
      <p className="mt-3 text-[13px] font-medium text-[#25175c]">
        Enter a new password for your account.
      </p>

      <div className="mt-8 space-y-5 text-left">
        <PasswordInput
          label="New Password"
          name="password"
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
        />
        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          show={showConfirm}
          onToggle={() => setShowConfirm((value) => !value)}
        />
      </div>

      <button
        type="submit"
        className="mt-10 inline-flex h-12 w-[280px] max-w-full items-center justify-center rounded-md bg-[#3820d7] text-[13px] font-bold text-white transition hover:bg-[#2d18bf]"
      >
        Reset password
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
          placeholder="********"
          className="h-12 w-full rounded-md border border-transparent bg-[#f0f0f0] px-4 pr-12 text-[13px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#19162f] focus:border-[#3820d7] focus:bg-white focus:ring-4 focus:ring-[#3820d7]/10"
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={onToggle}
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-[#19162f] transition hover:bg-white hover:text-[#3820d7]"
        >
          {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
    </label>
  );
}
