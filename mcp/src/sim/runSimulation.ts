type SimulationInput = {
    seed: number;
    seconds: number;
  };
  
  export type SimulationMetrics = {
    seed: number;
    seconds: number;
    totalDistance: number;
    crashCount: number;
    finalScrollSpeed: number;
    snowmanDistance: number;
  };
  
  // Small deterministic PRNG (Mulberry32)
  function mulberry32(seed: number) {
    let t = seed >>> 0;
    return function rand() {
      t += 0x6D2B79F5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  
  /**
   * MVP headless simulation.
   * - No DOM/canvas.
   * - Deterministic for (seed, seconds).
   * - Returns metrics you care about.
   *
   * Later you’ll replace the internal loop with imports from shared game-core.
   */
  export function runSimulation(input: SimulationInput): SimulationMetrics {
    const { seed } = input;
  
    // Clamp seconds defensively (even though zod already bounds it)
    const seconds = Math.max(1, Math.min(300, Math.floor(input.seconds)));
  
    const rand = mulberry32(seed);
  
    // “Game-ish” parameters (placeholder)
    const dt = 1 / 60;                 // fixed timestep for determinism
    const steps = Math.floor(seconds / dt);
  
    let scrollSpeed = 220;             // units/sec baseline placeholder
    const accelPerSec = 8;             // ramps difficulty
    let totalDistance = 0;
  
    let crashCount = 0;
  
    // Snowman starts behind you; positive means you’re ahead
    let snowmanDistance = 260;
  
    for (let i = 0; i < steps; i++) {
      const t = i * dt;
  
      // Speed ramps over time (placeholder for your course/difficulty curve)
      scrollSpeed += accelPerSec * dt;
  
      // Distance integrates in world space
      totalDistance += scrollSpeed * dt;
  
      // Crash model: probability increases slightly as speed rises
      const crashProb = Math.min(0.002 + (scrollSpeed - 220) * 0.000002, 0.02);
      if (rand() < crashProb) {
        crashCount += 1;
        // Penalize speed a bit on crash (like losing momentum)
        scrollSpeed *= 0.92;
        // Give snowman a chance to close in during “recovery”
        snowmanDistance -= 6;
      }
  
      // Snowman behavior: closes as speed increases + random pressure
      const pressure = 0.6 + rand() * 0.8; // deterministic noise
      snowmanDistance -= pressure * dt * (1.2 + scrollSpeed / 400);
  
      // But player also “pulls away” when fast and not crashing (net effect)
      snowmanDistance += dt * 0.35 * (scrollSpeed / 220);
  
      // Keep values bounded
      snowmanDistance = Math.max(-50, Math.min(1000, snowmanDistance));
  
      // If snowman catches you, count as a crash-like terminal event
      if (snowmanDistance <= 0) {
        crashCount += 1;
        // End run early (deterministic)
        break;
      }
    }
  
    return {
      seed,
      seconds,
      totalDistance: Math.round(totalDistance),
      crashCount,
      finalScrollSpeed: Math.round(scrollSpeed * 100) / 100,
      snowmanDistance: Math.round(snowmanDistance * 100) / 100
    };
  }