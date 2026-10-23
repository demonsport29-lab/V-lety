require('dotenv').config();
const { google } = require('googleapis');

async function testGoogleConfig() {
    console.log("--- DIAGNOSTIKA GOOGLE PŘIPOJENÍ ---");
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // 1. Kontrola existence klíčů
    if (!clientId || !clientSecret) {
        console.error("❌ CHYBA: Chybí GOOGLE_CLIENT_ID nebo GOOGLE_CLIENT_SECRET v souboru .env!");
        return;
    } else {
        console.log("✅ Klíče nalezeny v .env");
    }

    // 2. Kontrola formátu Client ID
    if (!clientId.endsWith('.apps.googleusercontent.com')) {
        console.error("❌ CHYBA: GOOGLE_CLIENT_ID má špatný formát. Musí končit na '.apps.googleusercontent.com'");
        return;
    }
    console.log(`🔎 Použité Client ID: ${clientId.substring(0, 15)}... (zkráceno)`);

    // 3. Pokus o vytvoření OAuth klienta
    try {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'http://localhost:3000/oauth2callback'
        );

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/calendar.events']
        });

        console.log("✅ OAuth klient úspěšně inicializován.");
        console.log("\n--- TESTOVACÍ ODKAZ ---");
        console.log("Zkopíruj tento odkaz do prohlížeče a zkus se přihlásit:");
        console.log(url);
        console.log("\nPokud po kliknutí uvidíš chybu '401: invalid_client', je špatně Client ID.");
        console.log("Pokud uvidíš '400: redirect_uri_mismatch', nemáš v Google Console nastaveno http://localhost:3000/oauth2callback");

    } catch (error) {
        console.error("❌ KRITICKÁ CHYBA při startu:", error.message);
    }
}

testGoogleConfig();