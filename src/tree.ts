import { Position } from './types';

export class Tree {
  position: Position;
  width: number;
  height: number;
  image?: HTMLImageElement; // Optional image for future use
  static sharedImage: HTMLImageElement | null = null; // Shared image for all trees

  constructor(x: number, y: number, width: number = 40, height: number = 60, image?: HTMLImageElement) {
    this.position = { x, y };
    this.width = width;
    this.height = height;
    this.image = image || Tree.sharedImage || undefined;
  }

  static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        Tree.sharedImage = img;
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Check if tree is off screen (above viewport)
  isOffScreen(cameraY: number): boolean {
    return this.position.y < cameraY - 100; // Add buffer
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const imageToUse = this.image || Tree.sharedImage;
    if (imageToUse && imageToUse.complete && imageToUse.naturalWidth > 0) {
      // Draw image if available
      ctx.drawImage(imageToUse, this.position.x - this.width / 2, this.position.y - this.height, this.width, this.height);
    } else {
      // Draw simple tree shape
      // Trunk (brown rectangle)
      ctx.fillStyle = '#8B4513'; // Brown
      const trunkWidth = this.width * 0.3;
      const trunkHeight = this.height * 0.4;
      ctx.fillRect(
        this.position.x - trunkWidth / 2,
        this.position.y - trunkHeight,
        trunkWidth,
        trunkHeight
      );

      // Foliage (green triangle/circle)
      ctx.fillStyle = '#228B22'; // Forest green
      ctx.beginPath();
      const foliageRadius = this.width * 0.5;
      ctx.arc(
        this.position.x,
        this.position.y - trunkHeight - foliageRadius * 0.5,
        foliageRadius,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Add a second smaller circle for depth
      ctx.fillStyle = '#32CD32'; // Lime green
      ctx.beginPath();
      ctx.arc(
        this.position.x - foliageRadius * 0.3,
        this.position.y - trunkHeight - foliageRadius * 0.7,
        foliageRadius * 0.6,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
}

