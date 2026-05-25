# TimeSync FE Roadmap

This roadmap mirrors the NestJS backend phases and turns the frontend into a secure, permission-aware enterprise WorkforceOS.

## Phase 0 - Foundation

- Next.js app router structure, global providers, environment contract, and base design primitives.
- Same-origin backend-for-frontend proxy to the Nest API.
- HTTP-only cookie authentication flow with CSRF forwarding.
- Shared API types, error handling, and route utilities.

## Phase 1 - Authenticated Enterprise Shell

- Login experience wired to `POST /api/v1/auth/login`.
- Server-side session resolution through `GET /api/v1/auth/me`.
- Protected app routes gated by auth cookies and backend session validation.
- Permission-aware navigation using backend permission codes.
- Enterprise dashboard layout with sidebar, topbar, tenant context, roles, and quick actions.
- Dashboard overview connected to `GET /api/v1/dashboard/overview`.

## Phase 2 - Platform And Tenant Administration

- Platform tenant management screens for `platform/tenants`.
- Tenant settings, branding, subscriptions, and feature enablement.
- Super-admin control surfaces, tenant status lifecycle actions, and usage cards.

## Phase 3 - IAM And Security Operations

- Roles, permissions, user-role assignment, and scoped role views.
- Session management from `auth/sessions`.
- Security dashboards for active sessions, locked users, and audit trails.

## Phase 4 - Organization Engine

- Organization tree, node editor, cost centers, and hierarchy visualization.
- Tenant-scoped filtering and permission-aware create/update/delete flows.

## Phase 5 - Person And Employee Core

- Person profiles, contacts, addresses, identities, skills, languages, education, and certifications.
- Employee records, lifecycle actions, timeline, and workforce action history.
- Employee search and directory experience.

## Phase 6 - Assignments And Position Control

- Current assignments, assignment history, transfers, manager changes, and effective dating.
- Position grades, levels, skills, hierarchy, occupants, vacancies, and capacity intelligence.

## Phase 7 - Workflow And Approvals

- Workflow builder, steps, routing configuration, and activation lifecycle.
- Approval inbox, approval requests, comments, delegation, SLA indicators, and rollback-ready UX.

## Phase 8 - Documents, Notifications, And Compliance

- Document types, document records, versions, verification, expiry, and compliance dashboard.
- Notification templates, outbound queue, preferences, read states, and delivery status.

## Phase 9 - Audit, Timeline, Outbox, And Analytics

- Audit logs, activity logs, timeline explorer, and outbox processing console.
- Analytics snapshots, dashboard widgets, risk panels, and executive reporting.

## Phase 10 - ESS And Experience Layer

- Employee self-service portal, profile management, document access, directory, notifications, and personal security.
- Manager workspace for approvals, team movements, documents, and workforce visibility.

## Phase 11 - Production Hardening

- E2E tests, accessibility pass, route-level loading states, error boundaries, telemetry, and deployment configuration.
- Frontend observability, API retry policy, auth refresh strategy, and release checklist.
