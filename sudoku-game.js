// sudoku-game.js (통합 버전)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// ✅ Firebase 설정
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

console.log("[SudokuGame] Firebase initialized");

// ✅ 스도쿠 퍼즐 생성기
function generateSudokuPuzzle() {
  const base = [...Array(9)].map(() => [...Array(9)].map(() => 0));
  const isSafe = (board, row, col, num) => {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
      const boxRow = 3 * Math.floor(row / 3) + Math.floor(i / 3);
      const boxCol = 3 * Math.floor(col / 3) + i % 3;
      if (board[boxRow][boxCol] === num) return false;
    }
    return true;
  };
  const solve = (board) => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isSafe(board, row, col, num)) {
              board[row][col] = num;
              if (solve(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };
  solve(base);
  const puzzle = JSON.parse(JSON.stringify(base));
  let removed = 0;
  while (removed < 50) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      removed++;
    }
  }
  return { puzzle, solution: base };
}

// ✅ 방 만들기 & 대기방 렌더링
const createRoomBtn = document.getElementById("create-room-btn");
const roomList = document.getElementById("room-list");
const lobbyContainer = document.getElementById("lobby-container");
const gameContainer = document.getElementById("game-container");

function createRoom() {
  const roomId = Math.floor(10000 + Math.random() * 90000).toString();
  const { puzzle, solution } = generateSudokuPuzzle();
  set(ref(db, `rooms/${roomId}`), {
    playerA: true,
    inGame: false,
    puzzle,
    solution,
    captures: {},
    scores: { A: 0, B: 0 },
  }).then(() => {
    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("player", "A");
    location.hash = "#game";
    showGame();
  });
}

function joinRoom(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data && !data.playerB) {
      set(ref(db, `rooms/${roomId}/playerB`), true);
      set(ref(db, `rooms/${roomId}/inGame`), true);
      sessionStorage.setItem("roomId", roomId);
      sessionStorage.setItem("player", "B");
      location.hash = "#game";
      showGame();
    }
  }, { onlyOnce: true });
}

function renderRooms(rooms) {
  if (!roomList) return console.warn("[SudokuGame] ⚠️ roomList 없음");
  roomList.innerHTML = "";
  Object.entries(rooms).forEach(([roomId, room]) => {
    if (!room.inGame && roomId !== "null") {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.textContent = `방 ${roomId} 입장`;
      btn.onclick = () => joinRoom(roomId);
      li.appendChild(btn);
      roomList.appendChild(li);
    }
  });
}

if (createRoomBtn) createRoomBtn.addEventListener("click", createRoom);

onValue(ref(db, "rooms"), (snapshot) => {
  const data = snapshot.val();
  if (data) renderRooms(data);
});

function showGame() {
  if (lobbyContainer) lobbyContainer.classList.add("hidden");
  if (gameContainer) gameContainer.classList.remove("hidden");
  initGame();
}

// ✅ 게임 로직
function initGame() {
  const board = document.getElementById("board");
  const scoreA = document.getElementById("scoreA");
  const scoreB = document.getElementById("scoreB");

  const roomId = sessionStorage.getItem("roomId");
  const player = sessionStorage.getItem("player");

  if (!roomId || !player) return console.warn("[SudokuGame] 세션 없음");

  const roomRef = ref(db, `rooms/${roomId}`);

  let puzzle = [];
  let solution = [];
  let boardState = [];
  let selectedCell = null;
  let captures = {};

  onValue(roomRef, (snap) => {
    const data = snap.val();
    if (!data?.puzzle) return;
    puzzle = data.puzzle;
    solution = data.solution;
    boardState = JSON.parse(JSON.stringify(puzzle));
    captures = data.captures || {};
    const scores = data.scores || {};

    if (scoreA) scoreA.textContent = `나: ${scores[player] || 0}칸`;
    if (scoreB) scoreB.textContent = `상대: ${scores[player === "A" ? "B" : "A"] || 0}칸`;

    board.innerHTML = "";
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.row = r;
        cell.dataset.col = c;
        const key = `${r}-${c}`;
        cell.textContent = boardState[r][c] !== 0 ? boardState[r][c] : "";
        if (captures[key] === player) cell.classList.add("captured-by-me");
        else if (captures[key]) cell.classList.add("captured-by-other");
        cell.addEventListener("click", () => {
          if (puzzle[r][c] === 0 && !captures[key]) {
            selectedCell = { row: r, col: c };
          }
        });
        board.appendChild(cell);
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!selectedCell) return;
    const num = parseInt(e.key);
    if (!num || num < 1 || num > 9) return;

    const { row, col } = selectedCell;
    const key = `${row}-${col}`;
    const correct = solution[row][col];

    if (num === correct) {
      boardState[row][col] = num;
      captures[key] = player;
      update(roomRef, {
        [`captures`]: captures,
        [`scores/${player}`]: (captures ? Object.values(captures).filter(v => v === player).length : 0),
      });
    } else {
      // ❌ 오답 처리
    }
    selectedCell = null;
  });

  document.querySelectorAll(".num-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const num = parseInt(btn.textContent);
      if (!selectedCell) return;
      const { row, col } = selectedCell;
      const key = `${row}-${col}`;
      const correct = solution[row][col];

      if (num === correct) {
        boardState[row][col] = num;
        captures[key] = player;
        update(roomRef, {
          [`captures`]: captures,
          [`scores/${player}`]: Object.values(captures).filter(v => v === player).length,
        });
      }
      selectedCell = null;
    });
  });
}

console.log("[SudokuGame] ✅ 통합 스크립트 로딩 완료");
