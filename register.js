// register.js – 로그인/로그아웃 상태 처리 및 유저 등록
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

import { app } from "./firebase-init.js";

const auth = getAuth(app);
const db = getDatabase(app);

// ✅ 로그인 처리
async function loginWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      await set(userRef, {
        nickname: user.displayName || "익명",
        rating: 1200
      });
      console.log("[register] ✅ 신규 유저 등록 완료");
    } else {
      console.log("[register] ℹ️ 유저 정보 이미 존재", user.uid);
    }
  } catch (err) {
    console.error("❌ 로그인 실패", err);
  }
}

// ✅ 로그아웃 처리
async function logoutWithGoogle() {
  try {
    await signOut(auth);
    console.log("[register] 🔒 로그아웃 완료");
  } catch (err) {
    console.error("❌ 로그아웃 실패", err);
  }
}

// ✅ 로그인 상태 변화 감지 및 UI 업데이트
onAuthStateChanged(auth, async (user) => {
  const authBtn = document.getElementById("auth-button");
  const userInfo = document.getElementById("user-info");

  if (user) {
    // 로그인 상태
    const name = user.displayName || "사용자";
    userInfo.textContent = `사용자: ${name}`;
    authBtn.textContent = "로그아웃";
    authBtn.onclick = logoutWithGoogle;
    window.currentUser = user;
  } else {
    // 로그아웃 상태
    userInfo.textContent = `사용자: ?`;
    authBtn.textContent = "Google 로그인";
    authBtn.onclick = loginWithGoogle;
    window.currentUser = null;
  }
});

// 🔁 전역 함수로 등록 (호출 필요 시 대비)
window.loginWithGoogle = loginWithGoogle;
window.logoutWithGoogle = logoutWithGoogle;
