// matchmaking.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, push, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbgziR_rX4O9OkDBsJxTzNO3q486C_eH4",
  authDomain: "sudokudo-58475.firebaseapp.com",
  projectId: "sudokudo-58475",
  storageBucket: "sudokudo-58475.appspot.com",
  messagingSenderId: "759625494323",
  appId: "1:759625494323:web:b9923311c2694e3f5d9846",
  databaseURL: "https://sudokudo-58475-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const createBtn = document.getElementById("create-room");
const roomListEl = document.getElementById("room-list");

function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function renderAvailableRooms(rooms) {
  const roomListEl = document.getElementById("room-list");
  if (!roomListEl) {
    console.warn("⛔ room-list 요소가 아직 DOM에 없습니다.");
    return;
  }
  roomListEl.innerHTML = "";
  Object.keys(rooms).forEach((roomId) => {
    const li = document.createElement("li");
    li.textContent = `방 ${roomId}`;
    li.onclick = () => joinRoom(roomId);
    roomListEl.appendChild(li);
  });
}

function joinRoom(roomId) {
  const playerId = "player" + Math.floor(Math.random() * 10000);
  const roomRef = ref(db, `rooms/${roomId}`);

  set(ref(db, `rooms/${roomId}/players/${playerId}`), true);

  // 세션에 방 번호와 플레이어 ID 저장
  sessionStorage.setItem("roomId", roomId);
  sessionStorage.setItem("playerId", playerId);

  window.location.href = "game.html";
}

function createRoom() {
  const newRoomId = generateRoomId();
  const playerId = "player" + Math.floor(Math.random() * 10000);
  const roomRef = ref(db, `rooms/${newRoomId}`);

  set(ref(db, `rooms/${newRoomId}/players/${playerId}`), true);
  set(ref(db, `rooms/${newRoomId}/status`), "waiting");

  sessionStorage.setItem("roomId", newRoomId);
  sessionStorage.setItem("playerId", playerId);

  window.location.href = "game.html";
}

createBtn.addEventListener("click", createRoom);

onValue(ref(db, "rooms"), (snapshot) => {
  const rooms = snapshot.val() || {};
  const filtered = {};
  for (const id in rooms) {
    if (rooms[id].status === "waiting") {
      filtered[id] = rooms[id];
    }
  }
  renderAvailableRooms(filtered);
});
