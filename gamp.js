// gamp.js
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { handlePlayerJoin } from "./join-handler.js"; // 맨 위에 추가

const db = getDatabase();

let puzzle = null;
let answer = null;
let claims = null;
let currentPlayer = null;
let currentRoomId = null;
let selectedCell = null;
let countdownStarted = false; // ✅ 중복 방지용 플래그

function log(...args) {
  console.log("[Game]", ...args);
}

function renderBoard(puzzleData, claimData) {
  if (!puzzleData || !claimData) return;

  const boardDiv = document.getElementById("board");
  if (!boardDiv) return;

  boardDiv.innerHTML = "";

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (row % 3 === 0) cell.classList.add("border-top-bold");
      if (col % 3 === 0) cell.classList.add("border-left-bold");

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
}

function handleNumberInput(value) {
  if (!selectedCell) return;

  const { row, col } = selectedCell;
  if (puzzle[row][col] !== 0 || claims[row][col] !== "") return;

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
    cellEl.classList.add(currentPlayer === "A" ? "claimedA" : "claimedB");
  }

  selectedCell = null;
  log("✅ 입력 성공", { row, col, value, player: currentPlayer });
}

function setupInputListeners() {
  document.querySelectorAll(".num-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const value = parseInt(btn.textContent);
      if (!isNaN(value)) handleNumberInput(value);
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key >= "1" && e.key <= "9") handleNumberInput(parseInt(e.key));
  });
}

export function startGame(roomId, player) {
  log("📁 gamp.js 로딩됨");
  currentRoomId = roomId;
  currentPlayer = player;

    // ✅ 자동 참가 처리 및 상대 이탈 감시 시작
  handlePlayerJoin(roomId);  // << 이 줄 추가

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

      if (!countdownStarted && countdownEl && countdownEl.textContent === "3") {
        countdownStarted = true;
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
