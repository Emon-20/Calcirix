/**
 * Calcirix — Logic Puzzle Engine
 * Modular architecture located in `js/`:
 * - js/constants.js : Configuration, level presets, operators, and storage keys
 * - js/audio.js     : Web Audio API sound synthesizer
 * - js/engine.js    : Multi-level Latin square & Sudoku generator + KenKen arithmetic engine
 * - js/state.js     : Game state machine, undo/redo history, timer, notes, and mistakes
 * - js/ui.js        : Dynamic grid, responsive numpad, modal dialogs, and confetti effects
 * - js/app.js       : Controller wiring event listeners and keyboard shortcuts
 */
'use strict';
if (typeof window !== 'undefined' && !window.Calcirix) {
  console.info('Calcirix modular scripts loaded via js/*.js');
}
