// lovi.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { startGame } from "./gamp.js";
import { generateSudoku } from "./sudokuGenerator.js";

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
const waitingMessage = document.getElementById("waiting-message");
const countdownEl = document.getElementById("countdown");

let roomId = null;
let playerRole = null;

function log(...args) {
  console.log("[LOVI]", ...args);
}

function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

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

function joinRoom(id) {
  const roomRef = ref(db, `rooms/${id}`);
  onValue(
    roomRef,
    snapshot => {
      const room = snapshot.val();
      if (room && !room.playerB) {
        log("🔑 B 플레이어로 입장");
        playerRole = "B";
        roomId = id;
        update(roomRef, { playerB: true, inGame: true });
        enterGame();
      }
    },
    { onlyOnce: true }
  );
}

function createRoom() {
  const id = generateRoomId();
  const roomRef = ref(db, `rooms/${id}`);
  const { puzzle, answer } = generateSudoku();
  const emptyClaims = Array.from({ length: 9 }, () => Array(9).fill(""));

  set(roomRef, {
    playerA: true,
    inGame: false,
    puzzle,
    answer,
    claims: emptyClaims
  }).then(() => {
    log("🏠 방 생성 완료", id);
    playerRole = "A";
    roomId = id;
    waitForOpponent();
  });
}

function waitForOpponent() {
  lobbyContainer.classList.add("hidden");
  gameContainer.classList.remove("hidden");

  waitingMessage.classList.remove("hidden");
  countdownEl.classList.add("hidden");

  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, snapshot => {
    const room = snapshot.val();
    if (room?.playerB) {
      log("👥 상대 입장 확인. 카운트다운 시작");
      startCountdown();
    }
  });
}

function startCountdown() {
  let count = 3;

  waitingMessage.classList.add("hidden");
  countdownEl.classList.remove("hidden");

  const timer = setInterval(() => {
    countdownEl.textContent = `${count}`;
    count--;
    if (count < 0) {
      clearInterval(timer);
      countdownEl.classList.add("hidden");
      log("🚀 게임 시작");
      startGame(roomId, playerRole);
    }
  }, 1000);
}

function enterGame() {
  lobbyContainer.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  waitForOpponent();
}

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
