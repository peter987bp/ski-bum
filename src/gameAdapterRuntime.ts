import { CourseGenerator } from './course.js';
import { CoreObstacle, GameCoreConfig, GameCoreState, GameInput, GameIntent, stepGameFixed } from './core/gameCore.js';
import { buildCoreObstaclesFromCourseObjects } from './core/progression.js';
import { createBrowserRngFromSearch } from './browserSeed.js';
import { Course, CourseObject } from './course.js';

export function applyGameAdapterFixedStep(
  coreState: GameCoreState,
  coreConfig: GameCoreConfig,
  pendingInputs: GameIntent[],
  fixedStepSec: number
): { coreState: GameCoreState; pendingInputs: GameIntent[] } {
  const nextInputs = pendingInputs.slice();
  const nextIntent = nextInputs.shift();
  const input: GameInput = nextIntent
    ? { intent: nextIntent, justPressed: true }
    : { intent: 'none', justPressed: false };

  return {
    coreState: stepGameFixed(coreState, input, fixedStepSec, 1, coreConfig),
    pendingInputs: nextInputs,
  };
}

export function createBrowserCourseGenerator(search: string, canvasWidth: number): {
  rng: () => number;
  courseGenerator: CourseGenerator;
} {
  const rng = createBrowserRngFromSearch(search);
  return {
    rng,
    courseGenerator: new CourseGenerator(canvasWidth, rng),
  };
}

export function buildBrowserProgressionFromSearch(
  search: string,
  canvasWidth: number,
  densityMultiplier: number
): { obstacles: CoreObstacle[]; targetDistance: number } {
  const { rng, courseGenerator } = createBrowserCourseGenerator(search, canvasWidth);
  const course = courseGenerator.createSimpleCourse(densityMultiplier);
  const courseObjects = courseGenerator.getAllObjects(course);
  const obstacles = buildCoreObstaclesFromCourseObjects(courseObjects, rng);

  return {
    obstacles,
    targetDistance: course.totalLength,
  };
}

export function createGameCourseProgression(
  search: string,
  canvasWidth: number,
  densityMultiplier: number
): { course: Course; courseObjects: CourseObject[]; obstacles: CoreObstacle[]; rng: () => number } {
  const { rng, courseGenerator } = createBrowserCourseGenerator(search, canvasWidth);
  const course = courseGenerator.createSimpleCourse(densityMultiplier);
  const courseObjects = courseGenerator.getAllObjects(course);
  const obstacles = buildCoreObstaclesFromCourseObjects(courseObjects, rng);

  return {
    course,
    courseObjects,
    obstacles,
    rng,
  };
}
