const { onCall, HttpsError } = require("firebase-functions/v2/https");

// Set higher timeout for large image/audio payloads
exports.getAiChatResponse = onCall({ 
  secrets: ["OPENAI_API_KEY"], 
  timeoutSeconds: 60,
  region: "us-central1"
}, async (request) => {
  
  // 1. API Key Check (CRITICAL)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // This is the error that is likely causing the crash if the key is missing
    console.error("CRITICAL: OPENAI_API_KEY secret is missing or not loaded.");
    throw new HttpsError("unauthenticated", "Server API Key is not configured.");
  }

  const { message, image, audio } = request.data;

  // 2. Model Selection (FIXED)
  // gemini-1.5-flash is stable, fast, and supports all inputs (text, image, audio)
  const modelName = "gemini-2.5-flash-lite"; 
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const parts = [];

  if (message) parts.push({ text: message });

  if (image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: image
      }
    });
    if (!message) parts.push({ text: "Describe this image." });
  }

  if (audio) {
    parts.push({
      inlineData: {
        // NOTE: If you experience audio errors, change this to "audio/wav"
        mimeType: "audio/mp4", 
        data: audio
      }
    });
    if (!message) parts.push({ text: "Listen to this audio and respond." });
  }

  const payload = { 
    contents: [{ parts }] 
  };

  // 3. API Call
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API Error (${response.status} - ${modelName}):`, errorText);
      // Throw a clean error back to the app
      throw new HttpsError("internal", `AI Provider Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    
    // 4. Response Check
    if (!json.candidates || !json.candidates[0]?.content?.parts?.[0]?.text) {
      console.warn("API returned empty/blocked response:", JSON.stringify(json));
      return { reply: "I'm sorry, I couldn't generate a response for that." };
    }

    return { reply: json.candidates[0].content.parts[0].text };

  } catch (error) {
    console.error("Function Crash (likely API key or Network issue):", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Unknown backend error occurred.");
  }
});