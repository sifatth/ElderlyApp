const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.getAiChatResponse = onCall({ secrets: ["OPENAI_API_KEY"] }, async (request) => {
  
  const geminiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey) {
    throw new HttpsError("internal", "Gemini API Key is not configured.");
  }

  const userMessage = request.data.message;
  if (!userMessage || typeof userMessage !== 'string') {
    throw new HttpsError("invalid-argument", "The function must be called with one argument 'message' that is a string.");
  }

  // Using gemini-2.5-flash model
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

  const requestPayload = {
    contents: [
      {
        parts: [
          {
            text: userMessage
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error:", errorBody);
      throw new HttpsError("internal", `Gemini API Failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    if (!responseData.candidates || responseData.candidates.length === 0) {
      console.error("No candidates in response:", responseData);
      return { reply: "I'm sorry, I couldn't generate a response to that." };
    }

    const botMessage = responseData.candidates[0].content.parts[0].text;
    return { reply: botMessage };

  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw new HttpsError("unknown", "An unexpected error occurred.");
  }
});