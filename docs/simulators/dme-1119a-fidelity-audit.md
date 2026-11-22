# DME 1119A — Fidelity Audit

- **Date:** 22/11/2026
- **Device:** SELEX DME 1119A (High Power DME), Tuy Hòa station
- **Code baseline:** repo `nhhaituhpy-hue/cns-simulation`, main `e90e7070`
- **Auditor:** Muse (taking over from Devin Bot "Labs Shipkeeper", same playbook as the DVOR 220 / DVOR 1150 / DVOR 1150A audits)

## 0. Sources and priority

| Source | Role |
|---|---|
| SELEX Operations and Maintenance Manual, Model 1118A/1119A DME, **571118A-0001 Rev. M, July 2014** (238 pp.) | Hardware, PMDT screens, parameters, alarm defaults |
| ATTECH HDCV guides: HD-KTDA (khai thác, Lần BH 09, 20/07/2026), HD-BDDMA (bảo dưỡng, Lần BH 08, 15/06/2025), HD-TTDMA (thay thế hiệu chỉnh, Lần BH 03, 15/06/2025) | **Win over the manual** for operations, maintenance and calibration procedures (owner rule, 19/11/2026) |
| Station photos: 53 PMDT screenshots from the owner's station (Drive folder `DME1119A`) | Ground truth for station configuration values; photo beats document |
| Simulator as-built spec `dme1119a_parameter_correlation.md` | Cross-reference only (describes the simulator, not the device) |

Station identity (from photo title bars, consistent across all sampled screenshots):
**"VIETNAM TUY HOA 117X - Dual DME - SELEX ES Inc. PMDT"**, ident **TUH**, access **Level 3 / SEC3**,
PMDT software **P/N 978178-0080, Version 8.7.2.0 (Library Version 79), Build 05/22/14**.
Frequencies check against manual Table 9-5 for 117X: interrogation 1141 MHz, reply 1204 MHz, RX LO 1016 MHz — all match the screenshots.

Method: full read of the DME 1119A code scope (`src/lib/dme1119a`, `src/lib/dme-*.ts`, `src/stores/dme-pmdt-store.ts`, `src/components/dme`, `src/modules/devices/dme-1119a`, `tests/dme`) against the manual, the three HDCV guides and a systematic sample of 15 of the 53 station photos. Working analyses: `analysis-docs.md` / `analysis-code.md` in the audit working folder.

## 1. What already matches (verified)

- **Channel allocation** follows manual Table 9-5 exactly (INT/RX = 1024+n MHz; RX LO = 899+n; TX reply 961+n / 1087+n with the X/Y band flip at channel 64; spacing X 12 / Y 36 µs interrogation, X 12 / Y 30 µs reply; nominal delay X 50 / Y 56 µs). Locked by `tests/dme/dme1119a-channel.test.ts`.
- **Alarm limits match the station's real configuration** (photo of Monitors >> Configuration >> Alarm Limits): Delay and Spacing nominal with Pre-Alarm ±0.32 / Alarm ±0.40 µs offsets, PRF low 720 ppps, VSWR Pre-Alarm 3.0 / Alarm 4.0, Directional Coupler Loss −29.67 dB, Monitor 1/2 Reply Attenuation 22 dB, Efficiency Certification Level 70 %.
- **RMS General configuration matches the station** (photo of RMS >> Configuration >> General): Voting Logic **AND**, Transfer **on Primary Alarm**, Automatic Restarts **off**, First Restart Delay **50 s**, Number of Automatic Restarts **2**, RCSU Present on, Connection Type Dedicated Modem.
- **Security model matches manual §3.6.6.1**: four levels, default accounts SEC4/FOUR and SEC3/THREE, lockout after 3 failed logons for 5 minutes, activity-detector logoff after 15 minutes with the manual's Local Mode bypass, password change rules (4–32 chars).
- **Sidebar is live** and level-gated (Local / Bypass / Antenna / Load / Off act on real state); **F7 Apply** flow validates, blocks scenario-protected fields, and runs the automatic-transfer rule; the derived engine recomputes measurement rows, monitor voting (AND/OR + integrity downgrade), traffic/PRF state, delay control and alert synthesis from configuration.
- **About dialog matches the station exactly** (photo: P/N 978178-0080, v8.7.2.0, Library 79, Build 05/22/14, IP 192.168.0.49).
- **Outside Temperature default −25 °C** matches manual §3.6.7.2.3 (default when no Environmental Sensor Kit is fitted).
- **Scenario system**: 11 fault kinds, 18 presets, two-stage diagnosis with PMDT checkpoints + exact hardware occurrence, full evidence trail; injected faults are session-only by design and cannot leak into the persisted operator profile.
- **Persistence**: in preview mode the operator profile persists server-side with revision checking; Save/Load/Backup/Restore slots behave per the PMDT model.
- **Block diagram catalog**: 32 blocks with manual-traceable assembly IDs / part numbers (LPA 1A9, HPA 1A3, Monitor 1A11, RTC 1A10, RMS 1A13, LCU 1A1, BCPS 1A20, PS 1A24 …) and test points with waveform references.

## 2. Gaps

Severity: **High** = teaches wrong behaviour or fakes a core workflow · **Medium** = visible wrong/static behaviour in normal use · **Low** = cosmetic or internal.

### High

- **G01 — Fault History is static artwork.** `monitor-fault-history.tsx` renders hard-coded snapshots (dated 02/04/25 and 07/04/24 — transcribed from station captures) and "Failed LRUs: No Fault Found" is a literal in every view. Faults that occur in a session are never recorded. Manual §3.6.9.3: Fault History keeps the **last 3 faults**, each with a Pre-Alarm column (last good values) and an Alarm snapshot, for Integral, Standby and LCU. Expected: snapshot live monitor state on alarm transitions (last-good + at-fault), per monitor, per path.
- **G02 — RMS Logs are fabricated and never appended to.** Defaults ship 151 alarm entries that are **all** "Integral Tx Power / Primary Alarm Low" and 81 maintenance entries, most literally "Unknown: 128/129/130…". No code path appends live events; the only store write is Reset → empty. Manual §3.6.7.3: each log holds the **100 most recent** entries, FIFO (Alarms, Maintenance Alerts, Command Activity, Parameter Change). Expected: the engine appends real alarm raise/clear, command and parameter-change events with the simulated clock.
- **G03 — Monitor Calibration screen is static; the calibration workflow does not exist.** `monitor-calibration.tsx` shows hard-coded constants (Interrogator Nominal Power −13.2 dBm, Tx Power Offset −3.0 dB — transcribed from a capture), every input `readOnly`; Run/Stop Self Calibration toggles a local `useState` only. The engine maintains `monitorCalibrationData` (derived per edit) but **no screen renders it**. HD-TTDMA §1 requires, after a monitor replacement: enter Interrogator Nominal Power, run self-calibration, then set Directional Coupler Loss and Config Backup. Expected: wire the screen to the derived calibration data, make Nominal Power editable, and give self-calibration a real run that updates the calibration values.
- **G04 — Special Tests are static.** `monitor-special-tests.tsx`: all inputs are `readOnly` literals; Monitor Selection and Interrogation Frequency selects are no-ops (`onChange={() => undefined}`, one option each); Start/Stop flips `specialTestRunning` with no measurement effect. Manual §3.6.8.3 (Table 3-5) defines the test set; HD-BDDMA §IV.2 and HD-TTDMA §2.2 build the receiver-sensitivity calibration on the Sensitivity Test + Decoder Tests (result must match configured Rx Sensitivity within ±1 dB, else adjust Rx Sensitivity Offset). Expected: a working test lifecycle whose results move the Decoder Results / sensitivity readings.
- **G05 — Diagnostics never completes outside a scenario.** `runDiagnostics` outside a scenario only sets `diagnosticsRunning: true`; there is no completion path — the run ends only when the user presses Stop. Inside a scenario the result is the canned definition value, applied instantly. Manual §3.6.11: Full Diagnostics requires Local Mode + Level ≥ 3 with the system NOTAM-off; On-Air requires Level ≥ 2; Power-Up results are per-processor. Expected: a timed lifecycle on the simulated clock (the DVOR 1150A G21 pattern), per-subsystem progress/results, and a standing note that trainer diagnostics are a model, not the equipment BITE.
- **G06 — Cabinet and faceplate LEDs are fixed artwork.** `dme-1119a-cabinet.tsx` receives **no simulator state** (props are surface/selection only); LEDs are literals such as `on={row === 2}`. The monitor faceplate shows PRIMARY ALARM red + SECONDARY ALARM red + PRE ALARM amber lit **simultaneously** — a state the real unit cannot show. Injected faults are invisible on the cabinet view, yet the HDCV daily check (HD-KTDA Phần II §II.2) is precisely an LED check (PWR OK, CPU, Primary/Secondary/Pre-Alarm, RTC Overload). Expected: drive cabinet/faceplate LEDs from the store (module power/CPU/alarm state per designator).
- **G07 — F8 does the wrong thing.** The toolbar F8 "Reset" calls `restoreDefaultConfig` — it restores **factory defaults** into data + draft. Manual §3.5/§3.6: F7 = Apply, **F8 = Reset (discard edits)**. A correct `resetConfigDraft` exists in the store but is bound to nothing; the Parameters panel footer shows two buttons ("Reset defaults", "Reset (F8)") wired to the same restore action. Expected: F8 discards the draft back to applied values; factory restore stays available only as an explicit, separately labelled action.

### Medium

- **G08 — Rx Sensitivity station baseline is the wrong value.** Default `rxSensitivity: -94` dBm (`dme-pmdt-defaults.ts:297`). −94 dBm is the manual's decoder *reference* sensitivity (Table 3-9), not the configured value for this station: HD-TTDMA §2.1 sets Rx Sensitivity to **−87 dBm for 1000 W stations** (−82 dBm for 100 W). Expected: station baseline −87 dBm (decoder reference stays −94 dBm in the Decoder test table).
- **G09 — Maintenance Alerts screens are all-gray statics.** `rms-maintenance-alerts.tsx` reads no store state at all (every indicator literal gray, including Primary/Secondary Alarm); the monitor Maintenance Alerts tab is 12 literal gray labels. Manual §3.6.7.2.1 / §3.6.9.1.3: these screens show the live alert sources. Expected: render from derived alert/facility state.
- **G10 — Operational Summary and Command Activity logs are fabricated statics.** Hard-coded operating hours (26846.52 / 28121.55), availability 99.7907 %, fixed 2026 RCSU logon rows; the Summary Reset button only zeroes a local `useState` display, and "Download Trend Data" exports the same static numbers. Manual §3.6.7.3.1/§3.6.7.3.4. Expected: accumulate TX state durations from the simulated clock; log real commands (see G02).
- **G11 — Interrogator / Transponder test-result tabs are hard-coded.** Only the Pulse Spacing row moves (with channel spacing); all other rows are literals. The Decoder and Alarm Limits tabs on the same screen are live. Manual Tables 3-7 / 3-8 define the measured quantities and tolerances; HD-KTDA daily checks read these tabs. Expected: derive the rows from the engine's pulse model, as the Decoder tab already does.
- **G12 — Monitor Configuration >> General cannot represent per-monitor routing.** The Integral and Standby columns write the **same** `monitorConfigGeneral[i].primary/secondary` field (`monitor-config-general.tsx`), so the two monitors' Primary/Secondary classification cannot differ in the model. Manual §3.6.8.2.1. Open verification Q4 (§5) decides whether the real screen is shared or per-monitor; the model must follow the real screen.
- **G13 — Derived system power status is invisible.** `systemPowerStatus` and `txAlerts` are maintained by the engine (an AC failure updates them) but no DME screen renders them; the Digital I/O "System Power Status" panel renders a local hard-coded array (`rms-digital-io.tsx:17`), and "SPI Bus Fault" / "System Fan Fault" rows are hard-coded green. Expected: render the derived data, so an AC failure is visible where the operator looks for it.
- **G14 — PA status columns share one colour.** `derivePaStatus` assigns a single `stateColor` to all 7 indicator columns of a PA row (VSWR, long-pulse fault, power supply, output power, temperature, enables are not independently derived). Expected: per-column derivation.
- **G15 — Unknown RMS commands are recorded as accepted.** `executeRmsCommand` falls through for any unhandled commandId: it sets `lastCommand` and the evidence trail records success, with no state change and no rejection. Expected: unhandled commands reject explicitly with a reason, like the gated commands already do.
- **G16 — Menu checkmarks do not follow state.** `dmeMenuStructure` is a module constant; `item.checked` values (Fan Automatic, Ident Normal, …) are baked in and rendered as-is, so after the user picks Fan On or Ident Off the menu still shows the old checkmark. Expected: checkmarks derived from state at render time.
- **G17 — Ident keyer options are hard-disabled with no reason.** In Transmitters >> Configuration >> Nominal, the checkboxes Self-Key on Loss / Shutdown on Loss / Restart when Signal Resumes are hard-`disabled` (`tx-config-nominal.tsx:138-140`) with no explanation. Manual Table 3-11 lists them as configuration. Expected: wire them into the ident model, or disable with a stated reason (the pattern used elsewhere in this PMDT).

### Low

- **G18 — Home screen shows the DVOR 1150A logo asset** (`home-screen.tsx:11` → `/images/dvor1150a-selex-home.png`). The DME PMDT main screen is in the station photos; use a DME capture.
- **G19 — RMS Status cosmetics are hard-coded**: Resource Utilization % columns, "User Sessions: 1", "Trend Data Flash Busy = false", Primary/Secondary Mismatch indicators always gray (`rms-status-layout.tsx:41-69`).
- **G20 — Three System menu items are bare stubs**: PMDT Setup…, Print Setup…, Exit PMDT are `enabled: false` with only the generic "Chưa khả dụng" tooltip (`dme-menu-structure.ts:196-199, 251`). Either implement a minimal honest behaviour or disable with a specific reason.
- **G21 — `monitorDetailData` for Monitor 2 is a shallow copy of Monitor 1's rows** (derived-data chain 5). Visible impact is limited today (the detail screen mostly reads integral/standby data), but the model should derive per monitor like the measurement rows already do.
- **G22 — Reset Intrusion/Smoke Detector may not stick** (uncertain — verify): the command sets `data.alert = false` directly while recompute derives `alert` from `manualAlertOverride` + rows; the next recompute may restore the alert. Verify the interplay and fix if confirmed.
- **G23 — Default station identity is "TST"** (description + ident), while the station is TUY HOA / TUH on 117X. Scenario definitions deliberately use an isolated TST baseline; whether the free-run default profile should be the real station profile is owner question Q1 (§5).

### Documented simplifications (not gaps)

- **LDES**: the traffic model uses the configured LDES Window/Threshold directly; manual §6.4.3 equations need SRE/FUD inputs the PMDT does not expose. The code documents this (`DME_LDES_TRAINING_MODEL`); keep, with the training-model note pattern.
- **Measurement baselines**: base rows are the station captures for 117X shifted by computed deltas (documented at `derived-data.ts:41-45`). This matches the audit method used for the other devices; absolute first-principles synthesis is not required.
- **Trend Data** in Fault History claims 20 records over the same 4 snapshots — subsumed by G01.

## 3. Document conflicts that touch the simulator

Recorded in full in the working analysis; only the ones affecting simulator behaviour are listed here.

| Conflict | Sources | Resolution for the simulator |
|---|---|---|
| First Restart Delay 20 s vs 50 s | Manual §1.6.1(f) vs Table 1-1 §2.3.5 | **Station config wins: 50 s** (photo #13). Sim already 50 s. |
| Shutdown delay 10 s vs 7 s | Manual §1.6.1(d)/§1.6.2.2 vs §1.6.2.1 / Table 1-1 §2.3.4 | **Station config wins: 7.0 s** for both Integral and Standby (photo #21). |
| Password levels: 3 vs 4 | Manual §1.3.3 vs §3.6.6.1 + Table 3-2 | §3.6.6.1 wins (4 levels); sim already correct. |
| Interrogator Nominal Power −11.3 dBm (dual) vs −13.2 dBm | HD-TTDMA §1 vs station photo (Monitor 1 Calibration) | Station photo is the baseline value; −11.3 stays the documented default in the replacement procedure. Owner question Q2 confirms currency. |
| Rx Sensitivity −87 dBm vs −94 dBm | HD-TTDMA §2.1 vs manual Table 3-9 | Different quantities: −87 = configured value for a 1000 W station; −94 = decoder test reference. See G08. |
| VSWR ≤ 1.5:1 vs alarm 4.0:1 | HDCV equipment standard vs manual §2.3.2 / station config | Different purposes: HDCV value is an acceptance criterion, 4.0 is the alarm limit. Sim keeps station alarm limits. |
| System delay tolerance ±0.5 µs vs ±0.25 µs | HD-KTDA Phần I §V vs its own form appendix | HDCV internal inconsistency (errata). Sim behaviour unaffected (alarm limits come from station config). |
| PRF 800 ±100 vs 800 ±50 pps | HD-KTDA vs HD-BDDMA / HD-TTDMA | HDCV internal inconsistency (errata). Sim unaffected (PRF alarm limits from station config: 720 / 6000). |
| Ident period ~30 s vs 40 s | Manual §1.2/§2.2 vs §2.1.14 | Manual internal inconsistency; no sim behaviour depends on it today. Noted only. |

## 4. Fix plan (stages)

- **Stage 1 — PMDT truthfulness:** G02 (live log engine, FIFO 100), G01 (fault-history snapshots), G09 (maintenance alerts wiring), G13 (render derived power status), G10 (operational summary / command activity from real state).
- **Stage 2 — Maintenance workflows:** G03 (calibration), G04 (special tests), G05 (diagnostics lifecycle), G17 (ident keyer options).
- **Stage 3 — Hardware truthfulness:** G06 (cabinet/faceplate LEDs from state).
- **Stage 4 — Shell correctness:** G07 (F8), G15 (command fall-through), G16 (checkmarks), G14 (PA colours), G19 (RMS Status), G18 (home asset), G20 (stubs with reasons), G08 (sensitivity baseline), G12/G21/G22 (model fixes + verification).
- **Stage 5 — QA:** production browser QA of the full PMDT + HDCV daily/weekly check walkthroughs against the fixed simulator; redeploy.

Each stage = one PR, merged when CI is green; QA on the real production site after the final redeploy (owner rule, 21/11/2026).

## 5. Owner questions

- **Q1 — Default profile.** Should the free-run default station profile be the real Tuy Hòa profile (description/ident TUY HOA / TUH, 117X) instead of "TST"? (Scenario definitions keep their isolated TST baseline either way.)
- **Q2 — Interrogator Nominal Power.** The calibration photo (02/05/25) shows **−13.2 dBm** for Monitor 1. Is that still the station's current value, and does Monitor 2 use the same value?
- **Q3 — Revision levels.** The sim shows RMS 3.1, Monitor 1/2 3.0.0.5, RTC 1/2 3.1, BCPS 1/2 1.6, LCU 1.1 (`dme-pmdt-defaults.ts:248`) with no traceable source. Do these match the station's RMS >> Status >> Revision Levels screen? (A photo of that screen settles it.)
- **Q4 — Monitor Configuration >> General.** On the real PMDT, are the Primary/Secondary classifications for Integral and Standby set independently per monitor, or is it one shared classification table? (A photo of Monitors >> Configuration >> General settles it; decides G12.)
- **Q5 — Diagnostics durations.** The manual gives no run durations for Full / On-Air diagnostics. The DVOR 1150A fix used trainer-model durations (60 s / 30 s) with a standing model note. Same approach here?
