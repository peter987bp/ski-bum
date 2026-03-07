import { Course, CourseObject, CourseGenerator } from '../course.js';
import { CoreObstacle } from './gameCore.js';

export type RandomFn = () => number;

export interface ProgressionBundle {
  course: Course;
  objects: CourseObject[];
  obstacles: CoreObstacle[];
}

export function createCourseProgression(
  canvasWidth: number,
  densityMultiplier: number,
  rng: RandomFn = Math.random
): ProgressionBundle {
  const generator = new CourseGenerator(canvasWidth, rng);
  const course = generator.createSimpleCourse(densityMultiplier);
  const objects = generator.getAllObjects(course);
  const obstacles = buildCoreObstaclesFromCourseObjects(objects, rng);

  return { course, objects, obstacles };
}

export function buildCoreObstaclesFromCourseObjects(
  objects: CourseObject[],
  rng: RandomFn = Math.random
): CoreObstacle[] {
  const obstacles: CoreObstacle[] = [];

  for (const obj of objects) {
    if (obj.type !== 'tree') continue;

    const sizeVariation = 0.8 + rng() * 0.4;
    obstacles.push({
      type: 'tree',
      x: obj.x,
      y: obj.y,
      width: obj.width ?? 40 * sizeVariation,
      height: obj.height ?? 60 * sizeVariation,
    });
  }

  return obstacles;
}
