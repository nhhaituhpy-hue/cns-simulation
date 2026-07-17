# Implementation status

## Milestones

- [x] Project scaffold and dependency setup
- [x] Domain models, menu fixtures, terminal engine, grading, and unit tests
- [x] Versioned storage and Zustand stores
- [x] Admin scenario management and action builder
- [x] Student QCMS monitor
- [x] Student terminal, recording, and grading result
- [x] Con Son sensor profiles and 17 data-driven SA/MA terminal screens
- [x] Extended QCMS toolbar, event log, replay, configuration, status, and statistics
- [x] Hardware topology, 10 fault presets, diagnosis workflow, and hardware grading
- [x] Responsive and accessibility hardening
- [x] Lint, typecheck, tests, production build, and browser QA
- [x] README and repository documentation
- [x] VOR PMDT simulator with RMS, Monitor, and Transmitter screens
- [x] VOR scenario authoring through direct value/status configuration on PMDT
- [x] VOR student workflow with screen-visit journal, annotations, diagnosis, and remediation answer
- [x] VOR examiner workflow with checkpoint comparison and manual scoring
- [x] Separate VOR scenario/submission persistence with Supabase migration and local fallback
- [x] Configurable and scoreable VOR sidebar interactions for Local and Bypass
- [x] Canonical admin/student routes for VOR, DME, and ADS-B with VOR as the section default
- [x] Publish the current sidebar and module-routing upgrade to GitHub
- [x] DME PMDT simulator for Model 1118A/1119A with 16 enabled reference-backed views
- [x] DME scenario authoring, student journal, sidebar interactions, and examiner review
- [x] Separate DME local/API/Supabase persistence and applied database migration
- [x] Desktop and mobile Chromium coverage for DME simulator navigation and function-key removal

## Required quality gates

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- `npm run test:e2e`

## Latest verification

Verified on 2026-07-17 after the DME PMDT implementation:

- ESLint: passed
- TypeScript: passed
- Vitest: 39 files, 167 tests passed
- Playwright: 8/8 desktop and mobile Chromium flows passed
- Production build: passed with 31 routes, including all DME authoring, student, review, and API routes
- Supabase migration `202607170001_create_dme_training.sql`: applied to the linked project
- DME source and maintenance notes: `docs/HD-PMDT-Simulator-DME.md`

Previous baseline:

Verified on 2026-07-16 with Node.js 24 after the VOR sidebar and module-routing upgrade:

- ESLint: passed
- TypeScript: passed
- Vitest: 36 files, 156 tests passed
- Playwright: not rerun for this upgrade; 6 existing desktop/mobile Chromium flows remain in the suite
- Production build: passed for all application routes
- Production routes include the six canonical admin/student module routes, VOR authoring, student session, submission list/review, and both VOR APIs
- Visual QA: existing ADS-B layouts were previously reviewed; VOR browser QA is pending because no in-app browser backend was available in this session

## VOR deployment note

- The migration is ready at `supabase/migrations/202607160003_create_vor_training.sql`.
- The workspace is linked to Supabase project `nnbzfmirxvtzhmpfyobs`.
- Migrations `202607160001`, `202607160002`, and `202607160003` are present both locally and remotely.
- The versioned `localStorage` fallback remains available when Supabase configuration or connectivity is unavailable.
