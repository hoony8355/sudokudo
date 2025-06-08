// gamp.js
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const db = getDatabase();

let puzzle = null;
let answer = null;
let claims = null;
let currentPlayer = null;
let currentRoomId = null;
let selectedCell = null;

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

      if (claim === "A") cell.classList.add("claimedA");
      else if (claim === "B") cell.classList.add("claimedB");

      cell.onclick = () => {
        document.querySelectorAll(".cell").forEach(c => c.classList.remove("selected-cell"));
        if (puzzle[row][col] === 0 && claimData[row][col] === "") {
          selectedCell = { row, col };
          cell.classList.add("selected-cell");
        } else {
          selectedCell = null;
        }
      };

      boardDiv.appendChild(cell);
    }
  }

  log("📦 보드 렌더링 완료");
}

function handleNumberInput(value) {
  if (!selectedCell) {
    log("⚠️ 셀 선택 없음");
    return;
  }

  const { row, col } = selectedCell;
  if (puzzle[row][col] !== 0 || claims[row][col] !== "") {
    log("🚫 채울 수 없는 칸", row, col);
    return;
  }

  if (answer && answer[row][col] !== value) {
    log("❌ 정답 아님", { row, col, value, expected: answer[row][col] });
    return;
  }

  puzzle[row][col] = value;
  claims[row][col] = currentPlayer;

  const puzzleRef = ref(db, `rooms/${currentRoomId}/puzzle`);
  const claimsRef = ref(db, `rooms/${currentRoomId}/claims`);

  set(puzzleRef, puzzle);
  set(claimsRef, claims);

  const cellEl = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (cellEl) {
    cellEl.textContent = value;
    cellEl.classList.remove("selected-cell");
    if (currentPlayer === "A") cellEl.classList.add("claimedA");
    if (currentPlayer === "B") cellEl.classList.add("claimedB");
  }

  log("✅ 입력 성공", { row, col, value, player: currentPlayer });
  selectedCell = null;
}

function setupInputListeners() {
  document.querySelectorAll(".num-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const value = parseInt(btn.textContent);
      if (!isNaN(value)) handleNumberInput(value);
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key >= "1" && e.key <= "9") {
      handleNumberInput(parseInt(e.key));
    }
  });
}

export function startGame(roomId, player) {
  log("📁 gamp.js 로딩됨");
  currentRoomId = roomId;
  currentPlayer = player;

  const puzzleRef = ref(db, `rooms/${roomId}/puzzle`);
  const claimsRef = ref(db, `rooms/${roomId}/claims`);
  const answerRef = ref(db, `rooms/${roomId}/answer`);

  const waitingMessage = document.getElementById("waiting-message");
  const countdownEl = document.getElementById("countdown");

  if (waitingMessage) waitingMessage.classList.remove("hidden");

  onValue(answerRef, snapshot => {
    answer = snapshot.val();
    log("📥 정답 로드 완료", answer);
  });

  onValue(claimsRef, snapshot => {
    claims = snapshot.val();
    log("📥 점령 현황 동기화 완료", claims);

    if (claims && puzzle) {
      if (waitingMessage) waitingMessage.classList.add("hidden");

      if (countdownEl && !countdownEl.dataset.started) {
        countdownEl.dataset.started = "true";
        countdownEl.classList.remove("hidden");

        let count = 3;
        countdownEl.textContent = count;
        const interval = setInterval(() => {
          count--;
          if (count === 0) {
            countdownEl.classList.add("hidden");
            clearInterval(interval);
          } else {
            countdownEl.textContent = count;
          }
        }, 1000);
      }

      renderBoard(puzzle, claims);
    }
  });

  onValue(puzzleRef, snapshot => {
    puzzle = snapshot.val();
    log("📥 퍼즐 불러오기 완료", puzzle);
    if (claims && puzzle) renderBoard(puzzle, claims);
  });

  setupInputListeners();
  log("🚀 게임 본격 시작!");
}
