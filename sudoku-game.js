// sudoku-game.js (통합 버전)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// Firebase 설정
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

// 스도쿠 생성기
function generateSudoku() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  function fillBoard(b) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (b[row][col] === 0) {
          const numbers = shuffle([...Array(9).keys()].map(n => n + 1));
          for (let num of numbers) {
            if (isSafe(b, row, col, num)) {
              b[row][col] = num;
              if (fillBoard(b)) return true;
              b[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  function isSafe(b, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (b[row][i] === num || b[i][col] === num ||
          b[3*Math.floor(row/3)+Math.floor(i/3)][3*Math.floor(col/3)+i%3] === num) {
        return false;
      }
    }
    return true;
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  fillBoard(board);
  const puzzle = board.map(row => row.slice());
  let blanks = 50;
  while (blanks > 0) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      blanks--;
    }
  }
  return { puzzle, solution: board };
}

// 매치메이킹
const createRoomBtn = document.getElementById("create-room-btn");
const roomListContainer = document.getElementById("room-list");

function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function renderAvailableRooms(rooms) {
  if (!roomListContainer) return;
  roomListContainer.innerHTML = '';
  Object.entries(rooms).forEach(([roomId, room]) => {
    if (!room.inGame) {
      const button = document.createElement('button');
      button.textContent = `방 ${roomId} 입장하기`;
      button.onclick = () => joinRoom(roomId);
      roomListContainer.appendChild(button);
    }
  });
}

function joinRoom(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snap) => {
    const data = snap.val();
    if (data && !data.playerB) {
      set(ref(db, `rooms/${roomId}/playerB`), true);
      set(ref(db, `rooms/${roomId}/inGame`), true);
      sessionStorage.setItem("roomId", roomId);
      sessionStorage.setItem("player", "B");
      location.hash = '#game';
    }
  }, { onlyOnce: true });
}

createRoomBtn?.addEventListener("click", () => {
  const roomId = generateRoomId();
  const roomRef = ref(db, `rooms/${roomId}`);
  set(roomRef, {
    playerA: true,
    inGame: false
  }).then(() => {
    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("player", "A");
    location.hash = '#game';
  });
});

onValue(ref(db, 'rooms'), (snap) => {
  const rooms = snap.val();
  if (rooms) renderAvailableRooms(rooms);
});

// 게임 로직
const roomId = sessionStorage.getItem("roomId");
const player = sessionStorage.getItem("player");
const boardContainer = document.getElementById("board");
const scoreA = document.getElementById("scoreA");
const scoreB = document.getElementById("scoreB");
let boardState = [];
let puzzle = [];
let solution = [];
let capturedCells = {};
let selectedCell = null;
let score = 0;
let opponentScore = 0;

function renderBoard() {
  boardContainer.innerHTML = '';
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      const val = boardState[row][col];
      cell.textContent = val !== 0 ? val : '';

      const key = `${row}-${col}`;
      if (capturedCells[key] === player) {
        cell.classList.add("captured-by-me");
      } else if (capturedCells[key]) {
        cell.classList.add("captured-by-other");
      }

      if (puzzle[row][col] === 0 && !capturedCells[key]) {
        cell.addEventListener("click", () => {
          selectedCell = { row, col };
          document.querySelectorAll(".cell").forEach(c => c.classList.remove("selected"));
          cell.classList.add("selected");
          console.log(`📌 셀 선택됨: (${row}, ${col})`);
        });
      }
      boardContainer.appendChild(cell);
    }
  }
}

function updateUI() {
  scoreA.textContent = `나: ${score}칸`;
  scoreB.textContent = `상대: ${opponentScore}칸`;
}

function setupBoard(p, s) {
  puzzle = p;
  solution = s;
  boardState = JSON.parse(JSON.stringify(p));
  capturedCells = {};
  renderBoard();
  updateUI();
}

function initGame() {
  const gameRef = ref(db, `rooms/${roomId}`);
  onValue(gameRef, (snap) => {
    const data = snap.val();
    if (data?.puzzle && data?.solution && puzzle.length === 0) {
      setupBoard(data.puzzle, data.solution);
    }
    if (data?.captures) {
      capturedCells = data.captures;
      renderBoard();
    }
    if (data?.scores) {
      score = data.scores[player] || 0;
      opponentScore = data.scores[player === 'A' ? 'B' : 'A'] || 0;
      updateUI();
    }
  });
}

initGame();

document.addEventListener("keydown", (e) => {
  if (!selectedCell || isNaN(parseInt(e.key))) return;
  const { row, col } = selectedCell;
  const input = parseInt(e.key);
  const correct = solution[row][col];
  const key = `${row}-${col}`;

  if (input === correct) {
    boardState[row][col] = input;
    capturedCells[key] = player;
    score++;
    update(ref(db, `rooms/${roomId}`), {
      boardState,
      captures: capturedCells,
      [`scores/${player}`]: score
    });
    renderBoard();
  } else {
    score = Math.max(0, score - 2);
    update(ref(db, `rooms/${roomId}`), {
      [`scores/${player}`]: score
    });
  }
  selectedCell = null;
});
