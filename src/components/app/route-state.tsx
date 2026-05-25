"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  LayoutDashboard,
  Loader2,
  RefreshCcw,
  SearchX,
  ShieldAlert,
} from "lucide-react";

type RouteStateProps = {
  title: string;
  description: string;
  kicker?: string;
  tone?: "loading" | "error" | "empty" | "permission";
  action?: ReactNode;
};

export function RouteState({
  title,
  description,
  kicker = "Workspace state",
  tone = "empty",
  action,
}: RouteStateProps) {
  const Icon = {
    loading: Loader2,
    error: AlertTriangle,
    empty: SearchX,
    permission: ShieldAlert,
  }[tone];

  return (
    <div className="grid min-h-[calc(100vh-140px)] place-items-center">
      <section className="w-full max-w-2xl rounded-2xl border border-[#dfe8f6] bg-white p-6 text-center shadow-[0_22px_70px_rgba(18,31,67,0.08)]">
        <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${toneClass(tone)}`}>
          <Icon size={24} className={tone === "loading" ? "animate-spin" : ""} aria-hidden="true" />
        </span>
        <p className="mt-5 text-[11px] font-extrabold uppercase text-[#68748c]">{kicker}</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[#10143f]">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#5d6782]">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </section>
    </div>
  );
}

export function AppRouteLoading() {
  return (
    <RouteState
      tone="loading"
      kicker="Loading workspace"
      title="Preparing the command center"
      description="Preparing tenant-scoped data, permissions, and operational state."
    />
  );
}

export function AppRouteError({
  message,
  onReset,
}: {
  message?: string;
  onReset?: () => void;
}) {
  return (
    <RouteState
      tone="error"
      kicker="Route failed"
      title="This workspace could not load"
      description={message ?? "This workspace returned an error. Try again, or return to the dashboard."}
      action={
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-extrabold text-white transition hover:bg-[#2d18bf]"
            >
              <RefreshCcw size={16} aria-hidden="true" />
              Try again
            </button>
          ) : null}
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#dfe8f6] bg-white px-4 text-sm font-extrabold text-[#4d566d] transition hover:bg-[#f6f8fd]"
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      }
    />
  );
}

export function AppRouteNotFound() {
  return (
    <RouteState
      tone="empty"
      kicker="Route not found"
      title="This workspace does not exist"
      description="The route may have moved, or the current tenant does not have that module enabled."
      action={
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#3820d7] px-4 text-sm font-extrabold text-white transition hover:bg-[#2d18bf]"
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            Dashboard
          </Link>
          <Link
            href="/create"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#dfe8f6] bg-white px-4 text-sm font-extrabold text-[#4d566d] transition hover:bg-[#f6f8fd]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Create center
          </Link>
        </div>
      }
    />
  );
}

function toneClass(tone: RouteStateProps["tone"]) {
  switch (tone) {
    case "loading":
      return "bg-[#eef5ff] text-[#2f6eea]";
    case "error":
      return "bg-[#fff5f5] text-[#b42318]";
    case "permission":
      return "bg-[#fff8ed] text-[#c76a00]";
    default:
      return "bg-[#ece9ff] text-[#3820d7]";
  }
}
