import { BASE_SCROLL_SPEED } from '../constants.js';
import {
  CoreGameState,
  CreateInitialGameStateOptions,
  StepCommand,
  StepGameInput
} from './types.js';

const CONSECUTIVE_PRESS_WINDOW_MS = 300;
const SKIER_SPEED = 1.7;
const SKIER_TURN_SPEED = 2.55;
const SKIER_AGGRESSIVE_TURN_SPEED = 5.1;
const TREE_OFFSCREEN_BUFFER = 100;

const CLOSE_RANGE_DISTANCE = 160;
const MIN_CATCHUP = 0.6;
const MAX_CATCHUP = 4.0;
const CATCH_THRESHOLD = 18;
const CHASE_RAMP_START = 0.62;
const CHASE_RAMP_END = 0.8;

export function createInitialGameState(options: CreateInitialGameStateOptions): CoreGameState {
  const initialWorldOffset = options.initialWorldOffset ?? 0;
  const spawnGap = options.spawnGap ?? 220;

  return {
    isRunning: false,
    score: 0,
    level: 1,
    distanceTraveled: initialWorldOffset,
    targetDistance: options.targetDistance,
    runComplete: false,
    crashed: false,
    crashCount: 0,
    worldOffset: initialWorldOffset,
    baseScrollSpeed: options.startingScrollSpeed,
    currentScrollSpeed: options.startingScrollSpeed,
    startingScrollSpeed: options.startingScrollSpeed,
    maxScrollSpeedIncrease: options.maxScrollSpeedIncrease,
    isSpeedBoosted: false,
    lastBoostPressTime: 0,
    canvasWidth: options.canvasWidth,
    canvasHeight: options.canvasHeight,
    trees: [...(options.trees ?? [])],
    skier: {
      x: options.canvasWidth / 2,
      y: options.canvasHeight / 3,
      width: 30,
      height: 30,
      vx: 0,
      vy: SKIER_SPEED,
      direction: 'down',
      wasDownLastPress: false,
      lastDownPressTime: 0,
      wasLeftLastPress: false,
      lastLeftPressTime: 0,
      wasRightLastPress: false,
      lastRightPressTime: 0
    },
    snowman: {
      x: options.canvasWidth / 2,
      worldY: initialWorldOffset - spawnGap,
      size: 25,
      xSpeed: 1.15
    }
  };
}

export function stepGame(
  state: CoreGameState,
  input: StepGameInput,
  dtFrames: number,
  _rng?: () => number
): CoreGameState {
  const dt = Math.max(0, dtFrames);
  const next: CoreGameState = {
    ...state,
    skier: { ...state.skier },
    snowman: { ...state.snowman }
  };

  if (next.runComplete || next.crashed) {
    next.currentScrollSpeed = 0;
    return next;
  }

  for (const command of input.commands ?? []) {
    applyDirectionCommand(next, command);
  }

  const distanceProgress = getDistanceProgress(next);
  const previousBaseSpeed = next.baseScrollSpeed;

  next.baseScrollSpeed = next.startingScrollSpeed + (distanceProgress * next.maxScrollSpeedIncrease);

  if (next.currentScrollSpeed > 0) {
    const speedMultiplier = previousBaseSpeed > 0 ? next.currentScrollSpeed / previousBaseSpeed : 1;
    next.currentScrollSpeed = next.baseScrollSpeed * speedMultiplier;
  }

  if (next.currentScrollSpeed > 0) {
    next.worldOffset += next.currentScrollSpeed * dt;
    next.distanceTraveled = next.worldOffset;
  }

  next.skier.x += next.skier.vx * dt;
  next.skier.y = state.skier.y;

  if (next.skier.x < 0) next.skier.x = 0;
  if (next.skier.x > next.canvasWidth) next.skier.x = next.canvasWidth;

  const snowmanCaught = updateSnowman(
    next.snowman,
    next.skier.x,
    next.worldOffset,
    next.currentScrollSpeed,
    dt,
    distanceProgress
  );

  if (snowmanCaught) {
    next.crashed = true;
    next.crashCount += 1;
    next.currentScrollSpeed = 0;
    return next;
  }

  if (hasTreeCollision(next)) {
    next.crashed = true;
    next.crashCount += 1;
    next.currentScrollSpeed = 0;
    return next;
  }

  next.trees = next.trees.filter((tree) => tree.y >= next.worldOffset - TREE_OFFSCREEN_BUFFER);

  if (next.distanceTraveled >= next.targetDistance) {
    next.runComplete = true;
    next.distanceTraveled = next.targetDistance;
  }

  return next;
}

export function getDistanceProgress(state: CoreGameState): number {
  if (state.targetDistance <= 0) return 0;
  return Math.min(1, Math.max(0, state.distanceTraveled / state.targetDistance));
}

function applyDirectionCommand(state: CoreGameState, command: StepCommand): void {
  const atMs = Number.isFinite(command.atMs) ? command.atMs : 0;
  const skier = state.skier;

  switch (command.direction) {
    case 'down': {
      const boostConsecutive = state.isSpeedBoosted &&
        (atMs - state.lastBoostPressTime) < CONSECUTIVE_PRESS_WINDOW_MS;
      state.currentScrollSpeed = boostConsecutive
        ? state.baseScrollSpeed * 2
        : state.baseScrollSpeed;
      state.isSpeedBoosted = true;
      state.lastBoostPressTime = atMs;

      const isConsecutiveDown = skier.wasDownLastPress &&
        (atMs - skier.lastDownPressTime) < CONSECUTIVE_PRESS_WINDOW_MS;
      skier.wasDownLastPress = true;
      skier.lastDownPressTime = atMs;
      skier.direction = 'down';
      skier.vx = 0;
      skier.vy = isConsecutiveDown ? SKIER_SPEED * 2 : SKIER_SPEED;
      return;
    }
    case 'left': {
      const isAggressive = skier.wasLeftLastPress &&
        (atMs - skier.lastLeftPressTime) < CONSECUTIVE_PRESS_WINDOW_MS;
      skier.wasLeftLastPress = true;
      skier.lastLeftPressTime = atMs;
      skier.wasDownLastPress = false;
      skier.wasRightLastPress = false;
      skier.direction = 'left';
      skier.vx = -(isAggressive ? SKIER_AGGRESSIVE_TURN_SPEED : SKIER_TURN_SPEED);
      skier.vy = SKIER_SPEED * 0.5;
      return;
    }
    case 'right': {
      const isAggressive = skier.wasRightLastPress &&
        (atMs - skier.lastRightPressTime) < CONSECUTIVE_PRESS_WINDOW_MS;
      skier.wasRightLastPress = true;
      skier.lastRightPressTime = atMs;
      skier.wasDownLastPress = false;
      skier.wasLeftLastPress = false;
      skier.direction = 'right';
      skier.vx = isAggressive ? SKIER_AGGRESSIVE_TURN_SPEED : SKIER_TURN_SPEED;
      skier.vy = SKIER_SPEED * 0.5;
      return;
    }
    case 'up': {
      skier.wasDownLastPress = false;
      skier.wasLeftLastPress = false;
      skier.wasRightLastPress = false;
      skier.direction = 'up';
      skier.vx = 0;
      skier.vy = 0;
      state.currentScrollSpeed = 0;
      return;
    }
    default: {
      const exhaustiveCheck: never = command.direction;
      throw new Error(`Unsupported direction: ${String(exhaustiveCheck)}`);
    }
  }
}

function hasTreeCollision(state: CoreGameState): boolean {
  const skierLeft = state.skier.x - state.skier.width / 2;
  const skierRight = state.skier.x + state.skier.width / 2;
  const skierTop = state.skier.y - state.skier.height / 2;
  const skierBottom = state.skier.y + state.skier.height / 2;

  for (const tree of state.trees) {
    const treeScreenY = tree.y - state.worldOffset;
    const treeLeft = tree.x - tree.width / 2;
    const treeRight = tree.x + tree.width / 2;
    const treeTop = treeScreenY - tree.height;
    const treeBottom = treeScreenY;

    if (
      skierLeft < treeRight &&
      skierRight > treeLeft &&
      skierTop < treeBottom &&
      skierBottom > treeTop
    ) {
      return true;
    }
  }

  return false;
}

function updateSnowman(
  snowman: CoreGameState['snowman'],
  targetX: number,
  playerWorldY: number,
  playerScrollSpeed: number,
  dt: number,
  courseProgress: number
): boolean {
  const dx = targetX - snowman.x;
  if (Math.abs(dx) > 0.001) {
    const stepX = Math.min(snowman.xSpeed * dt, Math.abs(dx));
    snowman.x += Math.sign(dx) * stepX;
  }

  const safeScrollSpeed = Math.max(0, playerScrollSpeed);
  const gap = playerWorldY - snowman.worldY;
  if (gap <= CATCH_THRESHOLD) return true;

  const gapFactor = clamp01(1 - gap / CLOSE_RANGE_DISTANCE);
  const slowFactor = clamp01(1 - safeScrollSpeed / BASE_SCROLL_SPEED);
  const fastFactor = clamp01(safeScrollSpeed / BASE_SCROLL_SPEED);
  const chaseRamp = clamp01((courseProgress - CHASE_RAMP_START) / (CHASE_RAMP_END - CHASE_RAMP_START));
  const catchupStrength = lerp(0, 1, chaseRamp);
  const catchup = lerp(MIN_CATCHUP, MAX_CATCHUP, clamp01(0.65 * gapFactor + 0.35 * slowFactor));
  const chaseSpeed = Math.max(0, safeScrollSpeed + catchup * catchupStrength * (1 - 0.35 * fastFactor));

  snowman.worldY += chaseSpeed * dt;

  return (playerWorldY - snowman.worldY) <= CATCH_THRESHOLD;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
