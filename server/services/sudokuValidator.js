/**
 * Sudoku Validator Service
 * Validates moves, constraints, and board states independently of the UI.
 */

const GRID_SIZE = 9;
const BOX_SIZE = 3;

/**
 * Deep clones a 9x9 Sudoku board.
 * @param {number[][]} board
 * @returns {number[][]}
 */
function cloneBoard(board) {
  return board.map(row => [...row]);
}

/**
 * Checks if placing a number at (row, col) violates standard Sudoku rules.
 * Does not conflict with the existing value in the same cell.
 * 
 * @param {number[][]} board 
 * @param {number} row 
 * @param {number} col 
 * @param {number} number 
 * @returns {boolean}
 */
function isValidMove(board, row, col, number) {
  if (number < 1 || number > 9 || !Number.isInteger(number)) {
    return false;
  }
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return false;
  }

  // Check row constraint (excluding current cell)
  for (let c = 0; c < GRID_SIZE; c++) {
    if (c !== col && board[row][c] === number) {
      return false;
    }
  }

  // Check column constraint (excluding current cell)
  for (let r = 0; r < GRID_SIZE; r++) {
    if (r !== row && board[r][col] === number) {
      return false;
    }
  }

  // Check 3x3 box constraint (excluding current cell)
  const boxStartRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxStartCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  for (let r = boxStartRow; r < boxStartRow + BOX_SIZE; r++) {
    for (let c = boxStartCol; c < boxStartCol + BOX_SIZE; c++) {
      if ((r !== row || c !== col) && board[r][c] === number) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Returns an array of valid numbers (1-9) that can be placed in cell (row, col).
 * @param {number[][]} board 
 * @param {number} row 
 * @param {number} col 
 * @returns {number[]}
 */
function getCandidates(board, row, col) {
  if (board[row][col] !== 0) {
    return [];
  }
  const candidates = [];
  for (let num = 1; num <= 9; num++) {
    if (isValidMove(board, row, col, num)) {
      candidates.push(num);
    }
  }
  return candidates;
}

/**
 * Returns true if the board has no empty (0) cells and all rows/cols/boxes are valid.
 * @param {number[][]} board 
 * @returns {boolean}
 */
function isBoardComplete(board) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = board[r][c];
      if (val === 0 || !isValidMove(board, r, c, val)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Validates a completely filled 9x9 board.
 * @param {number[][]} board 
 * @returns {boolean}
 */
function isSolvedBoardValid(board) {
  if (!board || board.length !== 9) return false;
  for (let r = 0; r < 9; r++) {
    if (!board[r] || board[r].length !== 9) return false;
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      if (val < 1 || val > 9 || !isValidMove(board, r, c, val)) {
        return false;
      }
    }
  }
  return true;
}

module.exports = {
  GRID_SIZE,
  BOX_SIZE,
  cloneBoard,
  isValidMove,
  getCandidates,
  isBoardComplete,
  isSolvedBoardValid
};
