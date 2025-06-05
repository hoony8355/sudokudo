import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, get, child, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCbgziR_rX4O9OkDBsJxTzNO3q486C_eH4",
  authDomain: "sudokudo-58475.firebaseapp.com",
  databaseURL: "https://sudokudo-58475-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sudokudo-58475",
  storageBucket: "sudokudo-58475.appspot.com",
  messagingSenderId: "759625494323",
  appId: "1:759625494323:web:b9923311c2694e3f5d9846"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("room");
const playerId = urlParams.get("player");

const boardEl = document.getElementById("board");
const numberInput = document.getElementById("number-input");
const scoreEl = document.getElementById("scoreA");

let selectedCell = null;
let puzzle = [];
let answerBoard = [];
let score = 0;
let correctCount = 0;

function generateSudoku() {
  const sample = [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
  ];
  const answer = [
    [5,3,4,6,7,8,9,1,2],
    [6,7,2,1,9,5,3,4,8],
    [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],
    [4,2,6,8,5,3,7,9,1],
    [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],
    [2,8,7,4,1,9,6,3,5],
    [3,4,5,2,8,6,1,7,9]
  ];
  return { puzzle: sample, answer };
}

async function initGame() {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snapshot = await get(child(roomRef, "puzzle"));

  if (!snapshot.exists()) {
    const { puzzle: newPuzzle, answer } = generateSudoku();
    await set(ref(db, `rooms/${roomId}/puzzle`), newPuzzle);
    await set(ref(db, `rooms/${roomId}/answer`), answer);
    puzzle = newPuzzle;
    answerBoard = answer;
    console.log("✅ Player A: 퍼즐 생성 및 저장 완료");
  } else {
    puzzle = snapshot.val();
    answerBoard = (await get(child(roomRef, "answer"))).val();
    console.log("✅ Player B: 퍼즐 불러오기 완료");
  }

  renderBoard();
  listenForClaims();
  numberInput.style.display = "flex";
  console.log("🎮 게임 시작");
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.id = `cell-${r}-${c}`;
      if (puzzle[r][c] !== 0) {
        cell.textContent = puzzle[r][c];
        cell.classList.add("prefilled");
      } else {
        cell.addEventListener("click", () => handleCellSelect(r, c));
      }
      boardEl.appendChild(cell);
    }
  }
  console.log("📦 보드 렌더링 완료");
}

function handleCellSelect(row, col) {
  if (selectedCell) selectedCell.classList.remove("selected-cell");
  selectedCell = document.getElementById(`cell-${row}-${col}`);
  selectedCell.classList.add("selected-cell");
  selectedCell.dataset.row = row;
  selectedCell.dataset.col = col;
  console.log(`🔲 셀 선택됨: ${row},${col}`);
}

document.querySelectorAll(".num-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!selectedCell) return;
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    const selectedNumber = parseInt(btn.textContent);

    if (answerBoard[row][col] === selectedNumber) {
      set(ref(db, `rooms/${roomId}/board/claimed/${row}-${col}`), {
        uid: playerId,
        number: selectedNumber
      });
      correctCount++;
      if (correctCount >= 9) {
        correctCount = 0;
        remove(ref(db, `rooms/${roomId}/board/claimed`));
        console.log("♻️ 새로운 라운드로 초기화됨");
      }
    } else {
      alert("틀렸습니다!");
    }

    selectedCell.classList.remove("selected-cell");
    selectedCell = null;
  });
});

function listenForClaims() {
  onValue(ref(db, `rooms/${roomId}/board/claimed`), (snapshot) => {
    const claimed = snapshot.val() || {};
    for (const key in claimed) {
      const [row, col] = key.split("-");
      const data = claimed[key];
      const cell = document.getElementById(`cell-${row}-${col}`);
      if (cell) {
        cell.textContent = data.number;
        cell.classList.remove("selected-cell");
        cell.classList.add(data.uid === playerId ? "claimedA" : "claimedB");
      }
    }
    const myClaims = Object.values(claimed).filter(c => c.uid === playerId).length;
    scoreEl.textContent = `나: ${myClaims}칸`;
    console.log("📡 점령 현황 갱신됨", claimed);
  });
}

initGame();
