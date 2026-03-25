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
  },
  {
    "nazev": "FRIENDS FEST 2026",
    "datum": "8. srpna 2026",
    "misto": "Pardubice, Dostihové závodiště",
    "popis": "11. ročník oblíbeného rodinného festivalu s napínavou dřevorubeckou Czech Lumberjack show, Strongman show, módními přehlídkami a bohatým programem pro děti i dospělé. Ideální pro celou rodinu plnou zábavy a nezapomenutelných zážitků.",
    "logoUrl": "",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/FRIENDS-FEST-2026"
  },
  {
    "nazev": "Makro Czech Gastro Fest 2026",
    "datum": "10. – 11. dubna 2026",
    "misto": "O2 universum, Praha",
    "popis": "Největší gastro událost roku, která spojuje svět gastronomie napříč generacemi i profesemi. Během dvou dnů se představí špičkoví kuchaři, degustace, workshopy a exkluzivní gastronomické zážitky v největší domácí koncertní hale.",
    "logoUrl": "",
    "vstupenkyUrl": "https://www.ticketportal.cz/Articles/9?count=50"
  },
  {
    "nazev": "Rhythm of the Dance 2026",
    "datum": "Duben 2026",
    "misto": "O2 arena, Praha",
    "popis": "Nádherná taneční show plná energie, barev a emocí, která představuje nejlepší tanečníky z celého světa. Perfektní zážitek pro milovníky pohybu, hudby a vizuálních efektů.",
    "logoUrl": "https://static.ticketportal.cz//images/podujatie/1208736/orig_2025926102137_.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/Rhythm-of-the-Dance-2026"
  },
  {
    "nazev": "Lord of the Dance 2026",
    "datum": "Duben 2026",
    "misto": "O2 arena, Praha",
    "popis": "Legendární irská taneční show plná energie, tradic a nezapomenutelných choreografií. Perfektní pro celou rodinu – od dětí po dospělé.",
    "logoUrl": "https://sttpczprodcdn.azureedge.net////images/podujatie/-2147476900/orig_2025102317430_Lord_of_the_Dance_2026.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/Lord-of-the-Dance-2026"
  },
  {
    "nazev": "Slezskoostravský Rock-Fest 2026 Open Air",
    "datum": "Květen 2026",
    "misto": "Slezská Ostrava",
    "popis": "Velký open air rockový festival s účastí předních českých i zahraničních kapel. Akce spojená s energickou atmosférou, dobrou hudbou a skvělým doprovodným programem pro všechny milovníky rockové hudby.",
    "logoUrl": "https://static.ticketportal.cz//images/podujatie/1208518/orig_2025626143212_SlezskoostravskA__Rock_Fest_2026_Open_Air_.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/Slezskoostravsky-Rock-Fest-2026-Open-Air"
  },
  {
    "nazev": "HIP HOP ŽIJE Ostrava 2026",
    "datum": "Červen 2026",
    "misto": "Ostrava",
    "popis": "Největší hip hopová akce v Česku s účastí špičkových interpretů ze světa hip hopu. Koncert plný energie, textů a beatů, který okouzlí všechny milovníky tohoto žánru.",
    "logoUrl": "",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/HIP-HOP-ZIJE-Ostrava-2026"
  },
  {
    "nazev": "SVATEBNÍ FESTIVAL OSTRAVA 2026",
    "datum": "Červenec 2026",
    "misto": "Ostrava",
    "popis": "Velký hudební festival zaměřený na svatbní hudbu a společenské tance. Akce, která spojuje lidi všech generací při skvělé hudbě a tanečním veselí.",
    "logoUrl": "https://static.ticketportal.cz//images/podujatie/1208565/orig_2025715121343_.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/Svatebni-festival-Ostrava-2026"
  },
  {
    "nazev": "Velikonoční koncert Svítání",
    "datum": "Duben 2026",
    "misto": "Vysočina",
    "popis": "Jarní hudební koncert nabízející krásné melodie a atmosféru pro oslavu jara a Velikonoc. Perfektní pro všechny milovníky klasické i moderní hudby.",
    "logoUrl": "https://sttpczprodcdn.azureedge.net////images/podujatie/1209344/orig_202622410213_VelikonoATnA__koncert_SvA_tA_nA_.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/Velikonocni-koncert-Svitani"
  },
  {
    "nazev": "Lubomír Brabec a Daniel Hůlka",
    "datum": "28. dubna 2026",
    "misto": "Dům kultury, Teplice",
    "popis": "Koncert dvou významných českých zpěváků a hudebníků, kteří představí své nejlepší písně a hudební klenoty. Akce spojená s emotivním zpěvem a špičkovými hudebními aranžemi.",
    "logoUrl": "",
    "vstupenkyUrl": "https://www.ticketportal.cz/Articles/13?count=650"
  },
  {
    "nazev": "JAN BENDIG",
    "datum": "Červen 2026",
    "misto": "Praha",
    "popis": "Koncert oblíbeného českého zpěváka Jana Bendiga, který představí své nejnovější hity a klasické písně. Pestrý hudební program plný emocí a energie.",
    "logoUrl": "https://static.ticketportal.cz//images/podujatie/-2147476469/orig_JAN_BENDIG_2026_202592674859.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/JAN-BENDIG"
  },
  {
    "nazev": "MASTERS OF ROCK 2026",
    "datum": "16. – 19. července 2026",
    "misto": "Vizovice, Areál likérky R. Jelínek",
    "popis": "22. ročník mezinárodního metalového festivalu s účastí světových metalových hvězd jako HELLOWEEN a ARCH ENEMY. Festival nabízí jedinečnou atmosféru, skvělou hudbu a nezapomenutelné zážitky pro všechny milovníky metalu.",
    "logoUrl": "https://static.ticketportal.cz//images/podujatie/1204663/orig_MASTERS_OF_ROCK_2023___Pragokoncert2023_2023113163139.jpg",
    "vstupenkyUrl": "https://www.ticketportal.cz/event/MASTERS-OF-ROCK-2026"
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
    
    console.log(`🔥 Všech ${noveAkce.length} akcí od Samaritána bylo úspěšně zpracováno!`);
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Kritická chyba při importu:", err);
    process.exit(1);
  });
