/**
 * Calcirix — UI Rendering & DOM Controller
 * Dynamic grid scaling, responsive numpad, particle effects, and modal managers.
 */
(function(root) {
  'use strict';

  const Calcirix = root.Calcirix = root.Calcirix || {};

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // --- Confetti particle system for celebrations ---
  function launchConfetti(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = window.innerWidth;
    const height = canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#5bc0be', '#e0b356', '#6fd39a', '#eef2f8', '#ff6b6b'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 50,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 1.2) * 15,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    let frameId;
    function render() {
      ctx.clearRect(0, 0, width, height);
      let alive = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.008;

        if (p.opacity > 0 && p.y < height + 50) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      }

      if (alive) {
        frameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    }
    render();
  }

  const UI = {
    elements: {},

    initElements: function() {
      this.elements = {
        app: document.getElementById('app'),
        menuView: document.getElementById('menu-view'),
        gameView: document.getElementById('game-view'),
        levelCardsContainer: document.getElementById('level-cards-container'),
        difficultyPills: document.querySelectorAll('.diff-pill'),
        btnStartGame: document.getElementById('btn-start-game'),
        btnHowToPlay: document.getElementById('btn-how-to-play'),
        btnSoundToggle: document.getElementById('btn-sound-toggle'),
        btnHeaderSound: document.getElementById('btn-header-sound'),

        // Game HUD
        btnReturnMenu: document.getElementById('btn-return-menu'),
        hudLevelBadge: document.getElementById('hud-level-badge'),
        hudDiffBadge: document.getElementById('hud-diff-badge'),
        timerDisplay: document.getElementById('timer-display'),
        mistakeDisplay: document.getElementById('mistake-display'),
        streakDisplay: document.getElementById('streak-display'),
        emptyDisplay: document.getElementById('empty-display'),
        btnPause: document.getElementById('btn-pause'),

        // Board & Controls
        boardWrapper: document.getElementById('board-wrapper'),
        gridBoard: document.getElementById('grid-board'),
        messageBox: document.getElementById('message-box'),
        numpad: document.getElementById('numpad'),
        btnNotes: document.getElementById('btn-notes'),
        btnUndo: document.getElementById('btn-undo'),
        btnRedo: document.getElementById('btn-redo'),
        btnHint: document.getElementById('btn-hint'),
        btnVerify: document.getElementById('btn-verify'),
        btnNewGame: document.getElementById('btn-new-game'),

        // Modals
        modalOverlay: document.getElementById('modal-overlay'),
        modalContent: document.getElementById('modal-content'),
        confettiCanvas: document.getElementById('confetti-canvas'),
        pauseOverlay: document.getElementById('pause-overlay'),
        btnResumePause: document.getElementById('btn-resume-pause'),
        rulesModal: document.getElementById('rules-modal'),
        btnRulesClose: document.getElementById('btn-rules-close'),
        confirmModal: document.getElementById('confirm-modal'),
        btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
        btnConfirmLeave: document.getElementById('btn-confirm-leave')
      };
    },

    showScreen: function(screenName) {
      if (screenName === 'game') {
        this.elements.menuView.classList.add('hidden');
        this.elements.gameView.classList.remove('hidden');
      } else {
        this.elements.gameView.classList.add('hidden');
        this.elements.menuView.classList.remove('hidden');
        this.renderMenuCards();
      }
    },

    renderMenuCards: function() {
      const container = this.elements.levelCardsContainer;
      if (!container) return;
      container.innerHTML = '';

      const state = Calcirix.State;
      const bestTimes = state.bestTimes || {};

      Object.values(Calcirix.LEVELS).forEach(lvl => {
        const card = document.createElement('div');
        card.className = `level-card ${state.levelId === lvl.id ? 'active' : ''}`;
        card.dataset.levelId = lvl.id;

        const bestTimeKey = `${lvl.id}_${state.difficultyId}`;
        const bestTimeVal = bestTimes[bestTimeKey];
        const bestFormatted = bestTimeVal ? formatTime(bestTimeVal) : '—';

        card.innerHTML = `
          <div class="level-card-header">
            <span class="level-card-badge">${lvl.badge}</span>
            <span class="level-card-size">${lvl.gridLabel}</span>
          </div>
          <div class="level-card-title">${lvl.title}</div>
          <div class="level-card-desc">${lvl.subtitle}</div>
          <div class="level-card-footer">
            <span class="best-record">Best: <strong>${bestFormatted}</strong></span>
          </div>
        `;

        card.addEventListener('click', () => {
          document.querySelectorAll('.level-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          state.levelId = lvl.id;
          if (Calcirix.Audio) Calcirix.Audio.playTap();
        });

        container.appendChild(card);
      });
    },

    updateDifficultyPills: function(selectedId) {
      this.elements.difficultyPills.forEach(pill => {
        if (pill.dataset.diff === selectedId) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });
    },

    updateSoundIcons: function(isMuted) {
      const icon = isMuted ? '🔇' : '🔊';
      if (this.elements.btnSoundToggle) this.elements.btnSoundToggle.textContent = icon;
      if (this.elements.btnHeaderSound) this.elements.btnHeaderSound.textContent = icon;
    },

    updateTimer: function(totalSeconds) {
      if (this.elements.timerDisplay) {
        this.elements.timerDisplay.textContent = formatTime(totalSeconds);
      }
    },

    updateHUD: function() {
      const state = Calcirix.State;
      const lvl = state.puzzle ? state.puzzle.levelConfig : Calcirix.LEVELS[state.levelId];
      const diff = state.puzzle ? state.puzzle.difficultyConfig : Calcirix.DIFFICULTIES[state.difficultyId];

      if (this.elements.hudLevelBadge) {
        this.elements.hudLevelBadge.textContent = `${lvl.name} • ${lvl.gridLabel}`;
      }
      if (this.elements.hudDiffBadge) {
        this.elements.hudDiffBadge.textContent = diff.name;
      }
      if (this.elements.mistakeDisplay) {
        this.elements.mistakeDisplay.textContent = `${state.mistakes} / ${Calcirix.CONFIG.MAX_MISTAKES}`;
        this.elements.mistakeDisplay.classList.toggle('warn', state.mistakes > 0);
      }
      if (this.elements.streakDisplay) {
        this.elements.streakDisplay.textContent = `${state.streak}`;
      }
      if (this.elements.emptyDisplay) {
        const remaining = state.getRemainingEmptyCount();
        this.elements.emptyDisplay.textContent = `${remaining} left`;
      }
      if (this.elements.btnUndo) {
        this.elements.btnUndo.disabled = state.history.length === 0;
      }
      if (this.elements.btnRedo) {
        this.elements.btnRedo.disabled = state.future.length === 0;
      }
      if (this.elements.btnNotes) {
        this.elements.btnNotes.setAttribute('aria-pressed', String(state.notesMode));
        this.elements.btnNotes.textContent = state.notesMode ? '✏️ Notes: On' : '✏️ Notes: Off';
      }
    },

    cageClueOrigin: function(cage, cagesList) {
      return cage.cells.reduce((top, cell) =>
        (cell[0] < top[0] || (cell[0] === top[0] && cell[1] < top[1])) ? cell : top
      );
    },

    renderBoard: function() {
      const state = Calcirix.State;
      const puzzle = state.puzzle;
      if (!puzzle) return;

      const grid = this.elements.gridBoard;
      grid.innerHTML = '';
      const size = puzzle.size;
      const blockSize = puzzle.levelConfig.blockSize;

      grid.style.setProperty('--grid-size', size);

      // Selected cell value for matching highlights
      let selectedVal = null;
      if (state.selectedCell) {
        const { r, c } = state.selectedCell;
        selectedVal = state.board[r][c] || null;
      }

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.dataset.row = r;
          cell.dataset.col = c;

          const myCageId = puzzle.idGrid[r][c];
          const rightCageId = c + 1 < size ? puzzle.idGrid[r][c + 1] : null;
          const bottomCageId = r + 1 < size ? puzzle.idGrid[r + 1][c] : null;

          // Cage boundaries
          if (rightCageId !== null && rightCageId !== myCageId) {
            cell.classList.add('cage-edge-right');
          }
          if (bottomCageId !== null && bottomCageId !== myCageId) {
            cell.classList.add('cage-edge-bottom');
          }

          // Sudoku subgrid block boundaries (for 4x4 and 9x9)
          if (blockSize) {
            if (c > 0 && c % blockSize === 0) {
              cell.classList.add('block-edge-left');
            }
            if (r > 0 && r % blockSize === 0) {
              cell.classList.add('block-edge-top');
            }
          }

          // Cage clue display
          const cage = puzzle.cages.find(cg => cg.id === myCageId);
          if (cage) {
            const [originR, originC] = this.cageClueOrigin(cage);
            if (originR === r && originC === c) {
              const clue = document.createElement('span');
              clue.className = 'cage-clue';
              clue.textContent = cage.op === '=' ? `${cage.target}` : `${cage.target}${cage.op}`;
              cell.appendChild(clue);
            }
          }

          // Cell value or notes
          const val = state.board[r][c];
          const isGiven = state.isGiven(r, c);

          if (isGiven) {
            cell.classList.add('given');
            const valSpan = document.createElement('span');
            valSpan.className = 'cell-value';
            valSpan.textContent = val;
            cell.appendChild(valSpan);
          } else if (val !== 0) {
            const valSpan = document.createElement('span');
            valSpan.className = 'cell-value';
            valSpan.textContent = val;
            cell.appendChild(valSpan);
          } else if (state.notes[r][c] && state.notes[r][c].size > 0) {
            const notesGrid = document.createElement('div');
            notesGrid.className = `notes-grid notes-size-${size}`;
            for (let n = 1; n <= size; n++) {
              const nSpan = document.createElement('span');
              nSpan.textContent = state.notes[r][c].has(n) ? n : '';
              notesGrid.appendChild(nSpan);
            }
            cell.appendChild(notesGrid);
          }

          if (state.isGameOver) {
            cell.classList.add('locked');
          }

          cell.addEventListener('click', () => {
            if (state.isGameOver || state.isPaused) return;
            state.selectCell(r, c);
            this.renderBoard();
            this.setMessage(`Selected row ${r + 1}, column ${c + 1}.`);
            if (Calcirix.Audio) Calcirix.Audio.playTap();
          });

          grid.appendChild(cell);
        }
      }

      this.applyHighlights();
      this.updateHUD();
      this.renderNumpad();
    },

    applyHighlights: function() {
      const state = Calcirix.State;
      const size = state.puzzle ? state.puzzle.size : 4;
      const blockSize = state.puzzle ? state.puzzle.levelConfig.blockSize : null;

      document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('selected', 'peer', 'same-digit');
      });

      if (!state.selectedCell) return;
      const { r, c } = state.selectedCell;
      const selVal = state.board[r][c];

      const selBr = blockSize ? Math.floor(r / blockSize) * blockSize : -1;
      const selBc = blockSize ? Math.floor(c / blockSize) * blockSize : -1;

      document.querySelectorAll('.cell').forEach(cell => {
        const cr = Number(cell.dataset.row);
        const cc = Number(cell.dataset.col);
        const cVal = state.board[cr][cc];

        if (cr === r && cc === c) {
          cell.classList.add('selected');
        } else {
          // Peer highlight
          const sameRow = cr === r;
          const sameCol = cc === c;
          const sameBlock = blockSize && (cr >= selBr && cr < selBr + blockSize && cc >= selBc && cc < selBc + blockSize);
          if (sameRow || sameCol || sameBlock) {
            cell.classList.add('peer');
          }
        }

        // Matching digit highlight
        if (selVal !== 0 && cVal === selVal && !(cr === r && cc === c)) {
          cell.classList.add('same-digit');
        }
      });
    },

    renderNumpad: function() {
      const state = Calcirix.State;
      const size = state.puzzle ? state.puzzle.size : 4;
      const numpad = this.elements.numpad;
      if (!numpad) return;

      numpad.innerHTML = '';
      numpad.className = `numpad numpad-size-${size}`;

      // Count occurrences of each digit on board
      const counts = {};
      for (let n = 1; n <= size; n++) counts[n] = 0;
      if (state.board) {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const v = state.board[r][c];
            if (v >= 1 && v <= size) counts[v]++;
          }
        }
      }

      for (let n = 1; n <= size; n++) {
        const btn = document.createElement('button');
        btn.className = 'num-btn';
        btn.dataset.val = n;
        btn.innerHTML = `<span class="num-text">${n}</span>`;

        if (counts[n] >= size) {
          btn.classList.add('completed');
        }

        btn.addEventListener('click', () => {
          if (Calcirix.App && Calcirix.App.handleNumpadInput) {
            Calcirix.App.handleNumpadInput(n);
          }
        });

        numpad.appendChild(btn);
      }

      // Clear button
      const clearBtn = document.createElement('button');
      clearBtn.className = 'num-btn clear-btn';
      clearBtn.dataset.val = 0;
      clearBtn.setAttribute('title', 'Clear cell');
      clearBtn.innerHTML = '⌫';
      clearBtn.addEventListener('click', () => {
        if (Calcirix.App && Calcirix.App.handleNumpadInput) {
          Calcirix.App.handleNumpadInput(0);
        }
      });
      numpad.appendChild(clearBtn);
    },

    setMessage: function(text, isDanger = false, isSuccess = false) {
      const box = this.elements.messageBox;
      if (!box) return;
      box.textContent = text;
      box.classList.remove('danger', 'success');
      if (isDanger) box.classList.add('danger');
      if (isSuccess) box.classList.add('success');
    },

    flashCell: function(r, c, type) {
      const el = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      if (!el) return;
      el.classList.remove('conflict', 'correct-flash');
      // Trigger reflow
      void el.offsetWidth;
      if (type === 'conflict') {
        el.classList.add('conflict');
      } else if (type === 'correct') {
        el.classList.add('correct-flash');
      }
    },

    showVictoryModal: function() {
      const state = Calcirix.State;
      const modal = this.elements.modalContent;
      const overlay = this.elements.modalOverlay;

      const lvl = state.puzzle.levelConfig;
      const diff = state.puzzle.difficultyConfig;
      const timeStr = formatTime(state.timerSeconds);
      const isNewBest = state.bestTimes[`${state.levelId}_${state.difficultyId}`] === state.timerSeconds;

      modal.innerHTML = `
        <div class="modal-icon">🏆</div>
        <h2>Grid Conquered!</h2>
        <p class="modal-sub">Magnificent deduction. Every row, column, block, and cage checks out perfectly.</p>
        <div class="modal-stats-grid">
          <div class="mstat">
            <span class="mstat-label">Level</span>
            <span class="mstat-val">${lvl.name}</span>
          </div>
          <div class="mstat">
            <span class="mstat-label">Difficulty</span>
            <span class="mstat-val">${diff.name}</span>
          </div>
          <div class="mstat">
            <span class="mstat-label">Time</span>
            <span class="mstat-val">${timeStr} ${isNewBest ? '<span class="best-pill">NEW BEST</span>' : ''}</span>
          </div>
          <div class="mstat">
            <span class="mstat-label">Mistakes</span>
            <span class="mstat-val">${state.mistakes} / ${Calcirix.CONFIG.MAX_MISTAKES}</span>
          </div>
          <div class="mstat">
            <span class="mstat-label">Win Streak</span>
            <span class="mstat-val">🔥 ${state.streak}</span>
          </div>
          <div class="mstat">
            <span class="mstat-label">Hints Used</span>
            <span class="mstat-val">${state.hintsUsed}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button id="modal-next-btn" class="action-btn primary">Next Level →</button>
          <button id="modal-replay-btn" class="action-btn">🔄 Replay Level</button>
          <button id="modal-menu-btn" class="action-btn">Menu</button>
        </div>
      `;

      overlay.classList.remove('hidden');
      launchConfetti(this.elements.confettiCanvas);

      document.getElementById('modal-next-btn').addEventListener('click', () => {
        overlay.classList.add('hidden');
        const nextLevelId = state.levelId < 4 ? state.levelId + 1 : 1;
        state.startPuzzle(nextLevelId, state.difficultyId);
        this.renderBoard();
        this.setMessage(`Welcome to Level ${nextLevelId}!`);
      });

      document.getElementById('modal-replay-btn').addEventListener('click', () => {
        overlay.classList.add('hidden');
        state.startPuzzle(state.levelId, state.difficultyId);
        this.renderBoard();
        this.setMessage('Fresh grid generated. Good luck!');
      });

      document.getElementById('modal-menu-btn').addEventListener('click', () => {
        overlay.classList.add('hidden');
        this.showScreen('menu');
      });
    },

    showGameOverModal: function() {
      const state = Calcirix.State;
      const modal = this.elements.modalContent;
      const overlay = this.elements.modalOverlay;

      modal.innerHTML = `
        <div class="modal-icon danger">💥</div>
        <h2>Out of Attempts</h2>
        <p class="modal-sub">You hit ${Calcirix.CONFIG.MAX_MISTAKES} mistakes on this puzzle. Here is the completed solution for study.</p>
        <div class="modal-actions">
          <button id="modal-retry-btn" class="action-btn primary">🔄 Try Fresh Grid</button>
          <button id="modal-menu-btn" class="action-btn">Return to Menu</button>
        </div>
      `;

      // Reveal solution board for review
      state.board = Calcirix.Engine.clone2D(state.puzzle.solution);
      this.renderBoard();

      overlay.classList.remove('hidden');

      document.getElementById('modal-retry-btn').addEventListener('click', () => {
        overlay.classList.add('hidden');
        state.startPuzzle(state.levelId, state.difficultyId);
        this.renderBoard();
        this.setMessage('Fresh grid generated. Take your time!');
      });

      document.getElementById('modal-menu-btn').addEventListener('click', () => {
        overlay.classList.add('hidden');
        this.showScreen('menu');
      });
    },

    showRulesModal: function(show = true) {
      if (show) {
        this.elements.rulesModal.classList.remove('hidden');
      } else {
        this.elements.rulesModal.classList.add('hidden');
      }
    },

    showConfirmExitModal: function(show = true) {
      if (show) {
        this.elements.confirmModal.classList.remove('hidden');
      } else {
        this.elements.confirmModal.classList.add('hidden');
      }
    },

    setPauseOverlay: function(isPaused) {
      if (isPaused) {
        this.elements.pauseOverlay.classList.remove('hidden');
        this.elements.btnPause.textContent = '▶ Resume';
      } else {
        this.elements.pauseOverlay.classList.add('hidden');
        this.elements.btnPause.textContent = '⏸ Pause';
      }
    }
  };

  Calcirix.UI = UI;

})(typeof window !== 'undefined' ? window : globalThis);
