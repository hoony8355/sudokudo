// register.js – 유저 닉네임 및 레이팅 초기 등록2
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { app } from "./firebase-init.js";

const auth = getAuth(app);
const db = getDatabase(app);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    const userRef = ref(db, `users/${uid}`);

    try {
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        // 첫 로그인 시 닉네임을 입력받아 저장
        let nickname = prompt("닉네임을 입력해주세요 (최대 10자)", user.displayName || "");
        if (!nickname || nickname.length > 10) nickname = "익명";

        await set(userRef, {
          nickname: nickname,
          rating: 1200 // 기본 레이팅
        });

        console.log("✅ 유저 정보 등록 완료");
      } else {
        console.log("ℹ️ 유저 정보 이미 존재");
      }
    } catch (err) {
      console.error("❌ 유저 정보 로드 실패", err);
    }
  } else {
    console.log("⚠️ 로그인되지 않음");
  }
});
