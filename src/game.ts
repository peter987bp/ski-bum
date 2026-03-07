import { Skier } from './skier';
import { GameState } from './types';
import { Tree } from './tree';
import { CourseGenerator, Course, CourseObject } from './course';
import { AbominableSnowman } from './abominableSnowman';
import { BASE_SCROLL_SPEED } from './constants';
import {
  CoreObstacle,
  GameCoreConfig,
  GameCoreState,
  GameInput,
  createDefaultGameCoreConfig,
  createInitialGameState,
  stepGame,
} from './core/gameCore';
const SPAWN_GAP = 220; // world units behind the player at spawn

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private skier: Skier;
  private abominableSnowman: AbominableSnowman;
  private gameState: GameState;
  private animationFrameId: number | null = null;
  private worldOffset: number = 0; // How far we've scrolled
  private baseScrollSpeed: number = BASE_SCROLL_SPEED; // Base auto-scroll speed (ramped)
  private currentScrollSpeed: number = BASE_SCROLL_SPEED; // Current scroll speed (can be boosted)
  private readonly startingScrollSpeed: number = BASE_SCROLL_SPEED;
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
  private lastFrameTime: number | null = null; // For normalized dt updates
  private debugHudEnabled: boolean = false;
  private treeDensityMultiplier: number = 1.0;
  private treeDensitySlider: HTMLInputElement | null = null;
  private treeDensityValue: HTMLSpanElement | null = null;
  private debugPanel: HTMLDivElement | null = null;
  private debugPanelBody: HTMLDivElement | null = null;
  private debugPanelToggle: HTMLInputElement | null = null;
  private densityDebounceId: number | null = null;
  private pendingDensityMultiplier: number | null = null;
  private regenAnimationFrameId: number | null = null;
  private coreConfig: GameCoreConfig;
  private coreState: GameCoreState;
  private pendingInput: GameInput = { intent: 'none', justPressed: false };
  private obstacles: CoreObstacle[] = [];

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

    this.coreConfig = createDefaultGameCoreConfig({
      worldWidth: this.canvas.width,
      playerStartX: this.skier.position.x,
      playerScreenY: this.skier.position.y,
      targetDistance: this.gameState.targetDistance,
      // Preserve existing browser feel where base speed was in units/frame.
      baseScrollSpeed: BASE_SCROLL_SPEED * 60,
    });

    // Abominable snowman starts behind the skier in world space
    this.abominableSnowman = new AbominableSnowman(
      this.canvas.width / 2,
      this.worldOffset - SPAWN_GAP
    );

    this.coreState = createInitialGameState({
      config: this.coreConfig,
      obstacles: this.obstacles,
      worldOffset: this.worldOffset,
    });

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
        this.setupDebugPanel();
      });
    } else {
      // DOM is already ready
      this.setupMenuButtons();
      this.setupRetryButton();
      this.setupDebugPanel();
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

  private setupDebugPanel(): void {
    this.debugPanel = document.getElementById('debugPanel') as HTMLDivElement;
    this.debugPanelBody = document.getElementById('debugPanelBody') as HTMLDivElement;
    this.debugPanelToggle = document.getElementById('debugPanelToggle') as HTMLInputElement;
    this.treeDensitySlider = document.getElementById('treeDensitySlider') as HTMLInputElement;
    this.treeDensityValue = document.getElementById('treeDensityValue') as HTMLSpanElement;

    if (!this.debugPanel) {
      console.warn('Debug panel not found!');
      return;
    }

    const isDevHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (this.debugPanelToggle) {
      this.debugPanelToggle.checked = isDevHost;
      this.setDebugPanelCollapsed(!this.debugPanelToggle.checked);
      this.debugPanelToggle.addEventListener('change', () => {
        this.setDebugPanelCollapsed(!this.debugPanelToggle!.checked);
      });
    }

    if (this.treeDensitySlider) {
      this.treeDensitySlider.value = this.treeDensityMultiplier.toFixed(2);
      this.updateTreeDensityReadout(this.treeDensityMultiplier);
      this.treeDensitySlider.addEventListener('input', () => {
        const rawValue = Number.parseFloat(this.treeDensitySlider!.value);
        const density = Number.isFinite(rawValue) ? rawValue : 1.0;
        this.treeDensityMultiplier = density;
        this.updateTreeDensityReadout(density);
        this.scheduleCourseRegeneration(density);
      });
    }
  }

  private setDebugPanelCollapsed(collapsed: boolean): void {
    if (!this.debugPanelBody) return;
    this.debugPanelBody.style.display = collapsed ? 'none' : 'flex';
  }

  private updateTreeDensityReadout(value: number): void {
    if (!this.treeDensityValue) return;
    this.treeDensityValue.textContent = `${value.toFixed(2)}x`;
  }

  private scheduleCourseRegeneration(multiplier: number): void {
    this.pendingDensityMultiplier = multiplier;
    if (this.densityDebounceId !== null) {
      window.clearTimeout(this.densityDebounceId);
    }

    this.densityDebounceId = window.setTimeout(() => {
      this.densityDebounceId = null;
      const density = this.pendingDensityMultiplier ?? this.treeDensityMultiplier;
      this.pendingDensityMultiplier = null;

      if (this.regenAnimationFrameId !== null) {
        cancelAnimationFrame(this.regenAnimationFrameId);
      }

      this.regenAnimationFrameId = requestAnimationFrame(() => {
        this.regenAnimationFrameId = null;
        this.regenerateAheadCourse(density);
      });
    }, 75);
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
    this.baseScrollSpeed = this.startingScrollSpeed;
    this.currentScrollSpeed = this.baseScrollSpeed;
    this.isSpeedBoosted = false;
    this.pendingInput = { intent: 'none', justPressed: false };

    // Reset skier position
    this.skier = new Skier(
      this.canvas.width / 2,
      this.canvas.height / 3
    );

    // Reset abominable snowman
    this.abominableSnowman.position.x = this.canvas.width / 2;
    this.abominableSnowman.reset(this.worldOffset, SPAWN_GAP);

    // Reload course
    this.trees = [];
    if (this.useCourseSystem) {
      this.loadCourse();
    }

    this.resetCoreState(this.gameState.targetDistance, this.obstacles);

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
    this.currentCourse = this.courseGenerator.createSimpleCourse(this.treeDensityMultiplier);
    
    // Get all objects from the course
    this.courseObjects = this.courseGenerator.getAllObjects(this.currentCourse);
    
    const obstacleData = this.buildObstacleDataFromObjects(this.courseObjects);
    this.trees = obstacleData.trees;
    this.obstacles = obstacleData.obstacles;
    
    // Update target distance to match course length
    this.gameState.targetDistance = this.currentCourse.totalLength;
    this.resetCoreState(this.gameState.targetDistance, this.obstacles);
  }

  private buildObstacleDataFromObjects(objects: CourseObject[]): { trees: Tree[]; obstacles: CoreObstacle[] } {
    const trees: Tree[] = [];
    const obstacles: CoreObstacle[] = [];

    objects.forEach(obj => {
      if (obj.type === 'tree') {
        const sizeVariation = 0.8 + Math.random() * 0.4;
        const width = obj.width || (40 * sizeVariation);
        const height = obj.height || (60 * sizeVariation);
        const tree = new Tree(obj.x, obj.y, width, height);
        trees.push(tree);
        obstacles.push({
          type: 'tree',
          x: obj.x,
          y: obj.y,
          width,
          height,
        });
      }
      // Add more object types here as needed
    });

    return { trees, obstacles };
  }

  private regenerateAheadCourse(multiplier: number): void {
    if (!this.useCourseSystem || !this.currentCourse) return;

    const cutoffWorldY = Math.max(0, this.worldOffset - 200);
    const keptObjects = this.courseObjects.filter(obj => obj.y <= cutoffWorldY);
    const keptTrees = this.trees.filter(tree => tree.position.y <= cutoffWorldY);

    const newCourse = this.courseGenerator.createSimpleCourse(multiplier);
    const newCourseObjects = this.courseGenerator.getAllObjects(newCourse);
    const aheadObjects = newCourseObjects.filter(obj => obj.y > cutoffWorldY);
    const aheadData = this.buildObstacleDataFromObjects(aheadObjects);

    this.courseObjects = [...keptObjects, ...aheadObjects];
    this.trees = [...keptTrees, ...aheadData.trees];
    this.obstacles = this.trees.map((tree) => ({
      type: 'tree',
      x: tree.position.x,
      y: tree.position.y,
      width: tree.width,
      height: tree.height,
    }));
    this.currentCourse = newCourse;
    this.gameState.targetDistance = newCourse.totalLength;
    this.resetCoreState(this.gameState.targetDistance, this.obstacles);
  }

  private resetCoreState(targetDistance: number, obstacles: CoreObstacle[]): void {
    this.coreConfig = createDefaultGameCoreConfig({
      ...this.coreConfig,
      targetDistance,
    });
    this.coreState = createInitialGameState({
      config: this.coreConfig,
      obstacles,
      worldOffset: this.worldOffset,
    });
    this.syncLegacyViewState();
  }


  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          this.queueInput('left');
          break;
        case 'ArrowRight':
          this.queueInput('right');
          break;
        case 'ArrowDown':
          this.queueInput('down');
          break;
        case 'ArrowUp':
          this.queueInput('up');
          break;
        case 'h':
        case 'H':
          this.debugHudEnabled = !this.debugHudEnabled;
          break;
      }
    });
  }

  private queueInput(intent: GameInput['intent']): void {
    this.pendingInput = { intent, justPressed: true };
  }

  start(): void {
    if (this.gameState.isRunning) return;

    this.gameState.isRunning = true;
    this.lastFrameTime = null;
    this.gameLoop();
  }

  stop(): void {
    this.gameState.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop(timestamp: number = performance.now()): void {
    if (!this.gameState.isRunning) return;

    let dtSec = 1 / 60;
    if (this.lastFrameTime !== null) {
      const deltaMs = timestamp - this.lastFrameTime;
      dtSec = Math.min(0.1, deltaMs / 1000);
    }
    this.lastFrameTime = timestamp;

    this.update(dtSec);
    this.render();

    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(dtSec: number): void {
    this.coreState = stepGame(this.coreState, this.pendingInput, dtSec, this.coreConfig);
    this.pendingInput = { intent: 'none', justPressed: false };
    this.syncLegacyViewState();
    this.trees = this.trees.filter(tree => !tree.isOffScreen(this.worldOffset));
  }

  private syncLegacyViewState(): void {
    this.worldOffset = this.coreState.worldOffset;
    this.baseScrollSpeed = this.coreState.scroll.baseSpeed;
    this.currentScrollSpeed = this.coreState.scroll.currentSpeed;
    this.isSpeedBoosted = this.coreState.scroll.isBoosted;
    this.gameState.distanceTraveled = this.coreState.distanceTraveled;
    this.gameState.targetDistance = this.coreState.targetDistance;
    this.gameState.runComplete = this.coreState.runComplete;
    this.gameState.crashed = this.coreState.crashed;
    this.skier.position.x = this.coreState.player.x;
    this.skier.position.y = this.coreState.player.y;
    this.abominableSnowman.position.x = this.coreState.snowman.x;
    this.abominableSnowman.worldY = this.coreState.snowman.worldY;
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
    this.abominableSnowman.draw(this.ctx, this.worldOffset, this.skier.position.y);

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

    this.drawDebugHud();
  }

  private drawDebugHud(): void {
    if (!this.debugHudEnabled) return;

    const playerWorldY = this.worldOffset;
    const snowmanWorldY = this.abominableSnowman.getWorldY();
    const snowmanGap = Math.round(playerWorldY - snowmanWorldY);
    const sectionName = this.currentCourse
      ? this.courseGenerator.getSectionNameAt(this.gameState.distanceTraveled, this.currentCourse)
      : '(unknown)';

    const lines = [
      `Snowman gap: ${snowmanGap}`,
      `Section: ${sectionName || '(unknown)'}`,
      `Base speed: ${this.baseScrollSpeed.toFixed(2)}`,
      `Current speed: ${this.currentScrollSpeed.toFixed(2)}`,
      `Boosted: ${this.isSpeedBoosted ? 'true' : 'false'}`
    ];

    const padding = 10;
    const lineHeight = 16;
    const margin = 10;

    this.ctx.save();
    this.ctx.font = '12px monospace';
    this.ctx.textBaseline = 'top';

    let maxWidth = 0;
    for (const line of lines) {
      const width = this.ctx.measureText(line).width;
      if (width > maxWidth) maxWidth = width;
    }

    const panelWidth = maxWidth + padding * 2;
    const panelHeight = lines.length * lineHeight + padding * 2;
    const panelX = this.canvas.width - panelWidth - margin;
    const panelY = margin;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    this.ctx.fillStyle = '#FFFFFF';
    let textY = panelY + padding;
    for (const line of lines) {
      this.ctx.fillText(line, panelX + padding, textY);
      textY += lineHeight;
    }

    this.ctx.restore();
  }

}
