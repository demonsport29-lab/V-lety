require('dotenv').config();
const mongoose = require('mongoose');
const Akce = require('./models/Akce');

// 1. NASTAV SI ÚDAJE (TENTO BLOK KOPÍRUJ A PŘEPISUJ DO NEKONEČNA)
const novaAkce = {
    nazev: "Noční pochod temnou Prahou 2026",
    datum: "2026-05-10T19:00:00Z", // Doporučený certifikovaný formát data a času
    misto: "Staroměstské náměstí, Praha",
    popis: "Připojte se k jedinečné exploraci potemnělé Prahy. Navštívíme skrytá zákoutí a zakončíme to ve středověké taverně.",
    logoUrl: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?q=80&w=800",
    vstupenkyUrl: "https://ticketportal.cz/event/praha-noc"
};

// 2. SPOUŠTĚCÍ KÓD - node pridat-akci.js
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
      console.log("✅ Připojno k databázi...");
      await Akce.create(novaAkce);
      console.log("🔥 Akce byla úspěšně uložena a rovnou se objeví na webu!");
      process.exit(0);
  })
  .catch(err => {
      console.error("❌ Chyba při ukládání:", err);
      process.exit(1);
  });
