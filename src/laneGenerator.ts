export interface LaneObject {
  type: string; // Type of object (e.g., 'tree', 'rock', 'flag')
  x: number; // X position in the lane
  y: number; // Y position in world space
}

export interface Lane {
  id: number;
  centerX: number; // Center X position of the lane
  width: number; // Width of the lane
  objects: LaneObject[]; // Objects placed in this lane
}

export class LaneGenerator {
  private numLanes: number;
  private laneWidth: number;
  private margin: number;

  constructor(canvasWidth: number, numLanes: number = 3, margin: number = 80) {
    this.numLanes = numLanes;
    this.margin = margin;
    // Calculate lane width based on available space
    const availableWidth = canvasWidth - (margin * 2);
    this.laneWidth = availableWidth / numLanes;
  }

  /**
   * Generate lanes with random object placement
   * @param startY Starting Y position in world space
   * @param endY Ending Y position in world space
   * @param objectTypes Array of object types to use (e.g., ['tree', 'rock'])
   * @param spawnChance Probability (0-1) of spawning an object at each position
   * @param spacing Distance between potential spawn points
   */
  generateLanes(
    startY: number,
    endY: number,
    objectTypes: string[] = ['tree'],
    spawnChance: number = 0.3,
    spacing: number = 100
  ): Lane[] {
    const lanes: Lane[] = [];

    // Create lanes
    for (let i = 0; i < this.numLanes; i++) {
      const centerX = this.margin + (i * this.laneWidth) + (this.laneWidth / 2);
      const lane: Lane = {
        id: i,
        centerX,
        width: this.laneWidth,
        objects: []
      };

      // Randomly place objects along this lane
      for (let y = startY; y < endY; y += spacing) {
        // Random chance to spawn an object
        if (Math.random() < spawnChance) {
          // Randomly choose object type
          const objectType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
          
          // Random X offset within the lane (not perfectly centered)
          const xOffset = (Math.random() - 0.5) * (this.laneWidth * 0.6); // 60% of lane width
          const x = centerX + xOffset;

          lane.objects.push({
            type: objectType,
            x,
            y
          });
        }
      }

      lanes.push(lane);
    }

    return lanes;
  }

  /**
   * Generate a pattern where some lanes are clear (for navigation)
   * @param startY Starting Y position
   * @param endY Ending Y position
   * @param objectTypes Object types to use
   * @param clearLaneChance Probability that a lane section is clear (0-1)
   */
  generatePatternWithClearPaths(
    startY: number,
    endY: number,
    objectTypes: string[] = ['tree'],
    clearLaneChance: number = 0.2,
    spacing: number = 100
  ): Lane[] {
    const lanes: Lane[] = [];

    // Create lanes
    for (let i = 0; i < this.numLanes; i++) {
      const centerX = this.margin + (i * this.laneWidth) + (this.laneWidth / 2);
      const lane: Lane = {
        id: i,
        centerX,
        width: this.laneWidth,
        objects: []
      };

      // Generate objects with some sections being clear
      for (let y = startY; y < endY; y += spacing) {
        // Check if this section should be clear (creates navigable paths)
        const isClear = Math.random() < clearLaneChance;
        
        if (!isClear) {
          // Spawn object
          const objectType = objectTypes[Math.floor(Math.random() * objectTypes.length)];
          const xOffset = (Math.random() - 0.5) * (this.laneWidth * 0.6);
          const x = centerX + xOffset;

          lane.objects.push({
            type: objectType,
            x,
            y
          });
        }
      }

      lanes.push(lane);
    }

    return lanes;
  }

  /**
   * Get all objects from all lanes as a flat array
   */
  getAllObjects(lanes: Lane[]): LaneObject[] {
    const allObjects: LaneObject[] = [];
    lanes.forEach(lane => {
      allObjects.push(...lane.objects);
    });
    return allObjects;
  }
}

