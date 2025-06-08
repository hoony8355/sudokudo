// lovi.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbgziR_rX4O9OkDBsJxTzNO3q486C_eH4",
  authDomain: "sudokudo-58475.firebaseapp.com",
  databaseURL: "https://sudokudo-58475-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sudokudo-58475",
  storageBucket: "sudokudo-58475.firebasestorage.app",
  messagingSenderId: "759625494323",
  appId: "1:759625494323:web:b9923311c2694e3f5d9846",
  measurementId: "G-5YCQ6KGK43"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const createRoomBtn = document.getElementById("create-room-btn");
const roomList = document.getElementById("room-list");
const lobbyContainer = document.getElementById("lobby-container");
const gameContainer = document.getElementById("game-container");

function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function createRoom() {
  const roomId = generateRoomId();
  const roomRef = ref(db, `rooms/${roomId}`);
  set(roomRef, {
    playerA: true,
    inGame: false,
    ready: false,
  }).then(() => {
    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("player", "A");
    waitForPlayer(roomId);
  });
}

function joinRoom(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  update(roomRef, {
    playerB: true,
    inGame: true,
    ready: true
  }).then(() => {
    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("player", "B");
    startGameCountdown();
  });
}

function waitForPlayer(roomId) {
  lobbyContainer.innerHTML = `<p>상대를 기다리는 중...</p>`;
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data?.ready === true) {
      console.log("✅ 상대 입장 완료, 카운트다운 시작");
      startGameCountdown();
    }
  });
}

function startGameCountdown() {
  lobbyContainer.innerHTML = `<h2>게임이 곧 시작됩니다!</h2><p id="countdown"></p>`;
  let count = 3;
  const countdownEl = document.getElementById("countdown");
  const interval = setInterval(() => {
    countdownEl.textContent = `${count}...`;
    count--;
    if (count < 0) {
      clearInterval(interval);
      lobbyContainer.classList.add("hidden");
      gameContainer.classList.remove("hidden");
      console.log("🎮 게임 시작!");
      window.dispatchEvent(new Event("startGame"));
    }
  }, 1000);
}

function renderRoomButtons(rooms) {
  roomList.innerHTML = "";
  Object.entries(rooms).forEach(([roomId, data]) => {
    if (!data.inGame) {
      const btn = document.createElement("button");
      btn.textContent = `방 ${roomId} 입장하기`;
      btn.onclick = () => joinRoom(roomId);
      roomList.appendChild(btn);
    }
  });
}

onValue(ref(db, "rooms"), (snapshot) => {
  const data = snapshot.val();
  if (data) {
    console.log("📡 대기 중인 방 목록 갱신");
    renderRoomButtons(data);
  }
});

createRoomBtn?.addEventListener("click", createRoom);
