/**
 * Sudoku Solver Service
 * Backtracking solver with MRV (Minimum Remaining Values) optimization and solution counting.
 */

const { cloneBoard, isValidMove, getCandidates, GRID_SIZE } = require('./sudokuValidator');

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 * @param {Array} array 
 * @returns {Array}
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Finds the empty cell with the fewest legal candidates (MRV heuristic).
 * @param {number[][]} board 
 * @returns {{row: number, col: number, candidates: number[]}|null}
 */
function findBestEmptyCell(board) {
  let minCandidates = 10;
  let bestCell = null;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === 0) {
        const candidates = getCandidates(board, r, c);
        if (candidates.length === 0) {
          // Dead end: empty cell with no valid candidate
          return { row: r, col: c, candidates: [] };
        }
        if (candidates.length < minCandidates) {
          minCandidates = candidates.length;
          bestCell = { row: r, col: c, candidates };
          if (minCandidates === 1) {
            // Can't get fewer candidates than 1 for an empty cell
            return bestCell;
          }
        }
      }
    }
  }

  return bestCell;
}

/**
 * Solves a 9x9 Sudoku board.
 * @param {number[][]} board 
 * @param {boolean} randomize - If true, randomizes candidate order (for board generation)
 * @returns {{solved: boolean, solution: number[][]|null}}
 */
function solveBoard(board, randomize = false) {
  const workingBoard = cloneBoard(board);

  function backtrack() {
    const nextCell = findBestEmptyCell(workingBoard);
    if (!nextCell) {
      // No empty cells left, puzzle is solved
      return true;
    }

    const { row, col, candidates } = nextCell;
    if (candidates.length === 0) {
      return false;
    }

    const candidatesToTry = randomize ? shuffle(candidates) : candidates;

    for (const num of candidatesToTry) {
      workingBoard[row][col] = num;
      if (backtrack()) {
        return true;
      }
      workingBoard[row][col] = 0;
    }

    return false;
  }

  const success = backtrack();
  return {
    solved: success,
    solution: success ? workingBoard : null
  };
}

/**
 * Counts the number of distinct solutions for a given board up to a specified limit.
 * Used to verify puzzle uniqueness (i.e. countSolutions(board, 2) === 1).
 * 
 * @param {number[][]} board 
 * @param {number} limit - Maximum number of solutions to count before stopping
 * @returns {number}
 */
function countSolutions(board, limit = 2) {
  const workingBoard = cloneBoard(board);
  let solutionsCount = 0;

  function backtrack() {
    if (solutionsCount >= limit) {
      return;
    }

    const nextCell = findBestEmptyCell(workingBoard);
    if (!nextCell) {
      solutionsCount++;
      return;
    }

    const { row, col, candidates } = nextCell;
    if (candidates.length === 0) {
      return;
    }

    for (const num of candidates) {
      workingBoard[row][col] = num;
      backtrack();
      workingBoard[row][col] = 0;
      if (solutionsCount >= limit) {
        return;
      }
    }
  }

  backtrack();
  return solutionsCount;
}

module.exports = {
  findBestEmptyCell,
  solveBoard,
  countSolutions,
  shuffle
};
