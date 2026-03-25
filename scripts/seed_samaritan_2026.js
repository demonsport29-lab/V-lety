require('dotenv').config();
const mongoose = require('mongoose');
const Akce = require('../models/Akce');

const noveAkce = [
  {
    "nazev": "Pentatonix - UK/European Tour 2026",
    "datum": "9. dubna 2026",
    "misto": "O2 arena, Praha",
    "popis": "Vokální pětice Pentatonix, známá svými pojetími hitů jako Hallelujah, Jolene či Bohemian Rhapsody, se po třech letech vrací do Prahy. Připravte se na účinné zpěvné aranžmá, živou hudbu a nezapomenutelný hudební zážitek plný emocí a energie.",
    "logoUrl": "https://static.ticketportal.cz//images/podujatie/-2147475637/orig_KoRn_2026_20263168346.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/Pentatonix-UKEuropean-Tour-2026"
  },
  {
    "nazev": "Tame Impala",
    "datum": "20. dubna 2026",
    "misto": "O2 arena, Praha",
    "popis": "Australský hudební projekt Tame Impala vedený Kevinem Parkerem představí svůj první samostatný koncert v ČR. Hudební psychedelie a vizuálně podmanivé provedení slibují nezapomenutelný hudební večer plný energie a kreativity.",
    "logoUrl": "https://static.ticketportal.cz//images/podujatie/-2147477195/orig_NO_NAME_2026_20241019182044.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/Tame-Impala"
  },
  {
    "nazev": "ABBAMANIA THE SHOW - Dancing Queen Tour",
    "datum": "28. dubna 2026",
    "misto": "O2 universum, Sál A, Praha",
    "popis": "Největší světová show inspirovaná hity skupiny ABBA představí nezapomenutelný hudební a taneční zážitek. Dancing Queen Tour přináší nejen legendární skladby, ale i úchvatnou scénu a živý výkon, který okouzlí všechny generace.",
    "logoUrl": "",
    "vstupenkyUrl": "https://www.ticketportal.cz/venue/-2147483642"
  },
  {
    "nazev": "Reinhold Messner: The Final Expedition",
    "datum": "28. dubna 2026",
    "misto": "O2 universum, Sál A, Praha",
    "popis": "Připravte se na nevšední hudební a filmové představení inspirované životem legendárního horolezce Reinholda Messnera. The Final Expedition slibuje kombinaci hudby, obrazu a emocí, která vás vtáhne do světa dobrodružství a výzev.",
    "logoUrl": "",
    "vstupenkyUrl": "https://www.ticketportal.cz/venue/-2147483642"
  },
  {
    "nazev": "KoRn",
    "datum": "Duben 2026",
    "misto": "O2 arena, Praha",
    "popis": "Kapela KoRn, jedna z nejzásadnějších formací moderní metalové scény, se vrací do Prahy v rámci evropského turné. Průkopníci nu metalu představí svou nejnovější show plnou intenzity, silných riffů a nezaměnitelného zvuku.",
    "logoUrl": "https://static.ticketportal.cz//images/podujatie/-2147475637/orig_KoRn_2026_20263168346.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/KoRn--2147477819"
  },
  {
    "nazev": "The City of Prague Philharmonic Orchestra – Vangelis",
    "datum": "Duben 2026",
    "misto": "O2 universum, Sál A, Praha",
    "popis": "Pražský filharmonický orchestr představí unikátní koncert věnovaný hudbě Vangelise, mistra elektronické a orchestralní hudby. Připravte se na atmosféru plnou zvuků, která vás přenese do jiného světa.",
    "logoUrl": "",
    "vstupenkyUrl": "https://www.ticketportal.cz/venue/-2147483642"
  }
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veronaDB')
  .then(async () => {
    console.log("✅ Připojeno k MongoDB pro import dat...");
    
    for (const akce of noveAkce) {
      const existujici = await Akce.findOne({ nazev: akce.nazev, datum: akce.datum });
      if (existujici) {
        console.log(`⚠️ Akce "${akce.nazev}" již v databázi existuje, přeskakuji.`);
        continue;
      }
      await Akce.create(akce);
      console.log(`✨ Importováno: ${akce.nazev}`);
    }
    
    console.log("🔥 Všech 6 akcí od Samaritána bylo úspěšně zpracováno!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Kritická chyba při importu:", err);
    process.exit(1);
  });
