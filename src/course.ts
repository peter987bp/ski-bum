export interface CourseObject {
  type: string; // 'tree', 'rock', 'flag', etc.
  x: number; // X position (0-1 normalized, or absolute)
  y: number; // Y position in world space
  width?: number; // Optional width override
  height?: number; // Optional height override
}

export interface CourseSection {
  name: string; // Section display name
  startY: number; // Start Y position in world space
  endY: number; // End Y position in world space
  objects: CourseObject[]; // Objects in this section
  pattern?: 'clear' | 'dense' | 'gates' | 'zigzag'; // Optional pattern type
}

export interface Course {
  name: string;
  sections: CourseSection[];
  totalLength: number; // Total course length
}

const EARLY_SAFE_MIN_X = 0.32;
const EARLY_SAFE_MAX_X = 0.68;

export class CourseGenerator {
  private canvasWidth: number;

  constructor(canvasWidth: number) {
    this.canvasWidth = canvasWidth;
  }

  private clampDensityMultiplier(densityMultiplier: number): number {
    if (!Number.isFinite(densityMultiplier)) return 1;
    return Math.min(2.0, Math.max(0.3, densityMultiplier));
  }

  private scaleSpacing(baseSpacing: number, jitter: number, densityMultiplier: number): number {
    const density = this.clampDensityMultiplier(densityMultiplier);
    const rawSpacing = baseSpacing + jitter;
    // Density multiplier reduces spacing; clamp to keep lanes navigable.
    return Math.max(baseSpacing * 0.5, rawSpacing / density);
  }

  private scaleTreeCount(baseCount: number, densityMultiplier: number, maxCount: number): number {
    const density = this.clampDensityMultiplier(densityMultiplier);
    const scaled = Math.round(baseCount * density);
    // Clamp to ensure at least one safe lane remains open.
    return Math.max(1, Math.min(maxCount, scaled));
  }

  /**
   * Create a simple course with predefined sections
   */
  createSimpleCourse(densityMultiplier: number = 1): Course {
    const density = this.clampDensityMultiplier(densityMultiplier);
    const sections: CourseSection[] = [];
    let currentY = 0;
    const sectionLength = 500; // Length of each section
    const earlyGateSpacingScale = 1.3;
    const midGateSpacingScale = 1.1;

    // Section 1: Easy start - sparse trees
    sections.push({
      name: 'Easy Start',
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createSparseTrees(currentY, currentY + sectionLength, density),
      pattern: 'clear'
    });
    currentY += sectionLength;

    // Section 2: Medium difficulty - gates (trees on sides, clear middle)
    sections.push({
      name: 'Gates',
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createGatePattern(currentY, currentY + sectionLength, density, earlyGateSpacingScale),
      pattern: 'gates'
    });
    currentY += sectionLength;

    // Section 3: Building rhythm - slightly tighter gates
    sections.push({
      name: 'Flowing Gates',
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createGatePattern(currentY, currentY + sectionLength, density, midGateSpacingScale),
      pattern: 'gates'
    });
    currentY += sectionLength;

    // Section 4: Zigzag pattern
    sections.push({
      name: 'Zigzag',
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createZigzagPattern(currentY, currentY + sectionLength, density),
      pattern: 'zigzag'
    });
    currentY += sectionLength;

    // Section 5: Narrow gaps - harder
    sections.push({
      name: 'Narrow Gaps',
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createNarrowGaps(currentY, currentY + sectionLength, density),
      pattern: 'dense'
    });
    currentY += sectionLength;

    // Section 6: Very dense - very hard
    sections.push({
      name: 'Very Dense',
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createVeryDense(currentY, currentY + sectionLength, density),
      pattern: 'dense'
    });
    currentY += sectionLength;

    // Section 7: Alternating walls - extreme difficulty
    sections.push({
      name: 'Alternating Walls',
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createAlternatingWalls(currentY, currentY + sectionLength, density),
      pattern: 'dense'
    });
    currentY += sectionLength;

    // Section 8: Final challenge - tight zigzag
    sections.push({
      name: 'Final Zigzag',
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createTightZigzag(currentY, currentY + sectionLength, density),
      pattern: 'zigzag'
    });
    currentY += sectionLength;

    return {
      name: 'Progressive Course',
      sections,
      totalLength: currentY
    };
  }

  /**
   * Create sparse trees with natural flow (easy section)
   */
  private createSparseTrees(startY: number, endY: number, densityMultiplier: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 100;
    const baseSpacing = 235;
    const safeMinX = EARLY_SAFE_MIN_X;
    const safeMaxX = EARLY_SAFE_MAX_X;
    
    while (y < endY) {
      // Vary spacing naturally (not uniform)
      const spacing = this.scaleSpacing(baseSpacing, Math.random() * 80 - 40, densityMultiplier); // density scales spacing
      
      // Create gentle curve using sine wave
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 2) * 0.1; // Gentle S-curve
      
      // Place trees with natural variation
      const leftX = 0.15 + curve + (Math.random() * 0.05 - 0.025);
      const rightX = 0.85 + curve + (Math.random() * 0.05 - 0.025);
      
      // Keep a guaranteed clear corridor in early sections
      const safeLeftX = Math.max(0.1, Math.min(safeMinX, leftX));
      const safeRightX = Math.min(0.9, Math.max(safeMaxX, rightX));
      
      objects.push({ type: 'tree', x: safeLeftX, y });
      objects.push({ type: 'tree', x: safeRightX, y });
      
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create flowing gate pattern (trees on sides, clear middle path)
   */
  private createGatePattern(startY: number, endY: number, densityMultiplier: number, spacingScale: number = 1): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 100;
    const baseSpacing = 130 * spacingScale;
    const spacingJitter = 40 * spacingScale;
    const safeMinX = EARLY_SAFE_MIN_X;
    const safeMaxX = EARLY_SAFE_MAX_X;
    const maxLeftBaseX = safeMinX - 0.12;
    const minRightBaseX = safeMaxX;
    const maxRightBaseX = 0.84;
    let gateSide = 0; // 0 = left, 1 = right
    
    while (y < endY) {
      // Vary spacing
      const spacing = this.scaleSpacing(
        baseSpacing,
        Math.random() * spacingJitter - spacingJitter / 2,
        densityMultiplier
      ); // density scales spacing
      
      // Create flowing curve
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 3) * 0.15; // More pronounced curve
      
      if (gateSide === 0) {
        // Left gate with curve
        const baseX = 0.18 + curve;
        const clampedBaseX = Math.max(0.08, Math.min(maxLeftBaseX, baseX));
        objects.push({ type: 'tree', x: Math.max(0.1, clampedBaseX), y });
        objects.push({ type: 'tree', x: Math.max(0.1, clampedBaseX + 0.1), y });
      } else {
        // Right gate with curve
        const baseX = 0.72 + curve;
        const clampedBaseX = Math.min(maxRightBaseX, Math.max(minRightBaseX, baseX));
        objects.push({ type: 'tree', x: Math.min(0.9, clampedBaseX), y });
        objects.push({ type: 'tree', x: Math.min(0.9, clampedBaseX + 0.1), y });
      }
      
      gateSide = 1 - gateSide; // Alternate
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create flowing zigzag pattern (like carving turns)
   */
  private createZigzagPattern(startY: number, endY: number, densityMultiplier: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 80;
    const baseSpacing = 140;
    let side = 0; // 0 = left, 1 = right
    
    while (y < endY) {
      // Vary spacing for natural feel
      const spacing = this.scaleSpacing(baseSpacing, Math.random() * 40 - 20, densityMultiplier); // density scales spacing
      
      // Create smooth transition between sides (not abrupt)
      const progress = (y - startY) / (endY - startY);
      const transition = Math.sin(progress * Math.PI * 6) * 0.2; // Smooth transitions
      
      if (side === 0) {
        // Left side with smooth curve
        const baseX = 0.25 + transition;
        objects.push({ type: 'tree', x: Math.max(0.1, baseX), y });
        objects.push({ type: 'tree', x: Math.max(0.1, baseX + 0.1), y });
      } else {
        // Right side with smooth curve
        const baseX = 0.65 + transition;
        objects.push({ type: 'tree', x: Math.min(0.9, baseX), y });
        objects.push({ type: 'tree', x: Math.min(0.9, baseX + 0.1), y });
      }
      
      // Gradually transition sides
      if (Math.random() < 0.22) { // 22% chance to switch sides
        side = 1 - side;
      }
      
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create narrow gaps with flowing curves (harder)
   */
  private createNarrowGaps(startY: number, endY: number, densityMultiplier: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 80;
    const baseSpacing = 125;
    let patternType = 0;
    
    while (y < endY) {
      const spacing = this.scaleSpacing(baseSpacing, Math.random() * 24 - 12, densityMultiplier); // density scales spacing
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 5) * 0.18; // Flowing curve
      
      if (patternType === 0) {
        // Left side with narrow gap - flowing
        const leftBase = 0.18 + curve;
        const rightBase = 0.76 + curve;
        objects.push({ type: 'tree', x: Math.max(0.1, leftBase), y });
        objects.push({ type: 'tree', x: Math.max(0.1, leftBase + 0.1), y });
        objects.push({ type: 'tree', x: Math.min(0.9, rightBase), y });
        objects.push({ type: 'tree', x: Math.min(0.9, rightBase + 0.08), y });
      } else if (patternType === 1) {
        // Center gap - flowing
        const centerCurve = curve * 0.5;
        objects.push({ type: 'tree', x: Math.max(0.1, 0.12 + centerCurve), y });
        objects.push({ type: 'tree', x: Math.min(0.9, 0.88 + centerCurve), y });
      } else {
        // Right side with narrow gap - flowing
        const leftBase = 0.22 + curve;
        const rightBase = 0.78 + curve;
        objects.push({ type: 'tree', x: Math.max(0.1, leftBase), y });
        objects.push({ type: 'tree', x: Math.min(0.9, rightBase), y });
      }
      
      patternType = (patternType + 1) % 3;
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create very dense pattern with natural flow (very hard)
   */
  private createVeryDense(startY: number, endY: number, densityMultiplier: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 60;
    const baseSpacing = 105;
    
    while (y < endY) {
      const spacing = this.scaleSpacing(baseSpacing, Math.random() * 20 - 10, densityMultiplier); // density scales spacing
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 6) * 0.2; // Stronger curve
      
      // Multiple trees with flow
      const baseTreeCount = 2 + Math.floor(Math.random() * 2); // 2-3 trees
      const basePositions = [0.15, 0.3, 0.5, 0.7, 0.85];
      const numTrees = this.scaleTreeCount(baseTreeCount, densityMultiplier, basePositions.length - 1); // density scales count
      
      const selected: number[] = [];
      while (selected.length < numTrees) {
        const pos = basePositions[Math.floor(Math.random() * basePositions.length)];
        if (!selected.includes(pos)) {
          selected.push(pos);
          const finalX = pos + curve + (Math.random() * 0.06 - 0.03);
          objects.push({ type: 'tree', x: Math.max(0.1, Math.min(0.9, finalX)), y });
        }
      }
      
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create flowing alternating walls (extreme difficulty)
   */
  private createAlternatingWalls(startY: number, endY: number, densityMultiplier: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 70;
    const baseSpacing = 120;
    let wallSide = 0; // 0 = left, 1 = right
    
    while (y < endY) {
      const spacing = this.scaleSpacing(baseSpacing, Math.random() * 28 - 14, densityMultiplier); // density scales spacing
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 8) * 0.24; // Strong flowing curve
      
      if (wallSide === 0) {
        // Left wall - flowing curve forces player right
        const baseX = 0.18 + curve;
        objects.push({ type: 'tree', x: Math.max(0.05, baseX), y });
        objects.push({ type: 'tree', x: Math.max(0.05, baseX + 0.12), y });
      } else {
        // Right wall - flowing curve forces player left
        const baseX = 0.64 + curve;
        objects.push({ type: 'tree', x: Math.min(0.95, baseX), y });
        objects.push({ type: 'tree', x: Math.min(0.95, baseX + 0.12), y });
      }
      
      // Smooth transition between walls
      if (Math.random() < 0.22) {
        wallSide = 1 - wallSide;
      }
      
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create tight flowing zigzag (final challenge - like tight turns)
   */
  private createTightZigzag(startY: number, endY: number, densityMultiplier: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 50;
    const baseSpacing = 95;
    let side = 0;
    
    while (y < endY) {
      const spacing = this.scaleSpacing(baseSpacing, Math.random() * 14 - 7, densityMultiplier); // density scales spacing
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 10) * 0.28; // Very tight, flowing turns
      
      if (side === 0) {
        // Left side - tight flowing curve
        const baseX = 0.2 + curve;
        objects.push({ type: 'tree', x: Math.max(0.05, baseX), y });
        objects.push({ type: 'tree', x: Math.max(0.05, baseX + 0.12), y });
      } else {
        // Right side - tight flowing curve
        const baseX = 0.62 + curve;
        objects.push({ type: 'tree', x: Math.min(0.95, baseX), y });
        objects.push({ type: 'tree', x: Math.min(0.95, baseX + 0.12), y });
      }
      
      // Quick transitions for tight turns
      if (Math.random() < 0.32) {
        side = 1 - side;
      }
      
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Convert normalized X (0-1) to absolute X position
   */
  normalizeX(normalizedX: number): number {
    return normalizedX * this.canvasWidth;
  }

  /**
   * Get all objects from a course as a flat array with absolute positions
   */
  getAllObjects(course: Course): CourseObject[] {
    const allObjects: CourseObject[] = [];
    
    course.sections.forEach(section => {
      section.objects.forEach(obj => {
        // Convert normalized X to absolute if needed
        const absoluteX = obj.x <= 1 ? this.normalizeX(obj.x) : obj.x;
        allObjects.push({
          ...obj,
          x: absoluteX
        });
      });
    });
    
    return allObjects;
  }

  getSectionNameAt(distance: number, course: Course): string {
    for (const section of course.sections) {
      if (distance >= section.startY && distance < section.endY) {
        return section.name || '(unknown)';
      }
    }

    const lastSection = course.sections[course.sections.length - 1];
    if (lastSection && distance >= lastSection.startY) {
      return lastSection.name || '(unknown)';
    }

    return '(unknown)';
  }
}
