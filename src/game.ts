import { Skier } from './skier';
import { GameState } from './types';
import { Tree } from './tree';
import { CourseGenerator, Course, CourseObject } from './course';
import { AbominableSnowman } from './abominableSnowman';
import { BASE_SCROLL_SPEED } from './constants';
import { GAME_CONFIG } from './core/config.js';
import {
  CoreObstacle,
  GameCoreConfig,
  GameCoreState,
  GameIntent,
  createDefaultGameCoreConfig,
  createInitialGameState,
} from './core/gameCore';
import { buildCoreObstaclesFromCourseObjects } from './core/progression';
import { withMenuClosed, withMenuOpened, withQueuedGameplayInput } from './gameAdapterControls';
import { applyGameAdapterFixedStep, createGameCourseProgression } from './gameAdapterRuntime';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private skier: Skier;
  private abominableSnowman: AbominableSnowman;
  private gameState: GameState;
  private animationFrameId: number | null = null;
  private worldOffset: number = 0;
  private baseScrollSpeed: number = BASE_SCROLL_SPEED;
  private currentScrollSpeed: number = BASE_SCROLL_SPEED;
  private readonly startingScrollSpeed: number = BASE_SCROLL_SPEED;
  private isSpeedBoosted: boolean = false;
  private trees: Tree[] = [];
  private courseGenerator: CourseGenerator;
  private currentCourse: Course | null = null;
  private courseObjects: CourseObject[] = [];
  private useCourseSystem: boolean = true;
  private menuButton: HTMLButtonElement | null = null;
  private retryButton: HTMLButtonElement | null = null;
  private menuOverlay: HTMLDivElement | null = null;
  private menuCloseButton: HTMLButtonElement | null = null;
  private lastFrameTime: number | null = null;
  private fixedStepSec: number = 1 / 60;
  private maxFrameSec: number = 0.25;
  private accumulatorSec: number = 0;
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
  private pendingInputs: GameIntent[] = [];
  private obstacles: CoreObstacle[] = [];
  private isMenuPaused: boolean = false;
  private readonly rng: () => number;

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

    this.canvas.width = GAME_CONFIG.canvasWidth;
    this.canvas.height = GAME_CONFIG.canvasHeight;

    this.gameState = {
      isRunning: false,
      score: 0,
      level: 1,
      distanceTraveled: 0,
      targetDistance: GAME_CONFIG.defaultTargetDistance,
      runComplete: false,
      crashed: false,
    };

    this.skier = new Skier(this.canvas.width / 2, this.canvas.height / 3);

    this.coreConfig = createDefaultGameCoreConfig({
      worldWidth: this.canvas.width,
      playerStartX: this.skier.position.x,
      playerScreenY: this.skier.position.y,
      targetDistance: this.gameState.targetDistance,
      baseScrollSpeed: BASE_SCROLL_SPEED * 60,
    });

    this.abominableSnowman = new AbominableSnowman(
      this.canvas.width / 2,
      this.worldOffset - GAME_CONFIG.spawnGap
    );

    this.coreState = createInitialGameState({
      config: this.coreConfig,
      obstacles: this.obstacles,
      worldOffset: this.worldOffset,
    });

    const initialProgression = createGameCourseProgression(
      window.location.search,
      this.canvas.width,
      this.treeDensityMultiplier
    );
    this.rng = initialProgression.rng;
    this.courseGenerator = new CourseGenerator(this.canvas.width, this.rng);

    if (this.useCourseSystem) {
      this.loadCourse();
    }

    this.loadTreeImage();
    this.loadSkierImage();

    this.setupEventListeners();
    this.setupMouseListeners();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupMenuButtons();
        this.setupRetryButton();
        this.setupDebugPanel();
      });
    } else {
      this.setupMenuButtons();
      this.setupRetryButton();
      this.setupDebugPanel();
    }
  }

  private setupMenuButtons(): void {
    this.menuButton = document.getElementById('menuButton') as HTMLButtonElement;
    this.menuOverlay = document.getElementById('menuOverlay') as HTMLDivElement;
    this.menuCloseButton = document.getElementById('menuCloseButton') as HTMLButtonElement;

    if (this.menuButton) {
      this.menuButton.addEventListener(
        'click',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.toggleMenu();
        },
        true
      );

      this.menuButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      this.menuButton.addEventListener(
        'pointerdown',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleMenu();
        },
        true
      );
    }

    if (this.menuCloseButton) {
      const closeHandler = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.closeMenu();
      };

      this.menuCloseButton.addEventListener('click', closeHandler, true);
      this.menuCloseButton.addEventListener('pointerdown', closeHandler, true);
      this.menuCloseButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    if (this.menuOverlay) {
      this.menuOverlay.addEventListener('click', (e) => {
        if (e.target === this.menuOverlay) {
          this.closeMenu();
        }
      });
    }
  }

  private setupRetryButton(): void {
    this.retryButton = document.getElementById('retryButton') as HTMLButtonElement;

    if (this.retryButton) {
      this.retryButton.addEventListener(
        'click',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.retry();
        },
        true
      );

      this.retryButton.addEventListener(
        'pointerdown',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.retry();
        },
        true
      );

      this.retryButton.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }
  }

  private setupDebugPanel(): void {
    this.debugPanel = document.getElementById('debugPanel') as HTMLDivElement;
    this.debugPanelBody = document.getElementById('debugPanelBody') as HTMLDivElement;
    this.debugPanelToggle = document.getElementById('debugPanelToggle') as HTMLInputElement;
    this.treeDensitySlider = document.getElementById('treeDensitySlider') as HTMLInputElement;
    this.treeDensityValue = document.getElementById('treeDensityValue') as HTMLSpanElement;

    if (!this.debugPanel) return;

    const isDevHost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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
      if (this.menuOverlay && window.getComputedStyle(this.menuOverlay).display !== 'none') {
        return;
      }

      if (this.menuButton) {
        const buttonRect = this.menuButton.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        if (
          clickX >= buttonRect.left &&
          clickX <= buttonRect.right &&
          clickY >= buttonRect.top &&
          clickY <= buttonRect.bottom
        ) {
          return;
        }
      }

      if (this.retryButton && (this.gameState.runComplete || this.gameState.crashed)) {
        const buttonRect = this.retryButton.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        if (
          clickX >= buttonRect.left &&
          clickX <= buttonRect.right &&
          clickY >= buttonRect.top &&
          clickY <= buttonRect.bottom
        ) {
          return;
        }
      }

      e.preventDefault();
      e.stopPropagation();
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.menuOverlay && window.getComputedStyle(this.menuOverlay).display !== 'none') {
        return;
      }

      if (this.menuButton) {
        const buttonRect = this.menuButton.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        if (
          clickX >= buttonRect.left &&
          clickX <= buttonRect.right &&
          clickY >= buttonRect.top &&
          clickY <= buttonRect.bottom
        ) {
          return;
        }
      }

      if (this.retryButton && (this.gameState.runComplete || this.gameState.crashed)) {
        const buttonRect = this.retryButton.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        if (
          clickX >= buttonRect.left &&
          clickX <= buttonRect.right &&
          clickY >= buttonRect.top &&
          clickY <= buttonRect.bottom
        ) {
          return;
        }
      }
    });
  }

  private closeMenu(): void {
    if (!this.menuOverlay) return;

    this.menuOverlay.style.display = 'none';
    this.menuOverlay.style.pointerEvents = 'none';
    const inputState = withMenuClosed({
      isRunning: this.gameState.isRunning,
      isMenuPaused: this.isMenuPaused,
      isTerminal: this.coreState.crashed || this.coreState.runComplete,
      pendingInputs: this.pendingInputs,
    });
    this.isMenuPaused = inputState.isMenuPaused;
    this.pendingInputs = inputState.pendingInputs;
    this.lastFrameTime = null;
    this.accumulatorSec = 0;
  }

  private toggleMenu(): void {
    if (!this.menuOverlay) return;

    const inlineDisplay = this.menuOverlay.style.display;
    const computedDisplay = window.getComputedStyle(this.menuOverlay).display;
    const currentDisplay = inlineDisplay || computedDisplay;
    const isOpen = currentDisplay !== 'none' && currentDisplay !== '';

    if (isOpen) {
      this.closeMenu();
    } else {
      this.menuOverlay.style.display = 'flex';
      this.menuOverlay.style.pointerEvents = 'auto';
      const inputState = withMenuOpened({
        isRunning: this.gameState.isRunning,
        isMenuPaused: this.isMenuPaused,
        isTerminal: this.coreState.crashed || this.coreState.runComplete,
        pendingInputs: this.pendingInputs,
      });
      this.isMenuPaused = inputState.isMenuPaused;
      this.pendingInputs = inputState.pendingInputs;
      this.accumulatorSec = 0;
    }
  }

  private retry(): void {
    this.stop();

    this.gameState = {
      isRunning: false,
      score: 0,
      level: 1,
      distanceTraveled: 0,
      targetDistance: GAME_CONFIG.defaultTargetDistance,
      runComplete: false,
      crashed: false,
    };

    this.worldOffset = 0;
    this.baseScrollSpeed = this.startingScrollSpeed;
    this.currentScrollSpeed = this.baseScrollSpeed;
    this.isSpeedBoosted = false;
    this.pendingInputs = [];
    this.accumulatorSec = 0;
    this.isMenuPaused = false;

    this.skier = new Skier(this.canvas.width / 2, this.canvas.height / 3);
    this.abominableSnowman.position.x = this.canvas.width / 2;
    this.abominableSnowman.reset(this.worldOffset, GAME_CONFIG.spawnGap);

    this.trees = [];
    if (this.useCourseSystem) {
      this.loadCourse();
    }

    this.initializeCoreState(this.gameState.targetDistance, this.obstacles);

    if (this.retryButton) {
      this.retryButton.style.display = 'none';
    }

    window.setTimeout(() => {
      this.start();
    }, 50);
  }

  private async loadTreeImage(): Promise<void> {
    try {
      await Tree.loadImage('/tree.png');
    } catch (error) {
      console.warn('Could not load tree image, using programmatic trees:', error);
    }
  }

  private async loadSkierImage(): Promise<void> {
    try {
      await Skier.loadImage('/skier-1938543.jpg');
    } catch (error) {
      console.warn('Could not load skier image, using fallback circle:', error);
    }
  }

  private loadCourse(): void {
    const progression = createGameCourseProgression(
      window.location.search,
      this.canvas.width,
      this.treeDensityMultiplier
    );
    this.currentCourse = progression.course;
    this.courseObjects = progression.courseObjects;
    this.obstacles = progression.obstacles;
    this.trees = this.buildTreesFromObstacles(this.obstacles);
    this.gameState.targetDistance = progression.course.totalLength;
    this.initializeCoreState(this.gameState.targetDistance, this.obstacles);
  }

  private buildObstacleDataFromObjects(objects: CourseObject[]): { trees: Tree[]; obstacles: CoreObstacle[] } {
    const obstacles = buildCoreObstaclesFromCourseObjects(objects, this.rng);
    return { trees: this.buildTreesFromObstacles(obstacles), obstacles };
  }

  private regenerateAheadCourse(multiplier: number): void {
    if (!this.useCourseSystem || !this.currentCourse) return;

    const cutoffWorldY = Math.max(0, this.worldOffset - 200);
    const keptObjects = this.courseObjects.filter((obj) => obj.y <= cutoffWorldY);
    const keptTrees = this.trees.filter((tree) => tree.position.y <= cutoffWorldY);

    const newCourse = this.courseGenerator.createSimpleCourse(multiplier);
    const newCourseObjects = this.courseGenerator.getAllObjects(newCourse);
    const aheadObjects = newCourseObjects.filter((obj) => obj.y > cutoffWorldY);
    const aheadData = this.buildObstacleDataFromObjects(aheadObjects);
    const keptObstacles = this.obstacles.filter((obstacle) => obstacle.y <= cutoffWorldY);

    this.courseObjects = [...keptObjects, ...aheadObjects];
    this.trees = [...keptTrees, ...aheadData.trees];
    this.obstacles = [...keptObstacles, ...aheadData.obstacles];
    this.currentCourse = newCourse;
    this.gameState.targetDistance = newCourse.totalLength;
    this.applyProgressionUpdate(this.gameState.targetDistance, this.obstacles);
  }

  private initializeCoreState(targetDistance: number, obstacles: CoreObstacle[]): void {
    this.coreConfig = createDefaultGameCoreConfig({
      ...this.coreConfig,
      targetDistance,
    });
    this.coreState = createInitialGameState({
      config: this.coreConfig,
      obstacles,
      worldOffset: this.worldOffset,
    });
    this.pendingInputs = [];
    this.accumulatorSec = 0;
    this.lastFrameTime = null;
    this.syncLegacyViewState();
  }

  private applyProgressionUpdate(targetDistance: number, obstacles: CoreObstacle[]): void {
    this.coreConfig = createDefaultGameCoreConfig({
      ...this.coreConfig,
      targetDistance,
    });
    this.coreState = {
      ...this.coreState,
      targetDistance,
      obstacles: obstacles.slice(),
    };
    this.syncLegacyViewState();
  }

  private buildTreesFromObstacles(obstacles: CoreObstacle[]): Tree[] {
    return obstacles.map((obstacle) => new Tree(obstacle.x, obstacle.y, obstacle.width, obstacle.height));
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

  private queueInput(intent: GameIntent): void {
    const inputState = withQueuedGameplayInput(
      {
        isRunning: this.gameState.isRunning,
        isMenuPaused: this.isMenuPaused,
        isTerminal: this.coreState.crashed || this.coreState.runComplete,
        pendingInputs: this.pendingInputs,
      },
      intent
    );
    this.pendingInputs = inputState.pendingInputs;
  }

  start(): void {
    if (this.gameState.isRunning) return;

    this.gameState.isRunning = true;
    this.lastFrameTime = null;
    this.accumulatorSec = 0;
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

    let frameSec = 0;
    if (this.lastFrameTime !== null) {
      const deltaMs = timestamp - this.lastFrameTime;
      frameSec = Math.min(this.maxFrameSec, Math.max(0, deltaMs / 1000));
    }
    this.lastFrameTime = timestamp;

    if (this.shouldStepSimulation()) {
      this.accumulatorSec += frameSec;
      while (this.accumulatorSec >= this.fixedStepSec) {
        this.update();
        this.accumulatorSec -= this.fixedStepSec;
        if (!this.shouldStepSimulation()) {
          this.accumulatorSec = 0;
          break;
        }
      }
    } else {
      this.accumulatorSec = 0;
    }

    this.render();
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(): void {
    const next = applyGameAdapterFixedStep(
      this.coreState,
      this.coreConfig,
      this.pendingInputs,
      this.fixedStepSec
    );
    this.coreState = next.coreState;
    this.pendingInputs = next.pendingInputs;
    this.syncLegacyViewState();
  }

  private shouldStepSimulation(): boolean {
    return !this.isMenuPaused && !this.coreState.runComplete && !this.coreState.crashed;
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
    this.trees = this.buildTreesFromObstacles(this.coreState.obstacles);
  }

  private render(): void {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(0, -this.worldOffset);
    this.drawScrollingBackground();
    this.trees.forEach((tree) => {
      tree.draw(this.ctx);
    });
    this.ctx.restore();

    this.skier.draw(this.ctx);
    this.abominableSnowman.draw(this.ctx, this.worldOffset, this.skier.position.y);
    this.drawUI();
  }

  private drawScrollingBackground(): void {
    this.ctx.fillStyle = '#F5F5F5';
    const groundHeight = 100;
    const segmentHeight = 200;

    const startSegment = Math.floor(this.worldOffset / segmentHeight);
    const endSegment = Math.ceil((this.worldOffset + this.canvas.height) / segmentHeight);

    for (let i = startSegment; i <= endSegment; i += 1) {
      const y = i * segmentHeight;
      this.ctx.fillRect(0, y, this.canvas.width, groundHeight);

      this.ctx.strokeStyle = '#E0E0E0';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawUI(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Score: ${this.gameState.score}`, 10, 30);
    this.ctx.fillText(`Level: ${this.gameState.level}`, 10, 60);

    const distancePercent = Math.min(
      100,
      Math.floor((this.gameState.distanceTraveled / this.gameState.targetDistance) * 100)
    );
    this.ctx.fillText(
      `Distance: ${Math.floor(this.gameState.distanceTraveled)}/${this.gameState.targetDistance} (${distancePercent}%)`,
      10,
      90
    );

    if (this.gameState.crashed) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      this.ctx.fillStyle = '#AA0000';
      this.ctx.font = 'bold 32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Crashed!', centerX, centerY - 60);

      if (this.retryButton) {
        this.retryButton.style.display = 'flex';
      }

      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#000';
      this.ctx.font = '20px Arial';
    } else if (this.gameState.runComplete) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      this.ctx.fillStyle = '#00AA00';
      this.ctx.font = 'bold 32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Run Complete!', centerX, centerY - 60);

      if (this.retryButton) {
        this.retryButton.style.display = 'flex';
      }

      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = '#000';
      this.ctx.font = '20px Arial';
    } else if (this.retryButton) {
      this.retryButton.style.display = 'none';
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
      `Boosted: ${this.isSpeedBoosted ? 'true' : 'false'}`,
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
