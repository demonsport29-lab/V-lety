require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    // Note: The SDK might not have a direct listModels on genAI in all versions,
    // but usually, it's available via the underlying API or just by checking documentation.
    // In newer versions of @google/generative-ai, we might need to use a different approach.
    console.log("Checking API key...");
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.error("GEMINI_API_KEY is missing in .env!");
      return;
    }
    console.log(`Key loaded: ${key.substring(0, 5)}...${key.substring(key.length - 3)} (Length: ${key.length})`);
    
    // Attempting to list models if supported, otherwise just try a known one.
    // Actually, I'll just try 'gemini-1.5-flash' vs 'gemini-1.5-flash-8b' vs 'gemini-pro'.
    
    const testModel = async (name) => {
      try {
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent("test");
        console.log(`✅ Model ${name} is WORKING.`);
        return true;
      } catch (e) {
        console.log(`❌ Model ${name} FAILED: ${e.message}`);
        return false;
      }
    };

    await testModel("gemini-1.5-flash");
    await testModel("gemini-1.5-flash-latest");
    await testModel("gemini-pro");
    await testModel("gemini-1.5-pro");

  } catch (err) {
    console.error("Discovery failed:", err);
  }
}

listModels();
