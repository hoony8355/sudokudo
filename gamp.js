// gamp.js – 실제 게임 실행 로직 처리

import { db } from './firebase-init.js';
import { ref, onValue, update } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js';

let roomId = sessionStorage.getItem("roomId");
let player = sessionStorage.getItem("player");

let puzzle = [];
let boardState = [];
let capturedCells = {};
let selectedCell = null;
let score = 0;
let opponentScore = 0;

const boardContainer = document.getElementById("board");
const scoreA = document.getElementById("scoreA");
const scoreB = document.getElementById("scoreB");

function log(...args) {
  console.log("[Game]", ...args);
}

function renderBoard() {
  boardContainer.innerHTML = "";
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;

      const val = boardState[row][col];
      cell.textContent = val !== 0 ? val : "";

      const key = `${row}-${col}`;
      if (capturedCells[key] === player) cell.classList.add("captured-by-me");
      else if (capturedCells[key]) cell.classList.add("captured-by-other");

      cell.addEventListener("click", () => {
        if (puzzle[row][col] === 0 && !capturedCells[key]) {
          selectedCell = { row, col };
          log("🔲 셀 선택:", selectedCell);
        }
      });

      boardContainer.appendChild(cell);
    }
  }
  log("📦 보드 렌더링 완료");
}

function updateScoreUI() {
  scoreA.textContent = player === "A" ? `나: ${score}칸` : `상대: ${opponentScore}칸`;
  scoreB.textContent = player === "B" ? `나: ${score}칸` : `상대: ${opponentScore}칸`;
}

function listenGameState() {
  const gameRef = ref(db, `rooms/${roomId}`);

  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (data?.puzzle && puzzle.length === 0) {
      puzzle = data.puzzle;
      boardState = JSON.parse(JSON.stringify(puzzle));
      log("📥 퍼즐 불러오기 완료");
      renderBoard();
    }

    if (data?.captures) {
      capturedCells = data.captures;
      renderBoard();
    }

    if (data?.scores) {
      score = data.scores[player] || 0;
      opponentScore = data.scores[player === "A" ? "B" : "A"] || 0;
      updateScoreUI();
    }
  });
}

function handleInput(number) {
  if (!selectedCell) return;
  const { row, col } = selectedCell;
  const correct = puzzle[row][col];
  const cellKey = `${row}-${col}`;

  if (number === correct) {
    boardState[row][col] = number;
    capturedCells[cellKey] = player;
    score++;
    update(ref(db, `rooms/${roomId}`), {
      [`captures/${cellKey}`]: player,
      [`scores/${player}`]: score,
    });
    renderBoard();
  } else {
    score = Math.max(0, score - 2);
    update(ref(db, `rooms/${roomId}`), {
      [`scores/${player}`]: score,
    });
  }
  selectedCell = null;
}

function setupNumberButtons() {
  document.querySelectorAll(".num-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const num = parseInt(btn.textContent);
      handleInput(num);
    });
  });

  document.addEventListener("keydown", (e) => {
    const keyNum = parseInt(e.key);
    if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9) {
      handleInput(keyNum);
    }
  });
}

function startGame() {
  document.getElementById("lobby-container").classList.add("hidden");
  document.getElementById("game-container").classList.remove("hidden");
  listenGameState();
  setupNumberButtons();
  log("🚀 게임 시작 완료");
}

window.addEventListener("startGame", startGame);
