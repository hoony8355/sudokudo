// sudoku-game.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// 🔧 Firebase 초기화
const firebaseConfig = {
  apiKey: "AIzaSyCbgziR_rX4O9OkDBsJxTzNO3q486C_eH4",
  authDomain: "sudokudo-58475.firebaseapp.com",
  databaseURL: "https://sudokudo-58475-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sudokudo-58475",
  storageBucket: "sudokudo-58475.firebasestorage.app",
  messagingSenderId: "759625494323",
  appId: "1:759625494323:web:b9923311c2694e3f5d9846",
  measurementId: "G-5YCQ6KGK43"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 📌 전역 변수
let puzzle = [];
let solution = [];
let boardState = [];
let capturedCells = {};
let selectedCell = null;
let score = 0;
let opponentScore = 0;
const roomId = sessionStorage.getItem("roomId");
const player = sessionStorage.getItem("player");

// 🎲 퍼즐 생성기
function generateSudoku() {
  const baseBoard = Array.from({ length: 9 }, (_, i) => (i + 1));
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  const isValid = (board, row, col, num) => {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
      const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
      const boxCol = 3 * Math.floor(col / 3) + (i % 3);
      if (board[boxRow][boxCol] === num) return false;
    }
    return true;
  };
  const fill = (row = 0, col = 0) => {
    if (row === 9) return true;
    const nextRow = col === 8 ? row + 1 : row;
    const nextCol = (col + 1) % 9;
    const shuffled = baseBoard.sort(() => Math.random() - 0.5);
    for (const num of shuffled) {
      if (isValid(board, row, col, num)) {
        board[row][col] = num;
        if (fill(nextRow, nextCol)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  };
  fill();
  const solution = board.map(row => [...row]);
  let puzzle = board.map(row => [...row]);
  let blanks = 50;
  while (blanks > 0) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      blanks--;
    }
  }
  return { puzzle, solution };
}

// 🧩 보드 생성
function renderBoard() {
  const boardContainer = document.getElementById("board");
  boardContainer.innerHTML = "";
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      const key = `${row}-${col}`;
      if (boardState[row][col]) cell.textContent = boardState[row][col];
      if (capturedCells[key] === player) cell.classList.add("captured-by-me");
      else if (capturedCells[key]) cell.classList.add("captured-by-other");
      cell.addEventListener("click", () => {
        if (puzzle[row][col] === 0 && !capturedCells[key]) {
          selectedCell = { row, col };
          console.log("🔲 셀 선택:", selectedCell);
        }
      });
      boardContainer.appendChild(cell);
    }
  }
  console.log("📦 보드 렌더링 완료");
}

function updateScoreboard() {
  document.getElementById("scoreA").textContent = player === "A" ? `나: ${score}칸` : `상대: ${opponentScore}칸`;
  document.getElementById("scoreB").textContent = player === "B" ? `나: ${score}칸` : `상대: ${opponentScore}칸`;
}

function handleNumberInput(number) {
  if (!selectedCell) return;
  const { row, col } = selectedCell;
  const correct = solution[row][col];
  const key = `${row}-${col}`;
  if (number === correct && !capturedCells[key]) {
    boardState[row][col] = number;
    capturedCells[key] = player;
    score++;
    update(ref(db, `rooms/${roomId}`), {
      boardState,
      captures: capturedCells,
      [`scores/${player}`]: score
    });
    renderBoard();
    console.log(`✅ 정답: ${number} at (${row},${col})`);
  } else {
    score = Math.max(0, score - 2);
    update(ref(db, `rooms/${roomId}/scores/${player}`), score);
    console.log(`❌ 오답: ${number} at (${row},${col})`);
  }
  selectedCell = null;
  updateScoreboard();
}

function initGame() {
  const gameContainer = document.getElementById("game-container");
  gameContainer.classList.remove("hidden");
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!puzzle.length && data?.puzzle && data?.solution) {
      puzzle = data.puzzle;
      solution = data.solution;
      boardState = data.boardState || JSON.parse(JSON.stringify(puzzle));
      console.log("📥 퍼즐 불러오기 완료");
      renderBoard();
    }
    if (data?.captures) {
      capturedCells = data.captures;
      renderBoard();
    }
    if (data?.scores) {
      score = data.scores[player] || 0;
      opponentScore = data.scores[player === "A" ? "B" : "A"] || 0;
      updateScoreboard();
    }
  });
}

// 🎮 대기방
const createBtn = document.getElementById("create-room-btn");
createBtn?.addEventListener("click", () => {
  const id = Math.floor(10000 + Math.random() * 90000);
  const { puzzle, solution } = generateSudoku();
  const roomRef = ref(db, `rooms/${id}`);
  set(roomRef, {
    playerA: true,
    inGame: false,
    puzzle,
    solution,
    boardState: puzzle,
    scores: { A: 0, B: 0 },
    captures: {}
  }).then(() => {
    sessionStorage.setItem("roomId", id);
    sessionStorage.setItem("player", "A");
    location.reload();
  });
});

const roomList = document.getElementById("room-list");
onValue(ref(db, "rooms"), (snap) => {
  const rooms = snap.val();
  roomList.innerHTML = "";
  Object.entries(rooms || {}).forEach(([id, room]) => {
    if (!room.inGame) {
      const btn = document.createElement("button");
      btn.textContent = `방 ${id} 입장`;
      btn.onclick = () => {
        const roomRef = ref(db, `rooms/${id}`);
        set(ref(db, `rooms/${id}/playerB`), true);
        set(ref(db, `rooms/${id}/inGame`), true);
        sessionStorage.setItem("roomId", id);
        sessionStorage.setItem("player", "B");
        location.reload();
      };
      roomList.appendChild(btn);
    }
  });
  console.log("📡 대기 중인 방 목록 갱신");
});

// 🎯 숫자 입력 핸들링
window.addEventListener("keydown", (e) => {
  const num = parseInt(e.key);
  if (!isNaN(num) && num >= 1 && num <= 9) {
    handleNumberInput(num);
  }
});

document.querySelectorAll(".num-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const num = parseInt(btn.textContent);
    handleNumberInput(num);
  });
});

// 🚀 게임 진입 시 초기화
if (roomId && player) {
  initGame();
}
