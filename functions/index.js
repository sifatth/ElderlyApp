const { onCall, HttpsError } = require("firebase-functions/v2/https");

// Backend that switches models based on input type
exports.getAiChatResponse = onCall({ secrets: ["OPENAI_API_KEY"], timeoutSeconds: 60 }, async (request) => {
  console.log("1. Request received:", JSON.stringify(request.data).substring(0, 100) + "...");

  const geminiKey = process.env.OPENAI_API_KEY;
  if (!geminiKey) {
    throw new HttpsError("internal", "Gemini API Key is not configured.");
  }

  const { message, image, audio } = request.data;

  if (!message && !image && !audio) {
    throw new HttpsError("invalid-argument", "Payload is empty.");
  }

  let modelName = "gemini-2.5-flash"; 
  
  if (image || audio) {
    console.log("   -> Detected Vision/Voice content. Switching to gemini-1.5-flash.");
    modelName = "gemini-1.5-flash";
  } else {
    console.log("   -> Text only. Using gemini-2.5-flash.");
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

  const parts = [];

  if (message) parts.push({ text: message });

  if (image) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: image
      }
    });
    // Add context prompt if user didn't type anything
    if (!message) parts.push({ text: "Analyze this image in detail." });
  }

  if (audio) {
    parts.push({
      inlineData: {
        mimeType: "audio/mp4",
        data: audio
      }
    });
    // Add context prompt if user didn't type anything
    if (!message) parts.push({ text: "Listen to this audio and respond." });
  }

  const payload = { contents: [{ parts }] };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`3. AI Error (${modelName}):`, errorText);
      throw new HttpsError("internal", `AI Provider Error: ${response.statusText}`);
    }

    const json = await response.json();
    
    // Safety check
    if (!json.candidates || json.candidates.length === 0) {
      console.warn("   -> Blocked by safety filters.");
      return { reply: "I'm sorry, I couldn't process that. It might have triggered a safety filter." };
    }

    const reply = json.candidates[0].content.parts[0].text;
    console.log("4. Success! Reply generated.");
    return { reply };

  } catch (error) {
    console.error("5. Function Error:", error);
    throw new HttpsError("internal", error.message);
  }
});