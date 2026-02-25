export interface CourseObject {
  type: string; // 'tree', 'rock', 'flag', etc.
  x: number; // X position (0-1 normalized, or absolute)
  y: number; // Y position in world space
  width?: number; // Optional width override
  height?: number; // Optional height override
}

export interface CourseSection {
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

export class CourseGenerator {
  private canvasWidth: number;

  constructor(canvasWidth: number) {
    this.canvasWidth = canvasWidth;
  }

  /**
   * Create a simple course with predefined sections
   */
  createSimpleCourse(): Course {
    const sections: CourseSection[] = [];
    let currentY = 0;
    const sectionLength = 500; // Length of each section

    // Section 1: Easy start - sparse trees
    sections.push({
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createSparseTrees(currentY, currentY + sectionLength),
      pattern: 'clear'
    });
    currentY += sectionLength;

    // Section 2: Medium difficulty - gates (trees on sides, clear middle)
    sections.push({
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createGatePattern(currentY, currentY + sectionLength),
      pattern: 'gates'
    });
    currentY += sectionLength;

    // Section 3: Dense section - more trees
    sections.push({
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createDenseTrees(currentY, currentY + sectionLength),
      pattern: 'dense'
    });
    currentY += sectionLength;

    // Section 4: Zigzag pattern
    sections.push({
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createZigzagPattern(currentY, currentY + sectionLength),
      pattern: 'zigzag'
    });
    currentY += sectionLength;

    // Section 5: Narrow gaps - harder
    sections.push({
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createNarrowGaps(currentY, currentY + sectionLength),
      pattern: 'dense'
    });
    currentY += sectionLength;

    // Section 6: Very dense - very hard
    sections.push({
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createVeryDense(currentY, currentY + sectionLength),
      pattern: 'dense'
    });
    currentY += sectionLength;

    // Section 7: Alternating walls - extreme difficulty
    sections.push({
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createAlternatingWalls(currentY, currentY + sectionLength),
      pattern: 'dense'
    });
    currentY += sectionLength;

    // Section 8: Final challenge - tight zigzag
    sections.push({
      startY: currentY,
      endY: currentY + sectionLength,
      objects: this.createTightZigzag(currentY, currentY + sectionLength),
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
  private createSparseTrees(startY: number, endY: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 100;
    const baseSpacing = 180;
    
    while (y < endY) {
      // Vary spacing naturally (not uniform)
      const spacing = baseSpacing + (Math.random() * 60 - 30); // ±30px variation
      
      // Create gentle curve using sine wave
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 2) * 0.1; // Gentle S-curve
      
      // Place trees with natural variation
      const leftX = 0.15 + curve + (Math.random() * 0.05 - 0.025);
      const rightX = 0.85 + curve + (Math.random() * 0.05 - 0.025);
      
      objects.push({ type: 'tree', x: Math.max(0.1, Math.min(0.9, leftX)), y });
      objects.push({ type: 'tree', x: Math.max(0.1, Math.min(0.9, rightX)), y });
      
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create flowing gate pattern (trees on sides, clear middle path)
   */
  private createGatePattern(startY: number, endY: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 100;
    const baseSpacing = 130;
    let gateSide = 0; // 0 = left, 1 = right
    
    while (y < endY) {
      // Vary spacing
      const spacing = baseSpacing + (Math.random() * 40 - 20);
      
      // Create flowing curve
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 3) * 0.15; // More pronounced curve
      
      if (gateSide === 0) {
        // Left gate with curve
        const baseX = 0.2 + curve;
        objects.push({ type: 'tree', x: Math.max(0.1, baseX), y });
        objects.push({ type: 'tree', x: Math.max(0.1, baseX + 0.1), y });
      } else {
        // Right gate with curve
        const baseX = 0.7 + curve;
        objects.push({ type: 'tree', x: Math.min(0.9, baseX), y });
        objects.push({ type: 'tree', x: Math.min(0.9, baseX + 0.1), y });
      }
      
      gateSide = 1 - gateSide; // Alternate
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create dense trees with natural flow (harder section)
   */
  private createDenseTrees(startY: number, endY: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 80;
    const baseSpacing = 85;
    
    while (y < endY) {
      // Vary spacing organically
      const spacing = baseSpacing + (Math.random() * 30 - 15);
      
      // Create sweeping curve
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 4) * 0.2; // Sweeping S-curve
      
      // Place trees along the curve with variation
      const numTrees = 2 + Math.floor(Math.random() * 2); // 2-3 trees
      const basePositions = [0.2, 0.4, 0.6, 0.8];
      
      // Select positions and add curve
      const selected: number[] = [];
      for (let i = 0; i < numTrees; i++) {
        let pos = basePositions[Math.floor(Math.random() * basePositions.length)];
        while (selected.includes(pos)) {
          pos = basePositions[Math.floor(Math.random() * basePositions.length)];
        }
        selected.push(pos);
        const finalX = pos + curve + (Math.random() * 0.08 - 0.04);
        objects.push({ type: 'tree', x: Math.max(0.1, Math.min(0.9, finalX)), y });
      }
      
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create flowing zigzag pattern (like carving turns)
   */
  private createZigzagPattern(startY: number, endY: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 80;
    const baseSpacing = 95;
    let side = 0; // 0 = left, 1 = right
    
    while (y < endY) {
      // Vary spacing for natural feel
      const spacing = baseSpacing + (Math.random() * 25 - 12);
      
      // Create smooth transition between sides (not abrupt)
      const progress = (y - startY) / (endY - startY);
      const transition = Math.sin(progress * Math.PI * 6) * 0.25; // Smooth transitions
      
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
      if (Math.random() < 0.3) { // 30% chance to switch sides
        side = 1 - side;
      }
      
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create narrow gaps with flowing curves (harder)
   */
  private createNarrowGaps(startY: number, endY: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 80;
    const baseSpacing = 95;
    let patternType = 0;
    
    while (y < endY) {
      const spacing = baseSpacing + (Math.random() * 20 - 10);
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 5) * 0.2; // Flowing curve
      
      if (patternType === 0) {
        // Left side with narrow gap - flowing
        const leftBase = 0.2 + curve;
        const rightBase = 0.7 + curve;
        objects.push({ type: 'tree', x: Math.max(0.1, leftBase), y });
        objects.push({ type: 'tree', x: Math.max(0.1, leftBase + 0.1), y });
        objects.push({ type: 'tree', x: Math.min(0.9, rightBase), y });
        objects.push({ type: 'tree', x: Math.min(0.9, rightBase + 0.1), y });
      } else if (patternType === 1) {
        // Center gap - flowing
        const centerCurve = curve * 0.5;
        objects.push({ type: 'tree', x: Math.max(0.1, 0.15 + centerCurve), y });
        objects.push({ type: 'tree', x: Math.min(0.9, 0.85 + centerCurve), y });
      } else {
        // Right side with narrow gap - flowing
        const leftBase = 0.25 + curve;
        const rightBase = 0.75 + curve;
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
  private createVeryDense(startY: number, endY: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 60;
    const baseSpacing = 75;
    
    while (y < endY) {
      const spacing = baseSpacing + (Math.random() * 15 - 7);
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 6) * 0.25; // Stronger curve
      
      // Multiple trees with flow
      const numTrees = 3 + Math.floor(Math.random() * 2); // 3-4 trees
      const basePositions = [0.15, 0.3, 0.45, 0.55, 0.7, 0.85];
      
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
  private createAlternatingWalls(startY: number, endY: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 70;
    const baseSpacing = 85;
    let wallSide = 0; // 0 = left, 1 = right
    
    while (y < endY) {
      const spacing = baseSpacing + (Math.random() * 20 - 10);
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 8) * 0.3; // Strong flowing curve
      
      if (wallSide === 0) {
        // Left wall - flowing curve forces player right
        const baseX = 0.15 + curve;
        objects.push({ type: 'tree', x: Math.max(0.05, baseX), y });
        objects.push({ type: 'tree', x: Math.max(0.05, baseX + 0.1), y });
        objects.push({ type: 'tree', x: Math.max(0.05, baseX + 0.2), y });
      } else {
        // Right wall - flowing curve forces player left
        const baseX = 0.65 + curve;
        objects.push({ type: 'tree', x: Math.min(0.95, baseX), y });
        objects.push({ type: 'tree', x: Math.min(0.95, baseX + 0.1), y });
        objects.push({ type: 'tree', x: Math.min(0.95, baseX + 0.2), y });
      }
      
      // Smooth transition between walls
      if (Math.random() < 0.25) {
        wallSide = 1 - wallSide;
      }
      
      y += spacing;
    }
    
    return objects;
  }

  /**
   * Create tight flowing zigzag (final challenge - like tight turns)
   */
  private createTightZigzag(startY: number, endY: number): CourseObject[] {
    const objects: CourseObject[] = [];
    let y = startY + 50;
    const baseSpacing = 65;
    let side = 0;
    
    while (y < endY) {
      const spacing = baseSpacing + (Math.random() * 10 - 5);
      const progress = (y - startY) / (endY - startY);
      const curve = Math.sin(progress * Math.PI * 10) * 0.35; // Very tight, flowing turns
      
      if (side === 0) {
        // Left side - tight flowing curve
        const baseX = 0.2 + curve;
        objects.push({ type: 'tree', x: Math.max(0.05, baseX), y });
        objects.push({ type: 'tree', x: Math.max(0.05, baseX + 0.1), y });
        objects.push({ type: 'tree', x: Math.max(0.05, baseX + 0.2), y });
      } else {
        // Right side - tight flowing curve
        const baseX = 0.6 + curve;
        objects.push({ type: 'tree', x: Math.min(0.95, baseX), y });
        objects.push({ type: 'tree', x: Math.min(0.95, baseX + 0.1), y });
        objects.push({ type: 'tree', x: Math.min(0.95, baseX + 0.2), y });
      }
      
      // Quick transitions for tight turns
      if (Math.random() < 0.4) {
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
}

