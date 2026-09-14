/**
 * Intelligent Sudoku Hint Engine
 * Analyzes the current board state and explains logical solving techniques to the player.
 */

const { getCandidates, isValidMove, GRID_SIZE, BOX_SIZE } = require('./sudokuValidator');

/**
 * Finds conflicts/errors on the current board.
 * @param {number[][]} board 
 * @param {number[][]} solution 
 * @returns {object|null}
 */
function findConflictOrError(board, solution) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = board[r][c];
      if (val !== 0) {
        // If it violates Sudoku rules with another cell
        if (!isValidMove(board, r, c, val)) {
          return {
            type: 'conflict',
            technique: 'Rule Violation',
            row: r,
            col: c,
            number: val,
            message: `Cell at Row ${r + 1}, Column ${c + 1} with number ${val} conflicts with another ${val} in the same row, column, or 3x3 box.`,
            highlightCells: [{ row: r, col: c }]
          };
        }
        // If solution is provided and cell differs from solution
        if (solution && solution[r][c] !== val) {
          return {
            type: 'incorrect_value',
            technique: 'Incorrect Number',
            row: r,
            col: c,
            number: val,
            correctNumber: solution[r][c],
            message: `The number ${val} at Row ${r + 1}, Column ${c + 1} does not lead to a valid solution. You may want to erase it.`,
            highlightCells: [{ row: r, col: c }]
          };
        }
      }
    }
  }
  return null;
}

/**
 * Finds a Naked Single: an empty cell with only 1 possible candidate.
 * @param {number[][]} board 
 * @returns {object|null}
 */
function findNakedSingle(board) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === 0) {
        const candidates = getCandidates(board, r, c);
        if (candidates.length === 1) {
          const num = candidates[0];
          return {
            technique: 'Naked Single',
            row: r,
            col: c,
            number: num,
            candidates: [num],
            message: `Look at Row ${r + 1}, Column ${c + 1}. All other numbers (1-9) are already present in its row, column, or 3x3 box. Therefore, this cell can only be ${num}.`,
            highlightCells: [{ row: r, col: c }],
            highlightUnit: { type: 'cell', row: r, col: c }
          };
        }
      }
    }
  }
  return null;
}

/**
 * Finds a Hidden Single: a number that can only appear in one cell within a Row, Column, or Box.
 * @param {number[][]} board 
 * @returns {object|null}
 */
function findHiddenSingle(board) {
  // 1. Check Rows
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let num = 1; num <= 9; num++) {
      // Check if num is already in this row
      if (board[r].includes(num)) continue;

      const possibleCols = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
          possibleCols.push(c);
        }
      }

      if (possibleCols.length === 1) {
        const c = possibleCols[0];
        return {
          technique: 'Hidden Single in Row',
          row: r,
          col: c,
          number: num,
          candidates: [num],
          message: `In Row ${r + 1}, the number ${num} can only be placed in Column ${c + 1}. Every other cell in this row is blocked or filled.`,
          highlightCells: [{ row: r, col: c }],
          highlightUnit: { type: 'row', index: r }
        };
      }
    }
  }

  // 2. Check Columns
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let num = 1; num <= 9; num++) {
      let alreadyInCol = false;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r][c] === num) {
          alreadyInCol = true;
          break;
        }
      }
      if (alreadyInCol) continue;

      const possibleRows = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
          possibleRows.push(r);
        }
      }

      if (possibleRows.length === 1) {
        const r = possibleRows[0];
        return {
          technique: 'Hidden Single in Column',
          row: r,
          col: c,
          number: num,
          candidates: [num],
          message: `In Column ${c + 1}, the number ${num} can only be placed in Row ${r + 1}.`,
          highlightCells: [{ row: r, col: c }],
          highlightUnit: { type: 'column', index: c }
        };
      }
    }
  }

  // 3. Check 3x3 Boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxStartR = boxRow * 3;
      const boxStartC = boxCol * 3;

      for (let num = 1; num <= 9; num++) {
        let alreadyInBox = false;
        for (let r = boxStartR; r < boxStartR + 3; r++) {
          for (let c = boxStartC; c < boxStartC + 3; c++) {
            if (board[r][c] === num) {
              alreadyInBox = true;
              break;
            }
          }
          if (alreadyInBox) break;
        }
        if (alreadyInBox) continue;

        const possibleCells = [];
        for (let r = boxStartR; r < boxStartR + 3; r++) {
          for (let c = boxStartC; c < boxStartC + 3; c++) {
            if (board[r][c] === 0 && isValidMove(board, r, c, num)) {
              possibleCells.push({ row: r, col: c });
            }
          }
        }

        if (possibleCells.length === 1) {
          const { row: r, col: c } = possibleCells[0];
          return {
            technique: 'Hidden Single in 3x3 Box',
            row: r,
            col: c,
            number: num,
            candidates: [num],
            message: `In the 3x3 box at Row ${boxStartR + 1}-${boxStartR + 3}, Column ${boxStartC + 1}-${boxStartC + 3}, the number ${num} can only be placed at Row ${r + 1}, Column ${c + 1}.`,
            highlightCells: [{ row: r, col: c }],
            highlightUnit: { type: 'box', boxRow, boxCol }
          };
        }
      }
    }
  }

  return null;
}

/**
 * Generates an intelligent hint for the current board state.
 * 
 * @param {number[][]} currentBoard 
 * @param {number[][]} solution 
 * @returns {object}
 */
function getIntelligentHint(currentBoard, solution) {
  // Step 1: Check for any user input mistakes/conflicts first
  const errorHint = findConflictOrError(currentBoard, solution);
  if (errorHint) {
    return errorHint;
  }

  // Step 2: Try Naked Single
  const nakedSingle = findNakedSingle(currentBoard);
  if (nakedSingle) {
    return nakedSingle;
  }

  // Step 3: Try Hidden Single (Row, Col, Box)
  const hiddenSingle = findHiddenSingle(currentBoard);
  if (hiddenSingle) {
    return hiddenSingle;
  }

  // Step 4: Fallback to logical deduction using the solved puzzle state
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (currentBoard[r][c] === 0 && solution) {
        const correctVal = solution[r][c];
        const candidates = getCandidates(currentBoard, r, c);
        return {
          technique: 'Direct Elimination',
          row: r,
          col: c,
          number: correctVal,
          candidates,
          message: `Focus on Row ${r + 1}, Column ${c + 1}. By eliminating conflicting numbers in its neighborhood, the correct number is ${correctVal}.`,
          highlightCells: [{ row: r, col: c }],
          highlightUnit: { type: 'cell', row: r, col: c }
        };
      }
    }
  }

  return {
    technique: 'Puzzle Completed',
    message: 'The board is already completely and correctly filled!',
    highlightCells: []
  };
}

module.exports = {
  findConflictOrError,
  findNakedSingle,
  findHiddenSingle,
  getIntelligentHint
};
