import { Position } from './types';

export class Skier {
  position: Position;
  static sharedImage: HTMLImageElement | null = null;
  width: number = 30;
  height: number = 30;

  constructor(x: number, y: number) {
    this.position = { x, y };
  }

  static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        Skier.sharedImage = img;
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const imageToUse = Skier.sharedImage;
    if (imageToUse && imageToUse.complete && imageToUse.naturalWidth > 0) {
      ctx.drawImage(
        imageToUse,
        this.position.x - this.width / 2,
        this.position.y - this.height / 2,
        this.width,
        this.height
      );
    } else {
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
