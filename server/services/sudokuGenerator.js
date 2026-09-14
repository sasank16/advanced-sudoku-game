/**
 * Sudoku Generator Service
 * Generates valid, solvable 9x9 puzzles with guaranteed UNIQUE solutions.
 */

const { cloneBoard, GRID_SIZE } = require('./sudokuValidator');
const { solveBoard, countSolutions, shuffle } = require('./sudokuSolver');
const { getDifficultySettings, countClues } = require('./difficulty');

/**
 * Creates an empty 9x9 board filled with zeros.
 * @returns {number[][]}
 */
function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

/**
 * Generates a complete, randomized valid 9x9 Sudoku solution.
 * @returns {number[][]}
 */
function generateSolvedBoard() {
  const emptyBoard = createEmptyBoard();
  const result = solveBoard(emptyBoard, true);
  if (!result.solved || !result.solution) {
    throw new Error('Failed to generate completed Sudoku board');
  }
  return result.solution;
}

/**
 * Generates a playable Sudoku puzzle of the requested difficulty with a guaranteed unique solution.
 * 
 * @param {string} difficulty - 'easy' | 'medium' | 'hard' | 'expert'
 * @returns {{ puzzle: number[][], solution: number[][], difficulty: string, cluesCount: number }}
 */
function generatePuzzle(difficulty = 'medium') {
  const config = getDifficultySettings(difficulty);
  const targetClues = config.targetClues;

  const solution = generateSolvedBoard();
  const puzzle = cloneBoard(solution);

  // Generate list of all 81 cell positions
  const positions = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      positions.push({ row: r, col: c });
    }
  }

  // Shuffle positions for randomized removal order
  const shuffledPositions = shuffle(positions);
  let currentClues = 81;

  for (const pos of shuffledPositions) {
    if (currentClues <= targetClues) {
      break;
    }

    const { row, col } = pos;
    const originalValue = puzzle[row][col];
    if (originalValue === 0) continue;

    // Tentatively remove the number
    puzzle[row][col] = 0;

    // Check if the board still has EXACTLY ONE solution
    if (countSolutions(puzzle, 2) === 1) {
      currentClues--;
    } else {
      // Multiple solutions created; restore the number
      puzzle[row][col] = originalValue;
    }
  }

  const finalClues = countClues(puzzle);

  return {
    puzzle,
    solution,
    difficulty: config.name.toLowerCase(),
    cluesCount: finalClues
  };
}

module.exports = {
  createEmptyBoard,
  generateSolvedBoard,
  generatePuzzle
};
