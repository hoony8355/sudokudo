// game.js

import { getDatabase, ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { generateSudoku } from './sudoku-generator.js';

const db = getDatabase();
const roomId = sessionStorage.getItem('roomId');
const playerId = `player-${Math.floor(Math.random() * 10000)}`;

const boardEl = document.getElementById("board");
const numberInput = document.getElementById("number-input");
const scoreEl = document.getElementById("scoreA");

let selectedCell = null;
let score = 0;
let correctCount = 0;
let puzzle = [];
let answerBoard = [];

function renderBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.id = `cell-${r}-${c}`;
      if (puzzle[r][c] !== 0) {
        cell.textContent = puzzle[r][c];
        cell.classList.add("prefilled");
      } else {
        cell.addEventListener("click", () => handleCellSelect(r, c));
      }
      boardEl.appendChild(cell);
    }
  }
  console.log("📦 보드 렌더링 완료");
}

function handleCellSelect(row, col) {
  if (selectedCell) selectedCell.classList.remove("selected-cell");
  selectedCell = document.getElementById(`cell-${row}-${col}`);
  selectedCell.classList.add("selected-cell");
  selectedCell.dataset.row = row;
  selectedCell.dataset.col = col;
}

function listenToClaimedCells() {
  onValue(ref(db, `rooms/${roomId}/board/claimed`), (snapshot) => {
    const claimed = snapshot.val() || {};
    for (const key in claimed) {
      const [row, col] = key.split("-");
      const cellEl = document.getElementById(`cell-${row}-${col}`);
      const data = claimed[key];
      if (cellEl) {
        cellEl.textContent = data.number;
        cellEl.classList.add(data.uid === playerId ? "claimedA" : "claimedB");
      }
    }
    score = Object.values(claimed).filter(c => c.uid === playerId).length;
    scoreEl.textContent = `나: ${score}칸`;
    console.log("📡 점령 현황 갱신됨", claimed);
  });
}

function setupInput() {
  document.querySelectorAll(".num-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!selectedCell) return;
      const row = parseInt(selectedCell.dataset.row);
      const col = parseInt(selectedCell.dataset.col);
      const selectedNumber = parseInt(btn.textContent);

      if (answerBoard[row][col] === selectedNumber) {
        set(ref(db, `rooms/${roomId}/board/claimed/${row}-${col}`), {
          uid: playerId,
          number: selectedNumber
        });
        correctCount++;
        if (correctCount >= 9) {
          correctCount = 0;
          const { puzzle: newPuzzle, solution: newAnswer } = generateSudoku();
          puzzle = newPuzzle;
          answerBoard = newAnswer;
          renderBoard();
          remove(ref(db, `rooms/${roomId}/board/claimed`));
        }
      } else {
        alert("틀렸습니다! 다시 시도하세요.");
      }

      selectedCell.classList.remove("selected-cell");
      selectedCell = null;
    });
  });
}

function startGame() {
  const gameDataRef = ref(db, `rooms/${roomId}`);
  onValue(gameDataRef, (snapshot) => {
    const data = snapshot.val();
    if (data && data.players && Object.keys(data.players).length === 2) {
      if (!data.board) {
        // 방장이 퍼즐 생성
        const { puzzle: newPuzzle, solution: newAnswer } = generateSudoku();
        set(ref(db, `rooms/${roomId}/board/puzzle`), newPuzzle);
        set(ref(db, `rooms/${roomId}/board/answer`), newAnswer);
        console.log("🧩 퍼즐 생성 및 저장 완료");
      }
    }
  });

  // 퍼즐 불러오기 및 렌더링
  onValue(ref(db, `rooms/${roomId}/board/puzzle`), (snapshot) => {
    const value = snapshot.val();
    if (value) {
      puzzle = value;
      console.log("🟢 퍼즐 불러오기 완료");
      renderBoard();
    }
  });

  onValue(ref(db, `rooms/${roomId}/board/answer`), (snapshot) => {
    const value = snapshot.val();
    if (value) answerBoard = value;
  });

  setupInput();
  listenToClaimedCells();
  numberInput.style.display = 'flex';
  console.log("🎮 게임 시작");
}

startGame();
