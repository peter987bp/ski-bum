import { Position } from './types';
import { CoreSnowmanState } from './core/types.js';

export class AbominableSnowman {
  position: Position;
  worldY: number;
  size: number;

  constructor(x: number, initialWorldY: number, size: number = 25) {
    this.position = { x, y: 0 };
    this.worldY = initialWorldY;
    this.size = size;
  }

  syncFromCore(state: CoreSnowmanState): void {
    this.position.x = state.x;
    this.worldY = state.worldY;
    this.size = state.size;
  }

  /**
   * @deprecated Gameplay stepping is owned by src/core/stepGame.ts.
   */
  update(
    _targetX: number,
    _playerWorldY: number,
    _playerScrollSpeed: number,
    _dt: number,
    _courseProgress: number
  ): boolean {
    throw new Error('AbominableSnowman.update is deprecated. Use core stepGame().');
  }

  /**
   * @deprecated Core state initialization owns snowman spawn positioning.
   */
  reset(_playerWorldY: number, _spawnGap: number): void {
    throw new Error('AbominableSnowman.reset is deprecated. Reinitialize core game state instead.');
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
