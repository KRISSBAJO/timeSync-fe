"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";

import { logout } from "@/lib/api/client";
import type { AuthSession } from "@/lib/api/types";
import { displayUserName } from "@/lib/auth/user";

const navigation = [
  { label: "Platform", href: "#product" },
  { label: "Solutions", href: "#solutions" },
  { label: "Time & Ops", href: "#features" },
  { label: "HR Guides", href: "/hr-guides" },
];

export function HeaderClient({ session }: { session: AuthSession | null }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const userName = session ? displayUserName(session.user) : "";
  const role = session?.user.roles[0] ?? session?.user.type;

  async function signOut() {
    await logout();
    setAccountOpen(false);
    setMobileOpen(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#e8edf7] bg-white/94 backdrop-blur-xl">
      <div className="section-inner flex min-h-[76px] items-center justify-between gap-4 py-3">
        <Logo />

        <nav className="hidden items-center gap-1 text-sm font-extrabold text-[#4f5a75] lg:flex">
          {navigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-lg px-3 py-2 transition hover:bg-[#f2f6fd] hover:text-[#3820d7]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <div className="relative">
              <button
                type="button"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
                className="flex h-11 items-center gap-3 rounded-lg border border-[#dfe7f4] bg-white px-2.5 shadow-[0_12px_30px_rgba(23,34,66,0.07)] transition hover:border-[#cbd5e8] hover:bg-[#fbfcff]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-[#3820d7] text-xs font-black text-white">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-[160px] text-left">
                  <span className="block truncate text-[12px] font-black text-[#151936]">{userName}</span>
                  <span className="block truncate text-[10px] font-black uppercase text-[#8a92a6]">
                    {role}
                  </span>
                </span>
                <ChevronDown
                  size={15}
                  className={accountOpen ? "rotate-180 text-[#667085]" : "text-[#667085]"}
                  aria-hidden="true"
                />
              </button>

              {accountOpen ? (
                <AccountMenu
                  userName={userName}
                  role={role ?? "USER"}
                  onClose={() => setAccountOpen(false)}
                  onLogout={signOut}
                />
              ) : null}
            </div>
          ) : (
            <Link href="/login" className="landing-button-secondary">
              Sign in
            </Link>
          )}
          <a href="#demo" className="landing-button-primary">
            Request demo
          </a>
        </div>

        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className="grid h-11 w-11 place-items-center rounded-lg border border-[#dfe7f4] bg-white text-[#172042] shadow-sm md:hidden"
        >
          <Menu size={19} aria-hidden="true" />
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[#101735]/35 p-3 backdrop-blur-sm md:hidden">
          <div className="ml-auto flex h-full w-[min(90vw,360px)] flex-col overflow-hidden rounded-lg border border-[#dfe7f4] bg-white shadow-[0_28px_80px_rgba(16,23,53,0.25)]">
            <div className="flex items-center justify-between border-b border-[#edf1f7] px-4 py-3">
              <Logo compact />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-lg text-[#667085] transition hover:bg-[#f6f8fd] hover:text-[#10143f]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav className="grid gap-1 p-4">
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-black text-[#172042] transition hover:bg-[#f6f8fd]"
                >
                  {item.label}
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
              ))}
            </nav>

            <div className="mt-auto border-t border-[#edf1f7] p-4">
              {session ? (
                <div className="rounded-lg border border-[#dfe7f4] bg-[#fbfcff] p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-md bg-[#3820d7] text-sm font-black text-white">
                      {userName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[#10143f]">{userName}</span>
                      <span className="block truncate text-[11px] font-black uppercase text-[#7a8297]">{role}</span>
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <MobileMenuLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} onClick={() => setMobileOpen(false)} />
                    <MobileMenuLink href="/settings" label="Profile and settings" icon={Settings} onClick={() => setMobileOpen(false)} />
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex h-10 items-center gap-2 rounded-lg px-3 text-left text-[12px] font-black text-[#b42318] transition hover:bg-[#fff5f5]"
                    >
                      <LogOut size={15} aria-hidden="true" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="landing-button-secondary w-full"
                  >
                    Sign in
                  </Link>
                  <a
                    href="#demo"
                    onClick={() => setMobileOpen(false)}
                    className="landing-button-primary w-full"
                  >
                    Request demo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="TimeSync home">
      <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-[0_8px_24px_rgba(17,20,58,0.08)] ring-1 ring-[#e0e7f4]">
        <Image
          src="/images/logo.png"
          alt="TimeSync logo"
          fill
          sizes="48px"
          priority
          className="object-cover"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[18px] font-black leading-none text-[#11143a]">TimeSync</span>
        {!compact ? (
          <span className="mt-1 block text-[10px] font-black uppercase text-[#7a8297]">WorkforceOS</span>
        ) : null}
      </span>
    </Link>
  );
}

function AccountMenu({
  userName,
  role,
  onClose,
  onLogout,
}: {
  userName: string;
  role: string;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[300px] overflow-hidden rounded-lg border border-[#dde4ef] bg-white p-3 shadow-[0_26px_70px_rgba(23,34,66,0.18)]">
      <div className="rounded-lg bg-[#f6f8fd] p-3">
        <div className="flex items-center justify-between gap-3">
          <Logo compact />
          <p className="text-[10px] font-black uppercase text-[#8a92a6]">Signed in</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#3820d7] text-sm font-black text-white">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-[#151936]">{userName}</span>
            <span className="block truncate text-[11px] font-black uppercase text-[#7a8297]">{role}</span>
          </span>
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <MenuLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} onClick={onClose} />
        <MenuLink href="/notifications" label="Notifications" icon={Bell} onClick={onClose} />
        <MenuLink href="/settings" label="Profile and settings" icon={Settings} onClick={onClose} />
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-black text-[#b42318] transition hover:bg-[#fff5f5]"
        >
          <LogOut size={16} aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );
}

function MenuLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-black text-[#4d566d] transition hover:bg-[#f6f8fd] hover:text-[#171a4a]"
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </Link>
  );
}

function MobileMenuLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex h-10 items-center gap-2 rounded-lg px-3 text-[12px] font-black text-[#4d566d] transition hover:bg-white"
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </Link>
  );
}
