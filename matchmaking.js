// matchmaking.js
import { getDatabase, ref, onValue, set, push, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { database } from "./firebase-init.js";

const createRoomBtn = document.getElementById("createRoomBtn");
const roomListContainer = document.getElementById("roomList");

function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function renderAvailableRooms(rooms) {
  if (!roomListContainer) {
    console.warn("⚠️ roomListContainer 요소를 찾을 수 없습니다.");
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
}

function joinRoom(roomId) {
  const roomRef = ref(database, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const roomData = snapshot.val();
    if (roomData && !roomData.playerB) {
      set(ref(database, `rooms/${roomId}/playerB`), true);
      set(ref(database, `rooms/${roomId}/inGame`), true);
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
  const roomRef = ref(database, `rooms/${roomId}`);
  set(roomRef, {
    playerA: true,
    inGame: false
  }).then(() => {
    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("player", "A");
    location.href = "#game";
  });
}

createRoomBtn?.addEventListener("click", createRoom);

onValue(ref(database, "rooms"), (snapshot) => {
  const rooms = snapshot.val();
  if (rooms) {
    console.log("📡 현재 대기 중인 방:", rooms);
    renderAvailableRooms(rooms);
  }
});
