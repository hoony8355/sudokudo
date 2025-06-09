// appa.js - 스도쿠 게임 로직 확장
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { generateSudoku } from "./sudokuGenerator.js";

const db = getDatabase();

function log(...args) {
  console.log("[Appa]", ...args);
}

function isBoardFull(puzzle) {
  return puzzle.every(row => row.every(cell => cell !== 0));
}

function countClaims(claims) {
  let a = 0, b = 0;
  for (let row of claims) {
    for (let cell of row) {
      if (cell === "A") a++;
      else if (cell === "B") b++;
    }
  }
  return { a, b };
}

function generateNextPuzzleWithPreservedClaims(claims) {
  let { puzzle, answer } = generateSudoku();

  // 보호해야 할 좌표 추출 (claim이 존재하는 칸은 빈칸이 되면 안 됨)
  const protectedCells = [];
  claims.forEach((row, rIdx) => {
    row.forEach((claim, cIdx) => {
      if (claim === "A" || claim === "B") {
        protectedCells.push([rIdx, cIdx]);
      }
    });
  });

  // 무작위로 50칸을 지우되, 보호 대상은 지우지 않음
  const removable = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const isProtected = protectedCells.some(([pr, pc]) => pr === r && pc === c);
      if (!isProtected) removable.push([r, c]);
    }
  }

  // 셔플 후 50개 제거
  for (let i = 0; i < 50 && i < removable.length; i++) {
    const [r, c] = removable[i];
    puzzle[r][c] = 0;
  }

  return { puzzle, answer };
}

export function initSudokuEnhancer(roomId) {
  const puzzleRef = ref(db, `rooms/${roomId}/puzzle`);
  const claimsRef = ref(db, `rooms/${roomId}/claims`);
  const answerRef = ref(db, `rooms/${roomId}/answer`);

  onValue(puzzleRef, snapshot => {
    const puzzle = snapshot.val();
    if (!puzzle) return;

    if (isBoardFull(puzzle)) {
      log("🟦 퍼즐 완료됨. 다음 퍼즐로 진행");

      onValue(claimsRef, claimsSnap => {
        const claims = claimsSnap.val();
        const { puzzle: newPuzzle, answer: newAnswer } = generateNextPuzzleWithPreservedClaims(claims);

        set(puzzleRef, newPuzzle);
        set(answerRef, newAnswer);
        // claims는 그대로 유지 (색 유지)

        const scores = countClaims(claims);
        document.getElementById("scoreA").textContent = `나: ${scores.a}칸`;
        document.getElementById("scoreB").textContent = `상대: ${scores.b}칸`;

        log("🔁 새 퍼즐 적용됨");
      }, { onlyOnce: true });
    }
  });
}

window.initSudokuEnhancer = initSudokuEnhancer;
