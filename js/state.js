/**
 * Calcirix — Game State Management
 * Handles undo/redo history stacks, cell selection, timer, notes mode, mistakes, and persistent records.
 */
(function(root) {
  'use strict';

  const Calcirix = root.Calcirix = root.Calcirix || {};

  function loadStorage(key, defaultVal) {
    try {
      const data = localStorage.getItem(key);
      return data !== null ? JSON.parse(data) : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  }

  function saveStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  class GameState {
    constructor() {
      this.levelId = 1;
      this.difficultyId = 'medium';
      this.puzzle = null;
      this.board = [];
      this.notes = [];
      this.history = [];
      this.future = [];
      this.selectedCell = null;
      this.notesMode = false;
      this.mistakes = 0;
      this.hintsUsed = 0;
      this.timerSeconds = 0;
      this.timerHandle = null;
      this.isPaused = false;
      this.isGameOver = false;
      this.isSolved = false;

      this.streak = loadStorage(Calcirix.CONFIG.STORAGE_KEYS.STREAK, 0);
      this.bestTimes = loadStorage(Calcirix.CONFIG.STORAGE_KEYS.BEST_TIMES, {});
      
      const lastLevel = loadStorage(Calcirix.CONFIG.STORAGE_KEYS.LAST_LEVEL, 1);
      const lastDiff = loadStorage(Calcirix.CONFIG.STORAGE_KEYS.LAST_DIFFICULTY, 'medium');
      this.levelId = Calcirix.LEVELS[lastLevel] ? lastLevel : 1;
      this.difficultyId = Calcirix.DIFFICULTIES[lastDiff] ? lastDiff : 'medium';
    }

    startPuzzle(levelId = this.levelId, difficultyId = this.difficultyId) {
      this.levelId = levelId;
      this.difficultyId = difficultyId;
      saveStorage(Calcirix.CONFIG.STORAGE_KEYS.LAST_LEVEL, levelId);
      saveStorage(Calcirix.CONFIG.STORAGE_KEYS.LAST_DIFFICULTY, difficultyId);

      this.puzzle = Calcirix.Engine.generatePuzzle(levelId, difficultyId);
      const size = this.puzzle.size;

      this.board = Calcirix.Engine.clone2D(this.puzzle.initialBoard);
      this.notes = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => new Set())
      );

      this.history = [];
      this.future = [];
      this.selectedCell = null;
      this.notesMode = false;
      this.mistakes = 0;
      this.hintsUsed = 0;
      this.timerSeconds = 0;
      this.isPaused = false;
      this.isGameOver = false;
      this.isSolved = false;

      this.startTimer();
    }

    restartCurrentPuzzle() {
      if (!this.puzzle) return;
      const size = this.puzzle.size;
      this.board = Calcirix.Engine.clone2D(this.puzzle.initialBoard);
      this.notes = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => new Set())
      );
      this.history = [];
      this.future = [];
      this.selectedCell = null;
      this.mistakes = 0;
      this.hintsUsed = 0;
      this.timerSeconds = 0;
      this.isPaused = false;
      this.isGameOver = false;
      this.isSolved = false;
      this.startTimer();
    }

    startTimer() {
      if (this.timerHandle) clearInterval(this.timerHandle);
      this.timerHandle = setInterval(() => {
        if (!this.isPaused && !this.isGameOver) {
          this.timerSeconds++;
          if (Calcirix.UI && Calcirix.UI.updateTimer) {
            Calcirix.UI.updateTimer(this.timerSeconds);
          }
        }
      }, 1000);
    }

    stopTimer() {
      if (this.timerHandle) {
        clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
    }

    pause() {
      if (this.isGameOver) return;
      this.isPaused = true;
    }

    resume() {
      if (this.isGameOver) return;
      this.isPaused = false;
    }

    selectCell(r, c) {
      if (this.isGameOver || this.isPaused) return;
      this.selectedCell = { r, c };
    }

    clearSelection() {
      this.selectedCell = null;
    }

    isGiven(r, c) {
      return Boolean(this.puzzle && this.puzzle.givensMask[r][c]);
    }

    toggleNotesMode() {
      this.notesMode = !this.notesMode;
      return this.notesMode;
    }

    // Set value or note on the selected cell
    applyInput(val) {
      if (!this.selectedCell || this.isGameOver || this.isPaused) return null;
      const { r, c } = this.selectedCell;
      if (this.isGiven(r, c)) {
        return { type: 'given_locked' };
      }

      if (val === 0) {
        return this.clearCell(r, c);
      }

      if (this.notesMode) {
        const cellNotes = this.notes[r][c];
        const prevSet = new Set(cellNotes);
        if (cellNotes.has(val)) {
          cellNotes.delete(val);
        } else {
          cellNotes.add(val);
        }
        const nextSet = new Set(cellNotes);

        this.history.push({
          type: 'notes',
          r, c,
          prevNotes: prevSet,
          nextNotes: nextSet
        });
        this.future = []; // Clear redo stack on new action
        return { type: 'note_toggled', r, c, val };
      }

      const prevVal = this.board[r][c];
      if (prevVal === val) return null; // unchanged

      const prevNotes = new Set(this.notes[r][c]);
      this.history.push({
        type: 'value',
        r, c,
        prevVal,
        nextVal: val,
        prevNotes
      });
      this.future = []; // Clear redo stack

      this.board[r][c] = val;
      this.notes[r][c].clear();

      // Check correctness
      const isCorrectValue = val === this.puzzle.solution[r][c];
      const hasConflict = Calcirix.Engine.hasLiveConflict(this.board, r, c, val, this.puzzle.levelConfig);

      if (!isCorrectValue || hasConflict) {
        this.mistakes++;
        if (this.mistakes >= Calcirix.CONFIG.MAX_MISTAKES) {
          this.endGame(false);
          return { type: 'mistake_gameover', r, c, val, mistakes: this.mistakes };
        }
        return { type: 'mistake', r, c, val, mistakes: this.mistakes, hasConflict };
      }

      // Check if board is complete and correct
      const evalResult = Calcirix.Engine.evaluateBoard(
        this.board,
        this.puzzle.solution,
        this.puzzle.cages,
        this.puzzle.levelConfig
      );

      if (evalResult.isComplete && evalResult.isCorrect) {
        this.endGame(true);
        return { type: 'solved', r, c, val };
      }

      return { type: 'correct_step', r, c, val };
    }

    clearCell(r, c) {
      if (this.isGiven(r, c)) return { type: 'given_locked' };

      const prevVal = this.board[r][c];
      const prevNotes = new Set(this.notes[r][c]);

      if (prevVal === 0 && prevNotes.size === 0) return null;

      this.history.push({
        type: 'clear',
        r, c,
        prevVal,
        prevNotes
      });
      this.future = [];

      this.board[r][c] = 0;
      this.notes[r][c].clear();
      return { type: 'cleared', r, c };
    }

    undo() {
      if (this.history.length === 0 || this.isGameOver || this.isPaused) return false;
      const action = this.history.pop();
      const { r, c } = action;

      if (action.type === 'notes') {
        this.future.push({
          type: 'notes',
          r, c,
          prevNotes: new Set(this.notes[r][c]),
          nextNotes: action.prevNotes
        });
        this.notes[r][c] = new Set(action.prevNotes);
      } else if (action.type === 'value') {
        this.future.push({
          type: 'value',
          r, c,
          prevVal: this.board[r][c],
          nextVal: action.prevVal,
          prevNotes: new Set(this.notes[r][c])
        });
        this.board[r][c] = action.prevVal;
        this.notes[r][c] = new Set(action.prevNotes);
      } else if (action.type === 'clear') {
        this.future.push({
          type: 'clear',
          r, c,
          prevVal: 0,
          prevNotes: new Set()
        });
        this.board[r][c] = action.prevVal;
        this.notes[r][c] = new Set(action.prevNotes);
      }

      this.selectedCell = { r, c };
      return true;
    }

    redo() {
      if (this.future.length === 0 || this.isGameOver || this.isPaused) return false;
      const action = this.future.pop();
      const { r, c } = action;

      if (action.type === 'notes') {
        this.history.push({
          type: 'notes',
          r, c,
          prevNotes: new Set(this.notes[r][c]),
          nextNotes: action.nextNotes
        });
        this.notes[r][c] = new Set(action.nextNotes);
      } else if (action.type === 'value') {
        this.history.push({
          type: 'value',
          r, c,
          prevVal: this.board[r][c],
          nextVal: action.nextVal,
          prevNotes: new Set(this.notes[r][c])
        });
        this.board[r][c] = action.nextVal;
        this.notes[r][c].clear();
      } else if (action.type === 'clear') {
        this.history.push({
          type: 'clear',
          r, c,
          prevVal: this.board[r][c],
          prevNotes: new Set(this.notes[r][c])
        });
        this.board[r][c] = 0;
        this.notes[r][c].clear();
      }

      this.selectedCell = { r, c };
      return true;
    }

    useHint() {
      if (this.isGameOver || this.isPaused) return null;
      const size = this.puzzle.size;

      // Find an empty cell or incorrect cell
      const candidates = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!this.isGiven(r, c) && this.board[r][c] !== this.puzzle.solution[r][c]) {
            // Find cage size for prioritizing smaller cages
            const cageId = this.puzzle.idGrid[r][c];
            const cage = this.puzzle.cages.find(cg => cg.id === cageId);
            candidates.push({ r, c, cageSize: cage ? cage.cells.length : 3 });
          }
        }
      }

      if (candidates.length === 0) return null;

      // Prefer cells in small cages
      candidates.sort((a, b) => a.cageSize - b.cageSize);
      const chosen = candidates[0];
      const correctVal = this.puzzle.solution[chosen.r][chosen.c];

      this.selectedCell = { r: chosen.r, c: chosen.c };
      this.hintsUsed++;

      // Fill in cell correctly
      const prevVal = this.board[chosen.r][chosen.c];
      const prevNotes = new Set(this.notes[chosen.r][chosen.c]);
      this.history.push({
        type: 'value',
        r: chosen.r,
        c: chosen.c,
        prevVal,
        nextVal: correctVal,
        prevNotes
      });
      this.future = [];

      this.board[chosen.r][chosen.c] = correctVal;
      this.notes[chosen.r][chosen.c].clear();

      // Check if this completed the puzzle
      const evalResult = Calcirix.Engine.evaluateBoard(
        this.board,
        this.puzzle.solution,
        this.puzzle.cages,
        this.puzzle.levelConfig
      );

      if (evalResult.isComplete && evalResult.isCorrect) {
        this.endGame(true);
        return { cell: chosen, val: correctVal, solved: true };
      }

      return { cell: chosen, val: correctVal, solved: false };
    }

    getRemainingEmptyCount() {
      if (!this.puzzle) return 0;
      let count = 0;
      for (let r = 0; r < this.puzzle.size; r++) {
        for (let c = 0; c < this.puzzle.size; c++) {
          if (this.board[r][c] === 0) count++;
        }
      }
      return count;
    }

    endGame(won) {
      this.isGameOver = true;
      this.isSolved = won;
      this.stopTimer();

      if (won) {
        this.streak++;
        saveStorage(Calcirix.CONFIG.STORAGE_KEYS.STREAK, this.streak);

        // Record best time
        const key = `${this.levelId}_${this.difficultyId}`;
        const prevBest = this.bestTimes[key] || null;
        if (!prevBest || this.timerSeconds < prevBest) {
          this.bestTimes[key] = this.timerSeconds;
          saveStorage(Calcirix.CONFIG.STORAGE_KEYS.BEST_TIMES, this.bestTimes);
        }
      } else {
        this.streak = 0;
        saveStorage(Calcirix.CONFIG.STORAGE_KEYS.STREAK, 0);
      }
    }
  }

  Calcirix.State = new GameState();

})(typeof window !== 'undefined' ? window : globalThis);
