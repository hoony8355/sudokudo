// appa.js
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const db = getDatabase();

let currentRoomId = null;

function log(...args) {
  console.log("[APPA]", ...args);
}

function countClaims(claims) {
  let countA = 0,
    countB = 0;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (claims[row][col] === "A") countA++;
      if (claims[row][col] === "B") countB++;
    }
  }
  return { countA, countB };
}

function updateScoreboard(claims) {
  const { countA, countB } = countClaims(claims);
  const scoreAEl = document.getElementById("scoreA");
  const scoreBEl = document.getElementById("scoreB");
  if (scoreAEl) scoreAEl.textContent = `나: ${countA}칸`;
  if (scoreBEl) scoreBEl.textContent = `상대: ${countB}칸`;
}

function isBoardFull(puzzle) {
  return puzzle.flat().every((v) => v !== 0);
}

function regeneratePuzzle(puzzle, claims, answer) {
  const newPuzzle = [];
  for (let row = 0; row < 9; row++) {
    const newRow = [];
    for (let col = 0; col < 9; col++) {
      if (claims[row][col] === "A" || claims[row][col] === "B") {
        newRow.push(answer[row][col]);
      } else {
        newRow.push(0);
      }
    }
    newPuzzle.push(newRow);
  }
  return newPuzzle;
}

export function initSudokuEnhancer(roomId) {
  currentRoomId = roomId;

  const puzzleRef = ref(db, `rooms/${roomId}/puzzle`);
  const claimsRef = ref(db, `rooms/${roomId}/claims`);
  const answerRef = ref(db, `rooms/${roomId}/answer`);

  let currentPuzzle = null;
  let currentClaims = null;
  let currentAnswer = null;

  onValue(puzzleRef, (snapshot) => {
    currentPuzzle = snapshot.val();
    checkAndRegenerate();
  });

  onValue(claimsRef, (snapshot) => {
    currentClaims = snapshot.val();
    updateScoreboard(currentClaims);
    checkAndRegenerate();
  });

  onValue(answerRef, (snapshot) => {
    currentAnswer = snapshot.val();
  });

  function checkAndRegenerate() {
    if (!currentPuzzle || !currentClaims || !currentAnswer) return;
    if (isBoardFull(currentPuzzle)) {
      log("📦 보드 가득 참 → 새로운 퍼즐 재생성");
      const newPuzzle = regeneratePuzzle(currentPuzzle, currentClaims, currentAnswer);
      set(puzzleRef, newPuzzle);
    }
  }
}

// 전역 접근 허용
window.initSudokuEnhancer = initSudokuEnhancer;
