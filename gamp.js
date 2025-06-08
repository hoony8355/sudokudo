// gamp.js
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const db = getDatabase();

let puzzle = null;
let claims = null;
let currentPlayer = null;
let currentRoomId = null;

function log(...args) {
  console.log("[Game]", ...args);
}

function renderBoard(puzzleData, claimData) {
  if (!puzzleData || !claimData) {
    console.warn("[Game] ⛔ 퍼즐 또는 점령 데이터가 null이라 렌더링 생략", { puzzleData, claimData });
    return;
  }

  const boardDiv = document.getElementById("board");
  if (!boardDiv) {
    console.error("[Game] ❌ #board 요소가 존재하지 않음. HTML 구조 확인 필요");
    return;
  }

  boardDiv.innerHTML = "";

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;

      const value = puzzleData[row][col];
      const claim = claimData[row][col];

      if (value !== 0) {
        cell.textContent = value;
        cell.classList.add("fixed");
      }

      if (claim === "A") cell.classList.add("claimed-a");
      else if (claim === "B") cell.classList.add("claimed-b");

      cell.onclick = () => handleCellClick(row, col);
      boardDiv.appendChild(cell);
    }
  }

  log("📦 보드 렌더링 완료");
}

function handleCellClick(row, col) {
  const selected = document.querySelector(".selected-number");
  if (!selected) {
    log("⚠️ 선택된 숫자가 없음");
    return;
  }
  if (puzzle[row][col] !== 0) {
    log("🚫 이미 채워진 칸 클릭됨", row, col);
    return;
  }
  if (claims[row][col] !== "") {
    log("🚫 이미 점령된 칸 클릭됨", row, col);
    return;
  }

  const value = parseInt(selected.textContent);
  if (isNaN(value)) {
    log("❓ 숫자 선택값 파싱 실패", selected.textContent);
    return;
  }

  if (isValidMove(row, col, value)) {
    puzzle[row][col] = value;
    claims[row][col] = currentPlayer;

    const puzzleRef = ref(db, `rooms/${currentRoomId}/puzzle`);
    const claimsRef = ref(db, `rooms/${currentRoomId}/claims`);

    set(puzzleRef, puzzle);
    set(claimsRef, claims);
    log("✅ 값 입력 및 동기화", { row, col, value, player: currentPlayer });
  } else {
    log("❌ 잘못된 입력값 (규칙 위반)", { row, col, value });
  }
}

function isValidMove(row, col, value) {
  for (let i = 0; i < 9; i++) {
    if (puzzle[row][i] === value || puzzle[i][col] === value) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (puzzle[boxRow + i][boxCol + j] === value) return false;
    }
  }
  return true;
}

function setupInputListeners() {
  document.querySelectorAll(".num-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".num-btn").forEach(b => b.classList.remove("selected-number"));
      btn.classList.add("selected-number");
      log("🔢 숫자 선택", btn.textContent);
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key >= "1" && e.key <= "9") {
      document.querySelectorAll(".num-btn").forEach(b => b.classList.remove("selected-number"));
      const btn = [...document.querySelectorAll(".num-btn")].find(b => b.textContent === e.key);
      if (btn) {
        btn.classList.add("selected-number");
        log("⌨️ 키보드 숫자 선택", e.key);
      }
    }
  });
}

export function startGame(roomId, player) {
  log("📁 gamp.js 로딩됨");
  currentRoomId = roomId;
  currentPlayer = player;

  const puzzleRef = ref(db, `rooms/${roomId}/puzzle`);
  const claimsRef = ref(db, `rooms/${roomId}/claims`);

  onValue(puzzleRef, snapshot => {
    puzzle = snapshot.val();
    log("📥 퍼즐 불러오기 완료", puzzle);
    if (puzzle && claims) renderBoard(puzzle, claims);
  });

  onValue(claimsRef, snapshot => {
    claims = snapshot.val();
    log("📥 점령 현황 동기화 완료", claims);
    if (puzzle && claims) renderBoard(puzzle, claims);
  });

  setupInputListeners();
  log("🚀 게임 본격 시작!");
}
