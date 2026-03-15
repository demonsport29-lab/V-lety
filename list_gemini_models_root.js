const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log('Available Models (v1):', JSON.stringify(data, null, 2));
    
    const responseBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const dataBeta = await responseBeta.json();
    console.log('Available Models (v1beta):', JSON.stringify(dataBeta, null, 2));
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
