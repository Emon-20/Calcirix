/**
 * Calcirix — Constants & Configuration
 * Minimalist 3-Color Deep Theme: #0b132b, #1c2541, #5bc0be
 */
(function(root) {
  'use strict';

  const Calcirix = root.Calcirix = root.Calcirix || {};

  Calcirix.LEVELS = {
    1: {
      id: 1,
      size: 4,
      hasBlocks: true,
      blockSize: 2,
      name: 'Level 1',
      gridLabel: '4 × 4',
      title: 'Initiate Grid',
      subtitle: 'Classic beginner layout with 2×2 Sudoku blocks and KenKen arithmetic.',
      badge: 'Beginner'
    },
    2: {
      id: 2,
      size: 5,
      hasBlocks: false,
      blockSize: null,
      name: 'Level 2',
      gridLabel: '5 × 5',
      title: 'Arithmetic Grid',
      subtitle: 'Intermediate arithmetic challenges with Latin square uniqueness.',
      badge: 'Intermediate'
    },
    3: {
      id: 3,
      size: 7,
      hasBlocks: false,
      blockSize: null,
      name: 'Level 3',
      gridLabel: '7 × 7',
      title: 'Logic Crucible',
      subtitle: 'Advanced logic grid with deep deductions and multi-cell cages.',
      badge: 'Advanced'
    },
    4: {
      id: 4,
      size: 9,
      hasBlocks: true,
      blockSize: 3,
      name: 'Level 4',
      gridLabel: '9 × 9',
      title: 'Master Matrix',
      subtitle: 'Expert master grid combining 3×3 Sudoku-style uniqueness and KenKen region targets.',
      badge: 'Expert'
    }
  };

  Calcirix.DIFFICULTIES = {
    easy: {
      id: 'easy',
      name: 'Easy',
      desc: 'Generous starter givens & direct cage clues.',
      givensRatio: { 4: 8, 5: 11, 7: 20, 9: 32 }
    },
    medium: {
      id: 'medium',
      name: 'Medium',
      desc: 'Balanced arithmetic & logical deductions.',
      givensRatio: { 4: 6, 5: 8, 7: 14, 9: 24 }
    },
    hard: {
      id: 'hard',
      name: 'Hard',
      desc: 'Sparse givens for pure analytical mastery.',
      givensRatio: { 4: 4, 5: 5, 7: 8, 9: 16 }
    }
  };

  Calcirix.CONFIG = {
    MAX_MISTAKES: 3,
    MAX_HINTS: 3,
    STORAGE_KEYS: {
      STREAK: 'calcirix_streak_v2',
      SOUND_MUTED: 'calcirix_sound_muted',
      BEST_TIMES: 'calcirix_best_times_v2',
      LAST_LEVEL: 'calcirix_last_level',
      LAST_DIFFICULTY: 'calcirix_last_difficulty'
    },
    OPERATORS: {
      ADD: '+',
      SUBTRACT: '-',
      MULTIPLY: '×',
      DIVIDE: '÷',
      EQUAL: '='
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
