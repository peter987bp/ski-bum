export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface GameState {
  isRunning: boolean;
  score: number;
  level: number;
  distanceTraveled: number;
  targetDistance: number;
  runComplete: boolean;
  crashed: boolean;
}

export type Direction = 'left' | 'right' | 'down' | 'up';

export interface Obstacle {
  position: Position;
  width: number;
  height: number;
}

