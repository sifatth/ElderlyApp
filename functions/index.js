const { onCall, HttpsError } = require("firebase-functions/v2/https");

// This tells the function to load the secret named "OPENAI_API_KEY"
// (which now holds your new GEMINI key).
exports.getAiChatResponse = onCall({ secrets: ["OPENAI_API_KEY"] }, async (request) => {
  
  const geminiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey) {
    throw new HttpsError("internal", "Gemini API Key is not configured in process.env.");
  }

  const userMessage = request.data.message;
  if (!userMessage || typeof userMessage !== 'string') {
    throw new HttpsError("invalid-argument", "The function must be called with one argument 'message' that is a string.");
  }

  // 1. UPDATED: The Gemini API endpoint
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

  // 2. UPDATED: The payload structure for Gemini
  const requestPayload = {
    contents: [
      {
        parts: [
          {
            text: userMessage
          }
        ]
      }
    ],
    // This is the system prompt for Gemini
    systemInstruction: {
      parts: [
        {
          text: "You are a helpful and friendly assistant for an elderly care app. Keep your responses simple, clear, and reassuring."
        }
      ]
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 3. UPDATED: No 'Authorization' header needed, key is in the URL
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // We log the error so we can see it in Firebase Logs
      console.error("Gemini API Error:", errorBody);
      throw new HttpsError("internal", "Failed to get a response from the AI.");
    }

    const responseData = await response.json();

    // 4. UPDATED: How we get the text from the response
    const botMessage = responseData.candidates[0].content.parts[0].text;

    if (!botMessage) {
      console.error("No text found in Gemini response:", responseData);
      throw new HttpsError("internal", "AI returned an empty response.");
    }

    return { reply: botMessage };
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw new HttpsError("unknown", "An unexpected error occurred.");
  }
});