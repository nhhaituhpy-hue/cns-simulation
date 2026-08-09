"use client";

import { Dme320HistoryScreen } from "./history-screens";
import { Dme320MainScreen } from "./main-screens";
import { Dme320MaintenanceScreen } from "./maintenance-screens";
import type { Dme320ScreenId } from "./navigation";
import type { Dme320ScreenHostProps } from "./screen-types";
import { Dme320SetupScreen } from "./setup-screens";

const MAIN_SCREENS = new Set<Dme320ScreenId>([
  "home",
  "equipment",
  "transponder",
  "monitor-executive",
  "monitor-standby",
  "monitor-self-test",
  "power",
  "environment",
]);

export function Dme320ScreenHost(props: Dme320ScreenHostProps) {
  if (MAIN_SCREENS.has(props.screenId)) return <Dme320MainScreen {...props} />;
  if (props.screenId.startsWith("setup-")) return <Dme320SetupScreen {...props} />;
  if (props.screenId.startsWith("maintenance-")) return <Dme320MaintenanceScreen {...props} />;
  return <Dme320HistoryScreen {...props} />;
}

export type { Dme320ScreenHostProps } from "./screen-types";
