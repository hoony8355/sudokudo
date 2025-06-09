// appa.js – 스코어 계산 및 새 스도쿠 생성 시 색칠된 칸 보호 개선
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const db = getDatabase();

window.initSudokuEnhancer = function (roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);

  onValue(roomRef, (snapshot) => {
    const room = snapshot.val();
    if (!room) return;

    const { puzzle, claims, answer } = room;

    if (puzzle && claims) {
      updateScore(claims);

      const isBoardFilled = puzzle.flat().every((val, i) => val !== 0 || claims[Math.floor(i / 9)][i % 9] !== "");

      if (isBoardFilled) {
        console.log("✅ 보드 채워짐. 새 퍼즐 생성 시작");
        regeneratePuzzleWithPreservedClaims(roomId, claims, answer);
      }
    }
  });
};

function updateScore(claims) {
  let aCount = 0;
  let bCount = 0;

  claims.forEach((row) => {
    row.forEach((cell) => {
      if (cell === "A") aCount++;
      else if (cell === "B") bCount++;
    });
  });

  const scoreA = document.getElementById("scoreA");
  const scoreB = document.getElementById("scoreB");
  if (scoreA) scoreA.textContent = `나: ${aCount}칸`;
  if (scoreB) scoreB.textContent = `상대: ${bCount}칸`;
}

function regeneratePuzzleWithPreservedClaims(roomId, claims, answer) {
  const newPuzzle = JSON.parse(JSON.stringify(answer));
  const protectedCoords = [];
  const removableCoords = [];

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (claims[row][col] !== "") {
        protectedCoords.push({ row, col });
      } else {
        removableCoords.push({ row, col });
      }
    }
  }

  const shuffle = (array) => array.sort(() => Math.random() - 0.5);
  const blanksToRemove = Math.min(30, removableCoords.length);
  const shuffled = shuffle(removableCoords).slice(0, blanksToRemove);

  shuffled.forEach(({ row, col }) => {
    newPuzzle[row][col] = 0;
  });

  const updates = {
    puzzle: newPuzzle,
    answer: answer,
  };

  update(ref(db, `rooms/${roomId}`), updates)
    .then(() => console.log("🆕 새 퍼즐 저장 완료"))
    .catch((err) => console.error("퍼즐 저장 실패", err));
}
