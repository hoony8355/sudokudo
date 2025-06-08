import { db } from "./firebase-init.js";
import {
  ref,
  onValue,
  set
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const createRoomBtn = document.getElementById("createRoomBtn");
const roomListContainer = document.getElementById("roomList");

// 방 ID를 10000~99999 사이의 5자리 숫자로 생성
function generateRoomId() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// 대기 중인 방 목록을 렌더링
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

  console.log("📃 대기 중인 방 목록 렌더링 완료");
}

// 방 참가 로직
function joinRoom(roomId) {
  const roomRef = ref(db, `rooms/${roomId}`);

  onValue(roomRef, (snapshot) => {
    const roomData = snapshot.val();
    if (roomData && !roomData.playerB) {
      console.log(`🚪 방 ${roomId} 입장 시도 (Player B)`);

      set(ref(db, `rooms/${roomId}/playerB`), true);
      set(ref(db, `rooms/${roomId}/inGame`), true);

      sessionStorage.setItem("roomId", roomId);
      sessionStorage.setItem("player", "B");

      location.href = "#game";
    } else {
      console.warn("❌ 방에 이미 두 명이 존재합니다.");
    }
  }, {
    onlyOnce: true
  });
}

// 방 생성 로직
function createRoom() {
  const roomId = generateRoomId();
  const roomRef = ref(db, `rooms/${roomId}`);

  set(roomRef, {
    playerA: true,
    inGame: false
  }).then(() => {
    console.log(`🏠 방 ${roomId} 생성 완료 (Player A)`);

    sessionStorage.setItem("roomId", roomId);
    sessionStorage.setItem("player", "A");

    location.href = "#game";
  });
}

// 이벤트 리스너 등록
createRoomBtn?.addEventListener("click", createRoom);

// 실시간 대기방 목록 수신
onValue(ref(db, "rooms"), (snapshot) => {
  const rooms = snapshot.val();
  if (rooms) {
    console.log("📡 실시간 방 정보 수신", rooms);
    renderAvailableRooms(rooms);
  } else {
    console.log("⚠️ 대기 중인 방이 없습니다.");
    roomListContainer.innerHTML = "<p>대기 중인 방이 없습니다.</p>";
  }
});
