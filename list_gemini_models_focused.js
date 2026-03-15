const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    if (data.models) {
        console.log('Available Models with generateContent (v1):');
        data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'))
                   .forEach(m => console.log(`- ${m.name}`));
    } else {
        console.log('No models in v1:', data);
    }
    
    const responseBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const dataBeta = await responseBeta.json();
    if (dataBeta.models) {
        console.log('Available Models with generateContent (v1beta):');
        dataBeta.models.filter(m => m.supportedGenerationMethods.includes('generateContent'))
                       .forEach(m => console.log(`- ${m.name}`));
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
