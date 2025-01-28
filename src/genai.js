const { GoogleGenerativeAI } = require("@google/generative-ai");

async function callGenerativeAI({ prompt, image, mimeType = 'image/png' }) {
  const apiKey = process.env.Gemini_API_Key;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    // Convert base64 image to GenerativeAI part
    const imagePart = {
      inlineData: {
        data: image,
        mimeType
      }
    };

    // Structure the content with both image and text prompt
    const contents = [
      { 
        role: "user",
        parts: [
          { text: prompt },
          imagePart
        ]
      }
    ];

    const result = await model.generateContent({ contents });
    return result.response.text();
  } catch (error) {
    console.error("Vision API Error:", error);
    throw new Error(`AI processing failed: ${error.message}`);
  }
}

module.exports = { callGenerativeAI };