import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpenText,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { AuthSession } from "@/lib/api/types";
import type { AttendanceSummary, MyAttendanceWorkspace } from "@/lib/attendance/types";
import type { AccessProfile } from "@/lib/auth/access-profile";
import { displayUserName } from "@/lib/auth/user";
import type { MyScheduleWorkspace, ScheduleAssignment, SchedulingSummary } from "@/lib/scheduling/types";
import type { MyEmploymentResponse, WorkforceAssignment } from "@/lib/workforce/types";
import { tenantAllowsFeatures } from "@/config/navigation";
import { DashboardTimeClock } from "@/components/dashboard/dashboard-time-clock";

type DashboardPayload = Record<string, unknown> | null;
type DashboardCardTone = keyof typeof dashboardCardTones;
type DashboardCard = {
  title: string;
  description: string;
  value: string | number;
  href: string;
  icon: LucideIcon;
  image: string;
  tone: DashboardCardTone;
  featureEnabled?: boolean;
  comingSoon?: boolean;
};

type ShiftCalendarDay = {
  key: string;
  label: string;
  weekday: string;
  isToday: boolean;
  items: ScheduleAssignment[];
};

function DashboardBannerArt() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 h-full w-[168px]"
      viewBox="0 0 168 106"
      preserveAspectRatio="none"
    >
      <path d="M0 0H116L168 106H0Z" fill="#1f704d" />
      <path
        d="M-8 84L24 52L122 150"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeWidth="7"
      />
      <path
        d="M-10 132L24 98L128 202"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeWidth="7"
      />
    </svg>
  );
}

const dashboardCardTones = {
  green: "bg-[#1f7a53]",
  sky: "bg-[#2867c9]",
  indigo: "bg-[#263d96]",
  orange: "bg-[#bd5510]",
  violet: "bg-[#5325c9]",
  teal: "bg-[#17796d]",
  rose: "bg-[#a92c59]",
  amber: "bg-[#965718]",
  ocean: "bg-[#1e6fb5]",
  magenta: "bg-[#7e32b2]",
} as const;

export function ScopedDashboard({
  data,
  session,
  profile,
  selfEmployment,
  scheduleSummary,
  mySchedule,
  attendanceSummary,
  myAttendance,
}: {
  data: DashboardPayload;
  session: AuthSession;
  profile: AccessProfile;
  selfEmployment?: MyEmploymentResponse | null;
  scheduleSummary?: SchedulingSummary | null;
  mySchedule?: MyScheduleWorkspace | null;
  attendanceSummary?: AttendanceSummary | null;
  myAttendance?: MyAttendanceWorkspace | null;
}) {
  const userName = displayUserName(session.user);
  const tenantName = session.tenant?.name ?? "TimeSync";
  const isManagerOnly = profile.isManager && !profile.canUseTenantCommandCenter;
  const employee = selfEmployment?.employee ?? null;
  const assignment = currentAssignment(employee?.assignments);
  const assignedApprovals = readNumber(data, "approvals.myPendingTasks") ?? 0;
  const unreadNotifications = readNumber(data, "notifications.unreadForUser") ?? 0;
  const visiblePeople = readNumber(data, "workforce.total") ?? 1;
  const readiness = readinessScore(selfEmployment, assignment);
  const canUseScheduling = tenantAllowsFeatures(session.tenant, ["SCHEDULING"]);
  const canUseAttendance = tenantAllowsFeatures(session.tenant, ["ATTENDANCE"]);
  const canUseLeave = tenantAllowsFeatures(session.tenant, ["LEAVE"]);
  const onboarding = onboardingPrompt(selfEmployment);
  const nextSchedule = mySchedule?.assignments.data[0] ?? scheduleSummary?.upcomingAssignments?.[0] ?? null;
  const scheduledToday = attendanceSummary?.metrics.scheduledToday ?? myAttendance?.todayAssignments.length ?? 0;
  const shiftWeek = buildPersonalShiftWeek(mySchedule?.assignments.data ?? []);
  const scheduleValue = isManagerOnly
    ? `${scheduleSummary?.metrics.assignmentsToday ?? 0} today`
    : nextSchedule
      ? shortScheduleDate(nextSchedule)
      : "Open";

  const dashboardCards: DashboardCard[] = [
    {
      title: isManagerOnly ? "Visible team" : "My employment",
      description: isManagerOnly
        ? "Open only the people and assignment context your role is allowed to supervise."
        : "Review your employee number, status, assignment, and employment details.",
      value: isManagerOnly ? visiblePeople : employee?.status ? humanize(employee.status) : "Open",
      href: isManagerOnly ? "/workforce" : "/profile",
      icon: isManagerOnly ? UsersRound : UserRound,
      image: "/images/HR_01.png",
      tone: "green",
    },
    {
      title: isManagerOnly ? "My approvals" : "Current assignment",
      description: isManagerOnly
        ? "Approval work is scoped to items assigned to you or your role."
        : "See your current position, team, manager, and effective assignment dates.",
      value: isManagerOnly ? assignedApprovals : assignment?.position?.title ?? assignment?.organizationNode?.name ?? "Pending",
      href: isManagerOnly ? "/workflows" : "/profile#assignment",
      icon: isManagerOnly ? ClipboardList : BadgeCheck,
      image: "/images/HR_02.png",
      tone: "sky",
    },
    {
      title: isManagerOnly ? "Team schedule" : "My schedule",
      description: isManagerOnly
        ? "Plan team coverage, review open shifts, and handle overtime inside your reporting scope."
        : "See upcoming shifts, open shifts you can claim, availability windows, and overtime requests.",
      value: scheduleValue,
      href: "/scheduling",
      icon: CalendarClock,
      featureEnabled: canUseScheduling,
      image: "/images/HR_03.png",
      tone: "indigo",
    },
    {
      title: "My notices",
      description: "Notifications addressed to your account appear here.",
      value: unreadNotifications,
      href: "/notifications",
      icon: Bell,
      image: "/images/HR_04.png",
      tone: "orange",
    },
    {
      title: "HR guides",
      description: "Read workforce guides without opening content administration.",
      value: "Open",
      href: "/hr-guides",
      icon: BookOpenText,
      image: "/images/HR_05.png",
      tone: "violet",
    },
    {
      title: "Benefits",
      description: "Benefits enrollment, eligibility, dependants, and workplace plans will live here.",
      value: "Next",
      href: "#",
      icon: HeartHandshake,
      image: "/images/Benefits.png",
      tone: "teal",
      comingSoon: true,
    },
    {
      title: "Leave",
      description: "Review balances, submit time off, and follow workflow approval status.",
      value: "Open",
      href: "/leave",
      icon: CalendarCheck2,
      image: "/images/HR_06.png",
      tone: "rose",
      featureEnabled: canUseLeave,
    },
    {
      title: "Expenses",
      description: "Claims, receipts, approvals, and reimbursement readiness will connect after workforce core.",
      value: "Soon",
      href: "#",
      icon: ClipboardList,
      image: "/images/HR_07.png",
      tone: "amber",
      comingSoon: true,
    },
    {
      title: "Attendance",
      description: "Clock in, review exceptions, and follow timesheet status from one workspace.",
      value: "Open",
      href: "/attendance",
      icon: CheckCircle2,
      image: "/images/HR_08.png",
      tone: "ocean",
      featureEnabled: canUseAttendance,
    },
    {
      title: "Appraisal",
      description: "Goals, reviews, feedback cycles, and performance conversations are coming next.",
      value: "Soon",
      href: "#",
      icon: BadgeCheck,
      image: "/images/HR_05.png",
      tone: "magenta",
      comingSoon: true,
    },
  ];
  const cards = dashboardCards.filter((card) => card.featureEnabled ?? true);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-medium tracking-normal text-[#4a4f5f] md:text-[1.45rem]">
            Hello, <span className="font-black text-[#10143f]">{userName}</span>
          </h2>
        </div>

        <div className={`relative overflow-hidden rounded-[7px] ${
          onboarding || canUseAttendance ? "min-h-[106px] bg-[#c7efdd]" : "border border-[#dfe8f6] bg-white p-4 shadow-sm"
        }`}>
          {onboarding ? (
            <>
              <DashboardBannerArt />
              <div className="relative flex min-h-[106px] flex-col gap-4 py-5 pl-[152px] pr-5 md:flex-row md:items-center md:justify-between md:pl-[184px] md:pr-[58px]">
                <div className="min-w-0">
                  <h3 className="text-[1.34rem] font-medium leading-tight tracking-normal text-black md:text-[1.48rem]">Complete your onboarding process</h3>
                  <p className="mt-1 max-w-2xl text-[11px] font-medium leading-5 text-black md:text-xs">
                    {onboarding.nextTask
                      ? `Next step: ${onboarding.nextTask.title}.`
                      : "Please go ahead and update your personal information to explore TimeSync."}
                  </p>
                </div>
                <Link
                  href="/profile?section=tasks"
                  className="inline-flex h-10 min-w-[144px] items-center justify-center gap-2 rounded-[5px] bg-[#241ed4] px-6 text-sm font-medium text-white shadow-[0_14px_30px_rgba(36,30,212,0.2)] transition hover:-translate-y-0.5 md:h-11 md:min-w-[154px]"
                >
                  Continue
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </>
          ) : canUseAttendance ? (
            <>
              <DashboardBannerArt />
              <div className="relative flex min-h-[106px] flex-col gap-4 py-5 pl-[152px] pr-5 md:flex-row md:items-center md:justify-between md:pl-[184px] md:pr-[58px]">
                <div className="min-w-0">
                  <h3 className="text-[1.34rem] font-medium leading-tight tracking-normal text-black md:text-[1.48rem]">Start or finish your workday</h3>
                  <p className="mt-1 max-w-2xl text-[11px] font-medium leading-5 text-black md:text-xs">
                    Clock in from here, then review your planned shifts and attendance records when you need them.
                  </p>
                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#241ed4]">
                    {readiness}% profile readiness
                  </p>
                </div>
                <div className="w-full md:w-auto">
                  <DashboardTimeClock
                    activeRecord={myAttendance?.activeRecord ?? null}
                    scheduledToday={scheduledToday}
                    variant="inline"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#3820d7]">Workspace</p>
              <h3 className="mt-1 text-xl font-black text-[#10143f]">{tenantName}</h3>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#68748c]">
                Your dashboard is tailored to your role and the features enabled for this workspace.
              </p>
            </div>
          )}
        </div>
      </section>

      {canUseScheduling && !isManagerOnly ? (
        <PersonalShiftCalendar days={shiftWeek} />
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {cards.map((card) => (
          <DashboardActionCard key={card.title} card={card} />
        ))}
      </section>

      <section className="rounded-xl border border-[#dfe8f6] bg-white p-5 shadow-[0_18px_45px_rgba(18,31,67,0.06)]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eaf9f2] text-[#0f9f72]">
            <CheckCircle2 size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-[#10143f]">Workspace scope</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#68748c]">
              Employees see personal self-service. Managers see team and approval work. HR and tenant admins see tenant operations.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function PersonalShiftCalendar({ days }: { days: ShiftCalendarDay[] }) {
  const totalShifts = days.reduce((total, day) => total + day.items.length, 0);

  return (
    <section className="rounded-xl border border-[#dfe8f6] bg-white/95 p-3 shadow-[0_14px_34px_rgba(18,31,67,0.045)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#eef3ff] text-[#3820d7]">
            <CalendarClock size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#68748c]">My shifts</p>
            <h3 className="text-base font-black text-[#10143f]">This week at a glance</h3>
          </div>
          <span className="hidden rounded-full bg-[#f2f6ff] px-2.5 py-1 text-[11px] font-black text-[#3820d7] sm:inline-flex">
            {totalShifts} scheduled
          </span>
        </div>
        <Link
          href="/scheduling"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#d5e0f1] bg-white px-3 text-xs font-black text-[#10143f] transition hover:border-[#3820d7] hover:text-[#3820d7]"
        >
          Open schedule
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => (
          <article
            key={day.key}
            className={`rounded-xl border p-2.5 transition ${
              day.isToday
                ? "border-[#3820d7] bg-[#f6f4ff] shadow-[0_10px_24px_rgba(56,32,215,0.08)]"
                : "border-[#e3ebf7] bg-[#fbfcff] hover:border-[#cfdcf0]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#7b849b]">{day.weekday}</p>
                <h4 className="mt-0.5 text-sm font-black text-[#10143f]">{day.label}</h4>
              </div>
              <span className="inline-flex min-w-6 justify-center rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#3820d7] shadow-sm">
                {day.items.length}
              </span>
            </div>

            <div className="mt-2 space-y-1.5">
              {day.items.slice(0, 1).map((assignment) => (
                <div key={assignment.id} className="rounded-lg bg-white px-2 py-1.5 shadow-sm ring-1 ring-[#edf1f7]">
                  <p className="line-clamp-1 text-[11px] font-black text-[#10143f]">
                    {assignment.shift?.name ?? "Scheduled shift"}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-[#68748c]">
                    {timeRange(assignment.startsAt, assignment.endsAt)}
                  </p>
                </div>
              ))}
              {day.items.length > 1 ? (
                <p className="text-[10px] font-black text-[#3820d7]">+{day.items.length - 1} more</p>
              ) : null}
              {day.items.length === 0 ? (
                <div className="rounded-lg bg-white/70 px-2 py-1.5 text-[10px] font-bold text-[#8a94aa] ring-1 ring-[#edf1f7]">
                  No shift
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DashboardActionCard({ card }: { card: DashboardCard }) {
  const Icon = card.icon;
  const content = (
    <>
      <div className="relative flex items-start justify-between gap-4">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/14 text-white ring-1 ring-white/18">
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className="inline-flex min-h-7 min-w-7 items-center justify-center rounded-lg bg-white/16 px-2 text-[11px] font-extrabold text-white ring-1 ring-white/18">
          {card.value}
        </span>
      </div>

      <div className="relative mt-2 h-14">
        <Image
          src={card.image}
          alt=""
          fill
          sizes="(min-width: 1536px) 40vw, (min-width: 1280px) 32vw, (min-width: 640px) 65vw, 90vw"
          className="object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.15)] transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="relative mt-3">
        <h3 className="text-[1rem] font-extrabold leading-tight text-white">{card.title}</h3>
        <p className="mt-1.5 line-clamp-2 min-h-10 text-[12px] font-semibold leading-5 text-white/92">{card.description}</p>
        <span className="mt-3 inline-flex items-center gap-2 text-[12px] font-extrabold text-white transition group-hover:translate-x-1">
          {card.comingSoon ? "Coming next" : "Open"}
          <ArrowRight size={13} aria-hidden="true" />
        </span>
      </div>
    </>
  );
  const className = `group relative min-h-[188px] overflow-hidden rounded-xl ${dashboardCardTones[card.tone]} p-3.5 text-white shadow-[0_14px_30px_rgba(18,31,67,0.1)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(18,31,67,0.14)]`;

  if (card.comingSoon) {
    return (
      <article className={`${className} opacity-95`}>
        {content}
      </article>
    );
  }

  return (
    <Link href={card.href} className={className}>
      {content}
    </Link>
  );
}

function currentAssignment(assignments?: WorkforceAssignment[]) {
  return assignments?.find((assignment) => assignment.isPrimary && !assignment.effectiveTo) ?? assignments?.find((assignment) => !assignment.effectiveTo) ?? assignments?.[0] ?? null;
}

function readinessScore(
  employment: MyEmploymentResponse | null | undefined,
  assignment: WorkforceAssignment | null,
) {
  const employee = employment?.employee;
  if (!employee) return 60;

  const checks = [
    Boolean(employee.employeeNumber),
    Boolean(employee.hireDate),
    Boolean(assignment),
    Boolean(employee.documents?.length),
    employee.status === "ACTIVE" || employee.status === "PROBATION",
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function onboardingPrompt(employment: MyEmploymentResponse | null | undefined) {
  const employee = employment?.employee;

  if (!employee) return null;

  const visibleTasks = (employee.lifecycleTasks ?? []).filter(
    (task) => task.ownerType === "EMPLOYEE" || Boolean(task.assignedEmployeeId),
  );
  const openTasks = visibleTasks.filter((task) => !["COMPLETED", "WAIVED", "CANCELLED"].includes(task.status));
  const activePlan = (employee.lifecyclePlans ?? []).find(
    (plan) =>
      ["PREBOARDING", "ONBOARDING"].includes(plan.type) &&
      !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(plan.status),
  );

  if (!openTasks.length && !activePlan) return null;

  return {
    taskCount: openTasks.length || activePlan?.tasks?.filter((task) => !["COMPLETED", "WAIVED", "CANCELLED"].includes(task.status)).length || 1,
    nextTask: openTasks[0] ?? activePlan?.tasks?.find((task) => !["COMPLETED", "WAIVED", "CANCELLED"].includes(task.status)) ?? null,
  };
}

function buildPersonalShiftWeek(assignments: ScheduleAssignment[]): ShiftCalendarDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKeyFromDate(date);
    const items = assignments
      .filter((assignment) => assignmentDateKey(assignment) === key)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    return {
      key,
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      isToday: key === dateKeyFromDate(today),
      items,
    };
  });
}

function assignmentDateKey(assignment: ScheduleAssignment) {
  const raw = assignment.workDate || assignment.startsAt;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : dateKeyFromDate(date);
}

function dateKeyFromDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function timeRange(startsAt: string, endsAt: string) {
  return `${formatTime(startsAt)}-${formatTime(endsAt)}`;
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function humanize(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortScheduleDate(assignment: ScheduleAssignment) {
  const startsAt = new Date(assignment.startsAt);

  if (Number.isNaN(startsAt.getTime())) {
    return "Scheduled";
  }

  return startsAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function readNumber(source: DashboardPayload, path: string) {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, source ?? undefined);

  return typeof value === "number" ? value : null;
}
