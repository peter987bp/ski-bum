import { Position } from './types';
import { BASE_SCROLL_SPEED } from './constants';

// World-space chase tuning (values assume ~60 FPS; dt is normalized to 60fps)
const CLOSE_RANGE_DISTANCE = 160; // distance behind where catchup ramps in
const MIN_CATCHUP = 0.6;
const MAX_CATCHUP = 4.0;
const CATCH_THRESHOLD = 18; // world units; when within this, the player is caught

export class AbominableSnowman {
  position: Position; // screen-space position (x/y)
  worldY: number; // world-space position along the course
  size: number;
  xSpeed: number; // pixels per frame for horizontal chase

  constructor(x: number, initialWorldY: number, size: number = 25, xSpeed: number = 1.15) {
    this.position = { x, y: 0 };
    this.worldY = initialWorldY;
    this.size = size;
    this.xSpeed = xSpeed;
  }

  reset(playerWorldY: number, spawnGap: number): void {
    this.worldY = playerWorldY - spawnGap;
  }

  update(targetX: number, playerWorldY: number, playerScrollSpeed: number, dt: number): boolean {
    // Horizontal chase stays in screen space
    const dx = targetX - this.position.x;
    if (Math.abs(dx) > 0.001) {
      const stepX = Math.min(this.xSpeed * dt, Math.abs(dx));
      this.position.x += Math.sign(dx) * stepX;
    }

    // World-space chase along the course
    const safeScrollSpeed = Math.max(0, playerScrollSpeed);
    const gap = playerWorldY - this.worldY;
    if (gap <= CATCH_THRESHOLD) return true;

    const gapFactor = clamp01(1 - gap / CLOSE_RANGE_DISTANCE);
    const slowFactor = clamp01(1 - safeScrollSpeed / BASE_SCROLL_SPEED);
    const fastFactor = clamp01(safeScrollSpeed / BASE_SCROLL_SPEED);
    const catchup = lerp(MIN_CATCHUP, MAX_CATCHUP, clamp01(0.65 * gapFactor + 0.35 * slowFactor));
    const chaseSpeed = Math.max(0, safeScrollSpeed + catchup * (1 - 0.35 * fastFactor));

    this.worldY += chaseSpeed * dt;

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
