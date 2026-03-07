import { Position } from './types';
import { BASE_SCROLL_SPEED } from './constants';

const LEGACY_FPS = 60;

// World-space chase tuning (values are per second unless noted)
const CLOSE_RANGE_DISTANCE = 160; // distance behind where catchup ramps in
const MIN_CATCHUP = 0.6 * LEGACY_FPS;
const MAX_CATCHUP = 4.0 * LEGACY_FPS;
const CATCH_THRESHOLD = 18; // world units; when within this, the player is caught
<<<<<<< Updated upstream
const CHASE_RAMP_START = 0.62; // course progress to begin real chase
const CHASE_RAMP_END = 0.8; // course progress to reach full chase
=======
const DEFAULT_X_SPEED = 1.15 * LEGACY_FPS; // pixels per second
>>>>>>> Stashed changes

export class AbominableSnowman {
  position: Position; // screen-space position (x/y)
  worldY: number; // world-space position along the course
  size: number;
  xSpeed: number; // pixels per second for horizontal chase

  constructor(x: number, initialWorldY: number, size: number = 25, xSpeed: number = DEFAULT_X_SPEED) {
    this.position = { x, y: 0 };
    this.worldY = initialWorldY;
    this.size = size;
    this.xSpeed = xSpeed;
  }

  reset(playerWorldY: number, spawnGap: number): void {
    this.worldY = playerWorldY - spawnGap;
  }

<<<<<<< Updated upstream
  update(
    targetX: number,
    playerWorldY: number,
    playerScrollSpeed: number,
    dt: number,
    courseProgress: number
  ): boolean {
=======
  update(targetX: number, playerWorldY: number, playerScrollSpeed: number, dtSec: number): boolean {
>>>>>>> Stashed changes
    // Horizontal chase stays in screen space
    const dx = targetX - this.position.x;
    if (Math.abs(dx) > 0.001) {
      const stepX = Math.min(this.xSpeed * dtSec, Math.abs(dx));
      this.position.x += Math.sign(dx) * stepX;
    }

    // World-space chase along the course
    const safeScrollSpeed = Math.max(0, playerScrollSpeed);
    const gap = playerWorldY - this.worldY;
    if (gap <= CATCH_THRESHOLD) return true;

    const gapFactor = clamp01(1 - gap / CLOSE_RANGE_DISTANCE);
    const slowFactor = clamp01(1 - safeScrollSpeed / BASE_SCROLL_SPEED);
    const fastFactor = clamp01(safeScrollSpeed / BASE_SCROLL_SPEED);
    const chaseRamp = clamp01((courseProgress - CHASE_RAMP_START) / (CHASE_RAMP_END - CHASE_RAMP_START));
    const catchupStrength = lerp(0, 1, chaseRamp);
    const catchup = lerp(MIN_CATCHUP, MAX_CATCHUP, clamp01(0.65 * gapFactor + 0.35 * slowFactor));
    const chaseSpeed = Math.max(0, safeScrollSpeed + catchup * catchupStrength * (1 - 0.35 * fastFactor));

    this.worldY += chaseSpeed * dtSec;

    const newGap = playerWorldY - this.worldY;
    return newGap <= CATCH_THRESHOLD;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    playerWorldY: number,
    skierScreenY: number
  ): void {
    const screenY = skierScreenY + (this.worldY - playerWorldY);
    this.position.y = screenY;

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(
      this.position.x - this.size / 2,
      screenY - this.size / 2,
      this.size,
      this.size
    );
  }

  getWorldY(): number {
    return this.worldY;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
