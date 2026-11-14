import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Конфигурация Firebase проекта KARATEL TEST.
// Firebase web apiKey обычно не является секретом. Защищайте данные правилами базы.
const firebaseConfig = {
  apiKey: "AIzaSyB08MJJtpW7nNPmfAXJoCxSVhJtKmHww-s",
  authDomain: "karatel-test-d4905.firebaseapp.com",
  databaseURL: "https://karatel-test-d4905-default-rtdb.firebaseio.com",
  projectId: "karatel-test-d4905",
  storageBucket: "karatel-test-d4905.firebasestorage.app",
  messagingSenderId: "1010732008881",
  appId: "1:1010732008881:web:d70e6a247b88c72c29e990",
  measurementId: "G-40CD234F0L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);