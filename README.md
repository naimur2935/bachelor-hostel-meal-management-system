# 🍽️ Bachelor Hostel Meal Management System (BHMMS)

A modern, multi-tenant SaaS platform that automates meal tracking, expense sharing, and financial settlement for bachelor hostels, shared messes, and co-living spaces. Built to replace error-prone spreadsheets with a real-time, role-based web application.

> 🌐 **Live App:** [https://bhmms.nextdevgen.com](https://bhmms.nextdevgen.com)

---

## 📑 Table of Contents

1. [Introduction](#1-introduction)
2. [Features & Functionality](#2-features--functionality)
3. [Tools & Framework](#3-tools--framework)
4. [Conclusion](#4-conclusion)

---

## 1. Introduction

Managing meals, groceries, and shared expenses in a hostel or shared living space is traditionally chaotic — manual registers, lost receipts, disputed balances, and end-of-month settlement nightmares. **BHMMS** solves this by providing a centralized digital platform where every meal, every taka, and every member is tracked transparently in real time.

The system is designed as a **multi-tenant SaaS**, meaning a single deployment can serve unlimited hostels, each with isolated data, their own admins, members, financial cycles, and configurable rules. A **Super Admin** oversees the entire platform, onboards hostels, manages subscriptions, and monitors usage globally.

Whether you run a 10-person mess or a chain of student hostels, BHMMS gives you the tools to operate professionally — with automated calculations, deadline-enforced meal entry, role-based access control, and instant financial visibility for every member.

---

## 2. Features & Functionality

### 🔐 Authentication & Security
- Email + password authentication with secure session management
- Email-verified signup flow (configurable)
- Password reset & change-password from profile
- **3-tier role hierarchy**: `super_admin` → `admin` / `manager` → `user`
- **Row-Level Security (RLS)** on every table — users can only see what they are authorized to see
- Subscription enforcement — expired hostels are automatically blocked from data access
- Roles stored in a dedicated `user_roles` table (preventing privilege escalation)

### 👑 Super Admin Capabilities
- **Multi-Hostel Dashboard** — view, create, edit, and manage every hostel on the platform
- **Hostel Onboarding** with rich metadata:
  - Logo / cover image upload
  - Registration & license document uploads
  - City, country, postal code
  - Description & internal notes
- **Admin Provisioning**:
  - Create the hostel's primary admin in one step
  - Send **email invite** (magic link) — admin sets their own password
  - Or set the password manually on behalf of the admin
- **Edit any admin's details** at any time
- **Global Member Browser** with advanced filters (by hostel, name, role, status)
- **Subscription Management** — track plans, expiry dates, and payment status per hostel
- **Platform Analytics** — totals across hostels, members, meals, and revenue

### 🏠 Hostel Admin / Manager Capabilities
- **Isolated Tenant View** — admins only see their own hostel's data; Super Admins are hidden from member lists
- **Member Management (CRUD)**:
  - Add, edit, deactivate members
  - Assign roles (manager / user)
  - Upload member documents
- **Configurable Meal Edit Deadline** (per-hostel, persisted in DB):
  - Choose **Previous day** or **Same day** cutoff
  - Pick the exact cutoff time (e.g. 9:00 PM previous day)
  - Enforced via RLS for general users; admins can override
- **Expense Logging** — record groceries, utilities, and shared costs with receipts
- **Payment Tracking** — log member deposits, advances, and adjustments
- **Subscription Payment** — pay/renew the hostel's subscription via online checkout
- **Monthly Reports** — auto-generated per-member statements

### 👤 Member (User) Capabilities
- **One-tap meal marking** for breakfast, lunch, and dinner (within deadline)
- **Personal balance** — see exactly what you owe or have in advance
- **Meal history** with edit audit trail
- **Payment history** — every deposit visible
- **Profile management** (see below)

### 🙍 Universal Profile System (All Roles)
- Update full name, phone, room number
- Upload / change profile picture (avatar)
- Change password securely
- View account email (read-only)
- Stored in dedicated `avatars` storage bucket with per-user RLS

### 💰 Financial Engine
- **Automatic meal-rate calculation**: `Total Expenses ÷ Total Meals = Per-Meal Rate`
- **Per-member balance**: `Deposits − (Meals × Rate)`
- **Color-coded balance indicators** — 🟢 advance / 🔴 due
- **Monthly cycles** — clean rollover and historical reporting
- **Expense categorization** with receipts/proof uploads

### 💳 Subscriptions & Payments
- Hostel-level subscription plans (Free / Paid tiers)
- Online checkout via **Stripe** (when supported in your region)
- Manual payment recording fallback
- Subscription banner shown to admins when expiry is near or lapsed
- Auto-block of write operations on expired subscriptions

### 📧 Notifications
- **In-app toast notifications** for all actions
- **Email notifications** via Lovable Emails:
  - Admin invitations
  - Password reset / magic links
  - Subscription reminders

### 📦 File & Document Management
- Hostel logos & registration docs (`hostel-assets` bucket)
- Member documents
- User avatars (`avatars` bucket)
- All buckets protected by granular RLS storage policies

### 🎨 UX & Design
- Minimalist "Notion meets finance app" aesthetic
- Warm neutral palette with teal/emerald accents
- Fully responsive — mobile, tablet, desktop
- Dark mode ready (via semantic HSL design tokens)
- Accessible components (shadcn/ui + Radix primitives)

---

## 3. Tools & Framework

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI library |
| **TypeScript 5** | Type safety |
| **Vite 5** | Build tool & dev server |
| **Tailwind CSS v3** | Utility-first styling with semantic HSL tokens |
| **shadcn/ui + Radix UI** | Accessible component primitives |
| **React Router v6** | Client-side routing & guards |
| **TanStack Query** | Server state, caching, optimistic updates |
| **React Hook Form + Zod** | Form handling & validation |
| **Lucide React** | Icon system |
| **Sonner** | Toast notifications |
| **Recharts** | Charts & analytics visualizations |

### Backend (Lovable Cloud)
| Technology | Purpose |
|---|---|
| **PostgreSQL** | Primary relational database |
| **Row-Level Security (RLS)** | Tenant isolation & access control |
| **Supabase Auth** | Email/password + magic link authentication |
| **Edge Functions (Deno)** | Server-side logic (e.g. `manage-member`) |
| **Supabase Storage** | File uploads (avatars, hostel assets, documents) |
| **Database Triggers & Functions** | Validation, auto-profile creation, role checks |

### Integrations
- **Stripe** — online subscription payments
- **Lovable Emails** — transactional email (invites, magic links)
- **Lovable AI Gateway** — ready for future AI-powered insights

### Tooling & Quality
- **ESLint** — code linting
- **Vitest** — unit testing
- **Playwright** — E2E testing
- **Git** — version control

### Architecture Highlights
- Multi-tenant data model with `hostel_id` scoping on every business table
- `SECURITY DEFINER` SQL functions (e.g. `has_role`) to prevent recursive RLS
- Separated `user_roles` table to eliminate privilege-escalation risk
- Storage RLS aligned with database RLS for end-to-end security

---

## 4. Conclusion

**BHMMS** is a production-ready, secure, and scalable multi-tenant platform that transforms how shared living spaces handle meals and money. By combining a modern React frontend with a hardened PostgreSQL backend protected by Row-Level Security, it delivers enterprise-grade isolation and reliability — yet remains simple enough that any hostel resident can mark a meal in a single tap.

From the **Super Admin** managing a portfolio of hostels, to the **Hostel Admin** running daily operations, to the **member** checking their balance on the way to dinner — every role gets exactly the tools they need, and nothing they don't.

With configurable meal deadlines, automated financial calculations, integrated payments, email notifications, and a beautiful responsive UI, BHMMS replaces months of spreadsheet pain with minutes of clarity. It is built with modern best practices, ready to scale, and easy to extend — a complete digital backbone for the future of shared-living management.

