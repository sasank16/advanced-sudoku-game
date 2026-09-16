/**
 * Core Game Controller & State Manager
 */

const Game = (() => {
  let state = {
    gameId: null,
    difficulty: 'medium',
    puzzle: [],
    currentBoard: [],
    pencilMarks: [],
    selectedCell: null,
    mistakes: 0,
    maxMistakes: 3,
    hintsUsed: 0,
    score: 0,
    elapsedTime: 0,
    isPaused: false,
    pencilMode: false,
    status: 'playing',
    errors: []
  };

  let undoStack = [];
  let redoStack = [];
  let timer = null;

  async function init() {
    Board.init('sudoku-board');
    timer = new GameTimer(onTimerTick);

    setupEventListeners();
    setupKeyboardListeners();

    // Check URL query parameters for difficulty or resume
    const urlParams = new URLSearchParams(window.location.search);
    const difficultyParam = urlParams.get('difficulty') || 'medium';
    
    await startNewGame(difficultyParam);
  }

  function onTimerTick(seconds, formatted) {
    state.elapsedTime = seconds;
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = formatted;
    }
  }

  async function startNewGame(difficulty = 'medium') {
    try {
      UI.toast(`Generating ${difficulty.toUpperCase()} puzzle...`, 'info', 2000);
      
      const res = await API.createGame(difficulty);
      if (!res.success) {
        throw new Error(res.message || 'Failed to start game');
      }

      const g = res.game;
      state = {
        gameId: g.id,
        difficulty: g.difficulty,
        puzzle: g.puzzle,
        currentBoard: g.currentBoard.map(r => [...r]),
        pencilMarks: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
        selectedCell: { row: 0, col: 0 },
        mistakes: g.mistakes || 0,
        maxMistakes: g.maxMistakes || 3,
        hintsUsed: 0,
        score: g.score || 0,
        elapsedTime: 0,
        isPaused: false,
        pencilMode: false,
        status: 'playing',
        errors: []
      };

      undoStack = [];
      redoStack = [];

      updateHeaderUI();
      timer.start(0);
      Board.render(state);
      updateRemainingNumbers();
      UI.toast('New puzzle ready! Good luck.', 'success', 2500);
    } catch (err) {
      console.error('Game Init Error:', err);
      UI.toast(err.message || 'Could not load puzzle.', 'error');
    }
  }

  function setupEventListeners() {
    // Board cell selection
    const boardEl = document.getElementById('sudoku-board');
    if (boardEl) {
      boardEl.addEventListener('click', (e) => {
        const cell = e.target.closest('.sudoku-cell');
        if (!cell || state.isPaused || state.status !== 'playing') return;

        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);

        selectCell(row, col);
        UI.Sound.click();
      });
    }

    // Number Pad clicks
    document.querySelectorAll('.num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = parseInt(btn.dataset.number, 10);
        handleNumberInput(num);
      });
    });

    // Action Controls
    const pencilBtn = document.getElementById('btn-pencil');
    if (pencilBtn) {
      pencilBtn.addEventListener('click', togglePencilMode);
    }

    const eraseBtn = document.getElementById('btn-erase');
    if (eraseBtn) {
      eraseBtn.addEventListener('click', () => handleErase());
    }

    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
      undoBtn.addEventListener('click', handleUndo);
    }

    const redoBtn = document.getElementById('btn-redo');
    if (redoBtn) {
      redoBtn.addEventListener('click', handleRedo);
    }

    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn) {
      hintBtn.addEventListener('click', handleHintRequest);
    }

    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', togglePause);
    }

    const resumeBtn = document.getElementById('resume-overlay-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', togglePause);
    }

    const newGameBtn = document.getElementById('btn-new-game');
    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => {
        showNewGameModal();
      });
    }
  }

  function setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (state.isPaused && e.key !== ' ') return;

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        handleErase();
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        togglePencilMode();
      } else if (e.key.toLowerCase() === 'u' || (e.ctrlKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleHintRequest();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePause();
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        handleArrowNavigation(e.key);
      }
    });
  }

  function selectCell(row, col) {
    state.selectedCell = { row, col };
    Board.render(state);
  }

  function handleArrowNavigation(arrowKey) {
    if (!state.selectedCell) {
      state.selectedCell = { row: 0, col: 0 };
      Board.render(state);
      return;
    }

    let { row, col } = state.selectedCell;
    if (arrowKey === 'ArrowUp') row = (row > 0) ? row - 1 : 8;
    else if (arrowKey === 'ArrowDown') row = (row < 8) ? row + 1 : 0;
    else if (arrowKey === 'ArrowLeft') col = (col > 0) ? col - 1 : 8;
    else if (arrowKey === 'ArrowRight') col = (col < 8) ? col + 1 : 0;

    selectCell(row, col);
    UI.Sound.click();
  }

  function togglePencilMode() {
    state.pencilMode = !state.pencilMode;
    const pencilBtn = document.getElementById('btn-pencil');
    if (pencilBtn) {
      pencilBtn.classList.toggle('active', state.pencilMode);
    }
    UI.toast(state.pencilMode ? '✏️ Pencil mode ON' : '🖊️ Normal mode ON', 'info', 1500);
  }

  async function handleNumberInput(number) {
    if (!state.selectedCell || state.status !== 'playing' || state.isPaused) return;

    const { row, col } = state.selectedCell;

    // Fixed clue cell protection
    if (state.puzzle[row][col] !== 0) {
      UI.toast('Original clue cell cannot be edited.', 'warning', 1500);
      return;
    }

    // --- PENCIL MODE ---
    if (state.pencilMode) {
      const currentVal = state.currentBoard[row][col];
      if (currentVal !== 0) return; // Cannot add pencil marks to filled cell

      const candidates = [...state.pencilMarks[row][col]];
      const prevCandidates = [...candidates];

      const idx = candidates.indexOf(number);
      if (idx > -1) {
        candidates.splice(idx, 1);
      } else {
        candidates.push(number);
        candidates.sort((a, b) => a - b);
      }

      state.pencilMarks[row][col] = candidates;

      // Push to Undo Stack
      undoStack.push({
        type: 'pencil',
        row,
        col,
        prevCandidates,
        newCandidates: candidates
      });
      redoStack = [];

      UI.Sound.click();
      Board.render(state);
      return;
    }

    // --- NORMAL MODE ---
    const prevVal = state.currentBoard[row][col];
    const prevCandidates = [...state.pencilMarks[row][col]];

    if (prevVal === number) return; // Same number already placed

    try {
      const res = await API.makeMove(state.gameId, { row, col, number });
      if (!res.success) {
        UI.toast(res.message, 'error');
        return;
      }

      // Record move history for undo
      undoStack.push({
        type: 'value',
        row,
        col,
        prevVal,
        newVal: number,
        prevCandidates,
        newCandidates: []
      });
      redoStack = [];

      if (res.correct) {
        state.currentBoard[row][col] = number;
        state.pencilMarks[row][col] = [];
        state.errors = state.errors.filter(e => !(e.row === row && e.col === col));

        UI.Sound.correct();

        // Auto-remove candidate from row, col, box
        autoRemoveCandidateFromPeers(row, col, number);

        if (res.completed) {
          handleGameWon();
          return;
        }
      } else {
        state.currentBoard[row][col] = number;
        state.mistakes = res.mistakes;
        state.errors.push({ row, col });

        UI.Sound.error();
        updateHeaderUI();

        if (state.mistakes >= state.maxMistakes) {
          handleGameOver();
          return;
        } else {
          UI.toast(`Mistake! (${state.mistakes}/${state.maxMistakes})`, 'error', 2000);
        }
      }

      Board.render(state);
      updateRemainingNumbers();
    } catch (err) {
      UI.toast(err.message || 'Move failed.', 'error');
    }
  }

  function autoRemoveCandidateFromPeers(row, col, num) {
    for (let c = 0; c < 9; c++) {
      removeCandidateAt(row, c, num);
    }
    for (let r = 0; r < 9; r++) {
      removeCandidateAt(r, col, num);
    }
    const boxR = Math.floor(row / 3) * 3;
    const boxC = Math.floor(col / 3) * 3;
    for (let r = boxR; r < boxR + 3; r++) {
      for (let c = boxC; c < boxC + 3; c++) {
        removeCandidateAt(r, c, num);
      }
    }
  }

  function removeCandidateAt(r, c, num) {
    const list = state.pencilMarks[r][c];
    const idx = list.indexOf(num);
    if (idx > -1) {
      list.splice(idx, 1);
    }
  }

  async function handleErase() {
    if (!state.selectedCell || state.status !== 'playing' || state.isPaused) return;
    const { row, col } = state.selectedCell;

    if (state.puzzle[row][col] !== 0) return;

    const prevVal = state.currentBoard[row][col];
    const prevCandidates = [...state.pencilMarks[row][col]];

    if (prevVal === 0 && prevCandidates.length === 0) return;

    if (prevVal !== 0) {
      await API.makeMove(state.gameId, { row, col, number: 0 });
      state.currentBoard[row][col] = 0;
      state.errors = state.errors.filter(e => !(e.row === row && e.col === col));
    }

    state.pencilMarks[row][col] = [];

    undoStack.push({
      type: 'erase',
      row,
      col,
      prevVal,
      newVal: 0,
      prevCandidates,
      newCandidates: []
    });
    redoStack = [];

    UI.Sound.erase();
    Board.render(state);
    updateRemainingNumbers();
  }

  function handleUndo() {
    if (undoStack.length === 0 || state.status !== 'playing') {
      UI.toast('Nothing to undo.', 'info', 1000);
      return;
    }

    const lastMove = undoStack.pop();
    redoStack.push(lastMove);

    const { row, col, prevVal, prevCandidates } = lastMove;

    if (lastMove.type === 'value' || lastMove.type === 'erase') {
      state.currentBoard[row][col] = prevVal;
      state.pencilMarks[row][col] = [...prevCandidates];
      state.errors = state.errors.filter(e => !(e.row === row && e.col === col));
      API.makeMove(state.gameId, { row, col, number: prevVal });
    } else if (lastMove.type === 'pencil') {
      state.pencilMarks[row][col] = [...prevCandidates];
    }

    selectCell(row, col);
    UI.Sound.click();
    Board.render(state);
    updateRemainingNumbers();
  }

  function handleRedo() {
    if (redoStack.length === 0 || state.status !== 'playing') {
      UI.toast('Nothing to redo.', 'info', 1000);
      return;
    }

    const nextMove = redoStack.pop();
    undoStack.push(nextMove);

    const { row, col, newVal, newCandidates } = nextMove;

    if (nextMove.type === 'value' || nextMove.type === 'erase') {
      state.currentBoard[row][col] = newVal;
      state.pencilMarks[row][col] = [...newCandidates];
      API.makeMove(state.gameId, { row, col, number: newVal });
    } else if (nextMove.type === 'pencil') {
      state.pencilMarks[row][col] = [...newCandidates];
    }

    selectCell(row, col);
    UI.Sound.click();
    Board.render(state);
    updateRemainingNumbers();
  }

  async function handleHintRequest() {
    if (state.status !== 'playing' || state.isPaused) return;

    try {
      const res = await API.requestHint(state.gameId);
      if (!res.success) {
        UI.toast(res.message, 'error');
        return;
      }

      state.hintsUsed = res.hintsUsed;
      updateHeaderUI();

      const hint = res.hint;
      UI.Sound.hint();

      if (hint.highlightCells && hint.highlightCells.length > 0) {
        const target = hint.highlightCells[0];
        selectCell(target.row, target.col);
        Board.highlightHint(target.row, target.col);
      }

      // Show Hint Modal
      const hintBody = document.createElement('div');
      hintBody.innerHTML = `
        <div class="hint-card">
          <span class="hint-badge">${hint.technique}</span>
          <p class="hint-text">${hint.message}</p>
        </div>
      `;

      UI.showModal({
        title: '💡 Intelligent Hint',
        body: hintBody,
        confirmText: hint.number ? `Apply Number (${hint.number})` : 'Understood',
        cancelText: hint.number ? 'Dismiss' : null,
        onConfirm: () => {
          if (hint.number !== undefined && hint.row !== undefined && hint.col !== undefined) {
            selectCell(hint.row, hint.col);
            handleNumberInput(hint.number);
          }
        }
      });
    } catch (err) {
      UI.toast(err.message || 'Could not fetch hint.', 'error');
    }
  }

  function togglePause() {
    if (state.status !== 'playing' && state.status !== 'paused') return;

    state.isPaused = !state.isPaused;
    const pauseOverlay = document.getElementById('pause-overlay');
    const pauseBtn = document.getElementById('btn-pause');

    if (state.isPaused) {
      timer.pause();
      state.status = 'paused';
      if (pauseOverlay) pauseOverlay.style.display = 'flex';
      if (pauseBtn) pauseBtn.innerHTML = '▶️ Resume';
    } else {
      timer.resume();
      state.status = 'playing';
      if (pauseOverlay) pauseOverlay.style.display = 'none';
      if (pauseBtn) pauseBtn.innerHTML = '⏸️ Pause';
    }
  }

  async function handleGameWon() {
    timer.stop();
    state.status = 'completed';
    UI.Sound.victory();

    try {
      const res = await API.completeGame(state.gameId, { elapsedTime: timer.getSeconds() });
      const score = res.score || 0;
      const breakdown = res.breakdown || {};

      const winBody = document.createElement('div');
      winBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">🏆</div>
          <h2 style="color: var(--accent-secondary); margin-bottom: 0.25rem;">Puzzle Solved!</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">You conquered the ${state.difficulty.toUpperCase()} difficulty!</p>
        </div>
        <div class="card" style="padding: 1rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>⏱️ Total Time:</span>
            <strong>${timer.getFormattedTime()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>🎯 Mistakes:</span>
            <strong>${state.mistakes}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>💡 Hints Used:</span>
            <strong>${state.hintsUsed}</strong>
          </div>
          <hr style="border-color: var(--border-color); margin: 0.75rem 0;" />
          <div style="display: flex; justify-content: space-between; font-size: 1.2rem; color: var(--accent-primary);">
            <strong>Final Score:</strong>
            <strong>${score} pts</strong>
          </div>
        </div>
      `;

      UI.showModal({
        title: 'Victory!',
        body: winBody,
        confirmText: 'Play Again',
        cancelText: 'Leaderboard',
        onConfirm: () => showNewGameModal(),
        onCancel: () => { window.location.href = 'leaderboard.html'; }
      });
    } catch (err) {
      console.error('Completion error:', err);
    }
  }

  function handleGameOver() {
    timer.stop();
    state.status = 'failed';
    UI.Sound.error();

    const gameOverBody = document.createElement('div');
    gameOverBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 1rem;">
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">💔</div>
        <h2 style="color: var(--danger); margin-bottom: 0.25rem;">Game Over</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">You reached the 3-mistake limit on ${state.difficulty.toUpperCase()}.</p>
      </div>
    `;

    UI.showModal({
      title: 'Defeat',
      body: gameOverBody,
      confirmText: 'Try Again',
      cancelText: 'Home',
      onConfirm: () => startNewGame(state.difficulty),
      onCancel: () => { window.location.href = 'index.html'; }
    });
  }

  function showNewGameModal() {
    const modalBody = document.createElement('div');
    modalBody.innerHTML = `
      <p style="margin-bottom: 1rem; color: var(--text-secondary);">Select difficulty for your new puzzle:</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
        <button class="btn btn-secondary" onclick="Game.startNewGame('easy'); UI.closeModal();">🟢 Easy</button>
        <button class="btn btn-secondary" onclick="Game.startNewGame('medium'); UI.closeModal();">🟡 Medium</button>
        <button class="btn btn-secondary" onclick="Game.startNewGame('hard'); UI.closeModal();">🔴 Hard</button>
        <button class="btn btn-secondary" onclick="Game.startNewGame('expert'); UI.closeModal();">🟣 Expert</button>
      </div>
    `;

    UI.showModal({
      title: 'Start New Game',
      body: modalBody,
      confirmText: 'Cancel',
      onConfirm: () => {}
    });
  }

  function updateHeaderUI() {
    const diffBadge = document.getElementById('difficulty-badge');
    if (diffBadge) {
      diffBadge.className = `badge-difficulty badge-${state.difficulty}`;
      diffBadge.textContent = state.difficulty;
    }

    const mistakesDisplay = document.getElementById('mistakes-display');
    if (mistakesDisplay) {
      mistakesDisplay.textContent = `${state.mistakes} / ${state.maxMistakes}`;
    }

    const hintsDisplay = document.getElementById('hints-display');
    if (hintsDisplay) {
      hintsDisplay.textContent = `${state.hintsUsed}`;
    }
  }

  function updateRemainingNumbers() {
    const counts = Array(10).fill(0);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = state.currentBoard[r][c];
        if (val >= 1 && val <= 9) {
          counts[val]++;
        }
      }
    }

    for (let num = 1; num <= 9; num++) {
      const btn = document.querySelector(`.num-btn[data-number="${num}"] .num-count`);
      if (btn) {
        const remaining = 9 - counts[num];
        btn.textContent = remaining > 0 ? `${remaining} left` : '✓';
      }
    }
  }

  return {
    init,
    startNewGame,
    selectCell
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sudoku-board')) {
    Game.init();
  }
});
