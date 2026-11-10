/**
 * Calcirix — Main Application Controller
 * Handles user interactions, keyboard shortcuts, game transitions, and lifecycle events.
 */
(function(root) {
  'use strict';

  const Calcirix = root.Calcirix = root.Calcirix || {};

  const App = {
    init: function() {
      Calcirix.UI.initElements();

      this.bindMenuEvents();
      this.bindGameEvents();
      this.bindKeyboardEvents();
      this.bindWindowEvents();

      // Set initial sound icon
      Calcirix.UI.updateSoundIcons(Calcirix.Audio.isMuted());
      Calcirix.UI.updateDifficultyPills(Calcirix.State.difficultyId);

      // Start on Menu screen
      Calcirix.UI.showScreen('menu');
    },

    bindMenuEvents: function() {
      const UI = Calcirix.UI;
      const State = Calcirix.State;

      // Difficulty selection pills
      UI.elements.difficultyPills.forEach(pill => {
        pill.addEventListener('click', () => {
          const diff = pill.dataset.diff;
          State.difficultyId = diff;
          UI.updateDifficultyPills(diff);
          UI.renderMenuCards();
          Calcirix.Audio.playTap();
        });
      });

      // Sound toggle buttons
      [UI.elements.btnSoundToggle, UI.elements.btnHeaderSound].forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', () => {
          const isMuted = Calcirix.Audio.toggleMute();
          UI.updateSoundIcons(isMuted);
          if (!isMuted) Calcirix.Audio.playTap();
        });
      });

      // Start Game Button
      UI.elements.btnStartGame.addEventListener('click', () => {
        Calcirix.Audio.playTap();
        this.startGameSession(State.levelId, State.difficultyId);
      });

      // How to Play button
      UI.elements.btnHowToPlay.addEventListener('click', () => {
        Calcirix.Audio.playTap();
        UI.showRulesModal(true);
      });

      UI.elements.btnRulesClose.addEventListener('click', () => {
        Calcirix.Audio.playTap();
        UI.showRulesModal(false);
      });
    },

    bindGameEvents: function() {
      const UI = Calcirix.UI;
      const State = Calcirix.State;

      // Menu button from game screen
      UI.elements.btnReturnMenu.addEventListener('click', () => {
        Calcirix.Audio.playTap();
        if (State.history.length > 0 && !State.isGameOver) {
          UI.showConfirmExitModal(true);
        } else {
          State.stopTimer();
          UI.showScreen('menu');
        }
      });

      // Confirm Exit Modal buttons
      UI.elements.btnConfirmCancel.addEventListener('click', () => {
        Calcirix.Audio.playTap();
        UI.showConfirmExitModal(false);
      });

      UI.elements.btnConfirmLeave.addEventListener('click', () => {
        Calcirix.Audio.playTap();
        UI.showConfirmExitModal(false);
        State.stopTimer();
        UI.showScreen('menu');
      });

      // Pause button & resume
      UI.elements.btnPause.addEventListener('click', () => {
        Calcirix.Audio.playTap();
        if (State.isPaused) {
          State.resume();
          UI.setPauseOverlay(false);
        } else {
          State.pause();
          UI.setPauseOverlay(true);
        }
      });

      UI.elements.btnResumePause.addEventListener('click', () => {
        Calcirix.Audio.playTap();
        State.resume();
        UI.setPauseOverlay(false);
      });

      // Notes button
      UI.elements.btnNotes.addEventListener('click', () => {
        const active = State.toggleNotesMode();
        Calcirix.Audio.playTap();
        UI.updateHUD();
        UI.setMessage(active ? 'Notes mode ON — tapping numbers toggles pencil marks.' : 'Notes mode OFF.');
      });

      // Undo button
      UI.elements.btnUndo.addEventListener('click', () => {
        if (State.undo()) {
          Calcirix.Audio.playUndo();
          UI.renderBoard();
          UI.setMessage('Action undone.');
        }
      });

      // Redo button
      UI.elements.btnRedo.addEventListener('click', () => {
        if (State.redo()) {
          Calcirix.Audio.playTap();
          UI.renderBoard();
          UI.setMessage('Action redone.');
        }
      });

      // Hint button
      UI.elements.btnHint.addEventListener('click', () => {
        const res = State.useHint();
        if (res) {
          Calcirix.Audio.playHint();
          UI.renderBoard();
          UI.flashCell(res.cell.r, res.cell.c, 'correct');
          UI.setMessage(`Hint applied at row ${res.cell.r + 1}, column ${res.cell.c + 1}!`);
          if (res.solved) {
            setTimeout(() => {
              Calcirix.Audio.playVictory();
              UI.showVictoryModal();
            }, 300);
          }
        } else {
          UI.setMessage('No hints needed or all candidate cells solved.');
        }
      });

      // Verify Solution button
      UI.elements.btnVerify.addEventListener('click', () => {
        if (State.isGameOver || State.isPaused) return;

        const evalRes = Calcirix.Engine.evaluateBoard(
          State.board,
          State.puzzle.solution,
          State.puzzle.cages,
          State.puzzle.levelConfig
        );

        if (!evalRes.isComplete) {
          Calcirix.Audio.playConflict();
          UI.setMessage('Board is not full yet — fill all cells first.', true);
        } else if (evalRes.isCorrect) {
          State.endGame(true);
          Calcirix.Audio.playVictory();
          UI.showVictoryModal();
        } else {
          Calcirix.Audio.playConflict();
          evalRes.conflicts.forEach(c => UI.flashCell(c.r, c.c, 'conflict'));
          UI.setMessage('Discrepancies found — check rows, columns, blocks, and cage arithmetic.', true);
        }
      });

      // New Game button
      UI.elements.btnNewGame.addEventListener('click', () => {
        Calcirix.Audio.playTap();
        State.startPuzzle(State.levelId, State.difficultyId);
        UI.renderBoard();
        UI.setMessage(`New ${State.puzzle.difficultyConfig.name} puzzle generated.`);
      });
    },

    startGameSession: function(levelId, difficultyId) {
      const State = Calcirix.State;
      const UI = Calcirix.UI;

      State.startPuzzle(levelId, difficultyId);
      UI.showScreen('game');
      UI.renderBoard();
      UI.setMessage(`Level ${levelId} ready. Select an empty cell to begin.`);
    },

    handleNumpadInput: function(val) {
      const State = Calcirix.State;
      const UI = Calcirix.UI;

      if (!State.selectedCell) {
        UI.setMessage('Select a grid cell first.');
        return;
      }

      const res = State.applyInput(val);
      if (!res) return;

      if (res.type === 'given_locked') {
        Calcirix.Audio.playConflict();
        UI.setMessage('That cell is a fixed starter clue and cannot be modified.');
        return;
      }

      if (res.type === 'note_toggled') {
        Calcirix.Audio.playTap();
        UI.renderBoard();
        return;
      }

      if (res.type === 'cleared') {
        Calcirix.Audio.playUndo();
        UI.renderBoard();
        UI.setMessage(`Cleared cell at row ${res.r + 1}, column ${res.c + 1}.`);
        return;
      }

      if (res.type === 'mistake' || res.type === 'mistake_gameover') {
        Calcirix.Audio.playConflict();
        UI.renderBoard();
        UI.flashCell(res.r, res.c, 'conflict');
        if (res.hasConflict) {
          UI.setMessage('Duplicate value in row, column, or block!', true);
        } else {
          UI.setMessage('Incorrect value for this cell.', true);
        }

        if (res.type === 'mistake_gameover') {
          setTimeout(() => {
            UI.showGameOverModal();
          }, 350);
        }
        return;
      }

      if (res.type === 'correct_step' || res.type === 'solved') {
        Calcirix.Audio.playPlace();
        UI.renderBoard();
        UI.flashCell(res.r, res.c, 'correct');
        UI.setMessage('Solid deduction — fits the cage and grid.', false, true);

        if (res.type === 'solved') {
          setTimeout(() => {
            Calcirix.Audio.playVictory();
            UI.showVictoryModal();
          }, 350);
        }
      }
    },

    bindKeyboardEvents: function() {
      const State = Calcirix.State;
      const UI = Calcirix.UI;

      document.addEventListener('keydown', (e) => {
        // Modal light-dismiss on Escape
        if (e.key === 'Escape') {
          if (!UI.elements.rulesModal.classList.contains('hidden')) {
            UI.showRulesModal(false);
            return;
          }
          if (!UI.elements.confirmModal.classList.contains('hidden')) {
            UI.showConfirmExitModal(false);
            return;
          }
          if (State.selectedCell) {
            State.clearSelection();
            UI.renderBoard();
            return;
          }
        }

        // Only handle gameplay shortcuts when game screen is active
        if (UI.elements.gameView.classList.contains('hidden') || State.isPaused || State.isGameOver) {
          return;
        }

        const size = State.puzzle ? State.puzzle.size : 4;

        // Number keys (1 to size)
        if (e.key >= '1' && e.key <= String(size)) {
          e.preventDefault();
          this.handleNumpadInput(parseInt(e.key, 10));
          return;
        }

        // Clear keys
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
          e.preventDefault();
          this.handleNumpadInput(0);
          return;
        }

        // Toggle notes ('n' or 'N')
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          const active = State.toggleNotesMode();
          Calcirix.Audio.playTap();
          UI.updateHUD();
          UI.setMessage(active ? 'Notes mode ON.' : 'Notes mode OFF.');
          return;
        }

        // Undo (Ctrl+Z or 'u')
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          e.preventDefault();
          if (State.undo()) {
            Calcirix.Audio.playUndo();
            UI.renderBoard();
          }
          return;
        }

        // Redo (Ctrl+Y or Ctrl+Shift+Z or 'r')
        if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
          e.preventDefault();
          if (State.redo()) {
            Calcirix.Audio.playTap();
            UI.renderBoard();
          }
          return;
        }

        // Hint ('h' or 'H')
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          UI.elements.btnHint.click();
          return;
        }

        // Arrow navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          if (!State.selectedCell) {
            State.selectCell(0, 0);
          } else {
            let { r, c } = State.selectedCell;
            if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
            if (e.key === 'ArrowDown') r = Math.min(size - 1, r + 1);
            if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
            if (e.key === 'ArrowRight') c = Math.min(size - 1, c + 1);
            State.selectCell(r, c);
          }
          Calcirix.Audio.playTap();
          UI.renderBoard();
        }
      });
    },

    bindWindowEvents: function() {
      // Auto-pause when switching tabs to prevent timer running unexpectedly
      document.addEventListener('visibilitychange', () => {
        const State = Calcirix.State;
        const UI = Calcirix.UI;
        if (document.hidden && !State.isGameOver && !State.isPaused && !UI.elements.gameView.classList.contains('hidden')) {
          State.pause();
          UI.setPauseOverlay(true);
        }
      });
    }
  };

  Calcirix.App = App;

  // Boot on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
      App.init();
    }
  }

})(typeof window !== 'undefined' ? window : globalThis);
