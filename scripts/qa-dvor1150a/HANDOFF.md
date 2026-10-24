# DVOR1150A headed fixture QA

Run only on Box1 `instabox-ci`, Node24. No production auth/DB/route is tested.

```sh
cd /data/workspace/cns-dvor1150a
export PATH=/data/tools/node24/bin:$PATH DISPLAY=:1
DVOR_CONFIG_QA_OUTPUT=/data/evidence/cns-dvor-config/browser/frozen-inventory \
  node scripts/verify-dvor1150a-config-browser.mjs --inventory-only
DVOR_CONFIG_QA_OUTPUT=/data/evidence/cns-dvor-config/browser/frozen-full \
  node scripts/verify-dvor1150a-config-browser.mjs
```

- `--inventory-only`: all-cell DOM inventory, eight requested native/setup screens plus RMS monitor voting and explicitly identified generic-only monitor controls, all three viewport sizes and screenshots. Non-exercised values are NOT pass.
- Default: all editable inventoried controls, real fill/check/select, before-Apply config/derived/DOM stability, actual Apply, detached native-engine oracle, source isolation, guards, discard/reset, scenario typed-target export/import, carrier-vs-MON independence.
- `DVOR_CONFIG_QA_FIELD_PATTERN='nominal.outputPower|monitor.alarmLimits.deviation.nominal'`: bounded smoke; every unselected cell is explicitly `not-exercised-focused-run` and exit is deliberately non-green.
- `--serve`: loopback preview `127.0.0.1:4176`, actual headed Chromium `/usr/bin/chromium`, `DISPLAY=:1`, CDP loopback `127.0.0.1:9226`. Use `nohup` because tmux is unavailable. Do not expose CDP publicly.

## Isolation

Real PmdtLayout, children, singleton store and real globals/Tailwind PostCSS CSS. Only Next navigation hooks are replaced. Synthetic fixture reset is the sole browser writer exposed by QA; no `setConfigValue`, Apply or route shortcut is exposed. No simulatorId prop, user/session identity or web credentials. Requests outside this loopback and all non-GET/API requests are blocked and recorded. This does not authenticate against Next or claim profile persistence.

## Evidence

Each run writes `inventory.json`, `results.json`, `source-manifest.json`, `bundle-metafile.json`, compiled app/CSS, screen PNGs and exported scenario JSON. Per-cell IDs are counted/deduplicated in code; duplicate native paths (notch aliases) retain distinct cell IDs. Blank manual slots, phantom catalog fields, unavailable rendered controls, stored-only fields, no-effect paths and missing native readouts are distinct states, never silently pass. Source hashes are rechecked on exit; a moving tree prevents final GREEN.

`205` in the independent manual audit is a baseline logical-control count across a larger audited screen set; it is not raw DOM inputs, catalog scalar count or blank-slot count. The harness records all these categories separately rather than hardcoding 205. Figure3-44 only five Test Generator calibration cells/MON: power/frequency TG slots must remain blank. Primary/Secondary is severity, not physical MON1/MON2.

## Evidence from development (historical)

The early runs below describe incomplete moving candidates; they are not release acceptance. Final evidence must be regenerated from the frozen source manifest. Stored-only fields are always listed as limitations, never counted as demonstrated detector effects.

- Complete early RED: `/data/evidence/cns-dvor-config/browser/baseline-red/` + sibling `.log` (210 cell results; old in-progress bundle).
- Bounded latest smoke: `/data/evidence/cns-dvor-config/browser/handoff-smoke/` + sibling `.log` (226 slots, two actual edit passes, 40 guards, 8 lifecycle, 2 typed scenario roundtrips, 2 independence regressions; not full coverage).
- Moving-tree partial full run stopped by coordinator: `iteration-4/partial-coordinator-stop.json` explicitly marks incomplete.
- Preview `/data/evidence/cns-dvor-config/browser/preview/`, `preview.log`, PID41838, loopback4176/CDP9226 is an OLD source snapshot. Rebuild/restart only after freeze for final webview QA.

Historical gaps were resolved in later integration: mobile safe-scroll, keyer runtime observations/visible digital results, mounted clock and native calibration controls. Remaining source limitations are explicit: eight calibration offset scalars plus three TG setup scalars are stored-only; no invented RF/detector transfer or automatic key-loss waveform/timing/restart. The full harness intentionally exits nonzero when these unresolved physical gaps are listed. Per-field config/apply coverage, unsupported capability and final frozen source identity must be reported separately; a nonzero limitation report cannot be called full GREEN.
