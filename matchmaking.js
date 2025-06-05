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

const createRoomBtn = document.getElementById("create-room");
const availableRoomsEl = document.getElementById("available-rooms");
const lobbySection = document.getElementById("lobby-section");
const gameSection = document.getElementById("game-section");
const roomCodeDisplay = document.getElementById("room-code-display");
const playerRoleDisplay = document.getElementById("player-role-display");

let myPlayer = null;
let currentRoom = null;

function generateRoomCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function renderAvailableRooms(snapshot) {
  availableRoomsEl.innerHTML = "";
  const rooms = snapshot.val();
  for (const roomCode in rooms) {
    const room = rooms[roomCode];
    if (room.playerCount === 1) {
      const li = document.createElement("li");
      li.textContent = `방 번호: ${roomCode}`;
      li.style.cursor = "pointer";
      li.onclick = () => joinRoom(roomCode);
      availableRoomsEl.appendChild(li);
    }
  }
}

function createRoom() {
  const roomCode = generateRoomCode();
  const roomRef = ref(db, `rooms/${roomCode}`);
  set(roomRef, {
    playerCount: 1,
    board: {},
    status: "waiting"
  });
  enterRoom(roomCode, "A");
}

function joinRoom(roomCode) {
  const roomRef = ref(db, `rooms/${roomCode}`);
  set(roomRef, {
    playerCount: 2,
    status: "ready"
  });
  enterRoom(roomCode, "B");
}

function enterRoom(roomCode, player) {
  myPlayer = player;
  currentRoom = roomCode;
  lobbySection.style.display = "none";
  gameSection.style.display = "block";
  roomCodeDisplay.textContent = `Room: ${roomCode}`;
  playerRoleDisplay.textContent = `Player: ${player}`;

  import("./game.js").then(({ startGame }) => {
    startGame(db, roomCode, player);
  });
}

onValue(ref(db, "rooms"), renderAvailableRooms);
createRoomBtn.addEventListener("click", createRoom);
