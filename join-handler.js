// join-handler.js – 상대방 입장 처리 및 자동 승리 로직
import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getDatabase, ref, update, onValue, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const auth = getAuth();
const db = getDatabase();

export function handlePlayerJoin(roomId) {
  const uid = auth.currentUser?.uid;
  if (!uid) return console.warn("[join-handler] ❌ 로그인되지 않음");

  const roomRef = ref(db, `rooms/${roomId}`);

  // playerBId가 비어있는 경우에만 현재 유저 등록
  get(roomRef).then((snap) => {
    const room = snap.val();
    if (!room) return console.warn("[join-handler] ❌ room 없음");

    if (!room.playerBId && room.playerAId !== uid) {
      update(roomRef, { playerBId: uid });
      console.log("[join-handler] ✅ playerBId 등록 완료");

      monitorOpponentExit(roomId, uid);
    } else {
      console.log("[join-handler] ℹ️ 이미 playerBId 등록되어 있거나 본인이 host임");
    }
  });
}

function monitorOpponentExit(roomId, currentUid) {
  const roomRef = ref(db, `rooms/${roomId}`);
  let opponentLastSeen = Date.now();

  onValue(roomRef, (snap) => {
    const room = snap.val();
    if (!room || !room.claims) return;

    const allClaims = room.claims.flat();
    const opponentMark = room.playerAId === currentUid ? "B" : "A";
    const myMark = room.playerAId === currentUid ? "A" : "B";

    const hasOpponentMoved = allClaims.includes(opponentMark);
    if (hasOpponentMoved) {
      opponentLastSeen = Date.now();
    }

    const now = Date.now();
    if (now - opponentLastSeen >= 30000) {
      console.log("[join-handler] 🕒 상대방 30초 이상 무응답, 자동 승리 처리");
      declareAutoVictory(roomId, myMark);
    }
  });
}

function declareAutoVictory(roomId, winnerMark) {
  const roomRef = ref(db, `rooms/${roomId}`);
  update(roomRef, {
    inGame: false,
    gameResult: winnerMark === "A" ? "A_WIN" : "B_WIN"
  }).then(() => {
    console.log(`[join-handler] 🏆 자동 승리 처리됨: ${winnerMark}`);
  }).catch((err) => {
    console.error("[join-handler] ❌ 자동 승리 처리 실패", err);
  });
}
