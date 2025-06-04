// matchmaking.js
import { getDatabase, ref, get, set, push, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

export async function findOrCreateRoom(db, playerId) {
  const roomsRef = ref(db, 'rooms');
  const snapshot = await get(roomsRef);
  const rooms = snapshot.exists() ? snapshot.val() : {};

  // 1. 빈 방 찾기 (started: false, 플레이어 1명 이하)
  for (const roomId in rooms) {
    const room = rooms[roomId];
    const players = room.players || {};
    if (!room.started && Object.keys(players).length < 2) {
      await set(ref(db, `rooms/${roomId}/players/${playerId}`), true);
      return roomId;
    }
  }

  // 2. 새 방 생성
  const newRoomRef = push(roomsRef);
  const newRoomId = newRoomRef.key;
  await set(ref(db, `rooms/${newRoomId}`), {
    started: false,
    players: { [playerId]: true }
  });
  return newRoomId;
}

export function onRoomReady(db, roomId, callback) {
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const room = snapshot.val();
    if (room && room.started && room.puzzle && room.answer) {
      callback(room.puzzle, room.answer);
    }
  });
}

export async function startGameIfReady(db, roomId, puzzle, answer) {
  const roomRef = ref(db, `rooms/${roomId}/players`);
  const snapshot = await get(roomRef);
  const players = snapshot.exists() ? snapshot.val() : {};

  if (Object.keys(players).length === 2) {
    await set(ref(db, `rooms/${roomId}/puzzle`), puzzle);
    await set(ref(db, `rooms/${roomId}/answer`), answer);
    await set(ref(db, `rooms/${roomId}/started`), true);
  }
}
