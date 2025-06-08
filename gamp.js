// gamp.js – 게임 본격 시작 이후 로직 담당

import { db } from "./firebase-init.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

let roomId = sessionStorage.getItem("roomId");
let player = sessionStorage.getItem("player");
let puzzle = [];
let boardState = [];
let capturedCells = {};
let score = 0;
let opponentScore = 0;
let selectedCell = null;

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

      const cellKey = `${row}-${col}`;
      if (capturedCells[cellKey] === player) {
        cell.classList.add("captured-by-me");
      } else if (capturedCells[cellKey]) {
        cell.classList.add("captured-by-other");
      }

      cell.addEventListener("click", () => {
        if (puzzle[row][col] === 0 && !capturedCells[cellKey]) {
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
  scoreA.textContent = `나: ${player === "A" ? score : opponentScore}칸`;
  scoreB.textContent = `상대: ${player === "B" ? score : opponentScore}칸`;
}

function handleInput(num) {
  if (!selectedCell) return;
  const { row, col } = selectedCell;
  const correct = puzzle[row][col + 9 * row];
  const cellKey = `${row}-${col}`;

  if (num === correct) {
    boardState[row][col] = num;
    capturedCells[cellKey] = player;
    score++;
    log(`✅ 정답: ${num} at (${row},${col})`);
    update(ref(db, `rooms/${roomId}`), {
      [`boardState`]: boardState,
      [`captures`]: capturedCells,
      [`scores/${player}`]: score,
    });
    renderBoard();
  } else {
    log(`❌ 오답: ${num} at (${row},${col})`);
    score = Math.max(0, score - 2);
    update(ref(db, `rooms/${roomId}/scores`), {
      [player]: score
    });
  }
  updateScoreUI();
  selectedCell = null;
}

function setupNumberButtons() {
  const buttons = document.querySelectorAll(".num-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const num = parseInt(btn.textContent);
      handleInput(num);
    });
  });
  document.addEventListener("keydown", (e) => {
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      handleInput(num);
    }
  });
  log("🧩 숫자 입력 시스템 초기화 완료");
}

function listenGameState() {
  const gameRef = ref(db, `rooms/${roomId}`);
  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    if (data.puzzle) {
      puzzle = data.puzzle;
      boardState = JSON.parse(JSON.stringify(puzzle));
      renderBoard();
    }
    if (data.captures) {
      capturedCells = data.captures;
      renderBoard();
    }
    if (data.scores) {
      score = data.scores[player] || 0;
      opponentScore = data.scores[player === "A" ? "B" : "A"] || 0;
      updateScoreUI();
    }
  });
}

function startGame() {
  log("🚀 게임 본격 시작!");
  listenGameState();
  setupNumberButtons();
}

window.addEventListener("startGame", startGame);
