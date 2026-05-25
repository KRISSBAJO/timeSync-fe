"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { AuthShieldIcon } from "./auth-card-shell";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSentTo(String(formData.get("email") ?? "").trim());
  }

  if (sentTo) {
    return (
      <div className="mx-auto max-w-[350px] text-center">
        <AuthShieldIcon success />
        <h1 className="mt-8 text-xl font-black text-[#25175c]">Reset password link Sent</h1>
        <p className="mt-3 text-[13px] font-medium leading-6 text-[#25175c]">
          We have sent a password reset link to <span className="font-black">{sentTo}</span>.
        </p>
        <a
          href="https://mail.google.com"
          className="mt-12 inline-flex h-12 w-full items-center justify-center rounded-md bg-[#3820d7] text-[13px] font-bold text-white transition hover:bg-[#2d18bf]"
        >
          Open Gmail
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[410px] text-center">
      <AuthShieldIcon />
      <h1 className="mt-8 text-3xl font-black tracking-[-0.02em] text-[#25175c]">Forgot password</h1>
      <p className="mt-3 text-[13px] font-medium text-[#25175c]">
        Enter your email address below to reset your password.
      </p>

      <input
        required
        name="email"
        type="email"
        placeholder="Enter your email"
        className="mt-7 h-12 w-full rounded-md border border-transparent bg-[#f0f0f0] px-4 text-[13px] font-semibold text-[#19162f] outline-none transition placeholder:text-[#b9bed0] focus:border-[#3820d7] focus:bg-white focus:ring-4 focus:ring-[#3820d7]/10"
      />

      <button
        type="submit"
        className="mt-14 inline-flex h-12 w-[280px] max-w-full items-center justify-center rounded-md bg-[#3820d7] text-[13px] font-bold text-white transition hover:bg-[#2d18bf]"
      >
        Reset password
      </button>

      <p className="mt-5 text-[12px] font-medium text-[#8b8c9a]">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-[#3820d7]">
          Login
        </Link>
      </p>
    </form>
  );
}
