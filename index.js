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
              logoUrl: "https://images.unsplash.com/photo-1569091791842-7cfb64e04797?q=80&w=400",
              vstupenkyUrl: "https://www.ticketportal.cz/event/Dinosauria-Celodenni-vstupenka?target=6&imedium=timeline"
          },
          {
              nazev: "Morad - Euro Tour 2026",
              datum: "12. Listopadu 2026",
              misto: "Forum Karlín, Praha",
              popis: "Španělská rapová senzace Morad přijíždí do Prahy! Nenechte si ujít energickou show plnou hitů, které bourají evropské hitparády.",
              logoUrl: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=400",
              vstupenkyUrl: "https://www.ticketportal.cz/event/Morad-Euro-Tour?target=6&imedium=timeline"
          },
          {
              nazev: "Eric Clapton Live",
              datum: "5. Června 2026",
              misto: "O2 arena, Praha",
              popis: "Jedna z největších kytarových legend historie, Eric Clapton, se vrací do České republiky, aby fanouškům předvedl průřez svou bohatou kariérou.",
              logoUrl: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=400",
              vstupenkyUrl: "https://www.ticketportal.cz/event/ERIC-CLAPTON?target=6&imedium=timeline"
          },
          {
              nazev: "Ceny Anděl 2026",
              datum: "15. Května 2026",
              misto: "O2 universum, Praha",
              popis: "Předávání nejprestižnějších hudebních cen České republiky za uplynulý rok s exkluzivními vystoupeními top interpretů.",
              logoUrl: "https://images.unsplash.com/photo-1514525253361-bee8a18744ad?q=80&w=400",
              vstupenkyUrl: "https://www.ticketportal.cz/event/ANDELE?target=6&imedium=timeline"
          },
          {
              nazev: "FIM Speedway Grand Prix of Czech Republic",
              datum: "30. Května 2026",
              misto: "Stadion Markéta, Praha",
              popis: "Nejlepší plošináři světa se utkají v Praze! Zažijte adrenalin, vůni metanolu a nekompromisní souboje na legendárním oválu.",
              logoUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400",
              vstupenkyUrl: "https://www.ticketportal.cz/event/2026-FIM-SPEEDWAY-GRAND-PRIX-OF-CZECH-REPUBLIC?target=6&imedium=timeline"
          },
          {
              nazev: "Pražský Hrad - Základní okruh",
              datum: "Celoroční platnost 2026",
              misto: "Pražský hrad, Praha",
              popis: "Prozkoumejte symbol české státnosti. Vstupenka zahrnuje katedrálu sv. Víta, Starý královský palác, baziliku sv. Jiří a Zlatou uličku.",
              logoUrl: "https://images.unsplash.com/photo-1541849546-216509ae73f9?q=80&w=400",
              vstupenkyUrl: "https://www.ticketportal.cz/event/PRAZSKY-HRAD-PRAGUE-CASTLE-12004938?target=6&imedium=timeline"
          }
      ];

      // Ochrana proti duplicitám zaručí, že se data nahrají nebo aktualizují
      noveAkceData.forEach(async (akceData) => {
          try {
              const op = await Akce.updateOne(
                  { vstupenkyUrl: akceData.vstupenkyUrl },
                  { $set: akceData },
                  { upsert: true }
              );
              if (op.upsertedId) {
                  console.log(`✅ Automaticky přidána akce: ${akceData.nazev}`);
              } else if (op.modifiedCount > 0) {
                  console.log(`🔄 Automaticky aktualizována akce: ${akceData.nazev}`);
              }
          } catch (err) {
              console.error(`❌ Chyba při automatickém přidávání/aktualizaci akce ${akceData.nazev}:`, err);
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