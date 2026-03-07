export function shouldQueueGameplayInput(
  isRunning: boolean,
  isMenuPaused: boolean,
  isTerminal: boolean
): boolean {
  return isRunning && !isMenuPaused && !isTerminal;
}
