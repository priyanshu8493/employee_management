# WorkPulse — Enterprise Time-Tracking & Project Management Platform

## Complete Project Documentation

---

# PART 1: PROJECT OVERVIEW & CONCEPT

## 1.1 What Is WorkPulse?

WorkPulse is a full-stack, role-based enterprise time-tracking and project management web application. It enables organizations to manage employees, teams, projects, subtasks, time entries, and quality control workflows through a unified dashboard. The system supports three user roles — **Owner**, **Team Leader**, and **Employee** — each with distinct permissions, views, and responsibilities.

The core value proposition is allowing organizations to:

- Track exactly how much time each employee spends on specific tasks and projects
- Organize employees into teams with designated team leaders
- Assign granular subtasks to individual team members
- Generate detailed reports on time utilization across employees, projects, and teams
- Run a quality control (QC) process where team leaders review work and flag mistakes
- Monitor live activity (who is currently clocked in and working on what)

## 1.2 Project Name & Identity

- **Name**: WorkPulse
- **Version**: 0.1.0
- **Codename**: N/A
- **Tagline**: (Not defined — the project has no explicit tagline)

## 1.3 Target Audience

- **Primary**: Small-to-medium business owners who need to track employee time and project progress
- **Secondary**: Team leaders/managers who oversee daily work and quality
- **Tertiary**: Employees who need a simple interface to clock in/out and view their history

## 1.4 Project Status

The project is in **active development** with a functional MVP. Core features are implemented and working. There is no testing infrastructure, no CI/CD pipeline, and no production deployment configuration.

---

# PART 2: TECH STACK (COMPLETE INVENTORY)

## 2.1 Runtime & Language

| Technology | Version | Role |
|---|---|---|
| Node.js | ^20+ (inferred by Next.js 16 requirements) | JavaScript runtime |
| TypeScript | ^5.x | Type-safe language superset |
| npm | (default with Node) | Package manager |

## 2.2 Frontend Framework

| Technology | Version | Role |
|---|---|---|
| Next.js | 16.2.9 | React metaframework with App Router |
| React | 19.2.4 | UI component library |
| React DOM | 19.2.4 | DOM rendering bridge |

### Next.js 16 Configuration Details

- **Router**: App Router (file-system based routing in `app/` directory)
- **Rendering**: All pages are `"use client"` (client-side rendered, no SSR/SSG)
- **Bundler**: Turbopack (configured in `next.config.ts`)
- **Path Alias**: `@/*` maps to `./workpulse/*`
- **Middleware**: Incomplete — `proxy.ts` exists in root but is not registered as middleware in config

## 2.3 Styling

| Technology | Version | Role |
|---|---|---|
| Tailwind CSS | v4 (^4.x) | Utility-first CSS framework |
| @tailwindcss/postcss | ^4.x | PostCSS plugin for Tailwind v4 |
| PostCSS | (bundled) | CSS transformation pipeline |
| tw-animate-css | ^1.4.0 | Tailwind animation utilities |
| class-variance-authority | ^0.7.1 | Component variant management |
| clsx | ^2.1.1 | Conditional className merging |
| tailwind-merge | ^3.6.0 | Intelligent Tailwind class deduplication |

### Styling Notes

- **Theme**: Dark mode only — the `<html>` tag has `className="dark"` hardcoded
- **Global styles**: Defined in `app/globals.css` using `@import "tailwindcss"` (Tailwind v4's new import-based approach)
- **Component library base**: shadcn/ui v4 using the "base-nova" style
- **Base UI primitives**: `@base-ui/react` ^1.6.0 is included but not directly imported in application code (used internally by shadcn)

## 2.4 UI Component Library

**shadcn/ui** v4.11.0 with "base-nova" style — 22 components:

| Component | File | Purpose |
|---|---|---|
| Alert Dialog | `alert-dialog.tsx` | Confirmation modals (used by ConfirmDialog) |
| Avatar | `avatar.tsx` | User profile pictures |
| Badge | `badge.tsx` | Status labels (active, on-hold, etc.) |
| Button | `button.tsx` | Primary action buttons with variants |
| Card | `card.tsx` | Content containers for dashboards |
| Checkbox | `checkbox.tsx` | Multi-select inputs |
| Command | `command.tsx` | Command palette / searchable lists |
| Dialog | `dialog.tsx` | Modal dialogs for forms |
| Dropdown Menu | `dropdown-menu.tsx` | Context menus |
| Input Group | `input-group.tsx` | Grouped form inputs |
| Input | `input.tsx` | Text input fields |
| Label | `label.tsx` | Form field labels |
| Popover | `popover.tsx` | Floating content panels |
| Select | `select.tsx` | Dropdown selection |
| Separator | `separator.tsx` | Visual dividers |
| Sheet | `sheet.tsx` | Slide-in panels |
| Skeleton | `skeleton.tsx` | Loading placeholder animations |
| Sonner (Toaster) | `sonner.tsx` | Toast notification system |
| Table | `table.tsx` | Data table primitives |
| Tabs | `tabs.tsx` | Tabbed interfaces |
| Textarea | `textarea.tsx` | Multi-line text input |
| Tooltip | `tooltip.tsx` | Hover tooltips |

## 2.5 Icons

| Technology | Version | Role |
|---|---|---|
| lucide-react | ^1.21.0 | SVG icon library (used throughout for all icons) |

## 2.6 Charts & Data Visualization

| Technology | Version | Role |
|---|---|---|
| recharts | ^3.8.1 | Charting library for bar charts, line charts, pie charts |

## 2.7 Database & ORM

| Technology | Version | Role |
|---|---|---|
| Prisma | ^7.8.0 | ORM (Object-Relational Mapping) |
| @prisma/client | ^7.8.0 | Generated type-safe database client |
| @prisma/adapter-pg | ^7.8.0 | PostgreSQL adapter for Prisma |
| pg | ^8.22.0 | PostgreSQL native driver |

### Database Configuration

- **Database**: PostgreSQL (accessed via `DATABASE_URL` in `.env`)
- **Schema location**: `prisma/schema.prisma`
- **Migrations**: Located in `prisma/migrations/` (3 migrations exist)
- **Client generation**: Triggered via `postinstall` script (`npx prisma generate`)

## 2.8 Authentication

| Technology | Version | Role |
|---|---|---|
| NextAuth.js | ^5.0.0-beta.31 | Authentication framework |
| @auth/prisma-adapter | ^2.11.2 | Database adapter for NextAuth + Prisma |
| bcryptjs | ^3.0.3 | Password hashing (12 salt rounds) |

### Auth Configuration Details

- **Provider**: Credentials only (email + password)
- **Session strategy**: JWT (JSON Web Tokens)
- **Session max age**: 7 days
- **Callback**: JWT callback adds `id` and `role` to the token; session callback exposes them
- **Sign-in callback**: Redirects users based on role (Owner → `/dashboard`, Employee/TL → `/employee`)
- **Pages**: Custom login page at `/login`

## 2.9 Form Handling & Validation

| Technology | Version | Role |
|---|---|---|
| React Hook Form | ^7.80.0 | Performant form state management |
| @hookform/resolvers | ^5.4.0 | Bridge between RHF and Zod |
| Zod | ^4.4.3 | Schema declaration and validation |

### Validation Schemas

Defined in `lib/validations/index.ts` — includes Zod schemas for:
- `createEmployeeSchema` — name, email, password, role, teamId (optional)
- `updateEmployeeSchema` — partial update with name, phone, avatarUrl, password
- `createTeamSchema` — name, description, memberIds, teamLeadId
- `updateTeamSchema` — partial update for team
- `createProjectSchema` — name, description, color, estimatedHours, teamIds, startDate, endDate
- `updateProjectSchema` — partial update for project
- `createSubTaskSchema` — name, description, estimatedHours, assignedToId
- `updateSubTaskSchema` — status, name, description, estimatedHours
- `timeEntrySchema` — projectId, subTaskId, notes, action ("checkin" | "checkout")
- `checkoutSchema` — notes, markDone (boolean)
- `createQcReportSchema` — teamId, date, summary, mistakes (array of employeeId + description)
- `changePasswordSchema` — currentPassword, newPassword

## 2.10 Data Fetching & State Management

| Technology | Version | Role |
|---|---|---|
| @tanstack/react-query | ^5.101.0 | Server state management (caching, refetching, mutations) |
| Zustand | ^5.0.14 | Client state management (included but NOT used in app code) |

### React Query Configuration

- **Provider**: Wrapped in `components/Providers.tsx` with `QueryClientProvider`
- **Default options**: `staleTime: 30_000` (30 seconds)
- **Refetch intervals**: Used on live activity (30s) and active session (30s)
- **Mutations**: `useMutation` with `onSuccess` callbacks that invalidate relevant queries

## 2.11 Utilities

| Technology | Version | Role |
|---|---|---|
| date-fns | ^4.4.0 | Date manipulation, formatting, comparison |
| sonner | ^2.0.7 | Toast notifications (used via shadcn's sonner wrapper) |
| cmdk | ^1.1.1 | Command menu primitive (used by shadcn Command) |

## 2.12 Development Tooling

| Technology | Version | Role |
|---|---|---|
| ESLint | ^9.x | Code linting |
| eslint-config-next | 16.2.9 | Next.js ESLint configuration |
| dotenv | ^17.4.2 | Environment variable loading |
| tsx | (used via npx) | TypeScript execution for seed script |

## 2.13 Testing

**None.** There is no testing framework, no test files, and no testing configuration. The project has zero tests.

---

# PART 3: DIRECTORY STRUCTURE (ANNOTATED)

```
employee_management/                          # Git repository root
├── PROJECT_DESCRIPTION.md                    # ← This file
├── workpulse/                                # Next.js project root
│   ├── .env                                  # Environment variables (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET)
│   ├── .env.example                          # Template for environment variables
│   ├── .gitignore                            # Git ignore rules
│   ├── AGENTS.md                             # Instructions for AI coding assistants
│   ├── CLAUDE.md                             # Points to AGENTS.md (for Claude compatibility)
│   ├── README.md                             # Default Next.js README (not customized)
│   ├── proxy.ts                              # Route protection middleware (incomplete / not connected)
│   ├── next.config.ts                        # Next.js config (Turbopack enabled)
│   ├── tsconfig.json                         # TypeScript config (@/* → ./*)
│   ├── package.json                          # Dependencies and scripts
│   ├── package-lock.json                     # Lockfile
│   ├── postcss.config.mjs                    # PostCSS with Tailwind v4
│   ├── eslint.config.mjs                     # ESLint flat config
│   ├── components.json                       # shadcn/ui configuration
│   ├── next-env.d.ts                         # Next.js TypeScript declarations
│   │
│   ├── prisma/                               # Database layer
│   │   ├── schema.prisma                     # Database schema (10 models)
│   │   ├── prisma.config.ts                  # Prisma config file
│   │   ├── seed.ts                           # Database seeder with demo data
│   │   ├── migration_lock.toml               # Prisma migration lock
│   │   └── migrations/                       # Database migrations
│   │       ├── 20260621145243_init/          # Initial schema
│   │       ├── 20260627000001_add_qc_feature/ # Added TEAM_LEADER role, QC models
│   │       └── 20260627000002_add_assigned_to/ # Added assignedToId to subtasks
│   │
│   ├── app/                                  # Next.js App Router pages
│   │   ├── favicon.ico
│   │   ├── globals.css                       # Global styles + Tailwind imports
│   │   ├── layout.tsx                        # Root layout (wraps Providers)
│   │   ├── page.tsx                          # Root → redirects to /login
│   │   │
│   │   ├── (auth)/                           # Auth route group
│   │   │   └── login/
│   │   │       └── page.tsx                  # Login page (email/password form)
│   │   │
│   │   ├── (employee)/                       # Employee area route group
│   │   │   └── employee/
│   │   │       ├── layout.tsx                # Employee layout with EmployeeSidebar
│   │   │       ├── page.tsx                  # Employee home (check-in/out, projects, live timer)
│   │   │       ├── history/
│   │   │       │   └── page.tsx              # Time entry history with filters + CSV export
│   │   │       ├── profile/
│   │   │       │   └── page.tsx              # Profile editing (name, phone, avatar, password)
│   │   │       ├── qc-flags/
│   │   │       │   └── page.tsx              # View QC flags/issues raised against employee
│   │   │       ├── team-tasks/
│   │   │       │   └── page.tsx              # Team task assignment (Team Leader only)
│   │   │       └── time/
│   │   │           └── page.tsx              # Daily time tracking + weekly chart
│   │   │
│   │   ├── (owner)/                          # Owner dashboard route group
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx                # Dashboard layout with OwnerSidebar
│   │   │       ├── page.tsx                  # Overview (KPI cards, project health, charts)
│   │   │       ├── employees/
│   │   │       │   ├── page.tsx              # Employee list with search/filter + create dialog
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx          # Employee detail (stats, time log, QC, timeline)
│   │   │       ├── live/
│   │   │       │   └── page.tsx              # Live activity feed (who's working now)
│   │   │       ├── projects/
│   │   │       │   ├── page.tsx              # Project list with grid/list view + create
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx          # Project detail (subtasks, team, time entries)
│   │   │       ├── qc/
│   │   │       │   └── page.tsx              # QC reports viewer (filtered by team)
│   │   │       ├── reports/
│   │   │       │   └── page.tsx              # Analytics reports (employee, project, heatmap)
│   │   │       └── teams/
│   │   │           └── page.tsx              # Team CRUD with member management
│   │   │
│   │   └── api/                              # API route handlers
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts              # NextAuth handler (GET/POST for auth flows)
│   │       ├── dashboard/
│   │       │   ├── live/
│   │       │   │   └── route.ts              # GET active live entries (currently checked-in users)
│   │       │   └── overview/
│   │       │       └── route.ts              # GET dashboard KPI data + chart data
│   │       ├── employees/
│   │       │   ├── route.ts                  # GET list, POST create employee
│   │       │   └── [id]/
│   │       │       └── route.ts              # GET, PATCH, DELETE single employee
│   │       ├── projects/
│   │       │   ├── route.ts                  # GET list, POST create project
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts              # GET, PATCH, DELETE project
│   │       │   │   └── subtasks/
│   │       │   │       └── route.ts          # GET/POST subtasks for a specific project
│   │       │   └── ... (subtasks at top level too)
│   │       ├── qc/
│   │       │   ├── mistakes/
│   │       │   │   └── route.ts              # GET QC mistakes for current user
│   │       │   └── reports/
│   │       │       ├── route.ts              # GET list, POST create QC report
│   │       │       └── [id]/
│   │       │           └── route.ts          # GET single QC report
│   │       ├── reports/
│   │       │   └── route.ts                  # GET aggregated time reports (owner only)
│   │       ├── subtasks/
│   │       │   └── [id]/
│   │       │       └── route.ts              # PATCH update, DELETE subtask
│   │       ├── teams/
│   │       │   ├── route.ts                  # GET list, POST create team
│   │       │   └── [id]/
│   │       │       └── route.ts              # PATCH, DELETE team
│   │       └── time-entries/
│   │           ├── route.ts                  # GET list, POST check-in/check-out
│   │           └── active/
│   │               └── route.ts              # GET current user's active session
│   │
│   ├── components/                           # Shared React components
│   │   ├── Providers.tsx                     # SessionProvider + QueryClientProvider + Toaster
│   │   ├── dashboard/                        # (empty — dashboard UI is in page files)
│   │   ├── employee/                         # (empty — employee UI is in page files)
│   │   ├── layout/
│   │   │   ├── EmployeeSidebar.tsx           # Employee area navigation sidebar
│   │   │   └── OwnerSidebar.tsx              # Owner dashboard navigation sidebar
│   │   ├── projects/                         # (empty)
│   │   ├── shared/
│   │   │   ├── ConfirmDialog.tsx             # Reusable confirmation modal (default/destructive)
│   │   │   ├── DataTable.tsx                 # Generic sortable/searchable/paginated table
│   │   │   ├── EmptyState.tsx                # Empty state placeholder with icon + action
│   │   │   ├── ProgressBar.tsx               # Color-coded progress bar (green/amber/red)
│   │   │   └── StatCard.tsx                  # KPI stat card with icon, value, description, trend
│   │   └── ui/                               # shadcn/ui generated components (22 files)
│   │       ├── alert-dialog.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── checkbox.tsx
│   │       ├── command.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input-group.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── popover.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── skeleton.tsx
│   │       ├── sonner.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       └── tooltip.tsx
│   │
│   ├── lib/                                  # Shared utilities and configuration
│   │   ├── api-utils.ts                      # API helpers (requireAuth, requireRole, getAuthSession, response builders)
│   │   ├── auth.ts                           # NextAuth configuration (auth options, providers, callbacks)
│   │   ├── prisma.ts                         # Prisma client singleton (global caching for dev)
│   │   ├── utils.ts                          # General utilities (cn, formatDate, formatDuration, formatMinutes, getRelativeTime)
│   │   └── validations/
│   │       └── index.ts                      # All Zod validation schemas
│   │
│   ├── types/                                # TypeScript type definitions
│   │   ├── index.ts                          # ApiResponse<T>, PaginatedResponse<T>, dashboard types
│   │   └── next-auth.d.ts                    # NextAuth type augmentation (adds id, role to JWT/User)
│   │
│   ├── hooks/                                # Custom React hooks (empty directory)
│   │
│   ├── public/                               # Static assets
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   │
│   └── .next/                                # Next.js build output (gitignored)
```

---

# PART 4: DATABASE SCHEMA (COMPLETE)

## 4.1 Enums

```prisma
enum Role {
  OWNER
  EMPLOYEE
  TEAM_LEADER
}

enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
  ARCHIVED
}

enum SubTaskStatus {
  TODO
  IN_PROGRESS
  DONE
}
```

## 4.2 Models

### User (`users`)

The central entity representing every person in the system.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key (CUID) |
| `email` | `String` | `@unique` | Login identifier, must be unique |
| `passwordHash` | `String` | — | bcrypt-hashed password (12 rounds) |
| `name` | `String` | — | Display name |
| `role` | `Role` | `@default(EMPLOYEE)` | Access level: OWNER, TEAM_LEADER, EMPLOYEE |
| `avatarUrl` | `String?` | — | Optional profile picture URL |
| `phone` | `String?` | — | Optional phone number |
| `isActive` | `Boolean` | `@default(true)` | Soft-delete flag; false = deactivated |
| `teamId` | `String?` | — | Foreign key to team the user belongs to |
| `createdAt` | `DateTime` | `@default(now())` | Account creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

**Relations:**
- `team` → `Team` ("TeamMembers", optional) — the team this employee belongs to
- `teamLeadOf` → `Team` ("TeamLead", optional) — the team this user leads (if TEAM_LEADER)
- `timeEntries` → `TimeEntry[]` — all time entries made by this user
- `assignedSubTasks` → `SubTask[]` — subtasks assigned to this user
- `qcReports` → `QcReport[]` — QC reports submitted by this user (as team lead)
- `qcMistakes` → `QcMistake[]` — QC mistakes flagged against this user
- `accounts` → `Account[]` — NextAuth account records
- `sessions` → `Session[]` — NextAuth session records

### Team (`teams`)

Groups employees under a team leader for management purposes.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `name` | `String` | — | Team display name |
| `description` | `String?` | — | Optional team description |
| `teamLeadId` | `String?` | `@unique` | FK to the team's leader (must be unique — one team lead per team) |

**Relations:**
- `teamLead` → `User` ("TeamLead") — the user who leads this team
- `members` → `User[]` ("TeamMembers") — employees in this team
- `projectTeams` → `ProjectTeam[]` — join records linking teams to projects
- `qcReports` → `QcReport[]` — QC reports created for this team

### Project (`projects`)

A high-level unit of work that teams are assigned to.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `name` | `String` | — | Project name |
| `description` | `String?` | — | Optional description |
| `color` | `String` | `@default("#6C63FF")` | Color code for UI display |
| `status` | `ProjectStatus` | `@default(ACTIVE)` | Current project status |
| `estimatedHours` | `Float` | `@default(0)` | Estimated total hours |
| `startDate` | `DateTime` | `@default(now())` | Project start date |
| `endDate` | `DateTime?` | — | Optional project end date |

**Relations:**
- `subTasks` → `SubTask[]` — all subtasks under this project
- `timeEntries` → `TimeEntry[]` — time entries logged against this project
- `projectTeams` → `ProjectTeam[]` — teams assigned to this project

### ProjectTeam (`project_teams`)

Join table linking projects to teams (many-to-many).

| Field | Type | Attributes | Description |
|---|---|---|---|
| `projectId` | `String` | — | FK to Project (part of composite PK) |
| `teamId` | `String` | — | FK to Team (part of composite PK) |
| `assignedAt` | `DateTime` | `@default(now())` | When the team was assigned |

**Relations:**
- `project` → `Project`
- `team` → `Team`

### SubTask (`sub_tasks`)

Granular work items within a project, assignable to individual employees.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `name` | `String` | — | Subtask name/title |
| `description` | `String?` | — | Optional detailed description |
| `status` | `SubTaskStatus` | `@default(TODO)` | Current status (TODO/IN_PROGRESS/DONE) |
| `estimatedHours` | `Float?` | — | Optional estimated effort |
| `assignedToId` | `String?` | — | FK to User this subtask is assigned to |
| `projectId` | `String` | — | FK to parent Project |

**Relations:**
- `project` → `Project` — the parent project
- `assignedTo` → `User` ("assignedSubTasks") — the employee assigned to this
- `timeEntries` → `TimeEntry[]` — time entries logged against this subtask

### TimeEntry (`time_entries`)

Records a single work session (check-in to check-out).

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `userId` | `String` | — | FK to User who logged the time |
| `projectId` | `String` | — | FK to Project worked on |
| `subTaskId` | `String` | — | FK to SubTask worked on |
| `checkInAt` | `DateTime` | — | When the session started |
| `checkOutAt` | `DateTime?` | — | When the session ended (null = active) |
| `durationMinutes` | `Int?` | — | Computed duration on checkout |
| `notes` | `String?` | — | Optional notes (pre-check-in or at checkout) |

**Relations:**
- `user` → `User` ("timeEntries")
- `project` → `Project` ("timeEntries")
- `subTask` → `SubTask` ("timeEntries")

### QcReport (`qc_reports`)

A daily quality control report submitted by a team leader.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `teamId` | `String` | — | FK to Team being reviewed |
| `teamLeadId` | `String` | — | FK to User (team leader) who submitted |
| `date` | `DateTime` | — | Report date |
| `summary` | `String` | — | Overall summary of the day's work |

**Relations:**
- `team` → `Team` ("qcReports")
- `teamLead` → `User` ("qcReports")
- `mistakes` → `QcMistake[]` — individual mistakes flagged in this report

### QcMistake (`qc_mistakes`)

An individual mistake/issue flagged against an employee in a QC report.

| Field | Type | Attributes | Description |
|---|---|---|---|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `qcReportId` | `String` | — | FK to parent QcReport |
| `employeeId` | `String` | — | FK to User (employee who made the mistake) |
| `description` | `String` | — | Description of the mistake |

**Relations:**
- `qcReport` → `QcReport` ("mistakes")
- `employee` → `User` ("qcMistakes")

### Account, Session, VerificationToken

Standard NextAuth models for database session management (PrismaAdapter).

## 4.3 Important Schema Notes

- **Cascade deletes**: Not explicitly configured on most relations (some operations are manually blocked in API routes — e.g., deleting a team that has projects, or deleting a subtask with time entries)
- **Soft-delete for users**: Employees are deactivated via `isActive = false`, not actually deleted
- **Soft-delete for projects**: Projects are archived via `status = ARCHIVED`, not actually deleted
- **Time entries are immutable**: Once checked out, time entries are not modified (no update endpoint exists)

---

# PART 5: API REFERENCE (COMPLETE)

## 5.1 Authentication

### NextAuth Handler
- **Route**: `/api/auth/[...nextauth]`
- **Methods**: GET, POST
- **Auth**: Public
- **Description**: Handles all NextAuth flows. Credentials provider validates email + password against bcrypt hash. On success, JWT is created with `id` and `role`.
- **Query parameters**: `callbackUrl` (for redirect after login)

## 5.2 Dashboard

### GET /api/dashboard/overview
- **Auth**: OWNER only
- **Description**: Returns aggregate dashboard data for the overview page
- **Response shape**:
  - `kpis`: totalEmployees, activeToday, activeProjects, totalTeams, totalQcReports, totalHours, weeklyChange
  - `projectHealth`: Array of { name, status, hoursLogged, estimatedHours, percentage }
  - `recentActivity`: Array of { id, user: { name, avatarUrl }, project: { name }, action, timestamp, duration }
  - `weeklyChartData`: Array of { date, hours } (last 7 days)

### GET /api/dashboard/live
- **Auth**: OWNER only
- **Description**: Returns currently active (checked-in) employees
- **Response**: Array of { id, user: { id, name, avatarUrl, role }, project: { id, name, color }, subTask: { id, name }, checkInAt, duration }

## 5.3 Employees

### GET /api/employees
- **Auth**: OWNER, TEAM_LEADER
- **Query params**: `teamId` (filter by team), `isActive` (default true), `search` (name/email search)
- **Response**: Array of employee objects with id, name, email, role, isActive, team (id, name), createdAt, _count (timeEntries)

### POST /api/employees
- **Auth**: OWNER
- **Body**: { name, email, password, role, teamId? }
- **Response**: Created employee object
- **Behavior**: Generates password hash with bcryptjs (12 rounds)

### GET /api/employees/[id]
- **Auth**: OWNER
- **Response**: Full employee detail with stats:
  - Employee base info
  - `stats`: todayHours, weekHours, monthHours, totalHours, projectBreakdown (array of { name, color, hours, percentage }), recentEntries (last 10), qcFlags (count)
  - `timeline`: Array of { date, totalHours, entries }

### PATCH /api/employees/[id]
- **Auth**: OWNER
- **Body**: Partial update fields (name, email, role, teamId, isActive, phone, avatarUrl, password)
- **Behavior**: If password is provided, it's hashed with bcrypt before saving

### DELETE /api/employees/[id]
- **Auth**: OWNER
- **Behavior**: Soft-delete — sets `isActive = false`
- **Response**: Updated employee

## 5.4 Projects

### GET /api/projects
- **Auth**: Any authenticated
- **Behavior**: OWNER sees all projects. Employees/TL see only projects assigned to their team(s).
- **Query params**: `status` (filter by status), `search` (name search)
- **Response**: Array of projects with teams, subtask counts, time entry counts, total hours

### POST /api/projects
- **Auth**: OWNER
- **Body**: { name, description?, color?, estimatedHours?, startDate?, endDate?, teamIds? }
- **Behavior**: Creates project and optionally assigns teams via ProjectTeam join records

### GET /api/projects/[id]
- **Auth**: Any authenticated
- **Response**: Full project detail with:
  - Project info
  - `teams`: Array of { team: { id, name } }
  - `subTasks`: Array of full subtask objects with assignedTo info
  - `timeEntries`: Array of recent time entries with user info
  - `stats`: { totalHours, estimatedHours, progress }

### PATCH /api/projects/[id]
- **Auth**: OWNER
- **Body**: Partial update fields
- **Behavior**: Can update team assignments via teamIds array (replaces existing assignments)

### DELETE /api/projects/[id]
- **Auth**: OWNER
- **Behavior**: Archives project (sets status to ARCHIVED, does not delete)

## 5.5 Subtasks

### GET /api/projects/[id]/subtasks
- **Auth**: Any authenticated
- **Query params**: `all` (if "true", bypasses employee filter for non-owners)
- **Behavior**: OWNER/TL see all subtasks for the project. Employees see only subtasks assigned to them.

### POST /api/projects/[id]/subtasks
- **Auth**: OWNER, TEAM_LEADER
- **Body**: { name, description?, estimatedHours?, assignedToId? }

### PATCH /api/subtasks/[id]
- **Auth**: Any authenticated
- **Body**: { status?, name?, description?, estimatedHours? }
- **Behavior**: Scoped by role — employees can only update status to DONE on their own assigned subtasks

### DELETE /api/subtasks/[id]
- **Auth**: OWNER
- **Behavior**: Blocks deletion if the subtask has any time entries (409 Conflict)

## 5.6 Time Entries

### GET /api/time-entries
- **Auth**: Any authenticated
- **Behavior**: Employees see only their own entries. OWNER/TL see entries filtered by query params.
- **Query params**: `userId`, `projectId`, `from`, `to`, `subTaskId`
- **Response**: Array of time entries with user, project, subtask relations

### POST /api/time-entries
- **Auth**: Any authenticated
- **Body**: { projectId, subTaskId?, notes?, action: "checkin" | "checkout" }
- **Behavior**:
  - `checkin`: Creates a new TimeEntry with checkInAt=now, checkOutAt=null. If the subtask status is TODO, auto-transitions to IN_PROGRESS. Rejects if user already has an active session (409).
  - `checkout`: Updates the active TimeEntry with checkOutAt=now, calculates durationMinutes. Body also accepts { markDone?: boolean } to auto-set subtask to DONE.

### GET /api/time-entries/active
- **Auth**: Any authenticated
- **Behavior**: Returns the current user's active session (entry with checkOutAt=null), or null if none.

## 5.7 Teams

### GET /api/teams
- **Auth**: OWNER
- **Response**: Array of teams with member count, member list, project count

### POST /api/teams
- **Auth**: OWNER
- **Body**: { name, description?, memberIds?, teamLeadId? }
- **Behavior**: Creates team and assigns members (updates their teamId)

### PATCH /api/teams/[id]
- **Auth**: OWNER
- **Body**: { name?, description?, memberIds?, teamLeadId? }
- **Behavior**: Updates team fields and reassigns members

### DELETE /api/teams/[id]
- **Auth**: OWNER
- **Behavior**: Blocks deletion if the team has any projects assigned (409 Conflict)

## 5.8 Quality Control

### GET /api/qc/reports
- **Auth**: OWNER, TEAM_LEADER
- **Query params**: `teamId` (filter)
- **Behavior**: OWNER sees all. TL sees only their team's reports.

### POST /api/qc/reports
- **Auth**: OWNER, TEAM_LEADER
- **Body**: { teamId, date, summary, mistakes: Array<{ employeeId, description }> }
- **Behavior**: Creates QcReport with nested QcMistake records

### GET /api/qc/reports/[id]
- **Auth**: Any authenticated
- **Response**: Single QC report with mistakes and employee info

### GET /api/qc/mistakes
- **Auth**: Any authenticated
- **Behavior**: OWNER/TL see all. Employees see only mistakes flagged against themselves.

## 5.9 Reports

### GET /api/reports
- **Auth**: OWNER
- **Query params**: `from`, `to`, `groupBy` (employee | project | subtask)
- **Response**: Aggregated time report data
  - `dateRange`: { from, to }
  - `data`: Array varying by groupBy:
    - employee: { name, hours, entries, projects (breakdown) }
    - project: { name, color, hours, entries, teams (breakdown) }
    - subtask: { name, project, hours, entries }
  - `dailyHeatmap`: Array of { date, hours } for the date range

## 5.10 API Response Convention

All API routes use the following pattern from `lib/api-utils.ts`:

```typescript
// Success
return NextResponse.json({ data: ... }, { status: 200 });

// Error
return NextResponse.json({ error: "message" }, { status: 4xx });
```

Helper functions:
- `requireAuth()` — extracts session or throws 401
- `requireRole(role)` — checks role or throws 403
- `getAuthSession()` — returns current session
- `successResponse(data, status?)` — standardized success
- `errorResponse(message, status)` — standardized error

---

# PART 6: BUSINESS LOGIC & WORKFLOWS

## 6.1 Authentication & Session Flow

```
1. User visits /login
2. Enters email + password
3. POST /api/auth/callback/credentials
4. NextAuth looks up user by email in DB
5. Compares password with bcryptjs.compare()
6. If match: JWT created with { id, email, name, role, picture }
7. signIn callback redirects based on role:
   - OWNER → /dashboard
   - EMPLOYEE or TEAM_LEADER → /employee
8. On every request: middleware (proxy.ts) checks session
   - Unauthenticated → redirect to /login
   - Owner trying /employee → redirect to /dashboard
   - Employee/TL trying /dashboard → redirect to /employee
```

## 6.2 Check-In / Check-Out Flow (Time Tracking)

```
CHECK-IN:
1. Employee navigates to /employee home
2. System checks for active session via GET /api/time-entries/active
3. If no active session, employee selects:
   a. A project (from their team's assigned projects)
   b. A subtask under that project (optional but recommended)
   c. Notes (optional)
4. POST /api/time-entries { action: "checkin", projectId, subTaskId, notes }
5. System creates TimeEntry with checkInAt = now(), checkOutAt = null
6. If subtask status was "TODO", auto-update to "IN_PROGRESS"
7. UI starts showing live timer, refetches every 30s

CHECK-OUT:
1. Employee clicks "Check Out" on active session
2. Optional: marks subtask as DONE, adds checkout notes
3. POST /api/time-entries { action: "checkout", notes, markDone }
4. System updates active TimeEntry:
   - checkOutAt = now()
   - durationMinutes = (checkOut - checkIn) in minutes
   - Updates notes if provided
5. If markDone: updates subtask status to "DONE"
6. If user is TEAM_LEADER: QC report modal appears
7. UI refreshes to show completed entry

DOUBLE CHECK-IN PREVENTION:
- Before creating a check-in, system queries for existing active entries
- If found, returns 409 Conflict with "You already have an active session"
```

## 6.3 QC Report Submission Flow

```
1. TEAM_LEADER checks out from a time session
2. QC modal dialog appears automatically
3. Team leader fills in:
   a. Date (default: today)
   b. Summary of the day's work
   c. For each team member with issues: employee name + mistake description
4. POST /api/qc/reports { teamId, date, summary, mistakes: [{ employeeId, description }] }
5. Report is saved; mistakes are linked to the respective employees
6. Owner can view all QC reports in /dashboard/qc
7. Employee can view their own flags in /employee/qc-flags
```

## 6.4 Employee Lifecycle

```
CREATION (Owner):
1. Owner fills create employee form: name, email, password, role, team
2. POST /api/employees
3. Password is bcrypt-hashed and stored
4. Employee appears in the system

DEACTIVATION (Owner):
1. Owner clicks delete on an employee
2. DELETE /api/employees/[id] → sets isActive = false
3. Employee cannot log in (though not explicitly enforced at login — the middleware proxy checks only for session existence, not isActive status)
4. Employee's historical data is preserved

PROFILE UPDATE (Employee):
1. Employee navigates to /employee/profile
2. Can update: name, phone, avatarUrl
3. Can change password (requires current password verification)
```

## 6.5 Team & Project Assignment Logic

```
TEAM CREATION:
1. Owner creates team with name, description
2. Selects team leader from employees (must not already be leading another team — unique constraint)
3. Selects members from employee list
4. POST /api/teams → creates Team, updates each member's teamId

PROJECT CREATION:
1. Owner creates project with name, description, color, estimated hours
2. Selects one or more teams to assign
3. POST /api/projects → creates Project + ProjectTeam records

VISIBILITY:
- Employees see only projects linked to their team via ProjectTeam
- Employee home page shows "My Projects" filtered by their team
- Team leader sees all projects their team is assigned to
- Owner sees all projects

SUBTASK ASSIGNMENT:
- Team leader or Owner creates subtask under a project
- Assigns to a specific employee (must belong to a team assigned to that project)
- Employee sees tasks in "My Tasks" on home page
- Employee can mark assigned subtasks as DONE

TEAM LEADER PERMISSIONS:
- Can create subtasks in projects their team is assigned to
- Can update any subtask status for their team members
- Can submit QC reports for their team
- Can view team members' time entries
- CANNOT create/modify projects (owner only)
- CANNOT create/modify teams (owner only)
- CANNOT create/modify employees (owner only)
```

## 6.6 Data Visibility & Scoping Rules

| Resource | Owner | Team Leader | Employee |
|---|---|---|---|
| All employees | Full list | Only team members | Only self |
| All projects | Full list | Team's projects | Team's projects |
| All teams | Full list | Own team | Own team |
| Time entries | All (filterable) | Team members' | Only own |
| Subtasks | All | Team's projects | Only assigned |
| QC reports | All | Own team's | Own flags only |
| Dashboard | Full | N/A | N/A |
| Live activity | All | Team members' | N/A |

## 6.7 Reporting & Analytics Logic

The reporting engine at `/api/reports` aggregates time entries with the following logic:

```
1. Accepts from/to date range (defaults to current month)
2. Accepts groupBy parameter: employee | project | subtask
3. Queries TimeEntry with relations, filtered by date range
4. Groups entries by the specified dimension
5. For each group:
   - Sums durationMinutes → total hours
   - Counts entries
   - For employee grouping: adds project breakdown (hours per project)
   - For project grouping: adds team breakdown (hours per team)
6. Also generates dailyHeatmap: hours grouped by date for the range
```

Dashboard overview (`/api/dashboard/overview`) computes:
- **KPIs**: Total employees, active today (distinct users with entries today), active projects (non-archived), total teams, total QC reports, total hours (all time), weekly change (hours this week vs last week)
- **Project health**: For each active project, compares hoursLogged vs estimatedHours to compute percentage
- **Recent activity**: Last 10 time entries across all users
- **Weekly chart data**: Hours per day for the last 7 days

## 6.8 CSV Export

On the employee history page (`/employee/history`), users can export their time entries as CSV. The export is implemented client-side — it formats the filtered time entries as comma-separated values and triggers a browser download. No server-side CSV generation endpoint exists.

---

# PART 7: FRONTEND COMPONENT ARCHITECTURE

## 7.1 Providers Hierarchy

```
RootLayout (app/layout.tsx)
  └── Providers (components/Providers.tsx)
      ├── SessionProvider (NextAuth) — wraps entire app
      ├── QueryClientProvider (TanStack React Query) — data fetching
      └── Toaster (sonner) — toast notifications
          └── {children} (page content)
```

## 7.2 Page Component Architecture

Every page follows this pattern:
```
"use client" directive
imports (React, next-auth, react-query, custom components)
Page component function
  ├── useSession() — get auth state
  ├── useQuery() / useMutation() — data fetching
  ├── State hooks for UI (useState, useEffect)
  └── JSX with Tailwind classes + shadcn components
export default PageComponent
```

## 7.3 Shared Components Design

### DataTable (`components/shared/DataTable.tsx`)
- **Props**: columns (array of { key, label, sortable, render? }), data, searchable (boolean), searchKeys (string[]), pageSize (default 10)
- **Features**:
  - Sortable columns (click header to toggle asc/desc)
  - Search filtering across specified keys
  - Pagination with page numbers
  - Empty state delegation to EmptyState component
- **Rendering**: Uses shadcn Table primitives, renders custom cell content via column.render callback

### StatCard (`components/shared/StatCard.tsx`)
- **Props**: title, value, icon (ReactNode), description?, trend? (object with value and isUp boolean)
- **Features**:
  - Displays icon with colored background
  - Main value in large text
  - Optional trend indicator (arrow up/down with color)

### ConfirmDialog (`components/shared/ConfirmDialog.tsx`)
- **Props**: open, onOpenChange, onConfirm, title, description, variant ("default" | "destructive"), confirmText, cancelText
- **Features**:
  - Uses shadcn AlertDialog primitives
  - Destructive variant shows red confirm button
  - Generic for reuse across delete operations

### ProgressBar (`components/shared/ProgressBar.tsx`)
- **Props**: value (0-100), label?, size ("sm" | "md" | "lg")
- **Features**:
  - Color based on value: green (< 80%), amber (80-100%), red (> 100%)
  - Smooth transition animation

### EmptyState (`components/shared/EmptyState.tsx`)
- **Props**: icon (ReactNode), title, description, action? ({ label, onClick })
- **Features**:
  - Centered layout with muted styling
  - Optional action button

## 7.4 Layout Components

### EmployeeSidebar (`components/layout/EmployeeSidebar.tsx`)
- Fixed left sidebar (w-64)
- Navigation links with icons:
  - Home (`/employee`)
  - My Time (`/employee/time`)
  - History (`/employee/history`)
  - QC Flags (`/employee/qc-flags`)
  - Team Tasks (`/employee/team-tasks`) — only for TEAM_LEADER role
  - Profile (`/employee/profile`)
- Bottom section: user info (name, email) + Logout button
- Active route highlighting

### OwnerSidebar (`components/layout/OwnerSidebar.tsx`)
- Fixed left sidebar (w-64)
- Navigation links with icons:
  - Overview (`/dashboard`)
  - Projects (`/dashboard/projects`)
  - Employees (`/dashboard/employees`)
  - Teams (`/dashboard/teams`)
  - QC Reports (`/dashboard/qc`)
  - Live Activity (`/dashboard/live`)
  - Reports (`/dashboard/reports`)
- Bottom section: user info + Logout button
- Active route highlighting

## 7.5 Page Component Details

### Login Page (`app/(auth)/login/page.tsx`)
- Simple centered card layout
- Email + password form fields
- Submit calls `signIn("credentials", { email, password, redirect: true, callbackUrl })`
- Error display for invalid credentials
- No registration (owner creates accounts)

### Employee Home (`app/(employee)/employee/page.tsx`)
- **Top section**: Active session card (if checked in) with:
  - Project name, subtask name
  - Live timer (updates every second client-side)
  - Check Out button
- **If not checked in**: Check-in form with:
  - Project dropdown (filtered to user's team projects)
  - Subtask dropdown (filtered by selected project)
  - Notes textarea
  - Check In button
- **Project cards**: Grid of "My Projects" with name, description, color, progress
- **My Tasks section**: List of assigned subtasks with status badges
- **Refetch interval**: Active session refetches every 30 seconds

### Employee Time Page (`app/(employee)/employee/time/page.tsx`)
- **Today's entries**: Table of today's time entries with project, subtask, duration
- **Weekly chart**: Bar chart using recharts showing hours per day (current week)
- **Stats**: Total hours today, this week

### Employee History (`app/(employee)/employee/history/page.tsx`)
- **Date range picker**: From/To date inputs
- **Entries table**: Filterable by date range, sortable DataTable
- **CSV Export button**: Generates and downloads CSV of filtered entries
- **Delete**: Option to delete individual entries (likely not functional — no delete API for time entries)

### Employee Profile (`app/(employee)/employee/profile/page.tsx`)
- **Display**: Current name, email, phone, avatar
- **Edit form**: Name, phone, avatar URL
- **Change password**: Current password + new password + confirm
- **Save**: PATCH request with form data

### Employee QC Flags (`app/(employee)/employee/qc-flags/page.tsx`)
- Table of QC mistakes flagged against the current employee
- Columns: Date, Report summary, Mistake description, Team lead name
- Fetched from `/api/qc/mistakes`

### Team Tasks (`app/(employee)/employee/team-tasks/page.tsx`)
- **TEAM_LEADER only** access (redirects employees)
- Shows team members and their assigned subtasks
- Allows assigning/unassigning subtasks
- Drag-and-drop or select-based task management

### Owner Dashboard (`app/(owner)/dashboard/page.tsx`)
- **KPI Cards row**: StatCard for each KPI
- **Project Health**: ProgressBar for each active project
- **Weekly Activity Chart**: Stacked bar chart (recharts) showing hours per day
- **Recent Activity**: Latest time entries feed

### Owner Employees (`app/(owner)/dashboard/employees/page.tsx`)
- **Search bar**: Filter by name/email
- **Team filter**: Dropdown to filter by team
- **Create button**: Opens dialog with create employee form
- **Employee cards/table**: Name, email, role, team, status, actions

### Owner Employee Detail (`app/(owner)/dashboard/employees/[id]/page.tsx`)
- **Tabs**: Stats, Time Log, QC Flags
- **Stats tab**: Today/week/month hours, project breakdown chart, timeline
- **Time Log tab**: Filterable time entries table
- **QC Flags tab**: QC mistakes against this employee

### Owner Projects (`app/(owner)/dashboard/projects/page.tsx`)
- **View toggle**: Grid view / List view
- **Status filter**: Filter by project status
- **Create button**: Opens dialog with create project form
- **Project cards**: Name, status badge, team names, progress bar

### Owner Project Detail (`app/(owner)/dashboard/projects/[id]/page.tsx`)
- **Sections**: Info, Subtasks, Team, Time Log, Stats
- **Subtasks**: CRUD table with assignment
- **Team**: Shows assigned teams with member count
- **Time Log**: Time entries for this project

### Owner Teams (`app/(owner)/dashboard/teams/page.tsx`)
- **Team cards**: Name, description, team lead, member count
- **Create button**: Opens dialog
- **Edit/Delete**: Actions per team card
- **Member management**: Add/remove members

### Owner QC Reports (`app/(owner)/dashboard/qc/page.tsx`)
- **Team filter**: Filter reports by team
- **Reports table**: Date, team, team lead, summary, mistake count
- **Detail view**: Click to see full report with mistakes list

### Owner Live Activity (`app/(owner)/dashboard/live/page.tsx`)
- **Live feed**: Cards for each currently checked-in employee
- **Info**: Employee name, project, subtask, time elapsed
- **Refetch**: Every 30 seconds
- **Auto-scroll**: New check-ins appear at top

### Owner Reports (`app/(owner)/dashboard/reports/page.tsx`)
- **Date range**: Preset buttons (Today, This Week, This Month, Last Month) + Custom range
- **Group by**: Selector (Employee, Project, Subtask)
- **Charts**: Bar chart showing hours by selected dimension
- **Heatmap**: Daily hours heatmap for the range
- **Data table**: Detailed breakdown below charts

---

# PART 8: FORM VALIDATION SCHEMAS (ZOD)

All validation schemas are defined in `lib/validations/index.ts`:

```typescript
// Employee Creation
createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(Role).optional().default(Role.EMPLOYEE),
  teamId: z.string().optional(),
})

// Employee Update
updateEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  role: z.nativeEnum(Role).optional(),
  teamId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

// Team Creation
createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional().default([]),
  teamLeadId: z.string().optional(),
})

// Team Update
updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  memberIds: z.array(z.string()).optional(),
  teamLeadId: z.string().nullable().optional(),
})

// Project Creation
createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  color: z.string().optional().default("#6C63FF"),
  estimatedHours: z.number().positive().optional().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  teamIds: z.array(z.string()).optional().default([]),
})

// Project Update
updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  estimatedHours: z.number().positive().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  teamIds: z.array(z.string()).optional(),
})

// Subtask Creation
createSubTaskSchema = z.object({
  name: z.string().min(1, "Subtask name is required"),
  description: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  assignedToId: z.string().optional(),
})

// Subtask Update
updateSubTaskSchema = z.object({
  status: z.nativeEnum(SubTaskStatus).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  estimatedHours: z.number().positive().nullable().optional(),
})

// Time Entry (check-in/check-out)
timeEntrySchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  subTaskId: z.string().optional(),
  notes: z.string().optional(),
  action: z.enum(["checkin", "checkout"]),
})

// Checkout (additional fields)
checkoutSchema = z.object({
  notes: z.string().optional(),
  markDone: z.boolean().optional(),
})

// QC Report
createQcReportSchema = z.object({
  teamId: z.string().min(1),
  date: z.string().min(1),
  summary: z.string().min(1, "Summary is required"),
  mistakes: z.array(z.object({
    employeeId: z.string().min(1),
    description: z.string().min(1, "Mistake description is required"),
  })).optional().default([]),
})

// Password Change
changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})
```

---

# PART 9: SEED DATA

The seed script at `prisma/seed.ts` creates a fully functional demo environment:

### Users Created

| Name | Email | Password | Role | Team |
|---|---|---|---|---|
| Owner | owner@workpulse.com | Admin@1234 | OWNER | — |
| Maya Johnson | maya@workpulse.com | Pass@1234 | TEAM_LEADER | Design Team |
| James Chen | james@workpulse.com | Pass@1234 | TEAM_LEADER | Engineering |
| Sarah Wilson | sarah@workpulse.com | Pass@1234 | EMPLOYEE | Design Team |
| Alex Thompson | alex@workpulse.com | Pass@1234 | EMPLOYEE | Design Team |
| Priya Patel | priya@workpulse.com | Pass@1234 | EMPLOYEE | Engineering |

### Teams

| Team | Team Lead | Members |
|---|---|---|
| Design Team | Maya Johnson | Sarah Wilson, Alex Thompson |
| Engineering | James Chen | Priya Patel |

### Projects

| Project | Color | Assigned Teams |
|---|---|---|
| Website Redesign | #6C63FF (purple) | Design Team |
| Mobile App v2 | #FF6B6B (red) | Engineering |
| Internal Analytics Dashboard | #4ECDC4 (teal) | Design Team, Engineering |

### Subtasks (11 total)

Pre-assigned to specific employees, with varying statuses (TODO, IN_PROGRESS, DONE).

### Time Entries (~90+)

Historical time entries spanning the last 30 days, providing realistic data for reports and charts. One active session: Priya is currently checked in.

---

# PART 10: AUTHENTICATION & AUTHORIZATION (DEEP DIVE)

## 10.1 NextAuth Configuration (`lib/auth.ts`)

```typescript
- Adapter: PrismaAdapter (database sessions)
- Session strategy: "jwt" (no database sessions)
- Provider: Credentials
  - authorize(): looks up user by email, compares password with bcryptjs.compare()
  - Returns user object or null
- Callbacks:
  - jwt({ token, user }): if user exists, adds token.id = user.id, token.role = user.role
  - session({ session, token }): adds session.user.id = token.id, session.user.role = token.role
  - signIn({ user }): redirects based on user.role (OWNER → /dashboard, else → /employee)
- Pages: signIn: "/login"
- Secret: from NEXTAUTH_SECRET env var
```

## 10.2 Route Protection Middleware (`proxy.ts`)

The `proxy.ts` file in the root exports a `proxy` function (not a standard Next.js `middleware` export). It is likely intended to be connected as middleware but is not currently wired up. It checks:

1. If request path matches `/login`, `/employee/*`, or `/dashboard/*`
2. If no token (unauthenticated), redirect to `/login`
3. If token exists, check role:
   - Owner (`role === "OWNER"`) accessing `/employee/*` → redirect to `/dashboard`
   - Employee/TL accessing `/dashboard/*` → redirect to `/employee`
   - Otherwise, allow through

## 10.3 API-Level Authorization (`lib/api-utils.ts`)

Every API route imports these helpers:

```typescript
// Get current session, throws 401 if not authenticated
export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user?.id) throw new AuthError("Unauthorized");
  return session;
}

// Check user has required role, throws 403 if not
export async function requireRole(role: Role) {
  const session = await requireAuth();
  if (session.user.role !== role) throw new AuthError("Forbidden");
}

// Get session without throwing
export async function getAuthSession() {
  const session = await auth();
  return session;
}
```

Usage pattern in routes:
```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(); // or requireRole("OWNER")
    // ... route logic
    return successResponse(data);
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(error.message, error.status);
    }
    return errorResponse("Internal Server Error", 500);
  }
}
```

---

# PART 11: DATA FLOW & ARCHITECTURE

## 11.1 Request Lifecycle

```
1. Browser → Next.js App Router
2. Middleware (proxy.ts — if connected) checks authentication
3. Page component renders (always client-side)
4. On mount: React Query triggers API call
5. Fetch → Next.js API Route handler
6. requireAuth() / requireRole() — authentication check
7. Zod validation of request body/query
8. Prisma query to PostgreSQL
9. Response formatted via successResponse()
10. React Query caches, re-renders component
```

## 11.2 Data Fetching Pattern

All data fetching uses TanStack React Query:

```typescript
// Query
const { data, isLoading } = useQuery({
  queryKey: ["employees", { teamId, search }],
  queryFn: async () => {
    const res = await fetch(`/api/employees?teamId=...&search=...`);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  },
});

// Mutation
const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create");
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    toast.success("Employee created");
  },
});
```

## 11.3 State Management Philosophy

- **Server state**: TanStack React Query (caching, background refetching, optimistic updates)
- **Auth state**: NextAuth SessionProvider (React context)
- **Client state**: React useState/useEffect (no Zustand or Redux used despite Zustand being installed)
- **Form state**: React Hook Form with Zod resolvers

## 11.4 Key Architecture Decisions

1. **All client-side rendering**: Every page uses `"use client"`. No server components, no SSR, no SSG. This simplifies the architecture but sacrifices some SEO and initial load performance.

2. **No API client abstraction**: API calls use raw `fetch()` directly in components. No Axios, no tRPC, no custom API client wrapper.

3. **No separate backend**: Everything is Next.js API routes. No Express, Fastify, or other backend framework.

4. **Monorepo-lite**: Single Next.js app in a `workpulse/` subdirectory inside the git repo root. No workspaces, no packages.

5. **No caching layer**: No Redis, no in-memory cache beyond React Query's default behavior.

6. **No queuing or background jobs**: Everything is synchronous request-response.

---

# PART 12: ENVIRONMENT & CONFIGURATION

## 12.1 Environment Variables (`.env`)

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/workpulse?schema=public
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated-secret>
```

## 12.2 Package.json Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "seed": "npx tsx prisma/seed.ts",
  "postinstall": "npx prisma generate"
}
```

## 12.3 Prisma Commands (for development)

- `npx prisma generate` — Regenerate Prisma client after schema changes
- `npx prisma db push` — Push schema to database without migration
- `npx prisma migrate dev` — Create and apply a new migration
- `npx prisma studio` — Open Prisma Studio (GUI database browser)
- `npx prisma db seed` — Run the seed script

## 12.4 TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

# PART 13: GIT HISTORY

The project has 5 commits:

```
1. Initial commit — Project setup with Next.js + Prisma + auth
2. Add caching and token security improvements — Security hardening
3. Maybe this should work better? — Bug fixes and improvements
4. Try again — More fixes
5. actually production ready — Final MVP state
```

---

# PART 14: KNOWN ISSUES & LIMITATIONS

1. **No middleware**: `proxy.ts` is not properly configured as Next.js middleware (exports `proxy` instead of `middleware`, and is not registered in config).

2. **No tests**: Zero test coverage for any part of the application.

3. **No error boundaries**: No React error boundaries anywhere in the component tree.

4. **No loading states for pages**: Client components don't have Suspense boundaries or loading.tsx files.

5. **All client-side**: No server components, which means larger bundle sizes and no SSR benefits.

6. **No API client**: Raw `fetch()` calls scattered throughout components with repetitive error handling.

7. **No pagination on API side**: Some list endpoints (like time entries) could return large datasets without pagination support.

8. **Inactive user login**: Deactivated employees (isActive=false) can still log in — the auth flow does not check `isActive`.

9. **No rate limiting**: API routes have no rate limiting or brute-force protection.

10. **No audit logging**: No record of who did what and when.

11. **No file upload**: Avatar URLs are text fields, not actual file upload endpoints.

12. **Hardcoded dark mode**: Light mode is not supported.

13. **Zustand unused**: Dependency installed but not used anywhere.

14. **Empty directories**: `components/dashboard/`, `components/employee/`, `components/projects/`, `hooks/` exist but are empty.

---

# PART 15: FILE INVENTORY (COMPLETE)

### Root Level (inside `workpulse/`)
| # | File | Lines | Purpose |
|---|---|---|---|
| 1 | `.env` | 3 | Local environment variables |
| 2 | `.env.example` | 3 | Template for env vars |
| 3 | `.gitignore` | 38 | Git ignore rules |
| 4 | `AGENTS.md` | 26 | AI agent instructions (Next.js v16 caveats) |
| 5 | `CLAUDE.md` | 3 | Points to AGENTS.md |
| 6 | `README.md` | 25 | Auto-generated Next.js README |
| 7 | `components.json` | 25 | shadcn/ui configuration |
| 8 | `eslint.config.mjs` | 22 | ESLint flat config |
| 9 | `next.config.ts` | 7 | Next.js configuration |
| 10 | `next-env.d.ts` | 0 | TypeScript declarations |
| 11 | `package.json` | 54 | Dependencies and scripts |
| 12 | `package-lock.json` | — | Lockfile |
| 13 | `postcss.config.mjs` | 6 | PostCSS configuration |
| 14 | `proxy.ts` | 81 | Middleware stub (not connected) |
| 15 | `tsconfig.json` | 28 | TypeScript configuration |
| 16 | `tsconfig.tsbuildinfo` | — | Build info |

### app/ Directory
| # | File | Lines | Purpose |
|---|---|---|---|
| 17 | `app/layout.tsx` | 37 | Root layout (Providers wrapper) |
| 18 | `app/page.tsx` | 9 | Redirect to /login |
| 19 | `app/globals.css` | 95 | Global styles, Tailwind v4 |
| 20 | `app/favicon.ico` | — | Favicon |
| 21 | `app/(auth)/login/page.tsx` | 97 | Login page |
| 22 | `app/(employee)/employee/layout.tsx` | 48 | Employee layout with sidebar |
| 23 | `app/(employee)/employee/page.tsx` | 336 | Employee home (check-in/out) |
| 24 | `app/(employee)/employee/history/page.tsx` | 197 | Time entry history |
| 25 | `app/(employee)/employee/profile/page.tsx` | 167 | Profile editing |
| 26 | `app/(employee)/employee/qc-flags/page.tsx` | 107 | View QC flags |
| 27 | `app/(employee)/employee/team-tasks/page.tsx` | 242 | Team task management (TL) |
| 28 | `app/(employee)/employee/time/page.tsx` | 193 | Daily/weekly time tracking |
| 29 | `app/(owner)/dashboard/layout.tsx` | 48 | Dashboard layout with sidebar |
| 30 | `app/(owner)/dashboard/page.tsx` | 171 | Dashboard overview |
| 31 | `app/(owner)/dashboard/employees/page.tsx` | 356 | Employee list |
| 32 | `app/(owner)/dashboard/employees/[id]/page.tsx` | 377 | Employee detail |
| 33 | `app/(owner)/dashboard/live/page.tsx` | 113 | Live activity feed |
| 34 | `app/(owner)/dashboard/projects/page.tsx` | 241 | Project list |
| 35 | `app/(owner)/dashboard/projects/[id]/page.tsx` | 267 | Project detail |
| 36 | `app/(owner)/dashboard/qc/page.tsx` | 189 | QC reports viewer |
| 37 | `app/(owner)/dashboard/reports/page.tsx` | 282 | Analytics reports |
| 38 | `app/(owner)/dashboard/teams/page.tsx` | 273 | Team management |
| 39 | `app/api/auth/[...nextauth]/route.ts` | 6 | NextAuth handler |
| 40 | `app/api/dashboard/live/route.ts` | 47 | Live activity data |
| 41 | `app/api/dashboard/overview/route.ts` | 129 | Dashboard KPIs |
| 42 | `app/api/employees/route.ts` | 85 | List/create employees |
| 43 | `app/api/employees/[id]/route.ts` | 114 | Single employee CRUD |
| 44 | `app/api/projects/route.ts` | 71 | List/create projects |
| 45 | `app/api/projects/[id]/route.ts` | 105 | Single project CRUD |
| 46 | `app/api/projects/[id]/subtasks/route.ts` | 67 | Project subtasks |
| 47 | `app/api/qc/mistakes/route.ts` | 35 | QC mistakes endpoint |
| 48 | `app/api/qc/reports/route.ts` | 76 | QC reports CRUD |
| 49 | `app/api/qc/reports/[id]/route.ts` | 40 | Single QC report |
| 50 | `app/api/reports/route.ts` | 96 | Aggregated reports |
| 51 | `app/api/subtasks/[id]/route.ts` | 57 | Single subtask CRUD |
| 52 | `app/api/teams/route.ts` | 57 | List/create teams |
| 53 | `app/api/teams/[id]/route.ts` | 83 | Single team CRUD |
| 54 | `app/api/time-entries/route.ts` | 107 | Time entries CRUD |
| 55 | `app/api/time-entries/active/route.ts` | 29 | Active session |

### Components Directory
| # | File | Lines | Purpose |
|---|---|---|---|
| 56 | `components/Providers.tsx` | 35 | Providers wrapper |
| 57 | `components/layout/EmployeeSidebar.tsx` | 120 | Employee navigation |
| 58 | `components/layout/OwnerSidebar.tsx` | 112 | Owner navigation |
| 59 | `components/shared/ConfirmDialog.tsx` | 63 | Confirmation modal |
| 60 | `components/shared/DataTable.tsx` | 145 | Generic data table |
| 61 | `components/shared/EmptyState.tsx` | 38 | Empty state placeholder |
| 62 | `components/shared/ProgressBar.tsx` | 48 | Progress indicator |
| 63 | `components/shared/StatCard.tsx` | 81 | KPI stat card |

### UI Components (22 files)
| # | File | Lines | Purpose |
|---|---|---|---|
| 64 | `components/ui/alert-dialog.tsx` | 117 | Alert dialog |
| 65 | `components/ui/avatar.tsx` | 52 | Avatar |
| 66 | `components/ui/badge.tsx` | 30 | Badge |
| 67 | `components/ui/button.tsx` | 53 | Button |
| 68 | `components/ui/card.tsx` | 90 | Card |
| 69 | `components/ui/checkbox.tsx` | 28 | Checkbox |
| 70 | `components/ui/command.tsx` | 168 | Command |
| 71 | `components/ui/dialog.tsx` | 102 | Dialog |
| 72 | `components/ui/dropdown-menu.tsx` | 185 | Dropdown menu |
| 73 | `components/ui/input-group.tsx` | 31 | Input group |
| 74 | `components/ui/input.tsx` | 29 | Input |
| 75 | `components/ui/label.tsx` | 18 | Label |
| 76 | `components/ui/popover.tsx` | 16 | Popover |
| 77 | `components/ui/select.tsx` | 140 | Select |
| 78 | `components/ui/separator.tsx` | 9 | Separator |
| 79 | `components/ui/sheet.tsx` | 133 | Sheet |
| 80 | `components/ui/skeleton.tsx` | 18 | Skeleton |
| 81 | `components/ui/sonner.tsx` | 11 | Sonner toaster |
| 82 | `components/ui/table.tsx` | 107 | Table |
| 83 | `components/ui/tabs.tsx` | 57 | Tabs |
| 84 | `components/ui/textarea.tsx` | 22 | Textarea |
| 85 | `components/ui/tooltip.tsx` | 35 | Tooltip |

### Library Files
| # | File | Lines | Purpose |
|---|---|---|---|
| 86 | `lib/api-utils.ts` | 75 | API utilities |
| 87 | `lib/auth.ts` | 73 | NextAuth config |
| 88 | `lib/prisma.ts` | 13 | Prisma client singleton |
| 89 | `lib/utils.ts` | 60 | General utilities |
| 90 | `lib/validations/index.ts` | 131 | Zod schemas |

### Type Definitions
| # | File | Lines | Purpose |
|---|---|---|---|
| 91 | `types/index.ts` | 26 | API response types |
| 92 | `types/next-auth.d.ts` | 16 | NextAuth type augmentation |

### Prisma
| # | File | Lines | Purpose |
|---|---|---|---|
| 93 | `prisma/schema.prisma` | 133 | Database schema |
| 94 | `prisma/seed.ts` | 275 | Seed script |
| 95 | `prisma/prisma.config.ts` | 6 | Prisma config |
| 96 | `prisma/migration_lock.toml` | 3 | Migration lock |

**Total: ~96 source/configuration files** (excluding node_modules, .next, lockfile).

---

# PART 16: SETUP & RUN INSTRUCTIONS

## Prerequisites
- Node.js ^20+
- PostgreSQL database running locally or remotely
- npm

## Setup Steps

```bash
# 1. Navigate to project directory
cd workpulse

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, NEXTAUTH_SECRET

# 4. Run database migrations
npx prisma migrate dev

# 5. Seed the database with demo data
npm run seed

# 6. Start development server
npm run dev

# 7. Open http://localhost:3000
# Default login: owner@workpulse.com / Admin@1234
```

---

# PART 17: CODE CONVENTIONS & STYLE

## Naming Conventions
- **Files**: kebab-case (e.g., `time-entries`, `api-utils.ts`)
- **Components**: PascalCase (e.g., `DataTable`, `ConfirmDialog`)
- **Functions**: camelCase (e.g., `requireAuth`, `formatDuration`)
- **Variables**: camelCase
- **API routes**: kebab-case with `[param]` for dynamic segments
- **Database models**: PascalCase (Prisma convention)
- **Database fields**: camelCase (Prisma convention)

## Code Style
- 2-space indentation
- Semicolons required
- Single quotes for strings (Prettier/ESLint default)
- Tailwind classes for styling (no CSS modules or styled-components)
- TypeScript strict mode enabled
- No comments in code generally (except AI agent instructions)
- All pages use `"use client"` directive

## Import Order (observed convention)
1. React/Next.js imports
2. Third-party library imports
3. Local component imports (`@/components/...`)
4. Utility imports (`@/lib/...`)
5. Type imports (`@/types/...`)

---

# PART 18: SECURITY CONSIDERATIONS

## Current Security Measures
- Passwords hashed with bcryptjs (12 rounds)
- JWT-based authentication (7-day expiry)
- Role-based access control at API level
- Input validation with Zod on all API routes
- No exposure of password hashes in API responses
- Session validation on every API request

## Security Gaps
- No rate limiting on login endpoint (brute force vulnerability)
- No CSRF protection (inherent in API routes, but worth noting)
- No XSS protection headers configured
- No HTTPS enforcement in config
- No environment variable validation at startup
- Deactivated users can still log in
- No audit logging for security events
- No password strength requirements beyond 6 characters
- No account lockout after failed attempts

---

# PART 19: POTENTIAL FUTURE ENHANCEMENTS

1. **Server-side rendering** for initial page load performance
2. **Testing suite** (Vitest/Jest for unit, Playwright for E2E)
3. **File upload** for avatars and attachments
4. **Email notifications** for QC flags, task assignments
5. **Push notifications** for real-time updates
6. **Mobile-responsive design** (currently desktop-only)
7. **Light mode support**
8. **Time zone support** for distributed teams
9. **OAuth providers** (Google, GitHub, etc.)
10. **API pagination** for large datasets
11. **WebSocket/Socket.IO** for real-time live activity
12. **Export to PDF/XLSX** in addition to CSV
13. **Dashboard customization** (drag-and-drop widgets)
14. **Automated time tracking** with idle detection
15. **Screenshot/monitoring** for remote work verification
16. **Timesheet approval workflow** (manager approval required)
17. **Billing/invoicing** based on tracked hours
18. **Integration APIs** (Slack, Jira, Asana, Trello)
19. **Role hierarchy improvements** (custom roles, granular permissions)
20. **Multi-workspace/tenancy** for multiple organizations
