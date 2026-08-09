# MOPIENS DVOR 220 and DME 320 Simulator Plan

## Objective

Replace the placeholder operations-software routes with complete, deterministic training simulators for the MOPIENS 220 DVOR and 320 DME. The supplied manuals and DVOR screenshots are the domain and visual sources of truth.

## Sources reviewed

- `doc/DVOR220/220 DVOR Tech Manual 20240320.pdf` (560 PDF pages).
- All 12 PNG references in `doc/DVOR220/`.
- `doc/DME320/310320_DME_Tech_Manual 2022-12-19.pdf` (404 PDF pages).
- Repository module architecture and the installed Next.js 16.2.11 documentation.

## Architectural decisions

1. MOPIENS and SELEX implementations remain independent. DVOR 220 must not import the DVOR 1150/1150A domain, and DME 320 must not import DME 1119A domain state.
2. Only presentational MOPIENS PMDT/LMI primitives are shared: window chrome, menus, toolbar, navigation, tab host, output pane, status bar, dialogs, gauges, switches, indicators, property grids, and tables.
3. Each equipment module owns its menu schema, configuration, measurements, command rules, permissions, alarm engine, state machine, faults, calibration, and logs.
4. PMDT and LMI are two views over the same per-simulator device store.
5. Domain engines are deterministic and accept an injected clock. Timers are represented as explicit state transitions so tests do not wait in real time.
6. Configuration has three explicit layers: edit draft, running configuration after Apply/Load, and non-volatile profile after Profile Save. A simulated power cycle restores the profile.
7. Browser workflows simulate serial, modem, Ethernet device connection, NTP, firmware update, printing, XML/CSV import/export, and RF test equipment. They never perform real equipment I/O.
8. The Simulator workspace can be marked available independently from Authoring/Review. This task does not expand the exam schema or grading workflow.
9. Desktop fidelity targets the manual's approximately 1024x768 PMDT layout. Small screens retain the equipment geometry through scale/scroll instead of rearranging the industrial UI into unrelated cards.

## Shared implementation

`src/modules/operations/mopiens-pmdt/` contains presentation-only components and types. It must not import either equipment store.

- PMDT and LMI shells.
- Title, menu, toolbar, navigation, tabs, output pane, and status bar.
- Connection and login dialogs.
- Status indicator, gauge, slide switch, beveled button, property grid, limit grid, and confirmation modal.

## DVOR 220 scope

- Connection profiles and security levels 0-3.
- LOCAL/REM/MAINT control ownership.
- Dual TX designation and antenna/dummy-load routing as separate state.
- CMA, SMA, SYN, PDC, two monitors and their channels, power, environment, and optional units.
- Home, equipment/detail, monitor, PDC 48-antenna table, setup, maintenance, flight inspection, history, PMDT, and LMI screens.
- Normal/warning/alarm classification, primary/secondary alarm semantics, AND/OR voting, bypass, executive delay, changeover, post-changeover delay, second-fault shutdown, and reset.
- Calibration, monitor certification, automatic ground-error check, antenna/manual diagnostics, and fault injection.
- Manual conflict policy: sideband form uses the physical 0-5 W range; carrier accepts the PMDT 0-150 W input range and reports an operating-range warning outside 25-125 W.

## DME 320 scope

- Connection profiles and security levels 0-3.
- LOCAL/REM/MAINT control ownership.
- Dual transponder designation, routing, DC power, RF enable, hot/cold standby, interlock, and reset.
- Executive/standby monitor channels, SCU, TCU, RXU, TXU/HPA, RFG, PMU, batteries, power rails, environment, antenna/probes, and common RF path.
- Channel allocation for 1X-126X and 1Y-126Y, with X/Y pulse spacing and reply delay.
- Home, equipment/detail, readings, setup, maintenance, calibration wizard, manual test, certification, advanced controls, history, PMDT, and LMI screens.
- Normal/warning/pending/active alarm lifecycle, primary/secondary semantics, AND/OR voting, bypass, ERP masking, changeover/shutdown, power/battery transitions, and fault propagation.

## Work phases and ownership

1. Shared owner: MOPIENS presentation shell, route dispatcher, workspace availability, and AppShell integration.
2. DVOR owner: `src/modules/operations/dvor-220/**` and `tests/dvor220/**`.
3. DME owner: `src/modules/operations/dme-320/**` and `tests/dme320/**`.
4. Root review: cross-module integration, accessibility, browser verification, focused test selection, build, documentation, and Git handoff.

## Verification gates

- Domain tests cover permissions, validation, derived measurements, state transitions, alarm timers, voting, bypass, reset, persistence, and fault propagation.
- Component tests cover connection/login, menu navigation, representative PMDT/LMI screens, dialogs, setup editing, maintenance workflows, and history filters.
- Browser verification covers both routes at desktop and narrow viewport sizes and verifies representative end-to-end alarm/control workflows.
- `git diff --check` and `codegraph sync` run after source edits.
- The current goal explicitly authorizes implementation, testing, and repair through completion; focused tests, typecheck, and build therefore form the final verification phase.

## Definition of done

- Both simulator routes render interactive MOPIENS applications and no longer render placeholders.
- Both modules are marked available in Simulator while unfinished training workspaces remain planned.
- PMDT and LMI use the same live device state.
- Commands, measurements, alarms, faults, configuration persistence, calibration/test workflows, and logs are causally connected rather than hard-coded screenshots.
- No MOPIENS module imports a SELEX equipment domain/store.
- Focused tests, typecheck, and production build pass; browser QA finds no blocking visual, interaction, console, or accessibility defect.
- CodeGraph and README are updated, and the repository is committed and pushed once using the configured SSH identity.

## Completion record — 2026-08-10

Implementation and automated verification are complete.

- DVOR 220 and DME 320 render real MOPIENS simulators on their standalone routes; VHF/VSAT retain the placeholder fallback.
- PMDT and LMI share one live equipment store per simulator.
- Both engines remain independent from all SELEX equipment domains and stores. The shared `mopiens-pmdt` package is presentation-only.
- DME Figure 4-114 controls include Squitter, IDENT keying, RF loopback, and spacing offset. Monitor Self-Test is modeled as automatic BITE status rather than an invented operator-run action.
- DME shutdowns carry an explicit cause, preventing thermal auto-restart from clearing a monitor, power, or communication shutdown latch.
- Simulator availability is independent from training workspace availability through `trainingStatus`.

Verification results:

| Gate | Result |
| --- | --- |
| Focused/integration Vitest | 21 files, 103/103 tests passed |
| Targeted ESLint | Passed with no warnings |
| TypeScript | `npm run typecheck` passed |
| Production build | `npm run build` passed on Next.js 16.2.11 |
| HTTP smoke check | DVOR 220, DME 320, and VHF fallback returned 200 with expected markers |
| Forbidden SELEX/F7/F8/placeholder scan | Passed |
| CodeGraph and whitespace | Synced; checks passed |

The in-app Browser runtime reported no available browser backend, so desktop/narrow visual inspection could not be executed in this session. Connection, login, Guest Level 0, PMDT navigation, setup, maintenance, alarm/changeover, Advanced TXP, and PMDT/LMI state-sharing workflows are covered by component tests. A future session with Browser access should perform the remaining visual-only check without changing the verified equipment logic.
