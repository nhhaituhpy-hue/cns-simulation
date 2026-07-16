# Technical decisions

This file records the choices made while implementing the MVP from `ADSB_Training_Simulator_Plan.md`.

## Architecture

1. The app uses Next.js App Router, TypeScript, React 19, and Tailwind CSS v4.
2. Scenario data is stored in versioned browser `localStorage`. The data access layer is isolated so a future D1 or Supabase adapter can replace it.
3. The SSH experience is a purpose-built React terminal. It is a deterministic training state machine, not a real shell and not an `xterm.js` session.
4. Zustand coordinates client state. Pure domain logic remains framework-independent and is tested separately.

## MVP scope

1. Each scenario supports one to eight sites and the seven QCMS sensor states.
2. SA and MA menus include the complete top level and second level described by the source plan. Deeper operations are represented as deterministic display, toggle, or mock-input actions.
3. Only Maintenance Mode is simulated. The change-mode option explains the MVP limitation without switching to a second menu tree.
4. Authentication is intentionally simulated. The required username must match the scenario role; a non-empty password is accepted and is never stored or graded.
5. Menu figures in the vendor manuals are the numbering authority when their explanatory prose disagrees.
6. The SA Software menu follows the manual: version information, factory reset, restart, and software update. The rollback item from the draft plan is not used.
7. Display screens wait for RETURN. Blank Enter, `RETURN`, and `0` are normalized to the same action; `x` and `X` both exit.

## Grading contract

1. A graded action is identified by its menu context and normalized input.
2. Login and password events are not graded because the scenario already defines the required role.
3. The score remains `correct expected steps / total expected steps`.
4. Passing requires every expected step to match in order and no missing, incorrect, or redundant submitted actions.
5. Students may select the recorded actions they intend to submit, as required by the source plan.

## Interface and accessibility

1. The app shell is light and the terminal remains dark for domain fidelity.
2. The primary action color uses a darker sky blue than the draft design because white text on `#0ea5e9` does not meet WCAG AA for normal text.
3. Status is always conveyed by text and icon in addition to color.
4. Motion is limited to state feedback and is disabled when reduced motion is requested.

## Repository content

The three vendor manuals are reference inputs and are not copied into the repository. This avoids publishing potentially restricted source documents. The README identifies the expected manual titles and versions.

## VOR PMDT training module

1. VOR is a separate bounded module rather than an extension of the ADS-B scenario model. DME can follow the same pattern later without coupling its equipment data to VOR or ADS-B.
2. The admin configures fault values and indicator colors directly on the shared PMDT simulator, then marks expected views as checkpoints.
3. Author, student, and preview modes share the same PMDT screens and field identifiers. This prevents the training display from drifting away from the scenario-building display.
4. A student attempt records each enabled PMDT screen/tab visit in sequence. The student may add a free-text annotation to every visit, then submits suspected fault, diagnostic reasoning, and remediation.
5. Expected checkpoints are examiner aids only. The application shows whether a view was visited but does not automatically decide the final grade; the examiner reads the evidence and enters a score from 0 to 100 with comments.
6. VOR scenarios and submissions have independent versioned local storage, API routes, Supabase tables, and Zustand stores.
7. Authentication is intentionally deferred for this experimental phase. Students identify themselves with name and code. The included Supabase RLS policies are temporary permissive MVP policies and must be replaced when the future two-account admin/user login is introduced.
8. Admin and student module selection is encoded in canonical URLs (`/admin|student/vor`, `/dme`, and `/ads-b`) instead of transient component state. The section roots redirect to VOR, while direct navigation and refresh preserve the selected module.
9. Interactive sidebar fields use the same scenario override model as PMDT screen fields. Local and Bypass are explicit training targets: students start from the normal gray state, their clicks change the displayed state, and each result is stored as submission evidence for examiner review.
10. The decorative Save, Print, Next, Close, Apply, and Reset toolbar is omitted from the simulator because those controls are not part of the training workflow and can be mistaken for scenario-authoring actions.
