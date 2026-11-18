/**
 * Calcirix — Puzzle Generation & Board Evaluation Engine
 * Supports 4 progressive grid levels:
 * - Level 1: 4×4 Grid (Classic beginner layout with 2×2 blocks)
 * - Level 2: 5×5 Grid (Intermediate arithmetic challenges & Latin square)
 * - Level 3: 7×7 Grid (Advanced logic grid & deep deductions)
 * - Level 4: 9×9 Grid (Expert master grid combining 3×3 Sudoku-style blocks and KenKen region targets)
 */
(function(root) {
  'use strict';

  const Calcirix = root.Calcirix = root.Calcirix || {};

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function clone2D(grid) {
    return grid.map(row => row.slice());
  }

  // --- Solution Generators ---

  function randomizeSudoku(seed, size, blockSize) {
    const perm = shuffle(Array.from({ length: size }, (_, i) => i + 1));
    let board = seed.map(row => row.map(v => perm[v - 1]));

    const numBands = size / blockSize;
    const bandOrder = shuffle(Array.from({ length: numBands }, (_, i) => i));
    const newRowOrder = [];
    for (const b of bandOrder) {
      const rowsInBand = shuffle(Array.from({ length: blockSize }, (_, i) => b * blockSize + i));
      newRowOrder.push(...rowsInBand);
    }
    board = newRowOrder.map(r => board[r].slice());

    const stackOrder = shuffle(Array.from({ length: numBands }, (_, i) => i));
    const newColOrder = [];
    for (const s of stackOrder) {
      const colsInStack = shuffle(Array.from({ length: blockSize }, (_, i) => s * blockSize + i));
      newColOrder.push(...colsInStack);
    }
    board = board.map(row => newColOrder.map(c => row[c]));

    if (Math.random() < 0.5) {
      board = board[0].map((_, c) => board.map(row => row[c]));
    }
    return board;
  }

  function generateLatinSquare(size, step) {
    const perm = shuffle(Array.from({ length: size }, (_, i) => i + 1));
    let board = Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => perm[(r * step + c) % size])
    );
    const rowOrder = shuffle(Array.from({ length: size }, (_, i) => i));
    const colOrder = shuffle(Array.from({ length: size }, (_, i) => i));
    board = rowOrder.map(r => colOrder.map(c => board[r][c]));

    if (Math.random() < 0.5) {
      board = board[0].map((_, c) => board.map(row => row[c]));
    }
    return board;
  }

  function generateSolution(levelConfig) {
    const size = levelConfig.size;
    if (size === 4) {
      const seed = [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 1, 4, 3],
        [4, 3, 2, 1]
      ];
      return randomizeSudoku(seed, 4, 2);
    } else if (size === 5) {
      return generateLatinSquare(5, 2);
    } else if (size === 7) {
      return generateLatinSquare(7, 3);
    } else if (size === 9) {
      const seed = [];
      for (let r = 0; r < 9; r++) {
        seed[r] = [];
        for (let c = 0; c < 9; c++) {
          seed[r][c] = ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
        }
      }
      return randomizeSudoku(seed, 9, 3);
    }
    return generateLatinSquare(size, 2);
  }

  // --- Cage Clues Computation ---

  function computeCageClue(cells, solution) {
    const vals = cells.map(([r, c]) => solution[r][c]);

    if (vals.length === 1) {
      return { op: Calcirix.CONFIG.OPERATORS.EQUAL, target: vals[0] };
    }

    if (vals.length === 2) {
      const options = ['+', '×', '-'];
      const hi = Math.max(vals[0], vals[1]);
      const lo = Math.min(vals[0], vals[1]);
      if (lo !== 0 && hi % lo === 0) {
        options.push('÷', '÷');
      }
      const op = options[Math.floor(Math.random() * options.length)];
      let target;
      switch (op) {
        case '+': target = vals[0] + vals[1]; break;
        case '×': target = vals[0] * vals[1]; break;
        case '-': target = Math.abs(vals[0] - vals[1]); break;
        case '÷': target = hi / lo; break;
      }
      return { op, target };
    }

    // 3 or 4 cells
    const sum = vals.reduce((a, b) => a + b, 0);
    const prod = vals.reduce((a, b) => a * b, 1);
    const maxProd = vals.length === 3 ? 180 : 320;

    if (prod <= maxProd && Math.random() < 0.35) {
      return { op: '×', target: prod };
    }
    return { op: '+', target: sum };
  }

  function generateCages(solution, size) {
    const idGrid = Array.from({ length: size }, () => Array(size).fill(-1));
    const allCells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        allCells.push([r, c]);
      }
    }
    const shuffledCells = shuffle(allCells);
    const rawCages = [];
    let nextId = 0;

    const maxCageSize = size <= 5 ? 3 : 4;

    for (const [r, c] of shuffledCells) {
      if (idGrid[r][c] !== -1) continue;

      const rand = Math.random();
      let targetSize = 2;
      if (rand < 0.08) targetSize = 1;
      else if (rand < 0.65) targetSize = 2;
      else if (rand < 0.94 || maxCageSize < 4) targetSize = 3;
      else targetSize = 4;

      const group = [[r, c]];
      idGrid[r][c] = nextId;

      let attempts = 0;
      while (group.length < targetSize && attempts < 15) {
        attempts++;
        const [gr, gc] = group[Math.floor(Math.random() * group.length)];
        const neighbours = [
          [gr - 1, gc], [gr + 1, gc], [gr, gc - 1], [gr, gc + 1]
        ].filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size && idGrid[nr][nc] === -1);

        if (neighbours.length === 0) continue;
        const [nr, nc] = neighbours[Math.floor(Math.random() * neighbours.length)];
        idGrid[nr][nc] = nextId;
        group.push([nr, nc]);
      }

      rawCages.push({ id: nextId, cells: group });
      nextId++;
    }

    // Attempt to merge singleton cages into neighbors if under maxCageSize
    for (let i = 0; i < rawCages.length; i++) {
      const cage = rawCages[i];
      if (cage.cells.length === 1 && Math.random() < 0.65) {
        const [r, c] = cage.cells[0];
        const neighbours = [
          [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
        ].filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size);

        for (const [nr, nc] of neighbours) {
          const otherId = idGrid[nr][nc];
          const otherCage = rawCages.find(cg => cg.id === otherId);
          if (otherCage && otherCage.cells.length < maxCageSize) {
            otherCage.cells.push([r, c]);
            idGrid[r][c] = otherId;
            rawCages.splice(i, 1);
            i--;
            break;
          }
        }
      }
    }

    const finishedCages = rawCages.map((cage, idx) => ({
      id: idx,
      cells: cage.cells,
      ...computeCageClue(cage.cells, solution)
    }));

    // Update idGrid mapping
    finishedCages.forEach(cg => {
      cg.cells.forEach(([r, c]) => { idGrid[r][c] = cg.id; });
    });

    return { cages: finishedCages, idGrid };
  }

  // --- Validation ---

  function checkCageMath(cage, vals) {
    if (vals.includes(0)) return true; // not fully filled yet
    switch (cage.op) {
      case '=':
        return vals[0] === cage.target;
      case '+':
        return vals.reduce((a, b) => a + b, 0) === cage.target;
      case '×':
        return vals.reduce((a, b) => a * b, 1) === cage.target;
      case '-': {
        if (vals.length !== 2) return false;
        return Math.abs(vals[0] - vals[1]) === cage.target;
      }
      case '÷': {
        if (vals.length !== 2) return false;
        const hi = Math.max(vals[0], vals[1]);
        const lo = Math.min(vals[0], vals[1]);
        return lo !== 0 && hi / lo === cage.target;
      }
      default:
        return true;
    }
  }

  function hasLiveConflict(board, r, c, val, levelConfig) {
    const size = levelConfig.size;
    if (val === 0) return false;

    // Row conflict
    for (let i = 0; i < size; i++) {
      if (i !== c && board[r][i] === val) return true;
    }

    // Column conflict
    for (let i = 0; i < size; i++) {
      if (i !== r && board[i][c] === val) return true;
    }

    // Block conflict (if applicable)
    if (levelConfig.hasBlocks && levelConfig.blockSize) {
      const bs = levelConfig.blockSize;
      const br = Math.floor(r / bs) * bs;
      const bc = Math.floor(c / bs) * bs;
      for (let i = br; i < br + bs; i++) {
        for (let j = bc; j < bc + bs; j++) {
          if ((i !== r || j !== c) && board[i][j] === val) return true;
        }
      }
    }

    return false;
  }

  function evaluateBoard(board, solution, cages, levelConfig) {
    const size = levelConfig.size;
    let isComplete = true;
    let isCorrect = true;
    const conflicts = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = board[r][c];
        if (val === 0) {
          isComplete = false;
          continue;
        }
        if (val !== solution[r][c] || hasLiveConflict(board, r, c, val, levelConfig)) {
          isCorrect = false;
          conflicts.push({ r, c });
        }
      }
    }

    // Validate all full cages
    for (const cage of cages) {
      const vals = cage.cells.map(([r, c]) => board[r][c]);
      if (vals.includes(0)) continue;
      if (!checkCageMath(cage, vals)) {
        isCorrect = false;
        cage.cells.forEach(([r, c]) => {
          if (!conflicts.some(cell => cell.r === r && cell.c === c)) {
            conflicts.push({ r, c });
          }
        });
      }
    }

    return { isComplete, isCorrect, conflicts };
  }

  // --- Puzzle Assembly with Difficulty Givens ---

  function generatePuzzle(levelId, difficultyId) {
    const levelConfig = Calcirix.LEVELS[levelId] || Calcirix.LEVELS[1];
    const difficultyConfig = Calcirix.DIFFICULTIES[difficultyId] || Calcirix.DIFFICULTIES.medium;
    const size = levelConfig.size;

    const solution = generateSolution(levelConfig);
    const { cages, idGrid } = generateCages(solution, size);

    const initialBoard = Array.from({ length: size }, () => Array(size).fill(0));
    const givensMask = Array.from({ length: size }, () => Array(size).fill(false));

    const targetGivens = difficultyConfig.givensRatio[size] || Math.floor(size * 1.5);

    // Pick strategic givens across rows and columns
    const allCoords = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        allCoords.push([r, c]);
      }
    }
    const shuffledCoords = shuffle(allCoords);

    let givensCount = 0;
    // 1-cell cages are naturally single givens
    for (const cage of cages) {
      if (cage.cells.length === 1 && givensCount < targetGivens) {
        const [r, c] = cage.cells[0];
        initialBoard[r][c] = solution[r][c];
        givensMask[r][c] = true;
        givensCount++;
      }
    }

    // Fill remaining givens to reach target
    for (const [r, c] of shuffledCoords) {
      if (givensCount >= targetGivens) break;
      if (!givensMask[r][c]) {
        initialBoard[r][c] = solution[r][c];
        givensMask[r][c] = true;
        givensCount++;
      }
    }

    return {
      levelId,
      difficultyId,
      levelConfig,
      difficultyConfig,
      size,
      solution,
      cages,
      idGrid,
      initialBoard,
      givensMask
    };
  }

  Calcirix.Engine = {
    generatePuzzle,
    generateSolution,
    generateCages,
    hasLiveConflict,
    checkCageMath,
    evaluateBoard,
    clone2D
  };

})(typeof window !== 'undefined' ? window : globalThis);
