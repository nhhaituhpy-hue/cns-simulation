# CNS Simulation Lab — Copilot / ChatGPT Instructions

> This file helps AI coding assistants (GitHub Copilot, ChatGPT, etc.) understand
> the project structure, domain, and conventions. For full Antigravity/Claude
> agent rules, see `AGENTS.md` at the repo root.

## Project Overview

**CNS Simulator** is an internal training web application for CNS
(Communication, Navigation, Surveillance) technicians. It simulates the
maintenance interfaces of three equipment families — **VOR**, **DME** and
**ADS-B** — so trainees can practise fault diagnosis and examiners can grade
their work.

The application is **not** connected to real hardware. Terminal accounts inside
simulations are training data; real authentication uses Supabase Auth with
company-domain email (`@attech.com.vn`).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router |
| UI | React 19, TypeScript strict, Tailwind CSS 4 |
| State | Zustand (per-simulator session stores) |
| Icons / Motion | Phosphor Icons, Motion (framer-motion successor) |
| Font | Geist |
| Auth / DB / Storage | Supabase (cloud-hosted) |
| Testing | Vitest + Testing Library (unit/component), Playwright (E2E) |
| Hosting | Vercel (migrating to self-hosted Oracle VM via Dokploy) |
| CI | GitHub Actions — lint → typecheck → test:run → build → audit |

## Directory Layout

```
src/
  app/                   Next.js routes, layouts, API routes, Server Actions
    admin/               Examiner workspace (scenarios, grading, exams)
    student/             Trainee workspace (practice, exam sessions)
    simulator/           Standalone simulator routes
    api/                 REST API routes
    login/               Auth pages (login, register, OTP, password reset)
  components/
    vor/                 PMDT shell & screens for VOR simulators
    dme/                 PMDT shell & screens for DME simulators
    qcms/                ADS-B QCMS dashboard
    terminal/            ADS-B SA/MA terminal emulator
    hardware/            Interactive block diagrams & hardware exploration
    grading/             Submission comparison & grading UI
    auth/                Login/register/OTP components
  lib/
    dvor1150a/           DVOR 1150A domain engine
    dvor1150/            DVOR 1150 domain engine
    dme1119a/            DME 1119A domain engine + derivation map
    supabase/            Supabase client helpers
  modules/
    operations/
      mopiens-pmdt/      Shared PMDT/LMI shell for DVOR 220 & DME 320
    dvor220/             DVOR 220: domain/, store/, ui/
    dme320/              DME 320: domain/, store/, ui/
    core/                Simulator registry & module metadata
  stores/                Zustand stores (VOR, DME, ADS-B, auth, etc.)
tests/                   Unit, component, integration & E2E tests
supabase/migrations/     SQL migrations, RLS policies, seed data
doc/                     Manuals & technical docs (gitignored)
```

## Two Generations of Simulators

### PMDT Legacy (SELEX/ATDI equipment)

| Simulator | Route | Engine location |
|-----------|-------|----------------|
| DVOR 1150A | `/simulator/dvor-1150a` | `src/lib/dvor1150a/engine.ts` |
| DVOR 1150 | `/simulator/dvor-1150` | `src/lib/dvor1150/engine.ts` |
| DME 1119A | `/simulator/dme-1119a` | `src/lib/dme1119a/` |

Layout in `src/components/vor/` or `src/components/dme/`. Zustand store holds
session, config, draft, screens and derived data. Classic PMDT window with
title bar, menus, sidebar, toolbar F5–F8 and status bar.

### MOPIENS (Indra Navia software equipment)

| Simulator | Route | Domain location |
|-----------|-------|----------------|
| DVOR 220 | `/simulator/software/dvor-220` | `src/modules/dvor220/domain/` |
| DME 320 | `/simulator/software/dme-320` | `src/modules/dme320/domain/` |

Each module has `types.ts`, `defaults.ts`, `commands.ts`, `engine.ts`.
Shared PMDT/LMI presentation shell in `src/modules/operations/mopiens-pmdt/`.
Three-layer config lifecycle: Draft → Running (Apply) → Flash (Profile Save).

### ADS-B

Route `/simulator/ads-b`. Uses `createTerminalStore` and `TerminalWindow`,
not a PMDT shell.

## Data Flow — The Golden Rule

```
Config (source of truth)
  → Draft (user edits)
  → Apply (F7 / Apply button)
  → Engine recomputes derived snapshot
  → Snapshot is read-only by UI screens
```

**Never** compute physics/RF values inside JSX components. The engine produces
a deterministic snapshot; screens only read and display it.

## Key Conventions

1. **Vietnamese UI** — All user-facing text is in Vietnamese. Code, comments
   and documentation may be in English or Vietnamese.

2. **Domain engine is pure logic** — No React imports, no JSX. Engines live in
   `src/lib/<device>/` or `src/modules/<device>/domain/`. They receive config
   and return a snapshot object.

3. **Zustand stores are thin adapters** — Stores call engine functions and hold
   the result. Business logic belongs in the engine, not the store.

4. **Derived values are never stored in config** — Config holds source values
   only. TX Power, RF Level, Delay, ERP, VSWR, alarm status are always
   recomputed by the engine.

5. **Physical invariants** — VSWR ≥ 1, mutually exclusive TX states (On-Air /
   Load / Off), Local must be on before Bypass, etc.

6. **Alarm/voting/transfer** — Limits classify measurements into
   Normal/Warning/Alarm. Voting logic (AND/OR) aggregates monitors. Transfer
   is automatic when not bypassed. Shutdown happens when all monitors alarm
   after transfer.

7. **Scenario Parameters** — Session-only fault injection system. Does not
   write to persistent profile. Examiner configures faults + success criteria;
   trainee solves using whitelisted controls.

8. **Persistence** — Simulator config saved per application user via Supabase
   (`user_simulator_configs` + `user_simulator_config_history`). localStorage
   is fallback when Supabase is unavailable.

9. **Testing** — When modifying an engine, always add:
   - Positive test: output changes as expected
   - Negative test: unrelated output does NOT change
   - Downstream test: alarm/voting/transfer reacts correctly

10. **File size** — Warn when a component file exceeds ~300 lines or a utility
    file exceeds ~500 lines. Suggest splitting before continuing.

## Domain Terminology

| Term | Meaning |
|------|---------|
| PMDT | Portable Maintenance & Diagnostic Terminal — the classic equipment UI |
| LMI | Local Maintenance Interface — MOPIENS equipment local UI |
| QCMS | Quality Control & Monitoring System — ADS-B monitoring dashboard |
| Changeover | Automatic switch from Main TX to Standby TX on alarm |
| Voting | AND/OR logic combining monitor alarms to decide action |
| Bypass | Suppress automatic transfer (alarm still displayed) |
| Local | Enable local maintenance mode (required before Bypass) |
| Calibration | Scale/offset factors applied to raw measurements per monitor |
| Transfer | Relay switching active transmitter path |
| Integral Monitor | Monitor on the currently transmitting (on-air) path |
| Standby Monitor | Monitor on the backup transmitter path |
| SEC3/SEC4 | Security levels allowing maintenance operations in PMDT |

## Environment Variables

See `.env.example` for the canonical list. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (safe for browser)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key
- `SUPABASE_SECRET_KEY` — Server-only; **never** prefix with `NEXT_PUBLIC_`

## Quality Gate

```bash
npm run check   # lint + typecheck + test:run + build
```

Individual steps: `npm run lint`, `npm run typecheck`, `npm run test:run`,
`npm run build`, `npm run test:e2e`.
