/**
 * Sudoku Difficulty Service
 * Configures parameters and analyzes puzzle difficulty based on clue count and solving steps.
 */

const DIFFICULTIES = {
  easy: {
    name: 'Easy',
    minClues: 38,
    maxClues: 45,
    targetClues: 40,
    baseScore: 100,
    mistakePenalty: 15,
    hintPenalty: 25,
    speedBonusThresholdSeconds: 300 // 5 mins
  },
  medium: {
    name: 'Medium',
    minClues: 30,
    maxClues: 36,
    targetClues: 33,
    baseScore: 250,
    mistakePenalty: 25,
    hintPenalty: 50,
    speedBonusThresholdSeconds: 480 // 8 mins
  },
  hard: {
    name: 'Hard',
    minClues: 26,
    maxClues: 29,
    targetClues: 28,
    baseScore: 500,
    mistakePenalty: 50,
    hintPenalty: 100,
    speedBonusThresholdSeconds: 720 // 12 mins
  },
  expert: {
    name: 'Expert',
    minClues: 22,
    maxClues: 25,
    targetClues: 24,
    baseScore: 1000,
    mistakePenalty: 100,
    hintPenalty: 200,
    speedBonusThresholdSeconds: 900 // 15 mins
  }
};

/**
 * Gets difficulty configuration by key.
 * @param {string} level 
 * @returns {object}
 */
function getDifficultySettings(level = 'medium') {
  const key = String(level).toLowerCase();
  return DIFFICULTIES[key] || DIFFICULTIES.medium;
}

/**
 * Calculates clue count of a given board.
 * @param {number[][]} board 
 * @returns {number}
 */
function countClues(board) {
  let count = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Calculates difficulty score/tier from clue count and density.
 * @param {number[][]} board 
 * @returns {string}
 */
function calculateDifficulty(board) {
  const clues = countClues(board);
  if (clues >= 38) return 'easy';
  if (clues >= 30) return 'medium';
  if (clues >= 26) return 'hard';
  return 'expert';
}

/**
 * Calculates transparent game score based on difficulty, elapsed time, mistakes, and hints.
 * 
 * @param {object} params
 * @param {string} params.difficulty
 * @param {number} params.elapsedTime - in seconds
 * @param {number} params.mistakes
 * @param {number} params.hintsUsed
 * @returns {{ finalScore: number, breakdown: object }}
 */
function calculateScore({ difficulty = 'medium', elapsedTime = 0, mistakes = 0, hintsUsed = 0 }) {
  const config = getDifficultySettings(difficulty);
  const baseScore = config.baseScore;
  
  // Time bonus (faster than threshold grants up to 50% extra base score)
  let timeBonus = 0;
  if (elapsedTime < config.speedBonusThresholdSeconds) {
    const timeSavedRatio = (config.speedBonusThresholdSeconds - elapsedTime) / config.speedBonusThresholdSeconds;
    timeBonus = Math.round(baseScore * 0.5 * timeSavedRatio);
  }

  const mistakeDeduction = mistakes * config.mistakePenalty;
  const hintDeduction = hintsUsed * config.hintPenalty;

  const totalCalculated = baseScore + timeBonus - mistakeDeduction - hintDeduction;
  const finalScore = Math.max(50, totalCalculated); // Minimum completion score floor

  return {
    finalScore,
    breakdown: {
      baseScore,
      timeBonus,
      mistakeDeduction,
      hintDeduction,
      difficulty: config.name
    }
  };
}

module.exports = {
  DIFFICULTIES,
  getDifficultySettings,
  countClues,
  calculateDifficulty,
  calculateScore
};
