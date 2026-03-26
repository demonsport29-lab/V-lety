const testWebhook = async () => {
    const url = "http://localhost:5678/webhook-test/2d8157f3-6ccb-44df-8f75-678bb6aaf4e5";
    const data = [
        {
            "nazev": "Testovací Akce z VS Code",
            "datum": "24. Prosince 2026",
            "misto": "O2 Arena, Praha",
            "popis": "Toto je historicky první zpráva poslaná z našeho kódu do n8n automatizace.",
            "logoUrl": "https://example.com/test-logo.jpg",
            "vstupenkyUrl": "https://example.com/test-listky"
        }
    ];

    console.log(`🚀 Odesílám POST request na: ${url}`);
    
    try {
        // Použijeme nativní fetch (Node.js 18+) nebo nadefinujeme fallback
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.text();
        console.log(`📡 Status: ${response.status}`);
        console.log(`💬 Odpověď ze serveru: ${result}`);
    } catch (error) {
        console.error("❌ Došlo k chybě při odesílání:", error.message);
    }
};

testWebhook();
