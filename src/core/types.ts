import { Direction, GameState } from '../types.js';

export type CoreDirection = Direction;

export interface CoreTree {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoreSkierState {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  direction: CoreDirection;
  wasDownLastPress: boolean;
  lastDownPressTime: number;
  wasLeftLastPress: boolean;
  lastLeftPressTime: number;
  wasRightLastPress: boolean;
  lastRightPressTime: number;
}

export interface CoreSnowmanState {
  x: number;
  worldY: number;
  size: number;
  xSpeed: number;
}

export interface CoreGameState extends GameState {
  crashCount: number;
  worldOffset: number;
  baseScrollSpeed: number;
  currentScrollSpeed: number;
  startingScrollSpeed: number;
  maxScrollSpeedIncrease: number;
  isSpeedBoosted: boolean;
  lastBoostPressTime: number;
  canvasWidth: number;
  canvasHeight: number;
  trees: CoreTree[];
  skier: CoreSkierState;
  snowman: CoreSnowmanState;
}

export interface StepCommand {
  direction: CoreDirection;
  atMs: number;
}

export interface StepGameInput {
  commands?: StepCommand[];
}

export interface CreateInitialGameStateOptions {
  canvasWidth: number;
  canvasHeight: number;
  targetDistance: number;
  trees?: CoreTree[];
  initialWorldOffset?: number;
  spawnGap?: number;
  startingScrollSpeed: number;
  maxScrollSpeedIncrease: number;
}
