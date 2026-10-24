import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PmdtLayout } from '@/components/vor/pmdt-layout';
import { useVorPmdtStore } from '@/stores/vor-pmdt-store';

vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn(),back:vi.fn(),prefetch:vi.fn()}),useSearchParams:()=>new URLSearchParams()}));
afterEach(()=>{cleanup();vi.useRealTimers();useVorPmdtStore.getState().reset();});
it('advances the real mounted PMDT protection clock and stops it after unmount',()=>{
  vi.useFakeTimers();
  const store=useVorPmdtStore;
  store.getState().reset();
  expect(store.getState().login('SEC3','THREE')).toBe(true);
  store.getState().setConfigValue('simulation.local',true);
  store.getState().setConfigValue('monitor.votingLogic','OR');
  store.getState().setConfigValue('monitor.calibration.mon1.hz30ModulationScale',70);
  expect(store.getState().applyConfigChanges()).toBe(true);
  const mounted=render(<PmdtLayout />);
  act(()=>vi.advanceTimersByTime(4900));
  expect(store.getState().derived.voting.activeTransmitter).toBe('tx1');
  act(()=>vi.advanceTimersByTime(100));
  expect(store.getState().derived.voting.activeTransmitter).toBe('tx2');
  mounted.unmount();
  const elapsed=store.getState().monitorElapsed;
  act(()=>vi.advanceTimersByTime(10000));
  expect(store.getState().monitorElapsed).toBe(elapsed);
});
