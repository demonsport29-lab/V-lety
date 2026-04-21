require('dotenv').config();
const mongoose = require('mongoose');
const Akce = require('./models/Akce'); // Cesta k modelu

const noveAkce = [
    {
        nazev: "Dinosauria Museum Prague - Celodenní vstupenka",
        datum: "Otevřeno denně 2026",
        misto: "POP Airport, Praha",
        popis: "Cesta do pravěku na ploše 4000 m². Prohlédněte si originální kostry dinosaurů, špičkové modely a zažijte virtuální realitu, která vás přenese miliony let zpět.",
        logoUrl: "[https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Dinosaur_icon.svg/800px-Dinosaur_icon.svg.png](https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Dinosaur_icon.svg/800px-Dinosaur_icon.svg.png)",
        vstupenkyUrl: "[https://www.ticketportal.cz/event/Dinosauria-Celodenni-vstupenka?target=6&imedium=timeline](https://www.ticketportal.cz/event/Dinosauria-Celodenni-vstupenka?target=6&imedium=timeline)"
    },
    {
        nazev: "Morad - Euro Tour 2026",
        datum: "12. Listopadu 2026",
        misto: "Forum Karlín, Praha",
        popis: "Španělská rapová senzace Morad přijíždí do Prahy! Nenechte si ujít energickou show plnou hitů, které bourají evropské hitparády.",
        logoUrl: "[https://i.scdn.co/image/ab6761610000e5eb4f3d135d94ab8e3dd5db5185](https://i.scdn.co/image/ab6761610000e5eb4f3d135d94ab8e3dd5db5185)",
        vstupenkyUrl: "[https://www.ticketportal.cz/event/Morad-Euro-Tour?target=6&imedium=timeline](https://www.ticketportal.cz/event/Morad-Euro-Tour?target=6&imedium=timeline)"
    },
    {
        nazev: "Eric Clapton Live",
        datum: "5. Června 2026",
        misto: "O2 arena, Praha",
        popis: "Jedna z největších kytarových legend historie, Eric Clapton, se vrací do České republiky, aby fanouškům předvedl průřez svou bohatou kariérou.",
        logoUrl: "[https://i.scdn.co/image/ab6761610000e5ebc58f01f8fb50b07e78044738](https://i.scdn.co/image/ab6761610000e5ebc58f01f8fb50b07e78044738)",
        vstupenkyUrl: "[https://www.ticketportal.cz/event/ERIC-CLAPTON?target=6&imedium=timeline](https://www.ticketportal.cz/event/ERIC-CLAPTON?target=6&imedium=timeline)"
    },
    {
        nazev: "Ceny Anděl 2026",
        datum: "15. Května 2026",
        misto: "O2 universum, Praha",
        popis: "Předávání nejprestižnějších hudebních cen České republiky za uplynulý rok s exkluzivními vystoupeními top interpretů.",
        logoUrl: "[https://upload.wikimedia.org/wikipedia/cs/thumb/6/6a/Ceny_And%C4%9Bl_logo.svg/1200px-Ceny_And%C4%9Bl_logo.svg.png](https://upload.wikimedia.org/wikipedia/cs/thumb/6/6a/Ceny_And%C4%9Bl_logo.svg/1200px-Ceny_And%C4%9Bl_logo.svg.png)",
        vstupenkyUrl: "[https://www.ticketportal.cz/event/ANDELE?target=6&imedium=timeline](https://www.ticketportal.cz/event/ANDELE?target=6&imedium=timeline)"
    },
    {
        nazev: "FIM Speedway Grand Prix of Czech Republic",
        datum: "30. Května 2026",
        misto: "Stadion Markéta, Praha",
        popis: "Nejlepší plošináři světa se utkají v Praze! Zažijte adrenalin, vůni metanolu a nekompromisní souboje na legendárním oválu.",
        logoUrl: "[https://upload.wikimedia.org/wikipedia/en/thumb/0/07/FIM_Speedway_Grand_Prix_logo.svg/1200px-FIM_Speedway_Grand_Prix_logo.svg.png](https://upload.wikimedia.org/wikipedia/en/thumb/0/07/FIM_Speedway_Grand_Prix_logo.svg/1200px-FIM_Speedway_Grand_Prix_logo.svg.png)",
        vstupenkyUrl: "[https://www.ticketportal.cz/event/2026-FIM-SPEEDWAY-GRAND-PRIX-OF-CZECH-REPUBLIC?target=6&imedium=timeline](https://www.ticketportal.cz/event/2026-FIM-SPEEDWAY-GRAND-PRIX-OF-CZECH-REPUBLIC?target=6&imedium=timeline)"
    },
    {
        nazev: "Pražský Hrad - Základní okruh",
        datum: "Celoroční platnost 2026",
        misto: "Pražský hrad, Praha",
        popis: "Prozkoumejte symbol české státnosti. Vstupenka zahrnuje katedrálu sv. Víta, Starý královský palác, baziliku sv. Jiří a Zlatou uličku.",
        logoUrl: "[https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Prague_Castle_icon.svg/800px-Prague_Castle_icon.svg.png](https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Prague_Castle_icon.svg/800px-Prague_Castle_icon.svg.png)",
        vstupenkyUrl: "[https://www.ticketportal.cz/event/PRAZSKY-HRAD-PRAGUE-CASTLE-12004938?target=6&imedium=timeline](https://www.ticketportal.cz/event/PRAZSKY-HRAD-PRAGUE-CASTLE-12004938?target=6&imedium=timeline)"
    }
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veronaDB')
    .then(async () => {
        console.log('✅ Připojeno k DB. Spouštím import nových akcí...');
        for (const akce of noveAkce) {
            // Kontrola, zda už akce s tímto odkazem v databázi není (proti duplicitám)
            const existuje = await Akce.findOne({ vstupenkyUrl: akce.vstupenkyUrl });
            if (!existuje) {
                const novaAkce = new Akce(akce);
                await novaAkce.save();
                console.log(`📌 Přidáno: ${akce.nazev}`);
            } else {
                console.log(`⚠️ Přeskočeno (už existuje): ${akce.nazev}`);
            }
        }
        console.log('🎉 Všechny nové akce byly úspěšně zpracovány!');
        mongoose.connection.close();
    })
    .catch(err => {
        console.error('❌ Chyba při importu:', err);
        mongoose.connection.close();
    });
