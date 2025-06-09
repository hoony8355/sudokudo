// lovi.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, get } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
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
let countdownStarted = false;

function log(...args) {
  console.log("[LOVI]", ...args);
}

function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

async function renderRooms(rooms) {
  roomList.innerHTML = "";
  for (const [id, room] of Object.entries(rooms)) {
    if (!room.inGame && !room.playerB && room.playerAId) {
      try {
        const userSnap = await get(ref(db, `users/${room.playerAId}`));
        const user = userSnap.val();
        const nickname = user?.nickname || "?";
        const rating = user?.rating ?? "?";

        const btn = document.createElement("button");
        btn.innerHTML = `방 ${id} - <strong>${nickname}</strong> (레이팅: ${rating})`;
        btn.onclick = () => joinRoom(id);
        roomList.appendChild(btn);
      } catch (err) {
        console.error("❌ 사용자 정보 로딩 실패", err);
      }
    }
  }
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

  const uid = localStorage.getItem("uid");

  set(roomRef, {
    playerA: true,
    inGame: false,
    puzzle,
    answer,
    claims: emptyClaims,
    playerAId: uid || null
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
  countdownStarted = false;

  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, snapshot => {
    const room = snapshot.val();
    if (room?.playerB && !countdownStarted) {
      log("👥 상대 입장 확인. 카운트다운 시작");
      countdownStarted = true;
      startCountdown();
    }
  });
}

function startCountdown() {
  let count = 3;

  waitingMessage.classList.add("hidden");
  countdownEl.classList.remove("hidden");
  countdownEl.textContent = `${count}`;

  const timer = setInterval(() => {
    count--;
    if (count < 0) {
      clearInterval(timer);
      countdownEl.classList.add("hidden");
      log("🚀 게임 시작");
      startGame(roomId, playerRole);
      console.log("✅ window.initSudokuEnhancer() 호출 직전");
window.initSudokuEnhancer(roomId);; // ✅ 확장 기능 연결
    } else {
      countdownEl.textContent = `${count}`;
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
