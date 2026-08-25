# Calcirix

A professional, high-performance logic puzzle game combining elements of Sudoku and KenKen, built with vanilla HTML5, CSS3, and modern JavaScript. Designed with a clean, dark-themed developer aesthetic using a precise 3-color deep palette.

## Features

- **Mathematical Logic Hybrid:** Combines classic grid row/column uniqueness constraints with arithmetic target challenges.
- **Minimalist 3-Color Deep Theme:** Built using a sophisticated professional color scheme (`#0b132b` background, `#1c2541` surface panels, and `#5bc0be` vibrant accents).
- **Interactive Numpad Integration:** Seamless point-and-click cell selection and number insertion workflow.
- **Instant Solution Verification:** Automated checking engine that validates current inputs against target puzzle rules.
- **Responsive Layout:** Engineered to scale cleanly across different screen resolutions and viewports.

---

## Project Structure

```text
gridmath/
├── index.html    # Main HTML entry point and application UI markup
├── style.css     # Design system, layout rules, and 3-color theme definitions
└── script.js     # Core game state management, render engine, and validation logic
```

---

## Getting Started

### Prerequisites
You only need a modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari) to run and test this application. No external build systems or node modules are required.

### Installation & Execution
1. Clone or download this repository to your local machine.
2. Ensure `index.html`, `style.css`, and `script.js` are located in the same root directory.
3. Open `index.html` directly in your preferred web browser, or serve it using a local development server (like Live Server in VS Code).

---

## How to Play

1. **Select a Cell:** Click on any empty cell within the 4x4 grid board.
2. **Input Numbers:** Use the on-screen numpad (numbers 1 through 4) to assign a value to the selected cell.
3. **Clear Cells:** Use the **Clear** button if you need to reset a specific cell.
4. **Verify Solution:** Click the **Verify Solution** button at any time to check your progress against the puzzle rules.

---

## Technical Highlights

- **CSS Grid:** Implements precise grid layout matrices for the 4x4 board structure.
- **Vanilla JavaScript State Machine:** Manages selection state, grid array matrices, and dynamic DOM rendering without heavy framework overhead.
- **Modular Styling:** Utilizes CSS variables (`:root`) for maintainable theme customization.
