export const GAME_CONFIG = {
  canvasWidth: 800,
  canvasHeight: 600,
  defaultTargetDistance: 5000,
  baseScrollSpeed: 1.45,
  maxSpeedIncreaseFactor: 0.35,
  spawnGap: 220
} as const;

export const CORE_TUNING = {
  consecutivePressWindowMs: 300,
  treeOffscreenBuffer: 100,
  skierSpeed: 1.7,
  skierTurnSpeed: 2.55,
  skierAggressiveTurnSpeed: 5.1,
  closeRangeDistance: 160,
  minCatchup: 0.6,
  maxCatchup: 4.0,
  catchThreshold: 18,
  chaseRampStart: 0.62,
  chaseRampEnd: 0.8,
  snowmanSize: 25,
  snowmanXSpeed: 1.15
} as const;

export const SIMULATION_CONFIG = {
  fixedFps: 60,
  fixedDtFrames: 1,
  treeStartY: 140,
  treeStepY: 75,
  treeEndBuffer: 220,
  leftTreeBaseStart: 0.13,
  rightTreeBaseStart: 0.75,
  treeBaseRange: 0.12,
  treeVariance: 24,
  treeMinXPadding: 20,
  rightTreeYOffset: 14,
  treeWidthBase: 34,
  treeWidthRange: 12,
  treeHeightBase: 52,
  treeHeightRange: 20
} as const;

export const MAX_SCROLL_SPEED_INCREASE =
  GAME_CONFIG.baseScrollSpeed * GAME_CONFIG.maxSpeedIncreaseFactor;
