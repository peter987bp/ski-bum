import { Position, Velocity, Direction } from './types';

export class Skier {
  position: Position;
  velocity: Velocity;
  direction: Direction;
  speed: number;
  turnSpeed: number; // Horizontal movement speed for gentle turns
  aggressiveTurnSpeed: number; // Horizontal movement speed for aggressive turns
  private wasDownLastPress: boolean;
  private lastDownPressTime: number;
  private wasLeftLastPress: boolean;
  private lastLeftPressTime: number;
  private wasRightLastPress: boolean;
  private lastRightPressTime: number;
  private readonly consecutivePressWindow: number = 300; // milliseconds
  static sharedImage: HTMLImageElement | null = null; // Shared image for skier
  width: number = 30; // Skier image width
  height: number = 30; // Skier image height

  constructor(x: number, y: number) {
    this.position = { x, y };
    this.velocity = { vx: 0, vy: 0 };
    this.direction = 'down';
    this.speed = 1.7; // Reduced by 15% (was 2)
    this.turnSpeed = 2.55; // Reduced by 15% (was 3) - Gentle turn speed
    this.aggressiveTurnSpeed = 5.1; // Reduced by 15% (was 6) - Aggressive turn speed (double press)
    this.wasDownLastPress = false;
    this.lastDownPressTime = 0;
    this.wasLeftLastPress = false;
    this.lastLeftPressTime = 0;
    this.wasRightLastPress = false;
    this.lastRightPressTime = 0;
  }

  update(): void {
    // Update position based on velocity
    this.position.x += this.velocity.vx;
    this.position.y += this.velocity.vy;
  }

  setDirection(direction: Direction): void {
    const now = Date.now();
    
    if (direction === 'down') {
      // Check if this is a consecutive down press
      const isConsecutive = this.wasDownLastPress && 
                           (now - this.lastDownPressTime) < this.consecutivePressWindow;
      
      this.wasDownLastPress = true;
      this.lastDownPressTime = now;
      this.direction = direction;
      this.updateVelocity(isConsecutive);
    } else if (direction === 'left') {
      // Check if this is a consecutive left press (aggressive turn)
      const isAggressive = this.wasLeftLastPress && 
                          (now - this.lastLeftPressTime) < this.consecutivePressWindow;
      
      this.wasLeftLastPress = true;
      this.lastLeftPressTime = now;
      this.wasDownLastPress = false; // Reset down tracking
      this.wasRightLastPress = false; // Reset right tracking
      this.direction = direction;
      this.updateVelocity(false, isAggressive);
    } else if (direction === 'right') {
      // Check if this is a consecutive right press (aggressive turn)
      const isAggressive = this.wasRightLastPress && 
                          (now - this.lastRightPressTime) < this.consecutivePressWindow;
      
      this.wasRightLastPress = true;
      this.lastRightPressTime = now;
      this.wasDownLastPress = false; // Reset down tracking
      this.wasLeftLastPress = false; // Reset left tracking
      this.direction = direction;
      this.updateVelocity(false, isAggressive);
    } else {
      // Up - stop
      this.wasDownLastPress = false;
      this.wasLeftLastPress = false;
      this.wasRightLastPress = false;
      this.direction = direction;
      this.updateVelocity(false);
    }
  }

  private updateVelocity(isConsecutiveDown: boolean = false, isAggressiveTurn: boolean = false): void {
    switch (this.direction) {
      case 'left':
        // Use aggressive turn speed if double-pressed, otherwise gentle turn speed
        const leftSpeed = isAggressiveTurn ? this.aggressiveTurnSpeed : this.turnSpeed;
        this.velocity.vx = -leftSpeed;
        this.velocity.vy = this.speed * 0.5; // Slower downward movement when turning
        break;
      case 'right':
        // Use aggressive turn speed if double-pressed, otherwise gentle turn speed
        const rightSpeed = isAggressiveTurn ? this.aggressiveTurnSpeed : this.turnSpeed;
        this.velocity.vx = rightSpeed;
        this.velocity.vy = this.speed * 0.5; // Slower downward movement when turning
        break;
      case 'down':
        this.velocity.vx = 0;
        if (isConsecutiveDown) {
          this.velocity.vy = this.speed * 2; // Faster downward movement on consecutive press
        } else {
          this.velocity.vy = this.speed; // Regular speed on first press
        }
        break;
      case 'up':
        this.velocity.vx = 0;
        this.velocity.vy = 0; // Stop movement
        break;
    }
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
      // Draw image if available
      ctx.drawImage(
        imageToUse, 
        this.position.x - this.width / 2, 
        this.position.y - this.height / 2, 
        this.width, 
        this.height
      );
    } else {
      // Fallback: Simple representation of the skier (black circle)
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

