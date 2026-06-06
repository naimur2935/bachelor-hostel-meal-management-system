# Hostel Meal Management System (BHMMS)
## University Project Report

---

**Project Title:** Bachelor Hostel Meal Management System (BHMMS)
**Live URL:** https://bhmms.nextdevgen.com
**Submission Date:** June 2026
**Document Version:** 1.0

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Problem Statement](#3-problem-statement)
4. [Objectives](#4-objectives)
5. [System Scope](#5-system-scope)
6. [Technology Stack](#6-technology-stack)
7. [System Architecture](#7-system-architecture)
8. [Database Design](#8-database-design)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Functional Modules](#10-functional-modules)
11. [Subscription & Payment System](#11-subscription--payment-system)
12. [User Interface Design](#12-user-interface-design)
13. [Security](#13-security)
14. [Testing](#14-testing)
15. [Deployment](#15-deployment)
16. [Future Enhancements](#16-future-enhancements)
17. [Conclusion](#17-conclusion)
18. [References](#18-references)

---

## 1. Abstract

The Bachelor Hostel Meal Management System (BHMMS) is a full-stack web application designed to digitise the day-to-day financial and operational management of shared bachelor hostels and mess facilities. Traditionally, meal counts, bazaar (grocery) expenses, utility bills, and member payments are tracked manually on paper registers, which is error-prone and time-consuming. BHMMS replaces this manual workflow with a secure, role-based, real-time platform that automatically calculates per-meal rates, individual balances, and monthly summaries. The system is built on React, TypeScript, and a managed PostgreSQL backend, and is deployed on the cloud-based managed infrastructure platform. It supports a multi-tenant model where each hostel operates independently, with an integrated subscription billing module powered by Paddle for sustainable SaaS operation.

---

## 2. Introduction

In Bangladesh and across South Asia, bachelor hostels and mess setups are a common shared-living arrangement, where 5–30 members pool money to buy groceries and share meals. Managing the finances of such a setup requires the hostel manager to:

- Record daily meal counts (lunch and dinner) for every member
- Track all bazaar and utility expenses
- Calculate a fair per-meal cost at month end
- Determine each member's balance (advance or due)
- Collect payments and maintain a transparent ledger

BHMMS automates this entire workflow through a clean, mobile-friendly web interface. It is targeted at hostel admins, managers, and individual members, with role-specific dashboards and access controls.

---

## 3. Problem Statement

Manual hostel-management workflows suffer from:

- **Calculation errors** – Per-meal rates and balances computed by hand often have mistakes.
- **Lack of transparency** – Members cannot independently verify their own balances.
- **Data loss** – Paper registers get lost, torn, or damaged.
- **No history** – Comparing months or auditing past records is nearly impossible.
- **Disputes** – Without an audit trail, member disagreements are common.

A digital, role-based, single-source-of-truth solution eliminates these issues.

---

## 4. Objectives

1. Provide a secure, role-based platform for hostel meal and expense tracking.
2. Automate per-meal rate and balance calculations.
3. Allow members to view their own meals, payments, and balance in real time.
4. Provide managers with tools to record bazaar, utility, and other expenses.
5. Give admins full control over members, roles, and monthly cycles.
6. Generate monthly reports that can be exported and shared.
7. Support multiple independent hostels (multi-tenant) with subscription billing.

---

## 5. System Scope

### In Scope
- Member management (CRUD)
- Daily meal entry (lunch / dinner)
- Expense tracking (bazaar, utility, other)
- Payment recording (meal payments, utility payments, advances)
- Automatic meal-rate and balance calculations
- Monthly reports
- Three-tier role-based access (Admin, Manager, Member)
- Hostel-level subscription billing via Paddle
- Profile and document management

### Out of Scope (Current Version)
- Mobile native apps (the web app is fully responsive)
- SMS/WhatsApp notifications
- Multi-currency support (currently BDT ৳)

---

## 6. Technology Stack

| Layer | Technology |
|------|------------|
| Frontend Framework | React 18 + TypeScript 5 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Routing | React Router v6 |
| State / Data | TanStack Query, React Context |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL + Authentication + Edge Functions) |
| Database | PostgreSQL with Row-Level Security |
| Edge Functions | Deno-based serverless functions |
| Payments | Paddle (Billing & Webhooks) |
| Hosting | Cloud Hosting Platform |
| Testing | Vitest, Playwright |

---

## 7. System Architecture

BHMMS follows a **3-tier client–cloud–database** architecture:

```
┌──────────────────────────────────────────────┐
│   Browser (React SPA, served via Vite/CDN)   │
└──────────────────────┬───────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼───────────────────────┐
│              Cloud Infrastructure                   │
│  ┌──────────┐ ┌────────┐ ┌─────────────────┐ │
│  │   Auth   │ │  Edge  │ │  File Storage   │ │
│  │  (JWT)   │ │  Fns   │ │   (Buckets)     │ │
│  └────┬─────┘ └───┬────┘ └────────┬────────┘ │
│       │           │               │          │
│  ┌────▼───────────▼───────────────▼────────┐ │
│  │     PostgreSQL  +  Row Level Security   │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────┘
                       │ Webhooks
              ┌────────▼─────────┐
              │      Paddle      │
              │   (Subscriptions)│
              └──────────────────┘
```

Key architectural decisions:
- **Client-side rendering** – All UI logic runs in the browser; the cloud only exposes data + edge functions.
- **RLS-first security** – Database enforces all access rules, so a compromised client cannot escalate privileges.
- **Edge functions** for any operation requiring elevated rights (member creation, webhooks).
- **Webhook-driven subscription state** – Paddle pushes events; the system never trusts client-reported billing state.

---

## 8. Database Design

Major tables in the `public` schema:

| Table | Purpose |
|------|---------|
| `profiles` | Per-user profile data (full_name, hostel_id, avatar) |
| `user_roles` | Role assignments (admin, manager, member) — separate table to prevent privilege-escalation |
| `hostels` | Hostel/tenant records |
| `meals` | Daily lunch/dinner counts per user per date |
| `expenses` | Bazaar, utility, and other expenses with category + month_year |
| `payments` | Member payments (type: meal / utility / advance) |
| `subscriptions` | Hostel-level subscription records linked to Paddle |
| `member_documents` | Uploaded ID/agreement files per member |

### Key relationships
- `profiles.hostel_id → hostels.id`
- `meals.user_id → auth.users.id`
- `payments.user_id → auth.users.id`
- `subscriptions.hostel_id → hostels.id`

### Calculation rules (server-side aggregation)
```
mealRate = totalBazarCost / totalMealsThisMonth
memberCost = memberMeals * mealRate
memberBalance = memberCost - memberPaid    // positive = due, negative = advance
```

---

## 9. Authentication & Authorization

- **Sign-up / Sign-in** – Email + password (Cloud Infrastructure Auth).
- **Three-tier role hierarchy:**
  - **Admin** – Full control of the hostel; manages members, subscription, settings.
  - **Manager** – Records meals, expenses, and payments.
  - **Member** – Views own meals, payments, and balance.
- **Roles stored in `user_roles`** (not on the profile) — checked via a `SECURITY DEFINER` function `has_role(user_id, role)`.
- **Protected routes** – `<ProtectedRoute>` wrapper redirects unauthenticated users to `/login` and enforces role requirements per page.

---

## 10. Functional Modules

### 10.1 Dashboard (`/dashboard`)
Per-role landing page showing:
- Current month's meal rate
- The signed-in user's meals, cost, payments, and balance
- For admin/manager: member summary table with all balances

### 10.2 Meal Management (`/meals`)
Calendar-style daily entry with lunch and dinner counts per member. Enforces an edit deadline (cannot edit past meals beyond N days). Maintains an edit history.

### 10.3 Expenses (`/expenses`)
Add/edit/delete bazaar, utility, and "other" expenses. Each expense is tagged with `month_year` so reports filter correctly.

### 10.4 Payments (`/payments`)
Record member payments (meal payments, utility payments, advances). Updates the member's running balance immediately.

### 10.5 Members (`/members`)
Admin-only CRUD with an Edge Function (`manage-member`) that creates the auth user, profile, and default role atomically. Supports member document uploads.

### 10.6 Reports (`/reports`)
Month-by-month navigation with totals (meals, rate, cost, collected) and a per-member breakdown. Supports CSV export.

### 10.7 Profile (`/profile`)
User can update their full name, avatar, and password.

### 10.8 Super Admin (`/super-admin`)
Platform-level view to manage hostels (only for the platform owner).

---

## 11. Subscription & Payment System

To sustain BHMMS as a SaaS, each hostel must hold an active subscription.

### Plans
| Plan | Price | Interval |
|------|-------|----------|
| Monthly | $20 | per month |
| Yearly | $200 | per year (≈17% saving) |

### Architecture
- **Paddle** is the billing provider. Two prices are configured: `hostel_monthly` and `hostel_yearly`.
- **`/subscription`** page (admin-only) shows:
  - The hostel's current active subscription and end date
  - Plan selection cards with Paddle Checkout integration
  - Full payment / subscription history
- **`get-paddle-price`** edge function resolves the external price ID to Paddle's internal ID at runtime.
- **`payments-webhook`** edge function receives Paddle events and updates the `subscriptions` table:
  - `SubscriptionCreated` → insert active row + compute `end_date`
  - `SubscriptionUpdated` → refresh `end_date`
  - `SubscriptionCanceled` → set `status = 'canceled'`
- The `hostel_id` is round-tripped via Paddle's `customData` so the webhook knows which hostel to update.
- A **SubscriptionBanner** on the dashboard warns admins when the subscription is expiring or expired.

---

## 12. User Interface Design

- **Aesthetic:** "Notion meets finance app" — minimalist, warm neutral palette with teal/emerald accents.
- **Components:** Built on shadcn/ui (Radix primitives + Tailwind), ensuring accessibility (ARIA, keyboard nav).
- **Responsive:** Mobile-first; sidebar collapses to a sheet on small screens.
- **Balance indicators:** Red for amounts due, green for advances — instantly readable.
- **Loading states:** Skeletons and spinners for every async block.
- **Toasts:** Non-blocking feedback for save/error events.

---

## 13. Security

- **Row-Level Security (RLS)** on every public-schema table; policies scoped to `auth.uid()` and `has_role()`.
- **Roles in a separate table** to prevent client-side privilege escalation.
- **Edge functions** use the `service_role` key (never exposed to the browser) for privileged operations.
- **Paddle webhook signature verification** — incoming events are validated before mutating subscription state.
- **HTTPS everywhere** – TLS terminated at the cloud edge network.
- **Password hashing** is handled by the managed auth provider (bcrypt).
- **No secrets in code** – API keys live in encrypted secret storage.

---

## 14. Testing

- **Unit tests** with Vitest cover utility functions and calculation logic.
- **Component tests** via React Testing Library.
- **End-to-end tests** with Playwright cover the core flows (login, add meal, record payment, view report).
- **Manual QA matrix** executed before each release across Chrome, Firefox, Safari, and mobile viewports.

---

## 15. Deployment

- **Continuous deployment** deploy by my own hosting nextdevgen.com.
- **Preview environment:** `Internal Preview Environment`
- **Production:** `https://bhmms.nextdevgen.com`
- **Edge functions** auto-deploy on save.
- **Database migrations** are versioned SQL files committed to the project.

---

## 16. Future Enhancements

1. SMS / WhatsApp reminders for unpaid balances.
2. Native mobile apps (React Native).
3. Advanced analytics dashboard (consumption trends, cost forecasts).
4. Bengali (বাংলা) localisation.
5. AI-powered receipt OCR for bazaar entries.
6. Multi-currency support for international hostels.

---

## 17. Conclusion

The Bachelor Hostel Meal Management System successfully replaces error-prone paper-based hostel accounting with a transparent, secure, and automated digital platform. Through role-based access, real-time calculations, and a sustainable subscription model, BHMMS delivers tangible value to hostel admins, managers, and members alike. The project demonstrates end-to-end full-stack development using modern web technologies — React, TypeScript, PostgreSQL with RLS, serverless edge functions, and third-party payment integration — and is production-ready, currently deployed at **https://bhmms.nextdevgen.com**.

---

## 18. References

1. React Documentation — https://react.dev
2. TypeScript Handbook — https://www.typescriptlang.org/docs/
3. Tailwind CSS — https://tailwindcss.com/docs
4. shadcn/ui — https://ui.shadcn.com
5. Supabase / PostgreSQL RLS — https://supabase.com/docs/guides/auth/row-level-security
6. Paddle Billing — https://developer.paddle.com
7. Cloud Hosting Platform Documentation
8. TanStack Query — https://tanstack.com/query
9. Vitest — https://vitest.dev
10. Playwright — https://playwright.dev

---

*End of Report*
