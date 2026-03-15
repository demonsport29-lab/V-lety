require('dotenv').config();

async function checkVersion(version) {
  console.log(`--- Checking API Version: ${version} ---`);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    if (data.models) {
        const supported = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
        if (supported.length > 0) {
            supported.forEach(m => console.log(`[${version}] Supported: ${m.name}`));
        } else {
            console.log(`[${version}] No models support generateContent.`);
        }
    } else {
        console.log(`[${version}] Error/No models:`, JSON.stringify(data));
    }
  } catch (error) {
    console.error(`[${version}] Fetch Error:`, error);
  }
}

async function run() {
  await checkVersion('v1');
  await checkVersion('v1beta');
}

run();
