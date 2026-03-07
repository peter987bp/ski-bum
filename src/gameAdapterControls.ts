import { GameIntent } from './core/gameCore.js';
import { shouldQueueGameplayInput } from './inputPolicy.js';

export interface AdapterInputState {
  isRunning: boolean;
  isMenuPaused: boolean;
  isTerminal: boolean;
  pendingInputs: GameIntent[];
}

export function withMenuOpened(state: AdapterInputState): AdapterInputState {
  return {
    ...state,
    isMenuPaused: true,
    pendingInputs: [],
  };
}

export function withMenuClosed(state: AdapterInputState): AdapterInputState {
  return {
    ...state,
    isMenuPaused: false,
    pendingInputs: [],
  };
}

export function withQueuedGameplayInput(
  state: AdapterInputState,
  intent: GameIntent
): AdapterInputState {
  if (!shouldQueueGameplayInput(state.isRunning, state.isMenuPaused, state.isTerminal)) {
    return state;
  }

  return {
    ...state,
    pendingInputs: [...state.pendingInputs, intent],
  };
}
