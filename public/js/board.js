/**
 * Board Renderer & Highlighting Module
 */

const Board = (() => {
  let boardContainer = null;
  let cellElements = [];

  function init(containerId) {
    boardContainer = document.getElementById(containerId);
    if (!boardContainer) return;
    createGrid();
  }

  function createGrid() {
    boardContainer.innerHTML = '';
    cellElements = [];

    for (let r = 0; r < 9; r++) {
      cellElements[r] = [];
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        
        // Inner container for pencil marks or value
        boardContainer.appendChild(cell);
        cellElements[r][c] = cell;
      }
    }
  }

  function render(gameState) {
    if (!boardContainer || !gameState || !gameState.currentBoard) return;

    const { puzzle, currentBoard, pencilMarks, selectedCell, errors = [] } = gameState;
    const selectedVal = selectedCell && currentBoard[selectedCell.row] 
      ? currentBoard[selectedCell.row][selectedCell.col] 
      : 0;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = cellElements[r][c];
        const val = currentBoard[r][c];
        const isFixed = puzzle[r][c] !== 0;
        const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;
        const isSameNumber = selectedVal !== 0 && val === selectedVal;
        const isRelatedUnit = selectedCell && (
          selectedCell.row === r || 
          selectedCell.col === c || 
          (Math.floor(selectedCell.row / 3) === Math.floor(r / 3) && Math.floor(selectedCell.col / 3) === Math.floor(c / 3))
        );
        const hasError = errors.some(e => e.row === r && e.col === c);

        // Reset classes
        cell.className = 'sudoku-cell';
        if (isFixed) cell.classList.add('fixed');
        if (!isFixed && val !== 0) cell.classList.add('user-input');
        if (isSelected) cell.classList.add('selected');
        else if (isSameNumber) cell.classList.add('highlight-same');
        else if (isRelatedUnit) cell.classList.add('highlight-unit');
        
        if (hasError) cell.classList.add('error');

        // Render content: either big number or candidate mini-grid
        if (val !== 0) {
          cell.textContent = val;
        } else {
          const candidates = pencilMarks && pencilMarks[r] ? pencilMarks[r][c] || [] : [];
          if (candidates.length > 0) {
            cell.innerHTML = renderPencilGrid(candidates);
          } else {
            cell.innerHTML = '';
          }
        }
      }
    }
  }

  function renderPencilGrid(candidates) {
    let html = '<div class="pencil-grid">';
    for (let i = 1; i <= 9; i++) {
      const active = candidates.includes(i);
      html += `<div class="pencil-num">${active ? i : ''}</div>`;
    }
    html += '</div>';
    return html;
  }

  function highlightHint(row, col) {
    if (cellElements[row] && cellElements[row][col]) {
      const cell = cellElements[row][col];
      cell.classList.add('hint-target');
      setTimeout(() => {
        cell.classList.remove('hint-target');
      }, 4000);
    }
  }

  function getCellElement(row, col) {
    return cellElements[row] ? cellElements[row][col] : null;
  }

  return {
    init,
    render,
    highlightHint,
    getCellElement
  };
})();
