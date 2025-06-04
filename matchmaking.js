// matchmaking.js

import { getDatabase, ref, onValue, set, push, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const db = getDatabase();
const matchQueueRef = ref(db, "matchQueue");
const roomsRef = ref(db, "rooms");

let playerId = localStorage.getItem("playerId") || generateId();
localStorage.setItem("playerId", playerId);

function generateId() {
  return "player-" + Math.random().toString(36).substr(2, 9);
}

export async function findMatch(callback) {
  console.log("🔍 매칭 대기열에 참가 중...");

  const playerRef = push(matchQueueRef);
  await set(playerRef, {
    playerId,
    timestamp: Date.now()
  });

  onValue(matchQueueRef, async (snapshot) => {
    const queue = snapshot.val() || {};
    const players = Object.values(queue);

    if (players.length >= 2) {
      // 가장 먼저 들어온 두 명 추출
      const sorted = players.sort((a, b) => a.timestamp - b.timestamp);
      const [p1, p2] = sorted;

      if (p1.playerId === playerId || p2.playerId === playerId) {
        const roomId = "room-" + Date.now();

        console.log("✅ 매칭 완료! 상대방:", p1.playerId === playerId ? p2.playerId : p1.playerId);

        await set(ref(db, `rooms/${roomId}`), {
          players: {
            [p1.playerId]: true,
            [p2.playerId]: true
          },
          createdAt: Date.now()
        });

        await remove(matchQueueRef); // 전체 큐 초기화 (소규모 매칭 기준)

        callback(roomId, playerId);
      }
    } else {
      console.log("⌛ 대기 중... 현재 인원:", players.length);
    }
  });
}

export function getPlayerId() {
  return playerId;
}
