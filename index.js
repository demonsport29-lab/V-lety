require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

let isMaintenanceMode = false;

app.use(express.json({ limit: '50mb' })); 
app.use(express.static('public'));

app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

// 1. Secret switch route
app.get('/tajny-vypinac/verona/:stav', (req, res) => {
    const { stav } = req.params;
    if (stav === 'zapnout') {
        isMaintenanceMode = true;
        return res.send('Udrzba ZAPNUTA');
    } else if (stav === 'vypnout') {
        isMaintenanceMode = false;
        return res.send('Udrzba VYPNUTA');
    }
    res.status(400).send('Neplatný stav');
});

// 2. Maintenance middleware
app.use((req, res, next) => {
    // Pokud je aktivní údržba a uživatel nemíří na vypínač
    if (isMaintenanceMode && !req.path.startsWith('/tajny-vypinac/verona')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        return res.sendFile(path.join(__dirname, 'public', 'maintenance.html'));
    }
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'tajny-verona-klic',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        maxAge: 1000 * 60 * 60 * 24 * 30 
    }
}));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
      console.log('✅ MongoDB Připojeno!');
      
      const noveAkceData = [
          {
              nazev: "Dinosauria Museum Prague - Celodenní vstupenka",
              datum: "Otevřeno denně 2026",
              misto: "POP Airport, Praha",
              popis: "Cesta do pravěku na ploše 4000 m². Prohlédněte si originální kostry dinosaurů, špičkové modely a zažijte virtuální realitu, která vás přenese miliony let zpět.",
              logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Dinosaur_icon.svg/800px-Dinosaur_icon.svg.png",
              vstupenkyUrl: "https://www.ticketportal.cz/event/Dinosauria-Celodenni-vstupenka?target=6&imedium=timeline"
          },
          {
              nazev: "Morad - Euro Tour 2026",
              datum: "12. Listopadu 2026",
              misto: "Forum Karlín, Praha",
              popis: "Španělská rapová senzace Morad přijíždí do Prahy! Nenechte si ujít energickou show plnou hitů, které bourají evropské hitparády.",
              logoUrl: "https://i.scdn.co/image/ab6761610000e5eb4f3d135d94ab8e3dd5db5185",
              vstupenkyUrl: "https://www.ticketportal.cz/event/Morad-Euro-Tour?target=6&imedium=timeline"
          },
          {
              nazev: "Eric Clapton Live",
              datum: "5. Června 2026",
              misto: "O2 arena, Praha",
              popis: "Jedna z největších kytarových legend historie, Eric Clapton, se vrací do České republiky, aby fanouškům předvedl průřez svou bohatou kariérou.",
              logoUrl: "https://i.scdn.co/image/ab6761610000e5ebc58f01f8fb50b07e78044738",
              vstupenkyUrl: "https://www.ticketportal.cz/event/ERIC-CLAPTON?target=6&imedium=timeline"
          },
          {
              nazev: "Ceny Anděl 2026",
              datum: "15. Května 2026",
              misto: "O2 universum, Praha",
              popis: "Předávání nejprestižnějších hudebních cen České republiky za uplynulý rok s exkluzivními vystoupeními top interpretů.",
              logoUrl: "https://upload.wikimedia.org/wikipedia/cs/thumb/6/6a/Ceny_And%C4%9Bl_logo.svg/1200px-Ceny_And%C4%9Bl_logo.svg.png",
              vstupenkyUrl: "https://www.ticketportal.cz/event/ANDELE?target=6&imedium=timeline"
          },
          {
              nazev: "FIM Speedway Grand Prix of Czech Republic",
              datum: "30. Května 2026",
              misto: "Stadion Markéta, Praha",
              popis: "Nejlepší plošináři světa se utkají v Praze! Zažijte adrenalin, vůni metanolu a nekompromisní souboje na legendárním oválu.",
              logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/0/07/FIM_Speedway_Grand_Prix_logo.svg/1200px-FIM_Speedway_Grand_Prix_logo.svg.png",
              vstupenkyUrl: "https://www.ticketportal.cz/event/2026-FIM-SPEEDWAY-GRAND-PRIX-OF-CZECH-REPUBLIC?target=6&imedium=timeline"
          },
          {
              nazev: "Pražský Hrad - Základní okruh",
              datum: "Celoroční platnost 2026",
              misto: "Pražský hrad, Praha",
              popis: "Prozkoumejte symbol české státnosti. Vstupenka zahrnuje katedrálu sv. Víta, Starý královský palác, baziliku sv. Jiří a Zlatou uličku.",
              logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Prague_Castle_icon.svg/800px-Prague_Castle_icon.svg.png",
              vstupenkyUrl: "https://www.ticketportal.cz/event/PRAZSKY-HRAD-PRAGUE-CASTLE-12004938?target=6&imedium=timeline"
          }
      ];

      // Ochrana proti duplicitám zaručí, že se data nahrají jen při prvním startu
      noveAkceData.forEach(async (akceData) => {
          try {
              const existuje = await Akce.findOne({ vstupenkyUrl: akceData.vstupenkyUrl });
              if (!existuje) {
                  await new Akce(akceData).save();
                  console.log(`✅ Automaticky přidána akce: ${akceData.nazev}`);
              }
          } catch (err) {
              console.error(`❌ Chyba při automatickém přidávání akce ${akceData.nazev}:`, err);
          }
      });
  })
  .catch(err => console.error('❌ Chyba DB:', err));



const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const feedRoutes = require('./routes/feedRoutes');
const miscRoutes = require('./routes/miscRoutes');
const Akce = require('./models/Akce');

// Statické stránky
app.get('/soukromi', (req, res) => res.sendFile(path.join(__dirname, 'public', 'soukromi.html')));
app.get('/podminky', (req, res) => res.sendFile(path.join(__dirname, 'public', 'podminky.html')));


app.use(authRoutes);
app.use(tripRoutes);
app.use(feedRoutes);
app.use(miscRoutes);

// START SERVERU
app.listen(port, () => console.log(`🚀 VERONA běží na portu ${port}`));