import type {
  Dme320Command,
  Dme320CommandResult,
  Dme320SimulationState,
} from "../domain/types";
import type { Dme320DialogId, Dme320ScreenId } from "./navigation";

export type Dme320Dispatch = (command: Dme320Command) => Dme320CommandResult;
export type Dme320AdvanceBy = (elapsedMs: number) => Dme320CommandResult | void;
export type Dme320SyncClock = () => Dme320CommandResult | void;

export interface Dme320ScreenHostProps {
  screenId: Dme320ScreenId;
  simulation: Dme320SimulationState;
  dispatch: Dme320Dispatch;
  advanceBy: Dme320AdvanceBy;
  syncClock: Dme320SyncClock;
  navigate: (screenId: Dme320ScreenId) => void;
  openDialog: (dialogId: Dme320DialogId) => void;
}

export type Dme320ScreenProps = Dme320ScreenHostProps;
