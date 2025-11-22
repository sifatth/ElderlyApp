import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCgzUcHVCNWFNsFdh8iSq18M9Hvkj4o40g",
  authDomain: "elderlyapp-dabda.firebaseapp.com",
  projectId: "elderlyapp-dabda",
  storageBucket: "elderlyapp-dabda.firebasestorage.app",
  messagingSenderId: "440329574315",
  appId: "1:440329574315:web:cef9425c43f2384c9a64ee",
  measurementId: "G-EL7HZ9LF5J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// --- AI Chatbot ---
const functions = getFunctions(app);
export const getAiChatResponse = httpsCallable(functions, "getAiChatResponse");

// --- Firestore ---
export const db = getFirestore(app);

// --- Authentication ( Required for login/signup/role management) ---
export const auth = getAuth(app);   
