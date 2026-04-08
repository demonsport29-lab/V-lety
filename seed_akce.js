require('dotenv').config();
const mongoose = require('mongoose');
const Akce = require('./models/Akce');

const akceData = [
    {
        nazev: "Ceny Anděl 2026",
        datum: "15. Května 2026",
        misto: "O2 universum, Praha",
        popis: "Předávání nejprestižnějších hudebních cen České republiky za uplynulý rok s exkluzivními vystoupeními top interpretů.",
        logoUrl: "https://upload.wikimedia.org/wikipedia/cs/thumb/6/6a/Ceny_And%C4%9Bl_logo.svg/1200px-Ceny_And%C4%9Bl_logo.svg.png",
        vstupenkyUrl: "https://www.ticketportal.cz/event/ANDELE?imedium=timeline"
    },
    {
        nazev: "Pentatonix - European Tour 2026",
        datum: "22. Října 2026",
        misto: "O2 arena, Praha",
        popis: "Nejznámější světová a cappella skupina se vrací do Prahy s novým ohromujícím vokálním představením. Žádné nástroje, jen čisté hlasy.",
        logoUrl: "https://i.scdn.co/image/ab6761610000e5ebb6b9f2913e617d95d105280b",
        vstupenkyUrl: "https://www.ticketportal.cz/event/Pentatonix-UKEuropean-Tour-2026?imedium=timeline"
    },
    {
        nazev: "Tame Impala - Deadbeat Tour",
        datum: "14. Srpna 2026",
        misto: "Forum Karlín, Praha",
        popis: "Australský hudební vizionář Kevin Parker přiváží do Prahy svou hypnotickou psychedelickou show. Support: R.I.P. Magic.",
        logoUrl: "https://i.scdn.co/image/ab6761610000e5ebeb45152203e8b09322eb96ba",
        vstupenkyUrl: "https://www.ticketportal.cz/event/TAME-IMPALA-DEADBEAT-TOUR-support-RIP-Magic?imedium=timeline"
    }
];

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Připojeno k DB. Spouštím import akcí...');
        for (const akce of akceData) {
            const novaAkce = new Akce(akce);
            await novaAkce.save();
            console.log(`📌 Přidáno: ${akce.nazev}`);
        }
        console.log('🎉 Všechny akce byly úspěšně importovány!');
        mongoose.connection.close();
    })
    .catch(err => {
        console.error('❌ Chyba při importu:', err);
        mongoose.connection.close();
    });
