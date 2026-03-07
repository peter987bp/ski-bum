import { Position } from './types';

export class AbominableSnowman {
  position: Position;
  worldY: number;
  size: number;
  xSpeed: number;

  constructor(x: number, initialWorldY: number, size: number = 25, xSpeed: number = 1.15) {
    this.position = { x, y: 0 };
    this.worldY = initialWorldY;
    this.size = size;
    this.xSpeed = xSpeed;
  }

  reset(playerWorldY: number, spawnGap: number): void {
    this.worldY = playerWorldY - spawnGap;
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
