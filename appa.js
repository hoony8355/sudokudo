// appa.js – 스코어 계산 및 보드 재생성 개선
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const db = getDatabase();

window.initSudokuEnhancer = function (roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);

  onValue(roomRef, (snapshot) => {
    const room = snapshot.val();
    if (!room) return;

    const { puzzle, claims, answer } = room;
    if (!puzzle || !claims || !answer) return;

    updateScore(claims);
    checkForGameEndAndDeclareWinner(claims);

    const isBoardFilled = puzzle.flat().every((val, i) => val !== 0 || claims[Math.floor(i / 9)][i % 9] !== "");
    if (isBoardFilled) {
      console.log("✅ 보드 채워짐. 새 퍼즐 생성 시작");
      regeneratePuzzleWithPreservedClaims(roomId, claims, answer);
    }
  });
};

function updateScore(claims) {
  let aCount = 0, bCount = 0;

  claims.forEach(row => {
    row.forEach(cell => {
      if (cell === "A") aCount++;
      else if (cell === "B") bCount++;
    });
  });

  const scoreA = document.getElementById("scoreA");
  const scoreB = document.getElementById("scoreB");
  if (scoreA) scoreA.textContent = `나: ${aCount}칸`;
  if (scoreB) scoreB.textContent = `상대: ${bCount}칸`;
}

function checkForGameEndAndDeclareWinner(claims) {
  let aCount = 0, bCount = 0, filled = 0;

  claims.forEach(row => {
    row.forEach(cell => {
      if (cell === "A") {
        aCount++;
        filled++;
      } else if (cell === "B") {
        bCount++;
        filled++;
      }
    });
  });

  if (filled === 81) {
    const resultText = aCount > bCount
      ? "🎉 나(A)의 승리!"
      : bCount > aCount
        ? "🎉 상대(B)의 승리!"
        : "🤝 무승부!";

    let el = document.getElementById("winner-announcement");
    if (!el) {
      el = document.createElement("div");
      el.id = "winner-announcement";
      el.style.marginTop = "1rem";
      el.style.fontWeight = "bold";
      el.style.fontSize = "1.2rem";
      document.getElementById("scoreboard")?.after(el);
    }
    el.textContent = resultText;
  }
}

function regeneratePuzzleWithPreservedClaims(roomId, claims, answer) {
  const newPuzzle = JSON.parse(JSON.stringify(answer));
  const removable = [];

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (claims[r][c] === "") removable.push({ r, c });
    }
  }

  const shuffle = arr => arr.sort(() => Math.random() - 0.5);
  const blanks = Math.min(30, removable.length);
  const toBlank = shuffle(removable).slice(0, blanks);

  toBlank.forEach(({ r, c }) => {
    newPuzzle[r][c] = 0;
  });

  update(ref(db, `rooms/${roomId}`), {
    puzzle: newPuzzle,
    answer: answer
  }).then(() => console.log("🆕 새 퍼즐 저장 완료"))
    .catch(err => console.error("퍼즐 저장 실패", err));
}
