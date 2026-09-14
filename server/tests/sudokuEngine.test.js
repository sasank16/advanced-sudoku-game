/**
 * Sudoku Engine Verification Test Suite
 * Tests Validator, Solver, Uniqueness Counter, Generator, and Hint Engine.
 */

const { isValidMove, isBoardComplete, isSolvedBoardValid, getCandidates, cloneBoard } = require('../services/sudokuValidator');
const { solveBoard, countSolutions } = require('../services/sudokuSolver');
const { generateSolvedBoard, generatePuzzle } = require('../services/sudokuGenerator');
const { getIntelligentHint, findNakedSingle, findHiddenSingle } = require('../services/hintEngine');
const { calculateScore, getDifficultySettings } = require('../services/difficulty');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING SUDOKU ENGINE TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Validator rules
  console.log('--- 1. Testing Validator ---');
  const sampleBoard = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ];

  assert(isValidMove(sampleBoard, 0, 2, 4) === true, 'Move 4 at (0,2) is valid');
  assert(isValidMove(sampleBoard, 0, 2, 5) === false, 'Move 5 at (0,2) violates row/box constraint');
  assert(isValidMove(sampleBoard, 0, 2, 6) === false, 'Move 6 at (0,2) violates box constraint');
  assert(isValidMove(sampleBoard, 0, 0, 5) === true, 'Validation does not falsely reject existing number in same cell');
  
  const candidatesAt02 = getCandidates(sampleBoard, 0, 2);
  assert(candidatesAt02.includes(4) && candidatesAt02.includes(1) && candidatesAt02.includes(2), 'Candidates calculated correctly');

  // Test 2: Solver
  console.log('\n--- 2. Testing Solver ---');
  const solveResult = solveBoard(sampleBoard);
  assert(solveResult.solved === true, 'Solver successfully solves valid puzzle');
  assert(isSolvedBoardValid(solveResult.solution) === true, 'Solver output is 100% valid Sudoku board');
  assert(isBoardComplete(solveResult.solution) === true, 'Solved board is complete with no empty cells');

  // Impossible board test
  const impossibleBoard = cloneBoard(sampleBoard);
  impossibleBoard[0][2] = 5; // create deliberate unsolvable conflict
  impossibleBoard[0][3] = 5;
  const impossibleResult = solveBoard(impossibleBoard);
  assert(impossibleResult.solved === false, 'Solver returns solved: false for impossible puzzle');

  // Test 3: Uniqueness Counter
  console.log('\n--- 3. Testing Uniqueness Counter ---');
  const countSingle = countSolutions(sampleBoard, 2);
  assert(countSingle === 1, 'Known single-solution puzzle returns countSolutions === 1');

  // Board with multiple solutions (almost empty board)
  const emptyBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
  const countMultiple = countSolutions(emptyBoard, 2);
  assert(countMultiple === 2, 'Empty board correctly identified as having multiple solutions');

  // Test 4: Solved Board Generator
  console.log('\n--- 4. Testing Solved Board Generator ---');
  const generatedSolved = generateSolvedBoard();
  assert(isSolvedBoardValid(generatedSolved) === true, 'Generated solved board is valid');
  assert(isBoardComplete(generatedSolved) === true, 'Generated solved board is complete');

  // Test 5: Puzzle Generator across Difficulties
  console.log('\n--- 5. Testing Puzzle Generator (All Difficulties) ---');
  const difficulties = ['easy', 'medium', 'hard', 'expert'];
  for (const diff of difficulties) {
    console.log(`Generating puzzle for difficulty: ${diff}...`);
    const gen = generatePuzzle(diff);
    assert(gen.puzzle !== null, `Generated puzzle object for ${diff}`);
    assert(gen.solution !== null, `Generated solution object for ${diff}`);
    assert(isSolvedBoardValid(gen.solution) === true, `Solution is valid for ${diff}`);
    
    // Crucial check: verify that puzzle has EXACTLY ONE solution!
    const solCount = countSolutions(gen.puzzle, 2);
    assert(solCount === 1, `Puzzle for ${diff} has guaranteed UNIQUE solution (count=1, clues=${gen.cluesCount})`);
  }

  // Test 6: Intelligent Hint Engine
  console.log('\n--- 6. Testing Intelligent Hint Engine ---');
  // Construct a board with a clear Naked Single
  const hintBoard = cloneBoard(sampleBoard);
  const hint = getIntelligentHint(hintBoard, solveResult.solution);
  assert(hint !== null && typeof hint.technique === 'string', 'Hint engine returns structured technique');
  assert(hint.row >= 0 && hint.row < 9 && hint.col >= 0 && hint.col < 9, 'Hint specifies valid target cell');
  assert(typeof hint.message === 'string' && hint.message.length > 0, 'Hint provides detailed explanation message');

  // Test 7: Scoring & Difficulty Config
  console.log('\n--- 7. Testing Scoring System ---');
  const scoreResult = calculateScore({ difficulty: 'hard', elapsedTime: 200, mistakes: 1, hintsUsed: 1 });
  assert(scoreResult.finalScore > 0, 'Score is calculated transparently');
  assert(scoreResult.breakdown.baseScore === 500, 'Hard base score is 500');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} SUDOKU ENGINE TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
