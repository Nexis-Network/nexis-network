# Nexis Cloud Console - Production Roadmap

This document outlines the roadmap to make the Nexis Cloud Console 100% production-ready and feature-packed.

## Phase 1: Foundation & Authentication

- [x] **Project Setup**
  - [x] Configure absolute imports (`@/*`) in `tsconfig.json`.
  - [x] Set up SEO metadata and favicon/OpenGraph images.
  - [x] Configure `next-themes` for Dark/Light mode support.
  - [x] Set up globally structured Error Boundary and 404 pages.
- [x] **Authentication (NextAuth.js / Supabase Auth / Privy)**
  - [x] Implement Sign-Up/Login (Email, GitHub, Google).
  - [x] **Web3 Login**: Implement Wallet Connect (Metamask/Rhinestone) for Dstack interactions.
  - [x] Implement Protected Routes (Middleware to redirect unauthenticated users).
  - [x] User Profile Management (Avatar, Name, Email updates).
- [x] **Layout & Navigation**
  - [x] Create a responsive AppShell (Sidebar, Topbar).
  - [x] Implement Breadcrumbs for deep navigation.
  - [x] Add User Dropdown (Profile, Settings, Logout).

## Phase 2: Core Compute (CVM) Management

- [x] **Dashboard Home**
  - [x] Overview cards: Total CVMs, Active Agents, Monthly Cost, Health Status.
  - [x] Recent Activity Log.
- [x] **CVM Instances List**
  - [x] Data Table with sorting/filtering (Name, IP, Status, Region, Spec).
  - [x] Status indicators (Running, Stopped, Provisioning, Error).
  - [x] Server-side pagination (page + page_size).
- [x] **Deploy CVM Wizard**
  - [x] **Step 1: Image Selection** (Ubuntu, AI Agent Templates, Phala Base).
  - [x] **Step 2: Configuration** (vCPU, RAM, Disk Size).
  - [x] **Step 3: Network & Security** (SSH Keys, Ports).
  - [x] **Step 4: Review & Deploy**.
- [x] **Instance Details Page**
  - [x] Real-time status polling (SSE).
  - [x] **Console/Logs View**: Streaming logs from the instance.
  - [x] **Metrics Charts**: CPU, Memory, Disk usage.
  - [x] **Control Panel**: Start, Stop, Reboot, Terminate actions.
  - [x] SSH Connection string copy helper.

## Phase 3: AI Agent Integration (Nexis Specific)

- [x] **Agent Registry**
  - [x] Browse vetted AI Agent templates.
  - [x] "One-click Deploy" for popular agents.
- [x] **Agent Management**
  - [x] Configuration UI for Agent env vars (Model API keys, Prompts).
  - [x] Knowledge Base upload (Drag & drop files for RAG context).
- [x] **Interactive Test Chat**
  - [x] Built-in Chat UI to interact with deployed agents.
  - [x] Debug mode specifically for Agent logs/thought traces.

## Phase 4: Billing & Settings

- [x] **Billing System**
  - [x] Stripe / Crypto Payment Gateway integration.
  - [x] Usage Dashboard (Cost over time).
  - [x] Invoices list & PDF download.
  - [x] Credit Balance top-up.
- [x] **API Access**
  - [x] Generate/Revoke API Keys for CLI usage.
  - [x] API Usage statistics.
- [x] **Team Management** (Enterprise)
  - [x] Invite members via email.
  - [x] Role-based access control (Admin, Viewer, Editor).

## Phase 5: Production Hardening

- [x] **Observability**
  - [x] Integrate Sentry for frontend error tracking.
  - [x] Integrate Analytics (PostHog / Plausible) for user behavior.
- [x] **Performance**
  - [x] Optimization of image assets and fonts.
  - [x] Route pre-fetching and lazy loading of heavy components.
- [x] **Compliance & Security**
  - [x] GDPR/Privacy Policy footer.
  - [x] Terms of Service.
  - [x] Security Headers configuration (CSP).

## Integrations

- [ ] **Dstack SDK**: Direct integration for attestation verification.
- [ ] **CLI Sync**: Ensure Console actions reflect instantly in CLI and vice versa.
