import { initializeApp } from "firebase/app";
// We need 'getFunctions' and 'httpsCallable'
import { getFunctions, httpsCallable } from "firebase/functions";

// Your web app's Firebase configuration
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

// Get a reference to the Cloud Functions
const functions = getFunctions(app);

// Create an exportable connection to your specific deployed function
// 'getAiChatResponse' must match the name in your functions/index.js
export const getAiChatResponse = httpsCallable(functions, 'getAiChatResponse');