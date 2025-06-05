import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, push, set, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCbgziR_rX4O9OkDBsJxTzNO3q486C_eH4",
  authDomain: "sudokudo-58475.firebaseapp.com",
  projectId: "sudokudo-58475",
  storageBucket: "sudokudo-58475.firebasestorage.app",
  messagingSenderId: "759625494323",
  appId: "1:759625494323:web:b9923311c2694e3f5d9846",
  databaseURL: "https://sudokudo-58475-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const createRoomButton = document.getElementById("create-room-button");
const availableRoomsDiv = document.getElementById("available-rooms");
const lobbyContainer = document.getElementById("lobby-container");
const gameContainer = document.getElementById("game-container");

// 방 번호 랜덤 생성
function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// 방 목록 렌더링
function renderAvailableRooms(snapshot) {
  availableRoomsDiv.innerHTML = "<h3>참여 가능한 방 목록</h3>";
  const rooms = snapshot.val();
  if (rooms) {
    Object.entries(rooms).forEach(([roomId, data]) => {
      if (data.playerCount === 1) {
        const btn = document.createElement("button");
        btn.textContent = `방 ${roomId} 입장`;
        btn.onclick = () => joinRoom(roomId);
        availableRoomsDiv.appendChild(btn);
      }
    });
  }
}

// 방 생성
function createRoom() {
  const roomId = generateRoomId();
  const roomRef = ref(db, `rooms/${roomId}`);
  set(roomRef, {
    playerCount: 1,
    createdAt: Date.now(),
    puzzleSeed: Math.random().toString(36).substring(2)
  }).then(() => {
    sessionStorage.setItem("roomId", roomId);
    console.log(`🎲 방 ${roomId} 생성됨`);
    transitionToGame();
  });
}

// 방 입장
function joinRoom(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);
  set(roomRef, {
    playerCount: 2,
    joinedAt: Date.now()
  }).then(() => {
    sessionStorage.setItem("roomId", roomId);
    console.log(`🚪 방 ${roomId} 입장 완료`);
    transitionToGame();
  });
}

function transitionToGame() {
  lobbyContainer.style.display = "none";
  gameContainer.style.display = "block";
  import("./game.js").then(module => {
    module.startGame();
  });
}

// 초기 방 목록 로딩
onValue(ref(db, "rooms"), renderAvailableRooms);

// 버튼 이벤트 연결
createRoomButton.addEventListener("click", createRoom);
