const TWO_PI = Math.PI * 2;
const LEGACY_FPS = 60;

// Wind tuning (velocity in px/sec; was px/frame @ 60fps)
const DEFAULT_WIND_STRENGTH = 0.16 * LEGACY_FPS;
const DEFAULT_WIND_FREQUENCY = 0.06; // cycles per second
const DEFAULT_WIND_GUST_MULTIPLIER = 0.35;

const WIND_RAMP_DISTANCE = 3500; // world units to reach near-max strength
const WIND_RAMP_MULTIPLIER = 0.35; // +35% strength by the end of the ramp

const WIND_SECONDARY_FREQUENCY = 0.11; // secondary wave for variation
const WIND_FORCE_SMOOTHING = 0.1; // smoothing per 60fps frame

const WIND_GUST_FREQUENCY = 0.03; // slow envelope for occasional gusts
const WIND_GUST_PHASE = 1.7;

export interface WindConfig {
  windStrength?: number;
  windFrequency?: number;
  windGustMultiplier?: number;
}

export class WindSystem {
  private timeSeconds = 0;
  private currentForce = 0;
  private windStrength: number;
  private windFrequency: number;
  private windGustMultiplier: number;

  constructor(config: WindConfig = {}) {
    this.windStrength = config.windStrength ?? DEFAULT_WIND_STRENGTH;
    this.windFrequency = config.windFrequency ?? DEFAULT_WIND_FREQUENCY;
    this.windGustMultiplier = config.windGustMultiplier ?? DEFAULT_WIND_GUST_MULTIPLIER;
  }

  update(dtSec: number, worldDistance: number): void {
    const dtNorm = dtSec * LEGACY_FPS;
    this.timeSeconds += dtSec;

    const progress = this.clamp(worldDistance / WIND_RAMP_DISTANCE, 0, 1);
    const strengthScale = 1 + progress * WIND_RAMP_MULTIPLIER;

    const baseWave = Math.sin(this.timeSeconds * TWO_PI * this.windFrequency);
    const secondaryWave = Math.sin(this.timeSeconds * TWO_PI * WIND_SECONDARY_FREQUENCY + 0.9);
    const combinedWave = baseWave * 0.7 + secondaryWave * 0.3;

    const gustWave = Math.sin(this.timeSeconds * TWO_PI * WIND_GUST_FREQUENCY + WIND_GUST_PHASE);
    const gustEnvelope = Math.max(0, gustWave);
    const gustFactor = 1 + (gustEnvelope * gustEnvelope) * this.windGustMultiplier;

    const targetForce = combinedWave * this.windStrength * strengthScale * gustFactor;

    const smoothing = 1 - Math.pow(1 - WIND_FORCE_SMOOTHING, dtNorm);
    this.currentForce += (targetForce - this.currentForce) * smoothing;
  }

  getForce(): number {
    return this.currentForce;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
