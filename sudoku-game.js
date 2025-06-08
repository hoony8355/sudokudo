// sudoku-game.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// Firebase Init
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

const log = (...args) => console.log('[SudokuGame]', ...args);

// Sudoku Generator
function generateSudoku() {
  // 간단한 9x9 퍼즐 생성 및 솔루션
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  // 디버깅용: 무조건 1~9 정답으로 채움 (실제 게임은 추후 개선)
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const val = ((i * 3 + Math.floor(i / 3) + j) % 9) + 1;
      board[i][j] = Math.random() < 0.5 ? 0 : val;
      solution[i][j] = val;
    }
  }
  return { puzzle: board, solution };
}

// Matchmaking
const createRoomBtn = document.getElementById("create-room-btn");
const roomList = document.getElementById("room-list");
const lobbyContainer = document.getElementById("lobby-container");
const gameContainer = document.getElementById("game-container");

function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function renderAvailableRooms(rooms) {
  if (!roomList) {
    log("roomList 요소가 없음");
    return;
  }
  roomList.innerHTML = "";
  Object.entries(rooms).forEach(([roomId, room]) => {
    if (!room.inGame) {
      const button = document.createElement("button");
      button.textContent = `방 ${roomId} 입장하기`;
      button.onclick = () => joinRoom(roomId);
      roomList.appendChild(button);
    }
  });
}

function createRoom() {
  const roomId = generateRoomId();
  const { puzzle, solution } = generateSudoku();
  const roomRef = ref(db, `rooms/${roomId}`);

  set(roomRef, {
    playerA: true,
    inGame: false,
    puzzle,
    solution,
    captures: {},
    scores: { A: 0, B: 0 }
  }).then(() => {
    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("player", "A");
    log(`✅ 방 ${roomId} 생성됨`);
    startGame(roomId, 'A');
  });
}

function joinRoom(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const roomData = snapshot.val();
    if (roomData && !roomData.playerB) {
      update(roomRef, { playerB: true, inGame: true });
      sessionStorage.setItem("roomId", roomId);
      sessionStorage.setItem("player", "B");
      log(`✅ 방 ${roomId} 입장 완료 (Player B)`);
      startGame(roomId, 'B');
    }
  }, { onlyOnce: true });
}

onValue(ref(db, "rooms"), (snapshot) => {
  const rooms = snapshot.val() || {};
  log("📡 현재 대기 중인 방:", rooms);
  renderAvailableRooms(rooms);
});

createRoomBtn?.addEventListener("click", () => {
  log("🆕 방 만들기 클릭됨");
  createRoom();
});

// Game Logic
let selectedCell = null;
let currentPuzzle = [];
let currentSolution = [];
let captured = {};
let score = 0;

function renderBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      const key = `${row}-${col}`;
      if (captured[key] === sessionStorage.getItem("player")) cell.classList.add("captured-by-me");
      else if (captured[key]) cell.classList.add("captured-by-other");

      const value = currentPuzzle[row][col];
      cell.textContent = value || "";
      if (value === 0) {
        cell.addEventListener("click", () => {
          selectedCell = { row, col };
          log("선택된 셀:", selectedCell);
        });
      }
      board.appendChild(cell);
    }
  }
}

function handleKeydown(e) {
  const num = parseInt(e.key);
  if (!selectedCell || isNaN(num)) return;
  const { row, col } = selectedCell;
  const key = `${row}-${col}`;
  const correct = currentSolution[row][col];
  const roomId = sessionStorage.getItem("roomId");
  const player = sessionStorage.getItem("player");

  if (num === correct && !captured[key]) {
    captured[key] = player;
    currentPuzzle[row][col] = num;
    score++;
    update(ref(db, `rooms/${roomId}`), {
      [`captures/${key}`]: player,
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

document.addEventListener("keydown", handleKeydown);

function startGame(roomId, player) {
  log(`🎮 게임 시작 (${player}) - 방: ${roomId}`);
  lobbyContainer.classList.add("hidden");
  gameContainer.classList.remove("hidden");

  const gameRef = ref(db, `rooms/${roomId}`);
  onValue(gameRef, (snapshot) => {
    const data = snapshot.val();
    if (data?.puzzle && data?.solution) {
      currentPuzzle = data.puzzle;
      currentSolution = data.solution;
    }
    if (data?.captures) captured = data.captures;
    renderBoard();
    document.getElementById("scoreA").textContent = `나: ${data?.scores?.[player] || 0}칸`;
    document.getElementById("scoreB").textContent = `상대: ${data?.scores?.[player === 'A' ? 'B' : 'A'] || 0}칸`;
  });
}
