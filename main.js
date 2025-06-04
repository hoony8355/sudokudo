import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { generateEasySudoku } from './sudokuGenerator.js';

const firebaseConfig = {
  apiKey: "AIzaSyCbgziR_rX4O9OkDBsJxTzNO3q486C_eH4",
  authDomain: "sudokudo-58475.firebaseapp.com",
  projectId: "sudokudo-58475",
  storageBucket: "sudokudo-58475.firebasestorage.app",
  messagingSenderId: "759625494323",
  appId: "1:759625494323:web:b9923311c2694e3f5d9846",
  databaseURL: "https://sudokudo-58475-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const startBtn = document.getElementById("start-button");
const difficultySelect = document.getElementById("difficulty-select");
const difficultyBtn = document.getElementById("difficulty-button");
const boardEl = document.getElementById("board");
const numButtons = document.querySelectorAll(".num-btn");
const scoreEl = document.getElementById("scoreA");
const scoreBoard = document.getElementById("scoreboard");
const numberInput = document.getElementById("number-input");

let selectedCell = null;
let score = 0;
let correctCount = 0;
const roomId = "test-room";
const playerId = "tester";

let puzzle = [];
let answerBoard = [];

startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  difficultySelect.style.display = "block";
});

difficultyBtn.addEventListener("click", () => {
  const selected = document.getElementById("difficulty").value;
  const generated = generateEasySudoku(); // 현재는 난이도에 관계없이 easy
  puzzle = generated.puzzle;
  answerBoard = generated.answer;
  difficultySelect.style.display = "none";
  scoreBoard.style.display = "flex";
  numberInput.style.display = "flex";
  renderBoard();
  remove(ref(db, `rooms/${roomId}/board/claimed`));
});

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
}

function handleCellSelect(row, col) {
  if (selectedCell) selectedCell.classList.remove("selected-cell");
  selectedCell = document.getElementById(`cell-${row}-${col}`);
  selectedCell.classList.add("selected-cell");
  selectedCell.dataset.row = row;
  selectedCell.dataset.col = col;
}

numButtons.forEach(btn => {
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
        const generated = generateEasySudoku();
        puzzle = generated.puzzle;
        answerBoard = generated.answer;
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

onValue(ref(db, `rooms/${roomId}/board/claimed`), (snapshot) => {
  const claimed = snapshot.val() || {};
  for (const key in claimed) {
    const [row, col] = key.split("-");
    const cellEl = document.getElementById(`cell-${row}-${col}`);
    const data = claimed[key];
    if (cellEl) {
      cellEl.textContent = data.number;
      cellEl.classList.add("claimedA");
    }
  }
  score = Object.values(claimed).filter(c => c.uid === playerId).length;
  scoreEl.textContent = `나: ${score}칸`;
});
