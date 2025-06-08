// gamp.js - 게임 로직 전용 모듈

console.log("[Game] 📁 gamp.js 로딩됨");

import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { database } from "./firebase-init.js";

let currentRoomId = null;
let playerRole = null;
let puzzle = [];
let claims = [];
let selectedCell = null;

// ✅ 보드 렌더링 함수
function renderBoard(puzzleData, claimData) {
  const board = document.getElementById("board");
  const container = document.getElementById("game-container");

  if (!board || !container) {
    console.error("[Game] ❌ 보드 또는 게임 컨테이너가 없음");
    return;
  }

  container.classList.remove("hidden");
  board.classList.remove("hidden");
  board.innerHTML = "";

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;

      const value = puzzleData[row][col];
      if (value !== 0) {
        cell.textContent = value;
        cell.classList.add("prefilled");
      }

      const claimed = claimData[row][col];
      if (claimed === "A") cell.classList.add("claimedA");
      if (claimed === "B") cell.classList.add("claimedB");

      board.appendChild(cell);
    }
  }

  console.log("[Game] 📦 보드 렌더링 완료");
}

// ✅ 셀 선택 핸들러
function handleCellClick(e) {
  const cell = e.target;
  if (!cell.classList.contains("cell") || cell.classList.contains("prefilled")) return;

  document.querySelectorAll(".cell").forEach(c => c.classList.remove("selected-cell"));
  cell.classList.add("selected-cell");

  selectedCell = {
    row: parseInt(cell.dataset.row),
    col: parseInt(cell.dataset.col),
  };

  console.log("[Game] 🔲 셀 선택:", selectedCell);
}

// ✅ 숫자 입력 처리
function handleNumberInput(num) {
  if (!selectedCell || !currentRoomId || !playerRole) return;

  const { row, col } = selectedCell;
  if (puzzle[row][col] !== 0) return;

  const correctValue = puzzle[row][col];
  if (parseInt(num) === correctValue) {
    const updateRef = ref(database, `rooms/${currentRoomId}/claims/${row}/${col}`);
    update(updateRef, playerRole)
      .then(() => {
        console.log(`[Game] ✅ 정답: ${num} at (${row},${col})`);
        selectedCell = null;
      })
      .catch(err => console.error("[Game] ❌ Firebase 업데이트 실패:", err));
  } else {
    console.log(`[Game] ❌ 오답: ${num} at (${row},${col})`);
  }
}

// ✅ 키보드 입력 처리
function setupKeyboardInput() {
  document.addEventListener("keydown", e => {
    if (e.key >= "1" && e.key <= "9") handleNumberInput(e.key);
  });
}

// ✅ 숫자 버튼 클릭 처리
function setupNumberButtons() {
  document.querySelectorAll(".num-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      handleNumberInput(btn.textContent);
    });
  });
}

// ✅ 게임 초기화
function startGame(roomId, role) {
  currentRoomId = roomId;
  playerRole = role;

  const puzzleRef = ref(database, `rooms/${roomId}/puzzle`);
  const claimsRef = ref(database, `rooms/${roomId}/claims`);

  onValue(puzzleRef, snapshot => {
    puzzle = snapshot.val();
    console.log("[Game] 📥 퍼즐 불러오기 완료");
    renderBoard(puzzle, claims);
  });

  onValue(claimsRef, snapshot => {
    claims = snapshot.val();
    console.log("[Game] 📥 점령 현황 동기화 완료");
    renderBoard(puzzle, claims);
  });

  document.getElementById("board")?.addEventListener("click", handleCellClick);
  setupKeyboardInput();
  setupNumberButtons();

  console.log("[Game] 🚀 게임 본격 시작!");
}

// ✅ 외부에서 호출하도록 export
export { startGame };
