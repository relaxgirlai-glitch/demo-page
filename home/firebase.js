import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBe51AW2wx_GrECWIsucte8Pcloq3_mjY4",
  authDomain: "fir-page-806f0.firebaseapp.com",
  projectId: "fir-page-806f0",
  storageBucket: "fir-page-806f0.firebasestorage.app",
  messagingSenderId: "421796685055",
  appId: "1:421796685055:web:e8865d265e0706ca0918ca"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
