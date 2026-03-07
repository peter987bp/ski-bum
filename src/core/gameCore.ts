export type GameIntent = 'none' | 'left' | 'right' | 'down' | 'up';
export type CrashReason = 'tree_collision' | 'snowman_catch';

export interface GameInput {
  intent: GameIntent;
  justPressed: boolean;
}

export interface CoreObstacle {
  type: 'tree';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameCoreConfig {
  worldWidth: number;
  playerStartX: number;
  playerScreenY: number;
  playerWidth: number;
  playerHeight: number;
  targetDistance: number;
  baseScrollSpeed: number;
  maxScrollSpeedIncreaseFactor: number;
  consecutivePressWindowSec: number;
  skierSpeed: number;
  skierTurnSpeed: number;
  skierAggressiveTurnSpeed: number;
  obstacleCullBuffer: number;
  snowmanSpawnGap: number;
  snowmanSize: number;
  snowmanXSpeed: number;
  snowmanCloseRangeDistance: number;
  snowmanMinCatchup: number;
  snowmanMaxCatchup: number;
  snowmanCatchThreshold: number;
  snowmanChaseRampStart: number;
  snowmanChaseRampEnd: number;
}

export interface GameCoreState {
  elapsedSec: number;
  worldOffset: number;
  distanceTraveled: number;
  targetDistance: number;
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
    direction: 'left' | 'right' | 'down' | 'up';
    velocityX: number;
    velocityY: number;
  };
  scroll: {
    startingSpeed: number;
    baseSpeed: number;
    currentSpeed: number;
    maxSpeedIncrease: number;
    isBoosted: boolean;
  };
  snowman: {
    x: number;
    worldY: number;
    size: number;
    xSpeed: number;
  };
  obstacles: CoreObstacle[];
  runComplete: boolean;
  crashed: boolean;
  crashReason: CrashReason | null;
  inputHistory: {
    lastIntent: GameIntent;
    lastDownPressSec: number;
    lastLeftPressSec: number;
    lastRightPressSec: number;
  };
}

export interface CreateInitialGameStateOptions {
  config: GameCoreConfig;
  obstacles: CoreObstacle[];
  worldOffset?: number;
}

const LEGACY_FPS = 60;
const BASE_SCROLL_SPEED_PER_SECOND = 1.45 * LEGACY_FPS;

export function createDefaultGameCoreConfig(overrides: Partial<GameCoreConfig> = {}): GameCoreConfig {
  const worldWidth = overrides.worldWidth ?? 800;
  const playerStartX = overrides.playerStartX ?? worldWidth / 2;

  return {
    worldWidth,
    playerStartX,
    playerScreenY: overrides.playerScreenY ?? 600 / 3,
    playerWidth: overrides.playerWidth ?? 30,
    playerHeight: overrides.playerHeight ?? 30,
    targetDistance: overrides.targetDistance ?? 5000,
    baseScrollSpeed: overrides.baseScrollSpeed ?? BASE_SCROLL_SPEED_PER_SECOND,
    maxScrollSpeedIncreaseFactor: overrides.maxScrollSpeedIncreaseFactor ?? 0.35,
    consecutivePressWindowSec: overrides.consecutivePressWindowSec ?? 0.3,
    skierSpeed: overrides.skierSpeed ?? 1.7 * LEGACY_FPS,
    skierTurnSpeed: overrides.skierTurnSpeed ?? 2.55 * LEGACY_FPS,
    skierAggressiveTurnSpeed: overrides.skierAggressiveTurnSpeed ?? 5.1 * LEGACY_FPS,
    obstacleCullBuffer: overrides.obstacleCullBuffer ?? 100,
    snowmanSpawnGap: overrides.snowmanSpawnGap ?? 220,
    snowmanSize: overrides.snowmanSize ?? 25,
    snowmanXSpeed: overrides.snowmanXSpeed ?? 1.15 * LEGACY_FPS,
    snowmanCloseRangeDistance: overrides.snowmanCloseRangeDistance ?? 160,
    snowmanMinCatchup: overrides.snowmanMinCatchup ?? 0.6 * LEGACY_FPS,
    snowmanMaxCatchup: overrides.snowmanMaxCatchup ?? 4.0 * LEGACY_FPS,
    snowmanCatchThreshold: overrides.snowmanCatchThreshold ?? 18,
    snowmanChaseRampStart: overrides.snowmanChaseRampStart ?? 0.62,
    snowmanChaseRampEnd: overrides.snowmanChaseRampEnd ?? 0.8,
  };
}

export function createInitialGameState(options: CreateInitialGameStateOptions): GameCoreState {
  const { config } = options;
  const worldOffset = options.worldOffset ?? 0;
  const maxScrollSpeedIncrease = config.baseScrollSpeed * config.maxScrollSpeedIncreaseFactor;

  return {
    elapsedSec: 0,
    worldOffset,
    distanceTraveled: worldOffset,
    targetDistance: config.targetDistance,
    player: {
      x: config.playerStartX,
      y: config.playerScreenY,
      width: config.playerWidth,
      height: config.playerHeight,
      direction: 'down',
      velocityX: 0,
      velocityY: config.skierSpeed,
    },
    scroll: {
      startingSpeed: config.baseScrollSpeed,
      baseSpeed: config.baseScrollSpeed,
      currentSpeed: config.baseScrollSpeed,
      maxSpeedIncrease: maxScrollSpeedIncrease,
      isBoosted: false,
    },
    snowman: {
      x: config.playerStartX,
      worldY: worldOffset - config.snowmanSpawnGap,
      size: config.snowmanSize,
      xSpeed: config.snowmanXSpeed,
    },
    obstacles: options.obstacles.slice(),
    runComplete: false,
    crashed: false,
    crashReason: null,
    inputHistory: {
      lastIntent: 'none',
      lastDownPressSec: Number.NEGATIVE_INFINITY,
      lastLeftPressSec: Number.NEGATIVE_INFINITY,
      lastRightPressSec: Number.NEGATIVE_INFINITY,
    },
  };
}

export function stepGame(
  prevState: GameCoreState,
  input: GameInput,
  dtSec: number,
  config: GameCoreConfig
): GameCoreState {
  const dt = sanitizeDt(dtSec);
  const nextElapsed = prevState.elapsedSec + dt;

  let state = {
    ...prevState,
    elapsedSec: nextElapsed,
    player: { ...prevState.player },
    scroll: { ...prevState.scroll },
    snowman: { ...prevState.snowman },
    inputHistory: { ...prevState.inputHistory },
    obstacles: prevState.obstacles,
  };

  state = applyInput(state, input, config);

  if (state.runComplete || state.crashed) {
    state.scroll.currentSpeed = 0;
    return state;
  }

  const distanceProgress = getDistanceProgress(state.distanceTraveled, state.targetDistance);
  const previousBaseSpeed = state.scroll.baseSpeed;
  state.scroll.baseSpeed = state.scroll.startingSpeed + distanceProgress * state.scroll.maxSpeedIncrease;

  if (state.scroll.currentSpeed > 0) {
    const speedMultiplier = previousBaseSpeed > 0 ? state.scroll.currentSpeed / previousBaseSpeed : 1;
    state.scroll.currentSpeed = state.scroll.baseSpeed * speedMultiplier;
  }

  if (state.scroll.currentSpeed > 0) {
    state.worldOffset += state.scroll.currentSpeed * dt;
    state.distanceTraveled = state.worldOffset;
  }

  state.player.x += state.player.velocityX * dt;
  state.player.x = clamp(state.player.x, 0, config.worldWidth);

  state = stepSnowman(state, dt, config);
  if (state.crashed) {
    state.scroll.currentSpeed = 0;
    return state;
  }

  if (hasTreeCollision(state.player, state.obstacles, state.worldOffset)) {
    state.crashed = true;
    state.crashReason = 'tree_collision';
    state.scroll.currentSpeed = 0;
    return state;
  }

  const cullCutoff = state.worldOffset - config.obstacleCullBuffer;
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.y >= cullCutoff);

  if (state.distanceTraveled >= state.targetDistance) {
    state.runComplete = true;
    state.distanceTraveled = state.targetDistance;
    state.worldOffset = state.targetDistance;
    state.scroll.currentSpeed = 0;
  }

  return state;
}

export function stepGameFixed(
  state: GameCoreState,
  input: GameInput,
  fixedDtSec: number,
  steps: number,
  config: GameCoreConfig
): GameCoreState {
  let nextState = state;
  for (let i = 0; i < steps; i += 1) {
    nextState = stepGame(nextState, input, fixedDtSec, config);
    if (nextState.crashed || nextState.runComplete) {
      break;
    }
  }
  return nextState;
}

function applyInput(state: GameCoreState, input: GameInput, config: GameCoreConfig): GameCoreState {
  if (!input.justPressed || input.intent === 'none') {
    return state;
  }

  const now = state.elapsedSec;

  switch (input.intent) {
    case 'left': {
      const isAggressive =
        state.inputHistory.lastIntent === 'left' &&
        (now - state.inputHistory.lastLeftPressSec) <= config.consecutivePressWindowSec;
      state.player.direction = 'left';
      state.player.velocityX = -(isAggressive ? config.skierAggressiveTurnSpeed : config.skierTurnSpeed);
      state.player.velocityY = config.skierSpeed * 0.5;
      state.inputHistory.lastLeftPressSec = now;
      break;
    }
    case 'right': {
      const isAggressive =
        state.inputHistory.lastIntent === 'right' &&
        (now - state.inputHistory.lastRightPressSec) <= config.consecutivePressWindowSec;
      state.player.direction = 'right';
      state.player.velocityX = isAggressive ? config.skierAggressiveTurnSpeed : config.skierTurnSpeed;
      state.player.velocityY = config.skierSpeed * 0.5;
      state.inputHistory.lastRightPressSec = now;
      break;
    }
    case 'down': {
      const isConsecutive =
        state.scroll.isBoosted &&
        (now - state.inputHistory.lastDownPressSec) <= config.consecutivePressWindowSec;
      state.player.direction = 'down';
      state.player.velocityX = 0;
      state.player.velocityY = isConsecutive ? config.skierSpeed * 2 : config.skierSpeed;
      state.scroll.currentSpeed = isConsecutive ? state.scroll.baseSpeed * 2 : state.scroll.baseSpeed;
      state.scroll.isBoosted = true;
      state.inputHistory.lastDownPressSec = now;
      break;
    }
    case 'up': {
      state.player.direction = 'up';
      state.player.velocityX = 0;
      state.player.velocityY = 0;
      state.scroll.currentSpeed = 0;
      break;
    }
  }

  state.inputHistory.lastIntent = input.intent;
  return state;
}

function stepSnowman(state: GameCoreState, dt: number, config: GameCoreConfig): GameCoreState {
  const playerWorldY = state.worldOffset;
  const dx = state.player.x - state.snowman.x;

  if (Math.abs(dx) > 0.001) {
    const stepX = Math.min(state.snowman.xSpeed * dt, Math.abs(dx));
    state.snowman.x += Math.sign(dx) * stepX;
  }

  const safeScrollSpeed = Math.max(0, state.scroll.currentSpeed);
  const gap = playerWorldY - state.snowman.worldY;
  if (gap <= config.snowmanCatchThreshold) {
    state.crashed = true;
    state.crashReason = 'snowman_catch';
    return state;
  }

  const gapFactor = clamp01(1 - gap / config.snowmanCloseRangeDistance);
  const slowFactor = clamp01(1 - safeScrollSpeed / config.baseScrollSpeed);
  const fastFactor = clamp01(safeScrollSpeed / config.baseScrollSpeed);
  const progress = getDistanceProgress(state.distanceTraveled, state.targetDistance);
  const chaseRamp = clamp01((progress - config.snowmanChaseRampStart) / (config.snowmanChaseRampEnd - config.snowmanChaseRampStart));
  const catchupStrength = lerp(0, 1, chaseRamp);
  const catchup = lerp(
    config.snowmanMinCatchup,
    config.snowmanMaxCatchup,
    clamp01(0.65 * gapFactor + 0.35 * slowFactor)
  );

  const chaseSpeed = Math.max(
    0,
    safeScrollSpeed + catchup * catchupStrength * (1 - 0.35 * fastFactor)
  );
  state.snowman.worldY += chaseSpeed * dt;

  if ((playerWorldY - state.snowman.worldY) <= config.snowmanCatchThreshold) {
    state.crashed = true;
    state.crashReason = 'snowman_catch';
  }

  return state;
}

function hasTreeCollision(
  player: GameCoreState['player'],
  obstacles: CoreObstacle[],
  worldOffset: number
): boolean {
  const skierLeft = player.x - player.width / 2;
  const skierRight = player.x + player.width / 2;
  const skierTop = player.y - player.height / 2;
  const skierBottom = player.y + player.height / 2;

  for (const obstacle of obstacles) {
    const obstacleScreenY = obstacle.y - worldOffset;
    const obstacleLeft = obstacle.x - obstacle.width / 2;
    const obstacleRight = obstacle.x + obstacle.width / 2;
    const obstacleTop = obstacleScreenY - obstacle.height;
    const obstacleBottom = obstacleScreenY;

    if (
      skierLeft < obstacleRight &&
      skierRight > obstacleLeft &&
      skierTop < obstacleBottom &&
      skierBottom > obstacleTop
    ) {
      return true;
    }
  }

  return false;
}

function getDistanceProgress(distanceTraveled: number, targetDistance: number): number {
  if (targetDistance <= 0) return 0;
  return clamp01(distanceTraveled / targetDistance);
}

function sanitizeDt(dtSec: number): number {
  if (!Number.isFinite(dtSec) || dtSec <= 0) return 1 / 60;
  return Math.min(0.1, dtSec);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
