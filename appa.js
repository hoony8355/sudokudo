// appa.js – 스코어 계산, 레이팅 처리 및 보드 재생성 개선 및 자기정보 선반영 + 랭킹 UI 렌더링
import { getDatabase, ref, onValue, update, get, child } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const db = getDatabase();
const auth = getAuth();

window.initSudokuEnhancer = function (roomId) {
  updateSelfRatingDisplay(); // ✅ 본인 정보 선반영
  renderLeaderboard();       // ✅ 레이팅 기반 랭킹 표시

  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const room = snapshot.val();
    if (!room) return;

    const { puzzle, claims, answer } = room;
    if (!puzzle || !claims || !answer) return;

    updateScore(claims);
    updateRatingDisplay(room);
    checkForGameEndAndDeclareWinner(claims, room);

    const isBoardFilled = puzzle.flat().every((val, i) => val !== 0 || claims[Math.floor(i / 9)][i % 9] !== "");
    if (isBoardFilled) {
      console.log("✅ 보드 채워짐. 새 퍼즐 생성 시작");
      regeneratePuzzleWithPreservedClaims(roomId, claims, answer);
    }
  });
};

function updateSelfRatingDisplay() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const userRef = ref(db, `users/${uid}`);
  get(userRef).then((snap) => {
    const data = snap.val();
    const nicknameA = document.getElementById("nicknameA");
    const ratingA = document.getElementById("ratingA");
    if (nicknameA) nicknameA.textContent = `나(${data?.nickname || "?"})`;
    if (ratingA) ratingA.textContent = `(레이팅: ${data?.rating ?? "?"})`;
  });
}

function updateScore(claims) {
  let aCount = 0, bCount = 0;
  claims.forEach(row => {
    row.forEach(cell => {
      if (cell === "A") aCount++;
      else if (cell === "B") bCount++;
    });
  });

  const countA = document.getElementById("countA");
  const countB = document.getElementById("countB");
  if (countA) countA.textContent = `${aCount}칸`;
  if (countB) countB.textContent = `${bCount}칸`;
}

function updateRatingDisplay(room) {
  const nicknameB = document.getElementById("nicknameB");
  const ratingB = document.getElementById("ratingB");

  const userBRef = ref(db, `users/${room.playerBId}`);
  get(userBRef).then((snap) => {
    const data = snap.val();
    if (nicknameB) nicknameB.textContent = `상대(${data?.nickname || "?"})`;
    if (ratingB) ratingB.textContent = `(레이팅: ${data?.rating ?? "?"})`;
  });
}

function checkForGameEndAndDeclareWinner(claims, room) {
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

    const winner = aCount > bCount ? "A" : bCount > aCount ? "B" : "draw";
    processRating(room, winner);
  }
}

function processRating(room, winner) {
  const userAId = room.playerAId;
  const userBId = room.playerBId;
  if (!userAId || !userBId) return;

  const userARef = ref(db, `users/${userAId}`);
  const userBRef = ref(db, `users/${userBId}`);

  Promise.all([get(userARef), get(userBRef)]).then(([aSnap, bSnap]) => {
    const aRating = aSnap.val()?.rating ?? 1200;
    const bRating = bSnap.val()?.rating ?? 1200;

    const K = 32;
    const EA = 1 / (1 + 10 ** ((bRating - aRating) / 400));
    const EB = 1 / (1 + 10 ** ((aRating - bRating) / 400));

    let SA = 0.5, SB = 0.5;
    if (winner === "A") {
      SA = 1;
      SB = 0;
    } else if (winner === "B") {
      SA = 0;
      SB = 1;
    }

    const aNew = Math.round(aRating + K * (SA - EA));
    const bNew = Math.round(bRating + K * (SB - EB));

    update(userARef, { rating: aNew });
    update(userBRef, { rating: bNew });
  });
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

function renderLeaderboard() {
  const usersRef = ref(db, "users");
  get(usersRef).then(snap => {
    const data = snap.val();
    if (!data) return;

    const users = Object.entries(data).map(([uid, val]) => ({
      uid,
      nickname: val.nickname || "?",
      rating: val.rating || 1200
    }));

    users.sort((a, b) => b.rating - a.rating);

    const currentUid = auth.currentUser?.uid;
    const myRank = users.findIndex(u => u.uid === currentUid) + 1;
    const myData = users.find(u => u.uid === currentUid);

    document.getElementById("my-ranking").textContent = myData
      ? `${myRank}위 - ${myData.nickname} (${myData.rating})`
      : "로그인 후 확인 가능합니다.";

    const top10El = document.getElementById("top-10-list");
    const fullEl = document.getElementById("full-ranking-list");
    top10El.innerHTML = "";
    fullEl.innerHTML = "";

    users.slice(0, 10).forEach((u, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}위 - ${u.nickname} (${u.rating})`;
      top10El.appendChild(li);
    });

    users.slice(10, 100).forEach((u, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 11}위 - ${u.nickname} (${u.rating})`;
      fullEl.appendChild(li);
    });
  });
}
