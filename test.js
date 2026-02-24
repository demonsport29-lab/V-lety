require('dotenv').config();

async function zjistiModely() {
    try {
        const klic = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${klic}`;
        
        console.log("Ptám se Googlu na dostupné modely...");
        const odpoved = await fetch(url);
        const data = await odpoved.json();
        
        if (data.models) {
            console.log("\n--- ÚSPĚCH! Zde jsou modely, které můžeš použít ---");
            data.models.forEach(model => {
                // Vypíšeme jen ty, které umí tvořit text (generateContent)
                if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`👉 ${model.name.replace('models/', '')}`);
                }
            });
            console.log("--------------------------------------------------\n");
        } else {
            console.log("Chyba:", data);
        }
    } catch (chyba) {
        console.log("Nepodařilo se připojit:", chyba.message);
    }
}

zjistiModely();