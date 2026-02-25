import { Game } from './game';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game('gameCanvas');
    game.start();
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
});

