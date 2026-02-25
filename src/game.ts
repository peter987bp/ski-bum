import { Skier } from './skier';
import { GameState } from './types';
import { Tree } from './tree';
import { CourseGenerator, Course, CourseObject } from './course';
import { AbominableSnowman } from './abominableSnowman';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private skier: Skier;
  private abominableSnowman: AbominableSnowman;
  private gameState: GameState;
  private animationFrameId: number | null = null;
  private worldOffset: number = 0; // How far we've scrolled
  private baseScrollSpeed: number = 1.7; // Base auto-scroll speed (reduced by 15% from 2)
  private currentScrollSpeed: number = 1.7; // Current scroll speed (can be boosted) (reduced by 15% from 2)
  private isSpeedBoosted: boolean = false; // Track if speed is boosted
  private trees: Tree[] = []; // Array of trees
  private courseGenerator: CourseGenerator; // Course generator
  private currentCourse: Course | null = null; // Current course
  private courseObjects: CourseObject[] = []; // All objects from course
  private useCourseSystem: boolean = true; // Use course system instead of random
  private menuButton: HTMLButtonElement | null = null; // Menu button DOM element
  private retryButton: HTMLButtonElement | null = null; // Retry button DOM element
  private menuOverlay: HTMLDivElement | null = null; // Menu overlay DOM element
  private menuCloseButton: HTMLButtonElement | null = null; // Menu close button DOM element

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }

    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D rendering context');
    }
    this.ctx = ctx;

    // Set canvas size
    this.canvas.width = 800;
    this.canvas.height = 600;

    // Initialize game state
    this.gameState = {
      isRunning: false,
      score: 0,
      level: 1,
      distanceTraveled: 0,
      targetDistance: 5000, // Target distance in pixels (can be adjusted)
      runComplete: false,
      crashed: false
    };

    // Skier stays at fixed screen position (upper third)
    this.skier = new Skier(
      this.canvas.width / 2,  // Center horizontally
      this.canvas.height / 3  // Upper third of screen
    );

    // Abominable snowman starts off-screen and chases the skier (screen space)
    this.abominableSnowman = new AbominableSnowman(
      this.canvas.width / 2,
      this.canvas.height + 80
    );

    // Initialize course generator
    this.courseGenerator = new CourseGenerator(this.canvas.width);
    
    // Load and setup course
    if (this.useCourseSystem) {
      this.loadCourse();
    }
    
    // Load tree image
    this.loadTreeImage();
    // Load skier image
    this.loadSkierImage();

    this.setupEventListeners();
    this.setupMouseListeners();
    
    // Wait for DOM to be ready before setting up buttons
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupMenuButtons();
        this.setupRetryButton();
      });
    } else {
      // DOM is already ready
      this.setupMenuButtons();
      this.setupRetryButton();
    }
  }

  private setupMenuButtons(): void {
    // Get DOM elements
    this.menuButton = document.getElementById('menuButton') as HTMLButtonElement;
    this.menuOverlay = document.getElementById('menuOverlay') as HTMLDivElement;
    this.menuCloseButton = document.getElementById('menuCloseButton') as HTMLButtonElement;

    console.log('Setting up menu buttons:', {
      menuButton: this.menuButton,
      menuButtonExists: !!this.menuButton,
      menuOverlay: this.menuOverlay,
      menuCloseButton: this.menuCloseButton,
      buttonComputedStyle: this.menuButton ? window.getComputedStyle(this.menuButton) : null
    });

    // Simple click handlers - no bounds checking needed!
    if (this.menuButton) {
      // Test if button is actually clickable
      console.log('Menu button found, adding click listener');
      const buttonRect = this.menuButton.getBoundingClientRect();
      console.log('Button position:', buttonRect);
      console.log('Button z-index:', window.getComputedStyle(this.menuButton).zIndex);
      console.log('Button pointer-events:', window.getComputedStyle(this.menuButton).pointerEvents);
      
      // Add multiple event listeners to catch clicks
      this.menuButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('Menu button CLICKED! Event:', e);
        console.log('Button element:', this.menuButton);
        console.log('Menu overlay before toggle:', this.menuOverlay?.style.display);
        this.toggleMenu();
        console.log('Menu overlay after toggle:', this.menuOverlay?.style.display);
      }, true); // Use capture phase to catch event early
      
      // Also try mousedown as backup
      this.menuButton.addEventListener('mousedown', (e) => {
        console.log('Menu button mousedown!');
        e.preventDefault();
        e.stopPropagation();
      });
      
      // Try pointerdown as well
      this.menuButton.addEventListener('pointerdown', (e) => {
        console.log('Menu button pointerdown!');
        e.preventDefault();
        e.stopPropagation();
        this.toggleMenu();
      }, true);
    } else {
      console.error('Menu button not found!');
      console.error('Available elements:', document.querySelectorAll('button'));
    }

    if (this.menuCloseButton) {
      // Use capture phase and multiple event types to ensure it works
      const closeHandler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('Menu close button clicked!');
        this.closeMenu();
      };
      
      this.menuCloseButton.addEventListener('click', closeHandler, true);
      this.menuCloseButton.addEventListener('pointerdown', closeHandler, true);
      this.menuCloseButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    } else {
      console.error('Menu close button not found!');
    }

    // Close menu when clicking overlay background
    if (this.menuOverlay) {
      this.menuOverlay.addEventListener('click', (e) => {
        // Only close if clicking the overlay itself, not the panel or close button
        if (e.target === this.menuOverlay) {
          console.log('Menu overlay clicked, closing menu');
          this.closeMenu();
        }
      });
    } else {
      console.error('Menu overlay not found!');
    }
  }

  private setupRetryButton(): void {
    // Get DOM element
    this.retryButton = document.getElementById('retryButton') as HTMLButtonElement;

    if (this.retryButton) {
      // Add click event listeners similar to menu button
      this.retryButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('Retry button clicked!');
        this.retry();
      }, true); // Use capture phase
      
      // Also add pointerdown for better compatibility
      this.retryButton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Retry button pointerdown!');
        this.retry();
      }, true);
      
      // Also try mousedown as backup
      this.retryButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    } else {
      console.error('Retry button not found!');
    }
  }

  private setupMouseListeners(): void {
    this.canvas.addEventListener('click', (e) => {
      // Check if menu overlay is open - if so, don't handle canvas clicks
      if (this.menuOverlay && window.getComputedStyle(this.menuOverlay).display !== 'none') {
        return; // Let menu overlay handle clicks
      }

      // Don't prevent default if clicking on menu button area
      if (this.menuButton) {
        const buttonRect = this.menuButton.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        // If click is within menu button bounds, let it bubble up to the button
        if (clickX >= buttonRect.left && clickX <= buttonRect.right &&
            clickY >= buttonRect.top && clickY <= buttonRect.bottom) {
          console.log('Canvas click detected on menu button area, allowing button to handle it');
          console.log('Click coords:', { clickX, clickY });
          console.log('Button rect:', buttonRect);
          // Don't prevent default or stop propagation - let button handle it
          return; // Let the button handle the click
        }
      }
      
      // Don't prevent default if clicking on retry button area
      if (this.retryButton && (this.gameState.runComplete || this.gameState.crashed)) {
        const buttonRect = this.retryButton.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        // If click is within retry button bounds, let it bubble up to the button
        if (clickX >= buttonRect.left && clickX <= buttonRect.right &&
            clickY >= buttonRect.top && clickY <= buttonRect.bottom) {
          console.log('Canvas click detected on retry button area, allowing button to handle it');
          return; // Let the button handle the click
        }
      }
      
      e.preventDefault();
      e.stopPropagation();
    });
    
    // Also add pointer events for better compatibility
    this.canvas.addEventListener('pointerdown', (e) => {
      // Check if menu overlay is open - if so, don't handle canvas clicks
      if (this.menuOverlay && window.getComputedStyle(this.menuOverlay).display !== 'none') {
        return; // Let menu overlay handle clicks
      }

      // Don't prevent default if clicking on menu button area
      if (this.menuButton) {
        const buttonRect = this.menuButton.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        // If click is within menu button bounds, let it bubble up to the button
        if (clickX >= buttonRect.left && clickX <= buttonRect.right &&
            clickY >= buttonRect.top && clickY <= buttonRect.bottom) {
          console.log('Canvas pointerdown on menu button area, allowing button to handle it');
          // Don't prevent default - let button handle it
          return; // Let the button handle the click
        }
      }
      
      // Don't prevent default if clicking on retry button area
      if (this.retryButton && (this.gameState.runComplete || this.gameState.crashed)) {
        const buttonRect = this.retryButton.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        // If click is within retry button bounds, let it bubble up to the button
        if (clickX >= buttonRect.left && clickX <= buttonRect.right &&
            clickY >= buttonRect.top && clickY <= buttonRect.bottom) {
          console.log('Canvas pointerdown on retry button area, allowing button to handle it');
          return; // Let the button handle the click
        }
      }
    });
  }

  private closeMenu(): void {
    console.log('=== closeMenu called ===');
    if (!this.menuOverlay) {
      console.error('Menu overlay is null!');
      return;
    }
    
    // Force close the menu
    this.menuOverlay.style.display = 'none';
    this.menuOverlay.style.pointerEvents = 'none'; // Ensure it doesn't block clicks
    console.log('Menu closed - display set to: none');
    
    // Resume game
    if ((this as any).pausedScrollSpeed !== undefined) {
      this.currentScrollSpeed = (this as any).pausedScrollSpeed;
      (this as any).pausedScrollSpeed = 0;
      console.log('Game resumed, scroll speed:', this.currentScrollSpeed);
    }
    
    // Verify the change
    const newDisplay = window.getComputedStyle(this.menuOverlay).display;
    console.log('Menu computed display after close:', newDisplay);
    console.log('=== closeMenu complete ===');
  }

  private toggleMenu(): void {
    console.log('=== toggleMenu called ===');
    if (!this.menuOverlay) {
      console.error('Menu overlay is null!');
      return;
    }
    
    // Check current state - prefer inline style, fallback to computed style
    const inlineDisplay = this.menuOverlay.style.display;
    const computedDisplay = window.getComputedStyle(this.menuOverlay).display;
    const currentDisplay = inlineDisplay || computedDisplay;
    const isOpen = currentDisplay !== 'none' && currentDisplay !== '';
    console.log('Menu inline display:', inlineDisplay);
    console.log('Menu computed display:', computedDisplay);
    console.log('Menu current display:', currentDisplay);
    console.log('Menu is currently:', isOpen ? 'open' : 'closed');
    
    // Toggle menu visibility
    if (isOpen) {
      this.closeMenu();
    } else {
      this.menuOverlay.style.display = 'flex';
      this.menuOverlay.style.pointerEvents = 'auto'; // Allow clicks when visible
      console.log('Opening menu - display set to: flex');
      // Opening menu - pause game
      if (this.currentScrollSpeed > 0) {
        (this as any).pausedScrollSpeed = this.currentScrollSpeed;
        this.currentScrollSpeed = 0;
        console.log('Game paused, scroll speed:', this.currentScrollSpeed);
      }
    }
    
    // Verify the change
    const newDisplay = window.getComputedStyle(this.menuOverlay).display;
    console.log('Menu computed display after toggle:', newDisplay);
    console.log('=== toggleMenu complete ===');
  }

  private retry(): void {
    // Stop current game loop
    this.stop();

    // Reset game state
    this.gameState = {
      isRunning: false,
      score: 0,
      level: 1,
      distanceTraveled: 0,
      targetDistance: 5000,
      runComplete: false,
      crashed: false
    };

    // Reset world
    this.worldOffset = 0;
    this.currentScrollSpeed = this.baseScrollSpeed;
    this.isSpeedBoosted = false;

    // Reset skier position
    this.skier = new Skier(
      this.canvas.width / 2,
      this.canvas.height / 3
    );

    // Reset abominable snowman
    this.abominableSnowman = new AbominableSnowman(
      this.canvas.width / 2,
      this.canvas.height + 80
    );

    // Reload course
    this.trees = [];
    if (this.useCourseSystem) {
      this.loadCourse();
    }

    // Hide retry button
    if (this.retryButton) {
      this.retryButton.style.display = 'none';
    }

    // Small delay to ensure everything is reset, then restart
    setTimeout(() => {
      this.start();
    }, 50);
  }

  private async loadTreeImage(): Promise<void> {
    try {
      // Load tree image from public folder
      // In Vite, files in public/ are served at root, so use /tree.png
      await Tree.loadImage('/tree.png');
    } catch (error) {
      console.warn('Could not load tree image, using programmatic trees:', error);
      // Trees will use programmatic drawing if image fails to load
    }
  }

  private async loadSkierImage(): Promise<void> {
    try {
      // Load skier image from public folder
      // In Vite, files in public/ are served at root, so use /skier-1938543.jpg
      await Skier.loadImage('/skier-1938543.jpg');
    } catch (error) {
      console.warn('Could not load skier image, using fallback circle:', error);
      // Skier will use fallback circle if image fails to load
    }
  }

  private loadCourse(): void {
    // Create the course
    this.currentCourse = this.courseGenerator.createSimpleCourse();
    
    // Get all objects from the course
    this.courseObjects = this.courseGenerator.getAllObjects(this.currentCourse);
    
    // Convert course objects to trees
    this.courseObjects.forEach(obj => {
      if (obj.type === 'tree') {
        const sizeVariation = 0.8 + Math.random() * 0.4;
        const width = obj.width || (40 * sizeVariation);
        const height = obj.height || (60 * sizeVariation);
        const tree = new Tree(obj.x, obj.y, width, height);
        this.trees.push(tree);
      }
      // Add more object types here as needed
    });
    
    // Update target distance to match course length
    this.gameState.targetDistance = this.currentCourse.totalLength;
  }


  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          this.skier.setDirection('left');
          break;
        case 'ArrowRight':
          this.skier.setDirection('right');
          break;
        case 'ArrowDown':
          this.handleSpeedBoost();
          break;
        case 'ArrowUp':
          // Stop scrolling
          this.currentScrollSpeed = 0;
          break;
      }
    });
  }

  private handleSpeedBoost(): void {
    const now = Date.now();
    const lastPressTime = (this as any).lastDownPressTime || 0;
    const consecutivePressWindow = 300; // milliseconds
    
    // Check if this is a consecutive down press
    const isConsecutive = this.isSpeedBoosted && 
                         (now - lastPressTime) < consecutivePressWindow;
    
    if (isConsecutive) {
      // Double press = speed boost
      this.currentScrollSpeed = this.baseScrollSpeed * 2;
      this.isSpeedBoosted = true;
    } else {
      // Single press = regular speed
      this.currentScrollSpeed = this.baseScrollSpeed;
      this.isSpeedBoosted = true;
    }
    
    (this as any).lastDownPressTime = now;
  }

  start(): void {
    if (this.gameState.isRunning) return;
    
    this.gameState.isRunning = true;
    this.gameLoop();
  }

  stop(): void {
    this.gameState.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop(): void {
    if (!this.gameState.isRunning) return;

    this.update();
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    // Don't update game logic when complete or crashed, but still allow UI interactions
    if (this.gameState.runComplete || this.gameState.crashed) {
      // Stop scrolling when complete or crashed
      this.currentScrollSpeed = 0;
      return;
    }

    // World scrolls automatically (unless stopped)
    if (this.currentScrollSpeed > 0) {
      this.worldOffset += this.currentScrollSpeed;
      this.gameState.distanceTraveled = this.worldOffset;
    }

    // Update skier (only horizontal movement)
    // Only update X position, keep Y fixed
    const fixedY = this.skier.position.y;
    this.skier.update();
    this.skier.position.y = fixedY; // Lock Y position

    // Update abominable snowman (chase skier)
    this.abominableSnowman.update(this.skier.position);

    // Check for collisions with trees
    this.checkCollisions();

    // Course system: All objects are pre-loaded, no need to spawn during gameplay
    // The course is already fully generated when the game starts

    // Remove trees that are off screen
    this.trees = this.trees.filter(tree => {
      return !tree.isOffScreen(this.worldOffset);
    });

    // Check if run is complete
    if (this.gameState.distanceTraveled >= this.gameState.targetDistance) {
      this.gameState.runComplete = true;
      this.gameState.distanceTraveled = this.gameState.targetDistance; // Cap at target
    }

    // Keep skier within horizontal bounds only
    if (this.skier.position.x < 0) this.skier.position.x = 0;
    if (this.skier.position.x > this.canvas.width) this.skier.position.x = this.canvas.width;
  }

  private checkCollisions(): void {
    const skierX = this.skier.position.x;
    const skierY = this.skier.position.y;
    
    // Skier bounding box (skier is drawn centered at its position)
    const skierLeft = skierX - this.skier.width / 2;
    const skierRight = skierX + this.skier.width / 2;
    const skierTop = skierY - this.skier.height / 2;
    const skierBottom = skierY + this.skier.height / 2;

    // Abominable snowman collision (screen space)
    if (
      this.abominableSnowman.intersectsRect({
        x: skierLeft,
        y: skierTop,
        width: this.skier.width,
        height: this.skier.height
      })
    ) {
      this.gameState.crashed = true;
      this.currentScrollSpeed = 0;
      return;
    }

    // Check collision with each tree
    for (const tree of this.trees) {
      // Calculate tree's screen position (accounting for camera scroll)
      const treeScreenY = tree.position.y - this.worldOffset;
      
      // Tree bounding box (trees are drawn upward from their Y position)
      const treeLeft = tree.position.x - tree.width / 2;
      const treeRight = tree.position.x + tree.width / 2;
      const treeTop = treeScreenY - tree.height;
      const treeBottom = treeScreenY;

      // Check if skier rectangle intersects with tree rectangle
      if (skierLeft < treeRight && skierRight > treeLeft &&
          skierTop < treeBottom && skierBottom > treeTop) {
        this.gameState.crashed = true;
        this.currentScrollSpeed = 0;
        return;
      }
    }
  }

  private render(): void {
    // Clear canvas
    this.ctx.fillStyle = '#FFFFFF'; // White background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context and apply camera scroll
    this.ctx.save();
    this.ctx.translate(0, -this.worldOffset);

    // Draw scrolling background elements
    this.drawScrollingBackground();

    // Draw trees (they scroll with the world)
    this.trees.forEach(tree => {
      tree.draw(this.ctx);
    });

    // Restore context (skier drawn at fixed position, not affected by scroll)
    this.ctx.restore();

    // Draw skier at FIXED screen position (not affected by camera)
    this.skier.draw(this.ctx);

    // Draw abominable snowman in screen space (not affected by camera)
    this.abominableSnowman.draw(this.ctx);

    // Draw UI (not affected by camera)
    this.drawUI();
  }

  private drawScrollingBackground(): void {
    // Draw ground/snow segments that scroll
    this.ctx.fillStyle = '#F5F5F5'; // Light gray for ground
    const groundHeight = 100;
    const segmentHeight = 200;
    
    // Calculate which segments to draw based on world offset
    const startSegment = Math.floor(this.worldOffset / segmentHeight);
    const endSegment = Math.ceil((this.worldOffset + this.canvas.height) / segmentHeight);
    
    for (let i = startSegment; i <= endSegment; i++) {
      const y = i * segmentHeight;
      this.ctx.fillRect(0, y, this.canvas.width, groundHeight);
      
      // Add subtle line for visual reference
      this.ctx.strokeStyle = '#E0E0E0';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawUI(): void {
    // Menu and retry buttons are now DOM elements - no need to draw them on canvas!
    
    this.ctx.fillStyle = '#000';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Score: ${this.gameState.score}`, 10, 30);
    this.ctx.fillText(`Level: ${this.gameState.level}`, 10, 60);
    
    // Display distance progress
    const distancePercent = Math.min(100, Math.floor((this.gameState.distanceTraveled / this.gameState.targetDistance) * 100));
    this.ctx.fillText(`Distance: ${Math.floor(this.gameState.distanceTraveled)}/${this.gameState.targetDistance} (${distancePercent}%)`, 10, 90);
    
    // Show crash message and retry button
    if (this.gameState.crashed) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      // Draw crash message
      this.ctx.fillStyle = '#AA0000';
      this.ctx.font = 'bold 32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Crashed!', centerX, centerY - 60);

      // Show retry button (DOM element)
      if (this.retryButton) {
        this.retryButton.style.display = 'flex';
      }

      // Reset text alignment
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#000';
      this.ctx.font = '20px Arial';
    }
    // Show completion message and retry button
    else if (this.gameState.runComplete) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      // Draw completion message
      this.ctx.fillStyle = '#00AA00';
      this.ctx.font = 'bold 32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Run Complete!', centerX, centerY - 60);

      // Show retry button (DOM element)
      if (this.retryButton) {
        this.retryButton.style.display = 'flex';
      }

      // Reset text alignment
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#000';
      this.ctx.font = '20px Arial';
    } else {
      // Hide retry button when game is running
      if (this.retryButton) {
        this.retryButton.style.display = 'none';
      }
    }
  }

}










