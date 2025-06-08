// game.js

import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { db } from "./firebase-init.js";
import { generateSudoku } from "./sudokuGenerator.js";

let roomId = sessionStorage.getItem("roomId");
let player = sessionStorage.getItem("player");
const boardContainer = document.getElementById("board");
const gameStatus = document.getElementById("game-status");

let puzzle = [];
let boardState = [];
let score = 0;
let opponentScore = 0;
let selectedCell = null;
let capturedCells = {};

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
          log("셀 선택:", selectedCell);
        }
      });

      boardContainer.appendChild(cell);
    }
  }
  log("📦 보드 렌더링 완료");
}

function updateCapturedCellsUI() {
  document.querySelectorAll(".cell").forEach(cell => {
    const row = cell.dataset.row;
    const col = cell.dataset.col;
    const key = `${row}-${col}`;
    cell.classList.remove("captured-by-me", "captured-by-other");
    if (capturedCells[key] === player) {
      cell.classList.add("captured-by-me");
    } else if (capturedCells[key]) {
      cell.classList.add("captured-by-other");
    }
  });
  log("📡 점령 현황 UI 갱신");
}

function setupBoard(p) {
  puzzle = p;
  boardState = JSON.parse(JSON.stringify(puzzle.puzzle));
  capturedCells = {};
  renderBoard();
}

function initGame() {
  const gameRef = ref(db, `rooms/${roomId}`);

  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();

    if (data?.puzzle && puzzle.length === 0) {
      setupBoard(data.puzzle);
      log(`✅ ${player}: 퍼즐 불러오기 완료`);
    }

    if (data?.captures) {
      capturedCells = data.captures;
      updateCapturedCellsUI();
    }

    if (data?.scores) {
      score = data.scores[player] || 0;
      opponentScore = data.scores[player === "A" ? "B" : "A"] || 0;
      gameStatus.textContent = `나: ${score}점 / 상대: ${opponentScore}점`;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!selectedCell || isNaN(parseInt(e.key))) return;

    const { row, col } = selectedCell;
    const answer = parseInt(e.key);
    const correct = puzzle.answer[row][col];
    const cellKey = `${row}-${col}`;

    if (answer === correct) {
      boardState[row][col] = answer;
      capturedCells[cellKey] = player;
      score++;
      update(ref(db, `rooms/${roomId}`), {
        [`boardState`]: boardState,
        [`captures`]: capturedCells,
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
  });

  log("🎮 게임 시작");
}

window.addEventListener("DOMContentLoaded", initGame);
