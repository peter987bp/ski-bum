import { stepGame } from './stepGame.js';
import { CoreGameState, StepCommand } from './types.js';

export function stepBrowserFrame(
  state: CoreGameState,
  commands: StepCommand[],
  dtFrames: number
): CoreGameState {
  return stepGame(state, { commands }, dtFrames);
}

export function stepSimulationTick(
  state: CoreGameState,
  step: number,
  commandProvider: (step: number) => StepCommand[],
  dtFrames: number
): CoreGameState {
  return stepGame(state, { commands: commandProvider(step) }, dtFrames);
}
