export { createInitialGameState, getDistanceProgress, setGameRunning, stepGame } from './stepGame.js';
export { stepBrowserFrame, stepSimulationTick } from './runtimeAdapters.js';
export { CORE_TUNING, GAME_CONFIG, MAX_SCROLL_SPEED_INCREASE, SIMULATION_CONFIG } from './config.js';
export type {
  CoreDirection,
  CoreGameState,
  CoreSkierState,
  CoreSnowmanState,
  CoreTree,
  CreateInitialGameStateOptions,
  StepCommand,
  StepGameInput
} from './types.js';
