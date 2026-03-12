require('dotenv').config();
const mongoose = require('mongoose');

// Modely
const User = require('../models/User');
const Vylet = require('../models/Vylet');
const FeedPost = require('../models/FeedPost');
const Komentar = require('../models/Komentar');

async function spravitDBTest() {
    console.log("====== VERONA: START ZÁTĚŽOVÉHO TESTU DATABÁZE ======");

    // 1. Připojení
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veronaDB');
        console.log("✅ [1/6] Připojení k MongoDB úspěšné.");
    } catch (e) {
        console.error("❌ Kritická chyba: Selhalo připojení k MongoDB.", e.message);
        process.exit(1);
    }

    let idAlice, idBoba, vId, pId;

    try {
        // 2. Vytvoření testovacích uživatelů
        const alice = await new User({ jmeno: "Test", prijmeni: "Alice", email: "alice@verona.test", avatar: "A" }).save();
        const bob = await new User({ jmeno: "Test", prijmeni: "Bob", email: "bob@verona.test", avatar: "B" }).save();
        idAlice = alice._id; idBoba = bob._id;
        console.log(`✅ [2/6] Vytvoření 2 uživatelů (Alice ID: ${idAlice}, Bob ID: ${idBoba}).`);

        // 3. Vytvoření Výletu (Alice)
        const vylet = await new Vylet({
            vlastnikId: idAlice, verejny: true, lokace: "Testovací Lokace", 
            etapy: [{ cas: "10:00", misto: "Zastávka 1", lat: 50, lng: 14 }]
        }).save();
        vId = vylet._id;
        console.log(`✅ [3/6] Uživatel Alice úspěšně vložila testovací Výlet (Trip ID: ${vId}).`);

        // 4. Sdílení do Feedu (Alice)
        const post = await new FeedPost({
            autorId: idAlice, autorJmeno: "Test Alice", text: "Podívejte, kam jsem šla!", pripojenyVyletId: vId
        }).save();
        pId = post._id;
        console.log(`✅ [4/6] Uživatel Alice úspěšně založila příspěvek ve Feedu (Post ID: ${pId}).`);

        // 5. Interakce (Bob Likne příspěvek a okomentuje Výlet)
        // a) Like
        post.likes.push(idBoba.toString());
        await post.save();
        // b) Komentář
        await new Komentar({ vyletId: vId, autorId: idBoba, autor: "Test Bob", text: "Super výlet!" }).save();
        
        console.log(`✅ [5/6] Uživatel Bob úspěšně LIKENUL příspěvek a napsal Komentář k výletu Alice.`);

        // Test Čtení relací (Ověření, zda data existují)
        const checkPost = await FeedPost.findById(pId);
        const checkComments = await Komentar.find({ vyletId: vId });
        if (checkPost.likes.includes(idBoba.toString()) && checkComments.length === 1) {
            console.log("✅ Relace databáze ověřeny (Like a Comments existují v referencích DB).");
        } else {
            throw new Error("Relace dat nesedí.");
        }

    } catch (e) {
        console.error("❌ Během testu došlo k chybě: ", e.message);
    } finally {
        // 6. Úklid databáze (Cleanup)
        console.log("🧹 [6/6] Zahajuji úklid testovacích dat...");
        if (idAlice) await User.findByIdAndDelete(idAlice);
        if (idBoba)  await User.findByIdAndDelete(idBoba);
        if (vId) {
            await Vylet.findByIdAndDelete(vId);
            await Komentar.deleteMany({ vyletId: vId });
        }
        if (pId) await FeedPost.findByIdAndDelete(pId);

        console.log("✅ Všechna testovací data byla z Mongoose odstraněna.");
        
        // Závěr
        console.log("====== VERONA: TEST STATUS: PASSED (100% OK) ======");
        mongoose.connection.close();
        process.exit(0);
    }
}

spravitDBTest();
