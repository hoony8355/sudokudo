// matchmaking.js
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { db } from "./firebase-init.js";

const createRoomBtn = document.getElementById("createRoomBtn");
const roomListContainer = document.getElementById("roomList");

function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function log(...args) {
  console.log("[Matchmaking]", ...args);
}

function renderAvailableRooms(rooms) {
  if (!roomListContainer) {
    log("⚠️ roomListContainer 요소 없음");
    return;
  }
  roomListContainer.innerHTML = "";
  Object.entries(rooms).forEach(([roomId, room]) => {
    if (!room.inGame) {
      const button = document.createElement("button");
      button.textContent = `방 ${roomId} 입장하기`;
      button.classList.add("room-button");
      button.onclick = () => joinRoom(roomId);
      roomListContainer.appendChild(button);
    }
  });
  log("📋 대기 중인 방 렌더링 완료");
}

function joinRoom(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const roomData = snapshot.val();
    if (roomData && !roomData.playerB) {
      set(ref(db, `rooms/${roomId}/playerB`), true);
      set(ref(db, `rooms/${roomId}/inGame`), true);
      sessionStorage.setItem("roomId", roomId);
      sessionStorage.setItem("player", "B");
      location.href = "#game";
    }
  }, {
    onlyOnce: true
  });
}

function createRoom() {
  const roomId = generateRoomId();
  const roomRef = ref(db, `rooms/${roomId}`);
  set(roomRef, {
    playerA: true,
    inGame: false
  }).then(() => {
    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("player", "A");
    location.href = "#game";
  });
  log(`🆕 방 생성: ${roomId}`);
}

createRoomBtn?.addEventListener("click", createRoom);

onValue(ref(db, "rooms"), (snapshot) => {
  const rooms = snapshot.val();
  if (rooms) {
    log("📡 현재 대기 중인 방:", rooms);
    renderAvailableRooms(rooms);
  }
});
