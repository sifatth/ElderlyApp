import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

/**
 * @param {{ message?: string; image?: string | null; audio?: string | null }} [params]
 */
export const getAiChatResponse = async ({ message = '', image = null, audio = null } = {}) => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new Error("Gemini API key is missing. Please add your key to EXPO_PUBLIC_GEMINI_API_KEY in the .env file.");
  }

  // Candidate models to try in order (if one is busy with 503 high demand, next is used automatically)
  const configuredModel = process.env.EXPO_PUBLIC_GEMINI_MODEL;
  const modelsToTry = [
    ...(configuredModel ? [configuredModel] : []),
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3-flash-preview"
  ].filter((v, i, a) => a.indexOf(v) === i); // Unique models

  const parts = [];

  if (message) {
    parts.push({ text: message });
  }

  if (image) {
    // Sanitize base64 (strip data:image/...;base64, prefix if present)
    const cleanBase64Image = image.includes(",") ? image.split(",")[1] : image;
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64Image
      }
    });
    if (!message && !audio) {
      parts.push({ text: "Describe this image in detail and answer any relevant questions." });
    }
  }

  if (audio) {
    const cleanBase64Audio = audio.includes(",") ? audio.split(",")[1] : audio;
    parts.push({
      inlineData: {
        mimeType: "audio/mp4",
        data: cleanBase64Audio
      }
    });
    if (!message) {
      parts.push({ text: "Listen to this audio and respond warmly." });
    }
  }

  if (parts.length === 0) {
    parts.push({ text: "Hello!" });
  }

  const payload = {
    contents: [
      {
        parts: parts
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: "You are a warm, helpful, and empathetic AI companion for elderly individuals. Keep answers clear, supportive, and easy to understand."
        }
      ]
    }
  };

  let lastError = null;

  // Try models with auto-failover
  for (const modelName of modelsToTry) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini Model ${modelName} returned status ${response.status}:`, errorText);
        // If 503 (High Demand) or 429 (Rate Limit) or 404, try next model in list
        if (response.status === 503 || response.status === 429 || response.status === 404) {
          lastError = new Error(`Gemini (${modelName}): ${errorText}`);
          continue;
        }
        throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const botReply = json.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!botReply) {
        console.warn(`Model ${modelName} returned empty response:`, JSON.stringify(json));
        continue;
      }

      return {
        data: {
          reply: botReply
        }
      };
    } catch (err) {
      console.warn(`Failed with model ${modelName}:`, err.message);
      lastError = err;
    }
  }

  // If all models failed
  throw lastError || new Error("All AI models are currently busy. Please try again in a few seconds.");
};

// Firestore
export const db = getFirestore(app);

// Authentication
export const auth = getAuth(app);   
