// lovi.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { startGame } from "./gamp.js";

// Firebase 초기화
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

// DOM 요소 참조
const createBtn = document.getElementById("create-room-btn");
const roomList = document.getElementById("room-list");
const lobbyContainer = document.getElementById("lobby-container");
const gameContainer = document.getElementById("game-container");

// 유저 세션 상태
let roomId = null;
let playerRole = null;

function log(...args) {
  console.log("[LOVI]", ...args);
}

// 방 ID 생성
function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// 대기 중인 방 표시
function renderRooms(rooms) {
  roomList.innerHTML = "";
  Object.entries(rooms).forEach(([id, room]) => {
    if (!room.inGame && !room.playerB) {
      const btn = document.createElement("button");
      btn.textContent = `방 ${id} 입장하기`;
      btn.onclick = () => joinRoom(id);
      roomList.appendChild(btn);
    }
  });
}

// 방 입장 처리
function joinRoom(id) {
  const roomRef = ref(db, `rooms/${id}`);
  onValue(roomRef, snapshot => {
    const room = snapshot.val();
    if (room && !room.playerB) {
      log("🔑 B 플레이어로 입장");
      playerRole = "B";
      roomId = id;
      update(roomRef, { playerB: true, inGame: true });
      enterGame();
    }
  }, { onlyOnce: true });
}

// 방 생성
function createRoom() {
  const id = generateRoomId();
  const roomRef = ref(db, `rooms/${id}`);
  set(roomRef, { playerA: true, inGame: false }).then(() => {
    log("🏠 방 생성 완료", id);
    playerRole = "A";
    roomId = id;
    waitForOpponent();
  });
}

// 상대 기다리기
function waitForOpponent() {
  lobbyContainer.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  gameContainer.innerHTML = `<h2>상대를 기다리는 중...</h2>`;

  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, snapshot => {
    const room = snapshot.val();
    if (room?.playerB) {
      log("👥 상대 입장 확인. 카운트다운 시작");
      startCountdown();
    }
  });
}

// 카운트다운 후 startGame 호출
function startCountdown() {
  let count = 3;
  const h2 = document.createElement("h2");
  gameContainer.innerHTML = "";
  gameContainer.appendChild(h2);

  const timer = setInterval(() => {
    h2.textContent = `${count}...`;
    count--;
    if (count < 0) {
      clearInterval(timer);
      log("🚀 게임 시작");
      startGame(roomId, playerRole);
    }
  }, 1000);
}

// 입장 시 초기 설정
function enterGame() {
  lobbyContainer.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  startCountdown();
}

// 초기화
function init() {
  createBtn?.addEventListener("click", createRoom);
  onValue(ref(db, "rooms"), snapshot => {
    const rooms = snapshot.val();
    if (rooms) {
      log("📡 대기 중인 방 목록", rooms);
      renderRooms(rooms);
    }
  });
}

init();
