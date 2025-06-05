// game.js

import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { generateSudoku } from "./sudoku-generator.js";

const db = getDatabase();
const roomId = sessionStorage.getItem("roomId");
const playerId = sessionStorage.getItem("playerId");

console.log("🧩 game.js 로드됨", { roomId, playerId });

const boardEl = document.getElementById("game-board");
const numberInput = document.getElementById("number-input");
const statusEl = document.getElementById("game-status");

let puzzle = [];
let answer = [];
let selectedCell = null;

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
        cell.addEventListener("click", () => selectCell(r, c));
      }

      boardEl.appendChild(cell);
    }
  }
  console.log("📦 보드 렌더링 완료");
}

function selectCell(row, col) {
  if (selectedCell) selectedCell.classList.remove("selected-cell");
  selectedCell = document.getElementById(`cell-${row}-${col}`);
  selectedCell.classList.add("selected-cell");
  selectedCell.dataset.row = row;
  selectedCell.dataset.col = col;
  console.log("🖱️ 셀 선택:", row, col);
}

document.querySelectorAll(".num-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!selectedCell) return;
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    const value = parseInt(btn.textContent);

    if (answer[row][col] === value) {
      set(ref(db, `rooms/${roomId}/board/${row}-${col}`), {
        uid: playerId,
        value
      });
      console.log("✅ 정답 입력:", row, col, value);
    } else {
      alert("❌ 틀렸습니다. 다시 시도하세요.");
    }

    selectedCell.classList.remove("selected-cell");
    selectedCell = null;
  });
});

onValue(ref(db, `rooms/${roomId}/board`), (snapshot) => {
  const data = snapshot.val() || {};
  Object.entries(data).forEach(([key, val]) => {
    const [r, c] = key.split("-").map(Number);
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (cell && !cell.classList.contains("prefilled")) {
      cell.textContent = val.value;
      cell.classList.add(val.uid === playerId ? "claimedA" : "claimedB");
    }
  });
  console.log("📡 점령 현황 갱신됨", data);
});

function startGame() {
  if (playerId === "A") {
    const { puzzle: p, solution: a } = generateSudoku();
    puzzle = p;
    answer = a;
    set(ref(db, `rooms/${roomId}/puzzle`), { puzzle });
    console.log("🧠 퍼즐 생성 및 업로드 완료");
    renderBoard();
  } else {
    onValue(ref(db, `rooms/${roomId}/puzzle`), snapshot => {
      const val = snapshot.val();
      if (val && val.puzzle) {
        puzzle = val.puzzle;
        // 자동 생성기와 연동 시 정답도 함께 저장하면 answer도 가져와야 함
        answer = generateSudoku().solution; // 임시 대입
        console.log("✅ Player B: 퍼즐 불러오기 완료");
        renderBoard();
      }
    });
  }
}

startGame();
console.log("🎮 게임 시작");
