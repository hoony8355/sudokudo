// register.js – 유저 닉네임 및 레이팅 초기 등록 개선
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { app } from "./firebase-init.js";

const auth = getAuth(app);
const db = getDatabase(app);

// ✅ 공통 유저 등록 함수
async function ensureUserData(uid, nickname = "익명") {
  const userRef = ref(db, `users/${uid}`);
  const snap = await get(userRef);

  if (!snap.exists()) {
    await set(userRef, {
      nickname: nickname,
      rating: 1200
    });
    console.log("✅ 유저 정보 신규 등록 완료", uid);
  } else {
    console.log("ℹ️ 유저 정보 이미 존재", uid);
  }

  localStorage.setItem("uid", uid); // ✅ lovi.js에서 참조 가능하도록 저장
}

// ✅ 로그인 처리 및 유저 등록
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    await ensureUserData(uid, user.displayName || "익명");
  } else {
    console.log("🚪 로그아웃 상태 - 익명 로그인 시도");

    try {
      const result = await signInAnonymously(auth);
      const uid = result.user.uid;
      await ensureUserData(uid); // 로그인 후에도 유저 정보 등록
    } catch (err) {
      console.error("❌ 익명 로그인 실패", err);
    }
  }
});
