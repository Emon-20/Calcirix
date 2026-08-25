'use strict';

/* ==========================================================================
   Calcirix — 4x4 Sudoku/KenKen hybrid engine
   - Randomised, uniquely-solvable puzzles generated on every "New Puzzle"
   - Cages are computed from the real solution and carry real +,-,×,÷ rules
   - Sudoku rules (row / column / 2x2 block) enforced live
   ========================================================================== */

const SIZE = 4;
const DIFFICULTY_GIVENS = { easy: 9, medium: 7, hard: 5 };
const MAX_MISTAKES = 3;

let solutionBoard = [];
let cages = [];             // [{ cells:[[r,c],...], op, target, id }]
let cageIdGrid = [];         // cageIdGrid[r][c] -> cage id
let boardState = [];         // current values, 0 = empty
let givenMask = [];          // true = prefilled/locked cell
let notesState = [];         // notesState[r][c] = Set of pencil marks
let history = [];            // undo stack of {r,c,prevVal}
let selectedCell = null;
let notesMode = false;
let mistakes = 0;
let winStreak = 0;
let timerSeconds = 0;
let timerHandle = null;
let gameOver = false;

const gridElement = document.getElementById('grid-board');
const messageBox = document.getElementById('message-box');
const timerDisplay = document.getElementById('timer-display');
const mistakeDisplay = document.getElementById('mistake-display');
const streakDisplay = document.getElementById('streak-display');
const difficultySelect = document.getElementById('difficulty-select');
const notesBtn = document.getElementById('notes-btn');
const undoBtn = document.getElementById('undo-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalStats = document.getElementById('modal-stats');
const modalIcon = document.getElementById('modal-icon');
const modalCloseBtn = document.getElementById('modal-close-btn');

/* ---------------------------------------------------------------------- */
/* Utilities                                                               */
/* ---------------------------------------------------------------------- */

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function allCells() {
  const cells = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) cells.push([r, c]);
  return cells;
}

function cloneBoard(board) {
  return board.map(row => row.slice());
}

/* ---------------------------------------------------------------------- */
/* Solution generation (randomised backtracking, Sudoku rules)            */
/* ---------------------------------------------------------------------- */

function isSudokuValid(board, r, c, v) {
  for (let i = 0; i < SIZE; i++) {
    if (board[r][i] === v) return false;
    if (board[i][c] === v) return false;
  }
  const br = Math.floor(r / 2) * 2;
  const bc = Math.floor(c / 2) * 2;
  for (let i = br; i < br + 2; i++) {
    for (let j = bc; j < bc + 2; j++) {
      if (board[i][j] === v) return false;
    }
  }
  return true;
}

function generateSolution() {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  function fill(pos) {
    if (pos === SIZE * SIZE) return true;
    const r = Math.floor(pos / SIZE);
    const c = pos % SIZE;
    for (const v of shuffle([1, 2, 3, 4])) {
      if (isSudokuValid(board, r, c, v)) {
        board[r][c] = v;
        if (fill(pos + 1)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }

  fill(0);
  return board;
}

/* ---------------------------------------------------------------------- */
/* Cage generation                                                         */
/* ---------------------------------------------------------------------- */

function checkCage(cage, vals) {
  switch (cage.op) {
    case '=': return vals[0] === cage.target;
    case '+': return vals.reduce((a, b) => a + b, 0) === cage.target;
    case '\u00d7': return vals.reduce((a, b) => a * b, 1) === cage.target;
    case '-': return Math.abs(vals[0] - vals[1]) === cage.target;
    case '\u00f7': {
      const hi = Math.max(vals[0], vals[1]);
      const lo = Math.min(vals[0], vals[1]);
      return lo !== 0 && hi / lo === cage.target;
    }
    default: return true;
  }
}

function computeCageClue(cells, solution) {
  const vals = cells.map(([r, c]) => solution[r][c]);

  if (vals.length === 1) {
    return { op: '=', target: vals[0] };
  }

  const options = ['+', '\u00d7'];
  if (vals.length === 2) {
    options.push('-');
    const hi = Math.max(vals[0], vals[1]);
    const lo = Math.min(vals[0], vals[1]);
    if (lo !== 0 && hi % lo === 0) options.push('\u00f7');
  }

  const op = options[Math.floor(Math.random() * options.length)];
  let target;
  switch (op) {
    case '+': target = vals.reduce((a, b) => a + b, 0); break;
    case '\u00d7': target = vals.reduce((a, b) => a * b, 1); break;
    case '-': target = Math.abs(vals[0] - vals[1]); break;
    case '\u00f7': target = Math.max(...vals) / Math.min(...vals); break;
  }
  return { op, target };
}

function generateCages(solution) {
  const idGrid = Array.from({ length: SIZE }, () => Array(SIZE).fill(-1));
  const cellsList = shuffle(allCells());
  const rawCages = [];
  let nextId = 0;

  for (const [r, c] of cellsList) {
    if (idGrid[r][c] !== -1) continue;

    const targetSize = 1 + Math.floor(Math.random() * 3); // 1..3 cells
    const group = [[r, c]];
    idGrid[r][c] = nextId;

    let attempts = 0;
    while (group.length < targetSize && attempts < 12) {
      attempts++;
      const [gr, gc] = group[Math.floor(Math.random() * group.length)];
      const neighbours = [[gr - 1, gc], [gr + 1, gc], [gr, gc - 1], [gr, gc + 1]]
        .filter(([nr, nc]) => nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && idGrid[nr][nc] === -1);
      if (neighbours.length === 0) continue;
      const [nr, nc] = neighbours[Math.floor(Math.random() * neighbours.length)];
      idGrid[nr][nc] = nextId;
      group.push([nr, nc]);
    }

    rawCages.push({ id: nextId, cells: group });
    nextId++;
  }

  const finishedCages = rawCages.map(cage => ({
    ...cage,
    ...computeCageClue(cage.cells, solution)
  }));

  return { cages: finishedCages, idGrid };
}

/* ---------------------------------------------------------------------- */
/* Uniqueness solver (Sudoku rules + cage rules, capped counter)          */
/* ---------------------------------------------------------------------- */

function countSolutions(puzzle, cageList, cap) {
  const board = cloneBoard(puzzle);
  let count = 0;

  function cagesOkForFullCages() {
    for (const cage of cageList) {
      const vals = cage.cells.map(([r, c]) => board[r][c]);
      if (vals.includes(0)) continue;
      if (!checkCage(cage, vals)) return false;
    }
    return true;
  }

  function backtrack(pos) {
    if (count >= cap) return;
    if (pos === SIZE * SIZE) { count++; return; }
    const r = Math.floor(pos / SIZE);
    const c = pos % SIZE;
    if (board[r][c] !== 0) { backtrack(pos + 1); return; }

    for (let v = 1; v <= SIZE; v++) {
      if (!isSudokuValid(board, r, c, v)) continue;
      board[r][c] = v;
      if (cagesOkForFullCages()) backtrack(pos + 1);
      board[r][c] = 0;
      if (count >= cap) return;
    }
  }

  backtrack(0);
  return count;
}

/* ---------------------------------------------------------------------- */
/* Puzzle assembly                                                         */
/* ---------------------------------------------------------------------- */

function generatePuzzle(difficulty) {
  const solution = generateSolution();
  const { cages: cageList, idGrid } = generateCages(solution);

  let puzzle = cloneBoard(solution);
  const targetGivens = DIFFICULTY_GIVENS[difficulty] ?? DIFFICULTY_GIVENS.medium;
  const order = shuffle(allCells());

  for (const [r, c] of order) {
    const currentGivens = puzzle.flat().filter(v => v !== 0).length;
    if (currentGivens <= targetGivens) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const solutionCount = countSolutions(puzzle, cageList, 2);
    if (solutionCount !== 1) {
      puzzle[r][c] = backup; // removing this cell breaks uniqueness, keep it
    }
  }

  return { solution, cages: cageList, idGrid, puzzle };
}

/* ---------------------------------------------------------------------- */
/* Game lifecycle                                                          */
/* ---------------------------------------------------------------------- */

function startNewGame() {
  const difficulty = difficultySelect.value;
  const { solution, cages: cageList, idGrid, puzzle } = generatePuzzle(difficulty);

  solutionBoard = solution;
  cages = cageList;
  cageIdGrid = idGrid;
  boardState = cloneBoard(puzzle);
  givenMask = boardState.map(row => row.map(v => v !== 0));
  notesState = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => new Set()));
  history = [];
  selectedCell = null;
  notesMode = false;
  mistakes = 0;
  gameOver = false;
  timerSeconds = 0;

  notesBtn.textContent = '\u270f\ufe0f Notes: Off';
  notesBtn.setAttribute('aria-pressed', 'false');
  updateMistakeDisplay();
  updateTimerDisplay();
  restartTimer();

  messageBox.style.color = '';
  messageBox.textContent = `New ${difficulty} puzzle ready. Pick a cell to begin.`;

  renderBoard();
}

function restartTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (gameOver) return;
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const s = (timerSeconds % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `${m}:${s}`;
}

function updateMistakeDisplay() {
  mistakeDisplay.textContent = `${mistakes} / ${MAX_MISTAKES}`;
  mistakeDisplay.classList.toggle('warn', mistakes > 0);
}

/* ---------------------------------------------------------------------- */
/* Rendering                                                                */
/* ---------------------------------------------------------------------- */

function cageClueOrigin(cageId) {
  const cage = cages.find(cg => cg.id === cageId);
  return cage.cells.reduce((top, cell) =>
    (cell[0] < top[0] || (cell[0] === top[0] && cell[1] < top[1])) ? cell : top
  );
}

function formatClue(cage) {
  if (cage.op === '=') return `${cage.target}`;
  return `${cage.target}${cage.op}`;
}

function renderBoard() {
  gridElement.innerHTML = '';

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;

      const myCageId = cageIdGrid[r][c];
      const rightCageId = c + 1 < SIZE ? cageIdGrid[r][c + 1] : null;
      const bottomCageId = r + 1 < SIZE ? cageIdGrid[r + 1][c] : null;
      if (rightCageId !== null && rightCageId !== myCageId) cell.classList.add('cage-edge-right');
      if (bottomCageId !== null && bottomCageId !== myCageId) cell.classList.add('cage-edge-bottom');

      const [originR, originC] = cageClueOrigin(myCageId);
      if (originR === r && originC === c) {
        const cage = cages.find(cg => cg.id === myCageId);
        if (cage.cells.length > 1 || cage.op !== '=') {
          const clue = document.createElement('span');
          clue.classList.add('cage-clue');
          clue.textContent = formatClue(cage);
          cell.appendChild(clue);
        }
      }

      if (givenMask[r][c]) {
        cell.classList.add('given');
        const valueSpan = document.createElement('span');
        valueSpan.textContent = boardState[r][c];
        cell.appendChild(valueSpan);
      } else if (boardState[r][c] !== 0) {
        const valueSpan = document.createElement('span');
        valueSpan.textContent = boardState[r][c];
        cell.appendChild(valueSpan);
      } else if (notesState[r][c].size > 0) {
        const notesGrid = document.createElement('div');
        notesGrid.classList.add('notes-grid');
        for (let n = 1; n <= 4; n++) {
          const span = document.createElement('span');
          span.textContent = notesState[r][c].has(n) ? n : '';
          notesGrid.appendChild(span);
        }
        cell.appendChild(notesGrid);
      }

      if (gameOver) cell.classList.add('locked');

      cell.addEventListener('click', () => selectCell(r, c));
      gridElement.appendChild(cell);
    }
  }

  applySelectionHighlights();
}

function applySelectionHighlights() {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('selected', 'peer');
  });

  if (!selectedCell) return;
  const { r, c } = selectedCell;
  const br = Math.floor(r / 2) * 2;
  const bc = Math.floor(c / 2) * 2;

  document.querySelectorAll('.cell').forEach(cell => {
    const cr = Number(cell.dataset.row);
    const cc = Number(cell.dataset.col);
    if (cr === r && cc === c) {
      cell.classList.add('selected');
    } else if (
      cr === r || cc === c ||
      (cr >= br && cr < br + 2 && cc >= bc && cc < bc + 2)
    ) {
      cell.classList.add('peer');
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Interaction                                                             */
/* ---------------------------------------------------------------------- */

function selectCell(r, c) {
  if (gameOver) return;
  if (givenMask[r][c]) {
    messageBox.style.color = '';
    messageBox.textContent = 'That cell is a fixed clue and cannot be changed.';
    return;
  }
  selectedCell = { r, c };
  applySelectionHighlights();
  messageBox.style.color = '';
  messageBox.textContent = `Selected row ${r + 1}, column ${c + 1}.`;
}

function hasLiveConflict(r, c, v) {
  for (let i = 0; i < SIZE; i++) {
    if (i !== c && boardState[r][i] === v) return true;
    if (i !== r && boardState[i][c] === v) return true;
  }
  const br = Math.floor(r / 2) * 2;
  const bc = Math.floor(c / 2) * 2;
  for (let i = br; i < br + 2; i++) {
    for (let j = bc; j < bc + 2; j++) {
      if ((i !== r || j !== c) && boardState[i][j] === v) return true;
    }
  }
  return false;
}

function placeValue(r, c, val) {
  if (givenMask[r][c] || gameOver) return;

  if (notesMode && val !== 0) {
    if (notesState[r][c].has(val)) {
      notesState[r][c].delete(val);
    } else {
      notesState[r][c].add(val);
    }
    renderBoard();
    reselect(r, c);
    return;
  }

  const prevVal = boardState[r][c];
  if (prevVal === val) return;

  history.push({ r, c, prevVal });
  boardState[r][c] = val;
  notesState[r][c].clear();

  renderBoard();
  reselect(r, c);

  if (val === 0) {
    messageBox.style.color = '';
    messageBox.textContent = `Cleared row ${r + 1}, column ${c + 1}.`;
    return;
  }

  const cellEl = document.querySelector(`[data-row='${r}'][data-col='${c}']`);

  if (val !== solutionBoard[r][c] || hasLiveConflict(r, c, val)) {
    mistakes++;
    updateMistakeDisplay();
    if (cellEl) cellEl.classList.add('conflict');
    messageBox.style.color = 'var(--danger)';
    messageBox.textContent = hasLiveConflict(r, c, val)
      ? 'That value already exists in this row, column, or block.'
      : "That doesn't fit here — try again.";

    if (mistakes >= MAX_MISTAKES) {
      endGame(false);
    }
  } else {
    if (cellEl) cellEl.classList.add('correct-flash');
    messageBox.style.color = '';
    messageBox.textContent = 'Nice — that fits.';
    maybeAutoCheckWin();
  }
}

function reselect(r, c) {
  selectedCell = { r, c };
  applySelectionHighlights();
}

function maybeAutoCheckWin() {
  const isFull = boardState.every(row => row.every(v => v !== 0));
  if (!isFull) return;
  const { isCorrect } = evaluateBoard();
  if (isCorrect) endGame(true);
}

/* ---------------------------------------------------------------------- */
/* Verification                                                            */
/* ---------------------------------------------------------------------- */

function evaluateBoard() {
  let isComplete = true;
  let isCorrect = true;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (boardState[r][c] === 0) {
        isComplete = false;
        continue;
      }
      if (boardState[r][c] !== solutionBoard[r][c]) isCorrect = false;
      if (hasLiveConflict(r, c, boardState[r][c])) isCorrect = false;
    }
  }

  for (const cage of cages) {
    const vals = cage.cells.map(([r, c]) => boardState[r][c]);
    if (vals.includes(0)) continue;
    if (!checkCage(cage, vals)) isCorrect = false;
  }

  return { isComplete, isCorrect };
}

document.getElementById('check-btn').addEventListener('click', () => {
  if (gameOver) return;
  const { isComplete, isCorrect } = evaluateBoard();

  if (!isComplete) {
    messageBox.style.color = 'var(--danger)';
    messageBox.textContent = 'Board is not full yet — keep solving.';
  } else if (isCorrect) {
    endGame(true);
  } else {
    messageBox.style.color = 'var(--danger)';
    messageBox.textContent = 'Something is off — check rows, columns, blocks, and cage totals.';
  }
});

/* ---------------------------------------------------------------------- */
/* Win / loss handling                                                     */
/* ---------------------------------------------------------------------- */

function endGame(won) {
  gameOver = true;
  clearInterval(timerHandle);
  renderBoard();

  if (won) {
    winStreak++;
    streakDisplay.textContent = winStreak;
    modalIcon.textContent = '\ud83c\udf89';
    modalTitle.textContent = 'Puzzle solved!';
    modalBody.textContent = 'Every row, column, block, and cage checks out.';
  } else {
    winStreak = 0;
    streakDisplay.textContent = winStreak;
    modalIcon.textContent = '\ud83d\udca5';
    modalTitle.textContent = 'Out of attempts';
    modalBody.textContent = `You hit ${MAX_MISTAKES} mistakes. Here's how the solved grid looks — try a fresh puzzle.`;
    boardState = cloneBoard(solutionBoard);
  }

  modalStats.innerHTML = `
    <div><span class="stat-label">Time</span><span class="stat-value">${timerDisplay.textContent}</span></div>
    <div><span class="stat-label">Mistakes</span><span class="stat-value">${mistakes}</span></div>
    <div><span class="stat-label">Difficulty</span><span class="stat-value">${difficultySelect.value}</span></div>
  `;

  modalOverlay.classList.remove('hidden');
}

modalCloseBtn.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
  startNewGame();
});

/* ---------------------------------------------------------------------- */
/* Controls wiring                                                         */
/* ---------------------------------------------------------------------- */

document.querySelectorAll('.num-btn').forEach(button => {
  button.addEventListener('click', () => {
    if (!selectedCell) {
      messageBox.style.color = '';
      messageBox.textContent = 'Select a grid cell first.';
      return;
    }
    const val = parseInt(button.dataset.val, 10);
    placeValue(selectedCell.r, selectedCell.c, val);
  });
});

notesBtn.addEventListener('click', () => {
  notesMode = !notesMode;
  notesBtn.textContent = notesMode ? '\u270f\ufe0f Notes: On' : '\u270f\ufe0f Notes: Off';
  notesBtn.setAttribute('aria-pressed', String(notesMode));
});

undoBtn.addEventListener('click', () => {
  if (history.length === 0 || gameOver) return;
  const last = history.pop();
  boardState[last.r][last.c] = last.prevVal;
  renderBoard();
  reselect(last.r, last.c);
  messageBox.style.color = '';
  messageBox.textContent = 'Undone.';
});

document.getElementById('new-game-btn').addEventListener('click', () => {
  startNewGame();
});

difficultySelect.addEventListener('change', () => {
  startNewGame();
});

document.addEventListener('keydown', (e) => {
  if (!selectedCell) return;
  if (e.key >= '1' && e.key <= '4') {
    placeValue(selectedCell.r, selectedCell.c, parseInt(e.key, 10));
  } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    placeValue(selectedCell.r, selectedCell.c, 0);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    let { r, c } = selectedCell;
    if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
    if (e.key === 'ArrowDown') r = Math.min(SIZE - 1, r + 1);
    if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
    if (e.key === 'ArrowRight') c = Math.min(SIZE - 1, c + 1);
    if (!givenMask[r][c]) selectCell(r, c);
  }
});

/* ---------------------------------------------------------------------- */
/* Boot                                                                     */
/* ---------------------------------------------------------------------- */

startNewGame();
