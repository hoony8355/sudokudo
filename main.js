// main.js
import { db } from './firebase-init.js';
import { generateSudoku } from './sudokuGenerator.js';

let board = [];
let solution = [];
let playerId = null;
let roomId = null;
let selectedCell = null;

function generateEmptyBoard() {
  const boardElement = document.getElementById('board');
  boardElement.innerHTML = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.addEventListener('click', () => handleCellClick(cell));
      boardElement.appendChild(cell);
    }
  }
  console.log('📦 보드 생성 완료');
}

function handleCellClick(cell) {
  if (cell.classList.contains('fixed')) return;
  selectedCell = cell;
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
  cell.classList.add('selected');
  console.log(`🖱️ 셀 선택: (${cell.dataset.row}, ${cell.dataset.col})`);
}

function handleNumberInput(number) {
  if (!selectedCell) return;
  const row = parseInt(selectedCell.dataset.row);
  const col = parseInt(selectedCell.dataset.col);
  if (solution[row][col] === number) {
    selectedCell.textContent = number;
    selectedCell.classList.add('fixed');
    selectedCell.classList.add('player-cell');
    updateBoard(row, col, number);
    console.log(`✅ 정답 입력: ${number} at (${row}, ${col})`);
  } else {
    alert('❌ 오답! -2점');
  }
}

function updateBoard(row, col, value) {
  board[row][col] = value;
  const updates = {};
  updates[`/rooms/${roomId}/board/${row}-${col}`] = {
    value,
    player: playerId
  };
  db.ref().update(updates);
  console.log('📡 보드 업데이트 전송');
}

function renderBoard() {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const value = board[row][col];
      const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
      cell.textContent = value ? value : '';
      if (value !== 0) cell.classList.add('fixed');
    }
  }
  console.log('📦 보드 렌더링 완료');
}

function startGame(initPlayerId, initRoomId) {
  playerId = initPlayerId;
  roomId = initRoomId;
  const { puzzle, answer } = generateSudoku();
  board = puzzle;
  solution = answer;
  generateEmptyBoard();
  renderBoard();
  console.log('🎮 게임 시작');
}

window.handleNumberInput = handleNumberInput;
window.startGame = startGame;
