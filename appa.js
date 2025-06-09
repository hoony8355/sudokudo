// ✅ 외부 개선용 JS - sudoku-enhancer.js
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const db = getDatabase();

let puzzle = null;
let claims = null;
let currentRoomId = null;

function log(...args) {
  console.log("[Enhancer]", ...args);
}

function calculateScore(claimsData) {
  let scoreA = 0;
  let scoreB = 0;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (claimsData[row][col] === "A") scoreA++;
      else if (claimsData[row][col] === "B") scoreB++;
    }
  }

  document.getElementById("scoreA").textContent = `나: ${scoreA}칸`;
  document.getElementById("scoreB").textContent = `상대: ${scoreB}칸`;
}

function generateNewPuzzlePreservingClaims(claimsData) {
  const newPuzzle = [];
  for (let row = 0; row < 9; row++) {
    const rowData = [];
    for (let col = 0; col < 9; col++) {
      // 기존 점령된 칸은 새 퍼즐에서도 채워진 숫자로 유지 (빈칸 금지)
      if (claimsData[row][col] !== "") {
        rowData.push(Math.floor(Math.random() * 9) + 1); // 1~9 난수
      } else {
        rowData.push(0); // 빈칸
      }
    }
    newPuzzle.push(rowData);
  }
  return newPuzzle;
}

function monitorBoardAndReplaceIfFilled(roomId) {
  const puzzleRef = ref(db, `rooms/${roomId}/puzzle`);
  const claimsRef = ref(db, `rooms/${roomId}/claims`);
  const answerRef = ref(db, `rooms/${roomId}/answer`);

  onValue(puzzleRef, snapshot => {
    puzzle = snapshot.val();
    checkIfBoardIsFullAndReplace();
  });

  onValue(claimsRef, snapshot => {
    claims = snapshot.val();
    calculateScore(claims);
    checkIfBoardIsFullAndReplace();
  });

  currentRoomId = roomId;

  function checkIfBoardIsFullAndReplace() {
    if (!puzzle || !claims) return;
    const isFull = puzzle.every((row, i) => row.every((cell, j) => cell !== 0 || claims[i][j] !== ""));
    if (isFull) {
      const newPuzzle = generateNewPuzzlePreservingClaims(claims);
      const newAnswer = JSON.parse(JSON.stringify(newPuzzle)); // 그대로 정답으로 처리 (예시)

      set(puzzleRef, newPuzzle);
      set(answerRef, newAnswer);

      log("🎉 퍼즐 다 채워짐, 새 퍼즐로 교체 완료");
    }
  }
}

// ✅ gamp/lovi 호출 후 실행
window.initSudokuEnhancer = function (roomId) {
  monitorBoardAndReplaceIfFilled(roomId);
  log("🚀 외부 게임 강화 로직 적용됨", roomId);
};
