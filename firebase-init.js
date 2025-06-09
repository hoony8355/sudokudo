// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

// ✅ Firebase 설정
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

// ✅ 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ 로그인 함수 전역으로 노출
window.loginWithGoogle = function () {
  signInWithPopup(auth, provider)
    .then(result => {
      const user = result.user;
      window.currentUser = user;
      console.log("✅ 로그인 성공:", user.displayName);
    })
    .catch(error => {
      console.error("❌ 로그인 실패:", error.message);
    });
};

// ✅ 로그인 상태 추적
onAuthStateChanged(auth, user => {
  if (user) {
    window.currentUser = user;
    console.log("🔐 로그인 상태 유지:", user.displayName);
  } else {
    window.currentUser = null;
    console.log("🚪 로그아웃 상태");
  }
});

// ✅ export: 다른 모듈에서도 DB, 사용자 활용 가능
export { app, analytics, database, auth };
