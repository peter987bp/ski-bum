import { Position } from './types';

export class AbominableSnowman {
  position: Position;
  size: number;
  speed: number; // pixels per frame

  constructor(x: number, y: number, size: number = 25, speed: number = 1.15) {
    this.position = { x, y };
    this.size = size;
    this.speed = speed;
  }

  update(target: Position): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.0001) return;

    // Move a constant amount toward the skier each frame
    const step = Math.min(this.speed, dist);
    this.position.x += (dx / dist) * step;
    this.position.y += (dy / dist) * step;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(
      this.position.x - this.size / 2,
      this.position.y - this.size / 2,
      this.size,
      this.size
    );
  }

  intersectsRect(rect: { x: number; y: number; width: number; height: number }): boolean {
    const leftA = this.position.x - this.size / 2;
    const rightA = this.position.x + this.size / 2;
    const topA = this.position.y - this.size / 2;
    const bottomA = this.position.y + this.size / 2;

    const leftB = rect.x;
    const rightB = rect.x + rect.width;
    const topB = rect.y;
    const bottomB = rect.y + rect.height;

    return leftA < rightB && rightA > leftB && topA < bottomB && bottomA > topB;
  }
}




