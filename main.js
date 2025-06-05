// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, get, child, push, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbgziR_rX4O9OkDBsJxTzNO3q486C_eH4",
  authDomain: "sudokudo-58475.firebaseapp.com",
  projectId: "sudokudo-58475",
  storageBucket: "sudokudo-58475.firebasestorage.app",
  messagingSenderId: "759625494323",
  appId: "1:759625494323:web:b9923311c2694e3f5d9846",
  databaseURL: "https://sudokudo-58475-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const lobbyEl = document.getElementById("lobby");
const roomListEl = document.getElementById("room-list");
const createRoomBtn = document.getElementById("create-room-btn");
const waitingRoomEl = document.getElementById("waiting-room");
const waitingMessageEl = document.getElementById("waiting-message");

let currentRoomId = null;
let playerId = `player_${Math.floor(Math.random() * 100000)}`;

// 방 리스트 로딩
function loadRoomList() {
  onValue(ref(db, "rooms"), (snapshot) => {
    roomListEl.innerHTML = "";
    const rooms = snapshot.val() || {};
    Object.entries(rooms).forEach(([roomId, roomData]) => {
      const playerCount = roomData.players ? Object.keys(roomData.players).length : 0;
      if (playerCount < 2) {
        const btn = document.createElement("button");
        btn.textContent = `방 번호 ${roomId}`;
        btn.onclick = () => joinRoom(roomId);
        roomListEl.appendChild(btn);
      }
    });
  });
}

// 방 참가
function joinRoom(roomId) {
  currentRoomId = roomId;
  set(ref(db, `rooms/${roomId}/players/${playerId}`), true);
  lobbyEl.style.display = "none";
  waitingRoomEl.style.display = "block";
  checkStartCondition(roomId);
}

// 방 생성
function createRoom() {
  const roomId = Math.floor(10000 + Math.random() * 90000).toString();
  set(ref(db, `rooms/${roomId}/players/${playerId}`), true);
  currentRoomId = roomId;
  lobbyEl.style.display = "none";
  waitingRoomEl.style.display = "block";
  checkStartCondition(roomId);
}

// 두 명 입장 시 시작
function checkStartCondition(roomId) {
  onValue(ref(db, `rooms/${roomId}/players`), (snapshot) => {
    const players = snapshot.val();
    if (players && Object.keys(players).length === 2) {
      waitingMessageEl.textContent = "매칭 완료! 게임을 시작합니다...";
      setTimeout(() => {
        location.href = `game.html?room=${roomId}&player=${playerId}`;
      }, 1500);
    }
  });
}

createRoomBtn.addEventListener("click", createRoom);
loadRoomList();
