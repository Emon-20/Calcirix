// Valid 4x4 Sudoku Solution mapping for demo engine
const solutionBoard = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1]
];

// Initial prefilled clues (0 means empty cell for user input)
let boardState = [
    [1, 0, 3, 0],
    [0, 4, 0, 2],
    [2, 0, 4, 0],
    [0, 3, 0, 1]
];

// KenKen Cages simulation hints (Target and Math operation)
const cagesClues = [
    { clue: "3+", cells: [[0,0], [0,1]] },
    { clue: "7+", cells: [[0,2], [1,2]] },
    // আরও কু বা কেজ এভাবে ম্যাপ করা যায়
];

let selectedCell = null;

const gridElement = document.getElementById('grid-board');
const messageBox = document.getElementById('message-box');

function renderBoard() {
    gridElement.innerHTML = '';
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            // Mark prefilled original clues
            if (boardState[r][c] !== 0) {
                cell.textContent = boardState[r][c];
                if (r === 0 && c === 0 || r === 1 && c === 1 || r === 2 && c === 2 || r === 3 && c === 3) {
                    // কিছু সেল প্রি-ফিল্ড হিসেবে লক রাখতে পারেন
                }
            } else {
                cell.textContent = '';
            }

            // Click event to select cell
            cell.addEventListener('click', () => selectCell(r, c, cell));
            gridElement.appendChild(cell);
        }
    }
}

function selectCell(r, c, cellElement) {
    document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('selected'));
    cellElement.classList.add('selected');
    selectedCell = { r, c };
    messageBox.textContent = `Selected Cell: Row ${r + 1}, Col ${c + 1}`;
}

// Numpad input handling
document.querySelectorAll('.num-btn').forEach(button => {
    button.addEventListener('click', () => {
        if (!selectedCell) {
            messageBox.textContent = 'Please select a grid cell first!';
            return;
        }

        const val = button.dataset.val === '' ? 0 : parseInt(button.dataset.val);
        const { r, c } = selectedCell;

        boardState[r][c] = val;
        renderBoard();
        
        // Restore selection highlight
        const currentCell = document.querySelector(`[data-row='${r}'][data-col='${c}']`);
        if(currentCell) currentCell.classList.add('selected');
    });
});

// Verify Solution Button Logic
document.getElementById('check-btn').addEventListener('click', () => {
    let isComplete = true;
    let isCorrect = true;

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (boardState[r][c] === 0) {
                isComplete = false;
            }
            if (boardState[r][c] !== solutionBoard[r][c] && boardState[r][c] !== 0) {
                isCorrect = false;
            }
        }
    }

    if (!isComplete) {
        messageBox.textContent = 'Board is not full yet. Keep solving!';
        messageBox.style.color = '#ff6b6b';
    } else if (isCorrect) {
        messageBox.textContent = 'Congratulations! Puzzle solved successfully! 🎉';
        messageBox.style.color = '#5bc0be';
    } else {
        messageBox.textContent = 'Some numbers are incorrect. Check row/column rules.';
        messageBox.style.color = '#ff6b6b';
    }
});

// New Game Reset
document.getElementById('new-game-btn').addEventListener('click', () => {
    boardState = [
        [1, 0, 3, 0],
        [0, 4, 0, 2],
        [2, 0, 4, 0],
        [0, 3, 0, 1]
    ];
    selectedCell = null;
    messageBox.textContent = 'New game started. Good luck!';
    messageBox.style.color = 'var(--text-muted)';
    renderBoard();
});

// Initial Render
renderBoard();