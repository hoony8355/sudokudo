// appa.js – 디버깅 로그 강화 버전
import { getDatabase, ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const db = getDatabase();
const auth = getAuth();

window.initSudokuEnhancer = function (roomId) {
  console.log("[appa] ✅ initSudokuEnhancer 호출됨, roomId:", roomId);
  updateSelfRatingDisplay();
  renderLeaderboard();

  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const room = snapshot.val();
    if (!room) return console.warn("[appa] ❌ room 데이터 없음");

    const { puzzle, claims, answer } = room;
    if (!puzzle || !claims || !answer) return console.warn("[appa] ❌ puzzle, claims, answer 중 일부 없음");

    console.log("[appa] 🧩 퍼즐 데이터 감지됨. 점수 및 상태 업데이트");
    updateScore(claims);
    updateRatingDisplay(room);
    checkForGameEndAndDeclareWinner(claims, room);

    const isBoardFilled = puzzle.flat().every((val, i) => val !== 0 || claims[Math.floor(i / 9)][i % 9] !== "");
    if (isBoardFilled) {
      console.log("[appa] ✅ 보드가 모두 채워짐. 새 퍼즐 생성 시작");
      regeneratePuzzleWithPreservedClaims(roomId, claims, answer);
    }
  });
};

function updateSelfRatingDisplay() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    console.warn("[appa] ❌ 유저 UID 없음 (로그인 상태 아님)");
    return;
  }

  console.log("[appa] 🔍 사용자 정보 조회 중:", uid);
  const userRef = ref(db, `users/${uid}`);
  get(userRef).then((snap) => {
    const data = snap.val();
    if (!data) return console.warn("[appa] ❌ 사용자 정보 없음");

    console.log("[appa] ✅ 사용자 정보:", data);
    document.getElementById("nicknameA").textContent = `나(${data.nickname || "?"})`;
    document.getElementById("ratingA").textContent = `(레이팅: ${data.rating ?? "?"})`;
  }).catch(err => {
    console.error("[appa] ❌ 사용자 정보 불러오기 실패", err);
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

  console.log(`[appa] 🧮 점령 칸 수: A=${aCount}, B=${bCount}`);
  document.getElementById("countA").textContent = `${aCount}칸`;
  document.getElementById("countB").textContent = `${bCount}칸`;
}

function updateRatingDisplay(room) {
  const uid = room.playerBId;
  if (!uid) return console.warn("[appa] ⛔ 상대 playerBId 없음");

  console.log("[appa] 📥 상대 정보 조회 중:", uid);
  const refB = ref(db, `users/${uid}`);
  get(refB).then((snap) => {
    const data = snap.val();
    if (!data) return console.warn("[appa] ❌ 상대 정보 없음");

    console.log("[appa] ✅ 상대 정보:", data);
    document.getElementById("nicknameB").textContent = `상대(${data.nickname || "?"})`;
    document.getElementById("ratingB").textContent = `(레이팅: ${data.rating ?? "?"})`;
  }).catch(err => {
    console.error("[appa] ❌ 상대 정보 로딩 실패", err);
  });
}

function checkForGameEndAndDeclareWinner(claims, room) {
  let aCount = 0, bCount = 0, filled = 0;
  claims.forEach(row => {
    row.forEach(cell => {
      if (cell === "A") {
        aCount++; filled++;
      } else if (cell === "B") {
        bCount++; filled++;
      }
    });
  });

  console.log(`[appa] 🧾 게임 상태 체크: A=${aCount}, B=${bCount}, 채워진 칸=${filled}`);
  if (filled === 81) {
    const winner =
      aCount > bCount ? "A" :
      bCount > aCount ? "B" : "draw";
    const resultText =
      winner === "A" ? "🎉 나(A)의 승리!" :
      winner === "B" ? "🎉 상대(B)의 승리!" :
      "🤝 무승부!";

    console.log("[appa] 🎯 게임 종료! 결과:", resultText);
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

    processRating(room, winner);
  }
}

function processRating(room, winner) {
  const { playerAId, playerBId } = room;
  if (!playerAId || !playerBId) return;

  const refA = ref(db, `users/${playerAId}`);
  const refB = ref(db, `users/${playerBId}`);

  Promise.all([get(refA), get(refB)]).then(([aSnap, bSnap]) => {
    const aRating = aSnap.val()?.rating ?? 1200;
    const bRating = bSnap.val()?.rating ?? 1200;

    const K = 32;
    const EA = 1 / (1 + 10 ** ((bRating - aRating) / 400));
    const EB = 1 / (1 + 10 ** ((aRating - bRating) / 400));

    const SA = winner === "A" ? 1 : winner === "B" ? 0 : 0.5;
    const SB = 1 - SA;

    const aNew = Math.round(aRating + K * (SA - EA));
    const bNew = Math.round(bRating + K * (SB - EB));

    console.log(`[appa] 📊 레이팅 갱신: A ${aRating}→${aNew}, B ${bRating}→${bNew}`);
    update(refA, { rating: aNew });
    update(refB, { rating: bNew });
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
  toBlank.forEach(({ r, c }) => newPuzzle[r][c] = 0);

  update(ref(db, `rooms/${roomId}`), {
    puzzle: newPuzzle,
    answer
  }).then(() => {
    console.log("[appa] 🧠 새로운 퍼즐 저장 완료");
  }).catch(err => {
    console.error("[appa] ❌ 퍼즐 저장 실패", err);
  });
}

function renderLeaderboard() {
  console.log("[appa] 📡 리더보드 로딩 시작");
  const usersRef = ref(db, "users");

  get(usersRef).then(snap => {
    const data = snap.val();
    if (!data) return console.warn("[appa] ❌ users 데이터 없음");

    const users = Object.entries(data).map(([uid, val]) => ({
      uid,
      nickname: val.nickname || "?",
      rating: val.rating ?? 1200
    }));

    users.sort((a, b) => b.rating - a.rating);

    const currentUid = auth.currentUser?.uid;
    const myRank = users.findIndex(u => u.uid === currentUid) + 1;
    const myData = users.find(u => u.uid === currentUid);

    console.log(`[appa] 🧾 유저 수: ${users.length}, 내 순위: ${myRank}, 내 정보:`, myData);
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

    console.log("[appa] ✅ 리더보드 렌더링 완료");
  }).catch(err => {
    console.error("[appa] ❌ 리더보드 로딩 실패", err);
  });
}
