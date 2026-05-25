"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  ArrowRight,
  Bell,
  Building2,
  ChevronDown,
  CheckCircle2,
  CirclePlus,
  Command,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  MonitorCog,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { apiFetch, logout, switchWorkspace } from "@/lib/api/client";
import type { AuthSession, AuthWorkspace } from "@/lib/api/types";
import { accessProfileForUser, profileAllows } from "@/lib/auth/access-profile";
import { hasAnyPermission, routeRequirementFor } from "@/lib/auth/permissions";
import { displayUserName } from "@/lib/auth/user";
import {
  appNavigation,
  navigationForUser,
  navigationGroupsForUser,
  routeFeatureRequirementFor,
  tenantAllowsFeatures,
} from "@/config/navigation";
import { RealtimePulse } from "@/components/app/realtime-pulse";

const CREATE_PERMISSIONS = [
  "persons.write",
  "employees.write",
  "organization.write",
  "positions.write",
  "workflows.write",
  "documents.write",
  "notifications.write",
  "iam.roles.write",
  "platform.tenants.manage",
] as const;

export function AppShell({
  session,
  children,
}: {
  session: AuthSession;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationSummary, setNotificationSummary] = useState<NotificationSummary | null>(null);
  const [notificationItems, setNotificationItems] = useState<NotificationRecipientItem[]>([]);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);
  const navigation = useMemo(() => navigationForUser(session.user, session.tenant), [session.user, session.tenant]);
  const navigationGroups = useMemo(
    () => navigationGroupsForUser(session.user, session.tenant),
    [session.user, session.tenant],
  );
  const accessProfile = useMemo(() => accessProfileForUser(session.user), [session.user]);
  const commandItems = useMemo(() => buildCommandItems(session, navigation), [navigation, session]);
  const activeNavigationItem = navigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const routeNavigationItem = appNavigation.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const activeItem =
    pathname === "/create"
      ? {
          title: "Create",
          description: "Governed action center for workforce operations",
        }
      :
    activeNavigationItem ??
    routeNavigationItem ??
    appNavigation[0];
  const requiredPermissions = routeRequirementFor(pathname);
  const requiredFeatures = routeFeatureRequirementFor(pathname);
  const currentRouteFeatureEnabled = tenantAllowsFeatures(session.tenant, requiredFeatures);
  const canUseCreate = accessProfile.canUseAdminCreate && hasAnyPermission(session.user, CREATE_PERMISSIONS);
  const canAccessCurrentRoute =
    (pathname === "/create" ? canUseCreate : hasAnyPermission(session.user, requiredPermissions)) &&
    currentRouteFeatureEnabled &&
    (pathname === "/profile" || profileAllows(accessProfile, (activeNavigationItem ?? routeNavigationItem)?.audiences));
  const canReadNotifications = hasAnyPermission(session.user, ["notifications.read"]);
  const canReadRealtime = hasAnyPermission(session.user, ["dashboard.read"]) && accessProfile.canUseRealtimePulse;
  const canUseGlobalSearch = accessProfile.canUseTenantCommandCenter || accessProfile.isManager || accessProfile.isPlatform;
  const userName = displayUserName(session.user);
  const primaryRole = session.user.roles[0] ?? session.user.type;
  const accountProfileHref = accessProfile.isTenantAdmin || accessProfile.isPlatform ? "/settings" : "/profile";
  const accountSecurityHref = accessProfile.isTenantAdmin || accessProfile.isPlatform ? "/settings#sessions" : "/profile#security";
  const workspaces = session.workspaces ?? [];
  const currentWorkspace = workspaces.find((workspace) => workspace.isCurrent);
  const canSwitchWorkspaces = workspaces.length > 1;
  const unreadCount =
    notificationSummary?.unreadInbox ??
    notificationItems.filter((item) => !item.readAt).length;

  async function onLogout(allSessions = false) {
    await logout(allSessions);
    router.replace("/login");
    router.refresh();
  }

  async function onSwitchWorkspace(workspace: AuthWorkspace) {
    if (workspace.isCurrent || switchingWorkspaceId) {
      return;
    }

    setSwitchingWorkspaceId(workspace.membershipId);

    try {
      await switchWorkspace(workspace.membershipId);
      setAccountOpen(false);
      setMobileOpen(false);
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setSwitchingWorkspaceId(null);
    }
  }

  async function loadNotifications() {
    if (!canReadNotifications) {
      return;
    }

    setNotificationLoading(true);
    setNotificationError(null);

    try {
      const [summary, inbox] = await Promise.all([
        apiFetch<NotificationSummary>("/notifications/summary"),
        apiFetch<PaginatedNotificationInbox>("/notifications?limit=6"),
      ]);

      setNotificationSummary(summary);
      setNotificationItems(inbox.data ?? []);
    } catch (caught) {
      setNotificationError(caught instanceof Error ? caught.message : "Could not load notifications.");
    } finally {
      setNotificationLoading(false);
    }
  }

  async function toggleNotifications() {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);
    setAccountOpen(false);

    if (nextOpen && canReadNotifications) {
      await loadNotifications();
    }
  }

  async function markNotificationRead(notificationId: string) {
    await apiFetch(`/notifications/${notificationId}/read`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await loadNotifications();
  }

  async function markAllNotificationsRead() {
    await apiFetch("/notifications/read-all", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await loadNotifications();
  }

  return (
    <div className="min-h-screen bg-[#eef1f6] text-[#19162f]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[286px] border-r border-[#dde4ef] bg-white shadow-[22px_0_60px_rgba(23,34,66,0.08)] lg:block">
          <SidebarContent
            navigationGroups={navigationGroups}
            navigationCount={navigation.length}
            pathname={pathname}
            session={session}
            workspaces={workspaces}
            switchingWorkspaceId={switchingWorkspaceId}
            onSwitchWorkspace={onSwitchWorkspace}
          />
      </aside>

      <div
        className={clsx(
          "fixed inset-0 z-50 bg-[#101735]/40 backdrop-blur-sm transition lg:hidden",
          mobileOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <div className="h-full w-[min(88vw,350px)] bg-white shadow-[0_24px_70px_rgba(16,23,53,0.24)]">
          <div className="flex h-16 items-center justify-between border-b border-[#e6ebf4] px-5">
            <BrandMark />
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-lg text-[#5e667a] transition hover:bg-[#f2f5fb] hover:text-[#151936]"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <SidebarContent
            navigationGroups={navigationGroups}
            navigationCount={navigation.length}
            pathname={pathname}
            session={session}
            workspaces={workspaces}
            switchingWorkspaceId={switchingWorkspaceId}
            onSwitchWorkspace={onSwitchWorkspace}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </div>

      <div className="lg:pl-[286px]">
        <header className="sticky top-0 z-30 border-b border-[#dfe4ef] bg-white/94 backdrop-blur-xl">
          <div className="flex min-h-[78px] flex-wrap items-center gap-3 px-4 py-3 sm:px-7 lg:flex-nowrap">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-[#d8d9e3] text-[#323244] lg:hidden"
            >
              <Menu size={18} aria-hidden="true" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[25px] font-black text-[#141733]">{activeItem.title}</h1>
              <p className="mt-1 truncate text-[12px] font-semibold text-[#747b91]">{activeItem.description}</p>
            </div>

            <button
              type="button"
              disabled={!canUseGlobalSearch}
              onClick={() => {
                if (!canUseGlobalSearch) {
                  return;
                }
                setSearchOpen(true);
                setSearchQuery("");
              }}
              className="order-5 flex h-12 w-full items-center gap-3 rounded-lg border border-[#d3d9e8] bg-[#fbfcff] px-4 text-left text-[13px] font-semibold text-[#7b8195] shadow-[0_10px_30px_rgba(24,31,67,0.04)] transition hover:border-[#c7d2e5] hover:bg-white disabled:cursor-not-allowed disabled:opacity-55 sm:order-none sm:w-[min(48vw,520px)] xl:w-[520px]"
            >
              <Search size={17} aria-hidden="true" />
              <span className="truncate">{canUseGlobalSearch ? "Search employees, roles, documents" : "Search limited by role"}</span>
              <span className="ml-auto hidden rounded-md border border-[#dfe4ef] bg-white px-2 py-1 text-[10px] font-black text-[#9aa2b3] xl:inline-flex">
                CMD
              </span>
            </button>

            <RealtimePulse enabled={canReadRealtime} />

            <div className="relative">
              <button
                type="button"
                aria-label="Open account menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
                className="flex h-12 items-center gap-3 rounded-lg border border-[#dfe4ef] bg-white px-2.5 shadow-[0_12px_30px_rgba(23,34,66,0.07)] transition hover:border-[#cbd5e8] hover:bg-[#fbfcff] sm:min-w-[192px] sm:px-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#3820d7] text-sm font-black text-white shadow-[0_10px_22px_rgba(56,32,215,0.18)]">
                  {userName.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden min-w-0 flex-1 text-left sm:block">
                  <span className="block truncate text-[12px] font-black text-[#151936]">{userName}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] font-black uppercase tracking-[0.08em] text-[#8a92a6]">
                    <ShieldCheck size={12} aria-hidden="true" />
                    {primaryRole}
                  </span>
                </span>
                <ChevronDown
                  size={15}
                  className={clsx("hidden shrink-0 text-[#8a92a6] transition sm:block", accountOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>

              {accountOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(88vw,310px)] rounded-2xl border border-[#dde4ef] bg-white p-3 shadow-[0_26px_70px_rgba(23,34,66,0.18)]">
                  <div className="rounded-xl bg-[#f6f8fd] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a92a6]">Signed in as</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#3820d7] text-sm font-black text-white">
                        {userName.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-[#151936]">{userName}</span>
                        <span className="mt-0.5 block truncate text-[11px] font-black uppercase tracking-[0.08em] text-[#7b8295]">
                          {primaryRole}
                        </span>
                      </span>
                    </div>
                  </div>

                  {canSwitchWorkspaces ? (
                    <div className="mt-3 rounded-xl border border-[#e3e9f4] bg-white p-2">
                      <div className="flex items-center justify-between px-2 pb-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a92a6]">Workspaces</p>
                        <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-black text-[#3820d7]">
                          {workspaces.length}
                        </span>
                      </div>
                      <div className="max-h-56 space-y-1 overflow-y-auto">
                        {workspaces.map((workspace) => (
                          <button
                            key={workspace.membershipId}
                            type="button"
                            disabled={Boolean(switchingWorkspaceId)}
                            onClick={() => onSwitchWorkspace(workspace)}
                            className={clsx(
                              "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                              workspace.isCurrent
                                ? "bg-[#f1eeff] text-[#171a4a]"
                                : "text-[#4d566d] hover:bg-[#f6f8fd] hover:text-[#171a4a]",
                              switchingWorkspaceId && "cursor-wait opacity-70",
                            )}
                          >
                            <span
                              className={clsx(
                                "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black",
                                workspace.tenant ? "bg-[#ff9f1c] text-white" : "bg-[#171444] text-white",
                              )}
                            >
                              {workspace.displayName.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-black">{workspace.displayName}</span>
                              <span className="mt-0.5 block truncate text-[10px] font-black uppercase tracking-[0.08em] text-[#8a92a6]">
                                {workspace.tenant ? workspace.slug : "platform"} · {workspace.type.replaceAll("_", " ")}
                              </span>
                            </span>
                            {switchingWorkspaceId === workspace.membershipId ? (
                              <Loader2 size={15} className="shrink-0 animate-spin text-[#3820d7]" aria-hidden="true" />
                            ) : workspace.isCurrent ? (
                              <CheckCircle2 size={15} className="shrink-0 text-[#20a06b]" aria-hidden="true" />
                            ) : (
                              <ArrowRight size={14} className="shrink-0 text-[#9aa2b3]" aria-hidden="true" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : currentWorkspace ? (
                    <div className="mt-3 rounded-xl border border-[#e3e9f4] bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a92a6]">Current workspace</p>
                      <p className="mt-1 truncate text-sm font-black text-[#151936]">{currentWorkspace.displayName}</p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-[#7a8297]">{currentWorkspace.slug}</p>
                    </div>
                  ) : null}

                  <div className="mt-2 space-y-1">
                    <Link
                      href={accountProfileHref}
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-black text-[#4d566d] transition hover:bg-[#f6f8fd] hover:text-[#171a4a]"
                    >
                      <UserRound size={16} aria-hidden="true" />
                      Profile and access
                    </Link>
                    <Link
                      href={accountSecurityHref}
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-black text-[#4d566d] transition hover:bg-[#f6f8fd] hover:text-[#171a4a]"
                    >
                      <KeyRound size={16} aria-hidden="true" />
                      Sessions and security
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        onLogout(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-black text-[#b42318] transition hover:bg-[#fff5f5]"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {canUseCreate ? (
              <Link
                href="/create"
                className="hidden h-12 items-center justify-center gap-2 rounded-lg bg-[#3820d7] px-7 text-sm font-black text-white! shadow-[0_16px_34px_rgba(56,32,215,0.24)] transition hover:-translate-y-0.5 hover:bg-[#2d18bf] md:inline-flex"
              >
                <CirclePlus size={16} aria-hidden="true" />
                Create
              </Link>
            ) : null}

            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                onClick={toggleNotifications}
                className="relative grid h-11 w-11 place-items-center rounded-full border border-[#dfe4ef] bg-white text-[#555d75] transition hover:bg-[#f6f8fc]"
              >
                <Bell size={17} aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#3820d7] px-1 text-[10px] font-black text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : (
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border border-white bg-[#36d399]" />
                )}
              </button>

              {notificationOpen ? (
                <NotificationDropdown
                  canRead={canReadNotifications}
                  loading={notificationLoading}
                  error={notificationError}
                  summary={notificationSummary}
                  items={notificationItems}
                  onClose={() => setNotificationOpen(false)}
                  onMarkRead={markNotificationRead}
                  onMarkAllRead={markAllNotificationsRead}
                />
              ) : null}
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-7 bg-white/94 backdrop-blur-xl">
          {canAccessCurrentRoute ? (
            children
          ) : (
            <div className="rounded-lg border border-[#ffdcb5] bg-[#fff8ed] p-6">
              <p className="text-sm font-black uppercase text-[#c76a00]">
                {currentRouteFeatureEnabled ? "Permission required" : "Feature not enabled"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#121a46]">
                {currentRouteFeatureEnabled
                  ? "You do not have access to this workspace."
                  : "This workspace is not included in this tenant plan."}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5d6782]">
                {currentRouteFeatureEnabled
                  ? "Your account is active, but this workspace is reserved for another operating role."
                  : "A tenant administrator or platform operator can enable this module from feature management."}
              </p>
            </div>
          )}
        </main>
      </div>

      <GlobalCommandPalette
        open={searchOpen}
        query={searchQuery}
        items={commandItems}
        onQuery={setSearchQuery}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}

type CommandItem = {
  title: string;
  description: string;
  href: string;
  tag: string;
  icon: LucideIcon;
};

type NotificationSummary = {
  unreadInbox: number;
  pendingDelivery: number;
  failedDelivery: number;
  byChannel?: Record<string, number>;
  byStatus?: Record<string, number>;
};

type NotificationRecipientItem = {
  id: string;
  status: string;
  readAt: string | null;
  createdAt: string;
  notification: {
    id: string;
    title: string;
    body: string;
    channel: string;
    status: string;
    createdAt: string;
    templateCode?: string | null;
  };
};

type PaginatedNotificationInbox = {
  data: NotificationRecipientItem[];
  page?: {
    limit: number;
    nextCursor?: string | null;
  };
};

function NotificationDropdown({
  canRead,
  loading,
  error,
  summary,
  items,
  onClose,
  onMarkRead,
  onMarkAllRead,
}: {
  canRead: boolean;
  loading: boolean;
  error: string | null;
  summary: NotificationSummary | null;
  items: NotificationRecipientItem[];
  onClose: () => void;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
}) {
  return (
    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-[#dde4ef] bg-white shadow-[0_26px_70px_rgba(23,34,66,0.18)]">
      <div className="border-b border-[#edf1f7] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a92a6]">Notification center</p>
            <h3 className="mt-1 text-lg font-black text-[#10143f]">Inbox and delivery state</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="grid h-9 w-9 place-items-center rounded-xl text-[#68748c] transition hover:bg-[#f6f8fd] hover:text-[#10143f]"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        {canRead ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <NotificationMetric label="Unread" value={summary?.unreadInbox ?? 0} />
            <NotificationMetric label="Pending" value={summary?.pendingDelivery ?? 0} />
            <NotificationMetric label="Failed" value={summary?.failedDelivery ?? 0} />
          </div>
        ) : null}
      </div>

      <div className="max-h-[430px] overflow-y-auto p-3">
        {!canRead ? (
          <div className="rounded-xl border border-[#ffdcb5] bg-[#fff8ed] p-4">
            <p className="text-sm font-black text-[#a15c00]">Notification permission required</p>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a5c34]">
              This account needs notifications.read before inbox state can be shown.
            </p>
          </div>
        ) : loading ? (
          <div className="grid place-items-center rounded-xl bg-[#fbfcff] p-10 text-[#68748c]">
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            <p className="mt-3 text-sm font-bold">Loading notifications</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-[#ffd5d5] bg-[#fff5f5] p-4">
            <p className="text-sm font-black text-[#b42318]">Could not load notifications</p>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#9b4c4c]">{error}</p>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onMarkRead(item.notification.id)}
                className="w-full rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-3 text-left transition hover:border-[#cbd5e8] hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#10143f]">{item.notification.title}</p>
                    <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-[#68748c]">
                      {item.notification.body}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${item.readAt ? "bg-[#f0f0f2] text-[#686b7c]" : "bg-[#ece9ff] text-[#3820d7]"}`}>
                    {item.readAt ? "READ" : "NEW"}
                  </span>
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase text-[#9aa2b3]">
                  {item.notification.channel} · {new Date(item.createdAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-8 text-center">
            <p className="text-sm font-black text-[#10143f]">No inbox notifications</p>
            <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
              New workflow, document, and operational notices will appear here.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#edf1f7] p-3">
        <button
          type="button"
          disabled={!canRead || loading || items.length === 0}
          onClick={onMarkAllRead}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe8f6] bg-white px-3 text-[12px] font-black text-[#4d566d] transition hover:bg-[#f6f8fd] disabled:cursor-not-allowed disabled:opacity-55"
        >
          <CheckCircle2 size={15} aria-hidden="true" />
          Mark all read
        </button>
        <Link
          href="/notifications"
          onClick={onClose}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3820d7] px-3 text-[12px] font-black text-white transition hover:bg-[#2d18bf]"
        >
          Open center
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function NotificationMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#edf1f7] bg-[#fbfcff] p-2.5">
      <p className="text-[9px] font-black uppercase text-[#8a92a6]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#10143f]">{value}</p>
    </div>
  );
}

function GlobalCommandPalette({
  open,
  query,
  items,
  onQuery,
  onClose,
}: {
  open: boolean;
  query: string;
  items: CommandItem[];
  onQuery: (value: string) => void;
  onClose: () => void;
}) {
  const searchHref = query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search";
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.description, item.tag]
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [items, query]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-[#101735]/45 p-4 backdrop-blur-sm">
      <div className="mx-auto mt-12 w-full max-w-3xl overflow-hidden rounded-2xl border border-[#dfe4ef] bg-white shadow-[0_34px_90px_rgba(17,20,58,0.28)]">
        <div className="flex items-center gap-3 border-b border-[#edf1f7] px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef2ff] text-[#3820d7]">
            <Command size={18} aria-hidden="true" />
          </span>
          <input
            autoFocus
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search workspaces, modules, actions, security..."
            className="h-11 min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#10143f] outline-none placeholder:text-[#9aa2b3]"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid h-10 w-10 place-items-center rounded-xl text-[#68748c] transition hover:bg-[#f6f8fd] hover:text-[#10143f]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3">
          <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#9aa2b3]">
            Command results
          </div>
          <Link
            href={searchHref}
            onClick={onClose}
            className="mb-3 flex items-center gap-3 rounded-xl border border-[#dfe8f6] bg-[#f8fbff] p-3 transition hover:border-[#cbd5e8] hover:bg-white"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#3820d7] text-white">
              <Search size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-[#10143f]">
                {query.trim() ? `Search records for "${query.trim()}"` : "Open global search"}
              </span>
              <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#7a8297]">
                Search people, positions, documents, organization nodes, and workflows
              </span>
            </span>
            <ArrowRight size={16} className="text-[#9aa2b3]" aria-hidden="true" />
          </Link>
          <div className="grid gap-2">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={`${item.tag}-${item.href}-${item.title}`}
                    href={item.href}
                    onClick={onClose}
                    className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-[#dfe8f6] hover:bg-[#f8fbff]"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef2ff] text-[#3820d7] transition group-hover:bg-white">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-[#10143f]">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#7a8297]">
                        {item.description}
                      </span>
                    </span>
                    <span className="hidden rounded-full bg-[#f0f3f8] px-2.5 py-1 text-[10px] font-black uppercase text-[#68748c] sm:inline-flex">
                      {item.tag}
                    </span>
                    <ArrowRight size={16} className="text-[#9aa2b3]" aria-hidden="true" />
                  </Link>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-8 text-center">
                <p className="text-sm font-black text-[#10143f]">No command found</p>
                <p className="mt-1 text-[12px] font-semibold text-[#7a8297]">
                  Try employees, approvals, settings, roles, documents, or tenants.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildCommandItems(session: AuthSession, navigation: ReturnType<typeof navigationForUser>): CommandItem[] {
  const profile = accessProfileForUser(session.user);
  const moduleItems = navigation.map((item) => ({
    title: item.title,
    description: item.description,
    href: item.href,
    tag: "module",
    icon: item.icon,
  }));
  const actions: CommandItem[] = [
    {
      title: "Search tenant workspace",
      description: "Backend search across employees, documents, positions, organization, and workflows",
      href: "/search",
      tag: "search",
      icon: Search,
    },
    {
      title: "Open create center",
      description: "Start governed workforce, tenant, document, and security workflows",
      href: "/create",
      tag: "action",
      icon: CirclePlus,
    },
    {
      title: "Create employee flow",
      description: "Person, employee relationship, assignment, and lifecycle setup",
      href: "/create#employee",
      tag: "workflow",
      icon: UsersRound,
    },
    {
      title: "Create role",
      description: "Add tenant roles and attach permission sets",
      href: "/iam",
      tag: "security",
      icon: KeyRound,
    },
    {
      title: "Provision tenant",
      description: "Create tenant settings, features, roles, and admin account",
      href: "/tenants#provision",
      tag: "platform",
      icon: MonitorCog,
    },
    {
      title: "Security sessions",
      description: "Review browser sessions and revoke stale devices",
      href: "/settings#sessions",
      tag: "security",
      icon: ShieldCheck,
    },
  ].filter((item) => {
    if (item.href.startsWith("/create")) {
      return profile.canUseAdminCreate && hasAnyPermission(session.user, CREATE_PERMISSIONS);
    }

    if (item.href.startsWith("/iam")) {
      return hasAnyPermission(session.user, ["iam.roles.read", "iam.roles.write"]);
    }

    if (item.href.startsWith("/tenants")) {
      return hasAnyPermission(session.user, ["platform.tenants.manage", "tenants.settings.read"]);
    }

    if (item.href.startsWith("/settings")) {
      return hasAnyPermission(session.user, ["tenants.settings.read", "tenants.branding.read"]);
    }

    return true;
  });

  return [...actions, ...moduleItems];
}

function SidebarContent({
  navigationGroups,
  navigationCount,
  pathname,
  session,
  workspaces,
  switchingWorkspaceId,
  onSwitchWorkspace,
  onNavigate,
}: {
  navigationGroups: ReturnType<typeof navigationGroupsForUser>;
  navigationCount: number;
  pathname: string;
  session: AuthSession;
  workspaces: AuthWorkspace[];
  switchingWorkspaceId: string | null;
  onSwitchWorkspace: (workspace: AuthWorkspace) => void;
  onNavigate?: () => void;
}) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const tenantName = session.tenant?.name ?? "Platform workspace";
  const tenantSlug = session.tenant?.slug ?? session.user.type;
  const activeGroupKey = useMemo(() => {
    return navigationGroups.find((group) =>
      group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
    )?.key;
  }, [navigationGroups, pathname]);

  function toggleGroup(groupKey: string) {
    setOpenGroups((current) => ({
      ...current,
      [groupKey]: !(current[groupKey] ?? groupKey === activeGroupKey),
    }));
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,#f5f7ff_0%,rgba(245,247,255,0)_100%)]" />

      <div className="relative hidden h-[76px] items-center border-b border-[#edf0f6] px-6 lg:flex">
        <BrandMark />
      </div>

      <div className="relative px-5 py-4">
        <button
          type="button"
          aria-label="Open workspace menu"
          aria-expanded={workspaceOpen}
          onClick={() => setWorkspaceOpen((open) => !open)}
          className="flex w-full items-center gap-3 rounded-xl border border-[#e6ebf4] bg-white px-3 py-3 text-left transition hover:border-[#cbd5e8] hover:bg-[#fbfcff]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ff9f1c] text-base font-extrabold text-white">
            {tenantName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold text-[#151936]">{tenantName}</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-[#7a8297]">
              {tenantSlug}
            </p>
          </div>
          <ChevronDown
            size={15}
            className={clsx("text-[#727a90] transition", workspaceOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {workspaceOpen ? (
          <div className="absolute left-5 right-5 top-[82px] z-30 rounded-2xl border border-[#dde4ef] bg-white p-3 shadow-[0_24px_60px_rgba(23,34,66,0.16)]">
            <div className="rounded-xl bg-[#f6f8fd] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a92a6]">Current workspace</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ff9f1c] text-base font-extrabold text-white">
                  {tenantName.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[#151936]">{tenantName}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#7a8297]">{tenantSlug}</span>
                </span>
              </div>
            </div>

            {workspaces.length > 1 ? (
              <div className="mt-3 space-y-1">
                <p className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a92a6]">Switch workspace</p>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace.membershipId}
                      type="button"
                      disabled={Boolean(switchingWorkspaceId)}
                      onClick={() => {
                        onSwitchWorkspace(workspace);
                        setWorkspaceOpen(false);
                        onNavigate?.();
                      }}
                      className={clsx(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        workspace.isCurrent
                          ? "bg-[#f1eeff] text-[#171a4a]"
                          : "text-[#4d566d] hover:bg-[#f6f8fd] hover:text-[#171a4a]",
                        switchingWorkspaceId && "cursor-wait opacity-70",
                      )}
                    >
                      <span
                        className={clsx(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black",
                          workspace.tenant ? "bg-[#ff9f1c] text-white" : "bg-[#171444] text-white",
                        )}
                      >
                        {workspace.displayName.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-black">{workspace.displayName}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-bold text-[#7a8297]">
                          {workspace.slug}
                        </span>
                      </span>
                      {switchingWorkspaceId === workspace.membershipId ? (
                        <Loader2 size={15} className="shrink-0 animate-spin text-[#3820d7]" aria-hidden="true" />
                      ) : workspace.isCurrent ? (
                        <CheckCircle2 size={15} className="shrink-0 text-[#20a06b]" aria-hidden="true" />
                      ) : (
                        <ArrowRight size={14} className="shrink-0 text-[#9aa2b3]" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#e4e9f2] bg-white p-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a92a6]">Status</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-black text-[#20a06b]">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  Active
                </p>
              </div>
              <div className="rounded-xl border border-[#e4e9f2] bg-white p-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#8a92a6]">Mode</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-black text-[#151936]">
                  <Building2 size={13} aria-hidden="true" />
                  Tenant
                </p>
              </div>
            </div>

            <div className="mt-2 space-y-1">
              <Link
                href="/settings"
                onClick={() => {
                  setWorkspaceOpen(false);
                  onNavigate?.();
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-black text-[#4d566d] transition hover:bg-[#f6f8fd] hover:text-[#171a4a]"
              >
                <Settings size={16} aria-hidden="true" />
                Workspace settings
              </Link>
              <Link
                href="/tenants"
                onClick={() => {
                  setWorkspaceOpen(false);
                  onNavigate?.();
                }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-black text-[#4d566d] transition hover:bg-[#f6f8fd] hover:text-[#171a4a]"
              >
                <MonitorCog size={16} aria-hidden="true" />
                Switch workspace
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <nav className="relative flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        <div className="flex items-center justify-between px-2 pb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#a0a7ba]">Main Menu</p>
          <span className="rounded-full border border-[#e2e7f0] bg-[#f7f9fc] px-2.5 py-1 text-[10px] font-black text-[#747d93]">
            {navigationCount}
          </span>
        </div>
        {navigationGroups.map((group, index) => {
          const GroupIcon = group.icon;
          const groupActive = group.key === activeGroupKey;
          const groupOpen = groupActive || (openGroups[group.key] ?? (index === 0 && navigationGroups.length <= 2));

          return (
            <div
              key={group.key}
              className={clsx(
                "rounded-2xl border transition",
                groupActive
                  ? "border-[#e1dcff] bg-[#fbfaff]"
                  : "border-transparent bg-transparent",
              )}
            >
              <button
                type="button"
                aria-expanded={groupOpen}
                onClick={() => toggleGroup(group.key)}
                className={clsx(
                  "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                  groupActive
                    ? "text-[#171a4a]"
                    : "text-[#555d72] hover:bg-[#f5f7fb] hover:text-[#171a4a]",
                )}
              >
                <span
                  className={clsx(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
                    groupActive
                      ? "bg-[#3820d7] text-white shadow-[0_10px_20px_rgba(56,32,215,0.18)]"
                      : "bg-[#f0f3f8] text-[#596277] group-hover:bg-white group-hover:text-[#3820d7]",
                  )}
                >
                  <GroupIcon size={17} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-black">{group.title}</span>
                    <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[9px] font-black text-[#60708d]">
                      {group.items.length}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      "mt-0.5 block truncate text-[10px] font-semibold",
                      groupActive ? "text-[#7b8295]" : "text-[#969daf] group-hover:text-[#6f778b]",
                    )}
                  >
                    {group.description}
                  </span>
                </span>
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={clsx("shrink-0 text-[#8a92a6] transition", groupOpen && "rotate-180")}
                />
              </button>

              {groupOpen ? (
                <div className="space-y-1 px-2 pb-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={clsx(
                          "group/item relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition duration-200",
                          active
                            ? "bg-white text-[#171a4a] shadow-[0_10px_24px_rgba(24,31,67,0.07)]"
                            : "text-[#555d72] hover:bg-white hover:text-[#171a4a]",
                        )}
                      >
                        {active ? (
                          <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-[#3820d7]" />
                        ) : null}
                        <span
                          className={clsx(
                            "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition",
                            active
                              ? "bg-[#eef2ff] text-[#3820d7]"
                              : "bg-[#f4f6fb] text-[#687189] group-hover/item:bg-[#eef2ff] group-hover/item:text-[#3820d7]",
                          )}
                        >
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-black">{item.title}</span>
                          <span
                            className={clsx(
                              "mt-0.5 block truncate text-[10px] font-semibold",
                              active ? "text-[#7b8295]" : "text-[#969daf] group-hover/item:text-[#6f778b]",
                            )}
                          >
                            {item.description}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        {navigationGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dfe8f6] bg-[#fbfcff] p-4">
            <p className="text-sm font-black text-[#151936]">No workspaces available</p>
            <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7a8297]">
              Your account is active, but no navigation areas are assigned yet.
            </p>
          </div>
        ) : null}
      </nav>

      <div className="relative h-5" />
    </div>
  );
}

function BrandMark() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="relative h-14 w-[182px] shrink-0 overflow-hidden">
        <Image
          src="/images/timesync_logo.png"
          alt="TimeSync"
          fill
          sizes="182px"
          className="object-contain object-left"
        />
      </span>
    </Link>
  );
}
