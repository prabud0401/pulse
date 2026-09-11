# Pulse — Complete Master Blueprint

> **Self-contained document.** Any agent in any conversation can pick this up and execute.  
> **Project location:** `c:\Users\prabu\Desktop\OS\pulse`  
> **Product:** Pulse — The Heartbeat of Your Professional & Personal Life  
> **License:** AGPL-3.0 | **Model:** Open-source core + paid cloud hosting

---

## Table of Contents

1. [Current State (What's Built)](#current-state)
2. [Architecture & Tech Stack](#architecture)
3. [Phase 1: Foundation & Auth](#phase-1) ← PARTIALLY DONE
4. [Phase 2: MCP Hub & Plugin System](#phase-2)
5. [Phase 3: Smart Dashboard & Notifications](#phase-3)
6. [Phase 4: Finance Manager](#phase-4)
7. [Phase 5: AI Assistant & Task Manager](#phase-5)
8. [Phase 6: Automation Engine & Polish](#phase-6)
9. [Database Schema Reference](#db-schema)
10. [API Route Reference](#api-routes)
11. [Design System Reference](#design-system)

---

## Current State (What's Built) {#current-state}

**97 files created** across the monorepo. Phase 1 is ~80% code-complete, needs install/typecheck/fixes.

### File Inventory

```
pulse/                              # Root
├── package.json                    # ✅ Turborepo workspace root
├── pnpm-workspace.yaml             # ✅ packages/* + apps/*
├── turbo.json                      # ✅ build/dev/lint/typecheck/test pipelines
├── tsconfig.base.json              # ✅ ES2022, NodeNext, strict
├── .gitignore                      # ✅ 
├── .env.example                    # ✅ DATABASE_URL, JWT secrets, OAuth, AI keys
├── LICENSE                         # ✅ AGPL-3.0
├── README.md                       # ✅ Quick start guide
│
├── docker/
│   ├── docker-compose.yml          # ✅ PostgreSQL 16 + Redis 7
│   └── Dockerfile                  # ✅ Multi-stage Node build
│
├── packages/core/                  # ✅ @pulse/core — shared types & errors
│   ├── src/types/index.ts          # User, Session, Workspace, ApiResponse, etc.
│   ├── src/errors.ts               # AppError, NotFoundError, UnauthorizedError, etc.
│   ├── src/utils/index.ts          # generateId, slugify, formatDate
│   └── src/index.ts                # Re-exports
│
├── packages/db/                    # ✅ @pulse/db — Drizzle ORM
│   ├── drizzle.config.ts           # Drizzle Kit config
│   ├── src/connection.ts           # PostgreSQL connection (postgres-js driver)
│   ├── src/schema/users.ts         # users table + relations
│   ├── src/schema/sessions.ts      # sessions table + relations
│   ├── src/schema/oauth-accounts.ts # oauth_accounts table
│   ├── src/schema/workspaces.ts    # workspaces + workspace_members tables
│   ├── src/schema/user-settings.ts # user_settings table
│   ├── src/schema/index.ts         # Re-exports all schemas
│   └── src/index.ts                # Re-exports db + schemas
│
├── packages/auth/                  # ✅ @pulse/auth — JWT auth
│   ├── src/password.ts             # bcryptjs hash/verify
│   ├── src/jwt.ts                  # generateAccessToken, generateRefreshToken, verify
│   ├── src/session.ts              # createSession, refreshSession, revokeSession
│   ├── src/auth-service.ts         # register, login, getCurrentUser, changePassword
│   └── src/index.ts                # Re-exports
│
├── packages/api/                   # ✅ @pulse/api — Express REST server
│   ├── src/server.ts               # Express app with middleware stack
│   ├── src/middleware/auth.ts       # requireAuth, optionalAuth middleware
│   ├── src/middleware/error-handler.ts
│   ├── src/middleware/validate.ts
│   ├── src/routes/health.ts        # GET /api/health
│   ├── src/routes/auth.ts          # register, login, refresh, logout, me
│   ├── src/routes/users.ts         # GET/PATCH /api/users/me
│   ├── src/routes/workspaces.ts    # CRUD workspaces + members
│   └── src/index.ts
│
├── packages/ui/                    # ⬜ Placeholder only
├── packages/config/                # ⬜ Placeholder only
│
├── apps/web/                       # ✅ @pulse/web — Next.js 15
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   ├── src/app/globals.css          # Tailwind v4 + design system CSS vars
│   ├── src/app/layout.tsx           # Root layout
│   ├── src/app/page.tsx             # Landing redirect
│   ├── src/app/providers.tsx        # QueryClient + Theme providers
│   ├── src/app/(auth)/layout.tsx    # Auth centered layout
│   ├── src/app/(auth)/login/page.tsx
│   ├── src/app/(auth)/register/page.tsx
│   ├── src/app/(dashboard)/layout.tsx    # Sidebar + topbar
│   ├── src/app/(dashboard)/dashboard/page.tsx
│   ├── src/app/(dashboard)/settings/page.tsx
│   ├── src/components/ui/button.tsx
│   ├── src/components/ui/input.tsx
│   ├── src/components/ui/card.tsx
│   ├── src/components/ui/avatar.tsx
│   ├── src/components/ui/badge.tsx
│   ├── src/components/ui/sidebar.tsx
│   ├── src/components/ui/theme-toggle.tsx
│   ├── src/hooks/use-auth.ts
│   ├── src/lib/api-client.ts
│   ├── src/lib/auth.ts
│   ├── src/lib/utils.ts             # cn() helper
│   ├── src/store/theme.ts
│   └── src/store/sidebar.ts
│
└── apps/mobile/                    # ✅ @pulse/mobile — Expo 57
    ├── app.json
    ├── tsconfig.json
    ├── app/_layout.tsx              # Root Stack with auth check
    ├── app/(auth)/login.tsx         # Dark fintech login
    ├── app/(auth)/register.tsx
    ├── app/(tabs)/_layout.tsx       # 5-tab navigator
    ├── app/(tabs)/index.tsx         # Home dashboard
    ├── app/(tabs)/finance.tsx       # Finance placeholder
    ├── app/(tabs)/assistant.tsx     # AI placeholder
    ├── app/(tabs)/tasks.tsx         # Tasks placeholder
    ├── app/(tabs)/more.tsx          # Settings & More
    ├── src/api/client.ts            # Fetch wrapper + SecureStore auth
    ├── src/api/auth.ts              # login, register, logout
    ├── src/components/ui/Button.tsx
    ├── src/components/ui/Input.tsx
    ├── src/components/ui/Card.tsx
    ├── src/components/ui/ScreenContainer.tsx
    ├── src/store/auth.ts            # Zustand auth store
    ├── src/theme/colors.ts
    └── src/theme/typography.ts
```

### What's Remaining in Phase 1

- [ ] Run `pnpm install` successfully (fix any version conflicts)
- [ ] Run `pnpm typecheck` — fix all TS errors across monorepo
- [ ] Verify `docker compose up` starts PostgreSQL + Redis
- [ ] Verify API server starts: `pnpm --filter @pulse/api dev`
- [ ] Verify web app starts: `pnpm --filter @pulse/web dev`
- [ ] Git init + initial commit on `main` branch
- [ ] Push to GitHub: `github.com/prabud0401/pulse`

---

## Architecture & Tech Stack {#architecture}

| Layer | Technology | Version |
|-------|-----------|---------|
| **Monorepo** | Turborepo + pnpm | Turbo 2.x, pnpm 9.x |
| **Language** | TypeScript strict | 5.6+ |
| **Runtime** | Node.js | 20+ |
| **API** | Express | 4.x |
| **Database** | PostgreSQL | 16 |
| **ORM** | Drizzle ORM | Latest |
| **Cache** | Redis (Valkey) | 7 |
| **Web** | Next.js 15 (App Router) | 15.x |
| **Web Styling** | Tailwind CSS v4 | 4.x |
| **Mobile** | Expo SDK 57 + Expo Router | 57.x |
| **Mobile Styling** | React Native StyleSheet | (custom design tokens) |
| **Auth** | Custom JWT (bcryptjs + jsonwebtoken) | — |
| **Server State** | TanStack Query v5 | 5.x |
| **Client State** | Zustand | 5.x |
| **AI** | @google/generative-ai, openai, @anthropic-ai/sdk | Latest |
| **MCP** | @modelcontextprotocol/sdk | Latest |
| **Deployment** | Docker Compose (self-hosted) | — |

### Monorepo Dependency Graph

```
@pulse/core        ← no internal deps (types, errors, utils)
@pulse/db          ← depends on @pulse/core
@pulse/auth        ← depends on @pulse/core, @pulse/db
@pulse/api         ← depends on @pulse/core, @pulse/db, @pulse/auth
@pulse/web         ← depends on nothing (API calls over HTTP)
@pulse/mobile      ← depends on nothing (API calls over HTTP)
```

---

## Phase 1: Foundation & Auth (Week 1-2) {#phase-1}

> **Status: ~80% code-complete. Needs install, typecheck, fixes.**

See [Current State](#current-state) for full file listing.

### Remaining Work

1. **Fix `pnpm install`** — resolve any peer dependency conflicts
2. **Fix TypeScript** — run `pnpm typecheck`, fix all errors
3. **Test API** — start Docker, start API, test endpoints with curl:
   ```bash
   # Start infra
   cd docker && docker compose up -d
   
   # Start API
   pnpm --filter @pulse/api dev
   
   # Test
   curl http://localhost:4000/api/health
   curl -X POST http://localhost:4000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@pulse.dev","password":"test1234","name":"Test"}'
   ```
4. **Test Web** — `pnpm --filter @pulse/web dev`, open `http://localhost:3000`
5. **Git init** — commit everything, push to GitHub

---

## Phase 2: MCP Hub & Plugin System (Week 3-4) {#phase-2}

> **Goal:** Let users connect any MCP server and manage integrations from the dashboard.

### New Database Tables

```sql
-- Connected integrations per workspace
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,           -- 'mcp_remote', 'mcp_stdio', 'oauth', 'api_key', 'webhook'
  category VARCHAR(50) NOT NULL,       -- 'communication', 'finance', 'productivity', 'dev-tools', 'custom'
  icon VARCHAR(255),
  config JSONB NOT NULL DEFAULT '{}',  -- { url, apiKey, headers, binaryPath, args }
  status VARCHAR(20) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  last_health_check TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Available tools from connected MCP servers
CREATE TABLE integration_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  input_schema JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tool invocation logs
CREATE TABLE tool_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  tool_name VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  input JSONB,
  output JSONB,
  status VARCHAR(20) NOT NULL,  -- 'success', 'error', 'timeout'
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### New Files to Create

```
packages/core/src/types/plugins.ts       # Plugin & integration TypeScript interfaces
packages/core/src/types/mcp.ts           # MCP-specific types

packages/db/src/schema/integrations.ts   # integrations + integration_tools tables
packages/db/src/schema/tool-invocations.ts

packages/api/src/routes/integrations.ts  # CRUD integrations + tool invocations
packages/api/src/services/mcp-gateway.ts # Connect to MCP servers, discover tools, proxy calls
packages/api/src/services/mcp-client.ts  # SSE/HTTP MCP client wrapper

apps/web/src/app/(dashboard)/integrations/page.tsx          # Integration grid
apps/web/src/app/(dashboard)/integrations/connect/page.tsx  # Add new integration form
apps/web/src/app/(dashboard)/integrations/[id]/page.tsx     # Manage integration + tools
apps/web/src/components/integrations/integration-card.tsx
apps/web/src/components/integrations/tool-list.tsx
apps/web/src/components/integrations/connect-form.tsx

apps/mobile/app/(tabs)/integrations.tsx  # Or add to More tab
apps/mobile/src/modules/integrations/IntegrationCard.tsx
```

### Key TypeScript Interfaces

```typescript
// packages/core/src/types/plugins.ts
export interface PulsePlugin {
  id: string;
  name: string;
  icon: string;
  category: 'communication' | 'finance' | 'productivity' | 'dev-tools' | 'custom';
  type: 'mcp_remote' | 'mcp_stdio' | 'oauth' | 'api_key' | 'webhook';
  
  connect(config: PluginConfig): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  
  getTools(): Promise<ToolDefinition[]>;
  invokeTool(name: string, input: Record<string, unknown>): Promise<unknown>;
  
  getWidgets?(): DashboardWidget[];
  getActions?(): AutomationAction[];
  getTriggers?(): AutomationTrigger[];
}

export interface PluginConfig {
  url?: string;          // For remote MCP
  apiKey?: string;       // For API key auth
  headers?: Record<string, string>;
  binaryPath?: string;   // For stdio MCP
  args?: string[];
  oauth?: { clientId: string; clientSecret: string; scopes: string[] };
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;  // JSON Schema
}

export interface ConnectionResult {
  success: boolean;
  tools?: ToolDefinition[];
  error?: string;
}
```

### API Routes

```
POST   /api/integrations                   # Add integration to workspace
GET    /api/integrations                   # List workspace integrations
GET    /api/integrations/:id               # Get integration details + tools
PATCH  /api/integrations/:id               # Update config
DELETE /api/integrations/:id               # Remove integration
POST   /api/integrations/:id/connect       # Test connection + discover tools
POST   /api/integrations/:id/disconnect    # Disconnect
GET    /api/integrations/:id/tools         # List available tools
POST   /api/integrations/:id/tools/:name   # Invoke a tool
GET    /api/integrations/:id/logs          # Tool invocation history
```

### MCP Gateway Logic (`mcp-gateway.ts`)

```typescript
// 1. User provides MCP server URL
// 2. Gateway connects via SSE transport
// 3. Calls listTools() to discover available tools
// 4. Stores tool metadata in integration_tools table
// 5. When user invokes a tool:
//    a. Validate input against tool's JSON schema
//    b. Forward to MCP server via callTool()
//    c. Log invocation in tool_invocations table
//    d. Return result

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export class MCPGateway {
  async connect(url: string): Promise<{ tools: ToolDefinition[] }> { ... }
  async invokeTool(integrationId: string, toolName: string, input: unknown): Promise<unknown> { ... }
  async healthCheck(integrationId: string): Promise<HealthStatus> { ... }
  async disconnect(integrationId: string): Promise<void> { ... }
}
```

---

## Phase 3: Smart Dashboard & Notifications (Week 5-7) {#phase-3}

> **Goal:** Configurable widget dashboard + unified notification center.

### New Database Tables

```sql
-- Dashboard layouts per user per workspace
CREATE TABLE dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) DEFAULT 'Default',
  layout JSONB NOT NULL DEFAULT '[]',  -- Array of widget positions
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, workspace_id, name)
);

-- Widget configurations
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID REFERENCES dashboard_layouts(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,       -- 'stat', 'chart', 'list', 'calendar', 'feed', 'custom'
  title VARCHAR(255) NOT NULL,
  data_source VARCHAR(255),        -- 'finance.summary', 'tasks.count', 'integration:<id>.tool:<name>'
  config JSONB DEFAULT '{}',       -- Widget-specific settings
  position JSONB NOT NULL,         -- { x, y, w, h } grid position
  refresh_interval INTEGER,        -- Seconds (null = manual only)
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,     -- 'system', 'finance', 'tasks', 'integration:<id>'
  type VARCHAR(50) NOT NULL,       -- 'info', 'success', 'warning', 'error', 'action'
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',         -- Payload for deep linking
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Push device tokens (for mobile push notifications)
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,      -- Expo push token
  platform VARCHAR(10) NOT NULL,   -- 'ios', 'android', 'web'
  device_name VARCHAR(255),
  last_used_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### New Files

```
packages/core/src/types/dashboard.ts     # Widget, Layout, Notification types
packages/db/src/schema/dashboard.ts      # dashboard_layouts, dashboard_widgets
packages/db/src/schema/notifications.ts  # notifications, device_tokens

packages/api/src/routes/dashboard.ts     # Layout CRUD, widget CRUD
packages/api/src/routes/notifications.ts # List, mark read, push registration
packages/api/src/services/notification-service.ts  # Push via Expo, WebSocket broadcast
packages/api/src/services/websocket.ts   # WebSocket server for real-time updates

apps/web/src/app/(dashboard)/dashboard/page.tsx    # REWRITE: configurable widget grid
apps/web/src/components/dashboard/widget-grid.tsx
apps/web/src/components/dashboard/widget-renderer.tsx
apps/web/src/components/dashboard/stat-widget.tsx
apps/web/src/components/dashboard/chart-widget.tsx
apps/web/src/components/dashboard/list-widget.tsx
apps/web/src/components/dashboard/add-widget-modal.tsx
apps/web/src/components/notifications/notification-bell.tsx
apps/web/src/components/notifications/notification-panel.tsx

apps/mobile/app/(tabs)/index.tsx         # REWRITE: widget-based home
apps/mobile/src/modules/dashboard/WidgetCard.tsx
apps/mobile/src/modules/notifications/NotificationBell.tsx
```

### API Routes

```
GET    /api/dashboard/layouts              # Get user's layouts for workspace
POST   /api/dashboard/layouts              # Create layout
PATCH  /api/dashboard/layouts/:id          # Update layout (reorder widgets)
DELETE /api/dashboard/layouts/:id
POST   /api/dashboard/widgets              # Add widget to layout
PATCH  /api/dashboard/widgets/:id          # Update widget config
DELETE /api/dashboard/widgets/:id
GET    /api/dashboard/widgets/:id/data     # Fetch widget data from source

GET    /api/notifications                  # List (paginated, filterable)
PATCH  /api/notifications/:id/read        # Mark as read
POST   /api/notifications/read-all        # Mark all as read
POST   /api/notifications/devices         # Register push token
DELETE /api/notifications/devices/:token   # Unregister

WebSocket: ws://localhost:4000/ws         # Real-time notifications + widget updates
```

---

## Phase 4: Finance Manager (Week 8-9) {#phase-4}

> **Goal:** Generalized multi-bank finance tracking. Port from Prabu Life OS, make user-configurable.

### New Database Tables

```sql
-- User's bank accounts
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  account_number VARCHAR(255),
  bank_name VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,       -- "Primary Savings", "Credit Card"
  account_type VARCHAR(50) NOT NULL, -- 'savings', 'checking', 'credit_card', 'wallet', 'investment'
  currency VARCHAR(3) DEFAULT 'USD',
  holder_name VARCHAR(255),
  ingestion_source VARCHAR(255),     -- "SMS", "Email", "PDF", "API"
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Financial transactions (generalized ledger)
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES bank_accounts(id),
  type VARCHAR(50) NOT NULL,          -- See classification types below
  category VARCHAR(100),              -- User-defined or auto-classified
  direction VARCHAR(10) NOT NULL,     -- 'credit' | 'debit'
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  counterparty VARCHAR(255),
  reference_id VARCHAR(255),          -- Dedup key
  source VARCHAR(50) NOT NULL,        -- 'sms', 'email', 'pdf', 'manual', 'api', 'csv'
  raw_data JSONB,                     -- Original SMS/email/PDF text
  classified_by VARCHAR(20),          -- 'auto' | 'user' | 'ai'
  transaction_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, reference_id)
);

-- Classification rules (user-configurable)
CREATE TABLE classification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  priority INTEGER DEFAULT 0,         -- Higher = checked first
  conditions JSONB NOT NULL,           -- { field, operator, value } conditions
  result_type VARCHAR(50) NOT NULL,    -- Transaction type to assign
  result_category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  period VARCHAR(20) DEFAULT 'monthly', -- 'weekly', 'monthly', 'yearly'
  start_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, category, period)
);

-- SMS parser templates (so users can define their bank's format)
CREATE TABLE sms_parser_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,  -- NULL = global template
  bank_name VARCHAR(255) NOT NULL,
  sender_ids TEXT[] NOT NULL,           -- ['PEOPLESBANK', 'PB-ALERT']
  patterns JSONB NOT NULL,              -- Regex patterns for credit/debit/balance
  currency VARCHAR(3) DEFAULT 'USD',
  country VARCHAR(2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### Transaction Types (Classification)

```typescript
export type TransactionType =
  | 'SALARY_INCOME'
  | 'FREELANCE_INCOME'
  | 'INVESTMENT_INCOME'
  | 'PERSONAL_LIVING_EXPENSE'
  | 'INTERNAL_TRANSFER'
  | 'CARD_REPAYMENT'
  | 'CARD_POS_SPEND'
  | 'BANKING_FEE'
  | 'BROKER_INWARD'
  | 'BROKER_OUTWARD'
  | 'LOAN_GIVEN'
  | 'LOAN_RECEIVED'
  | 'LOAN_REPAYMENT'
  | 'ATM_WITHDRAWAL'
  | 'SUBSCRIPTION'
  | 'UTILITY_BILL'
  | 'TRANSPORT'
  | 'UNCATEGORIZED';
```

### New Files

```
packages/core/src/types/finance.ts       # All finance TypeScript interfaces
packages/core/src/finance/classifier.ts  # Rule-based transaction classifier
packages/core/src/finance/scenarios.ts   # Base/Happy/Worst scenario engine
packages/core/src/finance/parsers/sms.ts # SMS parser (configurable templates)
packages/core/src/finance/parsers/email.ts
packages/core/src/finance/parsers/csv.ts # CSV import parser
packages/core/src/finance/report.ts      # Monthly/yearly report generator

packages/db/src/schema/bank-accounts.ts
packages/db/src/schema/financial-transactions.ts
packages/db/src/schema/classification-rules.ts
packages/db/src/schema/budgets.ts
packages/db/src/schema/sms-parser-templates.ts

packages/api/src/routes/finance.ts        # Summary, sync, reports
packages/api/src/routes/accounts.ts       # Bank account CRUD
packages/api/src/routes/transactions.ts   # Ledger CRUD + search + filter
packages/api/src/routes/budgets.ts        # Budget CRUD
packages/api/src/routes/ingest.ts         # POST SMS, email, CSV, PDF ingest
packages/api/src/routes/classify.ts       # Classification rules CRUD

apps/web/src/app/(dashboard)/finance/page.tsx           # Finance overview
apps/web/src/app/(dashboard)/finance/accounts/page.tsx  # Bank accounts
apps/web/src/app/(dashboard)/finance/transactions/page.tsx  # Ledger
apps/web/src/app/(dashboard)/finance/reports/page.tsx   # Reports + scenarios
apps/web/src/app/(dashboard)/finance/budgets/page.tsx   # Budget tracker
apps/web/src/app/(dashboard)/finance/settings/page.tsx  # Rules, SMS templates
apps/web/src/components/finance/transaction-row.tsx
apps/web/src/components/finance/scenario-card.tsx
apps/web/src/components/finance/monthly-chart.tsx
apps/web/src/components/finance/category-filter.tsx
apps/web/src/components/finance/account-card.tsx
apps/web/src/components/finance/budget-bar.tsx

apps/mobile/app/(tabs)/finance.tsx       # REWRITE: full finance tab
apps/mobile/src/modules/finance/TransactionRow.tsx
apps/mobile/src/modules/finance/ScenarioCard.tsx
apps/mobile/src/modules/finance/AccountBadge.tsx
apps/mobile/src/modules/finance/CategoryFilter.tsx
apps/mobile/src/modules/sms/SmsListener.ts     # Android SMS listener
apps/mobile/src/modules/sms/SmsIngestor.ts      # Parse + POST to API
```

### API Routes

```
# Bank Accounts
POST   /api/finance/accounts               # Add bank account
GET    /api/finance/accounts               # List accounts
PATCH  /api/finance/accounts/:id
DELETE /api/finance/accounts/:id

# Transactions
GET    /api/finance/transactions           # Paginated, filter by type/category/date/account
POST   /api/finance/transactions           # Manual entry
PATCH  /api/finance/transactions/:id       # Re-classify
DELETE /api/finance/transactions/:id

# Ingestion
POST   /api/finance/ingest/sms            # { sender, text, receivedAt }
POST   /api/finance/ingest/email          # { subject, body, from, date }
POST   /api/finance/ingest/csv            # multipart/form-data CSV file
POST   /api/finance/ingest/pdf            # multipart/form-data PDF file

# Reports
GET    /api/finance/summary               # ?fromDate&toDate — totals + monthly breakdown
GET    /api/finance/report                 # Full reconciliation + scenarios
GET    /api/finance/insights              # AI-generated spending insights

# Budgets
POST   /api/finance/budgets
GET    /api/finance/budgets
PATCH  /api/finance/budgets/:id
DELETE /api/finance/budgets/:id

# Classification
GET    /api/finance/rules                 # List classification rules
POST   /api/finance/rules                 # Add rule
PATCH  /api/finance/rules/:id
DELETE /api/finance/rules/:id
POST   /api/finance/classify              # Classify a single transaction
```

---

## Phase 5: AI Assistant & Task Manager (Week 10-12) {#phase-5}

> **Goal:** Multi-model AI chat with live data context + built-in task management.

### New Database Tables

```sql
-- AI conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255),
  model VARCHAR(100),              -- 'gemini-2.5-flash', 'gpt-4o', 'claude-sonnet-4'
  system_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- AI messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) NOT NULL,       -- 'user', 'assistant', 'system', 'tool'
  content TEXT NOT NULL,
  tool_calls JSONB,                -- If assistant requested tool calls
  tool_results JSONB,              -- If this is a tool result message
  tokens_used INTEGER,
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- AI provider configs per workspace
CREATE TABLE ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  provider VARCHAR(50) NOT NULL,   -- 'gemini', 'openai', 'anthropic', 'ollama'
  api_key_encrypted TEXT,          -- Encrypted with workspace key
  base_url VARCHAR(255),           -- For Ollama or custom endpoints
  default_model VARCHAR(100),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, provider)
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7),                -- Hex color for UI
  icon VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'completed'
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,  -- Subtasks
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo',     -- 'todo', 'in_progress', 'done', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMP,
  tags TEXT[] DEFAULT '{}',
  position INTEGER DEFAULT 0,           -- For ordering within a list/column
  completed_at TIMESTAMP,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Task comments
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### New Files

```
# AI Engine
packages/core/src/ai/types.ts           # AIProvider, AIContext, Message interfaces
packages/core/src/ai/context-builder.ts  # Gather context from all data sources
packages/core/src/ai/providers/gemini.ts
packages/core/src/ai/providers/openai.ts
packages/core/src/ai/providers/anthropic.ts
packages/core/src/ai/providers/ollama.ts
packages/core/src/ai/providers/index.ts  # Provider factory
packages/core/src/ai/tool-executor.ts    # AI can call MCP tools

packages/db/src/schema/ai-conversations.ts
packages/db/src/schema/ai-providers.ts
packages/db/src/schema/projects.ts
packages/db/src/schema/tasks.ts
packages/db/src/schema/task-comments.ts

packages/api/src/routes/ai.ts            # Chat, conversations, providers
packages/api/src/routes/projects.ts      # Project CRUD
packages/api/src/routes/tasks.ts         # Task CRUD + search + filter
packages/api/src/routes/task-comments.ts
packages/api/src/services/ai-service.ts  # Orchestrate: context → model → response

# Web
apps/web/src/app/(dashboard)/assistant/page.tsx        # Chat UI
apps/web/src/app/(dashboard)/assistant/[id]/page.tsx   # Conversation view
apps/web/src/app/(dashboard)/tasks/page.tsx            # Kanban + list view
apps/web/src/app/(dashboard)/tasks/[id]/page.tsx       # Task detail
apps/web/src/app/(dashboard)/projects/page.tsx         # Projects list
apps/web/src/components/ai/chat-message.tsx
apps/web/src/components/ai/chat-input.tsx
apps/web/src/components/ai/suggested-prompts.tsx
apps/web/src/components/ai/provider-selector.tsx
apps/web/src/components/tasks/task-card.tsx
apps/web/src/components/tasks/kanban-board.tsx
apps/web/src/components/tasks/task-form.tsx

# Mobile
apps/mobile/app/(tabs)/assistant.tsx     # REWRITE: full chat UI
apps/mobile/app/(tabs)/tasks.tsx         # REWRITE: task list + search
apps/mobile/app/task-detail.tsx          # Task detail modal
apps/mobile/src/modules/assistant/ChatBubble.tsx
apps/mobile/src/modules/assistant/ChatInput.tsx
apps/mobile/src/modules/assistant/SuggestedChips.tsx
apps/mobile/src/modules/tasks/TaskCard.tsx
apps/mobile/src/modules/tasks/TaskForm.tsx
```

### API Routes

```
# AI
POST   /api/ai/chat                       # Send message, get streaming response
GET    /api/ai/conversations              # List conversations
POST   /api/ai/conversations              # Create conversation
GET    /api/ai/conversations/:id          # Get conversation with messages
DELETE /api/ai/conversations/:id
GET    /api/ai/providers                  # List configured providers
POST   /api/ai/providers                  # Add provider (save API key)
PATCH  /api/ai/providers/:id
DELETE /api/ai/providers/:id

# Projects
POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id

# Tasks
POST   /api/tasks
GET    /api/tasks                         # ?status&project&priority&assignee&search
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
PATCH  /api/tasks/:id/status              # Quick status change
POST   /api/tasks/:id/comments
GET    /api/tasks/:id/comments
GET    /api/tasks/search?q=              # Full-text search
```

### AI Context Builder

```typescript
// packages/core/src/ai/context-builder.ts
export async function buildContext(userId: string, workspaceId: string): Promise<AIContext> {
  const [financeSummary, recentTasks, notifications, integrations] = await Promise.all([
    getFinanceSummary(workspaceId),           // From finance module
    getRecentTasks(workspaceId, { limit: 10 }),
    getUnreadNotifications(userId, { limit: 5 }),
    getConnectedIntegrations(workspaceId),
  ]);

  return {
    financeSummary,
    recentTasks,
    notifications,
    connectedServices: integrations.map(i => i.name),
    currentDate: new Date().toISOString(),
  };
}
```

---

## Phase 6: Automation Engine & Polish (Week 13-16) {#phase-6}

> **Goal:** If-then automation rules + production hardening.

### New Database Tables

```sql
-- Automation rules
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL,    -- 'event', 'schedule', 'webhook'
  trigger_config JSONB NOT NULL,        -- { plugin, event, conditions } or { cron }
  actions JSONB NOT NULL,               -- [{ plugin, action, params }]
  is_enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  trigger_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Automation execution logs
CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) NOT NULL,         -- 'success', 'partial', 'error'
  trigger_data JSONB,
  action_results JSONB,                -- [{ action, status, result/error }]
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### New Files

```
packages/core/src/automation/types.ts      # Rule, Trigger, Action interfaces
packages/core/src/automation/engine.ts      # Rule evaluation engine
packages/core/src/automation/scheduler.ts   # Cron-based trigger scheduler
packages/core/src/automation/event-bus.ts   # Redis pub/sub event bus

packages/db/src/schema/automation-rules.ts
packages/db/src/schema/automation-logs.ts

packages/api/src/routes/automations.ts     # Rule CRUD + logs
packages/api/src/services/automation-runner.ts  # Execute rules
packages/api/src/services/event-emitter.ts      # Emit events from all modules

apps/web/src/app/(dashboard)/automations/page.tsx       # Rule list
apps/web/src/app/(dashboard)/automations/create/page.tsx # Visual rule builder
apps/web/src/app/(dashboard)/automations/[id]/page.tsx   # Rule detail + logs
apps/web/src/components/automations/trigger-picker.tsx
apps/web/src/components/automations/action-picker.tsx
apps/web/src/components/automations/condition-builder.tsx

apps/mobile/src/modules/automations/AutomationCard.tsx
```

### Built-in Automation Templates

```typescript
const TEMPLATES = [
  {
    name: 'Bank SMS → Classify → Notify',
    trigger: { type: 'event', plugin: 'finance', event: 'transaction.ingested' },
    actions: [
      { plugin: 'finance', action: 'classify', params: {} },
      { plugin: 'notifications', action: 'push', params: { title: 'New transaction: {{amount}}' } },
    ],
  },
  {
    name: 'Task Overdue → Email Reminder',
    trigger: { type: 'schedule', cron: '0 9 * * *' },  // Daily 9 AM
    actions: [
      { plugin: 'tasks', action: 'find_overdue', params: {} },
      { plugin: 'notifications', action: 'email', params: { template: 'overdue_tasks' } },
    ],
  },
  {
    name: 'Salary Received → Update Budget → Summary',
    trigger: { type: 'event', plugin: 'finance', event: 'salary.received' },
    actions: [
      { plugin: 'finance', action: 'update_budget', params: {} },
      { plugin: 'ai', action: 'generate_summary', params: {} },
      { plugin: 'notifications', action: 'push', params: { title: 'Salary received! Summary ready.' } },
    ],
  },
];
```

### Production Polish Checklist

```
[ ] Docker Compose: full stack (postgres + redis + api + web)
[ ] Dockerfile: multi-stage build for API + Web
[ ] CLI tool: `npx create-pulse` for self-hosted setup
[ ] Environment validation on startup
[ ] Graceful shutdown handling
[ ] Request logging with correlation IDs
[ ] API documentation (OpenAPI/Swagger)
[ ] Rate limiting per user (not just IP)
[ ] CSRF protection
[ ] Input sanitization
[ ] File upload limits + validation
[ ] Database connection pooling
[ ] Redis reconnection handling
[ ] Health check endpoints for all services
[ ] Metrics endpoint (/api/metrics)
[ ] Documentation site (Docusaurus at docs.pulse.dev)
[ ] Contributing guide (CONTRIBUTING.md)
[ ] Plugin development SDK + docs
[ ] Seed data for demo workspace
```

---

## Database Schema Reference (All Tables) {#db-schema}

| Phase | Table | Description |
|-------|-------|-------------|
| 1 | `users` | User accounts |
| 1 | `sessions` | Auth sessions + tokens |
| 1 | `oauth_accounts` | OAuth provider links |
| 1 | `workspaces` | Multi-tenant workspaces |
| 1 | `workspace_members` | Workspace membership + roles |
| 1 | `user_settings` | Key-value user preferences |
| 2 | `integrations` | Connected MCP servers + plugins |
| 2 | `integration_tools` | Discovered tools per integration |
| 2 | `tool_invocations` | Tool call history |
| 3 | `dashboard_layouts` | Widget layout per user |
| 3 | `dashboard_widgets` | Individual widget configs |
| 3 | `notifications` | Notification inbox |
| 3 | `device_tokens` | Push notification tokens |
| 4 | `bank_accounts` | Registered bank accounts |
| 4 | `financial_transactions` | Unified financial ledger |
| 4 | `classification_rules` | Auto-classify rules |
| 4 | `budgets` | Budget tracking |
| 4 | `sms_parser_templates` | Bank SMS regex patterns |
| 5 | `ai_conversations` | AI chat conversations |
| 5 | `ai_messages` | Chat messages |
| 5 | `ai_providers` | API keys per provider |
| 5 | `projects` | Project management |
| 5 | `tasks` | Tasks + subtasks |
| 5 | `task_comments` | Task comments |
| 6 | `automation_rules` | If-then automation rules |
| 6 | `automation_logs` | Execution history |

**Total: 22 tables across 6 phases.**

---

## API Route Reference (All Endpoints) {#api-routes}

| Phase | Method | Endpoint | Description |
|-------|--------|----------|-------------|
| 1 | GET | `/api/health` | Health check |
| 1 | POST | `/api/auth/register` | Register user |
| 1 | POST | `/api/auth/login` | Login |
| 1 | POST | `/api/auth/refresh` | Refresh token |
| 1 | POST | `/api/auth/logout` | Logout |
| 1 | GET | `/api/auth/me` | Current user |
| 1 | GET | `/api/users/me` | User profile |
| 1 | PATCH | `/api/users/me` | Update profile |
| 1 | PATCH | `/api/users/me/password` | Change password |
| 1 | POST | `/api/workspaces` | Create workspace |
| 1 | GET | `/api/workspaces` | List workspaces |
| 1 | GET | `/api/workspaces/:id` | Get workspace |
| 1 | PATCH | `/api/workspaces/:id` | Update workspace |
| 1 | POST | `/api/workspaces/:id/members` | Add member |
| 1 | GET | `/api/workspaces/:id/members` | List members |
| 2 | POST | `/api/integrations` | Add integration |
| 2 | GET | `/api/integrations` | List integrations |
| 2 | GET | `/api/integrations/:id` | Get integration |
| 2 | PATCH | `/api/integrations/:id` | Update |
| 2 | DELETE | `/api/integrations/:id` | Remove |
| 2 | POST | `/api/integrations/:id/connect` | Connect + discover |
| 2 | POST | `/api/integrations/:id/tools/:name` | Invoke tool |
| 3 | GET | `/api/dashboard/layouts` | Get layouts |
| 3 | POST | `/api/dashboard/layouts` | Create layout |
| 3 | POST | `/api/dashboard/widgets` | Add widget |
| 3 | GET | `/api/notifications` | List notifications |
| 3 | POST | `/api/notifications/devices` | Register push |
| 4 | POST | `/api/finance/accounts` | Add bank account |
| 4 | GET | `/api/finance/accounts` | List accounts |
| 4 | GET | `/api/finance/transactions` | Ledger |
| 4 | POST | `/api/finance/transactions` | Manual entry |
| 4 | POST | `/api/finance/ingest/sms` | SMS ingest |
| 4 | POST | `/api/finance/ingest/csv` | CSV import |
| 4 | GET | `/api/finance/summary` | Financial summary |
| 4 | GET | `/api/finance/report` | Full report + scenarios |
| 4 | POST | `/api/finance/budgets` | Create budget |
| 4 | GET | `/api/finance/rules` | List classification rules |
| 5 | POST | `/api/ai/chat` | Send message (streaming) |
| 5 | GET | `/api/ai/conversations` | List conversations |
| 5 | POST | `/api/ai/providers` | Add AI provider |
| 5 | POST | `/api/projects` | Create project |
| 5 | GET | `/api/projects` | List projects |
| 5 | POST | `/api/tasks` | Create task |
| 5 | GET | `/api/tasks` | List tasks |
| 5 | PATCH | `/api/tasks/:id` | Update task |
| 5 | GET | `/api/tasks/search` | Search tasks |
| 6 | POST | `/api/automations` | Create rule |
| 6 | GET | `/api/automations` | List rules |
| 6 | GET | `/api/automations/:id/logs` | Execution logs |

**Total: ~50 endpoints across 6 phases.**

---

## Design System Reference {#design-system}

### Color Tokens

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `bg` | `#F8FAFC` | `#0B0F14` | Screen background |
| `surface` | `#FFFFFF` | `#151B23` | Cards |
| `surfaceElevated` | `#F1F5F9` | `#1C2430` | Modals, sheets |
| `primary` | `#0D9488` | `#2DD4BF` | CTAs, positive accent |
| `income` | `#059669` | `#34D399` | Salary, credits |
| `expense` | `#E11D48` | `#FB7185` | Living expenses |
| `broker` | `#7C3AED` | `#A78BFA` | Broker pass-through |
| `warning` | `#D97706` | `#FBBF24` | Worst-case scenario |
| `text` | `#0F172A` | `#F1F5F9` | Primary text |
| `textMuted` | `#64748B` | `#94A3B8` | Labels |

### Typography

| Style | Size | Weight | Use |
|-------|------|--------|-----|
| Display | 28-32sp | Semibold | Hero numbers |
| Title | 20sp | Semibold | Screen titles |
| Body | 15-16sp | Regular | Content |
| Caption | 12-13sp | Medium | Metadata |

### Navigation

**Web:** Collapsible sidebar — Dashboard, Finance, Tasks, Assistant, Integrations, Automations, Settings

**Mobile:** Bottom tabs — Home, Finance, Assistant, Tasks, More

---

## Execution Instructions for Agents

### To resume Phase 1 completion:
```
1. cd c:\Users\prabu\Desktop\OS\pulse
2. pnpm install                    # Fix any errors
3. pnpm typecheck                  # Fix all TS errors
4. cd docker && docker compose up -d
5. pnpm --filter @pulse/api dev    # Verify API starts
6. pnpm --filter @pulse/web dev    # Verify web starts
7. git init && git add . && git commit -m "feat: Phase 1 — foundation, auth, web + mobile shells"
```

### To start Phase 2:
```
1. Read Phase 2 section above
2. Create database schemas (packages/db/src/schema/)
3. Create API routes (packages/api/src/routes/)
4. Create MCP gateway service (packages/api/src/services/)
5. Create web pages (apps/web/src/app/(dashboard)/integrations/)
6. Create mobile screens
7. Run pnpm typecheck, fix errors
8. Test with a real MCP server URL
9. Commit: "feat: Phase 2 — MCP Hub & Plugin System"
```

### Repeat pattern for Phases 3-6.
