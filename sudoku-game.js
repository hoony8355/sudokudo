// sudoku-game.js (통합본)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// ✅ Firebase 초기화
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

// ✅ 퍼즐 생성기
function generateSudoku() {
  const base = [...Array(9)].map(() => Array(9).fill(0));
  function fillGrid(grid) {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    function isSafe(row, col, num) {
      for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num || grid[i][col] === num ||
            grid[3 * Math.floor(row / 3) + Math.floor(i / 3)]
                 [3 * Math.floor(col / 3) + i % 3] === num) return false;
      }
      return true;
    }
    function solve(pos = 0) {
      if (pos === 81) return true;
      const row = Math.floor(pos / 9), col = pos % 9;
      if (grid[row][col] !== 0) return solve(pos + 1);
      for (let num of nums) {
        if (isSafe(row, col, num)) {
          grid[row][col] = num;
          if (solve(pos + 1)) return true;
          grid[row][col] = 0;
        }
      }
      return false;
    }
    solve();
    return grid;
  }

  const solution = fillGrid(base.map(row => row.slice()));
  const puzzle = solution.map(row => row.map(val => (Math.random() < 0.5 ? val : 0)));
  return { puzzle, solution };
}

// ✅ 매치메이킹
function setupMatchmaking() {
  const createRoomBtn = document.getElementById("create-room-btn");
  const roomList = document.getElementById("room-list");

  function renderRooms(rooms) {
    roomList.innerHTML = "";
    Object.entries(rooms || {}).forEach(([roomId, room]) => {
      if (!room || room.inGame || roomId === "null") return;
      const btn = document.createElement("button");
      btn.textContent = `방 ${roomId} 입장`;
      btn.onclick = () => joinRoom(roomId);
      roomList.appendChild(btn);
    });
  }

  function createRoom() {
    const roomId = Math.floor(10000 + Math.random() * 90000).toString();
    set(ref(db, `rooms/${roomId}`), { playerA: true, inGame: false });
    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("player", "A");
    location.hash = "#game";
  }

  function joinRoom(roomId) {
    const roomRef = ref(db, `rooms/${roomId}`);
    onValue(roomRef, snapshot => {
      const data = snapshot.val();
      if (data && !data.playerB) {
        update(roomRef, { playerB: true, inGame: true });
        sessionStorage.setItem("roomId", roomId);
        sessionStorage.setItem("player", "B");
        location.hash = "#game";
      }
    }, { onlyOnce: true });
  }

  createRoomBtn?.addEventListener("click", createRoom);
  onValue(ref(db, "rooms"), snapshot => {
    console.log("[Matchmaking] 현재 방 목록:", snapshot.val());
    renderRooms(snapshot.val());
  });
}

// ✅ 게임 로직
function setupGame() {
  const roomId = sessionStorage.getItem("roomId");
  const player = sessionStorage.getItem("player");
  const boardContainer = document.getElementById("board");
  const scoreA = document.getElementById("scoreA");
  const scoreB = document.getElementById("scoreB");

  let puzzle = [], solution = [], boardState = [], score = 0, opponentScore = 0;
  let selected = null, captures = {};

  function renderBoard() {
    boardContainer.innerHTML = "";
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = r;
        cell.dataset.col = c;
        const val = boardState[r][c];
        if (val) cell.textContent = val;
        const key = `${r}-${c}`;
        if (captures[key] === player) cell.classList.add("captured-by-me");
        else if (captures[key]) cell.classList.add("captured-by-other");
        cell.onclick = () => {
          if (puzzle[r][c] === 0 && !captures[key]) selected = { r, c };
        };
        boardContainer.appendChild(cell);
      }
    }
  }

  onValue(ref(db, `rooms/${roomId}`), snapshot => {
    const data = snapshot.val();
    if (data?.puzzle && puzzle.length === 0) {
      puzzle = data.puzzle;
      solution = data.solution;
      boardState = JSON.parse(JSON.stringify(puzzle));
      captures = data.captures || {};
      renderBoard();
      console.log("[Game] 퍼즐 세팅 완료");
    }
    if (data?.captures) {
      captures = data.captures;
      renderBoard();
    }
    if (data?.scores) {
      score = data.scores[player] || 0;
      opponentScore = data.scores[player === "A" ? "B" : "A"] || 0;
      scoreA.textContent = `나: ${score}칸`;
      scoreB.textContent = `상대: ${opponentScore}칸`;
    }
  });

  if (player === "A") {
    const { puzzle: newPuzzle, solution: newSolution } = generateSudoku();
    update(ref(db, `rooms/${roomId}`), {
      puzzle: newPuzzle,
      solution: newSolution,
      scores: { A: 0, B: 0 },
      captures: {}
    });
  }

  document.addEventListener("keydown", e => {
    if (!selected || isNaN(+e.key)) return;
    const { r, c } = selected;
    const key = `${r}-${c}`;
    if (+e.key === solution[r][c]) {
      boardState[r][c] = +e.key;
      captures[key] = player;
      score++;
      update(ref(db, `rooms/${roomId}`), {
        boardState,
        captures,
        [`scores/${player}`]: score
      });
    } else {
      score = Math.max(0, score - 2);
      update(ref(db, `rooms/${roomId}`), { [`scores/${player}`]: score });
    }
    selected = null;
  });
}

// ✅ 초기화
window.addEventListener("DOMContentLoaded", () => {
  if (location.hash === "#game") setupGame();
  else setupMatchmaking();
});
